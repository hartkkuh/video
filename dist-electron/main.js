import { createRequire as e } from "node:module";
import { BrowserWindow as t, Menu as n, app as r, dialog as i, ipcMain as a, nativeImage as o, screen as s } from "electron";
import c from "node:fs";
import l from "node:fs/promises";
import u from "node:path";
import { fileURLToPath as ee } from "node:url";
//#region shared/vlc-media-extensions.ts
var d = /* @__PURE__ */ ".3ga,.669,.a52,.aac,.ac3,.adt,.adts,.aif,.aifc,.aiff,.alac,.amb,.amr,.aob,.ape,.au,.awb,.caf,.dts,.dsf,.dff,.flac,.it,.kar,.m4a,.m4b,.m4p,.m5p,.mid,.mka,.mlp,.mod,.mpa,.mp1,.mp2,.mp3,.mpc,.mpga,.mus,.oga,.ogg,.oma,.opus,.qcp,.ra,.rmi,.s3m,.sid,.spx,.tak,.thd,.tta,.voc,.vqf,.w64,.wav,.wma,.wv,.xa,.xm".split(","), f = /* @__PURE__ */ ".3g2,.3gp,.3gp2,.3gpp,.amrec,.amv,.asf,.avi,.bik,.bin,.crf,.dav,.divx,.drc,.dv,.dvr-ms,.evo,.f4v,.flv,.gvi,.gxf,.iso,.k3g,.m1v,.m2v,.m2t,.m2ts,.m4v,.mkv,.mov,.mp2,.mp2v,.mp4,.mp4v,.mpe,.mpeg,.mpeg1,.mpeg2,.mpeg4,.mpg,.mpv2,.mts,.mtv,.mxf,.mxg,.nsv,.nuv,.ogg,.ogm,.ogv,.ogx,.ps,.qt,.rec,.rm,.rmvb,.rpl,.skm,.thp,.tod,.tp,.ts,.tts,.txd,.vob,.vp6,.vro,.webm,.wm,.wmv,.wtv,.xesc".split(","), p = /* @__PURE__ */ ".cdg,.idx,.srt,.sub,.utf,.ass,.ssa,.aqt,.jss,.psb,.rt,.sami,.smi,.txt,.smil,.stl,.usf,.dks,.pjs,.mpl2,.mks,.vtt,.tt,.ttml,.dfxp,.scc".split(",");
function m(...e) {
	return [...new Set(e.flat())];
}
var h = {
	audio: d,
	video: f,
	subtitles: p,
	media: m(d, f)
}, g = {
	audio: new Set(h.audio),
	video: new Set(h.video),
	subtitles: new Set(h.subtitles),
	media: new Set(h.media)
}, _ = {
	audio: "Audio",
	video: "Video",
	subtitles: "Subtitles",
	media: "Audio and Video"
};
function v(e) {
	return e === "audio" || e === "video" || e === "subtitles" || e === "media";
}
function te(e) {
	let t = h[e].map((e) => e.slice(1));
	return [{
		name: _[e],
		extensions: t
	}];
}
function ne(e, t) {
	let n = u.extname(e).toLowerCase();
	return g[t].has(n);
}
async function re(e, t) {
	let n = await l.readdir(e, { withFileTypes: !0 }), r = [];
	for (let i of n) {
		if (!i.isFile()) continue;
		let n = u.join(e, i.name);
		ne(n, t) && r.push(n);
	}
	return r.sort((e, t) => e.localeCompare(t));
}
async function ie(e, t, n) {
	let r = await i.showOpenDialog(e, {
		properties: ["openFile"],
		filters: te(t),
		...n ? { defaultPath: n } : {}
	});
	return r.canceled || r.filePaths.length === 0 ? null : r.filePaths[0];
}
async function ae(e, t, n) {
	let r = await i.showOpenDialog(e, {
		properties: ["openFile", "multiSelections"],
		filters: te(t),
		...n ? { defaultPath: n } : {}
	});
	return r.canceled ? [] : r.filePaths;
}
async function oe(e, t, n) {
	let r = await i.showOpenDialog(e, {
		properties: ["openDirectory"],
		...n ? { defaultPath: n } : {}
	});
	return r.canceled || r.filePaths.length === 0 ? [] : re(r.filePaths[0], t);
}
var y = {
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
({ ...y });
function se(e) {
	return e === "all" || e === "one" ? e : "off";
}
function ce(e) {
	return e === "video" ? "video" : "audio";
}
function le(e) {
	return e === "encoding" ? "encoding" : "file";
}
function ue(e) {
	return Array.isArray(e) ? e.filter((e) => typeof e == "string" && e.length > 0) : [];
}
function de(e) {
	return typeof e != "number" || !Number.isFinite(e) ? y.volume : Math.min(2, Math.max(0, e));
}
function fe(e) {
	return typeof e != "number" || !Number.isFinite(e) ? y.playbackRate : Math.min(2, Math.max(.25, e));
}
function pe(e, t) {
	return typeof e != "number" || !Number.isFinite(e) || t === 0 ? 0 : Math.min(Math.max(0, Math.floor(e)), t - 1);
}
function me(e) {
	return typeof e == "string" ? e : "";
}
function b(e, t, n, r) {
	return typeof e != "number" || !Number.isFinite(e) ? r : Math.min(n, Math.max(t, e));
}
function he(e) {
	let t = typeof e == "object" && e ? e : {}, n = Array.isArray(t.bands) ? t.bands : [];
	return {
		bands: Array.from({ length: 10 }, (e, t) => b(n[t], -12, 12, 0)),
		outputGain: b(t.outputGain, .5, 2, 1)
	};
}
function ge(e) {
	let t = typeof e == "object" && e ? e : {};
	return {
		grayscale: b(t.grayscale, 0, 100, 0),
		contrast: b(t.contrast, 0, 3, 1),
		brightness: b(t.brightness, 0, 3, 1),
		saturation: b(t.saturation, 0, 3, 1),
		sepia: b(t.sepia, 0, 100, 0),
		hue: b(t.hue, 0, 360, 0),
		gamma: b(t.gamma, .01, 10, 1),
		blur: b(t.blur, 0, 10, 0)
	};
}
function _e(e) {
	let t = e.replace(/\\/g, "/"), n = t.lastIndexOf("/");
	return n < 0 ? "" : e.slice(0, e.length - (t.length - n));
}
function ve(e) {
	let t = me(e.lastOpenDirectory);
	if (t.length > 0) return t;
	let n = ue(e.filePaths);
	return n.length === 0 ? "" : _e(n[pe(e.currentIndex, n.length)] ?? n[n.length - 1]);
}
function ye(e) {
	if (typeof e != "object" || !e) return y;
	let t = e;
	return {
		volume: de(t.volume),
		volumeMuted: t.volumeMuted === !0,
		playbackRate: fe(t.playbackRate),
		repeatMode: se(t.repeatMode),
		shuffleEnabled: t.shuffleEnabled === !0,
		lastOpenDirectory: ve(t),
		lastEffectsTab: ce(t.lastEffectsTab),
		lastMediaTab: le(t.lastMediaTab),
		audioEffects: he(t.audioEffects),
		videoEffects: ge(t.videoEffects)
	};
}
//#endregion
//#region electron/memory.ts
var be = y;
async function xe(e) {
	if (!e) return !1;
	try {
		return (await l.stat(e)).isDirectory();
	} catch {
		return !1;
	}
}
async function x(e) {
	let t = ye(e);
	return !t.lastOpenDirectory || await xe(t.lastOpenDirectory) ? t : {
		...t,
		lastOpenDirectory: ""
	};
}
function Se(e) {
	return {
		...e,
		filePaths: [],
		currentIndex: 0
	};
}
//#endregion
//#region electron/settings.ts
var S = {
	language: "he",
	theme: "dark",
	controlsPosition: "bottom"
};
function Ce(e) {
	return e === "en" || e === "he" ? e : S.language;
}
function we(e) {
	return e === "light" ? "light" : "dark";
}
function Te(e) {
	return e === "top" ? "top" : S.controlsPosition;
}
function C(e) {
	if (typeof e != "object" || !e) return S;
	let t = e;
	return {
		language: Ce(t.language),
		theme: we(t.theme),
		controlsPosition: Te(t.controlsPosition)
	};
}
//#endregion
//#region electron/vlc-effects.ts
var Ee = {
	grayscale: 0,
	contrast: 1,
	brightness: 1,
	saturation: 1,
	sepia: 0,
	hue: 0,
	gamma: 1,
	blur: 0
};
function w(e) {
	return e.bands.every((e) => Math.abs(e) < .01) && Math.abs(e.outputGain - 1) < .01;
}
function De(e) {
	return e.grayscale === 0 && Math.abs(e.contrast - 1) < .01 && Math.abs(e.brightness - 1) < .01 && Math.abs(e.saturation - 1) < .01 && e.sepia === 0 && Math.abs(e.hue) < .01 && Math.abs(e.gamma - 1) < .01 && e.blur === 0;
}
function Oe(e) {
	return 20 * Math.log10(Math.min(2, Math.max(.5, e)));
}
function ke(e) {
	return Math.abs(e) <= 180 ? e : e - 360;
}
function Ae(e) {
	let t = 1 - e.grayscale / 100, n = e.sepia / 100;
	return {
		enabled: !De(e),
		brightness: e.brightness * (1 + n * .06),
		contrast: e.contrast * (1 + n * .08),
		saturation: e.saturation * t * (1 - n * .45),
		hue: ke(e.hue + n * 55),
		gamma: e.gamma * (1 - n * .04)
	};
}
function je(e) {
	return e.blur > 0;
}
function Me(e) {
	return e.blur <= 0 ? [] : [":video-filter=gaussianblur", `:gaussianblur-sigma=${Math.max(.1, e.blur).toFixed(2)}`];
}
//#endregion
//#region electron/win32-api.ts
var Ne = e(import.meta.url)("koffi");
function T(e) {
	return e.length >= 8 ? e.readBigInt64LE(0) : BigInt(e.readUInt32LE(0));
}
function Pe(e) {
	return Number(T(e));
}
var Fe = class {
	setWindowPos;
	moveWindow;
	showWindow;
	isWindow;
	bringWindowToTop;
	constructor() {
		let e = Ne.load("user32.dll");
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
}, Ie = null;
function Le() {
	return process.platform === "win32" ? (Ie ||= new Fe(), Ie) : null;
}
//#endregion
//#region electron/vlc-player.ts
var Re = e(import.meta.url)("koffi"), ze = 3, E = 4, D = 6, Be = 1.5, Ve = 200, He = {
	".mp4": "mp4",
	".m4v": "mp4",
	".m4a": "mp4",
	".m4b": "mp4",
	".mov": "mp4",
	".qt": "mp4",
	".3gp": "mp4",
	".3g2": "mp4",
	".3gpp": "mp4",
	".mkv": "mp4",
	".mka": "mp4",
	".webm": "mp4",
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
	".flv": "mp4",
	".f4v": "mp4",
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
}, Ue = new Set(f);
function We(e) {
	return Ue.has(u.extname(e).toLowerCase());
}
function Ge(e) {
	return He[u.extname(e).toLowerCase()] ?? null;
}
function Ke(e, t) {
	let n = e.replace(/\\/g, "/").replace(/["']/g, ""), r = We(t), i = [
		":vout=dummy",
		":aout=dummy",
		":no-video-title-show"
	];
	if (r) return [
		...i,
		`:sout=#transcode{vcodec=h264,venc=x264{preset=ultrafast},acodec=mp4a,ab=192,channels=2,samplerate=44100}:duplicate{dst=display,dst=std{access=file,mux=mp4,dst='${n}'}}`,
		":sout-all"
	];
	let a = Ge(e), o = a && a !== "raw" ? `std{access=file,mux=${a},dst='${n}'}` : `std{access=file,dst='${n}'}`;
	return [
		...i,
		`:sout=#duplicate{dst=display,dst=${o}}`,
		":sout-all"
	];
}
var qe = 0, Je = 1, Ye = 2, Xe = 3, Ze = 4, Qe = 5, $e = class {
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
	pendingRate = 1;
	activeVideoEffects = { ...Ee };
	uiOverlayPrioritized = !1;
	lastAppliedScreenBounds = null;
	recordingPath = null;
	recordingPlayer = null;
	recordingMedia = null;
	recordingInstance = null;
	libvlc_new;
	libvlc_new_args;
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
	libvlc_media_player_set_pause;
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
	win32 = Le();
	parentGeometryHandler = null;
	parentMinimizeHandler = null;
	parentRestoreHandler = null;
	controlsOverlayWindow = null;
	filesMenuOverlayWindow = null;
	constructor() {
		let e = u.join(r.getAppPath(), "libvlc");
		process.env.VLC_PLUGIN_PATH = u.join(e, "plugins"), process.env.PATH = `${e}${u.delimiter}${process.env.PATH ?? ""}`;
		let t = Re.load(u.join(e, "libvlc.dll"));
		this.libvlc_new = t.func("libvlc_new", "void *", ["int", "void *"]), this.libvlc_new_args = t.func("libvlc_new", "void *", ["int", "char **"]), this.libvlc_release = t.func("libvlc_release", "void", ["void *"]), this.libvlc_errmsg = t.func("libvlc_errmsg", "str", []), this.libvlc_media_new_path = t.func("libvlc_media_new_path", "void *", ["void *", "str"]), this.libvlc_media_add_option = t.func("libvlc_media_add_option", "void", ["void *", "str"]), this.libvlc_media_release = t.func("libvlc_media_release", "void", ["void *"]), this.libvlc_media_player_new = t.func("libvlc_media_player_new", "void *", ["void *"]), this.libvlc_media_player_release = t.func("libvlc_media_player_release", "void", ["void *"]), this.libvlc_media_player_set_media = t.func("libvlc_media_player_set_media", "void", ["void *", "void *"]), this.libvlc_media_player_set_hwnd = t.func("libvlc_media_player_set_hwnd", "void", ["void *", "int64"]), this.libvlc_media_player_play = t.func("libvlc_media_player_play", "int", ["void *"]), this.libvlc_media_player_set_pause = t.func("libvlc_media_player_set_pause", "void", ["void *", "int"]), this.libvlc_media_player_stop = t.func("libvlc_media_player_stop", "void", ["void *"]), this.libvlc_media_player_set_time = t.func("libvlc_media_player_set_time", "void", ["void *", "int64"]), this.libvlc_media_player_get_time = t.func("libvlc_media_player_get_time", "int64", ["void *"]), this.libvlc_media_player_get_length = t.func("libvlc_media_player_get_length", "int64", ["void *"]), this.libvlc_media_player_get_state = t.func("libvlc_media_player_get_state", "int", ["void *"]), this.libvlc_media_player_set_rate = t.func("libvlc_media_player_set_rate", "void", ["void *", "float"]), this.libvlc_audio_set_volume = t.func("libvlc_audio_set_volume", "int", ["void *", "int"]), this.libvlc_audio_equalizer_new = t.func("libvlc_audio_equalizer_new", "void *", []), this.libvlc_audio_equalizer_release = t.func("libvlc_audio_equalizer_release", "void", ["void *"]), this.libvlc_audio_equalizer_set_amp_at_index = t.func("libvlc_audio_equalizer_set_amp_at_index", "void", [
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
		return this.stop(), this.mediaLoaded = !1, this.teardownRecordingPlayer(), this.recordingPath = null, this.currentFilePath = e, this.media &&= (this.libvlc_media_release(this.media), null), this.endedNotified = !1, this.media = this.createMedia(e, this.activeVideoEffects), this.media ? (this.libvlc_media_player_set_media(this.mediaPlayer, this.media), this.mediaLoaded = !0, this.applyPendingEffects(), { ok: !0 }) : {
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
		this.endedNotified = !1, this.prepareVideoOutput(), this.libvlc_media_player_play(this.mediaPlayer), this.refreshEffectsAfterPipeline(), this.syncRecordingTransport("play");
	}
	pause() {
		this.libvlc_media_player_set_pause(this.mediaPlayer, 1), this.syncRecordingTransport("pause");
	}
	stop() {
		this.libvlc_media_player_stop(this.mediaPlayer), this.syncRecordingTransport("pause");
	}
	seek(e) {
		let t = Math.max(0, Math.round(e));
		this.libvlc_media_player_set_time(this.mediaPlayer, t), this.syncRecordingTransport("seek", t);
	}
	setVolume(e) {
		this.pendingVolume = Math.min(2, Math.max(0, e)), this.mediaLoaded && this.applyVolumeSettings();
	}
	setVolumeMuted(e) {
		this.pendingVolumeMuted = e, this.mediaLoaded && this.applyVolumeSettings();
	}
	setRate(e) {
		this.pendingRate = e, this.mediaLoaded && (this.libvlc_media_player_set_rate(this.mediaPlayer, e), this.recordingPlayer && this.libvlc_media_player_set_rate(this.recordingPlayer, e));
	}
	setAudioEffects(e) {
		this.pendingAudioEffects = e, this.mediaLoaded && (this.applyAudioEffects(e), this.refreshEffectsAfterPipeline());
	}
	setVideoEffects(e) {
		let t = this.activeVideoEffects;
		if (this.activeVideoEffects = e, this.mediaLoaded) {
			if (je(t) || je(e)) {
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
		if (this.recordingPlayer) return {
			ok: !1,
			error: "Recording already in progress"
		};
		try {
			let t = this.libvlc_new_args(4, [
				"--vout=dummy",
				"--aout=dummy",
				"--no-video-title-show",
				"--quiet"
			]);
			if (!t) return {
				ok: !1,
				error: this.libvlc_errmsg() ?? "Failed to init recording engine"
			};
			let n = this.libvlc_media_new_path(t, this.currentFilePath);
			if (!n) return this.libvlc_release(t), {
				ok: !1,
				error: this.libvlc_errmsg() ?? "Failed to open source for recording"
			};
			for (let t of Ke(e, this.currentFilePath)) this.libvlc_media_add_option(n, t);
			let r = this.libvlc_media_player_new(t);
			if (!r) return this.libvlc_media_release(n), this.libvlc_release(t), {
				ok: !1,
				error: this.libvlc_errmsg() ?? "Failed to create recording player"
			};
			if (this.libvlc_media_player_set_media(r, n), this.libvlc_media_player_play(r) !== 0) return this.libvlc_media_player_release(r), this.libvlc_media_release(n), this.libvlc_release(t), {
				ok: !1,
				error: this.libvlc_errmsg() ?? "Failed to start recording"
			};
			let i = Math.max(0, Number(this.libvlc_media_player_get_time(this.mediaPlayer)));
			i > 0 && this.libvlc_media_player_set_time(r, i);
			let a = this.libvlc_media_player_get_state(this.mediaPlayer);
			return (a === E || a === D) && this.libvlc_media_player_set_pause(r, 1), this.recordingInstance = t, this.recordingPlayer = r, this.recordingMedia = n, this.recordingPath = e, this.pendingRate > 0 && this.pendingRate !== 1 && this.libvlc_media_player_set_rate(r, this.pendingRate), { ok: !0 };
		} catch (e) {
			return this.teardownRecordingPlayer(), this.recordingPath = null, console.error("Failed to start recording:", e), {
				ok: !1,
				error: e instanceof Error ? e.message : "Failed to start recording"
			};
		}
	}
	stopRecording() {
		!this.recordingPath && !this.recordingPlayer || (this.teardownRecordingPlayer(), this.recordingPath = null);
	}
	teardownRecordingPlayer() {
		this.recordingPlayer &&= (this.libvlc_media_player_stop(this.recordingPlayer), this.libvlc_media_player_release(this.recordingPlayer), null), this.recordingMedia &&= (this.libvlc_media_release(this.recordingMedia), null), this.recordingInstance &&= (this.libvlc_release(this.recordingInstance), null);
	}
	syncRecordingTransport(e, t = 0) {
		if (this.recordingPlayer) {
			if (e === "pause") {
				this.libvlc_media_player_set_pause(this.recordingPlayer, 1);
				return;
			}
			if (e === "seek") {
				this.libvlc_media_player_set_time(this.recordingPlayer, t);
				let e = this.libvlc_media_player_get_state(this.mediaPlayer);
				(e === E || e === D) && this.libvlc_media_player_set_pause(this.recordingPlayer, 1);
				return;
			}
			this.libvlc_media_player_set_pause(this.recordingPlayer, 0);
		}
	}
	isRecording() {
		return this.recordingPath !== null;
	}
	getState() {
		let e = this.libvlc_media_player_get_state(this.mediaPlayer), t = Math.max(0, Number(this.libvlc_media_player_get_time(this.mediaPlayer))), n = Math.max(0, Number(this.libvlc_media_player_get_length(this.mediaPlayer))), r = e === ze, i = e === E, a = e === D;
		return a && !this.endedNotified && (this.endedNotified = !0, this.onEnded?.()), {
			playing: r,
			paused: i,
			ended: a,
			currentTimeMs: t,
			durationMs: n
		};
	}
	destroy() {
		this.stop(), this.hideVideoWindow(), this.detachParentListeners(), this.videoWindow && !this.videoWindow.isDestroyed() && (this.videoWindow.destroy(), this.videoWindow = null), this.teardownRecordingPlayer(), this.media &&= (this.libvlc_media_release(this.media), null), this.equalizer &&= (this.libvlc_audio_equalizer_release(this.equalizer), null), this.mediaPlayer &&= (this.libvlc_media_player_release(this.mediaPlayer), null), this.instance &&= (this.libvlc_release(this.instance), null);
	}
	applyPendingEffects() {
		this.applyVolumeSettings(), this.pendingAudioEffects && this.applyAudioEffects(this.pendingAudioEffects), this.applyVideoAdjust(this.activeVideoEffects);
	}
	refreshEffectsAfterPipeline() {
		this.applyPendingEffects();
		for (let e of [50, 200]) setTimeout(() => {
			this.mediaLoaded && this.applyPendingEffects();
		}, e);
	}
	reapplyAudioEffectsIfActive() {
		this.pendingAudioEffects && !w(this.pendingAudioEffects) && this.applyAudioEffects(this.pendingAudioEffects);
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
	uiVolumeToLibVlcVolume(e) {
		return Math.min(Ve, Math.round(e * 100 * Be));
	}
	clearVolumeBoostEqualizer() {
		(!this.pendingAudioEffects || w(this.pendingAudioEffects)) && this.libvlc_media_player_set_equalizer(this.mediaPlayer, null);
	}
	applyVolumeBoostEqualizer(e) {
		let t = Math.min(20, Math.max(-20, 20 * Math.log10(e) + 6.02));
		this.equalizer ||= this.libvlc_audio_equalizer_new(), this.libvlc_audio_equalizer_set_preamp(this.equalizer, t);
		for (let e = 0; e < 10; e += 1) this.libvlc_audio_equalizer_set_amp_at_index(this.equalizer, 0, e);
		this.libvlc_media_player_set_equalizer(this.mediaPlayer, this.equalizer);
	}
	applyAudioEffects(e) {
		if (w(e)) {
			this.libvlc_media_player_set_equalizer(this.mediaPlayer, null);
			return;
		}
		if (this.equalizer ||= this.libvlc_audio_equalizer_new(), this.equalizer) {
			this.libvlc_audio_equalizer_set_preamp(this.equalizer, Oe(e.outputGain));
			for (let t = 0; t < 10; t += 1) {
				let n = e.bands[t] ?? 0;
				this.libvlc_audio_equalizer_set_amp_at_index(this.equalizer, n, t);
			}
			this.libvlc_media_player_set_equalizer(this.mediaPlayer, this.equalizer);
		}
	}
	applyVideoAdjust(e) {
		let t = Ae(e);
		this.libvlc_video_set_adjust_int(this.mediaPlayer, qe, +!!t.enabled), t.enabled && (this.libvlc_video_set_adjust_float(this.mediaPlayer, Ye, t.brightness), this.libvlc_video_set_adjust_float(this.mediaPlayer, Je, t.contrast), this.libvlc_video_set_adjust_float(this.mediaPlayer, Ze, t.saturation), this.libvlc_video_set_adjust_float(this.mediaPlayer, Xe, t.hue), this.libvlc_video_set_adjust_float(this.mediaPlayer, Qe, t.gamma));
	}
	createMedia(e, t) {
		let n = this.libvlc_media_new_path(this.instance, e);
		if (!n) return null;
		for (let e of Me(t)) this.libvlc_media_add_option(n, e);
		return n;
	}
	reloadMediaPreservePosition() {
		if (!this.currentFilePath || !this.mediaLoaded) return;
		let e = Math.max(0, Number(this.libvlc_media_player_get_time(this.mediaPlayer))), t = this.libvlc_media_player_get_state(this.mediaPlayer), n = t === ze || t === E;
		if (this.libvlc_media_player_stop(this.mediaPlayer), this.media &&= (this.libvlc_media_release(this.media), null), this.media = this.createMedia(this.currentFilePath, this.activeVideoEffects), !this.media) {
			this.mediaLoaded = !1;
			return;
		}
		if (this.libvlc_media_player_set_media(this.mediaPlayer, this.media), e > 0 && this.libvlc_media_player_set_time(this.mediaPlayer, e), n) {
			this.prepareVideoOutput(), this.libvlc_media_player_play(this.mediaPlayer), this.refreshEffectsAfterPipeline();
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
			}), t = Pe(c.getNativeWindowHandle());
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
			this.libvlc_media_player_set_hwnd(this.mediaPlayer, T(e)), process.platform !== "win32" && c.showInactive(), this.applyPendingEffects(), this.sendVideoWindowAboveUi();
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
		let e = Pe(this.videoWindow.getNativeWindowHandle());
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
			this.libvlc_media_player_set_hwnd(this.mediaPlayer, T(e));
		}
		return this.videoWindow;
	}
	hideVideoWindow() {
		this.lastAppliedScreenBounds = null, this.videoWindow && !this.videoWindow.isDestroyed() && this.videoWindow.hide();
	}
}, et = new Set(d);
function tt(e) {
	return et.has(u.extname(e).toLowerCase());
}
function O(e, t) {
	return (e[t] & 127) << 21 | (e[t + 1] & 127) << 14 | (e[t + 2] & 127) << 7 | e[t + 3] & 127;
}
function nt(e) {
	if (e.length < 10 || e.toString("ascii", 0, 3) !== "ID3") return null;
	let t = e[3], n = O(e, 6), r = 10, i = Math.min(e.length, 10 + n);
	for (; r < i;) {
		let n, a, o;
		if (t === 2) {
			if (r + 6 > i) break;
			n = e.toString("ascii", r, r + 3), a = e[r + 3] << 16 | e[r + 4] << 8 | e[r + 5], o = r + 6;
		} else {
			if (r + 10 > i) break;
			n = e.toString("ascii", r, r + 4).replace(/\0/g, ""), a = t === 4 ? O(e, r + 4) : e.readUInt32BE(r + 4), o = r + 10;
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
function rt(e) {
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
function it(e) {
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
function at(e) {
	return rt(e);
}
function ot(e, t) {
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
async function st(e, t = 320) {
	if (!tt(e)) return null;
	try {
		let n = await l.readFile(e), r = u.extname(e).toLowerCase(), i = null;
		return i = r === ".mp3" || r === ".mp2" || r === ".mp1" || r === ".mpga" ? nt(n) : r === ".flac" ? it(n) : r === ".m4a" || r === ".m4b" || r === ".m4p" || r === ".mp4" ? at(n) : nt(n), i ? ot(i, t) : null;
	} catch {
		return null;
	}
}
async function ct(e, t = 320) {
	if (!e) return null;
	let n = e;
	if (n.startsWith("file://")) try {
		n = decodeURIComponent(new URL(n).pathname), process.platform === "win32" && n.startsWith("/") && (n = n.slice(1));
	} catch {
		return null;
	}
	if (!u.isAbsolute(n)) return null;
	try {
		return ot(await l.readFile(n), t);
	} catch {
		return null;
	}
}
//#endregion
//#region electron/media-probe.ts
var k = e(import.meta.url)("koffi"), lt = 3, ut = 7, dt = 0, ft = 2, pt = 3, mt = 4, ht = 0, gt = 1, _t = 2, A = {
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
}, vt = k.struct({
	i_channels: "uint",
	i_rate: "uint"
}), yt = k.struct({
	i_height: "uint",
	i_width: "uint",
	i_sar_num: "uint",
	i_sar_den: "uint",
	i_frame_rate_num: "uint",
	i_frame_rate_den: "uint"
}), bt = k.struct({ psz_encoding: "str" }), xt = k.struct({
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
function j(e) {
	return new Promise((t) => setTimeout(t, e));
}
function M(e) {
	if (!e) return null;
	let t = [
		e & 255,
		e >>> 8 & 255,
		e >>> 16 & 255,
		e >>> 24 & 255
	].map((e) => e >= 32 && e < 127 ? String.fromCharCode(e) : "").join("").trim();
	return t.length ? t : null;
}
function N(e) {
	if (typeof e != "string") return null;
	let t = e.trim();
	return t.length ? t : null;
}
function St(e, t, n) {
	return Number.isFinite(e) ? Math.min(n, Math.max(t, e)) : t;
}
var Ct = class {
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
		let t = k.load(u.join(e, "libvlc.dll"));
		this.libvlc_new = t.func("libvlc_new", "void *", ["int", "void *"]), this.libvlc_release = t.func("libvlc_release", "void", ["void *"]), this.libvlc_media_new_path = t.func("libvlc_media_new_path", "void *", ["void *", "str"]), this.libvlc_media_add_option = t.func("libvlc_media_add_option", "void", ["void *", "str"]), this.libvlc_media_release = t.func("libvlc_media_release", "void", ["void *"]), this.libvlc_media_parse_with_options = t.func("libvlc_media_parse_with_options", "int", [
			"void *",
			"int",
			"int"
		]), this.libvlc_media_get_parsed_status = t.func("libvlc_media_get_parsed_status", "int", ["void *"]), this.libvlc_media_get_meta = t.func("libvlc_media_get_meta", "void *", ["void *", "int"]), this.libvlc_media_get_duration = t.func("libvlc_media_get_duration", "int64", ["void *"]), this.libvlc_media_tracks_get = t.func("libvlc_media_tracks_get", "uint", ["void *", k.out(k.pointer("void *"))]), this.libvlc_media_tracks_release = t.func("libvlc_media_tracks_release", "void", ["void *", "uint"]), this.libvlc_free = t.func("libvlc_free", "void", ["void *"]), this.libvlc_media_player_new = t.func("libvlc_media_player_new", "void *", ["void *"]), this.libvlc_media_player_release = t.func("libvlc_media_player_release", "void", ["void *"]), this.libvlc_media_player_set_media = t.func("libvlc_media_player_set_media", "void", ["void *", "void *"]), this.libvlc_media_player_set_hwnd = t.func("libvlc_media_player_set_hwnd", "void", ["void *", "int64"]), this.libvlc_media_player_play = t.func("libvlc_media_player_play", "int", ["void *"]), this.libvlc_media_player_stop = t.func("libvlc_media_player_stop", "void", ["void *"]), this.libvlc_media_player_set_time = t.func("libvlc_media_player_set_time", "void", ["void *", "int64"]), this.libvlc_media_player_get_length = t.func("libvlc_media_player_get_length", "int64", ["void *"]), this.libvlc_media_player_get_state = t.func("libvlc_media_player_get_state", "int", ["void *"]), this.libvlc_audio_set_volume = t.func("libvlc_audio_set_volume", "int", ["void *", "int"]), this.libvlc_video_take_snapshot = t.func("libvlc_video_take_snapshot", "int", [
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
				title: this.getMeta(t, A.title),
				artist: this.getMeta(t, A.artist),
				album: this.getMeta(t, A.album),
				albumArtist: this.getMeta(t, A.albumArtist),
				genre: this.getMeta(t, A.genre),
				description: this.getMeta(t, A.description),
				date: this.getMeta(t, A.date),
				trackNumber: this.getMeta(t, A.trackNumber),
				trackTotal: this.getMeta(t, A.trackTotal),
				discNumber: this.getMeta(t, A.discNumber),
				copyright: this.getMeta(t, A.copyright),
				publisher: this.getMeta(t, A.publisher),
				encodedBy: this.getMeta(t, A.encodedBy),
				language: this.getMeta(t, A.language),
				nowPlaying: this.getMeta(t, A.nowPlaying),
				showName: this.getMeta(t, A.showName),
				season: this.getMeta(t, A.season),
				episode: this.getMeta(t, A.episode),
				director: this.getMeta(t, A.director),
				actors: this.getMeta(t, A.actors),
				rating: this.getMeta(t, A.rating),
				url: this.getMeta(t, A.url),
				artworkUrl: this.getMeta(t, A.artworkUrl),
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
		let n = Math.round(St(t.width ?? 320, 16, 1920)), r = this.libvlc_media_new_path(this.instance, e);
		if (!r) return null;
		try {
			await this.parseMedia(r);
			let i = await ct(this.getMeta(r, A.artworkUrl), n);
			if (i) return {
				filePath: e,
				...i
			};
			let a = await st(e, n);
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
			let ee = T(c.getNativeWindowHandle());
			if (this.libvlc_media_player_set_hwnd(s, ee), c.showInactive(), this.libvlc_audio_set_volume(s, 0), this.libvlc_media_player_play(s) !== 0 || !await this.waitForPlaying(s, 5e3)) return null;
			let d = Math.max(0, Number(this.libvlc_media_player_get_length(s))), f = typeof a.timeMs == "number" ? St(a.timeMs, 0, d > 0 ? d : a.timeMs) : d > 1500 ? Math.min(d - 500, Math.max(1e3, Math.floor(d * .1))) : 0;
			f > 0 && this.libvlc_media_player_set_time(s, f), await j(900);
			let p = u.join(r.getPath("temp"), "fmp-media-player", "probe");
			await l.mkdir(p, { recursive: !0 });
			let m = u.join(p, `thumb-${Date.now()}-${Math.random().toString(36).slice(2)}.png`), h = this.libvlc_video_take_snapshot(s, 0, m, i, 0);
			if (h !== 0 && (await j(500), h = this.libvlc_video_take_snapshot(s, 0, m, i, 0)), h !== 0) return null;
			let g = o.createFromPath(m);
			if (await l.rm(m, { force: !0 }), g.isEmpty()) return null;
			let _ = g.getSize();
			return {
				filePath: n,
				dataUrl: g.toDataURL(),
				width: _.width,
				height: _.height
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
		if (this.libvlc_media_parse_with_options(e, dt, 5e3) !== 0) return !1;
		let t = Date.now() + 6e3;
		for (; Date.now() < t;) {
			let t = this.libvlc_media_get_parsed_status(e);
			if (t === mt) return !0;
			if (t === ft || t === pt) return !1;
			await j(25);
		}
		return !1;
	}
	getMeta(e, t) {
		let n = this.libvlc_media_get_meta(e, t);
		if (!n) return null;
		try {
			return N(k.decode.string(n));
		} finally {
			this.libvlc_free(n);
		}
	}
	readTracks(e) {
		let t = [null], n = this.libvlc_media_tracks_get(e, t), r = t[0];
		if (!n || !r) return [];
		let i = [];
		try {
			let e = k.decode(r, k.array("void *", n));
			for (let t = 0; t < n; t += 1) {
				let n = e[t];
				if (!n) continue;
				let r = k.decode(n, xt), a = r.i_type === ht ? "audio" : r.i_type === gt ? "video" : r.i_type === _t ? "subtitle" : "unknown", o = {
					id: r.i_id,
					kind: a,
					codec: M(r.i_codec),
					codecFourcc: M(r.i_codec),
					originalFourcc: M(r.i_original_fourcc),
					bitrate: r.i_bitrate >>> 0,
					profile: r.i_profile,
					level: r.i_level,
					language: N(r.psz_language),
					description: N(r.psz_description)
				};
				if (a === "audio" && r.media) {
					let e = k.decode(r.media, vt);
					o.channels = e.i_channels, o.sampleRate = e.i_rate;
				} else if (a === "video" && r.media) {
					let e = k.decode(r.media, yt);
					o.width = e.i_width, o.height = e.i_height, o.frameRate = e.i_frame_rate_den ? Math.round(e.i_frame_rate_num / e.i_frame_rate_den * 1e3) / 1e3 : 0, o.sampleAspectRatio = e.i_sar_den ? `${e.i_sar_num}:${e.i_sar_den}` : void 0;
				} else a === "subtitle" && r.media && (o.encoding = N(k.decode(r.media, bt).psz_encoding));
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
			if (t === lt) return !0;
			if (t === ut) return !1;
			await j(30);
		}
		return !1;
	}
}, wt = null;
function P() {
	return wt ||= new Ct(), wt;
}
//#endregion
//#region electron/main.ts
var F = u.dirname(ee(import.meta.url)), Tt = !r.isPackaged, I = u.join(F, "../dist/index.html"), L = null, R = null, z = null, B = !1, V = !1, Et = null, H = null, U = null, W = !1;
async function G(e) {
	let t = !!(R && !R.isDestroyed() && R.isVisible()), n = !!(z && !z.isDestroyed() && z.isVisible());
	t && R?.hide(), n && (z?.hide(), z?.setIgnoreMouseEvents(!0, { forward: !0 })), V = !1, U?.suspendVideoOverlay();
	try {
		return L && !L.isDestroyed() && L.focus(), await e();
	} finally {
		U?.resumeVideoOverlay(), Dt(t);
	}
}
function Dt(e) {
	!e || !R || R.isDestroyed() || (W = !0, !(!L || L.isDestroyed() || !L.isFocused()) && (R.showInactive(), R.setIgnoreMouseEvents(!0, { forward: !0 }), U?.raiseControlsOverlay(), L.webContents.send("controls:request-state-relayed"), L.webContents.send("vlc:parent-geometry-changed")));
}
function K() {
	R && !R.isDestroyed() && (R.setAlwaysOnTop(!1), R.hide(), R.webContents.send("controls:suspended-relayed")), z && !z.isDestroyed() && (V = !1, z.setAlwaysOnTop(!1), z.webContents.send("files-menu:hide-relayed"), z.hide(), z.setIgnoreMouseEvents(!0, { forward: !0 })), U?.suspendVideoOverlay();
}
function Ot() {
	if (!L || L.isDestroyed() || L.isMinimized() || !L.isVisible()) return !1;
	if (L.isFocused()) return !0;
	let e = t.getFocusedWindow();
	return e === R || e === z;
}
function q() {
	let e = () => {
		if (Ot()) {
			t.getFocusedWindow() === z && R && !R.isDestroyed() && (R.setAlwaysOnTop(!1), R.hide(), R.webContents.send("controls:suspended-relayed"));
			return;
		}
		K();
	};
	setTimeout(e, 50), setTimeout(e, 200);
}
var kt = null;
function At() {
	kt ||= setInterval(() => {
		!R || R.isDestroyed() || !R.isVisible() || Ot() || K();
	}, 300);
}
function J() {
	!L || L.isDestroyed() || L.isMinimized() || !L.isVisible() || !L.isFocused() || (U?.resumeVideoOverlay(), W && R && !R.isDestroyed() && (R.setAlwaysOnTop(!0, "pop-up-menu"), R.showInactive(), R.setIgnoreMouseEvents(!0, { forward: !0 }), U?.raiseControlsOverlay(), L.webContents.send("controls:request-state-relayed")));
}
var Y = null;
function jt() {
	return u.join(r.getPath("userData"), "settings.json");
}
function Mt() {
	return u.join(r.getPath("userData"), "memory.json");
}
async function X(e) {
	return Y = e, await l.mkdir(r.getPath("userData"), { recursive: !0 }), await l.writeFile(jt(), `${JSON.stringify({
		settings: e.settings,
		memory: e.memory
	}, null, 2)}\n`, "utf8"), e;
}
async function Z() {
	if (Y) return Y;
	let e = null;
	try {
		e = JSON.parse(await l.readFile(jt(), "utf8"));
	} catch {
		e = null;
	}
	if (e && typeof e == "object" && ("settings" in e || "memory" in e)) {
		let t = e, n = {
			settings: C(t.settings),
			memory: await x(t.memory)
		};
		return Y = n, n;
	}
	let t = e ? C(e) : S, n;
	try {
		n = await x(JSON.parse(await l.readFile(Mt(), "utf8")));
	} catch {
		n = await x(be);
	}
	let r = await X({
		settings: t,
		memory: n
	});
	try {
		await l.unlink(Mt());
	} catch {}
	return r;
}
async function Q() {
	return (await Z()).memory.lastOpenDirectory;
}
function Nt() {
	a.handle("vlc:load", async (e, t) => U ? U.loadIfNeeded(t) : {
		ok: !1,
		error: "VLC player is not ready",
		reloaded: !0
	}), a.handle("vlc:play", async () => {
		U?.play();
	}), a.handle("vlc:pause", async () => {
		U?.pause();
	}), a.handle("vlc:stop", async () => {
		U?.stop();
	}), a.handle("vlc:seek", async (e, t) => {
		U?.seek(t);
	}), a.handle("vlc:set-volume", async (e, t) => {
		U?.setVolume(t);
	}), a.handle("vlc:set-volume-muted", async (e, t) => {
		U?.setVolumeMuted(t);
	}), a.handle("vlc:set-rate", async (e, t) => {
		U?.setRate(t);
	}), a.handle("vlc:set-audio-effects", async (e, t) => {
		U?.setAudioEffects(t);
	}), a.handle("vlc:set-video-effects", async (e, t) => {
		U?.setVideoEffects(t);
	}), a.handle("vlc:set-video-visible", async (e, t) => {
		U?.setVideoVisible(t);
	}), a.handle("vlc:suspend-video-overlay", async () => {
		U?.suspendVideoOverlay();
	}), a.handle("vlc:resume-video-overlay", async () => {
		U?.resumeVideoOverlay();
	}), a.handle("vlc:set-viewport", async (e, t) => {
		U?.setViewport(t);
	}), a.on("vlc:set-viewport-sync", (e, t) => {
		U?.setViewport(t);
	}), a.handle("vlc:hide-video-overlay", async () => {
		U?.hideVideoOverlay();
	}), a.on("vlc:hide-video-overlay-sync", () => {
		U?.hideVideoOverlay();
	}), a.handle("vlc:prioritize-ui-overlay", async () => U ? U.prioritizeUiOverlay() : null), a.handle("vlc:release-ui-overlay", async () => {
		U?.releaseUiOverlay();
	}), a.handle("vlc:start-recording", async (e, t) => U ? U.startRecording(t) : {
		ok: !1,
		error: "VLC player is not ready"
	}), a.handle("vlc:stop-recording", async () => {
		U?.stopRecording();
	}), a.handle("vlc:get-state", async () => U?.getState() ?? {
		playing: !1,
		paused: !1,
		ended: !1,
		currentTimeMs: 0,
		durationMs: 0
	});
}
function Pt() {
	a.handle("media-probe:metadata", async (e, t) => {
		try {
			return await P().extractMetadata(t);
		} catch (e) {
			return console.warn("media-probe:metadata failed:", e), null;
		}
	}), a.handle("media-probe:tracks", async (e, t) => {
		try {
			return await P().extractTracks(t);
		} catch (e) {
			return console.warn("media-probe:tracks failed:", e), [];
		}
	}), a.handle("media-probe:thumbnail", async (e, t, n) => {
		try {
			return await P().extractThumbnail(t, n ?? {});
		} catch (e) {
			return console.warn("media-probe:thumbnail failed:", e), null;
		}
	});
}
function Ft() {
	let e = process.platform === "win32" ? [
		"public/icon.ico",
		"public/logo.png",
		"dist/logo.png"
	] : [
		"public/logo.png",
		"public/icon.ico",
		"dist/logo.png"
	], t = [r.getAppPath(), u.join(F, "..")];
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
function It(e) {
	try {
		U?.destroy(), U = new $e(), U.attachParent(e), U.setOnEnded(() => {
			L?.webContents.send("vlc:ended");
		});
	} catch (e) {
		console.error("Failed to initialize libVLC:", e), U = null;
	}
}
function Lt() {
	L = new t({
		width: 1280,
		height: 800,
		minWidth: 960,
		minHeight: 600,
		show: !1,
		icon: Ft(),
		backgroundColor: "#0b1020",
		webPreferences: {
			preload: u.join(F, "preload.cjs"),
			contextIsolation: !0,
			nodeIntegration: !1,
			sandbox: !1,
			backgroundThrottling: !1
		}
	}), L.once("ready-to-show", () => {
		L?.show();
	}), L.loadFile(I), It(L), L.on("blur", q), L.on("focus", J), L.on("hide", q), L.on("show", J), L.on("minimize", () => {
		K();
	}), L.on("restore", J), Tt && L.webContents.openDevTools({ mode: "detach" }), L.on("closed", () => {
		R && !R.isDestroyed() && R.destroy(), R = null, z && !z.isDestroyed() && z.destroy(), z = null, U?.destroy(), U = null, L = null;
	});
}
function Rt() {
	return !L || L.isDestroyed() ? null : R && !R.isDestroyed() ? R : (R = new t({
		parent: L,
		frame: !1,
		transparent: !0,
		show: !1,
		skipTaskbar: !0,
		resizable: !1,
		movable: !1,
		minimizable: !1,
		maximizable: !1,
		focusable: !1,
		minWidth: 1,
		minHeight: 1,
		hasShadow: !1,
		backgroundColor: "#00000000",
		webPreferences: {
			preload: u.join(F, "preload.cjs"),
			contextIsolation: !0,
			nodeIntegration: !1,
			sandbox: !1,
			backgroundThrottling: !1
		}
	}), R.setIgnoreMouseEvents(!0, { forward: !0 }), R.setAlwaysOnTop(!0, "pop-up-menu"), R.loadFile(I, { hash: "/controls-overlay" }), U?.setControlsOverlayWindow(R), R.on("closed", () => {
		U?.setControlsOverlayWindow(null), R = null;
	}), R);
}
function zt() {
	return !L || L.isDestroyed() ? null : z && !z.isDestroyed() ? z : (z = new t({
		parent: L,
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
			preload: u.join(F, "preload.cjs"),
			contextIsolation: !0,
			nodeIntegration: !1,
			sandbox: !1,
			backgroundThrottling: !1
		}
	}), z.setIgnoreMouseEvents(!0, { forward: !0 }), z.setAlwaysOnTop(!0, "screen-saver"), z.loadFile(I, { hash: "/files-menu-overlay" }), U?.setFilesMenuOverlayWindow(z), z.webContents.on("did-start-loading", () => {
		B = !1;
	}), z.on("closed", () => {
		U?.setFilesMenuOverlayWindow(null), z = null;
	}), z);
}
function Bt() {
	!Tt || H || (H = c.watch(I, () => {
		L?.webContents.reload(), R && !R.isDestroyed() && R.webContents.reload(), z && !z.isDestroyed() && z.webContents.reload();
	}));
}
a.handle("settings:get", async () => (await Z()).settings);
function Vt(e) {
	for (let t of [
		L,
		R,
		z
	]) t && !t.isDestroyed() && t.webContents.send("settings:changed-relayed", e);
}
a.handle("settings:save", async (e, t) => {
	let n = await Z(), r = C(t);
	return await X({
		...n,
		settings: r
	}), Vt(r), r;
}), a.handle("memory:get", async () => Se((await Z()).memory)), a.handle("memory:save", async (e, t) => {
	let n = await Z(), r = await x(t);
	return await X({
		...n,
		memory: r
	}), r;
});
function $() {
	if (!z || z.isDestroyed()) {
		V = !1;
		return;
	}
	V = !1, z.webContents.send("files-menu:show-relayed", Et), U?.raiseFilesMenuOverlay();
}
a.on("files-menu:ready", () => {
	B = !0, V && $();
}), a.on("files-menu:show", (e, t, n) => {
	let r = zt();
	if (!r || !L || L.isDestroyed()) return;
	Et = n ?? null;
	let i = L.getContentBounds();
	if (r.setBounds({
		x: Math.round(i.x + t.x),
		y: Math.round(i.y + t.y),
		width: Math.max(1, Math.round(t.width)),
		height: Math.max(1, Math.round(t.height))
	}), r.setIgnoreMouseEvents(!1), r.isVisible() || r.showInactive(), V = !0, B && !r.webContents.isLoading()) {
		$();
		return;
	}
	r.webContents.isLoading() && r.webContents.once("did-finish-load", () => {
		B && $();
	});
}), a.on("files-menu:hide", () => {
	V = !1, z && !z.isDestroyed() && (z.webContents.send("files-menu:hide-relayed"), z.hide(), z.setIgnoreMouseEvents(!0, { forward: !0 }));
}), a.on("files-menu:action", (e, t) => {
	L && !L.isDestroyed() && L.webContents.send("files-menu:action-relayed", t), V = !1, z && !z.isDestroyed() && (z.webContents.send("files-menu:hide-relayed"), z.hide(), z.setIgnoreMouseEvents(!0, { forward: !0 }));
}), a.on("files-menu:select", (e, t) => {
	L && !L.isDestroyed() && L.webContents.send("files-menu:select-relayed", t);
}), a.on("files-menu:close", () => {
	L && !L.isDestroyed() && L.webContents.send("files-menu:close-relayed"), V = !1, z && !z.isDestroyed() && (z.webContents.send("files-menu:hide-relayed"), z.hide(), z.setIgnoreMouseEvents(!0, { forward: !0 }));
}), a.on("controls:set-bounds", (e, t) => {
	let n = Rt();
	if (!n || !L || L.isDestroyed()) return;
	W = !0;
	let r = L.getContentBounds();
	n.setBounds({
		x: Math.round(r.x + t.x),
		y: Math.round(r.y + t.y),
		width: Math.max(1, Math.round(t.width)),
		height: Math.max(1, Math.round(t.height))
	}), L.isFocused() && (n.isVisible() || (n.showInactive(), n.setIgnoreMouseEvents(!0, { forward: !0 }), n.webContents.send("controls:suspended-relayed")), U?.raiseControlsOverlay());
});
function Ht() {
	if (!R || R.isDestroyed() || !R.isVisible()) return !1;
	let e = s.getCursorScreenPoint(), t = R.getBounds();
	return e.x >= t.x && e.x <= t.x + t.width && e.y >= t.y && e.y <= t.y + t.height;
}
a.handle("controls:cursor-over", () => Ht()), a.on("controls:raise", () => {
	U?.raiseControlsOverlay();
}), a.on("controls:hide", () => {
	W = !1, R && !R.isDestroyed() && (R.hide(), R.webContents.send("controls:suspended-relayed"));
}), a.on("controls:set-interactive", (e, t) => {
	!R || R.isDestroyed() || (t ? (R.setIgnoreMouseEvents(!1), U?.raiseControlsOverlay()) : (R.setIgnoreMouseEvents(!0, { forward: !0 }), U?.raiseControlsOverlay()));
}), a.on("controls:state", (e, t) => {
	R && !R.isDestroyed() && (R.webContents.send("controls:state-relayed", t), R.isVisible() && U?.raiseControlsOverlay());
}), a.on("controls:action", (e, t) => {
	L && !L.isDestroyed() && L.webContents.send("controls:action-relayed", t);
}), a.on("controls:ready", () => {
	L && !L.isDestroyed() && L.webContents.send("controls:request-state-relayed");
}), a.handle("files:openSingle", async (e, t) => {
	if (!v(t) || !L || L.isDestroyed()) return null;
	let n = await Q();
	return G(() => ie(L, t, n));
}), a.handle("files:openMultiple", async (e, t) => {
	if (!v(t) || !L || L.isDestroyed()) return [];
	let n = await Q();
	return G(() => ae(L, t, n));
}), a.handle("files:openFolder", async (e, t) => {
	if (!v(t) || !L || L.isDestroyed()) return [];
	let n = await Q();
	return G(() => oe(L, t, n));
}), a.handle("recording:choose-path", async (e, t, n) => {
	if (!L || L.isDestroyed() || typeof t != "string" || typeof n != "string") return null;
	let r = u.extname(n).replace(".", ""), a = u.extname(t).replace(".", ""), o = r || a, s = u.join(u.dirname(t), n);
	return G(async () => {
		let e = await i.showSaveDialog(L, {
			defaultPath: s,
			filters: o ? [{
				name: o.toUpperCase(),
				extensions: [o]
			}] : void 0
		});
		return e.canceled || !e.filePath ? null : e.filePath;
	});
}), r.whenReady().then(() => {
	n.setApplicationMenu(null), At(), r.on("browser-window-blur", (e, t) => {
		t === L && q();
	}), Nt(), Pt(), Lt(), Bt(), r.on("activate", () => {
		t.getAllWindows().length === 0 && Lt();
	});
}), r.on("window-all-closed", () => {
	H?.close(), H = null, process.platform !== "darwin" && r.quit();
}), r.on("before-quit", () => {
	U?.destroy(), U = null;
});
//#endregion
export {};
