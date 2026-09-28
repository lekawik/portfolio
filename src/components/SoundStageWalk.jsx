import { useEffect, useMemo, useRef, useState } from "react";

// The living room, roughly as SoundStage knows it (metres, y up). The listener is
// dragged around a fixed sound object. Two things are shown at once:
//  - the numbers the Mac app would send to each speaker (same formulas as the app:
//    delay = T - d/c, gain = (d/d0)^0.5 clamped to +-3 dB, pairwise VBAP weights);
//  - a binaural rendering in the browser (Web Audio HRTF panner) for headphones,
//    which is what the real system cannot do: put the source at its true distance.

const ROOM = { w: 6, h: 5 };
const SPEAKERS = [
    { id: "L", x: 1.2, y: 4.8 }, { id: "C", x: 3.0, y: 4.9 }, { id: "R", x: 4.8, y: 4.8 },
    { id: "Ls", x: 0.2, y: 2.2 }, { id: "Rs", x: 5.8, y: 2.2 }, { id: "Lb", x: 3.0, y: 0.2 },
];
const REF = { x: 3.0, y: 2.2 };
const OBJECT = { x: 3.4, y: 3.0 };
const C_SOUND = 343;
const ACCENT = "rgba(88, 86, 214, 1)";
const OBJ = "#f0a030";
const LISTENER = "#34c759";

function angle(from, to) { return Math.atan2(to.y - from.y, to.x - from.x); }

function vbap(listener, object) {
    const az = angle(listener, object);
    const sp = SPEAKERS.map((s) => ({ ...s, phi: angle(listener, s) })).sort((a, b) => a.phi - b.phi);
    const w = Object.fromEntries(SPEAKERS.map((s) => [s.id, 0]));
    for (let i = 0; i < sp.length; i++) {
        const a = sp[i], b = sp[(i + 1) % sp.length];
        let gap = b.phi - a.phi; if (gap <= 0) gap += 2 * Math.PI;
        let into = az - a.phi; if (into < 0) into += 2 * Math.PI;
        if (into > gap) continue;
        let g1, g2;
        if (gap < Math.PI - 1e-3) {
            g1 = Math.max(0, Math.sin(b.phi - az) / Math.sin(gap));
            g2 = Math.max(0, Math.sin(az - a.phi) / Math.sin(gap));
            const n = Math.hypot(g1, g2) || 1; g1 /= n; g2 /= n;
        } else {
            const t = into / gap; g1 = Math.cos(t * Math.PI / 2); g2 = Math.sin(t * Math.PI / 2);
        }
        w[a.id] += g1; w[b.id] += g2;
        break;
    }
    return w;
}

function compensation(listener) {
    const d0 = SPEAKERS.map((s) => Math.hypot(REF.x - s.x, REF.y - s.y));
    const T = (Math.max(...d0) + 3) / C_SOUND;
    return SPEAKERS.map((s, i) => {
        const d = Math.hypot(listener.x - s.x, listener.y - s.y);
        const corr = Math.min(Math.max(Math.pow(d / d0[i], 0.5), Math.pow(10, -3 / 20)), Math.pow(10, 3 / 20));
        return { id: s.id, d, delayMs: Math.max(0, T - d / C_SOUND) * 1000, gainDB: 20 * Math.log10(corr) };
    });
}

function makeVoiceLikeBuffer(ctx) {
    const sr = ctx.sampleRate, n = Math.floor(1.6 * sr);
    const buf = ctx.createBuffer(1, n, sr), out = buf.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0;
    const syll = [0.05, 0.25, 0.45, 0.7, 0.95, 1.2];
    for (let i = 0; i < n; i++) {
        const w = Math.random() * 2 - 1;
        b0 = 0.99765 * b0 + w * 0.099; b1 = 0.963 * b1 + w * 0.2965; b2 = 0.57 * b2 + w * 1.0526;
        const pink = (b0 + b1 + b2 + w * 0.1848) * 0.05;
        const t = i / sr;
        let env = 0;
        for (const s of syll) { const u = (t - s) / 0.12; if (u > 0 && u < 1) env = Math.max(env, Math.sin(Math.PI * u)); }
        const buzz = Math.sin(2 * Math.PI * 140 * t) * 0.35 + Math.sin(2 * Math.PI * 280 * t) * 0.2;
        out[i] = (pink * 1.5 + buzz * pink * 3) * env;
    }
    return buf;
}

