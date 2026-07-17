import fsPromises from 'node:fs/promises'
import path from 'node:path'
import { nativeImage } from 'electron'
import { VLC_AUDIO_EXTENSIONS } from '../shared/vlc-media-extensions.js'

export type EmbeddedArtwork = {
  dataUrl: string
  width: number
  height: number
}

const AUDIO_EXTENSION_SET = new Set<string>(VLC_AUDIO_EXTENSIONS)

function isAudioFile(filePath: string): boolean {
  return AUDIO_EXTENSION_SET.has(path.extname(filePath).toLowerCase())
}

function syncsafe32(bytes: Buffer, offset: number): number {
  return (
    ((bytes[offset] & 0x7f) << 21) |
    ((bytes[offset + 1] & 0x7f) << 14) |
    ((bytes[offset + 2] & 0x7f) << 7) |
    (bytes[offset + 3] & 0x7f)
  )
}

function readId3Artwork(buffer: Buffer): Buffer | null {
  if (buffer.length < 10 || buffer.toString('ascii', 0, 3) !== 'ID3') {
    return null
  }

  const versionMajor = buffer[3]
  const tagSize = syncsafe32(buffer, 6)
  let offset = 10
  const end = Math.min(buffer.length, 10 + tagSize)

  while (offset < end) {
    let frameId: string
    let frameSize: number
    let dataStart: number

    if (versionMajor === 2) {
      if (offset + 6 > end) {
        break
      }
      frameId = buffer.toString('ascii', offset, offset + 3)
      frameSize = (buffer[offset + 3] << 16) | (buffer[offset + 4] << 8) | buffer[offset + 5]
      dataStart = offset + 6
    } else {
      if (offset + 10 > end) {
        break
      }
      frameId = buffer.toString('ascii', offset, offset + 4).replace(/\0/g, '')
      frameSize =
        versionMajor === 4
          ? syncsafe32(buffer, offset + 4)
          : buffer.readUInt32BE(offset + 4)
      dataStart = offset + 10
    }

    const dataEnd = dataStart + frameSize
    if (dataEnd > buffer.length) {
      break
    }

    if (frameId === 'APIC' || frameId === 'PIC') {
      const frame = buffer.subarray(dataStart, dataEnd)
      if (frame.length < 4) {
        return null
      }

      const encoding = frame[0]
      let cursor = 1

      // MIME type (always Latin-1 / ASCII, null-terminated).
      let mimeEnd = cursor
      while (mimeEnd < frame.length && frame[mimeEnd] !== 0) {
        mimeEnd += 1
      }
      cursor = mimeEnd + 1

      if (cursor >= frame.length) {
        return null
      }

      // Picture type byte.
      cursor += 1

      // Description (encoding-dependent, null-terminated).
      if (encoding === 1 || encoding === 2) {
        while (cursor + 1 < frame.length && !(frame[cursor] === 0 && frame[cursor + 1] === 0)) {
          cursor += 2
        }
        cursor += 2
      } else {
        while (cursor < frame.length && frame[cursor] !== 0) {
          cursor += 1
        }
        cursor += 1
      }

      if (cursor < frame.length) {
        return frame.subarray(cursor)
      }

      return null
    }

    offset = dataEnd
  }

  return null
}

function extractImageBytesNearCovr(buffer: Buffer): Buffer | null {
  let searchFrom = 0

  while (searchFrom < buffer.length) {
    const covrIndex = buffer.indexOf('covr', searchFrom)
    if (covrIndex < 0) {
      break
    }

    const slice = buffer.subarray(covrIndex + 4, Math.min(buffer.length, covrIndex + 512))
    const jpegIndex = slice.indexOf(Buffer.from([0xff, 0xd8, 0xff]))
    const pngIndex = slice.indexOf(Buffer.from([0x89, 0x50, 0x4e, 0x47]))

    const imageStart =
      jpegIndex >= 0 && (pngIndex < 0 || jpegIndex < pngIndex) ? jpegIndex : pngIndex

    if (imageStart >= 0) {
      const imageBuffer = slice.subarray(imageStart)

      if (jpegIndex >= 0 && imageStart === jpegIndex) {
        const endMarker = imageBuffer.indexOf(Buffer.from([0xff, 0xd9]))
        if (endMarker >= 0) {
          return imageBuffer.subarray(0, endMarker + 2)
        }
      }

      return imageBuffer
    }

    searchFrom = covrIndex + 4
  }

  return null
}

