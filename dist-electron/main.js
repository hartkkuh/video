import { createRequire as e } from "node:module";
import { BrowserWindow as t, Menu as n, app as r, dialog as i, ipcMain as a, nativeImage as o, net as s, screen as c, shell as l } from "electron";
import u from "node:fs";
import d from "node:path";
import { spawn as f } from "node:child_process";
import p from "node:fs/promises";
import m from "node:https";
import { URL as h, fileURLToPath as g } from "node:url";
//#region shared/vlc-media-extensions.ts
var _ = /* @__PURE__ */ ".3ga,.669,.a52,.aac,.ac3,.adt,.adts,.aif,.aifc,.aiff,.alac,.amb,.amr,.aob,.ape,.au,.awb,.caf,.dts,.dsf,.dff,.flac,.it,.kar,.m4a,.m4b,.m4p,.m5p,.mid,.mka,.mlp,.mod,.mpa,.mp1,.mp2,.mp3,.mpc,.mpga,.mus,.oga,.ogg,.oma,.opus,.qcp,.ra,.rmi,.s3m,.sid,.spx,.tak,.thd,.tta,.voc,.vqf,.w64,.wav,.wma,.wv,.xa,.xm".split(","), v = /* @__PURE__ */ ".3g2,.3gp,.3gp2,.3gpp,.amrec,.amv,.asf,.avi,.bik,.bin,.crf,.dav,.divx,.drc,.dv,.dvr-ms,.evo,.f4v,.flv,.gvi,.gxf,.iso,.k3g,.m1v,.m2v,.m2t,.m2ts,.m4v,.mkv,.mov,.mp2,.mp2v,.mp4,.mp4v,.mpe,.mpeg,.mpeg1,.mpeg2,.mpeg4,.mpg,.mpv2,.mts,.mtv,.mxf,.mxg,.nsv,.nuv,.ogg,.ogm,.ogv,.ogx,.ps,.qt,.rec,.rm,.rmvb,.rpl,.skm,.thp,.tod,.tp,.ts,.tts,.txd,.vob,.vp6,.vro,.webm,.wm,.wmv,.wtv,.xesc".split(","), ee = /* @__PURE__ */ ".cdg,.idx,.srt,.sub,.utf,.ass,.ssa,.aqt,.jss,.psb,.rt,.sami,.smi,.txt,.smil,.stl,.usf,.dks,.pjs,.mpl2,.mks,.vtt,.tt,.ttml,.dfxp,.scc".split(",");
function te(...e) {
	return [...new Set(e.flat())];
}
var ne = te(_, v), y = {
	audio: _,
	video: v,
	subtitles: ee,
	media: ne
}, re = new Set(ne);
function ie(e) {
	let t = d.extname(e).toLowerCase();
	return re.has(t);
}
function ae(e) {
	let t = [];
	for (let n of e.slice(1)) {
		if (!n || n === "." || n.startsWith("-") || /\.(exe|asar)$/i.test(n) && !ie(n)) continue;
		let e = d.resolve(n);
		if (ie(e)) {
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
function oe(e, t) {
	let n = se(e), r = se(t), i = Math.max(n.length, r.length);
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
function se(e) {
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
	name: "video"
}, ce = 12e3, le = 600 * 1e3, ue = ["main", "master"], S = "FMP Video Player", de = !1;
function C() {
	return r.getVersion();
}
async function fe() {
	let e = C(), t = [], n = [];
	try {
		let t = await xe(e);
		t && n.push(t);
	} catch (e) {
		t.push(`releases: ${T(e)}`);
	}
	try {
		n.push(...await Se(e));
	} catch (e) {
		t.push(`repo: ${T(e)}`);
	}
	let r = ye(n);
	return r ? be(e, r) : {
		status: "error",
		currentVersion: e,
		message: t.length > 0 ? t.join(" | ") : "Update source not found (private repository or missing public Release/update.json)"
	};
}
async function pe(e) {
	return typeof e != "string" || !/^https?:\/\//i.test(e) ? !1 : (await l.openExternal(e), !0);
}
async function me(e, t) {
	if (de) return {
		ok: !1,
		message: "Update already in progress"
	};
	if (typeof e != "string" || !/^https?:\/\//i.test(e)) return {
		ok: !1,
		message: "Invalid download URL"
	};
	de = !0;
	try {
		let n = await he(e), i = d.join(r.getPath("temp"), `FMP-Video-Player-Setup-${C()}-update.exe`);
		await ge(n, i, t);
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
		return de = !1, {
			ok: !1,
			message: T(e)
		};
	}
}
async function he(e) {
	let t = e.trim();
	if (/\.exe($|\?)/i.test(t)) return t;
	let n = await xe(C());
	if (n?.downloadUrl && /\.exe($|\?)/i.test(n.downloadUrl)) return n.downloadUrl;
	throw Error("Could not resolve installer download URL");
}
async function ge(e, t, n) {
	let r = [];
	try {
		await _e(e, t, n);
		return;
	} catch (e) {
		r.push(`chromium: ${T(e)}`);
	}
	try {
		await ve(e, t, !0, n);
		return;
	} catch (e) {
		r.push(`node: ${T(e)}`);
	}
	try {
		await ve(e, t, !1, n);
	} catch (e) {
		throw r.push(`node-insecure: ${T(e)}`), Error(r.join(" | "));
	}
}
async function _e(e, t, n) {
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
function ve(e, t, n, r) {
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
			timeout: le
		}, (e) => {
			let o = e.statusCode ?? 0;
			if (o >= 300 && o < 400 && e.headers.location) {
				e.resume(), ve(e.headers.location, t, n, r).then(i).catch(a);
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
		e && (!t || oe(e, t.version) > 0) && (t = {
			...n,
			version: e
		});
	}
	return t;
}
function be(e, t) {
	let n = b(t.version);
	return n ? oe(n, e) <= 0 ? {
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
	let t = await w(`https://api.github.com/repos/${x.owner}/${x.name}/releases/latest`, we(e));
	if (t.status === 200) return Ce(JSON.parse(t.body));
	if (t.status !== 404) throw Error(`GitHub latest release HTTP ${t.status}`);
	let n = await w(`https://api.github.com/repos/${x.owner}/${x.name}/releases?per_page=10`, we(e));
	if (n.status === 404) return null;
	if (n.status < 200 || n.status >= 300) throw Error(`GitHub releases HTTP ${n.status}`);
	let r = JSON.parse(n.body);
	if (!Array.isArray(r) || r.length === 0) return null;
	let i = r.find((e) => !e.draft && !e.prerelease) ?? r.find((e) => !e.draft) ?? r[0];
	return i ? Ce(i) : null;
}
async function Se(e) {
	let t = `https://github.com/${x.owner}/${x.name}/releases/latest`, n = [], r = [];
	for (let i of ue) {
		let a = `https://raw.githubusercontent.com/${x.owner}/${x.name}/${i}/update.json`;
		try {
			let o = await w(a, {
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
			r.push(`update.json@${i}: ${T(e)}`);
		}
		let o = `https://raw.githubusercontent.com/${x.owner}/${x.name}/${i}/package.json`;
		try {
			let a = await w(o, {
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
			r.push(`package.json@${i}: ${T(e)}`);
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
async function w(e, t) {
	let n = [];
	try {
		return await Te(e, t);
	} catch (e) {
		n.push(`chromium: ${T(e)}`);
	}
	try {
		return await Ee(e, t, !0);
	} catch (e) {
		n.push(`node: ${T(e)}`);
	}
	try {
		return await Ee(e, t, !1);
	} catch (e) {
		throw n.push(`node-insecure: ${T(e)}`), Error(n.join(" | "));
	}
}
async function Te(e, t) {
	if (!r.isReady()) throw Error("App is not ready");
	let n = await s.fetch(e, {
		method: "GET",
		headers: t,
		redirect: "follow",
		signal: AbortSignal.timeout(ce)
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
			timeout: ce
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
function T(e) {
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
function E(e) {
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
var D = {
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
({ ...D });
function Ie(e) {
	return e === "all" || e === "one" ? e : "off";
}
function Le(e) {
	return e === "video" ? "video" : "audio";
}
function Re(e) {
	return e === "encoding" ? "encoding" : "file";
}
function ze(e) {
	return Array.isArray(e) ? e.filter((e) => typeof e == "string" && e.length > 0) : [];
}
function Be(e) {
	return typeof e != "number" || !Number.isFinite(e) ? D.volume : Math.min(2, Math.max(0, e));
}
function Ve(e) {
	return typeof e != "number" || !Number.isFinite(e) ? D.playbackRate : Math.min(2, Math.max(.25, e));
}
function He(e, t) {
	return typeof e != "number" || !Number.isFinite(e) || t === 0 ? 0 : Math.min(Math.max(0, Math.floor(e)), t - 1);
}
function Ue(e) {
	return typeof e == "string" ? e : "";
}
function O(e, t, n, r) {
	return typeof e != "number" || !Number.isFinite(e) ? r : Math.min(n, Math.max(t, e));
}
function We(e) {
	let t = typeof e == "object" && e ? e : {}, n = Array.isArray(t.bands) ? t.bands : [];
	return {
		bands: Array.from({ length: 10 }, (e, t) => O(n[t], -12, 12, 0)),
		outputGain: O(t.outputGain, .5, 2, 1)
	};
}
function Ge(e) {
	let t = typeof e == "object" && e ? e : {};
	return {
		grayscale: O(t.grayscale, 0, 100, 0),
		contrast: O(t.contrast, 0, 3, 1),
		brightness: O(t.brightness, 0, 3, 1),
		saturation: O(t.saturation, 0, 3, 1),
		sepia: O(t.sepia, 0, 100, 0),
		hue: O(t.hue, 0, 360, 0),
		gamma: O(t.gamma, .01, 10, 1),
		blur: O(t.blur, 0, 10, 0)
	};
}
function Ke(e) {
	let t = e.replace(/\\/g, "/"), n = t.lastIndexOf("/");
	return n < 0 ? "" : e.slice(0, e.length - (t.length - n));
}
function qe(e) {
	let t = Ue(e.lastOpenDirectory);
	if (t.length > 0) return t;
	let n = ze(e.filePaths);
	return n.length === 0 ? "" : Ke(n[He(e.currentIndex, n.length)] ?? n[n.length - 1]);
}
function Je(e) {
	if (typeof e != "object" || !e) return D;
	let t = e;
	return {
		volume: Be(t.volume),
		volumeMuted: t.volumeMuted === !0,
		playbackRate: Ve(t.playbackRate),
		repeatMode: Ie(t.repeatMode),
		shuffleEnabled: t.shuffleEnabled === !0,
		lastOpenDirectory: qe(t),
		lastEffectsTab: Le(t.lastEffectsTab),
		lastMediaTab: Re(t.lastMediaTab),
		audioEffects: We(t.audioEffects),
		videoEffects: Ge(t.videoEffects)
	};
}
//#endregion
//#region electron/memory.ts
var Ye = D;
async function Xe(e) {
	if (!e) return !1;
	try {
		return (await p.stat(e)).isDirectory();
	} catch {
		return !1;
	}
}
async function k(e) {
	let t = Je(e);
	return !t.lastOpenDirectory || await Xe(t.lastOpenDirectory) ? t : {
		...t,
		lastOpenDirectory: ""
	};
}
function Ze(e) {
	return {
		...e,
		filePaths: [],
		currentIndex: 0
	};
}
//#endregion
//#region electron/settings.ts
var A = {
	language: "he",
	theme: "dark",
	controlsPosition: "bottom"
};
function Qe(e) {
	return e === "en" || e === "he" ? e : A.language;
}
function $e(e) {
	return e === "light" ? "light" : "dark";
}
function et(e) {
	return e === "top" ? "top" : A.controlsPosition;
}
function j(e) {
	if (typeof e != "object" || !e) return A;
	let t = e;
	return {
		language: Qe(t.language),
		theme: $e(t.theme),
		controlsPosition: et(t.controlsPosition)
	};
}
//#endregion
//#region electron/libvlc-path.ts
function tt() {
	return r.isPackaged ? d.join(process.resourcesPath, "libvlc") : d.join(r.getAppPath(), "libvlc");
}
//#endregion
//#region electron/vlc-effects.ts
var nt = {
	grayscale: 0,
	contrast: 1,
	brightness: 1,
	saturation: 1,
	sepia: 0,
	hue: 0,
	gamma: 1,
	blur: 0
};
function M(e) {
	return e.bands.every((e) => Math.abs(e) < .01) && Math.abs(e.outputGain - 1) < .01;
}
function rt(e) {
	return e.grayscale === 0 && Math.abs(e.contrast - 1) < .01 && Math.abs(e.brightness - 1) < .01 && Math.abs(e.saturation - 1) < .01 && e.sepia === 0 && Math.abs(e.hue) < .01 && Math.abs(e.gamma - 1) < .01 && e.blur === 0;
}
function it(e) {
	return 20 * Math.log10(Math.min(2, Math.max(.5, e)));
}
function at(e) {
	return Math.abs(e) <= 180 ? e : e - 360;
}
function ot(e) {
	let t = 1 - e.grayscale / 100, n = e.sepia / 100;
	return {
		enabled: !rt(e),
		brightness: e.brightness * (1 + n * .06),
		contrast: e.contrast * (1 + n * .08),
		saturation: e.saturation * t * (1 - n * .45),
		hue: at(e.hue + n * 55),
		gamma: e.gamma * (1 - n * .04)
	};
}
function st(e) {
	return e.blur > 0;
}
function ct(e) {
	return e.blur <= 0 ? [] : [":video-filter=gaussianblur", `:gaussianblur-sigma=${Math.max(.1, e.blur).toFixed(2)}`];
}
//#endregion
//#region electron/win32-api.ts
var lt = e(import.meta.url)("koffi"), ut = -16, dt = 2, ft = 5;
function N(e) {
	return typeof e == "bigint" ? e : typeof e == "number" && Number.isFinite(e) ? BigInt(Math.trunc(e)) : 0n;
}
function pt(e) {
	return e.length >= 8 ? e.readBigInt64LE(0) : BigInt(e.readUInt32LE(0));
}
var mt = class {
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
		let e = lt.load("user32.dll");
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
		let t = N(e);
		return t !== 0n && this.isWindow(t);
	}
	moveWindowRepaint(e, t, n, r, i, a = !0) {
		let o = N(e);
		return this.isValidWindow(o) ? this.moveWindow(o, Math.round(t), Math.round(n), Math.max(1, Math.round(r)), Math.max(1, Math.round(i)), a) : !1;
	}
	setWindowPosFlags(e, t, n, r, i, a, o) {
		let s = N(e);
		return this.isValidWindow(s) ? this.setWindowPos(s, N(t), Math.round(n), Math.round(r), Math.max(1, Math.round(i)), Math.max(1, Math.round(a)), o) : !1;
	}
	positionWindow(e, t, n, r, i, a = !1) {
		let o = N(e);
		if (!this.isValidWindow(o)) return !1;
		let s = 16 | (a ? 64 : 4);
		return this.setWindowPos(o, 0n, Math.round(t), Math.round(n), Math.max(1, Math.round(r)), Math.max(1, Math.round(i)), s);
	}
	hideWindow(e) {
		let t = N(e);
		this.isValidWindow(t) && (this.setWindowPos(t, 0n, 0, 0, 0, 0, 151), this.showWindow(t, 0));
	}
	showWindowNoActivate(e) {
		let t = N(e);
		this.isValidWindow(t) && (this.showWindow(t, 8), this.bringWindowToTop(t));
	}
	showChildNoActivate(e) {
		let t = N(e);
		this.isValidWindow(t) && this.setWindowPos(t, 0n, 0, 0, 0, 0, 83);
	}
	reparentPopupsToHost(e, t, n, r) {
		let i = N(t);
		if (!this.isValidWindow(i) || n <= 0 || r <= 0) return !1;
		let a = 0n, o = !1;
		for (let t = 0; t < 8; t += 1) {
			let t = N(this.findWindowExW(0n, a, e, null));
			if (!t) break;
			if (a = t, N(this.getParent(t)) === i) continue;
			let s = BigInt.asUintN(32, N(this.getWindowLongPtrW(t, ut))) & -2160328705n | 1342177280n;
			this.setWindowLongPtrW(t, ut, s), this.setParent(t, i), this.setWindowPos(t, 0n, 0, 0, 0, 0, 55), this.moveWindow(t, 0, 0, Math.round(n), Math.round(r), !0), o = !0;
		}
		return this.fitChildren(i, n, r), o;
	}
	fitChildren(e, t, n) {
		let r = N(e);
		if (!this.isValidWindow(r) || t <= 0 || n <= 0) return;
		let i = N(this.getWindow(r, ft)), a = Math.max(1, Math.round(t)), o = Math.max(1, Math.round(n));
		for (let e = 0; i && e < 16; e += 1) this.moveWindow(i, 0, 0, a, o, !0), i = N(this.getWindow(i, dt));
	}
}, ht = null;
function gt() {
	return process.platform === "win32" ? (ht ||= new mt(), ht) : null;
}
//#endregion
//#region electron/win32-video-host.ts
var _t = e(import.meta.url)("koffi"), vt = 134217728, yt = class {
	hwnd = 0n;
	parentHwnd = 0n;
	hwndAttachedToVlc = !1;
	bounds = null;
	createWindowExW;
	destroyWindow;
	getModuleHandleW;
	win32 = gt();
	constructor() {
		let e = _t.load("user32.dll"), t = _t.load("kernel32.dll");
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
		let n = N(e), r = Math.max(1, Math.round(t.width)), i = Math.max(1, Math.round(t.height)), a = Math.round(t.x), o = Math.round(t.y);
		if (this.hwnd && this.parentHwnd !== n && this.destroy(), !this.hwnd) {
			let e = N(this.getModuleHandleW(null));
			if (this.hwnd = N(this.createWindowExW(vt, "STATIC", "", 1174405120, a, o, r, i, n, 0n, e, 0n)), this.parentHwnd = n, !this.hwnd) throw Error("CreateWindowExW failed for libVLC video host");
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
}, bt = e(import.meta.url)("koffi"), xt = 3, P = 4, F = 6, St = 1.5, Ct = 200, wt = {
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
}, Tt = new Set(v);
function Et(e) {
	return Tt.has(d.extname(e).toLowerCase());
}
function Dt(e) {
	return wt[d.extname(e).toLowerCase()] ?? null;
}
function Ot(e, t) {
	let n = e.replace(/\\/g, "/").replace(/["']/g, ""), r = Et(t), i = [
		":vout=dummy",
		":aout=dummy",
		":no-video-title-show"
	];
	if (r) return [
		...i,
		`:sout=#transcode{vcodec=h264,venc=x264{preset=ultrafast},acodec=mp4a,ab=192,channels=2,samplerate=44100}:duplicate{dst=display,dst=std{access=file,mux=mp4,dst='${n}'}}`,
		":sout-all"
	];
	let a = Dt(e), o = a && a !== "raw" ? `std{access=file,mux=${a},dst='${n}'}` : `std{access=file,dst='${n}'}`;
	return [
		...i,
		`:sout=#duplicate{dst=display,dst=${o}}`,
		":sout-all"
	];
}
var kt = 0, At = 1, jt = 2, Mt = 3, Nt = 4, Pt = 5, Ft = class {
	instance = null;
	mediaPlayer = null;
	media = null;
	equalizer = null;
	videoHost = new yt();
	parentWindow = null;
	embedWatch = null;
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
	activeVideoEffects = { ...nt };
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
	win32 = gt();
	parentGeometryHandler = null;
	parentMinimizeHandler = null;
	parentRestoreHandler = null;
	controlsOverlayWindow = null;
	filesMenuOverlayWindow = null;
	constructor() {
		let e = tt();
		process.env.VLC_PLUGIN_PATH = d.join(e, "plugins"), process.env.PATH = `${e}${d.delimiter}${process.env.PATH ?? ""}`;
		let t = bt.load(d.join(e, "libvlc.dll"));
		this.libvlc_new = t.func("libvlc_new", "void *", ["int", "void *"]), this.libvlc_new_args = t.func("libvlc_new", "void *", ["int", "char **"]), this.libvlc_release = t.func("libvlc_release", "void", ["void *"]), this.libvlc_errmsg = t.func("libvlc_errmsg", "str", []), this.libvlc_media_new_path = t.func("libvlc_media_new_path", "void *", ["void *", "str"]), this.libvlc_media_add_option = t.func("libvlc_media_add_option", "void", ["void *", "str"]), this.libvlc_media_release = t.func("libvlc_media_release", "void", ["void *"]), this.libvlc_media_player_new = t.func("libvlc_media_player_new", "void *", ["void *"]), this.libvlc_media_player_release = t.func("libvlc_media_player_release", "void", ["void *"]), this.libvlc_media_player_set_media = t.func("libvlc_media_player_set_media", "void", ["void *", "void *"]), this.libvlc_media_player_set_hwnd = t.func("libvlc_media_player_set_hwnd", "void", ["void *", "void *"]), this.libvlc_video_set_mouse_input = t.func("libvlc_video_set_mouse_input", "void", ["void *", "uint"]), this.libvlc_video_set_key_input = t.func("libvlc_video_set_key_input", "void", ["void *", "uint"]), this.libvlc_media_player_play = t.func("libvlc_media_player_play", "int", ["void *"]), this.libvlc_media_player_set_pause = t.func("libvlc_media_player_set_pause", "void", ["void *", "int"]), this.libvlc_media_player_stop = t.func("libvlc_media_player_stop", "void", ["void *"]), this.libvlc_media_player_set_time = t.func("libvlc_media_player_set_time", "void", ["void *", "int64"]), this.libvlc_media_player_get_time = t.func("libvlc_media_player_get_time", "int64", ["void *"]), this.libvlc_media_player_get_length = t.func("libvlc_media_player_get_length", "int64", ["void *"]), this.libvlc_media_player_get_state = t.func("libvlc_media_player_get_state", "int", ["void *"]), this.libvlc_media_player_set_rate = t.func("libvlc_media_player_set_rate", "void", ["void *", "float"]), this.libvlc_audio_set_volume = t.func("libvlc_audio_set_volume", "int", ["void *", "int"]), this.libvlc_audio_equalizer_new = t.func("libvlc_audio_equalizer_new", "void *", []), this.libvlc_audio_equalizer_release = t.func("libvlc_audio_equalizer_release", "void", ["void *"]), this.libvlc_audio_equalizer_set_amp_at_index = t.func("libvlc_audio_equalizer_set_amp_at_index", "void", [
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
		this.endedNotified = !1, this.bindVideoDrawable(), this.prepareVideoOutput(), this.libvlc_media_player_play(this.mediaPlayer), this.claimEmbeddedVideo(), this.refreshEffectsAfterPipeline(), this.syncRecordingTransport("play");
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
			if (st(t) || st(e)) {
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
			for (let t of Ot(e, this.currentFilePath)) this.libvlc_media_add_option(n, t);
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
			return (a === P || a === F) && this.libvlc_media_player_set_pause(r, 1), this.recordingInstance = t, this.recordingPlayer = r, this.recordingMedia = n, this.recordingPath = e, this.pendingRate > 0 && this.pendingRate !== 1 && this.libvlc_media_player_set_rate(r, this.pendingRate), { ok: !0 };
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
				(e === P || e === F) && this.libvlc_media_player_set_pause(this.recordingPlayer, 1);
				return;
			}
			this.libvlc_media_player_set_pause(this.recordingPlayer, 0);
		}
	}
	isRecording() {
		return this.recordingPath !== null;
	}
	getState() {
		let e = this.libvlc_media_player_get_state(this.mediaPlayer), t = Math.max(0, Number(this.libvlc_media_player_get_time(this.mediaPlayer))), n = Math.max(0, Number(this.libvlc_media_player_get_length(this.mediaPlayer))), r = e === xt, i = e === P, a = e === F;
		return a && !this.endedNotified && (this.endedNotified = !0, this.onEnded?.()), {
			playing: r,
			paused: i,
			ended: a,
			currentTimeMs: t,
			durationMs: n
		};
	}
	destroy() {
		this.stop(), this.stopEmbedWatch(), this.hideVideoWindow(), this.detachParentListeners(), this.videoHost.destroy(), this.teardownRecordingPlayer(), this.media &&= (this.libvlc_media_release(this.media), null), this.equalizer &&= (this.libvlc_audio_equalizer_release(this.equalizer), null), this.mediaPlayer &&= (this.libvlc_media_player_release(this.mediaPlayer), null), this.instance &&= (this.libvlc_release(this.instance), null);
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
		this.pendingAudioEffects && !M(this.pendingAudioEffects) && this.applyAudioEffects(this.pendingAudioEffects);
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
		this.libvlc_audio_set_volume(this.mediaPlayer, Ct), this.applyVolumeBoostEqualizer(e);
	}
	uiVolumeToLibVlcVolume(e) {
		return Math.min(Ct, Math.round(e * 100 * St));
	}
	clearVolumeBoostEqualizer() {
		(!this.pendingAudioEffects || M(this.pendingAudioEffects)) && this.libvlc_media_player_set_equalizer(this.mediaPlayer, null);
	}
	applyVolumeBoostEqualizer(e) {
		let t = Math.min(20, Math.max(-20, 20 * Math.log10(e) + 6.02));
		this.equalizer ||= this.libvlc_audio_equalizer_new(), this.libvlc_audio_equalizer_set_preamp(this.equalizer, t);
		for (let e = 0; e < 10; e += 1) this.libvlc_audio_equalizer_set_amp_at_index(this.equalizer, 0, e);
		this.libvlc_media_player_set_equalizer(this.mediaPlayer, this.equalizer);
	}
	applyAudioEffects(e) {
		if (M(e)) {
			this.libvlc_media_player_set_equalizer(this.mediaPlayer, null);
			return;
		}
		if (this.equalizer ||= this.libvlc_audio_equalizer_new(), this.equalizer) {
			this.libvlc_audio_equalizer_set_preamp(this.equalizer, it(e.outputGain));
			for (let t = 0; t < 10; t += 1) {
				let n = e.bands[t] ?? 0;
				this.libvlc_audio_equalizer_set_amp_at_index(this.equalizer, n, t);
			}
			this.libvlc_media_player_set_equalizer(this.mediaPlayer, this.equalizer);
		}
	}
	applyVideoAdjust(e) {
		let t = ot(e);
		this.libvlc_video_set_adjust_int(this.mediaPlayer, kt, +!!t.enabled), t.enabled && (this.libvlc_video_set_adjust_float(this.mediaPlayer, jt, t.brightness), this.libvlc_video_set_adjust_float(this.mediaPlayer, At, t.contrast), this.libvlc_video_set_adjust_float(this.mediaPlayer, Nt, t.saturation), this.libvlc_video_set_adjust_float(this.mediaPlayer, Mt, t.hue), this.libvlc_video_set_adjust_float(this.mediaPlayer, Pt, t.gamma));
	}
	createMedia(e, t) {
		let n = this.libvlc_media_new_path(this.instance, e);
		if (!n) return null;
		for (let e of ct(t)) this.libvlc_media_add_option(n, e);
		return n;
	}
	reloadMediaPreservePosition() {
		if (!this.currentFilePath || !this.mediaLoaded) return;
		let e = Math.max(0, Number(this.libvlc_media_player_get_time(this.mediaPlayer))), t = this.libvlc_media_player_get_state(this.mediaPlayer), n = t === xt || t === P;
		if (this.libvlc_media_player_stop(this.mediaPlayer), this.media &&= (this.libvlc_media_release(this.media), null), this.media = this.createMedia(this.currentFilePath, this.activeVideoEffects), !this.media) {
			this.mediaLoaded = !1;
			return;
		}
		if (this.libvlc_media_player_set_media(this.mediaPlayer, this.media), e > 0 && this.libvlc_media_player_set_time(this.mediaPlayer, e), n) {
			this.bindVideoDrawable(), this.prepareVideoOutput(), this.libvlc_media_player_play(this.mediaPlayer), this.claimEmbeddedVideo(), this.refreshEffectsAfterPipeline();
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
		let t = pt(this.parentWindow.getNativeWindowHandle()), n = e ?? this.videoHost.currentBounds ?? {
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
}, It = new Set(_);
function Lt(e) {
	return It.has(d.extname(e).toLowerCase());
}
function Rt(e, t) {
	return (e[t] & 127) << 21 | (e[t + 1] & 127) << 14 | (e[t + 2] & 127) << 7 | e[t + 3] & 127;
}
function zt(e) {
	if (e.length < 10 || e.toString("ascii", 0, 3) !== "ID3") return null;
	let t = e[3], n = Rt(e, 6), r = 10, i = Math.min(e.length, 10 + n);
	for (; r < i;) {
		let n, a, o;
		if (t === 2) {
			if (r + 6 > i) break;
			n = e.toString("ascii", r, r + 3), a = e[r + 3] << 16 | e[r + 4] << 8 | e[r + 5], o = r + 6;
		} else {
			if (r + 10 > i) break;
			n = e.toString("ascii", r, r + 4).replace(/\0/g, ""), a = t === 4 ? Rt(e, r + 4) : e.readUInt32BE(r + 4), o = r + 10;
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
function Bt(e) {
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
function Vt(e) {
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
function Ht(e) {
	return Bt(e);
}
function Ut(e, t) {
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
async function Wt(e, t = 320) {
	if (!Lt(e)) return null;
	try {
		let n = await p.readFile(e), r = d.extname(e).toLowerCase(), i = null;
		return i = r === ".mp3" || r === ".mp2" || r === ".mp1" || r === ".mpga" ? zt(n) : r === ".flac" ? Vt(n) : r === ".m4a" || r === ".m4b" || r === ".m4p" || r === ".mp4" ? Ht(n) : zt(n), i ? Ut(i, t) : null;
	} catch {
		return null;
	}
}
async function Gt(e, t = 320) {
	if (!e) return null;
	let n = e;
	if (n.startsWith("file://")) try {
		n = decodeURIComponent(new URL(n).pathname), process.platform === "win32" && n.startsWith("/") && (n = n.slice(1));
	} catch {
		return null;
	}
	if (!d.isAbsolute(n)) return null;
	try {
		return Ut(await p.readFile(n), t);
	} catch {
		return null;
	}
}
//#endregion
//#region electron/media-probe.ts
var I = e(import.meta.url)("koffi"), Kt = 3, qt = 7, Jt = 0, Yt = 2, Xt = 3, Zt = 4, Qt = 0, $t = 1, en = 2, L = {
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
}, tn = I.struct({
	i_channels: "uint",
	i_rate: "uint"
}), nn = I.struct({
	i_height: "uint",
	i_width: "uint",
	i_sar_num: "uint",
	i_sar_den: "uint",
	i_frame_rate_num: "uint",
	i_frame_rate_den: "uint"
}), rn = I.struct({ psz_encoding: "str" }), an = I.struct({
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
function on(e) {
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
function sn(e, t, n) {
	return Number.isFinite(e) ? Math.min(n, Math.max(t, e)) : t;
}
var cn = class {
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
		let e = tt();
		process.env.VLC_PLUGIN_PATH = d.join(e, "plugins"), process.env.PATH = `${e}${d.delimiter}${process.env.PATH ?? ""}`;
		let t = I.load(d.join(e, "libvlc.dll"));
		this.libvlc_new = t.func("libvlc_new", "void *", ["int", "void *"]), this.libvlc_release = t.func("libvlc_release", "void", ["void *"]), this.libvlc_media_new_path = t.func("libvlc_media_new_path", "void *", ["void *", "str"]), this.libvlc_media_add_option = t.func("libvlc_media_add_option", "void", ["void *", "str"]), this.libvlc_media_release = t.func("libvlc_media_release", "void", ["void *"]), this.libvlc_media_parse_with_options = t.func("libvlc_media_parse_with_options", "int", [
			"void *",
			"int",
			"int"
		]), this.libvlc_media_get_parsed_status = t.func("libvlc_media_get_parsed_status", "int", ["void *"]), this.libvlc_media_get_meta = t.func("libvlc_media_get_meta", "void *", ["void *", "int"]), this.libvlc_media_get_duration = t.func("libvlc_media_get_duration", "int64", ["void *"]), this.libvlc_media_tracks_get = t.func("libvlc_media_tracks_get", "uint", ["void *", I.out(I.pointer("void *"))]), this.libvlc_media_tracks_release = t.func("libvlc_media_tracks_release", "void", ["void *", "uint"]), this.libvlc_free = t.func("libvlc_free", "void", ["void *"]), this.libvlc_media_player_new = t.func("libvlc_media_player_new", "void *", ["void *"]), this.libvlc_media_player_release = t.func("libvlc_media_player_release", "void", ["void *"]), this.libvlc_media_player_set_media = t.func("libvlc_media_player_set_media", "void", ["void *", "void *"]), this.libvlc_media_player_set_hwnd = t.func("libvlc_media_player_set_hwnd", "void", ["void *", "void *"]), this.libvlc_media_player_play = t.func("libvlc_media_player_play", "int", ["void *"]), this.libvlc_media_player_stop = t.func("libvlc_media_player_stop", "void", ["void *"]), this.libvlc_media_player_set_time = t.func("libvlc_media_player_set_time", "void", ["void *", "int64"]), this.libvlc_media_player_get_length = t.func("libvlc_media_player_get_length", "int64", ["void *"]), this.libvlc_media_player_get_state = t.func("libvlc_media_player_get_state", "int", ["void *"]), this.libvlc_audio_set_volume = t.func("libvlc_audio_set_volume", "int", ["void *", "int"]), this.libvlc_video_take_snapshot = t.func("libvlc_video_take_snapshot", "int", [
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
		let n = Math.round(sn(t.width ?? 320, 16, 1920)), r = this.libvlc_media_new_path(this.instance, e);
		if (!r) return null;
		try {
			await this.parseMedia(r);
			let i = await Gt(this.getMeta(r, L.artworkUrl), n);
			if (i) return {
				filePath: e,
				...i
			};
			let a = await Wt(e, n);
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
			let l = pt(c.getNativeWindowHandle());
			if (this.libvlc_media_player_set_hwnd(s, l), c.showInactive(), this.libvlc_audio_set_volume(s, 0), this.libvlc_media_player_play(s) !== 0 || !await this.waitForPlaying(s, 5e3)) return null;
			let u = Math.max(0, Number(this.libvlc_media_player_get_length(s))), f = typeof a.timeMs == "number" ? sn(a.timeMs, 0, u > 0 ? u : a.timeMs) : u > 1500 ? Math.min(u - 500, Math.max(1e3, Math.floor(u * .1))) : 0;
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
	destroy() {
		this.instance &&= (this.libvlc_release(this.instance), null);
	}
	async parseMedia(e) {
		if (this.libvlc_media_parse_with_options(e, Jt, 5e3) !== 0) return !1;
		let t = Date.now() + 6e3;
		for (; Date.now() < t;) {
			let t = this.libvlc_media_get_parsed_status(e);
			if (t === Zt) return !0;
			if (t === Yt || t === Xt) return !1;
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
				let r = I.decode(n, an), a = r.i_type === Qt ? "audio" : r.i_type === $t ? "video" : r.i_type === en ? "subtitle" : "unknown", o = {
					id: r.i_id,
					kind: a,
					codec: on(r.i_codec),
					codecFourcc: on(r.i_codec),
					originalFourcc: on(r.i_original_fourcc),
					bitrate: r.i_bitrate >>> 0,
					profile: r.i_profile,
					level: r.i_level,
					language: z(r.psz_language),
					description: z(r.psz_description)
				};
				if (a === "audio" && r.media) {
					let e = I.decode(r.media, tn);
					o.channels = e.i_channels, o.sampleRate = e.i_rate;
				} else if (a === "video" && r.media) {
					let e = I.decode(r.media, nn);
					o.width = e.i_width, o.height = e.i_height, o.frameRate = e.i_frame_rate_den ? Math.round(e.i_frame_rate_num / e.i_frame_rate_den * 1e3) / 1e3 : 0, o.sampleAspectRatio = e.i_sar_den ? `${e.i_sar_num}:${e.i_sar_den}` : void 0;
				} else a === "subtitle" && r.media && (o.encoding = z(I.decode(r.media, rn).psz_encoding));
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
			if (t === Kt) return !0;
			if (t === qt) return !1;
			await R(30);
		}
		return !1;
	}
}, ln = null;
function un() {
	return ln ||= new cn(), ln;
}
//#endregion
//#region electron/main.ts
var B = d.dirname(g(import.meta.url)), dn = !r.isPackaged, V = d.join(B, "../dist/index.html"), H = null, U = null, W = null, G = !1, K = !1, fn = null, q = null, J = null, Y = !1, pn = ae(process.argv);
r.setAppUserModelId("com.fmp.videoplayer");
var mn = r.requestSingleInstanceLock();
mn ? r.on("second-instance", (e, t) => {
	let n = ae(t);
	n.length > 0 && (pn = n), !(!H || H.isDestroyed()) && (H.isMinimized() && H.restore(), H.show(), H.focus(), n.length > 0 && H.webContents.send("app:open-files", n));
}) : r.quit();
async function X(e) {
	let t = !!(U && !U.isDestroyed() && U.isVisible()), n = !!(W && !W.isDestroyed() && W.isVisible());
	t && U?.hide(), n && (W?.hide(), W?.setIgnoreMouseEvents(!0, { forward: !0 })), K = !1, J?.suspendVideoOverlay();
	try {
		return H && !H.isDestroyed() && H.focus(), await e();
	} finally {
		J?.resumeVideoOverlay(), hn(t);
	}
}
function hn(e) {
	!e || !U || U.isDestroyed() || (Y = !0, !(!H || H.isDestroyed() || !H.isFocused()) && (U.showInactive(), J?.raiseControlsOverlay(), H.webContents.send("controls:request-state-relayed"), H.webContents.send("vlc:parent-geometry-changed")));
}
function gn() {
	U && !U.isDestroyed() && (U.setAlwaysOnTop(!1), U.hide(), U.webContents.send("controls:suspended-relayed")), W && !W.isDestroyed() && (K = !1, W.setAlwaysOnTop(!1), W.webContents.send("files-menu:hide-relayed"), W.hide(), W.setIgnoreMouseEvents(!0, { forward: !0 })), J?.suspendVideoOverlay();
}
function _n() {
	if (!H || H.isDestroyed() || H.isMinimized() || !H.isVisible()) return !1;
	if (H.isFocused()) return !0;
	let e = t.getFocusedWindow();
	return e === U || e === W;
}
function vn() {
	let e = () => {
		if (_n()) {
			t.getFocusedWindow() === W && U && !U.isDestroyed() && (U.setAlwaysOnTop(!1), U.hide(), U.webContents.send("controls:suspended-relayed"));
			return;
		}
		gn();
	};
	setTimeout(e, 50), setTimeout(e, 200);
}
var yn = null;
function bn() {
	yn ||= setInterval(() => {
		!U || U.isDestroyed() || !U.isVisible() || _n() || gn();
	}, 300);
}
function xn() {
	!H || H.isDestroyed() || H.isMinimized() || !H.isVisible() || !H.isFocused() || (J?.resumeVideoOverlay(), Y && U && !U.isDestroyed() && (U.setAlwaysOnTop(!0, "pop-up-menu"), U.showInactive(), J?.raiseControlsOverlay(), H.webContents.send("controls:request-state-relayed")));
}
var Z = null;
function Sn() {
	return d.join(r.getPath("userData"), "settings.json");
}
function Cn() {
	return d.join(r.getPath("userData"), "memory.json");
}
async function wn(e) {
	return Z = e, await p.mkdir(r.getPath("userData"), { recursive: !0 }), await p.writeFile(Sn(), `${JSON.stringify({
		settings: e.settings,
		memory: e.memory
	}, null, 2)}\n`, "utf8"), e;
}
async function Q() {
	if (Z) return Z;
	let e = null;
	try {
		e = JSON.parse(await p.readFile(Sn(), "utf8"));
	} catch {
		e = null;
	}
	if (e && typeof e == "object" && ("settings" in e || "memory" in e)) {
		let t = e, n = {
			settings: j(t.settings),
			memory: await k(t.memory)
		};
		return Z = n, n;
	}
	let t = e ? j(e) : A, n;
	try {
		n = await k(JSON.parse(await p.readFile(Cn(), "utf8")));
	} catch {
		n = await k(Ye);
	}
	let r = await wn({
		settings: t,
		memory: n
	});
	try {
		await p.unlink(Cn());
	} catch {}
	return r;
}
async function Tn() {
	return (await Q()).memory.lastOpenDirectory;
}
function En() {
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
function Dn() {
	a.handle("media-probe:metadata", async (e, t) => {
		try {
			return await un().extractMetadata(t);
		} catch (e) {
			return console.warn("media-probe:metadata failed:", e), null;
		}
	}), a.handle("media-probe:tracks", async (e, t) => {
		try {
			return await un().extractTracks(t);
		} catch (e) {
			return console.warn("media-probe:tracks failed:", e), [];
		}
	}), a.handle("media-probe:thumbnail", async (e, t, n) => {
		try {
			return await un().extractThumbnail(t, n ?? {});
		} catch (e) {
			return console.warn("media-probe:thumbnail failed:", e), null;
		}
	});
}
function On() {
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
		d.join(B, ".."),
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
function kn(e) {
	try {
		J?.destroy(), J = new Ft(), J.attachParent(e), J.setOnEnded(() => {
			H?.webContents.send("vlc:ended");
		});
	} catch (e) {
		console.error("Failed to initialize libVLC:", e), J = null;
	}
}
function An() {
	H = new t({
		width: 1280,
		height: 800,
		minWidth: 960,
		minHeight: 600,
		show: !1,
		icon: On(),
		backgroundColor: "#0b1020",
		webPreferences: {
			preload: d.join(B, "preload.cjs"),
			contextIsolation: !0,
			nodeIntegration: !1,
			sandbox: !1,
			backgroundThrottling: !1
		}
	}), H.once("ready-to-show", () => {
		H?.show();
	}), H.loadFile(V), kn(H), H.on("blur", vn), H.on("focus", xn), H.on("hide", vn), H.on("show", xn), H.on("minimize", () => {
		gn();
	}), H.on("restore", xn), dn && H.webContents.openDevTools({ mode: "detach" }), H.on("closed", () => {
		U && !U.isDestroyed() && U.destroy(), U = null, W && !W.isDestroyed() && W.destroy(), W = null, J?.destroy(), J = null, H = null;
	});
}
function jn() {
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
			preload: d.join(B, "preload.cjs"),
			contextIsolation: !0,
			nodeIntegration: !1,
			sandbox: !1,
			backgroundThrottling: !1
		}
	}), U.setIgnoreMouseEvents(!0, { forward: !0 }), U.setAlwaysOnTop(!0, "pop-up-menu"), U.loadFile(V, { hash: "/controls-overlay" }), J?.setControlsOverlayWindow(U), U.on("closed", () => {
		J?.setControlsOverlayWindow(null), U = null;
	}), U);
}
function Mn() {
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
			preload: d.join(B, "preload.cjs"),
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
function Nn() {
	!dn || q || (q = u.watch(V, () => {
		H?.webContents.reload(), U && !U.isDestroyed() && U.webContents.reload(), W && !W.isDestroyed() && W.webContents.reload();
	}));
}
a.handle("updates:get-version", () => C()), a.handle("updates:check", async () => fe()), a.handle("updates:open-download", async (e, t) => typeof t == "string" ? pe(t) : !1), a.handle("updates:install", async (e, t) => typeof t == "string" ? me(t, (t) => {
	e.sender.isDestroyed() || e.sender.send("updates:download-progress", t);
}) : {
	ok: !1,
	message: "Invalid download URL"
}), a.handle("app:get-launch-files", () => {
	let e = pn;
	return pn = [], e;
}), a.handle("settings:get", async () => (await Q()).settings);
function Pn(e) {
	for (let t of [
		H,
		U,
		W
	]) t && !t.isDestroyed() && t.webContents.send("settings:changed-relayed", e);
}
a.handle("settings:save", async (e, t) => {
	let n = await Q(), r = j(t);
	return await wn({
		...n,
		settings: r
	}), Pn(r), r;
}), a.handle("memory:get", async () => Ze((await Q()).memory)), a.handle("memory:save", async (e, t) => {
	let n = await Q(), r = await k(t);
	return await wn({
		...n,
		memory: r
	}), r;
});
function $() {
	if (!W || W.isDestroyed()) {
		K = !1;
		return;
	}
	K = !1, W.webContents.send("files-menu:show-relayed", fn), J?.raiseFilesMenuOverlay();
}
a.on("files-menu:ready", () => {
	G = !0, K && $();
}), a.on("files-menu:show", (e, t, n) => {
	let r = Mn();
	if (!r || !H || H.isDestroyed()) return;
	fn = n ?? null;
	let i = H.getContentBounds();
	if (r.setBounds({
		x: Math.round(i.x + t.x),
		y: Math.round(i.y + t.y),
		width: Math.max(1, Math.round(t.width)),
		height: Math.max(1, Math.round(t.height))
	}), r.setIgnoreMouseEvents(!1), r.isVisible() || r.showInactive(), K = !0, G && !r.webContents.isLoading()) {
		$();
		return;
	}
	r.webContents.isLoading() && r.webContents.once("did-finish-load", () => {
		G && $();
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
	let n = jn();
	if (!n || !H || H.isDestroyed()) return;
	Y = !0;
	let r = H.getContentBounds();
	n.setBounds({
		x: Math.round(r.x + t.x),
		y: Math.round(r.y + t.y),
		width: Math.max(1, Math.round(t.width)),
		height: Math.max(1, Math.round(t.height))
	}), H.isFocused() && (n.isVisible() || n.showInactive(), J?.raiseControlsOverlay());
});
function Fn() {
	if (!U || U.isDestroyed() || !U.isVisible()) return null;
	let e = c.getCursorScreenPoint(), t = U.getBounds(), n = e.x - t.x, r = e.y - t.y;
	return {
		x: n,
		y: r,
		inside: n >= 0 && r >= 0 && n <= t.width && r <= t.height
	};
}
a.handle("controls:cursor-point", () => Fn()), a.on("controls:raise", () => {
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
	if (!E(t) || !H || H.isDestroyed()) return null;
	let n = await Tn();
	return X(() => Ne(H, t, n));
}), a.handle("files:openMultiple", async (e, t) => {
	if (!E(t) || !H || H.isDestroyed()) return [];
	let n = await Tn();
	return X(() => Pe(H, t, n));
}), a.handle("files:openFolder", async (e, t) => {
	if (!E(t) || !H || H.isDestroyed()) return [];
	let n = await Tn();
	return X(() => Fe(H, t, n));
}), a.handle("recording:choose-path", async (e, t, n) => {
	if (!H || H.isDestroyed() || typeof t != "string" || typeof n != "string") return null;
	let r = d.extname(n).replace(".", ""), a = d.extname(t).replace(".", ""), o = r || a, s = d.join(d.dirname(t), n);
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
}), mn && (r.whenReady().then(() => {
	n.setApplicationMenu(null), bn(), r.on("browser-window-blur", (e, t) => {
		t === H && vn();
	}), En(), Dn(), An(), Nn(), r.on("activate", () => {
		t.getAllWindows().length === 0 && An();
	});
}), r.on("window-all-closed", () => {
	q?.close(), q = null, process.platform !== "darwin" && r.quit();
}), r.on("before-quit", () => {
	J?.destroy(), J = null;
}));
//#endregion
export {};
