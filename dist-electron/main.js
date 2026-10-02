import { createRequire as e } from "node:module";
import { BrowserWindow as t, Menu as n, app as r, dialog as i, ipcMain as a, nativeImage as o, net as s, screen as c, shell as l } from "electron";
import u from "node:fs";
import d from "node:path";
import { spawn as f } from "node:child_process";
import p from "node:fs/promises";
import m from "node:https";
import { URL as h, fileURLToPath as g, pathToFileURL as _ } from "node:url";
//#region shared/vlc-media-extensions.ts
var v = /* @__PURE__ */ ".3ga,.669,.a52,.aac,.ac3,.adt,.adts,.aif,.aifc,.aiff,.alac,.amb,.amr,.aob,.ape,.au,.awb,.caf,.dts,.dsf,.dff,.flac,.it,.kar,.m4a,.m4b,.m4p,.m5p,.mid,.mka,.mlp,.mod,.mpa,.mp1,.mp2,.mp3,.mpc,.mpga,.mus,.oga,.ogg,.oma,.opus,.qcp,.ra,.rmi,.s3m,.sid,.spx,.tak,.thd,.tta,.voc,.vqf,.w64,.wav,.wma,.wv,.xa,.xm".split(","), ee = /* @__PURE__ */ ".3g2,.3gp,.3gp2,.3gpp,.amrec,.amv,.asf,.avi,.bik,.bin,.crf,.dav,.divx,.drc,.dv,.dvr-ms,.evo,.f4v,.flv,.gvi,.gxf,.iso,.k3g,.m1v,.m2v,.m2t,.m2ts,.m4v,.mkv,.mov,.mp2,.mp2v,.mp4,.mp4v,.mpe,.mpeg,.mpeg1,.mpeg2,.mpeg4,.mpg,.mpv2,.mts,.mtv,.mxf,.mxg,.nsv,.nuv,.ogg,.ogm,.ogv,.ogx,.ps,.qt,.rec,.rm,.rmvb,.rpl,.skm,.thp,.tod,.tp,.ts,.tts,.txd,.vob,.vp6,.vro,.webm,.wm,.wmv,.wtv,.xesc".split(","), te = /* @__PURE__ */ ".cdg,.idx,.srt,.sub,.utf,.ass,.ssa,.aqt,.jss,.psb,.rt,.sami,.smi,.txt,.smil,.stl,.usf,.dks,.pjs,.mpl2,.mks,.vtt,.tt,.ttml,.dfxp,.scc".split(",");
function ne(...e) {
	return [...new Set(e.flat())];
}
var re = ne(v, ee), y = {
	audio: v,
	video: ee,
	subtitles: te,
	media: re
}, ie = new Set(re);
function ae(e) {
	let t = d.extname(e).toLowerCase();
	return ie.has(t);
}
function oe(e) {
	let t = [];
	for (let n of e.slice(1)) {
		if (!n || n === "." || n.startsWith("-") || /\.(exe|asar)$/i.test(n) && !ae(n)) continue;
		let e = d.resolve(n);
		if (ae(e)) {
			try {
				if (!u.existsSync(e) || !u.statSync(e).isFile()) continue;
			} catch {
				continue;
			}
			t.includes(e) || t.push(e);
		}
	}
	return t;
}
//#endregion
//#region shared/updates.ts
function se(e, t) {
	let n = ce(e), r = ce(t), i = Math.max(n.length, r.length);
	for (let e = 0; e < i; e += 1) {
		let t = n[e] ?? 0, i = r[e] ?? 0;
		if (t > i) return 1;
		if (t < i) return -1;
	}
	return 0;
}
function b(e) {
	return e.trim().replace(/^v/i, "");
}
function ce(e) {
	let t = b(e);
	return t ? t.split(/[.+_-]/).map((e) => {
		let t = e.match(/^\d+/);
		return t ? Number(t[0]) : 0;
	}) : [0];
}
//#endregion
//#region electron/updates.ts
var x = {
	owner: "hartkkuh",
	name: "FMP-Media-Player"
}, le = 12e3, ue = 600 * 1e3, de = ["main", "master"], S = "FMP Video Player", fe = !1;
function C() {
	return r.getVersion();
}
async function pe() {
	let e = C(), t = [], n = [];
	try {
		let t = await xe(e);
		t && n.push(t);
	} catch (e) {
		t.push(`releases: ${E(e)}`);
	}
	try {
		n.push(...await Se(e));
	} catch (e) {
		t.push(`repo: ${E(e)}`);
	}
	let r = ye(n);
	return r ? be(e, r) : {
		status: "error",
		currentVersion: e,
		message: t.length > 0 ? t.join(" | ") : "Update source not found (private repository or missing public Release/update.json)"
	};
}
async function me(e) {
	return typeof e != "string" || !/^https?:\/\//i.test(e) ? !1 : (await l.openExternal(e), !0);
}
async function he(e, t) {
	if (fe) return {
		ok: !1,
		message: "Update already in progress"
	};
	if (typeof e != "string" || !/^https?:\/\//i.test(e)) return {
		ok: !1,
		message: "Invalid download URL"
	};
	fe = !0;
	try {
		let n = await ge(e), i = d.join(r.getPath("temp"), `FMP-Video-Player-Setup-${C()}-update.exe`);
		await _e(n, i, t);
		let a = d.join(process.env.LOCALAPPDATA || "", "Programs", S, `${S}.exe`), o = d.join(process.env.ProgramFiles || "C:\\Program Files", S, `${S}.exe`), s = d.join(r.getPath("temp"), `fmp-update-launch-${Date.now()}.cmd`), c = [
			"@echo off",
			`start /wait "" "${i}" /S`,
			`if exist "${a}" (`,
			`  start "" "${a}"`,
			`) else if exist "${o}" (`,
			`  start "" "${o}"`,
			")",
			`del /f /q "${i}" >nul 2>&1`,
			"del /f /q \"%~f0\" >nul 2>&1",
			""
		].join("\r\n");
		return await p.writeFile(s, c, "utf8"), f("cmd.exe", ["/c", s], {
			detached: !0,
			stdio: "ignore",
			windowsHide: !0
		}).unref(), setTimeout(() => {
			r.quit();
		}, 500), { ok: !0 };
	} catch (e) {
		return fe = !1, {
			ok: !1,
			message: E(e)
		};
	}
}
async function ge(e) {
	let t = e.trim();
	if (/\.exe($|\?)/i.test(t)) return t;
	let n = await xe(C());
	if (n?.downloadUrl && /\.exe($|\?)/i.test(n.downloadUrl)) return n.downloadUrl;
	throw Error("Could not resolve installer download URL");
}
async function _e(e, t, n) {
	let r = [];
	try {
		await ve(e, t, n);
		return;
	} catch (e) {
		r.push(`chromium: ${E(e)}`);
	}
	try {
		await w(e, t, !0, n);
		return;
	} catch (e) {
		r.push(`node: ${E(e)}`);
	}
	try {
		await w(e, t, !1, n);
	} catch (e) {
		throw r.push(`node-insecure: ${E(e)}`), Error(r.join(" | "));
	}
}
async function ve(e, t, n) {
	if (!r.isReady()) throw Error("App is not ready");
	let i = await s.fetch(e, {
		method: "GET",
		redirect: "follow",
		headers: {
			"User-Agent": `FMP-Video-Player/${C()}`,
			Accept: "application/octet-stream,*/*"
		}
	});
	if (!i.ok) throw Error(`HTTP ${i.status}`);
	let a = Number(i.headers.get("content-length") ?? 0), o = i.body?.getReader();
	if (!o) {
		let e = Buffer.from(await i.arrayBuffer());
		await p.writeFile(t, e), n?.({
			receivedBytes: e.length,
			totalBytes: e.length,
			percent: 100
		});
		return;
	}
	let c = [], l = 0;
	for (;;) {
		let { done: e, value: t } = await o.read();
		if (e) break;
		t && (c.push(t), l += t.byteLength, n?.({
			receivedBytes: l,
			totalBytes: a,
			percent: a > 0 ? Math.min(100, Math.round(l / a * 100)) : 0
		}));
	}
	await p.writeFile(t, Buffer.concat(c)), a <= 0 && n?.({
		receivedBytes: l,
		totalBytes: l,
		percent: 100
	});
}
function w(e, t, n, r) {
	return new Promise((i, a) => {
		let o = new h(e), s = m.request({
			protocol: o.protocol,
			hostname: o.hostname,
			port: o.port || 443,
			path: `${o.pathname}${o.search}`,
			method: "GET",
			headers: {
				"User-Agent": `FMP-Video-Player/${C()}`,
				Accept: "application/octet-stream,*/*"
			},
			rejectUnauthorized: n,
			timeout: ue
		}, (e) => {
			let o = e.statusCode ?? 0;
			if (o >= 300 && o < 400 && e.headers.location) {
				e.resume(), w(e.headers.location, t, n, r).then(i).catch(a);
				return;
			}
			if (o < 200 || o >= 300) {
				e.resume(), a(/* @__PURE__ */ Error(`HTTP ${o}`));
				return;
			}
			let s = Number(e.headers["content-length"] ?? 0), c = 0, l = u.createWriteStream(t);
			e.on("data", (e) => {
				c += e.length, r?.({
					receivedBytes: c,
					totalBytes: s,
					percent: s > 0 ? Math.min(100, Math.round(c / s * 100)) : 0
				});
			}), e.pipe(l), l.on("finish", () => {
				l.close(() => {
					s <= 0 && r?.({
						receivedBytes: c,
						totalBytes: c,
						percent: 100
					}), i();
				});
			}), l.on("error", (e) => {
				u.unlink(t, () => a(e));
			});
		});
		s.on("timeout", () => {
			s.destroy(/* @__PURE__ */ Error("Download timed out"));
		}), s.on("error", a), s.end();
	});
}
function ye(e) {
	let t = null;
	for (let n of e) {
		let e = b(n.version);
		e && (!t || se(e, t.version) > 0) && (t = {
			...n,
			version: e
		});
	}
	return t;
}
function be(e, t) {
	let n = b(t.version);
	return n ? se(n, e) <= 0 ? {
		status: "up-to-date",
		currentVersion: e,
		latestVersion: n
	} : {
		status: "available",
		currentVersion: e,
		latestVersion: n,
		releaseNotes: t.releaseNotes,
		releaseUrl: t.releaseUrl,
		downloadUrl: t.downloadUrl
	} : {
		status: "error",
		currentVersion: e,
		message: "Invalid release version"
	};
}
async function xe(e) {
	let t = await T(`https://api.github.com/repos/${x.owner}/${x.name}/releases/latest`, we(e));
	if (t.status === 200) return Ce(JSON.parse(t.body));
	if (t.status !== 404) throw Error(`GitHub latest release HTTP ${t.status}`);
	let n = await T(`https://api.github.com/repos/${x.owner}/${x.name}/releases?per_page=10`, we(e));
	if (n.status === 404) return null;
	if (n.status < 200 || n.status >= 300) throw Error(`GitHub releases HTTP ${n.status}`);
	let r = JSON.parse(n.body);
	if (!Array.isArray(r) || r.length === 0) return null;
	let i = r.find((e) => !e.draft && !e.prerelease) ?? r.find((e) => !e.draft) ?? r[0];
	return i ? Ce(i) : null;
}
async function Se(e) {
	let t = `https://github.com/${x.owner}/${x.name}/releases/latest`, n = [], r = [];
	for (let i of de) {
		let a = `https://raw.githubusercontent.com/${x.owner}/${x.name}/${i}/update.json`;
		try {
			let o = await T(a, {
				"User-Agent": `FMP-Video-Player/${e}`,
				Accept: "application/json",
				"Cache-Control": "no-cache"
			});
			if (o.status !== 404) if (o.status < 200 || o.status >= 300) r.push(`update.json@${i}: HTTP ${o.status}`);
			else {
				let e = JSON.parse(o.body), r = b(String(e.version ?? ""));
				if (r) {
					let i = typeof e.downloadUrl == "string" && e.downloadUrl ? e.downloadUrl : t;
					n.push({
						version: r,
						downloadUrl: i,
						releaseUrl: i.includes("github.com") ? i : t,
						releaseNotes: typeof e.releaseNotes == "string" ? e.releaseNotes : ""
					});
				}
			}
		} catch (e) {
			r.push(`update.json@${i}: ${E(e)}`);
		}
		let o = `https://raw.githubusercontent.com/${x.owner}/${x.name}/${i}/package.json`;
		try {
			let a = await T(o, {
				"User-Agent": `FMP-Video-Player/${e}`,
				Accept: "application/json",
				"Cache-Control": "no-cache"
			});
			if (a.status === 404) continue;
			if (a.status < 200 || a.status >= 300) {
				r.push(`package.json@${i}: HTTP ${a.status}`);
				continue;
			}
			let s = JSON.parse(a.body), c = b(String(s.version ?? ""));
			if (!c) continue;
			n.push({
				version: c,
				downloadUrl: t,
				releaseUrl: t,
				releaseNotes: ""
			});
		} catch (e) {
			r.push(`package.json@${i}: ${E(e)}`);
		}
	}
	if (n.length === 0 && r.length > 0) throw Error(r.join(" | "));
	return n;
}
function Ce(e) {
	let t = b(String(e.tag_name ?? ""));
	if (!t) return null;
	let n = typeof e.html_url == "string" && e.html_url ? e.html_url : `https://github.com/${x.owner}/${x.name}/releases/latest`;
	return {
		version: t,
		releaseUrl: n,
		downloadUrl: De(e.assets, n),
		releaseNotes: typeof e.body == "string" ? e.body.trim() : ""
	};
}
function we(e) {
	return {
		Accept: "application/vnd.github+json",
		"User-Agent": `FMP-Video-Player/${e}`,
		"X-GitHub-Api-Version": "2022-11-28",
		"Cache-Control": "no-cache"
	};
}
async function T(e, t) {
	let n = [];
	try {
		return await Te(e, t);
	} catch (e) {
		n.push(`chromium: ${E(e)}`);
	}
	try {
		return await Ee(e, t, !0);
	} catch (e) {
		n.push(`node: ${E(e)}`);
	}
	try {
		return await Ee(e, t, !1);
	} catch (e) {
		throw n.push(`node-insecure: ${E(e)}`), Error(n.join(" | "));
	}
}
async function Te(e, t) {
	if (!r.isReady()) throw Error("App is not ready");
	let n = await s.fetch(e, {
		method: "GET",
		headers: t,
		redirect: "follow",
		signal: AbortSignal.timeout(le)
	});
	return {
		status: n.status,
		body: await n.text()
	};
}
function Ee(e, t, n) {
	return new Promise((r, i) => {
		let a = new h(e), o = m.request({
			protocol: a.protocol,
			hostname: a.hostname,
			port: a.port || 443,
			path: `${a.pathname}${a.search}`,
			method: "GET",
			headers: t,
			rejectUnauthorized: n,
			timeout: le
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
function E(e) {
	if (!(e instanceof Error)) return "Unknown error";
	let t = [e.message], n = e.cause;
	return n instanceof Error && n.message && n.message !== e.message && t.push(n.message), t.join(": ");
}
function De(e, t) {
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
//#region electron/open-files.ts
var Oe = {
	audio: new Set(y.audio),
	video: new Set(y.video),
	subtitles: new Set(y.subtitles),
	media: new Set(y.media)
}, ke = {
	audio: "Audio",
	video: "Video",
	subtitles: "Subtitles",
	media: "Audio and Video"
};
function D(e) {
	return e === "audio" || e === "video" || e === "subtitles" || e === "media";
}
function Ae(e) {
	let t = y[e].map((e) => e.slice(1));
	return [{
		name: ke[e],
		extensions: t
	}];
}
function je(e, t) {
	let n = d.extname(e).toLowerCase();
	return Oe[t].has(n);
}
async function Me(e, t) {
	let n = await p.readdir(e, { withFileTypes: !0 }), r = [];
	for (let i of n) {
		if (!i.isFile()) continue;
		let n = d.join(e, i.name);
		je(n, t) && r.push(n);
	}
	return r.sort((e, t) => e.localeCompare(t));
}
async function Ne(e, t, n) {
	let r = await i.showOpenDialog(e, {
		properties: ["openFile"],
		filters: Ae(t),
		...n ? { defaultPath: n } : {}
	});
	return r.canceled || r.filePaths.length === 0 ? null : r.filePaths[0];
}
async function Pe(e, t, n) {
	let r = await i.showOpenDialog(e, {
		properties: ["openFile", "multiSelections"],
		filters: Ae(t),
		...n ? { defaultPath: n } : {}
	});
	return r.canceled ? [] : r.filePaths;
}
async function Fe(e, t, n) {
	let r = await i.showOpenDialog(e, {
		properties: ["openDirectory"],
		...n ? { defaultPath: n } : {}
	});
	return r.canceled || r.filePaths.length === 0 ? [] : Me(r.filePaths[0], t);
}
var Ie = 500, Le = 80, O = {
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
	},
	recentFiles: [],
	playlists: []
};
({ ...O });
function Re(e) {
	return e === "all" || e === "one" ? e : "off";
}
function ze(e) {
	return e === "video" ? "video" : "audio";
}
function Be(e) {
	return e === "encoding" ? "encoding" : "file";
}
function k(e) {
	return Array.isArray(e) ? e.filter((e) => typeof e == "string" && e.length > 0) : [];
}
function Ve(e) {
	return e.replace(/\//g, "\\").toLowerCase();
}
function He(e, t) {
	let n = [], r = /* @__PURE__ */ new Set(), i = (e) => {
		if (n.length >= 15) return;
		let t = Ve(e);
		!t || r.has(t) || (r.add(t), n.push(e));
	};
	for (let e of t) i(e);
	for (let t of e) i(t);
	return n;
}
function Ue(e) {
	return He([], k(e));
}
function We(e, t) {
	let n = [], r = /* @__PURE__ */ new Set(), i = (e) => {
		if (n.length >= Ie) return;
		let t = Ve(e);
		!t || r.has(t) || (r.add(t), n.push(e));
	};
	for (let t of e) i(t);
	for (let e of t) i(e);
	return n;
}
function Ge(e) {
	return typeof e == "string" ? e.trim().slice(0, Le) : "";
}
function Ke(e) {
	if (!Array.isArray(e)) return [];
	let t = [], n = /* @__PURE__ */ new Set();
	for (let r of e) {
		if (typeof r != "object" || !r) continue;
		let e = r, i = typeof e.id == "string" ? e.id.trim() : "", a = Ge(e.name);
		if (!(!i || !a || n.has(i)) && (n.add(i), t.push({
			id: i,
			name: a,
			filePaths: We([], k(e.filePaths))
		}), t.length >= 40)) break;
	}
	return t;
}
function qe(e) {
	return typeof e != "number" || !Number.isFinite(e) ? O.volume : Math.min(2, Math.max(0, e));
}
function Je(e) {
	return typeof e != "number" || !Number.isFinite(e) ? O.playbackRate : Math.min(2, Math.max(.25, e));
}
function Ye(e, t) {
	return typeof e != "number" || !Number.isFinite(e) || t === 0 ? 0 : Math.min(Math.max(0, Math.floor(e)), t - 1);
}
function Xe(e) {
	return typeof e == "string" ? e : "";
}
function A(e, t, n, r) {
	return typeof e != "number" || !Number.isFinite(e) ? r : Math.min(n, Math.max(t, e));
}
function Ze(e) {
	let t = typeof e == "object" && e ? e : {}, n = Array.isArray(t.bands) ? t.bands : [];
	return {
		bands: Array.from({ length: 10 }, (e, t) => A(n[t], -12, 12, 0)),
		outputGain: A(t.outputGain, .5, 2, 1)
	};
}
function Qe(e) {
	let t = typeof e == "object" && e ? e : {};
	return {
		grayscale: A(t.grayscale, 0, 100, 0),
		contrast: A(t.contrast, 0, 3, 1),
		brightness: A(t.brightness, 0, 3, 1),
		saturation: A(t.saturation, 0, 3, 1),
		sepia: A(t.sepia, 0, 100, 0),
		hue: A(t.hue, 0, 360, 0),
		gamma: A(t.gamma, .01, 10, 1),
		blur: A(t.blur, 0, 10, 0)
	};
}
function $e(e) {
	let t = e.replace(/\\/g, "/"), n = t.lastIndexOf("/");
	return n < 0 ? "" : e.slice(0, e.length - (t.length - n));
}
function et(e) {
	let t = Xe(e.lastOpenDirectory);
	if (t.length > 0) return t;
	let n = k(e.filePaths);
	return n.length === 0 ? "" : $e(n[Ye(e.currentIndex, n.length)] ?? n[n.length - 1]);
}
function tt(e) {
	if (typeof e != "object" || !e) return O;
	let t = e;
	return {
		volume: qe(t.volume),
		volumeMuted: t.volumeMuted === !0,
		playbackRate: Je(t.playbackRate),
		repeatMode: Re(t.repeatMode),
		shuffleEnabled: t.shuffleEnabled === !0,
		lastOpenDirectory: et(t),
		lastEffectsTab: ze(t.lastEffectsTab),
		lastMediaTab: Be(t.lastMediaTab),
		audioEffects: Ze(t.audioEffects),
		videoEffects: Qe(t.videoEffects),
		recentFiles: Ue(t.recentFiles),
		playlists: Ke(t.playlists)
	};
}
//#endregion
//#region electron/memory.ts
var nt = O;
async function rt(e) {
	if (!e) return !1;
	try {
		return (await p.stat(e)).isDirectory();
	} catch {
		return !1;
	}
}
async function j(e) {
	let t = tt(e);
	return !t.lastOpenDirectory || await rt(t.lastOpenDirectory) ? t : {
		...t,
		lastOpenDirectory: ""
	};
}
function it(e) {
	return {
		...e,
		filePaths: [],
		currentIndex: 0
	};
}
//#endregion
//#region electron/settings.ts
var M = {
	language: "he",
	theme: "dark",
	controlsPosition: "bottom"
};
function at(e) {
	return e === "en" || e === "he" ? e : M.language;
}
function ot(e) {
	return e === "light" ? "light" : "dark";
}
function st(e) {
	return e === "top" ? "top" : M.controlsPosition;
}
function ct(e) {
	if (typeof e != "object" || !e) return M;
	let t = e;
	return {
		language: at(t.language),
		theme: ot(t.theme),
		controlsPosition: st(t.controlsPosition)
	};
}
//#endregion
//#region electron/libvlc-path.ts
function lt() {
	return r.isPackaged ? d.join(process.resourcesPath, "libvlc") : d.join(r.getAppPath(), "libvlc");
}
//#endregion
//#region electron/vlc-effects.ts
var ut = {
	grayscale: 0,
	contrast: 1,
	brightness: 1,
	saturation: 1,
	sepia: 0,
	hue: 0,
	gamma: 1,
	blur: 0
};
function N(e) {
	return e.bands.every((e) => Math.abs(e) < .01) && Math.abs(e.outputGain - 1) < .01;
}
function dt(e) {
	return e.grayscale === 0 && Math.abs(e.contrast - 1) < .01 && Math.abs(e.brightness - 1) < .01 && Math.abs(e.saturation - 1) < .01 && e.sepia === 0 && Math.abs(e.hue) < .01 && Math.abs(e.gamma - 1) < .01 && e.blur === 0;
}
function ft(e) {
	return 20 * Math.log10(Math.min(2, Math.max(.5, e)));
}
function pt(e) {
	return Math.abs(e) <= 180 ? e : e - 360;
}
function mt(e) {
	let t = 1 - e.grayscale / 100, n = e.sepia / 100;
	return {
		enabled: !dt(e),
		brightness: e.brightness * (1 + n * .06),
		contrast: e.contrast * (1 + n * .08),
		saturation: e.saturation * t * (1 - n * .45),
		hue: pt(e.hue + n * 55),
		gamma: e.gamma * (1 - n * .04)
	};
}
function ht(e) {
	return e.blur > 0;
}
function gt(e) {
	return e.blur <= 0 ? [] : [":video-filter=gaussianblur", `:gaussianblur-sigma=${Math.max(.1, e.blur).toFixed(2)}`];
}
//#endregion
//#region electron/win32-api.ts
var _t = e(import.meta.url)("koffi"), vt = -16, yt = 2, bt = 5;
function P(e) {
	return typeof e == "bigint" ? e : typeof e == "number" && Number.isFinite(e) ? BigInt(Math.trunc(e)) : 0n;
}
function xt(e) {
	return e.length >= 8 ? e.readBigInt64LE(0) : BigInt(e.readUInt32LE(0));
}
var St = class {
	setWindowPos;
	moveWindow;
	showWindow;
	isWindow;
	bringWindowToTop;
	findWindowExW;
	getParent;
	setParent;
	getWindowLongPtrW;
	setWindowLongPtrW;
	getWindow;
	constructor() {
		let e = _t.load("user32.dll");
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
		]), this.showWindow = e.func("ShowWindow", "bool", ["uintptr", "int"]), this.isWindow = e.func("IsWindow", "bool", ["uintptr"]), this.bringWindowToTop = e.func("BringWindowToTop", "bool", ["uintptr"]), this.findWindowExW = e.func("FindWindowExW", "uintptr", [
			"uintptr",
			"uintptr",
			"str16",
			"str16"
		]), this.getParent = e.func("GetParent", "uintptr", ["uintptr"]), this.setParent = e.func("SetParent", "uintptr", ["uintptr", "uintptr"]), this.getWindowLongPtrW = e.func("GetWindowLongPtrW", "intptr", ["uintptr", "int"]), this.setWindowLongPtrW = e.func("SetWindowLongPtrW", "intptr", [
			"uintptr",
			"int",
			"intptr"
		]), this.getWindow = e.func("GetWindow", "uintptr", ["uintptr", "uint"]);
	}
	isValidWindow(e) {
		let t = P(e);
		return t !== 0n && this.isWindow(t);
	}
	moveWindowRepaint(e, t, n, r, i, a = !0) {
		let o = P(e);
		return this.isValidWindow(o) ? this.moveWindow(o, Math.round(t), Math.round(n), Math.max(1, Math.round(r)), Math.max(1, Math.round(i)), a) : !1;
	}
	setWindowPosFlags(e, t, n, r, i, a, o) {
		let s = P(e);
		return this.isValidWindow(s) ? this.setWindowPos(s, P(t), Math.round(n), Math.round(r), Math.max(1, Math.round(i)), Math.max(1, Math.round(a)), o) : !1;
	}
	positionWindow(e, t, n, r, i, a = !1) {
		let o = P(e);
		if (!this.isValidWindow(o)) return !1;
		let s = 16 | (a ? 64 : 4);
		return this.setWindowPos(o, 0n, Math.round(t), Math.round(n), Math.max(1, Math.round(r)), Math.max(1, Math.round(i)), s);
	}
	hideWindow(e) {
		let t = P(e);
		this.isValidWindow(t) && (this.setWindowPos(t, 0n, 0, 0, 0, 0, 151), this.showWindow(t, 0));
	}
	showWindowNoActivate(e) {
		let t = P(e);
		this.isValidWindow(t) && (this.showWindow(t, 8), this.bringWindowToTop(t));
	}
	showChildNoActivate(e) {
		let t = P(e);
		this.isValidWindow(t) && this.setWindowPos(t, 0n, 0, 0, 0, 0, 83);
	}
	reparentPopupsToHost(e, t, n, r) {
		let i = P(t);
		if (!this.isValidWindow(i) || n <= 0 || r <= 0) return !1;
		let a = 0n, o = !1;
		for (let t = 0; t < 8; t += 1) {
			let t = P(this.findWindowExW(0n, a, e, null));
			if (!t) break;
			if (a = t, P(this.getParent(t)) === i) continue;
			let s = BigInt.asUintN(32, P(this.getWindowLongPtrW(t, vt))) & -2160328705n | 1342177280n;
			this.setWindowLongPtrW(t, vt, s), this.setParent(t, i), this.setWindowPos(t, 0n, 0, 0, 0, 0, 55), this.moveWindow(t, 0, 0, Math.round(n), Math.round(r), !0), o = !0;
		}
		return this.fitChildren(i, n, r), o;
	}
	fitChildren(e, t, n) {
		let r = P(e);
		if (!this.isValidWindow(r) || t <= 0 || n <= 0) return;
		let i = P(this.getWindow(r, bt)), a = Math.max(1, Math.round(t)), o = Math.max(1, Math.round(n));
		for (let e = 0; i && e < 16; e += 1) this.moveWindow(i, 0, 0, a, o, !0), i = P(this.getWindow(i, yt));
	}
}, Ct = null;
function wt() {
	return process.platform === "win32" ? (Ct ||= new St(), Ct) : null;
}
//#endregion
//#region electron/win32-video-host.ts
var Tt = e(import.meta.url)("koffi"), Et = 134217728, Dt = class {
	hwnd = 0n;
	parentHwnd = 0n;
	hwndAttachedToVlc = !1;
	bounds = null;
	createWindowExW;
	destroyWindow;
	getModuleHandleW;
	win32 = wt();
	constructor() {
		let e = Tt.load("user32.dll"), t = Tt.load("kernel32.dll");
		this.createWindowExW = e.func("CreateWindowExW", "uintptr", [
			"long",
			"str16",
			"str16",
			"ulong",
			"int",
			"int",
			"int",
			"int",
			"uintptr",
			"uintptr",
			"uintptr",
			"uintptr"
		]), this.destroyWindow = e.func("DestroyWindow", "bool", ["uintptr"]), this.getModuleHandleW = t.func("GetModuleHandleW", "uintptr", ["void *"]);
	}
	get handle() {
		return this.hwnd;
	}
	get currentBounds() {
		return this.bounds;
	}
	isAttachedToVlc() {
		return this.hwndAttachedToVlc;
	}
	markAttachedToVlc() {
		this.hwndAttachedToVlc = !0;
	}
	ensure(e, t) {
		let n = P(e), r = Math.max(1, Math.round(t.width)), i = Math.max(1, Math.round(t.height)), a = Math.round(t.x), o = Math.round(t.y);
		if (this.hwnd && this.parentHwnd !== n && this.destroy(), !this.hwnd) {
			let e = P(this.getModuleHandleW(null));
			if (this.hwnd = P(this.createWindowExW(Et, "STATIC", "", 1174405120, a, o, r, i, n, 0n, e, 0n)), this.parentHwnd = n, !this.hwnd) throw Error("CreateWindowExW failed for libVLC video host");
		}
		return this.setBounds(t), this.hwnd;
	}
	setBounds(e) {
		if (!this.hwnd || !this.win32) return;
		let t = {
			x: Math.round(e.x),
			y: Math.round(e.y),
			width: Math.max(1, Math.round(e.width)),
			height: Math.max(1, Math.round(e.height))
		};
		this.bounds = t, this.win32.moveWindowRepaint(this.hwnd, t.x, t.y, t.width, t.height, !0);
	}
	hide() {
		!this.hwnd || !this.win32 || this.win32.hideWindow(this.hwnd);
	}
	show() {
		!this.hwnd || !this.win32 || this.win32.showChildNoActivate(this.hwnd);
	}
	destroy() {
		this.hwnd && (this.destroyWindow(this.hwnd), this.hwnd = 0n, this.parentHwnd = 0n, this.bounds = null, this.hwndAttachedToVlc = !1);
	}
}, Ot = e(import.meta.url)("koffi"), kt = Ot.struct("libvlc_track_description_t", {
	i_id: "int",
	psz_name: "str",
	p_next: "void *"
}), At = 0, jt = 3, F = 4, Mt = 6, Nt = 1.5, Pt = 200, Ft = {
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
}, It = new Set(ee);
function Lt(e) {
	return It.has(d.extname(e).toLowerCase());
}
var Rt = [
	".srt",
	".ass",
	".ssa",
	".vtt",
	".idx",
	...te.filter((e) => ![
		".srt",
		".ass",
		".ssa",
		".vtt",
		".idx"
	].includes(e))
];
function zt(e) {
	if (!Lt(e)) return null;
	let t = d.dirname(e), n = d.basename(e, d.extname(e)), r;
	try {
		r = u.readdirSync(t);
	} catch {
		return null;
	}
	let i = new Map(r.map((e) => [e.toLowerCase(), e]));
	for (let e of Rt) {
		let r = i.get(`${n}${e}`.toLowerCase());
		if (r) return d.join(t, r);
	}
	return null;
}
function Bt(e) {
	return Ft[d.extname(e).toLowerCase()] ?? null;
}
function Vt(e, t) {
	let n = e.replace(/\\/g, "/").replace(/["']/g, ""), r = Lt(t), i = [
		":vout=dummy",
		":aout=dummy",
		":no-video-title-show"
	];
	if (r) return [
		...i,
		`:sout=#transcode{vcodec=h264,venc=x264{preset=ultrafast},acodec=mp4a,ab=192,channels=2,samplerate=44100}:duplicate{dst=display,dst=std{access=file,mux=mp4,dst='${n}'}}`,
		":sout-all"
	];
	let a = Bt(e), o = a && a !== "raw" ? `std{access=file,mux=${a},dst='${n}'}` : `std{access=file,dst='${n}'}`;
	return [
		...i,
		`:sout=#duplicate{dst=display,dst=${o}}`,
		":sout-all"
	];
}
var Ht = 0, Ut = 1, Wt = 2, Gt = 3, Kt = 4, qt = 5, Jt = class {
	instance = null;
	mediaPlayer = null;
	media = null;
	equalizer = null;
	videoHost = new Dt();
	parentWindow = null;
	embedWatch = null;
	videoVisible = !1;
	videoOverlaySuspended = !1;
	endedNotified = !1;
	onEnded = null;
	lastViewport = null;
	mediaLoaded = !1;
	currentFilePath = null;
	sidecarSubtitlePath = null;
	subtitleSelectTimers = [];
	pendingAudioEffects = null;
	pendingVolume = 1;
	pendingVolumeMuted = !1;
	pendingRate = 1;
	activeVideoEffects = { ...ut };
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
	libvlc_media_slaves_add;
	libvlc_video_get_spu_description;
	libvlc_video_set_spu;
	libvlc_track_description_list_release;
	libvlc_media_release;
	libvlc_media_player_new;
	libvlc_media_player_release;
	libvlc_media_player_set_media;
	libvlc_media_player_set_hwnd;
	libvlc_video_set_mouse_input;
	libvlc_video_set_key_input;
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
	win32 = wt();
	parentGeometryHandler = null;
	parentMinimizeHandler = null;
	parentRestoreHandler = null;
	controlsOverlayWindow = null;
	filesMenuOverlayWindow = null;
	constructor() {
		let e = lt();
		process.env.VLC_PLUGIN_PATH = d.join(e, "plugins"), process.env.PATH = `${e}${d.delimiter}${process.env.PATH ?? ""}`;
		let t = Ot.load(d.join(e, "libvlc.dll"));
		this.libvlc_new = t.func("libvlc_new", "void *", ["int", "void *"]), this.libvlc_new_args = t.func("libvlc_new", "void *", ["int", "char **"]), this.libvlc_release = t.func("libvlc_release", "void", ["void *"]), this.libvlc_errmsg = t.func("libvlc_errmsg", "str", []), this.libvlc_media_new_path = t.func("libvlc_media_new_path", "void *", ["void *", "str"]), this.libvlc_media_add_option = t.func("libvlc_media_add_option", "void", ["void *", "str"]), this.libvlc_media_slaves_add = t.func("libvlc_media_slaves_add", "int", [
			"void *",
			"int",
			"uint",
			"str"
		]), this.libvlc_video_get_spu_description = t.func("libvlc_video_get_spu_description", "void *", ["void *"]), this.libvlc_video_set_spu = t.func("libvlc_video_set_spu", "int", ["void *", "int"]), this.libvlc_track_description_list_release = t.func("libvlc_track_description_list_release", "void", ["void *"]), this.libvlc_media_release = t.func("libvlc_media_release", "void", ["void *"]), this.libvlc_media_player_new = t.func("libvlc_media_player_new", "void *", ["void *"]), this.libvlc_media_player_release = t.func("libvlc_media_player_release", "void", ["void *"]), this.libvlc_media_player_set_media = t.func("libvlc_media_player_set_media", "void", ["void *", "void *"]), this.libvlc_media_player_set_hwnd = t.func("libvlc_media_player_set_hwnd", "void", ["void *", "void *"]), this.libvlc_video_set_mouse_input = t.func("libvlc_video_set_mouse_input", "void", ["void *", "uint"]), this.libvlc_video_set_key_input = t.func("libvlc_video_set_key_input", "void", ["void *", "uint"]), this.libvlc_media_player_play = t.func("libvlc_media_player_play", "int", ["void *"]), this.libvlc_media_player_set_pause = t.func("libvlc_media_player_set_pause", "void", ["void *", "int"]), this.libvlc_media_player_stop = t.func("libvlc_media_player_stop", "void", ["void *"]), this.libvlc_media_player_set_time = t.func("libvlc_media_player_set_time", "void", ["void *", "int64"]), this.libvlc_media_player_get_time = t.func("libvlc_media_player_get_time", "int64", ["void *"]), this.libvlc_media_player_get_length = t.func("libvlc_media_player_get_length", "int64", ["void *"]), this.libvlc_media_player_get_state = t.func("libvlc_media_player_get_state", "int", ["void *"]), this.libvlc_media_player_set_rate = t.func("libvlc_media_player_set_rate", "void", ["void *", "float"]), this.libvlc_audio_set_volume = t.func("libvlc_audio_set_volume", "int", ["void *", "int"]), this.libvlc_audio_equalizer_new = t.func("libvlc_audio_equalizer_new", "void *", []), this.libvlc_audio_equalizer_release = t.func("libvlc_audio_equalizer_release", "void", ["void *"]), this.libvlc_audio_equalizer_set_amp_at_index = t.func("libvlc_audio_equalizer_set_amp_at_index", "void", [
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
		]), this.instance = this.libvlc_new_args(2, ["--no-video-title-show", "--no-video-deco"]), this.instance ||= this.libvlc_new(0, null), this.mediaPlayer = this.libvlc_media_player_new(this.instance), this.libvlc_video_set_mouse_input(this.mediaPlayer, 0), this.libvlc_video_set_key_input(this.mediaPlayer, 0);
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
		e.on("move", t), e.on("resize", t), e.on("maximize", t), e.on("unmaximize", t), e.on("enter-full-screen", t), e.on("leave-full-screen", t), e.on("minimize", this.parentMinimizeHandler), e.on("restore", this.parentRestoreHandler), this.placeVideoHost(), this.ensureEmbedWatch();
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
		return this.stop(), this.mediaLoaded = !1, this.teardownRecordingPlayer(), this.recordingPath = null, this.currentFilePath = e, this.media &&= (this.libvlc_media_release(this.media), null), this.endedNotified = !1, this.clearSubtitleSelection(), this.sidecarSubtitlePath = null, this.media = this.createMedia(e, this.activeVideoEffects), this.media ? (this.libvlc_media_player_set_media(this.mediaPlayer, this.media), this.mediaLoaded = !0, this.applyPendingEffects(), { ok: !0 }) : {
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
		this.endedNotified = !1, this.bindVideoDrawable(), this.prepareVideoOutput(), this.libvlc_media_player_play(this.mediaPlayer), this.scheduleSidecarSubtitleSelection(), this.claimEmbeddedVideo(), this.refreshEffectsAfterPipeline(), this.syncRecordingTransport("play");
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
			if (ht(t) || ht(e)) {
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
			for (let t of Vt(e, this.currentFilePath)) this.libvlc_media_add_option(n, t);
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
			return (a === F || a === Mt) && this.libvlc_media_player_set_pause(r, 1), this.recordingInstance = t, this.recordingPlayer = r, this.recordingMedia = n, this.recordingPath = e, this.pendingRate > 0 && this.pendingRate !== 1 && this.libvlc_media_player_set_rate(r, this.pendingRate), { ok: !0 };
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
				(e === F || e === Mt) && this.libvlc_media_player_set_pause(this.recordingPlayer, 1);
				return;
			}
			this.libvlc_media_player_set_pause(this.recordingPlayer, 0);
		}
	}
	isRecording() {
		return this.recordingPath !== null;
	}
	getState() {
		let e = this.libvlc_media_player_get_state(this.mediaPlayer), t = Math.max(0, Number(this.libvlc_media_player_get_time(this.mediaPlayer))), n = Math.max(0, Number(this.libvlc_media_player_get_length(this.mediaPlayer))), r = e === jt, i = e === F, a = e === Mt;
		return a && !this.endedNotified && (this.endedNotified = !0, this.onEnded?.()), {
			playing: r,
			paused: i,
			ended: a,
			currentTimeMs: t,
			durationMs: n
		};
	}
	destroy() {
		this.clearSubtitleSelection(), this.stop(), this.stopEmbedWatch(), this.hideVideoWindow(), this.detachParentListeners(), this.videoHost.destroy(), this.teardownRecordingPlayer(), this.media &&= (this.libvlc_media_release(this.media), null), this.equalizer &&= (this.libvlc_audio_equalizer_release(this.equalizer), null), this.mediaPlayer &&= (this.libvlc_media_player_release(this.mediaPlayer), null), this.instance &&= (this.libvlc_release(this.instance), null);
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
		this.pendingAudioEffects && !N(this.pendingAudioEffects) && this.applyAudioEffects(this.pendingAudioEffects);
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
		this.libvlc_audio_set_volume(this.mediaPlayer, Pt), this.applyVolumeBoostEqualizer(e);
	}
	uiVolumeToLibVlcVolume(e) {
		return Math.min(Pt, Math.round(e * 100 * Nt));
	}
	clearVolumeBoostEqualizer() {
		(!this.pendingAudioEffects || N(this.pendingAudioEffects)) && this.libvlc_media_player_set_equalizer(this.mediaPlayer, null);
	}
	applyVolumeBoostEqualizer(e) {
		let t = Math.min(20, Math.max(-20, 20 * Math.log10(e) + 6.02));
		this.equalizer ||= this.libvlc_audio_equalizer_new(), this.libvlc_audio_equalizer_set_preamp(this.equalizer, t);
		for (let e = 0; e < 10; e += 1) this.libvlc_audio_equalizer_set_amp_at_index(this.equalizer, 0, e);
		this.libvlc_media_player_set_equalizer(this.mediaPlayer, this.equalizer);
	}
	applyAudioEffects(e) {
		if (N(e)) {
			this.libvlc_media_player_set_equalizer(this.mediaPlayer, null);
			return;
		}
		if (this.equalizer ||= this.libvlc_audio_equalizer_new(), this.equalizer) {
			this.libvlc_audio_equalizer_set_preamp(this.equalizer, ft(e.outputGain));
			for (let t = 0; t < 10; t += 1) {
				let n = e.bands[t] ?? 0;
				this.libvlc_audio_equalizer_set_amp_at_index(this.equalizer, n, t);
			}
			this.libvlc_media_player_set_equalizer(this.mediaPlayer, this.equalizer);
		}
	}
	applyVideoAdjust(e) {
		let t = mt(e);
		this.libvlc_video_set_adjust_int(this.mediaPlayer, Ht, +!!t.enabled), t.enabled && (this.libvlc_video_set_adjust_float(this.mediaPlayer, Wt, t.brightness), this.libvlc_video_set_adjust_float(this.mediaPlayer, Ut, t.contrast), this.libvlc_video_set_adjust_float(this.mediaPlayer, Kt, t.saturation), this.libvlc_video_set_adjust_float(this.mediaPlayer, Gt, t.hue), this.libvlc_video_set_adjust_float(this.mediaPlayer, qt, t.gamma));
	}
	createMedia(e, t) {
		let n = this.libvlc_media_new_path(this.instance, e);
		if (!n) return null;
		for (let e of gt(t)) this.libvlc_media_add_option(n, e);
		let r = zt(e);
		return this.sidecarSubtitlePath = r, r && this.libvlc_media_slaves_add(n, At, 4, _(r).href) === 0 && this.libvlc_media_add_option(n, ":no-sub-autodetect-file"), n;
	}
	clearSubtitleSelection() {
		for (let e of this.subtitleSelectTimers) clearTimeout(e);
		this.subtitleSelectTimers = [];
	}
	scheduleSidecarSubtitleSelection() {
		if (this.clearSubtitleSelection(), this.sidecarSubtitlePath) {
			for (let e of [250, 800]) this.subtitleSelectTimers.push(setTimeout(() => this.selectSidecarSubtitle(!1), e));
			this.subtitleSelectTimers.push(setTimeout(() => this.selectSidecarSubtitle(!0), 1600));
		}
	}
	selectSidecarSubtitle(e) {
		let t = this.sidecarSubtitlePath;
		if (!t || !this.mediaPlayer) return;
		let n = this.libvlc_video_get_spu_description(this.mediaPlayer);
		if (!n) return;
		let r = d.basename(t, d.extname(t)).toLowerCase(), i = n, a = -1, o = -1;
		for (let e = 0; i && e < 32; e += 1) {
			let e = Ot.decode(i, kt);
			e.i_id >= 0 && (o = e.i_id, String(e.psz_name ?? "").toLowerCase().includes(r) && (a = e.i_id)), i = e.p_next || null;
		}
		this.libvlc_track_description_list_release(n);
		let s = a >= 0 ? a : e ? o : -1;
		s < 0 || (this.libvlc_video_set_spu(this.mediaPlayer, s), this.clearSubtitleSelection());
	}
	reloadMediaPreservePosition() {
		if (!this.currentFilePath || !this.mediaLoaded) return;
		let e = Math.max(0, Number(this.libvlc_media_player_get_time(this.mediaPlayer))), t = this.libvlc_media_player_get_state(this.mediaPlayer), n = t === jt || t === F;
		if (this.clearSubtitleSelection(), this.libvlc_media_player_stop(this.mediaPlayer), this.media &&= (this.libvlc_media_release(this.media), null), this.media = this.createMedia(this.currentFilePath, this.activeVideoEffects), !this.media) {
			this.mediaLoaded = !1;
			return;
		}
		if (this.libvlc_media_player_set_media(this.mediaPlayer, this.media), e > 0 && this.libvlc_media_player_set_time(this.mediaPlayer, e), n) {
			this.bindVideoDrawable(), this.prepareVideoOutput(), this.libvlc_media_player_play(this.mediaPlayer), this.scheduleSidecarSubtitleSelection(), this.claimEmbeddedVideo(), this.refreshEffectsAfterPipeline();
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
		if (!this.parentWindow || !this.videoVisible || this.videoOverlaySuspended || process.platform !== "win32" || !this.win32) return;
		let t = this.viewportToClientPixels(e), n = this.lastAppliedScreenBounds;
		if (n && n.x === t.x && n.y === t.y && n.width === t.width && n.height === t.height) {
			this.videoHost.show(), this.raiseControlsOverlay();
			return;
		}
		if (this.lastAppliedScreenBounds = t, this.placeVideoHost(t), this.uiOverlayPrioritized) {
			this.hideVideoWindow();
			return;
		}
		this.videoHost.show(), this.claimEmbeddedVideo(), this.applyPendingEffects(), this.raiseControlsOverlay();
	}
	viewportToClientPixels(e) {
		let t = this.parentWindow;
		if (!t) return {
			x: Math.round(e.x),
			y: Math.round(e.y),
			width: Math.max(1, Math.round(e.width)),
			height: Math.max(1, Math.round(e.height))
		};
		let n = t.getContentBounds(), r = c.dipToScreenRect(t, {
			x: Math.round(n.x + e.x),
			y: Math.round(n.y + e.y),
			width: Math.max(1, Math.round(e.width)),
			height: Math.max(1, Math.round(e.height))
		}), i = c.dipToScreenRect(t, {
			x: n.x,
			y: n.y,
			width: 1,
			height: 1
		});
		return {
			x: r.x - i.x,
			y: r.y - i.y,
			width: Math.max(1, r.width),
			height: Math.max(1, r.height)
		};
	}
	placeVideoHost(e) {
		if (!this.parentWindow || this.parentWindow.isDestroyed() || process.platform !== "win32") return;
		let t = xt(this.parentWindow.getNativeWindowHandle()), n = e ?? this.videoHost.currentBounds ?? {
			x: 0,
			y: 0,
			width: 1,
			height: 1
		}, r = this.videoHost.ensure(t, n);
		this.videoHost.isAttachedToVlc() || this.attachDrawable(r);
	}
	bindVideoDrawable(e) {
		this.placeVideoHost(e), this.videoHost.handle && this.attachDrawable(this.videoHost.handle);
	}
	attachDrawable(e) {
		this.libvlc_media_player_set_hwnd(this.mediaPlayer, e), this.libvlc_video_set_mouse_input(this.mediaPlayer, 0), this.libvlc_video_set_key_input(this.mediaPlayer, 0), this.videoHost.markAttachedToVlc();
	}
	claimEmbeddedVideo() {
		if (!this.win32) return;
		let e = this.videoHost.currentBounds, t = this.videoHost.handle;
		!e || !t || (this.videoVisible && !this.videoOverlaySuspended && !this.uiOverlayPrioritized && this.videoHost.show(), this.win32.reparentPopupsToHost("VLC video output", t, e.width, e.height) && this.raiseControlsOverlay());
	}
	ensureEmbedWatch() {
		this.embedWatch || process.platform !== "win32" || (this.embedWatch = setInterval(() => this.claimEmbeddedVideo(), 400));
	}
	stopEmbedWatch() {
		this.embedWatch &&= (clearInterval(this.embedWatch), null);
	}
	async takeVideoSnapshot() {
		if (!this.mediaLoaded || !this.mediaPlayer) return null;
		try {
			let e = d.join(r.getPath("temp"), "fmp-media-player", "vlc-menu-preview.png");
			return await p.mkdir(d.dirname(e), { recursive: !0 }), this.libvlc_video_take_snapshot(this.mediaPlayer, 0, e, 0, 0) === 0 ? e : null;
		} catch (e) {
			return console.warn("Failed to capture VLC menu preview:", e), null;
		}
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
	hideVideoWindow() {
		this.lastAppliedScreenBounds = null, this.videoHost.hide();
	}
}, Yt = new Set(v);
function Xt(e) {
	return Yt.has(d.extname(e).toLowerCase());
}
function Zt(e, t) {
	return (e[t] & 127) << 21 | (e[t + 1] & 127) << 14 | (e[t + 2] & 127) << 7 | e[t + 3] & 127;
}
function Qt(e) {
	if (e.length < 10 || e.toString("ascii", 0, 3) !== "ID3") return null;
	let t = e[3], n = Zt(e, 6), r = 10, i = Math.min(e.length, 10 + n);
	for (; r < i;) {
		let n, a, o;
		if (t === 2) {
			if (r + 6 > i) break;
			n = e.toString("ascii", r, r + 3), a = e[r + 3] << 16 | e[r + 4] << 8 | e[r + 5], o = r + 6;
		} else {
			if (r + 10 > i) break;
			n = e.toString("ascii", r, r + 4).replace(/\0/g, ""), a = t === 4 ? Zt(e, r + 4) : e.readUInt32BE(r + 4), o = r + 10;
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
function $t(e) {
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
function en(e) {
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
function tn(e) {
	return $t(e);
}
function nn(e, t) {
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
async function rn(e, t = 320) {
	if (!Xt(e)) return null;
	try {
		let n = await p.readFile(e), r = d.extname(e).toLowerCase(), i = null;
		return i = r === ".mp3" || r === ".mp2" || r === ".mp1" || r === ".mpga" ? Qt(n) : r === ".flac" ? en(n) : r === ".m4a" || r === ".m4b" || r === ".m4p" || r === ".mp4" ? tn(n) : Qt(n), i ? nn(i, t) : null;
	} catch {
		return null;
	}
}
async function an(e, t = 320) {
	if (!e) return null;
	let n = e;
	if (n.startsWith("file://")) try {
		n = decodeURIComponent(new URL(n).pathname), process.platform === "win32" && n.startsWith("/") && (n = n.slice(1));
	} catch {
		return null;
	}
	if (!d.isAbsolute(n)) return null;
	try {
		return nn(await p.readFile(n), t);
	} catch {
		return null;
	}
}
//#endregion
//#region electron/media-probe.ts
var I = e(import.meta.url)("koffi"), on = 3, sn = 7, cn = 0, ln = 2, un = 3, dn = 4, fn = 0, pn = 1, mn = 2, L = {
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
}, hn = I.struct({
	i_channels: "uint",
	i_rate: "uint"
}), gn = I.struct({
	i_height: "uint",
	i_width: "uint",
	i_sar_num: "uint",
	i_sar_den: "uint",
	i_frame_rate_num: "uint",
	i_frame_rate_den: "uint"
}), _n = I.struct({ psz_encoding: "str" }), vn = I.struct({
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
function R(e) {
	return new Promise((t) => setTimeout(t, e));
}
function yn(e) {
	if (!e) return null;
	let t = [
		e & 255,
		e >>> 8 & 255,
		e >>> 16 & 255,
		e >>> 24 & 255
	].map((e) => e >= 32 && e < 127 ? String.fromCharCode(e) : "").join("").trim();
	return t.length ? t : null;
}
function z(e) {
	if (typeof e != "string") return null;
	let t = e.trim();
	return t.length ? t : null;
}
function bn(e, t, n) {
	return Number.isFinite(e) ? Math.min(n, Math.max(t, e)) : t;
}
var xn = class {
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
	libvlc_media_player_set_pause;
	libvlc_media_player_set_time;
	libvlc_media_player_get_length;
	libvlc_media_player_get_state;
	libvlc_audio_set_volume;
	libvlc_video_take_snapshot;
	scrubFilePath = null;
	scrubPlayer = null;
	scrubMedia = null;
	scrubWindow = null;
	scrubReady = !1;
	scrubChain = Promise.resolve();
	scrubCache = /* @__PURE__ */ new Map();
	constructor() {
		let e = lt();
		process.env.VLC_PLUGIN_PATH = d.join(e, "plugins"), process.env.PATH = `${e}${d.delimiter}${process.env.PATH ?? ""}`;
		let t = I.load(d.join(e, "libvlc.dll"));
		this.libvlc_new = t.func("libvlc_new", "void *", ["int", "void *"]), this.libvlc_release = t.func("libvlc_release", "void", ["void *"]), this.libvlc_media_new_path = t.func("libvlc_media_new_path", "void *", ["void *", "str"]), this.libvlc_media_add_option = t.func("libvlc_media_add_option", "void", ["void *", "str"]), this.libvlc_media_release = t.func("libvlc_media_release", "void", ["void *"]), this.libvlc_media_parse_with_options = t.func("libvlc_media_parse_with_options", "int", [
			"void *",
			"int",
			"int"
		]), this.libvlc_media_get_parsed_status = t.func("libvlc_media_get_parsed_status", "int", ["void *"]), this.libvlc_media_get_meta = t.func("libvlc_media_get_meta", "void *", ["void *", "int"]), this.libvlc_media_get_duration = t.func("libvlc_media_get_duration", "int64", ["void *"]), this.libvlc_media_tracks_get = t.func("libvlc_media_tracks_get", "uint", ["void *", I.out(I.pointer("void *"))]), this.libvlc_media_tracks_release = t.func("libvlc_media_tracks_release", "void", ["void *", "uint"]), this.libvlc_free = t.func("libvlc_free", "void", ["void *"]), this.libvlc_media_player_new = t.func("libvlc_media_player_new", "void *", ["void *"]), this.libvlc_media_player_release = t.func("libvlc_media_player_release", "void", ["void *"]), this.libvlc_media_player_set_media = t.func("libvlc_media_player_set_media", "void", ["void *", "void *"]), this.libvlc_media_player_set_hwnd = t.func("libvlc_media_player_set_hwnd", "void", ["void *", "void *"]), this.libvlc_media_player_play = t.func("libvlc_media_player_play", "int", ["void *"]), this.libvlc_media_player_stop = t.func("libvlc_media_player_stop", "void", ["void *"]), this.libvlc_media_player_set_pause = t.func("libvlc_media_player_set_pause", "void", ["void *", "int"]), this.libvlc_media_player_set_time = t.func("libvlc_media_player_set_time", "void", ["void *", "int64"]), this.libvlc_media_player_get_length = t.func("libvlc_media_player_get_length", "int64", ["void *"]), this.libvlc_media_player_get_state = t.func("libvlc_media_player_get_state", "int", ["void *"]), this.libvlc_audio_set_volume = t.func("libvlc_audio_set_volume", "int", ["void *", "int"]), this.libvlc_video_take_snapshot = t.func("libvlc_video_take_snapshot", "int", [
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
				title: this.getMeta(t, L.title),
				artist: this.getMeta(t, L.artist),
				album: this.getMeta(t, L.album),
				albumArtist: this.getMeta(t, L.albumArtist),
				genre: this.getMeta(t, L.genre),
				description: this.getMeta(t, L.description),
				date: this.getMeta(t, L.date),
				trackNumber: this.getMeta(t, L.trackNumber),
				trackTotal: this.getMeta(t, L.trackTotal),
				discNumber: this.getMeta(t, L.discNumber),
				copyright: this.getMeta(t, L.copyright),
				publisher: this.getMeta(t, L.publisher),
				encodedBy: this.getMeta(t, L.encodedBy),
				language: this.getMeta(t, L.language),
				nowPlaying: this.getMeta(t, L.nowPlaying),
				showName: this.getMeta(t, L.showName),
				season: this.getMeta(t, L.season),
				episode: this.getMeta(t, L.episode),
				director: this.getMeta(t, L.director),
				actors: this.getMeta(t, L.actors),
				rating: this.getMeta(t, L.rating),
				url: this.getMeta(t, L.url),
				artworkUrl: this.getMeta(t, L.artworkUrl),
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
		let n = Math.round(bn(t.width ?? 320, 16, 1920)), r = this.libvlc_media_new_path(this.instance, e);
		if (!r) return null;
		try {
			await this.parseMedia(r);
			let i = await an(this.getMeta(r, L.artworkUrl), n);
			if (i) return {
				filePath: e,
				...i
			};
			let a = await rn(e, n);
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
			let l = xt(c.getNativeWindowHandle());
			if (this.libvlc_media_player_set_hwnd(s, l), c.showInactive(), this.libvlc_audio_set_volume(s, 0), this.libvlc_media_player_play(s) !== 0 || !await this.waitForPlaying(s, 5e3)) return null;
			let u = Math.max(0, Number(this.libvlc_media_player_get_length(s))), f = typeof a.timeMs == "number" ? bn(a.timeMs, 0, u > 0 ? u : a.timeMs) : u > 1500 ? Math.min(u - 500, Math.max(1e3, Math.floor(u * .1))) : 0;
			f > 0 && this.libvlc_media_player_set_time(s, f), await R(900);
			let m = d.join(r.getPath("temp"), "fmp-media-player", "probe");
			await p.mkdir(m, { recursive: !0 });
			let h = d.join(m, `thumb-${Date.now()}-${Math.random().toString(36).slice(2)}.png`), g = this.libvlc_video_take_snapshot(s, 0, h, i, 0);
			if (g !== 0 && (await R(500), g = this.libvlc_video_take_snapshot(s, 0, h, i, 0)), g !== 0) return null;
			let _ = o.createFromPath(h);
			if (await p.rm(h, { force: !0 }), _.isEmpty()) return null;
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
	scrubThumbnail(e, t) {
		if (typeof e != "string" || e.length === 0) return Promise.resolve(null);
		let n = Math.max(0, Math.round(t / 1e3)), r = this.scrubCache.get(e)?.get(n);
		if (r) return Promise.resolve(r);
		let i = this.scrubChain.then(() => this.captureScrubFrame(e, n));
		return this.scrubChain = i.then(() => void 0, () => void 0), i;
	}
	destroy() {
		this.closeScrubSession(), this.instance &&= (this.libvlc_release(this.instance), null);
	}
	async captureScrubFrame(e, t) {
		let n = this.scrubCache.get(e)?.get(t);
		if (n) return n;
		if (!await this.ensureScrubSession(e) || !this.scrubPlayer) return null;
		let r = t * 1e3;
		this.libvlc_media_player_set_pause(this.scrubPlayer, 0), r > 0 && this.libvlc_media_player_set_time(this.scrubPlayer, r), await R(240);
		let i = await this.snapshotScrubPlayer(e);
		if (this.libvlc_media_player_set_pause(this.scrubPlayer, 1), !i) return null;
		let a = this.scrubCache.get(e);
		return a || (a = /* @__PURE__ */ new Map(), this.scrubCache.set(e, a)), a.set(t, i), i;
	}
	async ensureScrubSession(e) {
		if (this.scrubReady && this.scrubFilePath === e && this.scrubPlayer && this.scrubWindow) return !0;
		this.closeScrubSession();
		let n = this.libvlc_media_new_path(this.instance, e);
		if (!n) return !1;
		this.libvlc_media_add_option(n, ":no-audio"), this.libvlc_media_add_option(n, ":no-sub-autodetect-file"), this.libvlc_media_add_option(n, ":avcodec-hw=none");
		let r = this.libvlc_media_player_new(this.instance), i = new t({
			show: !1,
			width: 320,
			height: 180,
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
		});
		i.setIgnoreMouseEvents(!0), this.scrubFilePath = e, this.scrubMedia = n, this.scrubPlayer = r, this.scrubWindow = i;
		try {
			return this.libvlc_media_player_set_media(r, n), this.libvlc_media_player_set_hwnd(r, xt(i.getNativeWindowHandle())), i.showInactive(), this.libvlc_audio_set_volume(r, 0), this.libvlc_media_player_play(r) !== 0 || !await this.waitForPlaying(r, 5e3) ? (this.closeScrubSession(), !1) : (this.scrubReady = !0, !0);
		} catch (e) {
			return console.warn("media-probe: scrub preview failed to start:", e), this.closeScrubSession(), !1;
		}
	}
	async snapshotScrubPlayer(e) {
		if (!this.scrubPlayer) return null;
		let t = d.join(r.getPath("temp"), "fmp-media-player", "scrub");
		await p.mkdir(t, { recursive: !0 });
		let n = d.join(t, `scrub-${Date.now()}-${Math.random().toString(36).slice(2)}.png`), i = this.libvlc_video_take_snapshot(this.scrubPlayer, 0, n, 320, 0);
		if (i !== 0 && (await R(280), i = this.libvlc_video_take_snapshot(this.scrubPlayer, 0, n, 320, 0)), i !== 0) return await p.rm(n, { force: !0 }), null;
		let a = o.createFromPath(n);
		if (await p.rm(n, { force: !0 }), a.isEmpty()) return null;
		let s = a.getSize();
		return {
			filePath: e,
			dataUrl: a.toDataURL(),
			width: s.width,
			height: s.height
		};
	}
	closeScrubSession() {
		if (this.scrubReady = !1, this.scrubFilePath = null, this.scrubPlayer) {
			try {
				this.libvlc_media_player_stop(this.scrubPlayer);
			} catch {}
			try {
				this.libvlc_media_player_release(this.scrubPlayer);
			} catch {}
			this.scrubPlayer = null;
		}
		if (this.scrubMedia) {
			try {
				this.libvlc_media_release(this.scrubMedia);
			} catch {}
			this.scrubMedia = null;
		}
		this.scrubWindow && !this.scrubWindow.isDestroyed() && this.scrubWindow.destroy(), this.scrubWindow = null;
	}
	async parseMedia(e) {
		if (this.libvlc_media_parse_with_options(e, cn, 5e3) !== 0) return !1;
		let t = Date.now() + 6e3;
		for (; Date.now() < t;) {
			let t = this.libvlc_media_get_parsed_status(e);
			if (t === dn) return !0;
			if (t === ln || t === un) return !1;
			await R(25);
		}
		return !1;
	}
	getMeta(e, t) {
		let n = this.libvlc_media_get_meta(e, t);
		if (!n) return null;
		try {
			return z(I.decode.string(n));
		} finally {
			this.libvlc_free(n);
		}
	}
	readTracks(e) {
		let t = [null], n = this.libvlc_media_tracks_get(e, t), r = t[0];
		if (!n || !r) return [];
		let i = [];
		try {
			let e = I.decode(r, I.array("void *", n));
			for (let t = 0; t < n; t += 1) {
				let n = e[t];
				if (!n) continue;
				let r = I.decode(n, vn), a = r.i_type === fn ? "audio" : r.i_type === pn ? "video" : r.i_type === mn ? "subtitle" : "unknown", o = {
					id: r.i_id,
					kind: a,
					codec: yn(r.i_codec),
					codecFourcc: yn(r.i_codec),
					originalFourcc: yn(r.i_original_fourcc),
					bitrate: r.i_bitrate >>> 0,
					profile: r.i_profile,
					level: r.i_level,
					language: z(r.psz_language),
					description: z(r.psz_description)
				};
				if (a === "audio" && r.media) {
					let e = I.decode(r.media, hn);
					o.channels = e.i_channels, o.sampleRate = e.i_rate;
				} else if (a === "video" && r.media) {
					let e = I.decode(r.media, gn);
					o.width = e.i_width, o.height = e.i_height, o.frameRate = e.i_frame_rate_den ? Math.round(e.i_frame_rate_num / e.i_frame_rate_den * 1e3) / 1e3 : 0, o.sampleAspectRatio = e.i_sar_den ? `${e.i_sar_num}:${e.i_sar_den}` : void 0;
				} else a === "subtitle" && r.media && (o.encoding = z(I.decode(r.media, _n).psz_encoding));
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
			if (t === on) return !0;
			if (t === sn) return !1;
			await R(30);
		}
		return !1;
	}
}, Sn = null;
function B() {
	return Sn ||= new xn(), Sn;
}
//#endregion
//#region electron/main.ts
var V = d.dirname(g(import.meta.url)), Cn = !r.isPackaged, H = d.join(V, "../dist/index.html"), U = null, W = null, G = null, K = !1, q = !1, wn = null, J = null, Y = null, X = !1, Tn = oe(process.argv);
r.setAppUserModelId("com.fmp.videoplayer");
var En = r.requestSingleInstanceLock();
En ? r.on("second-instance", (e, t) => {
	let n = oe(t);
	n.length > 0 && (Tn = n), !(!U || U.isDestroyed()) && (U.isMinimized() && U.restore(), U.show(), U.focus(), n.length > 0 && U.webContents.send("app:open-files", n));
}) : r.quit();
async function Z(e) {
	let t = !!(W && !W.isDestroyed() && W.isVisible()), n = !!(G && !G.isDestroyed() && G.isVisible());
	t && W?.hide(), n && (G?.hide(), G?.setIgnoreMouseEvents(!0, { forward: !0 })), q = !1, Y?.suspendVideoOverlay();
	try {
		return U && !U.isDestroyed() && U.focus(), await e();
	} finally {
		Y?.resumeVideoOverlay(), Dn(t);
	}
}
function Dn(e) {
	!e || !W || W.isDestroyed() || (X = !0, !(!U || U.isDestroyed() || !U.isFocused()) && (W.showInactive(), Y?.raiseControlsOverlay(), U.webContents.send("controls:request-state-relayed"), U.webContents.send("vlc:parent-geometry-changed")));
}
function On() {
	W && !W.isDestroyed() && (W.setAlwaysOnTop(!1), W.hide(), W.webContents.send("controls:suspended-relayed")), G && !G.isDestroyed() && (q = !1, G.setAlwaysOnTop(!1), G.webContents.send("files-menu:hide-relayed"), G.hide(), G.setIgnoreMouseEvents(!0, { forward: !0 })), Y?.suspendVideoOverlay();
}
function kn() {
	if (!U || U.isDestroyed() || U.isMinimized() || !U.isVisible()) return !1;
	if (U.isFocused()) return !0;
	let e = t.getFocusedWindow();
	return e === W || e === G;
}
function An() {
	let e = () => {
		if (kn()) {
			t.getFocusedWindow() === G && W && !W.isDestroyed() && (W.setAlwaysOnTop(!1), W.hide(), W.webContents.send("controls:suspended-relayed"));
			return;
		}
		On();
	};
	setTimeout(e, 50), setTimeout(e, 200);
}
var jn = null;
function Mn() {
	jn ||= setInterval(() => {
		!W || W.isDestroyed() || !W.isVisible() || kn() || On();
	}, 300);
}
function Nn() {
	!U || U.isDestroyed() || U.isMinimized() || !U.isVisible() || !U.isFocused() || (Y?.resumeVideoOverlay(), X && W && !W.isDestroyed() && (W.setAlwaysOnTop(!0, "pop-up-menu"), W.showInactive(), Y?.raiseControlsOverlay(), U.webContents.send("controls:request-state-relayed")));
}
var Q = null;
function Pn() {
	return d.join(r.getPath("userData"), "settings.json");
}
function Fn() {
	return d.join(r.getPath("userData"), "memory.json");
}
async function In(e) {
	return Q = e, await p.mkdir(r.getPath("userData"), { recursive: !0 }), await p.writeFile(Pn(), `${JSON.stringify({
		settings: e.settings,
		memory: e.memory
	}, null, 2)}\n`, "utf8"), e;
}
async function $() {
	if (Q) return Q;
	let e = null;
	try {
		e = JSON.parse(await p.readFile(Pn(), "utf8"));
	} catch {
		e = null;
	}
	if (e && typeof e == "object" && ("settings" in e || "memory" in e)) {
		let t = e, n = {
			settings: ct(t.settings),
			memory: await j(t.memory)
		};
		return Q = n, n;
	}
	let t = e ? ct(e) : M, n;
	try {
		n = await j(JSON.parse(await p.readFile(Fn(), "utf8")));
	} catch {
		n = await j(nt);
	}
	let r = await In({
		settings: t,
		memory: n
	});
	try {
		await p.unlink(Fn());
	} catch {}
	return r;
}
async function Ln() {
	return (await $()).memory.lastOpenDirectory;
}
function Rn() {
	a.handle("vlc:load", async (e, t) => Y ? Y.loadIfNeeded(t) : {
		ok: !1,
		error: "VLC player is not ready",
		reloaded: !0
	}), a.handle("vlc:play", async () => {
		Y?.play();
	}), a.handle("vlc:pause", async () => {
		Y?.pause();
	}), a.handle("vlc:stop", async () => {
		Y?.stop();
	}), a.handle("vlc:seek", async (e, t) => {
		Y?.seek(t);
	}), a.handle("vlc:set-volume", async (e, t) => {
		Y?.setVolume(t);
	}), a.handle("vlc:set-volume-muted", async (e, t) => {
		Y?.setVolumeMuted(t);
	}), a.handle("vlc:set-rate", async (e, t) => {
		Y?.setRate(t);
	}), a.handle("vlc:set-audio-effects", async (e, t) => {
		Y?.setAudioEffects(t);
	}), a.handle("vlc:set-video-effects", async (e, t) => {
		Y?.setVideoEffects(t);
	}), a.handle("vlc:set-video-visible", async (e, t) => {
		Y?.setVideoVisible(t);
	}), a.handle("vlc:suspend-video-overlay", async () => {
		Y?.suspendVideoOverlay();
	}), a.handle("vlc:resume-video-overlay", async () => {
		Y?.resumeVideoOverlay();
	}), a.handle("vlc:set-viewport", async (e, t) => {
		Y?.setViewport(t);
	}), a.on("vlc:set-viewport-sync", (e, t) => {
		Y?.setViewport(t);
	}), a.handle("vlc:hide-video-overlay", async () => {
		Y?.hideVideoOverlay();
	}), a.on("vlc:hide-video-overlay-sync", () => {
		Y?.hideVideoOverlay();
	}), a.handle("vlc:prioritize-ui-overlay", async () => Y ? Y.prioritizeUiOverlay() : null), a.handle("vlc:release-ui-overlay", async () => {
		Y?.releaseUiOverlay();
	}), a.handle("vlc:start-recording", async (e, t) => Y ? Y.startRecording(t) : {
		ok: !1,
		error: "VLC player is not ready"
	}), a.handle("vlc:stop-recording", async () => {
		Y?.stopRecording();
	}), a.handle("vlc:get-state", async () => Y?.getState() ?? {
		playing: !1,
		paused: !1,
		ended: !1,
		currentTimeMs: 0,
		durationMs: 0
	});
}
function zn() {
	a.handle("media-probe:metadata", async (e, t) => {
		try {
			return await B().extractMetadata(t);
		} catch (e) {
			return console.warn("media-probe:metadata failed:", e), null;
		}
	}), a.handle("media-probe:tracks", async (e, t) => {
		try {
			return await B().extractTracks(t);
		} catch (e) {
			return console.warn("media-probe:tracks failed:", e), [];
		}
	}), a.handle("media-probe:thumbnail", async (e, t, n) => {
		try {
			return await B().extractThumbnail(t, n ?? {});
		} catch (e) {
			return console.warn("media-probe:thumbnail failed:", e), null;
		}
	}), a.handle("media-probe:scrub-thumbnail", async (e, t, n) => {
		try {
			return await B().scrubThumbnail(t, n);
		} catch (e) {
			return console.warn("media-probe:scrub-thumbnail failed:", e), null;
		}
	});
}
function Bn() {
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
		d.join(V, ".."),
		process.resourcesPath
	];
	for (let n of t) for (let t of e) {
		let e = d.join(n, t), r = o.createFromPath(e);
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
function Vn(e) {
	try {
		Y?.destroy(), Y = new Jt(), Y.attachParent(e), Y.setOnEnded(() => {
			U?.webContents.send("vlc:ended");
		});
	} catch (e) {
		console.error("Failed to initialize libVLC:", e), Y = null;
	}
}
function Hn() {
	U = new t({
		width: 1280,
		height: 800,
		minWidth: 960,
		minHeight: 600,
		show: !1,
		icon: Bn(),
		backgroundColor: "#0b1020",
		webPreferences: {
			preload: d.join(V, "preload.cjs"),
			contextIsolation: !0,
			nodeIntegration: !1,
			sandbox: !1,
			backgroundThrottling: !1
		}
	}), U.once("ready-to-show", () => {
		U?.show();
	}), U.loadFile(H), Vn(U), U.on("blur", An), U.on("focus", Nn), U.on("hide", An), U.on("show", Nn), U.on("minimize", () => {
		On();
	}), U.on("restore", Nn), Cn && U.webContents.openDevTools({ mode: "detach" }), U.on("closed", () => {
		W && !W.isDestroyed() && W.destroy(), W = null, G && !G.isDestroyed() && G.destroy(), G = null, Y?.destroy(), Y = null, U = null;
	});
}
function Un() {
	return !U || U.isDestroyed() ? null : W && !W.isDestroyed() ? W : (W = new t({
		parent: U,
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
			preload: d.join(V, "preload.cjs"),
			contextIsolation: !0,
			nodeIntegration: !1,
			sandbox: !1,
			backgroundThrottling: !1
		}
	}), W.setIgnoreMouseEvents(!0, { forward: !0 }), W.setAlwaysOnTop(!0, "pop-up-menu"), W.loadFile(H, { hash: "/controls-overlay" }), Y?.setControlsOverlayWindow(W), W.on("closed", () => {
		Y?.setControlsOverlayWindow(null), W = null;
	}), W);
}
function Wn() {
	return !U || U.isDestroyed() ? null : G && !G.isDestroyed() ? G : (G = new t({
		parent: U,
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
			preload: d.join(V, "preload.cjs"),
			contextIsolation: !0,
			nodeIntegration: !1,
			sandbox: !1,
			backgroundThrottling: !1
		}
	}), G.setIgnoreMouseEvents(!0, { forward: !0 }), G.setAlwaysOnTop(!0, "screen-saver"), G.loadFile(H, { hash: "/files-menu-overlay" }), Y?.setFilesMenuOverlayWindow(G), G.webContents.on("did-start-loading", () => {
		K = !1;
	}), G.on("closed", () => {
		Y?.setFilesMenuOverlayWindow(null), G = null;
	}), G);
}
function Gn() {
	!Cn || J || (J = u.watch(H, () => {
		U?.webContents.reload(), W && !W.isDestroyed() && W.webContents.reload(), G && !G.isDestroyed() && G.webContents.reload();
	}));
}
a.handle("updates:get-version", () => C()), a.handle("updates:check", async () => pe()), a.handle("updates:open-download", async (e, t) => typeof t == "string" ? me(t) : !1), a.handle("updates:install", async (e, t) => typeof t == "string" ? he(t, (t) => {
	e.sender.isDestroyed() || e.sender.send("updates:download-progress", t);
}) : {
	ok: !1,
	message: "Invalid download URL"
}), a.handle("app:get-launch-files", () => {
	let e = Tn;
	return Tn = [], e;
}), a.handle("settings:get", async () => (await $()).settings);
function Kn(e) {
	for (let t of [
		U,
		W,
		G
	]) t && !t.isDestroyed() && t.webContents.send("settings:changed-relayed", e);
}
a.handle("settings:save", async (e, t) => {
	let n = await $(), r = ct(t);
	return await In({
		...n,
		settings: r
	}), Kn(r), r;
}), a.handle("memory:get", async () => it((await $()).memory)), a.handle("memory:save", async (e, t) => {
	let n = await $(), r = await j(t);
	return await In({
		...n,
		memory: r
	}), r;
});
function qn() {
	if (!G || G.isDestroyed()) {
		q = !1;
		return;
	}
	q = !1, G.webContents.send("files-menu:show-relayed", wn), Y?.raiseFilesMenuOverlay();
}
a.on("files-menu:ready", () => {
	K = !0, q && qn();
}), a.on("files-menu:show", (e, t, n) => {
	let r = Wn();
	if (!r || !U || U.isDestroyed()) return;
	wn = n ?? null;
	let i = U.getContentBounds();
	if (r.setBounds({
		x: Math.round(i.x + t.x),
		y: Math.round(i.y + t.y),
		width: Math.max(1, Math.round(t.width)),
		height: Math.max(1, Math.round(t.height))
	}), r.setIgnoreMouseEvents(!1), r.isVisible() || r.showInactive(), q = !0, K && !r.webContents.isLoading()) {
		qn();
		return;
	}
	r.webContents.isLoading() && r.webContents.once("did-finish-load", () => {
		K && qn();
	});
}), a.on("files-menu:hide", () => {
	q = !1, G && !G.isDestroyed() && (G.webContents.send("files-menu:hide-relayed"), G.hide(), G.setIgnoreMouseEvents(!0, { forward: !0 }));
}), a.on("files-menu:action", (e, t) => {
	U && !U.isDestroyed() && U.webContents.send("files-menu:action-relayed", t), q = !1, G && !G.isDestroyed() && (G.webContents.send("files-menu:hide-relayed"), G.hide(), G.setIgnoreMouseEvents(!0, { forward: !0 }));
}), a.on("files-menu:select", (e, t) => {
	U && !U.isDestroyed() && U.webContents.send("files-menu:select-relayed", t);
}), a.on("files-menu:close", () => {
	U && !U.isDestroyed() && U.webContents.send("files-menu:close-relayed"), q = !1, G && !G.isDestroyed() && (G.webContents.send("files-menu:hide-relayed"), G.hide(), G.setIgnoreMouseEvents(!0, { forward: !0 }));
}), a.on("controls:set-bounds", (e, t) => {
	let n = Un();
	if (!n || !U || U.isDestroyed()) return;
	X = !0;
	let r = U.getContentBounds();
	n.setBounds({
		x: Math.round(r.x + t.x),
		y: Math.round(r.y + t.y),
		width: Math.max(1, Math.round(t.width)),
		height: Math.max(1, Math.round(t.height))
	}), U.isFocused() && (n.isVisible() || n.showInactive(), Y?.raiseControlsOverlay());
});
function Jn() {
	if (!W || W.isDestroyed() || !W.isVisible()) return null;
	let e = c.getCursorScreenPoint(), t = W.getBounds(), n = e.x - t.x, r = e.y - t.y;
	return {
		x: n,
		y: r,
		inside: n >= 0 && r >= 0 && n <= t.width && r <= t.height
	};
}
a.handle("controls:cursor-point", () => Jn()), a.on("controls:raise", () => {
	Y?.raiseControlsOverlay();
}), a.on("controls:hide", () => {
	X = !1, W && !W.isDestroyed() && (W.hide(), W.webContents.send("controls:suspended-relayed"));
}), a.on("controls:set-interactive", (e, t) => {
	!W || W.isDestroyed() || (t ? (W.setIgnoreMouseEvents(!1), Y?.raiseControlsOverlay()) : (W.setIgnoreMouseEvents(!0, { forward: !0 }), Y?.raiseControlsOverlay()));
}), a.on("controls:state", (e, t) => {
	W && !W.isDestroyed() && (W.webContents.send("controls:state-relayed", t), W.isVisible() && Y?.raiseControlsOverlay());
}), a.on("controls:action", (e, t) => {
	U && !U.isDestroyed() && U.webContents.send("controls:action-relayed", t);
}), a.on("controls:ready", () => {
	U && !U.isDestroyed() && U.webContents.send("controls:request-state-relayed");
}), a.handle("files:openSingle", async (e, t) => {
	if (!D(t) || !U || U.isDestroyed()) return null;
	let n = await Ln();
	return Z(() => Ne(U, t, n));
}), a.handle("files:openMultiple", async (e, t) => {
	if (!D(t) || !U || U.isDestroyed()) return [];
	let n = await Ln();
	return Z(() => Pe(U, t, n));
}), a.handle("files:openFolder", async (e, t) => {
	if (!D(t) || !U || U.isDestroyed()) return [];
	let n = await Ln();
	return Z(() => Fe(U, t, n));
}), a.handle("recording:choose-path", async (e, t, n) => {
	if (!U || U.isDestroyed() || typeof t != "string" || typeof n != "string") return null;
	let r = d.extname(n).replace(".", ""), a = d.extname(t).replace(".", ""), o = r || a, s = d.join(d.dirname(t), n);
	return Z(async () => {
		let e = await i.showSaveDialog(U, {
			defaultPath: s,
			filters: o ? [{
				name: o.toUpperCase(),
				extensions: [o]
			}] : void 0
		});
		return e.canceled || !e.filePath ? null : e.filePath;
	});
}), En && (r.whenReady().then(() => {
	n.setApplicationMenu(null), Mn(), r.on("browser-window-blur", (e, t) => {
		t === U && An();
	}), Rn(), zn(), Hn(), Gn(), r.on("activate", () => {
		t.getAllWindows().length === 0 && Hn();
	});
}), r.on("window-all-closed", () => {
	J?.close(), J = null, process.platform !== "darwin" && r.quit();
}), r.on("before-quit", () => {
	Y?.destroy(), Y = null;
}));
//#endregion
export {};
