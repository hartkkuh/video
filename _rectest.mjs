import koffi from 'koffi'
import path from 'node:path'
import fs from 'node:fs'

const dir = process.cwd()
process.env.VLC_PLUGIN_PATH = path.join(dir, 'libvlc', 'plugins')
process.env.PATH = `${path.join(dir, 'libvlc')};${process.env.PATH ?? ''}`

const lib = koffi.load(path.join(dir, 'libvlc', 'libvlc.dll'))
const libvlc_new = lib.func('libvlc_new', 'void *', ['int', 'char **'])
const libvlc_release = lib.func('libvlc_release', 'void', ['void *'])
const libvlc_errmsg = lib.func('libvlc_errmsg', 'str', [])
const media_new_path = lib.func('libvlc_media_new_path', 'void *', ['void *', 'str'])
const media_add_option = lib.func('libvlc_media_add_option', 'void', ['void *', 'str'])
const media_release = lib.func('libvlc_media_release', 'void', ['void *'])
const mp_new = lib.func('libvlc_media_player_new', 'void *', ['void *'])
const mp_set_media = lib.func('libvlc_media_player_set_media', 'void', ['void *', 'void *'])
const mp_play = lib.func('libvlc_media_player_play', 'int', ['void *'])
const mp_stop = lib.func('libvlc_media_player_stop', 'void', ['void *'])
const mp_release = lib.func('libvlc_media_player_release', 'void', ['void *'])
const mp_get_state = lib.func('libvlc_media_player_get_state', 'int', ['void *'])

const src = path.join(dir, '_rectest_src.mp4')

async function run(label, dest, options) {
	try { fs.rmSync(dest, { force: true }) } catch {}
	// verbose instance (no --quiet) so libVLC prints sout errors
	const inst = libvlc_new(3, ['--vout=dummy', '--aout=dummy', '--verbose=2'])
	console.log(`\n=== ${label} === instance:`, inst ? 'OK' : 'NULL')
	const media = media_new_path(inst, src)
	for (const o of options) media_add_option(media, o)
	const mp = mp_new(inst)
	mp_set_media(mp, media)
	const played = mp_play(mp)
	console.log('play:', played, played !== 0 ? libvlc_errmsg() : '')
	// Let it run to completion (6s clip) + margin
	await new Promise((r) => setTimeout(r, 9000))
	console.log('state before stop:', mp_get_state(mp))
	mp_stop(mp)
	await new Promise((r) => setTimeout(r, 500))
	mp_release(mp)
	media_release(media)
	libvlc_release(inst)
	const exists = fs.existsSync(dest)
	console.log('FILE:', exists ? `${fs.statSync(dest).size} bytes` : 'MISSING', dest)
}

const copyDest = path.join(dir, '_rectest_copy.mp4')
const fxDest = path.join(dir, '_rectest_fx.mp4')

await run('stream-copy + display', copyDest, [
	`:sout=#duplicate{dst=display,dst=std{access=file,mux=mp4,dst='${copyDest.replace(/\\/g, '/')}'}}`,
	':sout-all',
])

await run('transcode fx + display', fxDest, [
	`:sout=#duplicate{dst=display,dst=transcode{vcodec=h264,venc=x264{preset=ultrafast,tune=zerolatency,crf=28},scale=1,threads=0,acodec=mp4a,ab=160,channels=2,samplerate=44100,vfilter=adjust{brightness=1.200,contrast=1.000,saturation=1.000,hue=0.00,gamma=1.000}}:std{access=file,mux=mp4,dst='${fxDest.replace(/\\/g, '/')}'}}`,
	':sout-all',
])

process.exit(0)
