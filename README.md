# FMP Video Player

A Windows desktop media player. It plays video and audio files through libVLC, with a React interface in Hebrew and English, an equalizer, picture effects, encoding details, and recording of whatever is playing.

The app is Electron. The main window is a React page, and the picture itself is drawn in a native Win32 window that sits inside the Electron frame. libVLC covers a wide range of formats, and the interface stays above the video.

Current version: `0.2.1`. App id: `com.fmp.videoplayer`.

## What the player does

- Opens one file, several files, or a folder, and plays them as a list.
- Accepts files dropped onto the window, and files opened from the system (a file-type association, or a second launch of the same shortcut).
- Runs as a single instance. A later launch hands its files to the window that is already open.
- Play, pause, 10-second skip, volume, mute, and playback speed from 0.25 to 2.
- Repeat off, repeat the list, or repeat the current file, plus shuffle.
- Fullscreen, and a control bar that can sit above the video or below it.
- A 10-band graphic equalizer with output gain, and ready-made presets.
- Picture effects: hue, contrast, brightness, saturation, gamma, and profiles such as Vivid, Cinematic, and Black & white.
- File details (title, artist, album, episode) and encoding details for each video, audio, and subtitle track.
- Recording of playback to a file. Video is saved as H.264/AAC inside MP4.
- A dark or light theme, and an interface in Hebrew (the default, right to left) or English.
- A quiet update check on launch, and an update button in Settings. Installing an update downloads the NSIS setup and runs it.

Keyboard shortcuts in the player: Space for play or pause, Left and Right to skip, Up and Down for volume.

## How the picture is drawn

The picture is drawn in a native child window, separate from the React page. The Electron main process loads `libvlc.dll` through [koffi](https://github.com/Koromix/koffi) and creates a child window (`WS_CHILD`) on the Electron parent window. The React UI measures the video area and sends those bounds to the main process, which moves the native window to the same place.

The control bar and the file menus are separate transparent Electron windows that float above the video layer. While a system file dialog is open, or when the main window loses focus, those layers are hidden so they stay inside this app.

The audio and video extensions the player accepts are listed in `shared/vlc-media-extensions.ts`, following VLC's extension lists. Thumbnails and metadata are also read through libVLC (`electron/media-probe.ts`).

The local libVLC build lives in the `libvlc/` folder at the repo root. In development it is loaded from there. In a packaged build it is copied to `resources/libvlc` (`list.md` is left out).

## Layout

| Path | Role |
| --- | --- |
| `src/` | React UI: player, effects, media details, settings, navbar |
| `electron/` | Main process: windows, libVLC, Win32, updates, storage |
| `electron/preload.ts` | The `window.electronAPI` bridge between the UI and the main process |
| `shared/` | Types and media extensions shared by both sides |
| `libvlc/` | The libVLC binaries and plugins shipped with the app |
| `build/` | Icon and the NSIS script |
| `scripts/` | Dev startup, icon generation, `update.json` sync, and the installer build |
| `.github/workflows/release.yml` | Build on every push, then publish the same release to both repositories |

Screens:

- `/player` — the player
- `/effects` — audio and video effects
- `/media` — file and encoding details
- `/settings` — language, theme, control-bar position, and updates

## What is kept between launches

Settings and playback memory are stored together in `settings.json` inside the app data folder (`app.getPath('userData')`), shaped as `{ settings, memory }`. An older `memory.json` is merged into that file on the first read, then removed.

What is stored: language, theme, control-bar position, volume, mute, speed, repeat mode, shuffle, the last opened folder, the last effects tab, the last media-details tab, and the effect values. The open file list lives only for the current session.

Uninstall leaves the data folder in place.

## Development

You need Windows x64, Node.js 22, and a complete `libvlc` folder (the DLL and the `plugins` directory).

```bash
npm install
npm run dev
```

`npm run dev` removes stale Electron outputs, runs Vite in watch mode, and waits for `dist/index.html`, `dist-electron/main.js`, and `dist-electron/preload.cjs` before it opens Electron.

Other commands:

| Command | What it does |
| --- | --- |
| `npm run build` | Typecheck, then build the UI and the main process |
| `npm start` | Open Electron against the existing build |
| `npm run lint` | Oxlint |
| `npm run icons` | Generate `build/icon.ico` |
| `npm run dist` | NSIS installer in the `release/` folder |
| `npm run dist:dir` | An unpacked app folder, for a local check |
| `npm run dist:publish` | The same build, with electron-builder publishing |

The build uses Vite 8, React 19, TypeScript, and Electron 42. electron-builder targets an NSIS installer for Windows x64, with a choice of install folder, desktop and Start menu shortcuts, and a launch when setup finishes. The installer includes Hebrew and English and follows the system language.

Registered video types include mp4, mkv, avi, mov, wmv, webm, mpeg, flv, ts, m2ts, ogv, and vob, among others. The full list is in `electron-builder.yml`.

## Releases and updates

Every push to `main` or `master` runs `.github/workflows/release.yml`. The workflow can also be started by hand.

The build runs once on `windows-latest`. After that, two releases are published in parallel, with the same `v<version>` tag, the same name, and the same description from `body.txt`:

- [hartkkuh/video](https://github.com/hartkkuh/video) — the source repository. This upload uses the workflow token, which has `contents: write`.
- [hartkkuh/FMP-Media-Player](https://github.com/hartkkuh/FMP-Media-Player) — the public release repository. This upload uses the `RELEASE_TOKEN` secret stored on the source repository. That token needs Contents read and write on `FMP-Media-Player`.

The installed app checks for updates against the latest release of `hartkkuh/FMP-Media-Player`. The download URL in `update.json` is synced to that repository before every build (`scripts/sync-update-json.mjs`).

Each release includes the installer `FMP Video Player-Setup-<version>.exe`, the `blockmap` file, and `latest.yml`.
