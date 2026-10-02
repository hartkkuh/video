import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const koffi = require('koffi')

export const SW_HIDE = 0
export const SW_SHOWNA = 8
export const SWP_NOSIZE = 0x0001
export const SWP_NOMOVE = 0x0002
export const SWP_NOZORDER = 0x0004
export const SWP_NOACTIVATE = 0x0010
export const SWP_FRAMECHANGED = 0x0020
export const SWP_SHOWWINDOW = 0x0040
export const SWP_HIDEWINDOW = 0x0080
export const HWND_TOP = 0
const GWL_STYLE = -16
const WS_POPUP = 0x80000000n
const WS_CHILD = 0x40000000n
const WS_CAPTION = 0x00c00000n
const WS_THICKFRAME = 0x00040000n
const WS_VISIBLE = 0x10000000n
const GW_HWNDNEXT = 2
const GW_CHILD = 5

export type Hwnd = number | bigint

export function asHwnd(value: unknown): bigint {
  if (typeof value === 'bigint') {
    return value
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return BigInt(Math.trunc(value))
  }

  return 0n
}

export function hwndFromBuffer(buffer: Buffer): bigint {
  if (buffer.length >= 8) {
    return buffer.readBigInt64LE(0)
  }

  return BigInt(buffer.readUInt32LE(0))
}

export function hwndToNumber(buffer: Buffer): number {
  return Number(hwndFromBuffer(buffer))
}

export class Win32User32 {
  private setWindowPos: (
    hwnd: bigint,
    insertAfter: bigint,
    x: number,
    y: number,
    width: number,
    height: number,
    flags: number,
  ) => boolean
  private moveWindow: (
    hwnd: bigint,
    x: number,
    y: number,
    width: number,
    height: number,
    repaint: boolean,
  ) => boolean
  private showWindow: (hwnd: bigint, cmd: number) => boolean
  private isWindow: (hwnd: bigint) => boolean
  private bringWindowToTop: (hwnd: bigint) => boolean
  private findWindowExW: (
    parent: bigint,
    after: bigint,
    className: string | null,
    windowName: string | null,
  ) => bigint
  private getParent: (hwnd: bigint) => bigint
  private setParent: (hwnd: bigint, parent: bigint) => bigint
  private getWindowLongPtrW: (hwnd: bigint, index: number) => bigint
  private setWindowLongPtrW: (hwnd: bigint, index: number, value: bigint) => bigint
  private getWindow: (hwnd: bigint, cmd: number) => bigint

  constructor() {
    const user32 = koffi.load('user32.dll')

    this.setWindowPos = user32.func('SetWindowPos', 'bool', [
      'uintptr',
      'uintptr',
      'int',
      'int',
      'int',
      'int',
      'uint',
    ])
    this.moveWindow = user32.func('MoveWindow', 'bool', [
      'uintptr',
      'int',
      'int',
      'int',
      'int',
      'bool',
    ])
    this.showWindow = user32.func('ShowWindow', 'bool', ['uintptr', 'int'])
    this.isWindow = user32.func('IsWindow', 'bool', ['uintptr'])
    this.bringWindowToTop = user32.func('BringWindowToTop', 'bool', ['uintptr'])
    this.findWindowExW = user32.func('FindWindowExW', 'uintptr', [
      'uintptr',
      'uintptr',
      'str16',
      'str16',
    ])
    this.getParent = user32.func('GetParent', 'uintptr', ['uintptr'])
    this.setParent = user32.func('SetParent', 'uintptr', ['uintptr', 'uintptr'])
    this.getWindowLongPtrW = user32.func('GetWindowLongPtrW', 'intptr', ['uintptr', 'int'])
    this.setWindowLongPtrW = user32.func('SetWindowLongPtrW', 'intptr', [
      'uintptr',
      'int',
      'intptr',
    ])
    this.getWindow = user32.func('GetWindow', 'uintptr', ['uintptr', 'uint'])
  }

  isValidWindow(hwnd: Hwnd): boolean {
    const handle = asHwnd(hwnd)
    return handle !== 0n && this.isWindow(handle)
  }

  moveWindowRepaint(
    hwnd: Hwnd,
    x: number,
    y: number,
    width: number,
    height: number,
    repaint = true,
  ): boolean {
    const handle = asHwnd(hwnd)
    if (!this.isValidWindow(handle)) {
      return false
    }

    return this.moveWindow(
      handle,
      Math.round(x),
      Math.round(y),
      Math.max(1, Math.round(width)),
      Math.max(1, Math.round(height)),
      repaint,
    )
  }

