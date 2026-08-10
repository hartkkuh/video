import { createRequire as e } from "node:module";
import { BrowserWindow as t, Menu as n, app as r, dialog as i, ipcMain as a, nativeImage as o, net as s, screen as c, shell as l } from "electron";
import u from "node:https";
import { URL as d, fileURLToPath as f } from "node:url";
import p from "node:fs";
import m from "node:fs/promises";
import h from "node:path";
//#region shared/updates.ts
function g(e, t) {
	let n = v(e), r = v(t), i = Math.max(n.length, r.length);
	for (let e = 0; e < i; e += 1) {
		let t = n[e] ?? 0, i = r[e] ?? 0;
		if (t > i) return 1;
		if (t < i) return -1;
	}
	return 0;
}
function _(e) {
	return e.trim().replace(/^v/i, "");
}
function v(e) {
	let t = _(e);
	return t ? t.split(/[.+_-]/).map((e) => {
		let t = e.match(/^\d+/);
		return t ? Number(t[0]) : 0;
	}) : [0];
}
//#endregion
//#region electron/updates.ts
var y = {
	owner: "hartkkuh",
	name: "video"
}, ee = 12e3;
function te() {
	return r.getVersion();
}
async function ne() {
	let e = te(), t = `https://api.github.com/repos/${y.owner}/${y.name}/releases/latest`;
	try {
		let n = await ie(t, {
			Accept: "application/vnd.github+json",
			"User-Agent": `FMP-Video-Player/${e}`,
			"X-GitHub-Api-Version": "2022-11-28"
		});
		if (n.status === 404) return {
			status: "up-to-date",
			currentVersion: e,
			latestVersion: e
		};
		if (n.status < 200 || n.status >= 300) return {
			status: "error",
			currentVersion: e,
			message: `HTTP ${n.status}`
		};
		let r = JSON.parse(n.body), i = _(String(r.tag_name ?? ""));
		if (!i) return {
			status: "error",
			currentVersion: e,
			message: "Invalid release tag"
		};
		let a = typeof r.html_url == "string" && r.html_url ? r.html_url : `https://github.com/${y.owner}/${y.name}/releases/latest`;
		return g(i, e) <= 0 ? {
			status: "up-to-date",
			currentVersion: e,
			latestVersion: i
		} : {
			status: "available",
			currentVersion: e,
			latestVersion: i,
			releaseNotes: typeof r.body == "string" ? r.body.trim() : "",
			releaseUrl: a,
			downloadUrl: se(r.assets, a)
		};
	} catch (t) {
		return {
			status: "error",
			currentVersion: e,
			message: b(t)
		};
	}
}
async function re(e) {
	return typeof e != "string" || !/^https?:\/\//i.test(e) ? !1 : (await l.openExternal(e), !0);
}
async function ie(e, t) {
	let n = [];
	try {
		return await ae(e, t);
	} catch (e) {
		n.push(`chromium: ${b(e)}`);
	}
	try {
		return await oe(e, t, !0);
	} catch (e) {
		n.push(`node: ${b(e)}`);
	}
	try {
		return await oe(e, t, !1);
	} catch (e) {
		throw n.push(`node-insecure: ${b(e)}`), Error(n.join(" | "));
	}
}
async function ae(e, t) {
	if (!r.isReady()) throw Error("App is not ready");
	let n = await s.fetch(e, {
		method: "GET",
		headers: t,
		redirect: "follow",
		signal: AbortSignal.timeout(ee)
	});
	return {
		status: n.status,
		body: await n.text()
	};
}
function oe(e, t, n) {
	return new Promise((r, i) => {
		let a = new d(e), o = u.request({
			protocol: a.protocol,
			hostname: a.hostname,
			port: a.port || 443,
			path: `${a.pathname}${a.search}`,
			method: "GET",
			headers: t,
			rejectUnauthorized: n,
			timeout: ee
		}, (e) => {
			let t = [];
			e.on("data", (e) => {
				t.push(e);
			}), e.on("end", () => {
				r({
					status: e.statusCode ?? 0,
					body: Buffer.concat(t).toString("utf8")
				});
			});
		});
		o.on("timeout", () => {
			o.destroy(/* @__PURE__ */ Error("Request timed out"));
		}), o.on("error", i), o.end();
	});
}
function b(e) {
	if (!(e instanceof Error)) return "Unknown error";
	let t = [e.message], n = e.cause;
	return n instanceof Error && n.message && n.message !== e.message && t.push(n.message), t.join(": ");
}
function se(e, t) {
	if (!Array.isArray(e) || e.length === 0) return t;
	for (let t of [
		".exe",
		".msi",
		".zip"
	]) {
		let n = e.find((e) => {
			let n = typeof e.name == "string" ? e.name.toLowerCase() : "";
			return !!(typeof e.browser_download_url == "string" && e.browser_download_url) && n.endsWith(t);
		});
		if (n?.browser_download_url) return n.browser_download_url;
	}
	return e.find((e) => typeof e.browser_download_url == "string" && e.browser_download_url)?.browser_download_url ?? t;
}
//#endregion
//#region shared/vlc-media-extensions.ts
var x = /* @__PURE__ */ ".3ga,.669,.a52,.aac,.ac3,.adt,.adts,.aif,.aifc,.aiff,.alac,.amb,.amr,.aob,.ape,.au,.awb,.caf,.dts,.dsf,.dff,.flac,.it,.kar,.m4a,.m4b,.m4p,.m5p,.mid,.mka,.mlp,.mod,.mpa,.mp1,.mp2,.mp3,.mpc,.mpga,.mus,.oga,.ogg,.oma,.opus,.qcp,.ra,.rmi,.s3m,.sid,.spx,.tak,.thd,.tta,.voc,.vqf,.w64,.wav,.wma,.wv,.xa,.xm".split(","), S = /* @__PURE__ */ ".3g2,.3gp,.3gp2,.3gpp,.amrec,.amv,.asf,.avi,.bik,.bin,.crf,.dav,.divx,.drc,.dv,.dvr-ms,.evo,.f4v,.flv,.gvi,.gxf,.iso,.k3g,.m1v,.m2v,.m2t,.m2ts,.m4v,.mkv,.mov,.mp2,.mp2v,.mp4,.mp4v,.mpe,.mpeg,.mpeg1,.mpeg2,.mpeg4,.mpg,.mpv2,.mts,.mtv,.mxf,.mxg,.nsv,.nuv,.ogg,.ogm,.ogv,.ogx,.ps,.qt,.rec,.rm,.rmvb,.rpl,.skm,.thp,.tod,.tp,.ts,.tts,.txd,.vob,.vp6,.vro,.webm,.wm,.wmv,.wtv,.xesc".split(","), ce = /* @__PURE__ */ ".cdg,.idx,.srt,.sub,.utf,.ass,.ssa,.aqt,.jss,.psb,.rt,.sami,.smi,.txt,.smil,.stl,.usf,.dks,.pjs,.mpl2,.mks,.vtt,.tt,.ttml,.dfxp,.scc".split(",");
function le(...e) {
	return [...new Set(e.flat())];
}
var C = {
	audio: x,
	video: S,
	subtitles: ce,
	media: le(x, S)
}, ue = {
	audio: new Set(C.audio),
	video: new Set(C.video),
	subtitles: new Set(C.subtitles),
	media: new Set(C.media)
}, de = {
	audio: "Audio",
	video: "Video",
	subtitles: "Subtitles",
	media: "Audio and Video"
};
function w(e) {
	return e === "audio" || e === "video" || e === "subtitles" || e === "media";
}
function fe(e) {
	let t = C[e].map((e) => e.slice(1));
	return [{
		name: de[e],
		extensions: t
	}];
}
function pe(e, t) {
	let n = h.extname(e).toLowerCase();
	return ue[t].has(n);
}
async function me(e, t) {
	let n = await m.readdir(e, { withFileTypes: !0 }), r = [];
	for (let i of n) {
		if (!i.isFile()) continue;
		let n = h.join(e, i.name);
		pe(n, t) && r.push(n);
	}
	return r.sort((e, t) => e.localeCompare(t));
}
async function he(e, t, n) {
	let r = await i.showOpenDialog(e, {
		properties: ["openFile"],
		filters: fe(t),
		...n ? { defaultPath: n } : {}
	});
	return r.canceled || r.filePaths.length === 0 ? null : r.filePaths[0];
}
async function ge(e, t, n) {
	let r = await i.showOpenDialog(e, {
		properties: ["openFile", "multiSelections"],
		filters: fe(t),
		...n ? { defaultPath: n } : {}
	});
	return r.canceled ? [] : r.filePaths;
}
async function _e(e, t, n) {
	let r = await i.showOpenDialog(e, {
		properties: ["openDirectory"],
		...n ? { defaultPath: n } : {}
	});
	return r.canceled || r.filePaths.length === 0 ? [] : me(r.filePaths[0], t);
}
var T = {
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
({ ...T });
function ve(e) {
	return e === "all" || e === "one" ? e : "off";
}
function ye(e) {
	return e === "video" ? "video" : "audio";
}
function be(e) {
	return e === "encoding" ? "encoding" : "file";
}
function xe(e) {
	return Array.isArray(e) ? e.filter((e) => typeof e == "string" && e.length > 0) : [];
}
function Se(e) {
	return typeof e != "number" || !Number.isFinite(e) ? T.volume : Math.min(2, Math.max(0, e));
}
function Ce(e) {
	return typeof e != "number" || !Number.isFinite(e) ? T.playbackRate : Math.min(2, Math.max(.25, e));
}
function we(e, t) {
	return typeof e != "number" || !Number.isFinite(e) || t === 0 ? 0 : Math.min(Math.max(0, Math.floor(e)), t - 1);
}
function Te(e) {
	return typeof e == "string" ? e : "";
}
function E(e, t, n, r) {
	return typeof e != "number" || !Number.isFinite(e) ? r : Math.min(n, Math.max(t, e));
}
function Ee(e) {
	let t = typeof e == "object" && e ? e : {}, n = Array.isArray(t.bands) ? t.bands : [];
	return {
		bands: Array.from({ length: 10 }, (e, t) => E(n[t], -12, 12, 0)),
		outputGain: E(t.outputGain, .5, 2, 1)
	};
}
function De(e) {
	let t = typeof e == "object" && e ? e : {};
	return {
		grayscale: E(t.grayscale, 0, 100, 0),
		contrast: E(t.contrast, 0, 3, 1),
		brightness: E(t.brightness, 0, 3, 1),
		saturation: E(t.saturation, 0, 3, 1),
		sepia: E(t.sepia, 0, 100, 0),
		hue: E(t.hue, 0, 360, 0),
		gamma: E(t.gamma, .01, 10, 1),
		blur: E(t.blur, 0, 10, 0)
	};
}
function Oe(e) {
	let t = e.replace(/\\/g, "/"), n = t.lastIndexOf("/");
	return n < 0 ? "" : e.slice(0, e.length - (t.length - n));
}
function ke(e) {
	let t = Te(e.lastOpenDirectory);
	if (t.length > 0) return t;
	let n = xe(e.filePaths);
	return n.length === 0 ? "" : Oe(n[we(e.currentIndex, n.length)] ?? n[n.length - 1]);
}
function Ae(e) {
	if (typeof e != "object" || !e) return T;
	let t = e;
	return {
		volume: Se(t.volume),
		volumeMuted: t.volumeMuted === !0,
		playbackRate: Ce(t.playbackRate),
		repeatMode: ve(t.repeatMode),
		shuffleEnabled: t.shuffleEnabled === !0,
		lastOpenDirectory: ke(t),
		lastEffectsTab: ye(t.lastEffectsTab),
		lastMediaTab: be(t.lastMediaTab),
		audioEffects: Ee(t.audioEffects),
		videoEffects: De(t.videoEffects)
	};
}
//#endregion
//#region electron/memory.ts
var je = T;
async function Me(e) {
	if (!e) return !1;
	try {
		return (await m.stat(e)).isDirectory();
	} catch {
		return !1;
	}
}
async function D(e) {
	let t = Ae(e);
	return !t.lastOpenDirectory || await Me(t.lastOpenDirectory) ? t : {
		...t,
		lastOpenDirectory: ""
	};
}
function Ne(e) {
	return {
		...e,
		filePaths: [],
		currentIndex: 0
	};
}
//#endregion
//#region electron/settings.ts
var O = {
	language: "he",
	theme: "dark",
	controlsPosition: "bottom"
};
function Pe(e) {
	return e === "en" || e === "he" ? e : O.language;
}
function Fe(e) {
	return e === "light" ? "light" : "dark";
}
function Ie(e) {
	return e === "top" ? "top" : O.controlsPosition;
}
function k(e) {
	if (typeof e != "object" || !e) return O;
	let t = e;
	return {
		language: Pe(t.language),
		theme: Fe(t.theme),
		controlsPosition: Ie(t.controlsPosition)
	};
}
//#endregion
//#region electron/libvlc-path.ts
function Le() {
	return r.isPackaged ? h.join(process.resourcesPath, "libvlc") : h.join(r.getAppPath(), "libvlc");
}
//#endregion
//#region electron/vlc-effects.ts
var Re = {
	grayscale: 0,
	contrast: 1,
	brightness: 1,
	saturation: 1,
	sepia: 0,
	hue: 0,
	gamma: 1,
	blur: 0
};
function A(e) {
	return e.bands.every((e) => Math.abs(e) < .01) && Math.abs(e.outputGain - 1) < .01;
}
function ze(e) {
	return e.grayscale === 0 && Math.abs(e.contrast - 1) < .01 && Math.abs(e.brightness - 1) < .01 && Math.abs(e.saturation - 1) < .01 && e.sepia === 0 && Math.abs(e.hue) < .01 && Math.abs(e.gamma - 1) < .01 && e.blur === 0;
}
function Be(e) {
	return 20 * Math.log10(Math.min(2, Math.max(.5, e)));
}
function Ve(e) {
	return Math.abs(e) <= 180 ? e : e - 360;
}
function He(e) {
	let t = 1 - e.grayscale / 100, n = e.sepia / 100;
	return {
		enabled: !ze(e),
		brightness: e.brightness * (1 + n * .06),
		contrast: e.contrast * (1 + n * .08),
		saturation: e.saturation * t * (1 - n * .45),
		hue: Ve(e.hue + n * 55),
		gamma: e.gamma * (1 - n * .04)
	};
}
function Ue(e) {
	return e.blur > 0;
}
function We(e) {
	return e.blur <= 0 ? [] : [":video-filter=gaussianblur", `:gaussianblur-sigma=${Math.max(.1, e.blur).toFixed(2)}`];
}
//#endregion
//#region electron/win32-api.ts
var Ge = e(import.meta.url)("koffi");
function j(e) {
	return e.length >= 8 ? e.readBigInt64LE(0) : BigInt(e.readUInt32LE(0));
}
function Ke(e) {
	return Number(j(e));
}
var qe = class {
	setWindowPos;
	moveWindow;
	showWindow;
	isWindow;
	bringWindowToTop;
	constructor() {
		let e = Ge.load("user32.dll");
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
}, Je = null;
function Ye() {
	return process.platform === "win32" ? (Je ||= new qe(), Je) : null;
}
//#endregion
//#region electron/vlc-player.ts
var Xe = e(import.meta.url)("koffi"), Ze = 3, M = 4, N = 6, Qe = 1.5, $e = 200, et = {
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
}, tt = new Set(S);
function nt(e) {
	return tt.has(h.extname(e).toLowerCase());
}
function rt(e) {
	return et[h.extname(e).toLowerCase()] ?? null;
}
function it(e, t) {
	let n = e.replace(/\\/g, "/").replace(/["']/g, ""), r = nt(t), i = [
		":vout=dummy",
		":aout=dummy",
		":no-video-title-show"
	];
	if (r) return [
		...i,
		`:sout=#transcode{vcodec=h264,venc=x264{preset=ultrafast},acodec=mp4a,ab=192,channels=2,samplerate=44100}:duplicate{dst=display,dst=std{access=file,mux=mp4,dst='${n}'}}`,
		":sout-all"
	];
	let a = rt(e), o = a && a !== "raw" ? `std{access=file,mux=${a},dst='${n}'}` : `std{access=file,dst='${n}'}`;
	return [
		...i,
		`:sout=#duplicate{dst=display,dst=${o}}`,
		":sout-all"
	];
}
var at = 0, ot = 1, st = 2, ct = 3, lt = 4, ut = 5, dt = class {
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
	activeVideoEffects = { ...Re };
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
	win32 = Ye();
	parentGeometryHandler = null;
	parentMinimizeHandler = null;
	parentRestoreHandler = null;
	controlsOverlayWindow = null;
	filesMenuOverlayWindow = null;
	constructor() {
		let e = Le();
		process.env.VLC_PLUGIN_PATH = h.join(e, "plugins"), process.env.PATH = `${e}${h.delimiter}${process.env.PATH ?? ""}`;
		let t = Xe.load(h.join(e, "libvlc.dll"));
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
			if (Ue(t) || Ue(e)) {
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
			for (let t of it(e, this.currentFilePath)) this.libvlc_media_add_option(n, t);
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
			return (a === M || a === N) && this.libvlc_media_player_set_pause(r, 1), this.recordingInstance = t, this.recordingPlayer = r, this.recordingMedia = n, this.recordingPath = e, this.pendingRate > 0 && this.pendingRate !== 1 && this.libvlc_media_player_set_rate(r, this.pendingRate), { ok: !0 };
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
				(e === M || e === N) && this.libvlc_media_player_set_pause(this.recordingPlayer, 1);
				return;
			}
			this.libvlc_media_player_set_pause(this.recordingPlayer, 0);
		}
	}
	isRecording() {
		return this.recordingPath !== null;
	}
	getState() {
		let e = this.libvlc_media_player_get_state(this.mediaPlayer), t = Math.max(0, Number(this.libvlc_media_player_get_time(this.mediaPlayer))), n = Math.max(0, Number(this.libvlc_media_player_get_length(this.mediaPlayer))), r = e === Ze, i = e === M, a = e === N;
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
		this.pendingAudioEffects && !A(this.pendingAudioEffects) && this.applyAudioEffects(this.pendingAudioEffects);
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
		this.libvlc_audio_set_volume(this.mediaPlayer, $e), this.applyVolumeBoostEqualizer(e);
	}
	uiVolumeToLibVlcVolume(e) {
		return Math.min($e, Math.round(e * 100 * Qe));
	}
	clearVolumeBoostEqualizer() {
		(!this.pendingAudioEffects || A(this.pendingAudioEffects)) && this.libvlc_media_player_set_equalizer(this.mediaPlayer, null);
	}
	applyVolumeBoostEqualizer(e) {
		let t = Math.min(20, Math.max(-20, 20 * Math.log10(e) + 6.02));
		this.equalizer ||= this.libvlc_audio_equalizer_new(), this.libvlc_audio_equalizer_set_preamp(this.equalizer, t);
		for (let e = 0; e < 10; e += 1) this.libvlc_audio_equalizer_set_amp_at_index(this.equalizer, 0, e);
		this.libvlc_media_player_set_equalizer(this.mediaPlayer, this.equalizer);
	}
	applyAudioEffects(e) {
		if (A(e)) {
			this.libvlc_media_player_set_equalizer(this.mediaPlayer, null);
			return;
		}
		if (this.equalizer ||= this.libvlc_audio_equalizer_new(), this.equalizer) {
			this.libvlc_audio_equalizer_set_preamp(this.equalizer, Be(e.outputGain));
			for (let t = 0; t < 10; t += 1) {
				let n = e.bands[t] ?? 0;
				this.libvlc_audio_equalizer_set_amp_at_index(this.equalizer, n, t);
			}
			this.libvlc_media_player_set_equalizer(this.mediaPlayer, this.equalizer);
		}
	}
	applyVideoAdjust(e) {
		let t = He(e);
		this.libvlc_video_set_adjust_int(this.mediaPlayer, at, +!!t.enabled), t.enabled && (this.libvlc_video_set_adjust_float(this.mediaPlayer, st, t.brightness), this.libvlc_video_set_adjust_float(this.mediaPlayer, ot, t.contrast), this.libvlc_video_set_adjust_float(this.mediaPlayer, lt, t.saturation), this.libvlc_video_set_adjust_float(this.mediaPlayer, ct, t.hue), this.libvlc_video_set_adjust_float(this.mediaPlayer, ut, t.gamma));
	}
	createMedia(e, t) {
		let n = this.libvlc_media_new_path(this.instance, e);
		if (!n) return null;
		for (let e of We(t)) this.libvlc_media_add_option(n, e);
		return n;
	}
	reloadMediaPreservePosition() {
		if (!this.currentFilePath || !this.mediaLoaded) return;
		let e = Math.max(0, Number(this.libvlc_media_player_get_time(this.mediaPlayer))), t = this.libvlc_media_player_get_state(this.mediaPlayer), n = t === Ze || t === M;
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
		let s = this.ensureVideoWindow();
		if (!s) return;
		let l = !s.isVisible();
		if (process.platform === "win32" && this.win32) {
			let e = c.dipToScreenRect(this.parentWindow, {
				x: n,
				y: r,
				width: i,
				height: a
			}), t = Ke(s.getNativeWindowHandle());
			this.win32.positionWindow(t, e.x, e.y, e.width, e.height, l);
		} else s.setBounds({
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
			let e = s.getNativeWindowHandle();
			this.libvlc_media_player_set_hwnd(this.mediaPlayer, j(e)), process.platform !== "win32" && s.showInactive(), this.applyPendingEffects(), this.sendVideoWindowAboveUi();
		}
	}
	async takeVideoSnapshot() {
		if (!this.mediaLoaded || !this.mediaPlayer) return null;
		try {
			let e = h.join(r.getPath("temp"), "fmp-media-player", "vlc-menu-preview.png");
			return await m.mkdir(h.dirname(e), { recursive: !0 }), this.libvlc_video_take_snapshot(this.mediaPlayer, 0, e, 0, 0) === 0 ? e : null;
		} catch (e) {
			return console.warn("Failed to capture VLC menu preview:", e), null;
		}
	}
	sendVideoWindowAboveUi() {
		if (!this.win32 || !this.videoWindow || this.videoWindow.isDestroyed()) return;
		let e = Ke(this.videoWindow.getNativeWindowHandle());
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
			this.libvlc_media_player_set_hwnd(this.mediaPlayer, j(e));
		}
		return this.videoWindow;
	}
	hideVideoWindow() {
		this.lastAppliedScreenBounds = null, this.videoWindow && !this.videoWindow.isDestroyed() && this.videoWindow.hide();
	}
}, ft = new Set(x);
function pt(e) {
	return ft.has(h.extname(e).toLowerCase());
}
function mt(e, t) {
	return (e[t] & 127) << 21 | (e[t + 1] & 127) << 14 | (e[t + 2] & 127) << 7 | e[t + 3] & 127;
}
function ht(e) {
	if (e.length < 10 || e.toString("ascii", 0, 3) !== "ID3") return null;
	let t = e[3], n = mt(e, 6), r = 10, i = Math.min(e.length, 10 + n);
	for (; r < i;) {
		let n, a, o;
		if (t === 2) {
			if (r + 6 > i) break;
			n = e.toString("ascii", r, r + 3), a = e[r + 3] << 16 | e[r + 4] << 8 | e[r + 5], o = r + 6;
		} else {
			if (r + 10 > i) break;
			n = e.toString("ascii", r, r + 4).replace(/\0/g, ""), a = t === 4 ? mt(e, r + 4) : e.readUInt32BE(r + 4), o = r + 10;
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
function gt(e) {
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
function _t(e) {
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
function vt(e) {
	return gt(e);
}
function yt(e, t) {
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
async function bt(e, t = 320) {
	if (!pt(e)) return null;
	try {
		let n = await m.readFile(e), r = h.extname(e).toLowerCase(), i = null;
		return i = r === ".mp3" || r === ".mp2" || r === ".mp1" || r === ".mpga" ? ht(n) : r === ".flac" ? _t(n) : r === ".m4a" || r === ".m4b" || r === ".m4p" || r === ".mp4" ? vt(n) : ht(n), i ? yt(i, t) : null;
	} catch {
		return null;
	}
}
async function xt(e, t = 320) {
	if (!e) return null;
	let n = e;
	if (n.startsWith("file://")) try {
		n = decodeURIComponent(new URL(n).pathname), process.platform === "win32" && n.startsWith("/") && (n = n.slice(1));
	} catch {
		return null;
	}
	if (!h.isAbsolute(n)) return null;
	try {
		return yt(await m.readFile(n), t);
	} catch {
		return null;
	}
}
//#endregion
//#region electron/media-probe.ts
var P = e(import.meta.url)("koffi"), St = 3, Ct = 7, wt = 0, Tt = 2, Et = 3, Dt = 4, Ot = 0, kt = 1, At = 2, F = {
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
}, jt = P.struct({
	i_channels: "uint",
	i_rate: "uint"
}), Mt = P.struct({
	i_height: "uint",
	i_width: "uint",
	i_sar_num: "uint",
	i_sar_den: "uint",
	i_frame_rate_num: "uint",
	i_frame_rate_den: "uint"
}), Nt = P.struct({ psz_encoding: "str" }), Pt = P.struct({
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
function I(e) {
	return new Promise((t) => setTimeout(t, e));
}
function L(e) {
	if (!e) return null;
	let t = [
		e & 255,
		e >>> 8 & 255,
		e >>> 16 & 255,
		e >>> 24 & 255
	].map((e) => e >= 32 && e < 127 ? String.fromCharCode(e) : "").join("").trim();
	return t.length ? t : null;
}
function R(e) {
	if (typeof e != "string") return null;
	let t = e.trim();
	return t.length ? t : null;
}
function Ft(e, t, n) {
	return Number.isFinite(e) ? Math.min(n, Math.max(t, e)) : t;
}
var It = class {
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
		let e = Le();
		process.env.VLC_PLUGIN_PATH = h.join(e, "plugins"), process.env.PATH = `${e}${h.delimiter}${process.env.PATH ?? ""}`;
		let t = P.load(h.join(e, "libvlc.dll"));
		this.libvlc_new = t.func("libvlc_new", "void *", ["int", "void *"]), this.libvlc_release = t.func("libvlc_release", "void", ["void *"]), this.libvlc_media_new_path = t.func("libvlc_media_new_path", "void *", ["void *", "str"]), this.libvlc_media_add_option = t.func("libvlc_media_add_option", "void", ["void *", "str"]), this.libvlc_media_release = t.func("libvlc_media_release", "void", ["void *"]), this.libvlc_media_parse_with_options = t.func("libvlc_media_parse_with_options", "int", [
			"void *",
			"int",
			"int"
		]), this.libvlc_media_get_parsed_status = t.func("libvlc_media_get_parsed_status", "int", ["void *"]), this.libvlc_media_get_meta = t.func("libvlc_media_get_meta", "void *", ["void *", "int"]), this.libvlc_media_get_duration = t.func("libvlc_media_get_duration", "int64", ["void *"]), this.libvlc_media_tracks_get = t.func("libvlc_media_tracks_get", "uint", ["void *", P.out(P.pointer("void *"))]), this.libvlc_media_tracks_release = t.func("libvlc_media_tracks_release", "void", ["void *", "uint"]), this.libvlc_free = t.func("libvlc_free", "void", ["void *"]), this.libvlc_media_player_new = t.func("libvlc_media_player_new", "void *", ["void *"]), this.libvlc_media_player_release = t.func("libvlc_media_player_release", "void", ["void *"]), this.libvlc_media_player_set_media = t.func("libvlc_media_player_set_media", "void", ["void *", "void *"]), this.libvlc_media_player_set_hwnd = t.func("libvlc_media_player_set_hwnd", "void", ["void *", "int64"]), this.libvlc_media_player_play = t.func("libvlc_media_player_play", "int", ["void *"]), this.libvlc_media_player_stop = t.func("libvlc_media_player_stop", "void", ["void *"]), this.libvlc_media_player_set_time = t.func("libvlc_media_player_set_time", "void", ["void *", "int64"]), this.libvlc_media_player_get_length = t.func("libvlc_media_player_get_length", "int64", ["void *"]), this.libvlc_media_player_get_state = t.func("libvlc_media_player_get_state", "int", ["void *"]), this.libvlc_audio_set_volume = t.func("libvlc_audio_set_volume", "int", ["void *", "int"]), this.libvlc_video_take_snapshot = t.func("libvlc_video_take_snapshot", "int", [
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
				title: this.getMeta(t, F.title),
				artist: this.getMeta(t, F.artist),
				album: this.getMeta(t, F.album),
				albumArtist: this.getMeta(t, F.albumArtist),
				genre: this.getMeta(t, F.genre),
				description: this.getMeta(t, F.description),
				date: this.getMeta(t, F.date),
				trackNumber: this.getMeta(t, F.trackNumber),
				trackTotal: this.getMeta(t, F.trackTotal),
				discNumber: this.getMeta(t, F.discNumber),
				copyright: this.getMeta(t, F.copyright),
				publisher: this.getMeta(t, F.publisher),
				encodedBy: this.getMeta(t, F.encodedBy),
				language: this.getMeta(t, F.language),
				nowPlaying: this.getMeta(t, F.nowPlaying),
				showName: this.getMeta(t, F.showName),
				season: this.getMeta(t, F.season),
				episode: this.getMeta(t, F.episode),
				director: this.getMeta(t, F.director),
				actors: this.getMeta(t, F.actors),
				rating: this.getMeta(t, F.rating),
				url: this.getMeta(t, F.url),
				artworkUrl: this.getMeta(t, F.artworkUrl),
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
		let n = Math.round(Ft(t.width ?? 320, 16, 1920)), r = this.libvlc_media_new_path(this.instance, e);
		if (!r) return null;
		try {
			await this.parseMedia(r);
			let i = await xt(this.getMeta(r, F.artworkUrl), n);
			if (i) return {
				filePath: e,
				...i
			};
			let a = await bt(e, n);
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
			let l = j(c.getNativeWindowHandle());
			if (this.libvlc_media_player_set_hwnd(s, l), c.showInactive(), this.libvlc_audio_set_volume(s, 0), this.libvlc_media_player_play(s) !== 0 || !await this.waitForPlaying(s, 5e3)) return null;
			let u = Math.max(0, Number(this.libvlc_media_player_get_length(s))), d = typeof a.timeMs == "number" ? Ft(a.timeMs, 0, u > 0 ? u : a.timeMs) : u > 1500 ? Math.min(u - 500, Math.max(1e3, Math.floor(u * .1))) : 0;
			d > 0 && this.libvlc_media_player_set_time(s, d), await I(900);
			let f = h.join(r.getPath("temp"), "fmp-media-player", "probe");
			await m.mkdir(f, { recursive: !0 });
			let p = h.join(f, `thumb-${Date.now()}-${Math.random().toString(36).slice(2)}.png`), g = this.libvlc_video_take_snapshot(s, 0, p, i, 0);
			if (g !== 0 && (await I(500), g = this.libvlc_video_take_snapshot(s, 0, p, i, 0)), g !== 0) return null;
			let _ = o.createFromPath(p);
			if (await m.rm(p, { force: !0 }), _.isEmpty()) return null;
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
		if (this.libvlc_media_parse_with_options(e, wt, 5e3) !== 0) return !1;
		let t = Date.now() + 6e3;
		for (; Date.now() < t;) {
			let t = this.libvlc_media_get_parsed_status(e);
			if (t === Dt) return !0;
			if (t === Tt || t === Et) return !1;
			await I(25);
		}
		return !1;
	}
	getMeta(e, t) {
		let n = this.libvlc_media_get_meta(e, t);
		if (!n) return null;
		try {
			return R(P.decode.string(n));
		} finally {
			this.libvlc_free(n);
		}
	}
	readTracks(e) {
		let t = [null], n = this.libvlc_media_tracks_get(e, t), r = t[0];
		if (!n || !r) return [];
		let i = [];
		try {
			let e = P.decode(r, P.array("void *", n));
			for (let t = 0; t < n; t += 1) {
				let n = e[t];
				if (!n) continue;
				let r = P.decode(n, Pt), a = r.i_type === Ot ? "audio" : r.i_type === kt ? "video" : r.i_type === At ? "subtitle" : "unknown", o = {
					id: r.i_id,
					kind: a,
					codec: L(r.i_codec),
					codecFourcc: L(r.i_codec),
					originalFourcc: L(r.i_original_fourcc),
					bitrate: r.i_bitrate >>> 0,
					profile: r.i_profile,
					level: r.i_level,
					language: R(r.psz_language),
					description: R(r.psz_description)
				};
				if (a === "audio" && r.media) {
					let e = P.decode(r.media, jt);
					o.channels = e.i_channels, o.sampleRate = e.i_rate;
				} else if (a === "video" && r.media) {
					let e = P.decode(r.media, Mt);
					o.width = e.i_width, o.height = e.i_height, o.frameRate = e.i_frame_rate_den ? Math.round(e.i_frame_rate_num / e.i_frame_rate_den * 1e3) / 1e3 : 0, o.sampleAspectRatio = e.i_sar_den ? `${e.i_sar_num}:${e.i_sar_den}` : void 0;
				} else a === "subtitle" && r.media && (o.encoding = R(P.decode(r.media, Nt).psz_encoding));
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
			if (t === St) return !0;
			if (t === Ct) return !1;
			await I(30);
		}
		return !1;
	}
}, Lt = null;
function z() {
	return Lt ||= new It(), Lt;
}
//#endregion
//#region electron/main.ts
var B = h.dirname(f(import.meta.url)), Rt = !r.isPackaged, V = h.join(B, "../dist/index.html"), H = null, U = null, W = null, G = !1, K = !1, zt = null, q = null, J = null, Y = !1;
async function X(e) {
	let t = !!(U && !U.isDestroyed() && U.isVisible()), n = !!(W && !W.isDestroyed() && W.isVisible());
	t && U?.hide(), n && (W?.hide(), W?.setIgnoreMouseEvents(!0, { forward: !0 })), K = !1, J?.suspendVideoOverlay();
	try {
		return H && !H.isDestroyed() && H.focus(), await e();
	} finally {
		J?.resumeVideoOverlay(), Bt(t);
	}
}
function Bt(e) {
	!e || !U || U.isDestroyed() || (Y = !0, !(!H || H.isDestroyed() || !H.isFocused()) && (U.showInactive(), U.setIgnoreMouseEvents(!0, { forward: !0 }), J?.raiseControlsOverlay(), H.webContents.send("controls:request-state-relayed"), H.webContents.send("vlc:parent-geometry-changed")));
}
function Z() {
	U && !U.isDestroyed() && (U.setAlwaysOnTop(!1), U.hide(), U.webContents.send("controls:suspended-relayed")), W && !W.isDestroyed() && (K = !1, W.setAlwaysOnTop(!1), W.webContents.send("files-menu:hide-relayed"), W.hide(), W.setIgnoreMouseEvents(!0, { forward: !0 })), J?.suspendVideoOverlay();
}
function Vt() {
	if (!H || H.isDestroyed() || H.isMinimized() || !H.isVisible()) return !1;
	if (H.isFocused()) return !0;
	let e = t.getFocusedWindow();
	return e === U || e === W;
}
function Ht() {
	let e = () => {
		if (Vt()) {
			t.getFocusedWindow() === W && U && !U.isDestroyed() && (U.setAlwaysOnTop(!1), U.hide(), U.webContents.send("controls:suspended-relayed"));
			return;
		}
		Z();
	};
	setTimeout(e, 50), setTimeout(e, 200);
}
var Ut = null;
function Wt() {
	Ut ||= setInterval(() => {
		!U || U.isDestroyed() || !U.isVisible() || Vt() || Z();
	}, 300);
}
function Gt() {
	!H || H.isDestroyed() || H.isMinimized() || !H.isVisible() || !H.isFocused() || (J?.resumeVideoOverlay(), Y && U && !U.isDestroyed() && (U.setAlwaysOnTop(!0, "pop-up-menu"), U.showInactive(), U.setIgnoreMouseEvents(!0, { forward: !0 }), J?.raiseControlsOverlay(), H.webContents.send("controls:request-state-relayed")));
}
var Q = null;
function Kt() {
	return h.join(r.getPath("userData"), "settings.json");
}
function qt() {
	return h.join(r.getPath("userData"), "memory.json");
}
async function Jt(e) {
	return Q = e, await m.mkdir(r.getPath("userData"), { recursive: !0 }), await m.writeFile(Kt(), `${JSON.stringify({
		settings: e.settings,
		memory: e.memory
	}, null, 2)}\n`, "utf8"), e;
}
async function $() {
	if (Q) return Q;
	let e = null;
	try {
		e = JSON.parse(await m.readFile(Kt(), "utf8"));
	} catch {
		e = null;
	}
	if (e && typeof e == "object" && ("settings" in e || "memory" in e)) {
		let t = e, n = {
			settings: k(t.settings),
			memory: await D(t.memory)
		};
		return Q = n, n;
	}
	let t = e ? k(e) : O, n;
	try {
		n = await D(JSON.parse(await m.readFile(qt(), "utf8")));
	} catch {
		n = await D(je);
	}
	let r = await Jt({
		settings: t,
		memory: n
	});
	try {
		await m.unlink(qt());
	} catch {}
	return r;
}
async function Yt() {
	return (await $()).memory.lastOpenDirectory;
}
function Xt() {
	a.handle("vlc:load", async (e, t) => J ? J.loadIfNeeded(t) : {
		ok: !1,
		error: "VLC player is not ready",
		reloaded: !0
	}), a.handle("vlc:play", async () => {
		J?.play();
	}), a.handle("vlc:pause", async () => {
		J?.pause();
	}), a.handle("vlc:stop", async () => {
		J?.stop();
	}), a.handle("vlc:seek", async (e, t) => {
		J?.seek(t);
	}), a.handle("vlc:set-volume", async (e, t) => {
		J?.setVolume(t);
	}), a.handle("vlc:set-volume-muted", async (e, t) => {
		J?.setVolumeMuted(t);
	}), a.handle("vlc:set-rate", async (e, t) => {
		J?.setRate(t);
	}), a.handle("vlc:set-audio-effects", async (e, t) => {
		J?.setAudioEffects(t);
	}), a.handle("vlc:set-video-effects", async (e, t) => {
		J?.setVideoEffects(t);
	}), a.handle("vlc:set-video-visible", async (e, t) => {
		J?.setVideoVisible(t);
	}), a.handle("vlc:suspend-video-overlay", async () => {
		J?.suspendVideoOverlay();
	}), a.handle("vlc:resume-video-overlay", async () => {
		J?.resumeVideoOverlay();
	}), a.handle("vlc:set-viewport", async (e, t) => {
		J?.setViewport(t);
	}), a.on("vlc:set-viewport-sync", (e, t) => {
		J?.setViewport(t);
	}), a.handle("vlc:hide-video-overlay", async () => {
		J?.hideVideoOverlay();
	}), a.on("vlc:hide-video-overlay-sync", () => {
		J?.hideVideoOverlay();
	}), a.handle("vlc:prioritize-ui-overlay", async () => J ? J.prioritizeUiOverlay() : null), a.handle("vlc:release-ui-overlay", async () => {
		J?.releaseUiOverlay();
	}), a.handle("vlc:start-recording", async (e, t) => J ? J.startRecording(t) : {
		ok: !1,
		error: "VLC player is not ready"
	}), a.handle("vlc:stop-recording", async () => {
		J?.stopRecording();
	}), a.handle("vlc:get-state", async () => J?.getState() ?? {
		playing: !1,
		paused: !1,
		ended: !1,
		currentTimeMs: 0,
		durationMs: 0
	});
}
function Zt() {
	a.handle("media-probe:metadata", async (e, t) => {
		try {
			return await z().extractMetadata(t);
		} catch (e) {
			return console.warn("media-probe:metadata failed:", e), null;
		}
	}), a.handle("media-probe:tracks", async (e, t) => {
		try {
			return await z().extractTracks(t);
		} catch (e) {
			return console.warn("media-probe:tracks failed:", e), [];
		}
	}), a.handle("media-probe:thumbnail", async (e, t, n) => {
		try {
			return await z().extractThumbnail(t, n ?? {});
		} catch (e) {
			return console.warn("media-probe:thumbnail failed:", e), null;
		}
	});
}
function Qt() {
	let e = process.platform === "win32" ? [
		"public/icon.ico",
		"dist/icon.ico",
		"public/logo.png",
		"dist/logo.png",
		"icon.ico",
		"logo.png"
	] : [
		"public/logo.png",
		"dist/logo.png",
		"public/icon.ico",
		"dist/icon.ico",
		"logo.png",
		"icon.ico"
	], t = [
		r.getAppPath(),
		h.join(B, ".."),
		process.resourcesPath
	];
	for (let n of t) for (let t of e) {
		let e = h.join(n, t), r = o.createFromPath(e);
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
function $t(e) {
	try {
		J?.destroy(), J = new dt(), J.attachParent(e), J.setOnEnded(() => {
			H?.webContents.send("vlc:ended");
		});
	} catch (e) {
		console.error("Failed to initialize libVLC:", e), J = null;
	}
}
function en() {
	H = new t({
		width: 1280,
		height: 800,
		minWidth: 960,
		minHeight: 600,
		show: !1,
		icon: Qt(),
		backgroundColor: "#0b1020",
		webPreferences: {
			preload: h.join(B, "preload.cjs"),
			contextIsolation: !0,
			nodeIntegration: !1,
			sandbox: !1,
			backgroundThrottling: !1
		}
	}), H.once("ready-to-show", () => {
		H?.show();
	}), H.loadFile(V), $t(H), H.on("blur", Ht), H.on("focus", Gt), H.on("hide", Ht), H.on("show", Gt), H.on("minimize", () => {
		Z();
	}), H.on("restore", Gt), Rt && H.webContents.openDevTools({ mode: "detach" }), H.on("closed", () => {
		U && !U.isDestroyed() && U.destroy(), U = null, W && !W.isDestroyed() && W.destroy(), W = null, J?.destroy(), J = null, H = null;
	});
}
function tn() {
	return !H || H.isDestroyed() ? null : U && !U.isDestroyed() ? U : (U = new t({
		parent: H,
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
			preload: h.join(B, "preload.cjs"),
			contextIsolation: !0,
			nodeIntegration: !1,
			sandbox: !1,
			backgroundThrottling: !1
		}
	}), U.setIgnoreMouseEvents(!0, { forward: !0 }), U.setAlwaysOnTop(!0, "pop-up-menu"), U.loadFile(V, { hash: "/controls-overlay" }), J?.setControlsOverlayWindow(U), U.on("closed", () => {
		J?.setControlsOverlayWindow(null), U = null;
	}), U);
}
function nn() {
	return !H || H.isDestroyed() ? null : W && !W.isDestroyed() ? W : (W = new t({
		parent: H,
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
			preload: h.join(B, "preload.cjs"),
			contextIsolation: !0,
			nodeIntegration: !1,
			sandbox: !1,
			backgroundThrottling: !1
		}
	}), W.setIgnoreMouseEvents(!0, { forward: !0 }), W.setAlwaysOnTop(!0, "screen-saver"), W.loadFile(V, { hash: "/files-menu-overlay" }), J?.setFilesMenuOverlayWindow(W), W.webContents.on("did-start-loading", () => {
		G = !1;
	}), W.on("closed", () => {
		J?.setFilesMenuOverlayWindow(null), W = null;
	}), W);
}
function rn() {
	!Rt || q || (q = p.watch(V, () => {
		H?.webContents.reload(), U && !U.isDestroyed() && U.webContents.reload(), W && !W.isDestroyed() && W.webContents.reload();
	}));
}
a.handle("updates:get-version", () => te()), a.handle("updates:check", async () => ne()), a.handle("updates:open-download", async (e, t) => typeof t == "string" ? re(t) : !1), a.handle("settings:get", async () => (await $()).settings);
function an(e) {
	for (let t of [
		H,
		U,
		W
	]) t && !t.isDestroyed() && t.webContents.send("settings:changed-relayed", e);
}
a.handle("settings:save", async (e, t) => {
	let n = await $(), r = k(t);
	return await Jt({
		...n,
		settings: r
	}), an(r), r;
}), a.handle("memory:get", async () => Ne((await $()).memory)), a.handle("memory:save", async (e, t) => {
	let n = await $(), r = await D(t);
	return await Jt({
		...n,
		memory: r
	}), r;
});
function on() {
	if (!W || W.isDestroyed()) {
		K = !1;
		return;
	}
	K = !1, W.webContents.send("files-menu:show-relayed", zt), J?.raiseFilesMenuOverlay();
}
a.on("files-menu:ready", () => {
	G = !0, K && on();
}), a.on("files-menu:show", (e, t, n) => {
	let r = nn();
	if (!r || !H || H.isDestroyed()) return;
	zt = n ?? null;
	let i = H.getContentBounds();
	if (r.setBounds({
		x: Math.round(i.x + t.x),
		y: Math.round(i.y + t.y),
		width: Math.max(1, Math.round(t.width)),
		height: Math.max(1, Math.round(t.height))
	}), r.setIgnoreMouseEvents(!1), r.isVisible() || r.showInactive(), K = !0, G && !r.webContents.isLoading()) {
		on();
		return;
	}
	r.webContents.isLoading() && r.webContents.once("did-finish-load", () => {
		G && on();
	});
}), a.on("files-menu:hide", () => {
	K = !1, W && !W.isDestroyed() && (W.webContents.send("files-menu:hide-relayed"), W.hide(), W.setIgnoreMouseEvents(!0, { forward: !0 }));
}), a.on("files-menu:action", (e, t) => {
	H && !H.isDestroyed() && H.webContents.send("files-menu:action-relayed", t), K = !1, W && !W.isDestroyed() && (W.webContents.send("files-menu:hide-relayed"), W.hide(), W.setIgnoreMouseEvents(!0, { forward: !0 }));
}), a.on("files-menu:select", (e, t) => {
	H && !H.isDestroyed() && H.webContents.send("files-menu:select-relayed", t);
}), a.on("files-menu:close", () => {
	H && !H.isDestroyed() && H.webContents.send("files-menu:close-relayed"), K = !1, W && !W.isDestroyed() && (W.webContents.send("files-menu:hide-relayed"), W.hide(), W.setIgnoreMouseEvents(!0, { forward: !0 }));
}), a.on("controls:set-bounds", (e, t) => {
	let n = tn();
	if (!n || !H || H.isDestroyed()) return;
	Y = !0;
	let r = H.getContentBounds();
	n.setBounds({
		x: Math.round(r.x + t.x),
		y: Math.round(r.y + t.y),
		width: Math.max(1, Math.round(t.width)),
		height: Math.max(1, Math.round(t.height))
	}), H.isFocused() && (n.isVisible() || (n.showInactive(), n.setIgnoreMouseEvents(!0, { forward: !0 }), n.webContents.send("controls:suspended-relayed")), J?.raiseControlsOverlay());
});
function sn() {
	if (!U || U.isDestroyed() || !U.isVisible()) return !1;
	let e = c.getCursorScreenPoint(), t = U.getBounds();
	return e.x >= t.x && e.x <= t.x + t.width && e.y >= t.y && e.y <= t.y + t.height;
}
a.handle("controls:cursor-over", () => sn()), a.on("controls:raise", () => {
	J?.raiseControlsOverlay();
}), a.on("controls:hide", () => {
	Y = !1, U && !U.isDestroyed() && (U.hide(), U.webContents.send("controls:suspended-relayed"));
}), a.on("controls:set-interactive", (e, t) => {
	!U || U.isDestroyed() || (t ? (U.setIgnoreMouseEvents(!1), J?.raiseControlsOverlay()) : (U.setIgnoreMouseEvents(!0, { forward: !0 }), J?.raiseControlsOverlay()));
}), a.on("controls:state", (e, t) => {
	U && !U.isDestroyed() && (U.webContents.send("controls:state-relayed", t), U.isVisible() && J?.raiseControlsOverlay());
}), a.on("controls:action", (e, t) => {
	H && !H.isDestroyed() && H.webContents.send("controls:action-relayed", t);
}), a.on("controls:ready", () => {
	H && !H.isDestroyed() && H.webContents.send("controls:request-state-relayed");
}), a.handle("files:openSingle", async (e, t) => {
	if (!w(t) || !H || H.isDestroyed()) return null;
	let n = await Yt();
	return X(() => he(H, t, n));
}), a.handle("files:openMultiple", async (e, t) => {
	if (!w(t) || !H || H.isDestroyed()) return [];
	let n = await Yt();
	return X(() => ge(H, t, n));
}), a.handle("files:openFolder", async (e, t) => {
	if (!w(t) || !H || H.isDestroyed()) return [];
	let n = await Yt();
	return X(() => _e(H, t, n));
}), a.handle("recording:choose-path", async (e, t, n) => {
	if (!H || H.isDestroyed() || typeof t != "string" || typeof n != "string") return null;
	let r = h.extname(n).replace(".", ""), a = h.extname(t).replace(".", ""), o = r || a, s = h.join(h.dirname(t), n);
	return X(async () => {
		let e = await i.showSaveDialog(H, {
			defaultPath: s,
			filters: o ? [{
				name: o.toUpperCase(),
				extensions: [o]
			}] : void 0
		});
		return e.canceled || !e.filePath ? null : e.filePath;
	});
}), r.whenReady().then(() => {
	n.setApplicationMenu(null), Wt(), r.on("browser-window-blur", (e, t) => {
		t === H && Ht();
	}), Xt(), Zt(), en(), rn(), r.on("activate", () => {
		t.getAllWindows().length === 0 && en();
	});
}), r.on("window-all-closed", () => {
	q?.close(), q = null, process.platform !== "darwin" && r.quit();
}), r.on("before-quit", () => {
	J?.destroy(), J = null;
});
//#endregion
export {};
