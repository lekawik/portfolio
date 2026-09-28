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
const REF = { x: 3.0, y: 2.2 };            // where the trims were measured (sweet spot)
const OBJECT = { x: 3.4, y: 3.0 };
const C_SOUND = 343;

function angle(from, to) { return Math.atan2(to.y - from.y, to.x - from.x); }
function wrap(a) { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; }

function vbap(listener, object) {
    // pairwise, listener-centred: the two speakers bracketing the object's azimuth
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
        return { id: s.id, d, delayMs: Math.max(0, T - d / C_SOUND) * 1000, gain: corr };
    });
}

function makeVoiceLikeBuffer(ctx) {
    // a "talking" burst: 1.6 s of pink-ish noise shaped by a syllable envelope, looped
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
    const level = 1 / Math.max(r, 0.5);

    useEffect(() => {
        const a = audio.current;
        if (!a) return;
        // listener at the dragged point, facing +y (towards the front speakers); the
        // panner is the object, at its true position: headphones hear the true distance
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

    return (
        <div className="not-prose">
            <p className="text-title3 font-bold text-primary-text dark:text-primary-text-dark">Marche autour de la voix</p>
            <p className="text-sm text-secondary-text dark:text-secondary-text-dark mb-3">
                Déplacez l'auditeur (vert) autour de l'objet (orange). Au casque, le navigateur rend l'objet en binaural à sa vraie distance ;
                dessous, ce que l'app enverrait à chaque enceinte : les deux enceintes qui encadrent l'objet reçoivent le son, avec le retard et le gain du moment.
            </p>
            <svg ref={svgRef} viewBox={`0 0 ${ROOM.w} ${ROOM.h}`}
                className="w-full touch-none select-none bg-background-secondary dark:bg-background-secondary-dark"
                style={{ aspectRatio: `${ROOM.w} / ${ROOM.h}` }}
                onMouseDown={start} onMouseMove={move} onMouseUp={stop} onMouseLeave={stop}
                onTouchStart={start} onTouchMove={move} onTouchEnd={stop}>
                {SPEAKERS.map((s) => {
                    const p = S(s), w = weights[s.id];
                    const l = S(listener);
                    return (
                        <g key={s.id}>
                            {w > 0.01 && <line x1={l.x} y1={l.y} x2={p.x} y2={p.y} stroke="#d98a1f" strokeWidth={(0.02 + 0.06 * w).toFixed(3)} opacity="0.8" />}
                            <rect x={p.x - 0.14} y={p.y - 0.14} width="0.28" height="0.28" rx="0.04" fill="rgba(88,86,214,1)" />
                            <text x={p.x} y={p.y + 0.06} fontSize="0.16" textAnchor="middle" fill="white" fontWeight="600">{s.id}</text>
                        </g>
                    );
                })}
                {(() => { const o = S(OBJECT); return <circle cx={o.x} cy={o.y} r="0.13" fill="#f0a030" />; })()}
                {(() => { const l = S(listener); return <circle cx={l.x} cy={l.y} r="0.15" fill="#34c759" stroke="white" strokeWidth="0.03" style={{ cursor: "grab" }} />; })()}
            </svg>
            <div className="mt-3 flex flex-wrap items-center gap-4">
                <button onClick={toggle} className="border border-gray px-4 py-1 text-title3 text-primary-text dark:text-primary-text-dark">
                    {playing ? "Arrêter" : "Écouter au casque"}
                </button>
                <span className="font-mono text-sm text-secondary-text dark:text-secondary-text-dark">
                    objet à {r.toFixed(2)} m · niveau {(20 * Math.log10(level)).toFixed(1)} dB
                </span>
            </div>
            <table className="mt-3 w-full text-sm font-mono text-primary-text dark:text-primary-text-dark">
                <thead>
                    <tr className="text-secondary-text dark:text-secondary-text-dark">
                        <th className="text-left font-normal">enceinte</th><th className="text-right font-normal">distance</th>
                        <th className="text-right font-normal">retard</th><th className="text-right font-normal">gain</th><th className="text-right font-normal">part de l'objet</th>
                    </tr>
                </thead>
                <tbody>
                    {comp.map((c) => (
                        <tr key={c.id} className={weights[c.id] > 0.01 ? "font-bold" : "opacity-60"}>
                            <td>{c.id}</td>
                            <td className="text-right">{c.d.toFixed(2)} m</td>
                            <td className="text-right">{c.delayMs.toFixed(1)} ms</td>
                            <td className="text-right">{(20 * Math.log10(c.gain)).toFixed(1)} dB</td>
                            <td className="text-right">{Math.round(weights[c.id] * 100)} %</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