  setWindowPosFlags(
    hwnd: Hwnd,
    insertAfter: Hwnd,
    x: number,
    y: number,
    width: number,
    height: number,
    flags: number,
  ): boolean {
    const handle = asHwnd(hwnd)
    if (!this.isValidWindow(handle)) {
      return false
    }

    return this.setWindowPos(
      handle,
      asHwnd(insertAfter),
      Math.round(x),
      Math.round(y),
      Math.max(1, Math.round(width)),
      Math.max(1, Math.round(height)),
      flags,
    )
  }

  positionWindow(
    hwnd: Hwnd,
    x: number,
    y: number,
    width: number,
    height: number,
    showWindow = false,
  ): boolean {
    const handle = asHwnd(hwnd)
    if (!this.isValidWindow(handle)) {
      return false
    }

    const flags = SWP_NOACTIVATE | (showWindow ? SWP_SHOWWINDOW : SWP_NOZORDER)

    return this.setWindowPos(
      handle,
      0n,
      Math.round(x),
      Math.round(y),
      Math.max(1, Math.round(width)),
      Math.max(1, Math.round(height)),
      flags,
    )
  }

  hideWindow(hwnd: Hwnd) {
    const handle = asHwnd(hwnd)
    if (!this.isValidWindow(handle)) {
      return
    }

    this.setWindowPos(
      handle,
      0n,
      0,
      0,
      0,
      0,
      SWP_HIDEWINDOW | SWP_NOSIZE | SWP_NOMOVE | SWP_NOZORDER | SWP_NOACTIVATE,
    )
    this.showWindow(handle, SW_HIDE)
  }

  showWindowNoActivate(hwnd: Hwnd) {
    const handle = asHwnd(hwnd)
    if (!this.isValidWindow(handle)) {
      return
    }

    this.showWindow(handle, SW_SHOWNA)
    this.bringWindowToTop(handle)
  }

  /** Show a WS_CHILD without activating or raising its top-level owner. */
  showChildNoActivate(hwnd: Hwnd) {
    const handle = asHwnd(hwnd)
    if (!this.isValidWindow(handle)) {
      return
    }

    this.setWindowPos(
      handle,
      0n,
      0,
      0,
      0,
      0,
      SWP_NOMOVE | SWP_NOSIZE | SWP_NOACTIVATE | SWP_SHOWWINDOW,
    )
  }

  /**
   * libVLC sometimes ignores the drawable and opens a top-level
   * "VLC video output" window. Pull any of those back onto the host.
   * Returns true when a popup was reparented.
   */
  reparentPopupsToHost(className: string, host: Hwnd, width: number, height: number): boolean {
    const hostHwnd = asHwnd(host)
    if (!this.isValidWindow(hostHwnd) || width <= 0 || height <= 0) {
      return false
    }

    let after = 0n
    let reparented = false

    for (let i = 0; i < 8; i += 1) {
      const found = asHwnd(this.findWindowExW(0n, after, className, null))
      if (!found) {
        break
      }

      after = found
      if (asHwnd(this.getParent(found)) === hostHwnd) {
        continue
      }

      const style = BigInt.asUintN(32, asHwnd(this.getWindowLongPtrW(found, GWL_STYLE)))
      const next = (style & ~WS_POPUP & ~WS_CAPTION & ~WS_THICKFRAME) | WS_CHILD | WS_VISIBLE
      this.setWindowLongPtrW(found, GWL_STYLE, next)
      this.setParent(found, hostHwnd)
      this.setWindowPos(
        found,
        0n,
        0,
        0,
        0,
        0,
        SWP_FRAMECHANGED | SWP_NOMOVE | SWP_NOSIZE | SWP_NOZORDER | SWP_NOACTIVATE,
      )
      this.moveWindow(found, 0, 0, Math.round(width), Math.round(height), true)
      reparented = true
    }

    this.fitChildren(hostHwnd, width, height)
    return reparented
  }

  fitChildren(host: Hwnd, width: number, height: number) {
    const hostHwnd = asHwnd(host)
    if (!this.isValidWindow(hostHwnd) || width <= 0 || height <= 0) {
      return
    }

    let child = asHwnd(this.getWindow(hostHwnd, GW_CHILD))
    const pixelWidth = Math.max(1, Math.round(width))
    const pixelHeight = Math.max(1, Math.round(height))

    for (let guard = 0; child && guard < 16; guard += 1) {
      this.moveWindow(child, 0, 0, pixelWidth, pixelHeight, true)
      child = asHwnd(this.getWindow(child, GW_HWNDNEXT))
    }
  }
}

let sharedWin32: Win32User32 | null = null

export function getWin32User32(): Win32User32 | null {
  if (process.platform !== 'win32') {
    return null
  }

  if (!sharedWin32) {
    sharedWin32 = new Win32User32()
  }

  return sharedWin32
}