function readFlacArtwork(buffer: Buffer): Buffer | null {
  if (buffer.length < 8 || buffer.toString('ascii', 0, 4) !== 'fLaC') {
    return null
  }

  let offset = 4

  while (offset + 4 <= buffer.length) {
    const header = buffer[offset]
    const isLast = (header & 0x80) !== 0
    const blockType = header & 0x7f
    const blockSize =
      (buffer[offset + 1] << 16) | (buffer[offset + 2] << 8) | buffer[offset + 3]
    const dataStart = offset + 4
    const dataEnd = dataStart + blockSize

    if (dataEnd > buffer.length) {
      break
    }

    if (blockType === 6) {
      const block = buffer.subarray(dataStart, dataEnd)
      if (block.length < 32) {
        return null
      }

      let cursor = 4 // picture type
      const mimeLen = block.readUInt32BE(cursor)
      cursor += 4
      cursor += mimeLen
      const descLen = block.readUInt32BE(cursor)
      cursor += 4
      cursor += descLen
      cursor += 16 // width, height, depth, indexed colors
      const dataLen = block.readUInt32BE(cursor)
      cursor += 4

      if (cursor + dataLen <= block.length) {
        return block.subarray(cursor, cursor + dataLen)
      }

      return null
    }

    offset = dataEnd
    if (isLast) {
      break
    }
  }

  return null
}

function readMp4Artwork(buffer: Buffer): Buffer | null {
  return extractImageBytesNearCovr(buffer)
}

function bufferToArtwork(imageBuffer: Buffer, maxWidth: number): EmbeddedArtwork | null {
  if (!imageBuffer.length) {
    return null
  }

  const image = nativeImage.createFromBuffer(imageBuffer)
  if (image.isEmpty()) {
    return null
  }

  const size = image.getSize()
  const scaled =
    maxWidth > 0 && size.width > maxWidth
      ? image.resize({ width: maxWidth, quality: 'best' })
      : image
  const scaledSize = scaled.getSize()

  return {
    dataUrl: scaled.toDataURL(),
    width: scaledSize.width,
    height: scaledSize.height,
  }
}

/** Read embedded cover art from common audio container/tag formats. */
export async function readEmbeddedAudioArtwork(
  filePath: string,
  maxWidth = 320,
): Promise<EmbeddedArtwork | null> {
  if (!isAudioFile(filePath)) {
    return null
  }

  try {
    const buffer = await fsPromises.readFile(filePath)
    const ext = path.extname(filePath).toLowerCase()

    let imageBuffer: Buffer | null = null

    if (ext === '.mp3' || ext === '.mp2' || ext === '.mp1' || ext === '.mpga') {
      imageBuffer = readId3Artwork(buffer)
    } else if (ext === '.flac') {
      imageBuffer = readFlacArtwork(buffer)
    } else if (ext === '.m4a' || ext === '.m4b' || ext === '.m4p' || ext === '.mp4') {
      imageBuffer = readMp4Artwork(buffer)
    } else {
      // Many formats still carry ID3 tags (e.g. some .ogg/.opus files).
      imageBuffer = readId3Artwork(buffer)
    }

    return imageBuffer ? bufferToArtwork(imageBuffer, maxWidth) : null
  } catch {
    return null
  }
}

/** Resolve libVLC artworkUrl metadata to an image when it points at a local file. */
export async function readArtworkFromMetaUrl(
  artworkUrl: string | null | undefined,
  maxWidth = 320,
): Promise<EmbeddedArtwork | null> {
  if (!artworkUrl) {
    return null
  }

  let filePath = artworkUrl

  if (filePath.startsWith('file://')) {
    try {
      filePath = decodeURIComponent(new URL(filePath).pathname)
      // Windows paths come back as /C:/... from file URLs.
      if (process.platform === 'win32' && filePath.startsWith('/')) {
        filePath = filePath.slice(1)
      }
    } catch {
      return null
    }
  }

  if (!path.isAbsolute(filePath)) {
    return null
  }

  try {
    const buffer = await fsPromises.readFile(filePath)
    return bufferToArtwork(buffer, maxWidth)
  } catch {
    return null
  }
}
