import { createRequire } from 'node:module'
import { getWin32User32 } from './win32-api.js'

const require = createRequire(import.meta.url)
const koffi = require('koffi')

const WS_CHILD = 0x40000000
const WS_CLIPSIBLINGS = 0x04000000

export type Win32ViewportBounds = {
  x: number
  y: number
  width: number
  height: number
}

/**
 * Native empty WS_CHILD window for libVLC output.
 * Positioned with MoveWindow to match the React video div bounds.
 */
export class Win32VideoHost {
  private hwnd = 0
  private hwndAttachedToVlc = false
  private createWindowExW: (
    exStyle: number,
    className: string,
    windowName: string,
    style: number,
    x: number,
    y: number,
    width: number,
    height: number,
    parent: number,
    menu: number,
    instance: number,
    param: number,
  ) => number
  private destroyWindow: (hwnd: number) => boolean
  private getModuleHandleW: (name: unknown) => number
  private win32 = getWin32User32()

  constructor() {
    const user32 = koffi.load('user32.dll')
    const kernel32 = koffi.load('kernel32.dll')

    this.createWindowExW = user32.func('CreateWindowExW', 'uintptr', [
      'long',
      'str16',
      'str16',
      'ulong',
      'int',
      'int',
      'int',
      'int',
      'uintptr',
      'uintptr',
      'uintptr',
      'uintptr',
    ])
    this.destroyWindow = user32.func('DestroyWindow', 'bool', ['uintptr'])
    this.getModuleHandleW = kernel32.func('GetModuleHandleW', 'uintptr', ['void *'])
  }

  get handle(): number {
    return this.hwnd
  }

  get handleBigInt(): bigint {
    return BigInt(this.hwnd)
  }

  isAttachedToVlc(): boolean {
    return this.hwndAttachedToVlc
  }

  markAttachedToVlc() {
    this.hwndAttachedToVlc = true
  }

  ensure(parentHwnd: number, bounds: Win32ViewportBounds): number {
    const width = Math.max(1, Math.round(bounds.width))
    const height = Math.max(1, Math.round(bounds.height))
    const x = Math.round(bounds.x)
    const y = Math.round(bounds.y)

    if (!this.hwnd) {
      const instance = this.getModuleHandleW(null)
      this.hwnd = Number(
        this.createWindowExW(
          0,
          'STATIC',
          '',
          WS_CHILD | WS_CLIPSIBLINGS,
          x,
          y,
          width,
          height,
          parentHwnd,
          0,
          instance,
          0,
        ),
      )

      if (!this.hwnd) {
        throw new Error('CreateWindowExW failed for libVLC video host')
      }
    }

    this.setBounds(bounds)
    return this.hwnd
  }

  setBounds(bounds: Win32ViewportBounds) {
    if (!this.hwnd || !this.win32) {
      return
    }

    this.win32.moveWindowRepaint(
      this.hwnd,
      bounds.x,
      bounds.y,
      bounds.width,
      bounds.height,
      true,
    )
  }

  hide() {
    if (!this.hwnd || !this.win32) {
      return
    }

    this.win32.hideWindow(this.hwnd)
  }

  show() {
    if (!this.hwnd || !this.win32) {
      return
    }

    this.win32.showWindowNoActivate(this.hwnd)
  }

  destroy() {
    if (!this.hwnd) {
      return
    }

    this.destroyWindow(this.hwnd)
    this.hwnd = 0
    this.hwndAttachedToVlc = false
  }
}
