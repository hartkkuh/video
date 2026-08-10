import koffi from 'koffi'
import path from 'node:path'
import fs from 'node:fs'

const dir = process.cwd()
process.env.VLC_PLUGIN_PATH = path.join(dir, 'libvlc', 'plugins')
process.env.PATH = `${path.join(dir, 'libvlc')};${process.env.PATH ?? ''}`

const lib = koffi.load(path.join(dir, 'libvlc', 'libvlc.dll'))
const libvlc_new = lib.func('libvlc_new', 'void *', ['int', 'char **'])
const libvlc_release = lib.func('libvlc_release', 'void', ['void *'])
const media_new_path = lib.func('libvlc_media_new_path', 'void *', ['void *', 'str'])
const media_add_option = lib.func('libvlc_media_add_option', 'void', ['void *', 'str'])
const media_release = lib.func('libvlc_media_release', 'void', ['void *'])
const mp_new = lib.func('libvlc_media_player_new', 'void *', ['void *'])
const mp_set_media = lib.func('libvlc_media_player_set_media', 'void', ['void *', 'void *'])
const mp_play = lib.func('libvlc_media_player_play', 'int', ['void *'])
const mp_stop = lib.func('libvlc_media_player_stop', 'void', ['void *'])
const mp_release = lib.func('libvlc_media_player_release', 'void', ['void *'])

const src = path.join(dir, '_rectest_src.mp4')

async function run(label, sout) {
	const dest = path.join(dir, `_rt3_${label}.mp4`)
	try { fs.rmSync(dest, { force: true }) } catch {}
	const inst = libvlc_new(2, ['--vout=dummy', '--aout=dummy'])
	const media = media_new_path(inst, src)
	media_add_option(media, sout.replace('__DEST__', dest.replace(/\\/g, '/')))
	media_add_option(media, ':sout-all')
	const mp = mp_new(inst)
	mp_set_media(mp, media)
	mp_play(mp)
	await new Promise((r) => setTimeout(r, 8000))
	mp_stop(mp)
	await new Promise((r) => setTimeout(r, 400))
	mp_release(mp); media_release(media); libvlc_release(inst)
	const ok = fs.existsSync(dest) && fs.statSync(dest).size > 0
	console.log(`RESULT ${label}: ${ok ? fs.statSync(dest).size + ' bytes OK' : 'MISSING'}`)
}

// Quoted chain as duplicate destination
await run('quoted_fx', `:sout=#duplicate{dst=display,dst="transcode{vcodec=h264,venc=x264{preset=ultrafast,tune=zerolatency,crf=28},acodec=mp4a,ab=160,vfilter=adjust{brightness=1.200,contrast=1.000,saturation=1.000,hue=0.00,gamma=1.000}}:std{access=file,mux=mp4,dst='__DEST__'}}"}`)

// Quoted, no display branch (pure transcode->file)
await run('quoted_nodisp', `:sout=#transcode{vcodec=h264,venc=x264{preset=ultrafast},acodec=mp4a,ab=160}:std{access=file,mux=mp4,dst='__DEST__'}`)

process.exit(0)
