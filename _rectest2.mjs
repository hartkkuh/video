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

async function run(label, transcodeBody) {
	const dest = path.join(dir, `_rt_${label}.mp4`)
	try { fs.rmSync(dest, { force: true }) } catch {}
	const inst = libvlc_new(2, ['--vout=dummy', '--aout=dummy'])
	const media = media_new_path(inst, src)
	const sout = `:sout=#duplicate{dst=display,dst=transcode{${transcodeBody}}:std{access=file,mux=mp4,dst='${dest.replace(/\\/g, '/')}'}}`
	media_add_option(media, sout)
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

const variants = {
	A_vonly: 'vcodec=h264,venc=x264{preset=ultrafast}',
	B_vaudio: 'vcodec=h264,venc=x264{preset=ultrafast},acodec=mp4a,ab=160',
	C_full: 'vcodec=h264,venc=x264{preset=ultrafast,tune=zerolatency,crf=28},scale=1,threads=0,acodec=mp4a,ab=160,channels=2,samplerate=44100',
	D_vfilter: 'vcodec=h264,venc=x264{preset=ultrafast},vfilter=adjust{brightness=1.2}',
	E_vcopy_afilter: 'vcodec=copy,acodec=mp4a,ab=160,afilter=equalizer{preamp=0,bands=0 0 0 0 0 0 0 0 0 0}',
	F_acodecmp4a: 'vcodec=copy,acodec=mp4a,ab=160',
}

for (const [k, v] of Object.entries(variants)) {
	await run(k, v)
}
process.exit(0)
