import { createRequire } from 'node:module'
import { asHwnd, type Hwnd, getWin32User32 } from './win32-api.js'

const require = createRequire(import.meta.url)
const koffi = require('koffi')

const WS_CHILD = 0x40000000
const WS_CLIPSIBLINGS = 0x04000000
const WS_CLIPCHILDREN = 0x02000000
const WS_EX_NOACTIVATE = 0x08000000

export type Win32ViewportBounds = {
  x: number
  y: number
  width: number
  height: number
}

/**
 * Native WS_CHILD window for libVLC output.
 * Parenting the drawable to the Electron frame keeps the picture clipped
 * inside the app. A top-level BrowserWindow used to show up as its own window.
 */
export class Win32VideoHost {
  private hwnd = 0n
  private parentHwnd = 0n
  private hwndAttachedToVlc = false
  private bounds: Win32ViewportBounds | null = null
  private createWindowExW: (
    exStyle: number,
    className: string,
    windowName: string,
    style: number,
    x: number,
    y: number,
    width: number,
    height: number,
    parent: bigint,
    menu: bigint,
    instance: bigint,
    param: bigint,
  ) => bigint
  private destroyWindow: (hwnd: bigint) => boolean
  private getModuleHandleW: (name: unknown) => bigint
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

  get handle(): bigint {
    return this.hwnd
  }

  get currentBounds(): Win32ViewportBounds | null {
    return this.bounds
  }

  isAttachedToVlc(): boolean {
    return this.hwndAttachedToVlc
  }

  markAttachedToVlc() {
    this.hwndAttachedToVlc = true
  }

  ensure(parentHwnd: Hwnd, bounds: Win32ViewportBounds): bigint {
    const parent = asHwnd(parentHwnd)
    const width = Math.max(1, Math.round(bounds.width))
    const height = Math.max(1, Math.round(bounds.height))
    const x = Math.round(bounds.x)
    const y = Math.round(bounds.y)

    if (this.hwnd && this.parentHwnd !== parent) {
      this.destroy()
    }

    if (!this.hwnd) {
      const instance = asHwnd(this.getModuleHandleW(null))
      this.hwnd = asHwnd(
        this.createWindowExW(
          WS_EX_NOACTIVATE,
          'STATIC',
          '',
          WS_CHILD | WS_CLIPSIBLINGS | WS_CLIPCHILDREN,
          x,
          y,
          width,
          height,
          parent,
          0n,
          instance,
          0n,
        ),
      )
      this.parentHwnd = parent

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

    const next = {
      x: Math.round(bounds.x),
      y: Math.round(bounds.y),
      width: Math.max(1, Math.round(bounds.width)),
      height: Math.max(1, Math.round(bounds.height)),
    }
    this.bounds = next
    this.win32.moveWindowRepaint(this.hwnd, next.x, next.y, next.width, next.height, true)
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

    this.win32.showChildNoActivate(this.hwnd)
  }

  destroy() {
    if (!this.hwnd) {
      return
    }

    this.destroyWindow(this.hwnd)
    this.hwnd = 0n
    this.parentHwnd = 0n
    this.bounds = null
    this.hwndAttachedToVlc = false
  }
}
