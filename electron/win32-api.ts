import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const koffi = require('koffi')

export const SW_HIDE = 0
export const SW_SHOWNA = 8
export const SWP_NOSIZE = 0x0001
export const SWP_NOMOVE = 0x0002
export const SWP_NOZORDER = 0x0004
export const SWP_NOACTIVATE = 0x0010
export const SWP_SHOWWINDOW = 0x0040
export const SWP_HIDEWINDOW = 0x0080
export const HWND_TOP = 0

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
    hwnd: number,
    insertAfter: number,
    x: number,
    y: number,
    width: number,
    height: number,
    flags: number,
  ) => boolean
  private moveWindow: (
    hwnd: number,
    x: number,
    y: number,
    width: number,
    height: number,
    repaint: boolean,
  ) => boolean
  private showWindow: (hwnd: number, cmd: number) => boolean
  private isWindow: (hwnd: number) => boolean
  private bringWindowToTop: (hwnd: number) => boolean

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
  }

  isValidWindow(hwnd: number): boolean {
    return hwnd !== 0 && this.isWindow(hwnd)
  }

  moveWindowRepaint(
    hwnd: number,
    x: number,
    y: number,
    width: number,
    height: number,
    repaint = true,
  ): boolean {
    if (!this.isValidWindow(hwnd)) {
      return false
    }

    return this.moveWindow(
      hwnd,
      Math.round(x),
      Math.round(y),
      Math.max(1, Math.round(width)),
      Math.max(1, Math.round(height)),
      repaint,
    )
  }

  setWindowPosFlags(
    hwnd: number,
    insertAfter: number,
    x: number,
    y: number,
    width: number,
    height: number,
    flags: number,
  ): boolean {
    if (!this.isValidWindow(hwnd)) {
      return false
    }

    return this.setWindowPos(
      hwnd,
      insertAfter,
      Math.round(x),
      Math.round(y),
      Math.max(1, Math.round(width)),
      Math.max(1, Math.round(height)),
      flags,
    )
  }

  positionWindow(
    hwnd: number,
    x: number,
    y: number,
    width: number,
    height: number,
    showWindow = false,
  ): boolean {
    if (!this.isValidWindow(hwnd)) {
      return false
    }

    const flags = SWP_NOACTIVATE | (showWindow ? SWP_SHOWWINDOW : SWP_NOZORDER)

    return this.setWindowPos(
      hwnd,
      0,
      Math.round(x),
      Math.round(y),
      Math.max(1, Math.round(width)),
      Math.max(1, Math.round(height)),
      flags,
    )
  }

  hideWindow(hwnd: number) {
    if (!this.isValidWindow(hwnd)) {
      return
    }

    this.setWindowPos(hwnd, 0, 0, 0, 0, 0, SWP_HIDEWINDOW | SWP_NOSIZE | SWP_NOMOVE | SWP_NOZORDER | SWP_NOACTIVATE)
    this.showWindow(hwnd, SW_HIDE)
  }

  showWindowNoActivate(hwnd: number) {
    if (!this.isValidWindow(hwnd)) {
      return
    }

    this.showWindow(hwnd, SW_SHOWNA)
    this.bringWindowToTop(hwnd)
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