export default function SoundStageWalk() {
    const [listener, setListener] = useState({ x: 2.2, y: 1.6 });
    const [playing, setPlaying] = useState(false);
    const audio = useRef(null);
    const svgRef = useRef(null);
    const dragging = useRef(false);

    const comp = useMemo(() => compensation(listener), [listener]);
    const weights = useMemo(() => vbap(listener, OBJECT), [listener]);
    const r = Math.hypot(OBJECT.x - listener.x, OBJECT.y - listener.y);
    const level = 20 * Math.log10(1 / Math.max(r, 0.5));

    useEffect(() => {
        const a = audio.current;
        if (!a) return;
        const { ctx, panner } = a;
        const now = ctx.currentTime;
        ctx.listener.positionX?.setTargetAtTime(listener.x, now, 0.05);
        ctx.listener.positionZ?.setTargetAtTime(-listener.y, now, 0.05);
        if (ctx.listener.forwardZ) {
            ctx.listener.forwardX.value = 0; ctx.listener.forwardY.value = 0; ctx.listener.forwardZ.value = -1;
            ctx.listener.upX.value = 0; ctx.listener.upY.value = 1; ctx.listener.upZ.value = 0;
        }
        panner.positionX.value = OBJECT.x; panner.positionY.value = 0; panner.positionZ.value = -OBJECT.y;
    }, [listener, playing]);

    const toggle = async () => {
        if (playing) {
            audio.current?.src.stop(); audio.current?.ctx.close(); audio.current = null; setPlaying(false); return;
        }
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const src = ctx.createBufferSource();
        src.buffer = makeVoiceLikeBuffer(ctx); src.loop = true;
        const panner = ctx.createPanner();
        panner.panningModel = "HRTF"; panner.distanceModel = "inverse"; panner.refDistance = 0.5; panner.rolloffFactor = 1;
        const gain = ctx.createGain(); gain.gain.value = 0.6;
        src.connect(panner).connect(gain).connect(ctx.destination);
        src.start();
        audio.current = { ctx, src, panner };
        setPlaying(true);
    };
    useEffect(() => () => { audio.current?.ctx.close(); }, []);

    const toRoom = (evt) => {
        const svg = svgRef.current, pt = svg.createSVGPoint();
        const s = evt.touches ? evt.touches[0] : evt;
        pt.x = s.clientX; pt.y = s.clientY;
        const p = pt.matrixTransform(svg.getScreenCTM().inverse());
        return { x: Math.min(Math.max(p.x, 0.3), ROOM.w - 0.3), y: Math.min(Math.max(ROOM.h - p.y, 0.3), ROOM.h - 0.3) };
    };
    const start = (e) => { dragging.current = true; setListener(toRoom(e)); };
    const move = (e) => { if (dragging.current) { e.preventDefault(); setListener(toRoom(e)); } };
    const stop = () => { dragging.current = false; };
    const S = (p) => ({ x: p.x, y: ROOM.h - p.y });
    const l = S(listener), o = S(OBJECT);

    return (
        <div className="not-prose rounded-[28px] bg-background-secondary dark:bg-background-secondary-dark p-5 sm:p-6">
            <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                    <p className="text-title3 font-bold text-primary-text dark:text-primary-text-dark">Marche autour de la voix</p>
                    <p className="text-sm text-secondary-text dark:text-secondary-text-dark">
                        Déplacez le point vert. Au casque, le navigateur rend la voix en binaural à sa vraie distance ; en dessous, ce que l'app enverrait à chaque enceinte.
                    </p>
                </div>
                <button onClick={toggle}
                    className={`shrink-0 rounded-full px-5 py-2.5 text-body font-medium transition-colors ${playing ? "bg-primary-text text-background-primary dark:bg-primary-text-dark dark:text-background-primary-dark" : "bg-accent text-white hover:opacity-90"}`}>
                    {playing ? "Arrêter" : "Écouter"}
                </button>
            </div>

            <svg ref={svgRef} viewBox={`0 0 ${ROOM.w} ${ROOM.h}`}
                className="w-full touch-none select-none rounded-3xl bg-background-primary dark:bg-background-primary-dark"
                style={{ aspectRatio: `${ROOM.w} / ${ROOM.h}` }}
                onMouseDown={start} onMouseMove={move} onMouseUp={stop} onMouseLeave={stop}
                onTouchStart={start} onTouchMove={move} onTouchEnd={stop}>
                <defs>
                    <radialGradient id="ssw-obj" r="0.5"><stop offset="0" stopColor={OBJ} stopOpacity="0.35" /><stop offset="1" stopColor={OBJ} stopOpacity="0" /></radialGradient>
                    <radialGradient id="ssw-lis" r="0.5"><stop offset="0" stopColor={LISTENER} stopOpacity="0.35" /><stop offset="1" stopColor={LISTENER} stopOpacity="0" /></radialGradient>
                </defs>
                {/* soft grid */}
                {Array.from({ length: ROOM.w + 1 }, (_, i) => <line key={`v${i}`} x1={i} y1={0} x2={i} y2={ROOM.h} stroke="currentColor" strokeOpacity="0.06" strokeWidth="0.01" />)}
                {Array.from({ length: ROOM.h + 1 }, (_, i) => <line key={`h${i}`} x1={0} y1={i} x2={ROOM.w} y2={i} stroke="currentColor" strokeOpacity="0.06" strokeWidth="0.01" />)}
                {/* feeds: soft beams from the listener to the active speakers */}
                {SPEAKERS.map((s) => {
                    const p = S(s), w = weights[s.id];
                    return w > 0.01 ? (
                        <line key={`f${s.id}`} x1={l.x} y1={l.y} x2={p.x} y2={p.y} stroke={OBJ}
                            strokeWidth={(0.03 + 0.10 * w).toFixed(3)} strokeOpacity={(0.25 + 0.6 * w).toFixed(2)} strokeLinecap="round"
                            style={{ transition: "stroke-width 0.15s, stroke-opacity 0.15s" }} />
                    ) : null;
                })}
                {/* speakers */}
                {SPEAKERS.map((s) => {
                    const p = S(s), w = weights[s.id];
                    return (
                        <g key={s.id}>
                            <circle cx={p.x} cy={p.y} r={(0.17 + 0.08 * w).toFixed(3)} fill={ACCENT} fillOpacity={(0.85 + 0.15 * w).toFixed(2)}
                                style={{ transition: "r 0.15s" }} />
                            <text x={p.x} y={p.y + 0.055} fontSize="0.15" textAnchor="middle" fill="white" fontWeight="600" fontFamily="ui-sans-serif, system-ui">{s.id}</text>
                        </g>
                    );
                })}
                {/* object */}
                <circle cx={o.x} cy={o.y} r="0.6" fill="url(#ssw-obj)" />
                <circle cx={o.x} cy={o.y} r="0.13" fill={OBJ} />
                <text x={o.x} y={o.y - 0.24} fontSize="0.14" textAnchor="middle" fill="currentColor" fillOpacity="0.7" fontFamily="ui-sans-serif, system-ui">voix</text>
                {/* listener */}
                <circle cx={l.x} cy={l.y} r="0.5" fill="url(#ssw-lis)" />
                <circle cx={l.x} cy={l.y} r="0.15" fill={LISTENER} stroke="white" strokeWidth="0.035" style={{ cursor: "grab" }} />
                {playing && <circle cx={l.x} cy={l.y} r="0.22" fill="none" stroke={LISTENER} strokeWidth="0.02" strokeOpacity="0.6">
                    <animate attributeName="r" values="0.18;0.34" dur="1.4s" repeatCount="indefinite" />
                    <animate attributeName="stroke-opacity" values="0.6;0" dur="1.4s" repeatCount="indefinite" />
                </circle>}
            </svg>

            <div className="mt-4 flex items-center justify-between text-sm">
                <span className="text-secondary-text dark:text-secondary-text-dark">Objet à <span className="font-mono text-primary-text dark:text-primary-text-dark">{r.toFixed(2)} m</span></span>
                <span className="text-secondary-text dark:text-secondary-text-dark">Niveau <span className="font-mono text-primary-text dark:text-primary-text-dark">{level.toFixed(1)} dB</span></span>
            </div>

            <div className="mt-3 grid grid-cols-3 sm:grid-cols-6 gap-2">
                {comp.map((c) => {
                    const w = weights[c.id];
                    return (
                        <div key={c.id} className={`rounded-2xl px-3 py-2.5 bg-background-primary dark:bg-background-primary-dark transition-opacity ${w > 0.01 ? "" : "opacity-45"}`}>
                            <div className="flex items-center justify-between">
                                <span className="text-body font-bold text-primary-text dark:text-primary-text-dark">{c.id}</span>
                                <span className="text-xs font-mono text-secondary-text dark:text-secondary-text-dark">{Math.round(w * 100)} %</span>
                            </div>
                            <div className="mt-1.5 h-1.5 rounded-full bg-background-secondary dark:bg-background-secondary-dark overflow-hidden">
                                <div className="h-full rounded-full" style={{ width: `${Math.round(w * 100)}%`, background: OBJ, transition: "width 0.15s" }} />
                            </div>
                            <div className="mt-1.5 text-xs font-mono text-secondary-text dark:text-secondary-text-dark leading-tight">
                                {c.delayMs.toFixed(1)} ms<br />{c.gainDB >= 0 ? "+" : ""}{c.gainDB.toFixed(1)} dB
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
