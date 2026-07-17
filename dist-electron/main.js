import { createRequire as e } from "node:module";
import { BrowserWindow as t, Menu as n, app as r, dialog as i, ipcMain as a, nativeImage as o, screen as s } from "electron";
import c from "node:fs";
import l from "node:fs/promises";
import u from "node:path";
import { fileURLToPath as d } from "node:url";
//#region shared/vlc-media-extensions.ts
var f = /* @__PURE__ */ ".3ga,.669,.a52,.aac,.ac3,.adt,.adts,.aif,.aifc,.aiff,.alac,.amb,.amr,.aob,.ape,.au,.awb,.caf,.dts,.dsf,.dff,.flac,.it,.kar,.m4a,.m4b,.m4p,.m5p,.mid,.mka,.mlp,.mod,.mpa,.mp1,.mp2,.mp3,.mpc,.mpga,.mus,.oga,.ogg,.oma,.opus,.qcp,.ra,.rmi,.s3m,.sid,.spx,.tak,.thd,.tta,.voc,.vqf,.w64,.wav,.wma,.wv,.xa,.xm".split(","), p = /* @__PURE__ */ ".3g2,.3gp,.3gp2,.3gpp,.amrec,.amv,.asf,.avi,.bik,.bin,.crf,.dav,.divx,.drc,.dv,.dvr-ms,.evo,.f4v,.flv,.gvi,.gxf,.iso,.k3g,.m1v,.m2v,.m2t,.m2ts,.m4v,.mkv,.mov,.mp2,.mp2v,.mp4,.mp4v,.mpe,.mpeg,.mpeg1,.mpeg2,.mpeg4,.mpg,.mpv2,.mts,.mtv,.mxf,.mxg,.nsv,.nuv,.ogg,.ogm,.ogv,.ogx,.ps,.qt,.rec,.rm,.rmvb,.rpl,.skm,.thp,.tod,.tp,.ts,.tts,.txd,.vob,.vp6,.vro,.webm,.wm,.wmv,.wtv,.xesc".split(","), m = /* @__PURE__ */ ".cdg,.idx,.srt,.sub,.utf,.ass,.ssa,.aqt,.jss,.psb,.rt,.sami,.smi,.txt,.smil,.stl,.usf,.dks,.pjs,.mpl2,.mks,.vtt,.tt,.ttml,.dfxp,.scc".split(",");
function h(...e) {
	return [...new Set(e.flat())];
}
var g = {
	audio: f,
	video: p,
	subtitles: m,
	media: h(f, p)
}, _ = {
	audio: new Set(g.audio),
	video: new Set(g.video),
	subtitles: new Set(g.subtitles),
	media: new Set(g.media)
}, v = {
	audio: "Audio",
	video: "Video",
	subtitles: "Subtitles",
	media: "Audio and Video"
};
function y(e) {
	return e === "audio" || e === "video" || e === "subtitles" || e === "media";
}
function ee(e) {
	let t = g[e].map((e) => e.slice(1));
	return [{
		name: v[e],
		extensions: t
	}];
}
function te(e, t) {
	let n = u.extname(e).toLowerCase();
	return _[t].has(n);
}
async function ne(e, t) {
	let n = await l.readdir(e, { withFileTypes: !0 }), r = [];
	for (let i of n) {
		if (!i.isFile()) continue;
		let n = u.join(e, i.name);
		te(n, t) && r.push(n);
	}
	return r.sort((e, t) => e.localeCompare(t));
}
async function re(e, t, n) {
	let r = await i.showOpenDialog(e, {
		properties: ["openFile"],
		filters: ee(t),
		...n ? { defaultPath: n } : {}
	});
	return r.canceled || r.filePaths.length === 0 ? null : r.filePaths[0];
}
async function ie(e, t, n) {
	let r = await i.showOpenDialog(e, {
		properties: ["openFile", "multiSelections"],
		filters: ee(t),
		...n ? { defaultPath: n } : {}
	});
	return r.canceled ? [] : r.filePaths;
}
async function ae(e, t, n) {
	let r = await i.showOpenDialog(e, {
		properties: ["openDirectory"],
		...n ? { defaultPath: n } : {}
	});
	return r.canceled || r.filePaths.length === 0 ? [] : ne(r.filePaths[0], t);
}
var b = {
	volume: 1,
	volumeMuted: !1,
	playbackRate: 1,
	repeatMode: "off",
	shuffleEnabled: !1,
	lastOpenDirectory: "",
	lastEffectsTab: "audio",
	lastMediaTab: "file",
	audioEffects: {
		bands: Array.from({ length: 10 }, () => 0),
		outputGain: 1
	},
	videoEffects: {
		grayscale: 0,
		contrast: 1,
		brightness: 1,
		saturation: 1,
		sepia: 0,
		hue: 0,
		gamma: 1,
		blur: 0
	}
};
({ ...b });
function oe(e) {
	return e === "all" || e === "one" ? e : "off";
}
function se(e) {
	return e === "video" ? "video" : "audio";
}
function ce(e) {
	return e === "encoding" ? "encoding" : "file";
}
function le(e) {
	return Array.isArray(e) ? e.filter((e) => typeof e == "string" && e.length > 0) : [];
}
function ue(e) {
	return typeof e != "number" || !Number.isFinite(e) ? b.volume : Math.min(2, Math.max(0, e));
}
function de(e) {
	return typeof e != "number" || !Number.isFinite(e) ? b.playbackRate : Math.min(2, Math.max(.25, e));
}
function fe(e, t) {
	return typeof e != "number" || !Number.isFinite(e) || t === 0 ? 0 : Math.min(Math.max(0, Math.floor(e)), t - 1);
}
function pe(e) {
	return typeof e == "string" ? e : "";
}
function x(e, t, n, r) {
	return typeof e != "number" || !Number.isFinite(e) ? r : Math.min(n, Math.max(t, e));
}
function me(e) {
	let t = typeof e == "object" && e ? e : {}, n = Array.isArray(t.bands) ? t.bands : [];
	return {
		bands: Array.from({ length: 10 }, (e, t) => x(n[t], -12, 12, 0)),
		outputGain: x(t.outputGain, .5, 2, 1)
	};
}
function he(e) {
	let t = typeof e == "object" && e ? e : {};
	return {
		grayscale: x(t.grayscale, 0, 100, 0),
		contrast: x(t.contrast, 0, 3, 1),
		brightness: x(t.brightness, 0, 3, 1),
		saturation: x(t.saturation, 0, 3, 1),
		sepia: x(t.sepia, 0, 100, 0),
		hue: x(t.hue, 0, 360, 0),
		gamma: x(t.gamma, .01, 10, 1),
		blur: x(t.blur, 0, 10, 0)
	};
}
function ge(e) {
	let t = e.replace(/\\/g, "/"), n = t.lastIndexOf("/");
	return n < 0 ? "" : e.slice(0, e.length - (t.length - n));
}
function _e(e) {
	let t = pe(e.lastOpenDirectory);
	if (t.length > 0) return t;
	let n = le(e.filePaths);
	return n.length === 0 ? "" : ge(n[fe(e.currentIndex, n.length)] ?? n[n.length - 1]);
}
function ve(e) {
	if (typeof e != "object" || !e) return b;
	let t = e;
	return {
		volume: ue(t.volume),
		volumeMuted: t.volumeMuted === !0,
		playbackRate: de(t.playbackRate),
		repeatMode: oe(t.repeatMode),
		shuffleEnabled: t.shuffleEnabled === !0,
		lastOpenDirectory: _e(t),
		lastEffectsTab: se(t.lastEffectsTab),
		lastMediaTab: ce(t.lastMediaTab),
		audioEffects: me(t.audioEffects),
		videoEffects: he(t.videoEffects)
	};
}
//#endregion
//#region electron/memory.ts
var ye = b;
async function be(e) {
	if (!e) return !1;
	try {
		return (await l.stat(e)).isDirectory();
	} catch {
		return !1;
	}
}
async function S(e) {
	let t = ve(e);
	return !t.lastOpenDirectory || await be(t.lastOpenDirectory) ? t : {
		...t,
		lastOpenDirectory: ""
	};
}
function xe(e) {
	return {
		...e,
		filePaths: [],
		currentIndex: 0
	};
}
//#endregion
//#region electron/settings.ts
var C = {
	language: "he",
	theme: "dark",
	controlsPosition: "bottom"
};
function Se(e) {
	return e === "en" || e === "he" ? e : C.language;
}
function Ce(e) {
	return e === "light" ? "light" : "dark";
}
function we(e) {
	return e === "top" ? "top" : C.controlsPosition;
}
function w(e) {
	if (typeof e != "object" || !e) return C;
	let t = e;
	return {
		language: Se(t.language),
		theme: Ce(t.theme),
		controlsPosition: we(t.controlsPosition)
	};
}
//#endregion
//#region electron/vlc-effects.ts
var Te = {
	grayscale: 0,
	contrast: 1,
	brightness: 1,
	saturation: 1,
	sepia: 0,
	hue: 0,
	gamma: 1,
	blur: 0
};
function T(e) {
	return e.bands.every((e) => Math.abs(e) < .01) && Math.abs(e.outputGain - 1) < .01;
}
function E(e) {
	return e.grayscale === 0 && Math.abs(e.contrast - 1) < .01 && Math.abs(e.brightness - 1) < .01 && Math.abs(e.saturation - 1) < .01 && e.sepia === 0 && Math.abs(e.hue) < .01 && Math.abs(e.gamma - 1) < .01 && e.blur === 0;
}
function Ee(e) {
	return 20 * Math.log10(Math.min(2, Math.max(.5, e)));
}
function De(e) {
	return Math.abs(e) <= 180 ? e : e - 360;
}
function Oe(e) {
	let t = 1 - e.grayscale / 100, n = e.sepia / 100;
	return {
		enabled: !E(e),
		brightness: e.brightness * (1 + n * .06),
		contrast: e.contrast * (1 + n * .08),
		saturation: e.saturation * t * (1 - n * .45),
		hue: De(e.hue + n * 55),
		gamma: e.gamma * (1 - n * .04)
	};
}
function D(e) {
	return e.blur > 0;
}
function ke(e) {
	return e.blur <= 0 ? [] : [":video-filter=gaussianblur", `:gaussianblur-sigma=${Math.max(.1, e.blur).toFixed(2)}`];
}
function Ae(e) {
	let t = [], n = Oe(e);
	return n.enabled && t.push(`adjust{brightness=${n.brightness.toFixed(3)},contrast=${n.contrast.toFixed(3)},saturation=${n.saturation.toFixed(3)},hue=${n.hue.toFixed(2)},gamma=${n.gamma.toFixed(3)}}`), e.blur > 0 && t.push(`gaussianblur{sigma=${Math.max(.1, e.blur).toFixed(2)}}`), t.length > 0 ? t.join(":") : null;
}
function je(e) {
	if (T(e)) return null;
	let t = Array.from({ length: 10 }, (t, n) => (e.bands[n] ?? 0).toFixed(1)).join(" ");
	return `equalizer{preamp=${Ee(e.outputGain).toFixed(2)},bands=${t}}`;
}
//#endregion
//#region electron/win32-api.ts
var Me = e(import.meta.url)("koffi");
function O(e) {
	return e.length >= 8 ? e.readBigInt64LE(0) : BigInt(e.readUInt32LE(0));
}
function Ne(e) {
	return Number(O(e));
}
var Pe = class {
	setWindowPos;
	moveWindow;
	showWindow;
	isWindow;
	bringWindowToTop;
	constructor() {
		let e = Me.load("user32.dll");
		this.setWindowPos = e.func("SetWindowPos", "bool", [
			"uintptr",
			"uintptr",
			"int",
			"int",
			"int",
			"int",
			"uint"
		]), this.moveWindow = e.func("MoveWindow", "bool", [
			"uintptr",
			"int",
			"int",
			"int",
			"int",
			"bool"
		]), this.showWindow = e.func("ShowWindow", "bool", ["uintptr", "int"]), this.isWindow = e.func("IsWindow", "bool", ["uintptr"]), this.bringWindowToTop = e.func("BringWindowToTop", "bool", ["uintptr"]);
	}
	isValidWindow(e) {
		return e !== 0 && this.isWindow(e);
	}
	moveWindowRepaint(e, t, n, r, i, a = !0) {
		return this.isValidWindow(e) ? this.moveWindow(e, Math.round(t), Math.round(n), Math.max(1, Math.round(r)), Math.max(1, Math.round(i)), a) : !1;
	}
	setWindowPosFlags(e, t, n, r, i, a, o) {
		return this.isValidWindow(e) ? this.setWindowPos(e, t, Math.round(n), Math.round(r), Math.max(1, Math.round(i)), Math.max(1, Math.round(a)), o) : !1;
	}
	positionWindow(e, t, n, r, i, a = !1) {
		if (!this.isValidWindow(e)) return !1;
		let o = 16 | (a ? 64 : 4);
		return this.setWindowPos(e, 0, Math.round(t), Math.round(n), Math.max(1, Math.round(r)), Math.max(1, Math.round(i)), o);
	}
	hideWindow(e) {
		this.isValidWindow(e) && (this.setWindowPos(e, 0, 0, 0, 0, 0, 151), this.showWindow(e, 0));
	}
	showWindowNoActivate(e) {
		this.isValidWindow(e) && (this.showWindow(e, 8), this.bringWindowToTop(e));
	}
}, Fe = null;
function Ie() {
	return process.platform === "win32" ? (Fe ||= new Pe(), Fe) : null;
}
//#endregion
//#region electron/vlc-player.ts
var Le = e(import.meta.url)("koffi"), k = 3, Re = 4, ze = 6, Be = 1.5, Ve = 200, He = {
	".mp4": "mp4",
	".m4v": "mp4",
	".m4a": "mp4",
	".m4b": "mp4",
	".mov": "mp4",
	".qt": "mp4",
	".3gp": "mp4",
	".3g2": "mp4",
	".3gpp": "mp4",
	".mkv": "mkv",
	".mka": "mkv",
	".webm": "webm",
	".avi": "avi",
	".ts": "ts",
	".m2ts": "ts",
	".mts": "ts",
	".m2t": "ts",
	".tts": "ts",
	".mpg": "ps",
	".mpeg": "ps",
	".ps": "ps",
	".vob": "ps",
	".ogg": "ogg",
	".oga": "ogg",
	".ogv": "ogg",
	".ogm": "ogg",
	".ogx": "ogg",
	".opus": "ogg",
	".spx": "ogg",
	".wav": "wav",
	".asf": "asf",
	".wmv": "asf",
	".wma": "asf",
	".wm": "asf",
	".flv": "flv",
	".f4v": "flv",
	".mp3": "raw",
	".mp2": "raw",
	".mp1": "raw",
	".mpga": "raw",
	".mpa": "raw",
	".aac": "raw",
	".adts": "raw",
	".adt": "raw",
	".ac3": "raw",
	".a52": "raw",
	".dts": "raw",
	".flac": "raw"
}, Ue = /* @__PURE__ */ new Set([
	".mp3",
	".mp2",
	".mp1",
	".mpga",
	".mpa",
	".aac",
	".adts",
	".adt",
	".ac3",
	".a52",
	".dts",
	".flac",
	".wav",
	".wma",
	".m4a",
	".m4b",
	".oga",
	".opus",
	".spx",
	".mka"
]);
function We(e) {
	return He[u.extname(e).toLowerCase()] ?? null;
}
function Ge(e) {
	return Ue.has(u.extname(e).toLowerCase());
}
function Ke(e, t) {
	let n = u.extname(e).toLowerCase(), r = We(e);
	if (t) return n === ".flac" ? {
		mux: r,
		transcode: "acodec=flac"
	} : n === ".wav" ? {
		mux: r,
		transcode: "acodec=s16l,channels=2,samplerate=48000"
	} : n === ".ogg" || n === ".oga" || n === ".opus" ? {
		mux: r ?? "ogg",
		transcode: "acodec=vorb,ab=256"
	} : n === ".wma" || n === ".asf" ? {
		mux: r ?? "asf",
		transcode: "acodec=wma,ab=256"
	} : {
		mux: r ?? "raw",
		transcode: "acodec=mp3,ab=320"
	};
	let i = "vcodec=h264,venc=x264{preset=ultrafast,tune=zerolatency,crf=28},scale=1,threads=0";
	return n === ".webm" ? {
		mux: "webm",
		transcode: "vcodec=VP80,vb=1800,scale=1,acodec=vorb,ab=160,channels=2,samplerate=44100"
	} : n === ".ogg" || n === ".ogv" || n === ".ogm" ? {
		mux: "ogg",
		transcode: "vcodec=theo,vb=1800,scale=1,acodec=vorb,ab=160,channels=2,samplerate=44100"
	} : n === ".avi" ? {
		mux: "avi",
		transcode: `${i},acodec=mp3,ab=160,channels=2,samplerate=44100`
	} : n === ".wmv" || n === ".asf" || n === ".wm" ? {
		mux: "asf",
		transcode: `${i},acodec=wma,ab=160,channels=2,samplerate=44100`
	} : n === ".ts" || n === ".m2ts" || n === ".mts" || n === ".m2t" || n === ".tts" ? {
		mux: "ts",
		transcode: `${i},acodec=mp4a,ab=160,channels=2,samplerate=44100`
	} : {
		mux: r ?? "mp4",
		transcode: `${i},acodec=mp4a,ab=160,channels=2,samplerate=44100`
	};
}
function qe(e) {
	let t = u.extname(e).toLowerCase();
	return t === ".flac" ? "acodec=flac" : t === ".wav" ? "acodec=s16l,channels=2,samplerate=44100" : t === ".ogg" || t === ".oga" || t === ".ogv" || t === ".ogm" || t === ".opus" || t === ".webm" ? "acodec=vorb,ab=160" : t === ".wma" || t === ".asf" || t === ".wmv" || t === ".wm" ? "acodec=wma,ab=160" : t === ".avi" || t === ".mp3" ? "acodec=mp3,ab=160" : "acodec=mp4a,ab=160,channels=2,samplerate=44100";
}
function Je(e, t, n, r) {
	let i = e.replace(/\\/g, "/").replace(/["']/g, ""), a = Ge(t), o = a ? null : Ae(n), s = r ? je(r) : null, c = o !== null || s !== null || !a && !E(n), l = We(e), u = l ? `std{access=file,mux=${l},dst='${i}'}` : `std{access=file,dst='${i}'}`;
	if (!c) return [
		`:sout=#duplicate{dst=display,dst=${u}}`,
		":sout-keep",
		":sout-all"
	];
	let d = Ke(e, a), f = [];
	a ? d.transcode && f.push(d.transcode) : o ? (d.transcode && f.push(d.transcode), f.push(`vfilter=${o}`)) : f.push(`vcodec=copy,${qe(e)}`), s && f.push(`afilter=${s}`);
	let p = d.mux, m = p ? `std{access=file,mux=${p},dst='${i}'}` : u;
	return [
		`:sout=#duplicate{dst=display,dst=transcode{${f.join(",")}}:${m}}`,
		":sout-keep",
		":sout-all"
	];
}
var Ye = 0, Xe = 1, Ze = 2, Qe = 3, $e = 4, et = 5, tt = class {
	instance = null;
	mediaPlayer = null;
	media = null;
	equalizer = null;
	videoWindow = null;
	parentWindow = null;
	videoVisible = !1;
	videoOverlaySuspended = !1;
	endedNotified = !1;
	onEnded = null;
	lastViewport = null;
	mediaLoaded = !1;
	currentFilePath = null;
	pendingAudioEffects = null;
	pendingVolume = 1;
	pendingVolumeMuted = !1;
	activeVideoEffects = { ...Te };
	uiOverlayPrioritized = !1;
	lastAppliedScreenBounds = null;
	recordingPath = null;
	libvlc_new;
	libvlc_release;
	libvlc_errmsg;
	libvlc_media_new_path;
	libvlc_media_add_option;
	libvlc_media_release;
	libvlc_media_player_new;
	libvlc_media_player_release;
	libvlc_media_player_set_media;
	libvlc_media_player_set_hwnd;
	libvlc_media_player_play;
	libvlc_media_player_pause;
	libvlc_media_player_stop;
	libvlc_media_player_set_time;
	libvlc_media_player_get_time;
	libvlc_media_player_get_length;
	libvlc_media_player_get_state;
	libvlc_media_player_set_rate;
	libvlc_audio_set_volume;
	libvlc_audio_equalizer_new;
	libvlc_audio_equalizer_release;
	libvlc_audio_equalizer_set_amp_at_index;
	libvlc_audio_equalizer_set_preamp;
	libvlc_media_player_set_equalizer;
	libvlc_video_set_adjust_int;
	libvlc_video_set_adjust_float;
	libvlc_video_take_snapshot;
	win32 = Ie();
	parentGeometryHandler = null;
	parentMinimizeHandler = null;
	parentRestoreHandler = null;
	controlsOverlayWindow = null;
	filesMenuOverlayWindow = null;
	constructor() {
		let e = u.join(r.getAppPath(), "libvlc");
		process.env.VLC_PLUGIN_PATH = u.join(e, "plugins"), process.env.PATH = `${e}${u.delimiter}${process.env.PATH ?? ""}`;
		let t = Le.load(u.join(e, "libvlc.dll"));
		this.libvlc_new = t.func("libvlc_new", "void *", ["int", "void *"]), this.libvlc_release = t.func("libvlc_release", "void", ["void *"]), this.libvlc_errmsg = t.func("libvlc_errmsg", "str", []), this.libvlc_media_new_path = t.func("libvlc_media_new_path", "void *", ["void *", "str"]), this.libvlc_media_add_option = t.func("libvlc_media_add_option", "void", ["void *", "str"]), this.libvlc_media_release = t.func("libvlc_media_release", "void", ["void *"]), this.libvlc_media_player_new = t.func("libvlc_media_player_new", "void *", ["void *"]), this.libvlc_media_player_release = t.func("libvlc_media_player_release", "void", ["void *"]), this.libvlc_media_player_set_media = t.func("libvlc_media_player_set_media", "void", ["void *", "void *"]), this.libvlc_media_player_set_hwnd = t.func("libvlc_media_player_set_hwnd", "void", ["void *", "int64"]), this.libvlc_media_player_play = t.func("libvlc_media_player_play", "int", ["void *"]), this.libvlc_media_player_pause = t.func("libvlc_media_player_pause", "void", ["void *"]), this.libvlc_media_player_stop = t.func("libvlc_media_player_stop", "void", ["void *"]), this.libvlc_media_player_set_time = t.func("libvlc_media_player_set_time", "void", ["void *", "int64"]), this.libvlc_media_player_get_time = t.func("libvlc_media_player_get_time", "int64", ["void *"]), this.libvlc_media_player_get_length = t.func("libvlc_media_player_get_length", "int64", ["void *"]), this.libvlc_media_player_get_state = t.func("libvlc_media_player_get_state", "int", ["void *"]), this.libvlc_media_player_set_rate = t.func("libvlc_media_player_set_rate", "void", ["void *", "float"]), this.libvlc_audio_set_volume = t.func("libvlc_audio_set_volume", "int", ["void *", "int"]), this.libvlc_audio_equalizer_new = t.func("libvlc_audio_equalizer_new", "void *", []), this.libvlc_audio_equalizer_release = t.func("libvlc_audio_equalizer_release", "void", ["void *"]), this.libvlc_audio_equalizer_set_amp_at_index = t.func("libvlc_audio_equalizer_set_amp_at_index", "void", [
			"void *",
			"float",
			"uint"
		]), this.libvlc_audio_equalizer_set_preamp = t.func("libvlc_audio_equalizer_set_preamp", "void", ["void *", "float"]), this.libvlc_media_player_set_equalizer = t.func("libvlc_media_player_set_equalizer", "int", ["void *", "void *"]), this.libvlc_video_set_adjust_int = t.func("libvlc_video_set_adjust_int", "void", [
			"void *",
			"uint",
			"int"
		]), this.libvlc_video_set_adjust_float = t.func("libvlc_video_set_adjust_float", "void", [
			"void *",
			"uint",
			"float"
		]), this.libvlc_video_take_snapshot = t.func("libvlc_video_take_snapshot", "int", [
			"void *",
			"uint",
			"str",
			"uint",
			"uint"
		]), this.instance = this.libvlc_new(0, null), this.mediaPlayer = this.libvlc_media_player_new(this.instance);
	}
	attachParent(e) {
		this.parentWindow && !this.parentWindow.isDestroyed() && this.detachParentListeners(), this.parentWindow = e, this.parentGeometryHandler = () => {
			this.handleParentGeometryChange();
		}, this.parentMinimizeHandler = () => {
			this.hideVideoWindow();
		}, this.parentRestoreHandler = () => {
			this.applyVideoVisibility();
		};
		let t = this.parentGeometryHandler;
		e.on("move", t), e.on("resize", t), e.on("maximize", t), e.on("unmaximize", t), e.on("enter-full-screen", t), e.on("leave-full-screen", t), e.on("minimize", this.parentMinimizeHandler), e.on("restore", this.parentRestoreHandler);
	}
	async prioritizeUiOverlay() {
		return this.uiOverlayPrioritized = !0, this.hideVideoWindow(), this.takeVideoSnapshot();
	}
	releaseUiOverlay() {
		this.uiOverlayPrioritized = !1, this.lastViewport && this.videoVisible && this.applyViewport(this.lastViewport);
	}
	setOnEnded(e) {
		this.onEnded = e;
	}
	setControlsOverlayWindow(e) {
		this.controlsOverlayWindow = e;
	}
	setFilesMenuOverlayWindow(e) {
		this.filesMenuOverlayWindow = e;
	}
	raiseControlsOverlay() {
		let e = this.controlsOverlayWindow;
		if (!e || e.isDestroyed()) return;
		e.setAlwaysOnTop(!0, "pop-up-menu");
		let t = this.filesMenuOverlayWindow;
		t && !t.isDestroyed() && t.isVisible() && this.raiseFilesMenuOverlay();
	}
	raiseFilesMenuOverlay() {
		let e = this.filesMenuOverlayWindow;
		!e || e.isDestroyed() || e.setAlwaysOnTop(!0, "screen-saver");
	}
	setVideoVisible(e) {
		this.videoVisible = e, this.applyVideoVisibility();
	}
	suspendVideoOverlay() {
		this.videoOverlaySuspended = !0, this.hideVideoWindow();
	}
	resumeVideoOverlay() {
		this.videoOverlaySuspended = !1, this.lastAppliedScreenBounds = null, this.applyVideoVisibility();
	}
	setViewport(e) {
		if (e.width <= 0 || e.height <= 0) {
			this.hideVideoWindow();
			return;
		}
		if (this.lastViewport = e, !this.parentWindow || !this.videoVisible) {
			this.hideVideoWindow();
			return;
		}
		this.applyViewport(e);
	}
	hideVideoOverlay() {
		this.lastAppliedScreenBounds = null, this.hideVideoWindow();
	}
	load(e) {
		return this.stop(), this.mediaLoaded = !1, this.recordingPath = null, this.currentFilePath = e, this.media &&= (this.libvlc_media_release(this.media), null), this.endedNotified = !1, this.media = this.createMedia(e, this.activeVideoEffects), this.media ? (this.libvlc_media_player_set_media(this.mediaPlayer, this.media), this.mediaLoaded = !0, this.applyPendingEffects(), { ok: !0 }) : {
			ok: !1,
			error: this.libvlc_errmsg() ?? "libvlc_media_new_path failed"
		};
	}
	loadIfNeeded(e) {
		return this.mediaLoaded && this.currentFilePath === e ? (this.applyPendingEffects(), {
			ok: !0,
			reloaded: !1
		}) : {
			...this.load(e),
			reloaded: !0
		};
	}
	getLoadedFilePath() {
		return this.mediaLoaded ? this.currentFilePath : null;
	}
	play() {
		this.endedNotified = !1, this.prepareVideoOutput(), this.libvlc_media_player_play(this.mediaPlayer), this.refreshEffectsAfterPipeline();
	}
	pause() {
		this.libvlc_media_player_pause(this.mediaPlayer);
	}
	stop() {
		this.libvlc_media_player_stop(this.mediaPlayer);
	}
	seek(e) {
		this.libvlc_media_player_set_time(this.mediaPlayer, Math.max(0, Math.round(e)));
	}
	setVolume(e) {
		if (this.pendingVolume = Math.min(2, Math.max(0, e)), this.mediaLoaded) {
			if (this.recordingPath) {
				this.applyVolumeSettingsForRecording();
				return;
			}
			this.applyVolumeSettings();
		}
	}
	setVolumeMuted(e) {
		if (this.pendingVolumeMuted = e, this.mediaLoaded) {
			if (this.recordingPath) {
				this.applyVolumeSettingsForRecording();
				return;
			}
			this.applyVolumeSettings();
		}
	}
	setRate(e) {
		this.mediaLoaded && this.libvlc_media_player_set_rate(this.mediaPlayer, e);
	}
	setAudioEffects(e) {
		this.pendingAudioEffects = e, this.mediaLoaded && (this.applyAudioEffects(e), this.recordingPath || this.refreshEffectsAfterPipeline());
	}
	setVideoEffects(e) {
		let t = this.activeVideoEffects;
		if (this.activeVideoEffects = e, this.mediaLoaded) {
			if (this.recordingPath) {
				this.applyVideoAdjust(e);
				return;
			}
			if (D(t) || D(e)) {
				this.reloadMediaPreservePosition();
				return;
			}
			this.applyVideoAdjust(e), this.refreshEffectsAfterPipeline();
		}
	}
	setEqualizer(e) {
		this.setAudioEffects({
			bands: e,
			outputGain: 1
		});
	}
	startRecording(e) {
		if (!this.mediaLoaded || !this.currentFilePath) return {
			ok: !1,
			error: "No media loaded"
		};
		try {
			return this.recordingPath = e, this.reloadMediaPreservePosition(), this.mediaLoaded ? (this.libvlc_media_player_get_state(this.mediaPlayer) !== k && (this.prepareVideoOutput(), this.libvlc_media_player_play(this.mediaPlayer)), this.refreshEffectsAfterPipeline(), { ok: !0 }) : (this.recordingPath = null, {
				ok: !1,
				error: this.libvlc_errmsg() ?? "Failed to reload media for recording"
			});
		} catch (e) {
			return this.recordingPath = null, console.error("Failed to start recording:", e), {
				ok: !1,
				error: e instanceof Error ? e.message : "Failed to start recording"
			};
		}
	}
	stopRecording() {
		this.recordingPath && (this.recordingPath = null, this.mediaLoaded && this.currentFilePath && this.reloadMediaPreservePosition());
	}
	isRecording() {
		return this.recordingPath !== null;
	}
	getState() {
		let e = this.libvlc_media_player_get_state(this.mediaPlayer), t = Math.max(0, Number(this.libvlc_media_player_get_time(this.mediaPlayer))), n = Math.max(0, Number(this.libvlc_media_player_get_length(this.mediaPlayer))), r = e === k, i = e === Re, a = e === ze;
		return a && !this.endedNotified && (this.endedNotified = !0, this.onEnded?.()), {
			playing: r,
			paused: i,
			ended: a,
			currentTimeMs: t,
			durationMs: n
		};
	}
	destroy() {
		this.stop(), this.hideVideoWindow(), this.detachParentListeners(), this.videoWindow && !this.videoWindow.isDestroyed() && (this.videoWindow.destroy(), this.videoWindow = null), this.media &&= (this.libvlc_media_release(this.media), null), this.equalizer &&= (this.libvlc_audio_equalizer_release(this.equalizer), null), this.mediaPlayer &&= (this.libvlc_media_player_release(this.mediaPlayer), null), this.instance &&= (this.libvlc_release(this.instance), null);
	}
	applyPendingEffects() {
		this.recordingPath ? this.applyVolumeSettingsForRecording() : this.applyVolumeSettings(), this.pendingAudioEffects && this.applyAudioEffects(this.pendingAudioEffects), this.applyVideoAdjust(this.activeVideoEffects);
	}
	refreshEffectsAfterPipeline() {
		this.applyPendingEffects();
		for (let e of [50, 200]) setTimeout(() => {
			this.mediaLoaded && this.applyPendingEffects();
		}, e);
	}
	reapplyAudioEffectsIfActive() {
		this.pendingAudioEffects && !T(this.pendingAudioEffects) && this.applyAudioEffects(this.pendingAudioEffects);
	}
	applyVolumeSettings() {
		if (this.pendingVolumeMuted) {
			this.libvlc_audio_set_volume(this.mediaPlayer, 0), this.clearVolumeBoostEqualizer(), this.reapplyAudioEffectsIfActive();
			return;
		}
		let e = Math.min(2, Math.max(0, this.pendingVolume));
		if (e <= 1) {
			this.libvlc_audio_set_volume(this.mediaPlayer, this.uiVolumeToLibVlcVolume(e)), this.clearVolumeBoostEqualizer(), this.reapplyAudioEffectsIfActive();
			return;
		}
		this.libvlc_audio_set_volume(this.mediaPlayer, Ve), this.applyVolumeBoostEqualizer(e);
	}
	applyVolumeSettingsForRecording() {
		if (this.pendingVolumeMuted) {
			this.libvlc_audio_set_volume(this.mediaPlayer, 0);
			return;
		}
		let e = Math.min(1, Math.max(0, this.pendingVolume));
		this.libvlc_audio_set_volume(this.mediaPlayer, this.uiVolumeToLibVlcVolume(e));
	}
	uiVolumeToLibVlcVolume(e) {
		return Math.min(Ve, Math.round(e * 100 * Be));
	}
	clearVolumeBoostEqualizer() {
		(!this.pendingAudioEffects || T(this.pendingAudioEffects)) && this.libvlc_media_player_set_equalizer(this.mediaPlayer, null);
	}
	applyVolumeBoostEqualizer(e) {
		let t = Math.min(20, Math.max(-20, 20 * Math.log10(e) + 6.02));
		this.equalizer ||= this.libvlc_audio_equalizer_new(), this.libvlc_audio_equalizer_set_preamp(this.equalizer, t);
		for (let e = 0; e < 10; e += 1) this.libvlc_audio_equalizer_set_amp_at_index(this.equalizer, 0, e);
		this.libvlc_media_player_set_equalizer(this.mediaPlayer, this.equalizer);
	}
	applyAudioEffects(e) {
		if (T(e)) {
			this.libvlc_media_player_set_equalizer(this.mediaPlayer, null);
			return;
		}
		if (this.equalizer ||= this.libvlc_audio_equalizer_new(), this.equalizer) {
			this.libvlc_audio_equalizer_set_preamp(this.equalizer, Ee(e.outputGain));
			for (let t = 0; t < 10; t += 1) {
				let n = e.bands[t] ?? 0;
				this.libvlc_audio_equalizer_set_amp_at_index(this.equalizer, n, t);
			}
			this.libvlc_media_player_set_equalizer(this.mediaPlayer, this.equalizer);
		}
	}
	applyVideoAdjust(e) {
		let t = Oe(e);
		this.libvlc_video_set_adjust_int(this.mediaPlayer, Ye, +!!t.enabled), t.enabled && (this.libvlc_video_set_adjust_float(this.mediaPlayer, Ze, t.brightness), this.libvlc_video_set_adjust_float(this.mediaPlayer, Xe, t.contrast), this.libvlc_video_set_adjust_float(this.mediaPlayer, $e, t.saturation), this.libvlc_video_set_adjust_float(this.mediaPlayer, Qe, t.hue), this.libvlc_video_set_adjust_float(this.mediaPlayer, et, t.gamma));
	}
	createMedia(e, t) {
		let n = this.libvlc_media_new_path(this.instance, e);
		if (!n) return null;
		if (this.recordingPath) for (let r of Je(this.recordingPath, e, t, this.pendingAudioEffects)) this.libvlc_media_add_option(n, r);
		else for (let e of ke(t)) this.libvlc_media_add_option(n, e);
		return n;
	}
	reloadMediaPreservePosition() {
		if (!this.currentFilePath || !this.mediaLoaded) return;
		let e = Math.max(0, Number(this.libvlc_media_player_get_time(this.mediaPlayer))), t = this.libvlc_media_player_get_state(this.mediaPlayer), n = t === k || t === Re, r = this.recordingPath !== null;
		if (this.libvlc_media_player_stop(this.mediaPlayer), this.media &&= (this.libvlc_media_release(this.media), null), this.media = this.createMedia(this.currentFilePath, this.activeVideoEffects), !this.media) {
			this.mediaLoaded = !1;
			return;
		}
		if (this.libvlc_media_player_set_media(this.mediaPlayer, this.media), e > 0 && this.libvlc_media_player_set_time(this.mediaPlayer, e), n) {
			this.prepareVideoOutput(), this.libvlc_media_player_play(this.mediaPlayer), r ? this.applyPendingEffects() : this.refreshEffectsAfterPipeline();
			return;
		}
		this.applyPendingEffects();
	}
	prepareVideoOutput() {
		!this.videoVisible || !this.lastViewport || this.videoOverlaySuspended || this.applyViewport(this.lastViewport);
	}
	applyVideoVisibility() {
		if (!this.videoVisible || this.videoOverlaySuspended) {
			this.hideVideoWindow();
			return;
		}
		this.prepareVideoOutput();
	}
	handleParentGeometryChange() {
		this.lastAppliedScreenBounds = null, this.lastViewport && this.videoVisible && !this.videoOverlaySuspended && this.applyViewport(this.lastViewport), !(!this.parentWindow || this.parentWindow.isDestroyed()) && this.parentWindow.webContents.send("vlc:parent-geometry-changed");
	}
	applyViewport(e) {
		if (!this.parentWindow || !this.videoVisible || this.videoOverlaySuspended) return;
		let t = this.parentWindow.getContentBounds(), n = Math.round(t.x + e.x), r = Math.round(t.y + e.y), i = Math.max(1, Math.round(e.width)), a = Math.max(1, Math.round(e.height)), o = this.lastAppliedScreenBounds;
		if (o && o.x === n && o.y === r && o.width === i && o.height === a) return;
		this.lastAppliedScreenBounds = {
			x: n,
			y: r,
			width: i,
			height: a
		};
		let c = this.ensureVideoWindow();
		if (!c) return;
		let l = !c.isVisible();
		if (process.platform === "win32" && this.win32) {
			let e = s.dipToScreenRect(this.parentWindow, {
				x: n,
				y: r,
				width: i,
				height: a
			}), t = Ne(c.getNativeWindowHandle());
			this.win32.positionWindow(t, e.x, e.y, e.width, e.height, l);
		} else c.setBounds({
			x: n,
			y: r,
			width: i,
			height: a
		});
		if (this.uiOverlayPrioritized) {
			this.hideVideoWindow();
			return;
		}
		if (l) {
			let e = c.getNativeWindowHandle();
			this.libvlc_media_player_set_hwnd(this.mediaPlayer, O(e)), process.platform !== "win32" && c.showInactive(), this.applyPendingEffects(), this.sendVideoWindowAboveUi();
		}
	}
	async takeVideoSnapshot() {
		if (!this.mediaLoaded || !this.mediaPlayer) return null;
		try {
			let e = u.join(r.getPath("temp"), "fmp-media-player", "vlc-menu-preview.png");
			return await l.mkdir(u.dirname(e), { recursive: !0 }), this.libvlc_video_take_snapshot(this.mediaPlayer, 0, e, 0, 0) === 0 ? e : null;
		} catch (e) {
			return console.warn("Failed to capture VLC menu preview:", e), null;
		}
	}
	sendVideoWindowAboveUi() {
		if (!this.win32 || !this.videoWindow || this.videoWindow.isDestroyed()) return;
		let e = Ne(this.videoWindow.getNativeWindowHandle());
		this.win32.setWindowPosFlags(e, 0, 0, 0, 0, 0, 19), this.videoWindow.isDestroyed() || this.videoWindow.moveTop(), this.raiseControlsOverlay();
	}
	detachParentListeners() {
		if (!(!this.parentWindow || this.parentWindow.isDestroyed())) {
			if (this.parentGeometryHandler) {
				let e = this.parentGeometryHandler;
				this.parentWindow.removeListener("move", e), this.parentWindow.removeListener("resize", e), this.parentWindow.removeListener("maximize", e), this.parentWindow.removeListener("unmaximize", e), this.parentWindow.removeListener("enter-full-screen", e), this.parentWindow.removeListener("leave-full-screen", e);
			}
			this.parentMinimizeHandler && this.parentWindow.removeListener("minimize", this.parentMinimizeHandler), this.parentRestoreHandler && this.parentWindow.removeListener("restore", this.parentRestoreHandler), this.parentGeometryHandler = null, this.parentMinimizeHandler = null, this.parentRestoreHandler = null, this.parentWindow = null;
		}
	}
	ensureVideoWindow() {
		if (!this.parentWindow) return null;
		if (!this.videoWindow || this.videoWindow.isDestroyed()) {
			this.videoWindow = new t({
				parent: this.parentWindow,
				frame: !1,
				show: !1,
				skipTaskbar: !0,
				resizable: !0,
				minWidth: 1,
				minHeight: 1,
				focusable: !1,
				hasShadow: !1,
				thickFrame: !1,
				backgroundColor: "#000000",
				webPreferences: {
					nodeIntegration: !1,
					contextIsolation: !0
				}
			}), this.videoWindow.setIgnoreMouseEvents(!0, { forward: !0 });
			let e = this.videoWindow.getNativeWindowHandle();
			this.libvlc_media_player_set_hwnd(this.mediaPlayer, O(e));
		}
		return this.videoWindow;
	}
	hideVideoWindow() {
		this.lastAppliedScreenBounds = null, this.videoWindow && !this.videoWindow.isDestroyed() && this.videoWindow.hide();
	}
}, nt = new Set(f);
function rt(e) {
	return nt.has(u.extname(e).toLowerCase());
}
function it(e, t) {
	return (e[t] & 127) << 21 | (e[t + 1] & 127) << 14 | (e[t + 2] & 127) << 7 | e[t + 3] & 127;
}
function at(e) {
	if (e.length < 10 || e.toString("ascii", 0, 3) !== "ID3") return null;
	let t = e[3], n = it(e, 6), r = 10, i = Math.min(e.length, 10 + n);
	for (; r < i;) {
		let n, a, o;
		if (t === 2) {
			if (r + 6 > i) break;
			n = e.toString("ascii", r, r + 3), a = e[r + 3] << 16 | e[r + 4] << 8 | e[r + 5], o = r + 6;
		} else {
			if (r + 10 > i) break;
			n = e.toString("ascii", r, r + 4).replace(/\0/g, ""), a = t === 4 ? it(e, r + 4) : e.readUInt32BE(r + 4), o = r + 10;
		}
		let s = o + a;
		if (s > e.length) break;
		if (n === "APIC" || n === "PIC") {
			let t = e.subarray(o, s);
			if (t.length < 4) return null;
			let n = t[0], r = 1, i = r;
			for (; i < t.length && t[i] !== 0;) i += 1;
			if (r = i + 1, r >= t.length) return null;
			if (r += 1, n === 1 || n === 2) {
				for (; r + 1 < t.length && !(t[r] === 0 && t[r + 1] === 0);) r += 2;
				r += 2;
			} else {
				for (; r < t.length && t[r] !== 0;) r += 1;
				r += 1;
			}
			return r < t.length ? t.subarray(r) : null;
		}
		r = s;
	}
	return null;
}
function ot(e) {
	let t = 0;
	for (; t < e.length;) {
		let n = e.indexOf("covr", t);
		if (n < 0) break;
		let r = e.subarray(n + 4, Math.min(e.length, n + 512)), i = r.indexOf(Buffer.from([
			255,
			216,
			255
		])), a = r.indexOf(Buffer.from([
			137,
			80,
			78,
			71
		])), o = i >= 0 && (a < 0 || i < a) ? i : a;
		if (o >= 0) {
			let e = r.subarray(o);
			if (i >= 0 && o === i) {
				let t = e.indexOf(Buffer.from([255, 217]));
				if (t >= 0) return e.subarray(0, t + 2);
			}
			return e;
		}
		t = n + 4;
	}
	return null;
}
function st(e) {
	if (e.length < 8 || e.toString("ascii", 0, 4) !== "fLaC") return null;
	let t = 4;
	for (; t + 4 <= e.length;) {
		let n = e[t], r = (n & 128) != 0, i = n & 127, a = e[t + 1] << 16 | e[t + 2] << 8 | e[t + 3], o = t + 4, s = o + a;
		if (s > e.length) break;
		if (i === 6) {
			let t = e.subarray(o, s);
			if (t.length < 32) return null;
			let n = 4, r = t.readUInt32BE(n);
			n += 4, n += r;
			let i = t.readUInt32BE(n);
			n += 4, n += i, n += 16;
			let a = t.readUInt32BE(n);
			return n += 4, n + a <= t.length ? t.subarray(n, n + a) : null;
		}
		if (t = s, r) break;
	}
	return null;
}
function ct(e) {
	return ot(e);
}
function lt(e, t) {
	if (!e.length) return null;
	let n = o.createFromBuffer(e);
	if (n.isEmpty()) return null;
	let r = n.getSize(), i = t > 0 && r.width > t ? n.resize({
		width: t,
		quality: "best"
	}) : n, a = i.getSize();
	return {
		dataUrl: i.toDataURL(),
		width: a.width,
		height: a.height
	};
}
async function ut(e, t = 320) {
	if (!rt(e)) return null;
	try {
		let n = await l.readFile(e), r = u.extname(e).toLowerCase(), i = null;
		return i = r === ".mp3" || r === ".mp2" || r === ".mp1" || r === ".mpga" ? at(n) : r === ".flac" ? st(n) : r === ".m4a" || r === ".m4b" || r === ".m4p" || r === ".mp4" ? ct(n) : at(n), i ? lt(i, t) : null;
	} catch {
		return null;
	}
}
async function dt(e, t = 320) {
	if (!e) return null;
	let n = e;
	if (n.startsWith("file://")) try {
		n = decodeURIComponent(new URL(n).pathname), process.platform === "win32" && n.startsWith("/") && (n = n.slice(1));
	} catch {
		return null;
	}
	if (!u.isAbsolute(n)) return null;
	try {
		return lt(await l.readFile(n), t);
	} catch {
		return null;
	}
}
//#endregion
//#region electron/media-probe.ts
var A = e(import.meta.url)("koffi"), ft = 3, pt = 7, mt = 0, ht = 2, gt = 3, _t = 4, vt = 0, yt = 1, bt = 2, j = {
	title: 0,
	artist: 1,
	genre: 2,
	copyright: 3,
	album: 4,
	trackNumber: 5,
	description: 6,
	rating: 7,
	date: 8,
	url: 10,
	language: 11,
	nowPlaying: 12,
	publisher: 13,
	encodedBy: 14,
	artworkUrl: 15,
	trackTotal: 17,
	director: 18,
	season: 19,
	episode: 20,
	showName: 21,
	actors: 22,
	albumArtist: 23,
	discNumber: 24
}, xt = A.struct({
	i_channels: "uint",
	i_rate: "uint"
}), St = A.struct({
	i_height: "uint",
	i_width: "uint",
	i_sar_num: "uint",
	i_sar_den: "uint",
	i_frame_rate_num: "uint",
	i_frame_rate_den: "uint"
}), Ct = A.struct({ psz_encoding: "str" }), wt = A.struct({
	i_codec: "uint32",
	i_original_fourcc: "uint32",
	i_id: "int",
	i_type: "int",
	i_profile: "int",
	i_level: "int",
	media: "void *",
	i_bitrate: "uint",
	psz_language: "str",
	psz_description: "str"
});
function M(e) {
	return new Promise((t) => setTimeout(t, e));
}
function N(e) {
	if (!e) return null;
	let t = [
		e & 255,
		e >>> 8 & 255,
		e >>> 16 & 255,
		e >>> 24 & 255
	].map((e) => e >= 32 && e < 127 ? String.fromCharCode(e) : "").join("").trim();
	return t.length ? t : null;
}
function P(e) {
	if (typeof e != "string") return null;
	let t = e.trim();
	return t.length ? t : null;
}
function F(e, t, n) {
	return Number.isFinite(e) ? Math.min(n, Math.max(t, e)) : t;
}
var Tt = class {
	instance;
	libvlc_new;
	libvlc_release;
	libvlc_media_new_path;
	libvlc_media_add_option;
	libvlc_media_release;
	libvlc_media_parse_with_options;
	libvlc_media_get_parsed_status;
	libvlc_media_get_meta;
	libvlc_media_get_duration;
	libvlc_media_tracks_get;
	libvlc_media_tracks_release;
	libvlc_free;
	libvlc_media_player_new;
	libvlc_media_player_release;
	libvlc_media_player_set_media;
	libvlc_media_player_set_hwnd;
	libvlc_media_player_play;
	libvlc_media_player_stop;
	libvlc_media_player_set_time;
	libvlc_media_player_get_length;
	libvlc_media_player_get_state;
	libvlc_audio_set_volume;
	libvlc_video_take_snapshot;
	constructor() {
		let e = u.join(r.getAppPath(), "libvlc");
		process.env.VLC_PLUGIN_PATH = u.join(e, "plugins"), process.env.PATH = `${e}${u.delimiter}${process.env.PATH ?? ""}`;
		let t = A.load(u.join(e, "libvlc.dll"));
		this.libvlc_new = t.func("libvlc_new", "void *", ["int", "void *"]), this.libvlc_release = t.func("libvlc_release", "void", ["void *"]), this.libvlc_media_new_path = t.func("libvlc_media_new_path", "void *", ["void *", "str"]), this.libvlc_media_add_option = t.func("libvlc_media_add_option", "void", ["void *", "str"]), this.libvlc_media_release = t.func("libvlc_media_release", "void", ["void *"]), this.libvlc_media_parse_with_options = t.func("libvlc_media_parse_with_options", "int", [
			"void *",
			"int",
			"int"
		]), this.libvlc_media_get_parsed_status = t.func("libvlc_media_get_parsed_status", "int", ["void *"]), this.libvlc_media_get_meta = t.func("libvlc_media_get_meta", "void *", ["void *", "int"]), this.libvlc_media_get_duration = t.func("libvlc_media_get_duration", "int64", ["void *"]), this.libvlc_media_tracks_get = t.func("libvlc_media_tracks_get", "uint", ["void *", A.out(A.pointer("void *"))]), this.libvlc_media_tracks_release = t.func("libvlc_media_tracks_release", "void", ["void *", "uint"]), this.libvlc_free = t.func("libvlc_free", "void", ["void *"]), this.libvlc_media_player_new = t.func("libvlc_media_player_new", "void *", ["void *"]), this.libvlc_media_player_release = t.func("libvlc_media_player_release", "void", ["void *"]), this.libvlc_media_player_set_media = t.func("libvlc_media_player_set_media", "void", ["void *", "void *"]), this.libvlc_media_player_set_hwnd = t.func("libvlc_media_player_set_hwnd", "void", ["void *", "int64"]), this.libvlc_media_player_play = t.func("libvlc_media_player_play", "int", ["void *"]), this.libvlc_media_player_stop = t.func("libvlc_media_player_stop", "void", ["void *"]), this.libvlc_media_player_set_time = t.func("libvlc_media_player_set_time", "void", ["void *", "int64"]), this.libvlc_media_player_get_length = t.func("libvlc_media_player_get_length", "int64", ["void *"]), this.libvlc_media_player_get_state = t.func("libvlc_media_player_get_state", "int", ["void *"]), this.libvlc_audio_set_volume = t.func("libvlc_audio_set_volume", "int", ["void *", "int"]), this.libvlc_video_take_snapshot = t.func("libvlc_video_take_snapshot", "int", [
			"void *",
			"uint",
			"str",
			"uint",
			"uint"
		]), this.instance = this.libvlc_new(0, null);
	}
	async extractMetadata(e) {
		let t = this.libvlc_media_new_path(this.instance, e);
		if (!t) return null;
		try {
			return await this.parseMedia(t), {
				filePath: e,
				title: this.getMeta(t, j.title),
				artist: this.getMeta(t, j.artist),
				album: this.getMeta(t, j.album),
				albumArtist: this.getMeta(t, j.albumArtist),
				genre: this.getMeta(t, j.genre),
				description: this.getMeta(t, j.description),
				date: this.getMeta(t, j.date),
				trackNumber: this.getMeta(t, j.trackNumber),
				trackTotal: this.getMeta(t, j.trackTotal),
				discNumber: this.getMeta(t, j.discNumber),
				copyright: this.getMeta(t, j.copyright),
				publisher: this.getMeta(t, j.publisher),
				encodedBy: this.getMeta(t, j.encodedBy),
				language: this.getMeta(t, j.language),
				nowPlaying: this.getMeta(t, j.nowPlaying),
				showName: this.getMeta(t, j.showName),
				season: this.getMeta(t, j.season),
				episode: this.getMeta(t, j.episode),
				director: this.getMeta(t, j.director),
				actors: this.getMeta(t, j.actors),
				rating: this.getMeta(t, j.rating),
				url: this.getMeta(t, j.url),
				artworkUrl: this.getMeta(t, j.artworkUrl),
				durationMs: Math.max(0, Number(this.libvlc_media_get_duration(t)))
			};
		} finally {
			this.libvlc_media_release(t);
		}
	}
	async extractTracks(e) {
		let t = this.libvlc_media_new_path(this.instance, e);
		if (!t) return [];
		try {
			return await this.parseMedia(t), this.readTracks(t);
		} finally {
			this.libvlc_media_release(t);
		}
	}
	async extractThumbnail(e, t = {}) {
		let n = Math.round(F(t.width ?? 320, 16, 1920)), r = this.libvlc_media_new_path(this.instance, e);
		if (!r) return null;
		try {
			await this.parseMedia(r);
			let i = await dt(this.getMeta(r, j.artworkUrl), n);
			if (i) return {
				filePath: e,
				...i
			};
			let a = await ut(e, n);
			return a ? {
				filePath: e,
				...a
			} : this.readTracks(r).some((e) => e.kind === "video") ? await this.captureVideoSnapshot(r, e, n, t) : null;
		} finally {
			this.libvlc_media_release(r);
		}
	}
	async captureVideoSnapshot(e, n, i, a) {
		this.libvlc_media_add_option(e, ":no-audio"), this.libvlc_media_add_option(e, ":avcodec-hw=none");
		let s = this.libvlc_media_player_new(this.instance), c = null;
		try {
			this.libvlc_media_player_set_media(s, e), c = new t({
				show: !1,
				width: 640,
				height: 360,
				x: -32e3,
				y: -32e3,
				frame: !1,
				skipTaskbar: !0,
				focusable: !1,
				hasShadow: !1,
				backgroundColor: "#000000",
				webPreferences: {
					nodeIntegration: !1,
					contextIsolation: !0
				}
			}), c.setIgnoreMouseEvents(!0);
			let d = O(c.getNativeWindowHandle());
			if (this.libvlc_media_player_set_hwnd(s, d), c.showInactive(), this.libvlc_audio_set_volume(s, 0), this.libvlc_media_player_play(s) !== 0 || !await this.waitForPlaying(s, 5e3)) return null;
			let f = Math.max(0, Number(this.libvlc_media_player_get_length(s))), p = typeof a.timeMs == "number" ? F(a.timeMs, 0, f > 0 ? f : a.timeMs) : f > 1500 ? Math.min(f - 500, Math.max(1e3, Math.floor(f * .1))) : 0;
			p > 0 && this.libvlc_media_player_set_time(s, p), await M(900);
			let m = u.join(r.getPath("temp"), "fmp-media-player", "probe");
			await l.mkdir(m, { recursive: !0 });
			let h = u.join(m, `thumb-${Date.now()}-${Math.random().toString(36).slice(2)}.png`), g = this.libvlc_video_take_snapshot(s, 0, h, i, 0);
			if (g !== 0 && (await M(500), g = this.libvlc_video_take_snapshot(s, 0, h, i, 0)), g !== 0) return null;
			let _ = o.createFromPath(h);
			if (await l.rm(h, { force: !0 }), _.isEmpty()) return null;
			let v = _.getSize();
			return {
				filePath: n,
				dataUrl: _.toDataURL(),
				width: v.width,
				height: v.height
			};
		} catch (e) {
			return console.warn("media-probe: thumbnail extraction failed:", e), null;
		} finally {
			try {
				this.libvlc_media_player_stop(s);
			} catch {}
			try {
				this.libvlc_media_player_release(s);
			} catch {}
			c && !c.isDestroyed() && c.destroy();
		}
	}
	destroy() {
		this.instance &&= (this.libvlc_release(this.instance), null);
	}
	async parseMedia(e) {
		if (this.libvlc_media_parse_with_options(e, mt, 5e3) !== 0) return !1;
		let t = Date.now() + 6e3;
		for (; Date.now() < t;) {
			let t = this.libvlc_media_get_parsed_status(e);
			if (t === _t) return !0;
			if (t === ht || t === gt) return !1;
			await M(25);
		}
		return !1;
	}
	getMeta(e, t) {
		let n = this.libvlc_media_get_meta(e, t);
		if (!n) return null;
		try {
			return P(A.decode.string(n));
		} finally {
			this.libvlc_free(n);
		}
	}
	readTracks(e) {
		let t = [null], n = this.libvlc_media_tracks_get(e, t), r = t[0];
		if (!n || !r) return [];
		let i = [];
		try {
			let e = A.decode(r, A.array("void *", n));
			for (let t = 0; t < n; t += 1) {
				let n = e[t];
				if (!n) continue;
				let r = A.decode(n, wt), a = r.i_type === vt ? "audio" : r.i_type === yt ? "video" : r.i_type === bt ? "subtitle" : "unknown", o = {
					id: r.i_id,
					kind: a,
					codec: N(r.i_codec),
					codecFourcc: N(r.i_codec),
					originalFourcc: N(r.i_original_fourcc),
					bitrate: r.i_bitrate >>> 0,
					profile: r.i_profile,
					level: r.i_level,
					language: P(r.psz_language),
					description: P(r.psz_description)
				};
				if (a === "audio" && r.media) {
					let e = A.decode(r.media, xt);
					o.channels = e.i_channels, o.sampleRate = e.i_rate;
				} else if (a === "video" && r.media) {
					let e = A.decode(r.media, St);
					o.width = e.i_width, o.height = e.i_height, o.frameRate = e.i_frame_rate_den ? Math.round(e.i_frame_rate_num / e.i_frame_rate_den * 1e3) / 1e3 : 0, o.sampleAspectRatio = e.i_sar_den ? `${e.i_sar_num}:${e.i_sar_den}` : void 0;
				} else a === "subtitle" && r.media && (o.encoding = P(A.decode(r.media, Ct).psz_encoding));
				i.push(o);
			}
		} finally {
			this.libvlc_media_tracks_release(r, n);
		}
		return i;
	}
	async waitForPlaying(e, t) {
		let n = Date.now() + t;
		for (; Date.now() < n;) {
			let t = this.libvlc_media_player_get_state(e);
			if (t === ft) return !0;
			if (t === pt) return !1;
			await M(30);
		}
		return !1;
	}
}, I = null;
function L() {
	return I ||= new Tt(), I;
}
//#endregion
//#region electron/main.ts
var R = u.dirname(d(import.meta.url)), Et = !r.isPackaged, z = u.join(R, "../dist/index.html"), B = null, V = null, H = null, U = !1, W = !1, Dt = null, G = null, K = null, q = !1;
async function J(e) {
	let t = !!(V && !V.isDestroyed() && V.isVisible()), n = !!(H && !H.isDestroyed() && H.isVisible());
	t && V?.hide(), n && (H?.hide(), H?.setIgnoreMouseEvents(!0, { forward: !0 })), W = !1, K?.suspendVideoOverlay();
	try {
		return B && !B.isDestroyed() && B.focus(), await e();
	} finally {
		K?.resumeVideoOverlay(), Ot(t);
	}
}
function Ot(e) {
	!e || !V || V.isDestroyed() || (q = !0, !(!B || B.isDestroyed() || !B.isFocused()) && (V.showInactive(), V.setIgnoreMouseEvents(!0, { forward: !0 }), K?.raiseControlsOverlay(), B.webContents.send("controls:request-state-relayed"), B.webContents.send("vlc:parent-geometry-changed")));
}
function kt(e) {
	return !!(e && !e.isDestroyed() && (e === B || e === V || e === H));
}
function At() {
	setTimeout(() => {
		let e = t.getFocusedWindow();
		if (kt(e)) {
			e === H && V && !V.isDestroyed() && V.isVisible() && (V.hide(), V.webContents.send("controls:suspended-relayed"));
			return;
		}
		V && !V.isDestroyed() && V.isVisible() && (V.hide(), V.webContents.send("controls:suspended-relayed")), H && !H.isDestroyed() && H.isVisible() && (W = !1, H.webContents.send("files-menu:hide-relayed"), H.hide(), H.setIgnoreMouseEvents(!0, { forward: !0 }));
	}, 0);
}
function jt() {
	!B || B.isDestroyed() || !B.isFocused() || q && V && !V.isDestroyed() && (V.showInactive(), V.setIgnoreMouseEvents(!0, { forward: !0 }), K?.raiseControlsOverlay(), B.webContents.send("controls:request-state-relayed"));
}
var Y = null;
function Mt() {
	return u.join(r.getPath("userData"), "settings.json");
}
function Nt() {
	return u.join(r.getPath("userData"), "memory.json");
}
async function X(e) {
	return Y = e, await l.mkdir(r.getPath("userData"), { recursive: !0 }), await l.writeFile(Mt(), `${JSON.stringify({
		settings: e.settings,
		memory: e.memory
	}, null, 2)}\n`, "utf8"), e;
}
async function Z() {
	if (Y) return Y;
	let e = null;
	try {
		e = JSON.parse(await l.readFile(Mt(), "utf8"));
	} catch {
		e = null;
	}
	if (e && typeof e == "object" && ("settings" in e || "memory" in e)) {
		let t = e, n = {
			settings: w(t.settings),
			memory: await S(t.memory)
		};
		return Y = n, n;
	}
	let t = e ? w(e) : C, n;
	try {
		n = await S(JSON.parse(await l.readFile(Nt(), "utf8")));
	} catch {
		n = await S(ye);
	}
	let r = await X({
		settings: t,
		memory: n
	});
	try {
		await l.unlink(Nt());
	} catch {}
	return r;
}
async function Q() {
	return (await Z()).memory.lastOpenDirectory;
}
function Pt() {
	a.handle("vlc:load", async (e, t) => K ? K.loadIfNeeded(t) : {
		ok: !1,
		error: "VLC player is not ready",
		reloaded: !0
	}), a.handle("vlc:play", async () => {
		K?.play();
	}), a.handle("vlc:pause", async () => {
		K?.pause();
	}), a.handle("vlc:stop", async () => {
		K?.stop();
	}), a.handle("vlc:seek", async (e, t) => {
		K?.seek(t);
	}), a.handle("vlc:set-volume", async (e, t) => {
		K?.setVolume(t);
	}), a.handle("vlc:set-volume-muted", async (e, t) => {
		K?.setVolumeMuted(t);
	}), a.handle("vlc:set-rate", async (e, t) => {
		K?.setRate(t);
	}), a.handle("vlc:set-audio-effects", async (e, t) => {
		K?.setAudioEffects(t);
	}), a.handle("vlc:set-video-effects", async (e, t) => {
		K?.setVideoEffects(t);
	}), a.handle("vlc:set-video-visible", async (e, t) => {
		K?.setVideoVisible(t);
	}), a.handle("vlc:suspend-video-overlay", async () => {
		K?.suspendVideoOverlay();
	}), a.handle("vlc:resume-video-overlay", async () => {
		K?.resumeVideoOverlay();
	}), a.handle("vlc:set-viewport", async (e, t) => {
		K?.setViewport(t);
	}), a.on("vlc:set-viewport-sync", (e, t) => {
		K?.setViewport(t);
	}), a.handle("vlc:hide-video-overlay", async () => {
		K?.hideVideoOverlay();
	}), a.on("vlc:hide-video-overlay-sync", () => {
		K?.hideVideoOverlay();
	}), a.handle("vlc:prioritize-ui-overlay", async () => K ? K.prioritizeUiOverlay() : null), a.handle("vlc:release-ui-overlay", async () => {
		K?.releaseUiOverlay();
	}), a.handle("vlc:start-recording", async (e, t) => K ? K.startRecording(t) : {
		ok: !1,
		error: "VLC player is not ready"
	}), a.handle("vlc:stop-recording", async () => {
		K?.stopRecording();
	}), a.handle("vlc:get-state", async () => K?.getState() ?? {
		playing: !1,
		paused: !1,
		ended: !1,
		currentTimeMs: 0,
		durationMs: 0
	});
}
function Ft() {
	a.handle("media-probe:metadata", async (e, t) => {
		try {
			return await L().extractMetadata(t);
		} catch (e) {
			return console.warn("media-probe:metadata failed:", e), null;
		}
	}), a.handle("media-probe:tracks", async (e, t) => {
		try {
			return await L().extractTracks(t);
		} catch (e) {
			return console.warn("media-probe:tracks failed:", e), [];
		}
	}), a.handle("media-probe:thumbnail", async (e, t, n) => {
		try {
			return await L().extractThumbnail(t, n ?? {});
		} catch (e) {
			return console.warn("media-probe:thumbnail failed:", e), null;
		}
	});
}
function It() {
	let e = process.platform === "win32" ? [
		"public/icon.ico",
		"public/logo.png",
		"dist/logo.png"
	] : [
		"public/logo.png",
		"public/icon.ico",
		"dist/logo.png"
	], t = [r.getAppPath(), u.join(R, "..")];
	for (let n of t) for (let t of e) {
		let e = u.join(n, t), r = o.createFromPath(e);
		if (r.isEmpty()) continue;
		if (t.endsWith(".ico")) return r;
		let { width: i, height: a } = r.getSize(), s = Math.round(Math.min(i, a) * .1);
		return r.crop({
			x: s,
			y: s,
			width: Math.max(1, i - s * 2),
			height: Math.max(1, a - s * 2)
		}).resize({
			width: 256,
			height: 256,
			quality: "best"
		});
	}
}
function Lt(e) {
	try {
		K?.destroy(), K = new tt(), K.attachParent(e), K.setOnEnded(() => {
			B?.webContents.send("vlc:ended");
		});
	} catch (e) {
		console.error("Failed to initialize libVLC:", e), K = null;
	}
}
function Rt() {
	B = new t({
		width: 1280,
		height: 800,
		minWidth: 960,
		minHeight: 600,
		show: !1,
		icon: It(),
		backgroundColor: "#0b1020",
		webPreferences: {
			preload: u.join(R, "preload.cjs"),
			contextIsolation: !0,
			nodeIntegration: !1,
			sandbox: !1,
			backgroundThrottling: !1
		}
	}), B.once("ready-to-show", () => {
		B?.show();
	}), B.loadFile(z), Lt(B), B.on("blur", At), B.on("focus", jt), B.on("hide", At), B.on("show", jt), Et && B.webContents.openDevTools({ mode: "detach" }), B.on("closed", () => {
		V && !V.isDestroyed() && V.destroy(), V = null, H && !H.isDestroyed() && H.destroy(), H = null, K?.destroy(), K = null, B = null;
	});
}
function zt() {
	return !B || B.isDestroyed() ? null : V && !V.isDestroyed() ? V : (V = new t({
		parent: B,
		frame: !1,
		transparent: !0,
		show: !1,
		skipTaskbar: !0,
		resizable: !1,
		movable: !1,
		minimizable: !1,
		maximizable: !1,
		minWidth: 1,
		minHeight: 1,
		hasShadow: !1,
		backgroundColor: "#00000000",
		webPreferences: {
			preload: u.join(R, "preload.cjs"),
			contextIsolation: !0,
			nodeIntegration: !1,
			sandbox: !1,
			backgroundThrottling: !1
		}
	}), V.setIgnoreMouseEvents(!0, { forward: !0 }), V.setAlwaysOnTop(!0, "pop-up-menu"), V.loadFile(z, { hash: "/controls-overlay" }), K?.setControlsOverlayWindow(V), V.on("closed", () => {
		K?.setControlsOverlayWindow(null), V = null;
	}), V);
}
function Bt() {
	return !B || B.isDestroyed() ? null : H && !H.isDestroyed() ? H : (H = new t({
		parent: B,
		frame: !1,
		transparent: !0,
		show: !1,
		skipTaskbar: !0,
		resizable: !1,
		movable: !1,
		minimizable: !1,
		maximizable: !1,
		focusable: !0,
		hasShadow: !1,
		backgroundColor: "#00000000",
		webPreferences: {
			preload: u.join(R, "preload.cjs"),
			contextIsolation: !0,
			nodeIntegration: !1,
			sandbox: !1,
			backgroundThrottling: !1
		}
	}), H.setIgnoreMouseEvents(!0, { forward: !0 }), H.setAlwaysOnTop(!0, "screen-saver"), H.loadFile(z, { hash: "/files-menu-overlay" }), K?.setFilesMenuOverlayWindow(H), H.webContents.on("did-start-loading", () => {
		U = !1;
	}), H.on("closed", () => {
		K?.setFilesMenuOverlayWindow(null), H = null;
	}), H);
}
function Vt() {
	!Et || G || (G = c.watch(z, () => {
		B?.webContents.reload(), V && !V.isDestroyed() && V.webContents.reload(), H && !H.isDestroyed() && H.webContents.reload();
	}));
}
a.handle("settings:get", async () => (await Z()).settings);
function Ht(e) {
	for (let t of [
		B,
		V,
		H
	]) t && !t.isDestroyed() && t.webContents.send("settings:changed-relayed", e);
}
a.handle("settings:save", async (e, t) => {
	let n = await Z(), r = w(t);
	return await X({
		...n,
		settings: r
	}), Ht(r), r;
}), a.handle("memory:get", async () => xe((await Z()).memory)), a.handle("memory:save", async (e, t) => {
	let n = await Z(), r = await S(t);
	return await X({
		...n,
		memory: r
	}), r;
});
function $() {
	if (!H || H.isDestroyed()) {
		W = !1;
		return;
	}
	W = !1, H.webContents.send("files-menu:show-relayed", Dt), K?.raiseFilesMenuOverlay();
}
a.on("files-menu:ready", () => {
	U = !0, W && $();
}), a.on("files-menu:show", (e, t, n) => {
	let r = Bt();
	if (!r || !B || B.isDestroyed()) return;
	Dt = n ?? null;
	let i = B.getContentBounds();
	if (r.setBounds({
		x: Math.round(i.x + t.x),
		y: Math.round(i.y + t.y),
		width: Math.max(1, Math.round(t.width)),
		height: Math.max(1, Math.round(t.height))
	}), r.setIgnoreMouseEvents(!1), r.isVisible() || r.showInactive(), W = !0, U && !r.webContents.isLoading()) {
		$();
		return;
	}
	r.webContents.isLoading() && r.webContents.once("did-finish-load", () => {
		U && $();
	});
}), a.on("files-menu:hide", () => {
	W = !1, H && !H.isDestroyed() && (H.webContents.send("files-menu:hide-relayed"), H.hide(), H.setIgnoreMouseEvents(!0, { forward: !0 }));
}), a.on("files-menu:action", (e, t) => {
	B && !B.isDestroyed() && B.webContents.send("files-menu:action-relayed", t), W = !1, H && !H.isDestroyed() && (H.webContents.send("files-menu:hide-relayed"), H.hide(), H.setIgnoreMouseEvents(!0, { forward: !0 }));
}), a.on("files-menu:select", (e, t) => {
	B && !B.isDestroyed() && B.webContents.send("files-menu:select-relayed", t);
}), a.on("files-menu:close", () => {
	B && !B.isDestroyed() && B.webContents.send("files-menu:close-relayed"), W = !1, H && !H.isDestroyed() && (H.webContents.send("files-menu:hide-relayed"), H.hide(), H.setIgnoreMouseEvents(!0, { forward: !0 }));
}), a.on("controls:set-bounds", (e, t) => {
	let n = zt();
	if (!n || !B || B.isDestroyed()) return;
	q = !0;
	let r = B.getContentBounds();
	n.setBounds({
		x: Math.round(r.x + t.x),
		y: Math.round(r.y + t.y),
		width: Math.max(1, Math.round(t.width)),
		height: Math.max(1, Math.round(t.height))
	}), B.isFocused() && (n.isVisible() || (n.showInactive(), n.setIgnoreMouseEvents(!0, { forward: !0 }), n.webContents.send("controls:suspended-relayed")), K?.raiseControlsOverlay());
});
function Ut() {
	if (!V || V.isDestroyed() || !V.isVisible()) return !1;
	let e = s.getCursorScreenPoint(), t = V.getBounds();
	return e.x >= t.x && e.x <= t.x + t.width && e.y >= t.y && e.y <= t.y + t.height;
}
a.handle("controls:cursor-over", () => Ut()), a.on("controls:raise", () => {
	K?.raiseControlsOverlay();
}), a.on("controls:hide", () => {
	q = !1, V && !V.isDestroyed() && (V.hide(), V.webContents.send("controls:suspended-relayed"));
}), a.on("controls:set-interactive", (e, t) => {
	!V || V.isDestroyed() || (t ? (V.setIgnoreMouseEvents(!1), K?.raiseControlsOverlay()) : (V.setIgnoreMouseEvents(!0, { forward: !0 }), K?.raiseControlsOverlay()));
}), a.on("controls:state", (e, t) => {
	V && !V.isDestroyed() && (V.webContents.send("controls:state-relayed", t), V.isVisible() && K?.raiseControlsOverlay());
}), a.on("controls:action", (e, t) => {
	B && !B.isDestroyed() && B.webContents.send("controls:action-relayed", t);
}), a.on("controls:ready", () => {
	B && !B.isDestroyed() && B.webContents.send("controls:request-state-relayed");
}), a.handle("files:openSingle", async (e, t) => {
	if (!y(t) || !B || B.isDestroyed()) return null;
	let n = await Q();
	return J(() => re(B, t, n));
}), a.handle("files:openMultiple", async (e, t) => {
	if (!y(t) || !B || B.isDestroyed()) return [];
	let n = await Q();
	return J(() => ie(B, t, n));
}), a.handle("files:openFolder", async (e, t) => {
	if (!y(t) || !B || B.isDestroyed()) return [];
	let n = await Q();
	return J(() => ae(B, t, n));
}), a.handle("recording:choose-path", async (e, t, n) => {
	if (!B || B.isDestroyed() || typeof t != "string" || typeof n != "string") return null;
	let r = u.extname(t).replace(".", ""), a = u.join(u.dirname(t), n);
	return J(async () => {
		let e = await i.showSaveDialog(B, {
			defaultPath: a,
			filters: r ? [{
				name: r.toUpperCase(),
				extensions: [r]
			}] : void 0
		});
		return e.canceled || !e.filePath ? null : e.filePath;
	});
}), r.whenReady().then(() => {
	n.setApplicationMenu(null), Pt(), Ft(), Rt(), Vt(), r.on("activate", () => {
		t.getAllWindows().length === 0 && Rt();
	});
}), r.on("window-all-closed", () => {
	G?.close(), G = null, process.platform !== "darwin" && r.quit();
}), r.on("before-quit", () => {
	K?.destroy(), K = null;
});
//#endregion
export {};
