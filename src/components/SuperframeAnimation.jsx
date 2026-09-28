import { useEffect, useRef, useState } from "react";

// One superframe for N = 5 nodes: 5 short ranging slots (603 us) then 5 data
// slots (1783 us), 11.93 ms in total, replayed about 420x slower (5 s per loop).
// Ranging frames carry the reception timestamps of the frames heard before, so
// a pair (i, k), i < k, needs three frames: i, then k, then i again (next
// superframe). Every node overhears everything, so every node holds the full
// matrix. Everything shown is derived from the simulated time T (us).

const ACCENT = "rgba(88,86,214,1)";
const ORANGE = "#f0a030";
const GREEN = "#34c759";
const MONO = "ui-monospace, SFMono-Regular, Menlo, monospace";
const SANS = "ui-sans-serif, system-ui, -apple-system, sans-serif";

const N = 5;
const RNG = 603, DAT = 1783;                  // slot lengths, us
const SF = N * RNG + N * DAT;                 // 11 930 us
const LOOP_MS = 5000;                         // on-screen duration of one superframe
const RATE = SF / LOOP_MS;                    // simulated us per real ms
const SLOW = 4;
const LENDER = 2, BORROWER = 0;               // node 3 lends its data slot to node 1 (0-based)

// Node positions in metres; distances follow from them.
const POS = [
    { x: 0.4, y: 0.9 }, { x: 4.4, y: 0.3 }, { x: 5.3, y: 3.5 }, { x: 2.6, y: 5.2 }, { x: 0.1, y: 3.8 },
];
const DIST = POS.map((a) => POS.map((b) => Math.hypot(a.x - b.x, a.y - b.y)));

// Drawing, viewBox units.
const W = 360, H = 300;
const PX = POS.map((p) => ({ x: 80 + 36 * p.x, y: 206 - 36 * p.y }));
const BAR = { x: 10, y: 240, w: 340, h: 24 };
const SCALE = BAR.w / SF;

function slotsFor(lend) {
    const s = [];
    for (let k = 0; k < N; k++) s.push({ kind: "rng", owner: k, slotOf: k, start: k * RNG, dur: RNG });
    for (let k = 0; k < N; k++) {
        const lent = lend && k === LENDER;
        s.push({ kind: lent ? "lent" : "dat", owner: lent ? BORROWER : k, slotOf: k, start: N * RNG + k * DAT, dur: DAT });
    }
    return s;
}
const COLOR = { rng: ACCENT, dat: ORANGE, lent: GREEN };

// Deterministic jitter in [-1, 1] for (cycle, i, k): the matrix "twinkles" at the mm level.
function jitter(c, i, k) {
    let h = (c * 73856093) ^ (i * 19349663) ^ (k * 83492791);
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    h ^= h >>> 16;
    return ((h >>> 0) / 4294967295 - 0.5) * 2;
}

// State of the pair (i, k) at time T: "none", "partial" (2 of 3 frames) or a value.
function cell(T, i, k) {
    const lo = Math.min(i, k), hi = Math.max(i, k);
    if (T < (hi + 1) * RNG) return { state: "none" };
    const first = SF + (lo + 1) * RNG;        // lo's ranging frame of the 2nd superframe
    if (T < first) return { state: "partial" };
    const c = Math.floor((T - (lo + 1) * RNG) / SF);
    const updated = c * SF + (lo + 1) * RNG;
    return { state: "done", value: DIST[lo][hi] + 0.012 * jitter(c, lo, hi), fresh: T - updated < 500 };
}

const fr = (v, d) => v.toFixed(d).replace(".", ",");
const n2 = (v) => v.toFixed(2);
const clamp01 = (v) => Math.min(1, Math.max(0, v));

function Pill({ on, onChange, children }) {
    return (
        <button type="button" onClick={() => onChange(!on)} aria-pressed={on}
            className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${on
                ? "bg-accent text-white"
                : "bg-background-primary dark:bg-background-primary-dark text-primary-text dark:text-primary-text-dark hover:opacity-80"}`}>
            {children}
        </button>
    );
}

function Swatch({ color, children }) {
    return (
        <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-4 rounded-sm" style={{ background: color }} />
            {children}
        </span>
    );
}

// Per-node captions only in slow motion; at normal speed a ranging slot lasts
// 0.25 s on screen, too short to read, so the caption describes the section.
function captionFor(slot, slow) {
    const n = slot.owner + 1;
    if (slot.kind === "lent") return `Créneau du nœud ${slot.slotOf + 1}, prêté au nœud ${n} : il n'avait rien à envoyer, le temps d'antenne n'est pas perdu.`;
    if (!slow) return slot.kind === "rng"
        ? "Créneaux de mesure : chaque nœud émet à son tour une trame courte (603 µs), horodatée à l'arrivée par tous les autres."
        : "Créneaux de données (1 783 µs) : chaque nœud envoie ses données à son tour, et tous les reçoivent.";
    if (slot.kind === "rng") return `Créneau de mesure du nœud ${n} (603 µs) : une trame courte, horodatée à l'arrivée par les quatre autres.`;
    return `Créneau de données du nœud ${n} (1 783 µs) : ses données partent vers tous les autres.`;
}

export default function SuperframeAnimation() {
    const [T, setT] = useState(0);                 // simulated time since start, us
    const [lend, setLend] = useState(false);
    const [slow, setSlow] = useState(false);
    const slowRef = useRef(false);
    const raf = useRef(0);

    useEffect(() => { slowRef.current = slow; }, [slow]);

    useEffect(() => {
        let last = performance.now();
        const tick = (now) => {
            const dt = Math.min(now - last, 100);   // do not jump after a background tab
            last = now;
            setT((t) => t + dt * RATE / (slowRef.current ? SLOW : 1));
            raf.current = requestAnimationFrame(tick);
        };
        raf.current = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(raf.current);
    }, []);

    const slots = slotsFor(lend);
    const cycle = Math.floor(T / SF);
    const phase = T - cycle * SF;
    const cur = slots.find((s) => phase >= s.start && phase < s.start + s.dur) ?? slots[0];
    const f = clamp01((phase - cur.start) / cur.dur);
    const col = COLOR[cur.kind];
    const src = PX[cur.owner];

    // share of the data airtime per node
    const share = Array.from({ length: N }, (_, k) => slots.filter((s) => s.kind !== "rng" && s.owner === k).length / N);
    const speed = Math.round(LOOP_MS * 1000 / SF / 10) * 10 * (slow ? SLOW : 1);   // how many times slower than real

    return (
        <div className="not-prose rounded-[28px] bg-background-secondary dark:bg-background-secondary-dark p-5 sm:p-6">
            <div className="mb-4">
                <p className="text-title3 font-bold text-primary-text dark:text-primary-text-dark">Une supertrame, cinq nœuds</p>
                <p className="text-sm text-secondary-text dark:text-secondary-text-dark">
                    Chacun émet à son tour : une courte trame de mesure, puis un créneau de données. En écoutant tout, chaque nœud remplit la même matrice des distances.
                </p>
            </div>

            <div className="flex flex-wrap gap-2">
                <Pill on={lend} onChange={setLend}>Prêt de créneaux</Pill>
                <Pill on={slow} onChange={setSlow}>Ralenti</Pill>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,15rem)]">
                <svg viewBox={`0 0 ${W} ${H}`} role="img"
                    aria-label="Constellation de cinq nœuds et frise d'une supertrame"
                    className="block w-full select-none rounded-3xl bg-background-primary dark:bg-background-primary-dark text-primary-text dark:text-primary-text-dark">
                    {/* all links, faint */}
                    {PX.map((a, i) => PX.slice(i + 1).map((b, j) => (
                        <line key={`l${i}-${j}`} x1={n2(a.x)} y1={n2(a.y)} x2={n2(b.x)} y2={n2(b.y)} stroke="currentColor" strokeOpacity="0.08" strokeWidth="1" />
                    )))}
                    {/* the current transmission: highlighted links, pulses to every other node */}
                    {PX.map((p, j) => j === cur.owner ? null : (
                        <g key={`p${j}`}>
                            <line x1={n2(src.x)} y1={n2(src.y)} x2={n2(p.x)} y2={n2(p.y)} stroke={col} strokeOpacity="0.35" strokeWidth="1.5" />
                            {(cur.kind === "rng" ? [clamp01(f * 1.15)] : [0, 1, 2].map((m) => (f * 3 + m / 3) % 1)).map((g, m) => (
                                g < 1 && <circle key={m} cx={n2(src.x + (p.x - src.x) * g)} cy={n2(src.y + (p.y - src.y) * g)} r="3.5" fill={col} />
                            ))}
                        </g>
                    ))}
                    <circle cx={n2(src.x)} cy={n2(src.y)} r={n2(14 + f * 50)} fill="none" stroke={col} strokeWidth="2" strokeOpacity={n2((1 - f) * 0.6)} />
                    {/* nodes */}
                    {PX.map((p, k) => {
                        const on = k === cur.owner;
                        return (
                            <g key={`n${k}`}>
                                <circle cx={n2(p.x)} cy={n2(p.y)} r={on ? 15 : 13} fill={on ? col : ACCENT} fillOpacity={on ? 1 : 0.8} />
                                <text x={n2(p.x)} y={n2(p.y + 4.5)} textAnchor="middle" fontSize="13" fontWeight="700" fill="white" fontFamily={SANS}>{k + 1}</text>
                            </g>
                        );
                    })}
                    {lend && (
                        <text x={n2(PX[LENDER].x)} y={n2(PX[LENDER].y + 28)} textAnchor="middle" fontSize="10.5" fill={GREEN} fontWeight="600" fontFamily={SANS}>rien à envoyer</text>
                    )}

                    {/* the superframe timeline */}
                    <text x={n2(BAR.x + N * RNG * SCALE / 2)} y={BAR.y - 8} textAnchor="middle" fontSize="11" fill="currentColor" fillOpacity="0.6" fontFamily={SANS}>mesure</text>
                    <text x={n2(BAR.x + (N * RNG + N * DAT / 2) * SCALE)} y={BAR.y - 8} textAnchor="middle" fontSize="11" fill="currentColor" fillOpacity="0.6" fontFamily={SANS}>données</text>
                    {slots.map((s, i) => {
                        const on = s === cur;
                        const x = BAR.x + s.start * SCALE, w = s.dur * SCALE;
                        return (
                            <g key={`s${i}`}>
                                <rect x={n2(x + 0.6)} y={BAR.y} width={n2(w - 1.2)} height={BAR.h} rx="3" fill={COLOR[s.kind]} fillOpacity={on ? 1 : 0.25} />
                                <text x={n2(x + w / 2)} y={BAR.y + 16} textAnchor="middle" fontSize="11" fontWeight="700" fontFamily={SANS}
                                    fill={on ? "white" : "currentColor"} fillOpacity={on ? 1 : 0.7}>
                                    {s.kind === "lent" ? `${s.slotOf + 1}→${s.owner + 1}` : s.owner + 1}
                                </text>
                            </g>
                        );
                    })}
                    <line x1={n2(BAR.x + phase * SCALE)} y1={BAR.y - 4} x2={n2(BAR.x + phase * SCALE)} y2={BAR.y + BAR.h + 4} stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    <text x={BAR.x} y={BAR.y + BAR.h + 18} fontSize="10.5" fill="currentColor" fillOpacity="0.55" fontFamily={MONO}>0</text>
                    <text x={n2(BAR.x + N * RNG * SCALE)} y={BAR.y + BAR.h + 18} textAnchor="middle" fontSize="10.5" fill="currentColor" fillOpacity="0.55" fontFamily={MONO}>{fr(N * RNG / 1000, 1)} ms</text>
                    <text x={BAR.x + BAR.w} y={BAR.y + BAR.h + 18} textAnchor="end" fontSize="10.5" fill="currentColor" fillOpacity="0.55" fontFamily={MONO}>{fr(SF / 1000, 2)} ms</text>
                </svg>

                {/* what every node knows: the distance matrix, and who gets the data airtime */}
                <div className="rounded-3xl bg-background-primary dark:bg-background-primary-dark p-3 sm:p-4">
                    <p className="text-xs font-medium text-secondary-text dark:text-secondary-text-dark">Distances (m), identiques chez chaque nœud</p>
                    <div className="mt-2 grid grid-cols-6 gap-1 font-mono text-[11px] leading-none">
                        <span />
                        {PX.map((_, k) => <span key={`h${k}`} className="py-1 text-center font-bold text-secondary-text dark:text-secondary-text-dark">{k + 1}</span>)}
                        {PX.map((_, i) => [
                            <span key={`r${i}`} className="py-1.5 text-center font-bold text-secondary-text dark:text-secondary-text-dark">{i + 1}</span>,
                            ...PX.map((__, k) => {
                                if (i === k) return <span key={`c${i}${k}`} className="rounded-md py-1.5 text-center text-secondary-text dark:text-secondary-text-dark opacity-40">–</span>;
                                const c = cell(T, i, k);
                                const cls = c.state === "none" ? "bg-background-secondary dark:bg-background-secondary-dark opacity-50"
                                    : c.state === "partial" ? "bg-background-secondary dark:bg-background-secondary-dark text-secondary-text dark:text-secondary-text-dark"
                                        : "text-primary-text dark:text-primary-text-dark";
                                return (
                                    <span key={`c${i}${k}`} title={c.state === "partial" ? "2 trames sur 3" : undefined}
                                        className={`rounded-md py-1.5 text-center transition-colors duration-300 ${cls}`}
                                        style={c.state === "done" ? { background: c.fresh ? "rgba(88,86,214,0.28)" : "rgba(88,86,214,0.10)" } : undefined}>
                                        {c.state === "done" ? fr(c.value, 2) : c.state === "partial" ? "…" : " "}
                                    </span>
                                );
                            }),
                        ])}
                    </div>
                    <p className="mt-2 text-[11px] leading-snug text-secondary-text dark:text-secondary-text-dark">
                        « … » : deux trames sur trois. Une paire est complète quand le premier nœud réémet, au début de la supertrame suivante.
                    </p>

                    <p className="mt-3 text-xs font-medium text-secondary-text dark:text-secondary-text-dark">Part du temps de données</p>
                    <div className="mt-1.5 space-y-1">
                        {share.map((v, k) => (
                            <div key={`b${k}`} className="flex items-center gap-2 text-[11px] font-mono">
                                <span className="w-3 text-center font-bold text-secondary-text dark:text-secondary-text-dark">{k + 1}</span>
                                <div className="h-2 flex-1 rounded-full bg-background-secondary dark:bg-background-secondary-dark overflow-hidden">
                                    <div className="h-full rounded-full"
                                        style={{ width: `${Math.round(v * 100)}%`, background: lend && k === BORROWER ? GREEN : ORANGE, transition: "width 0.4s" }} />
                                </div>
                                <span className="w-8 text-right text-secondary-text dark:text-secondary-text-dark">{Math.round(v * 100)} %</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="mt-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 text-xs text-secondary-text dark:text-secondary-text-dark">
                <div className="flex flex-wrap gap-x-4 gap-y-1">
                    <Swatch color={ACCENT}>mesure</Swatch>
                    <Swatch color={ORANGE}>données</Swatch>
                    <Swatch color={GREEN}>créneau prêté</Swatch>
                </div>
                <span className="font-mono">
                    supertrame {cycle + 1} · t = {fr(phase / 1000, 2)} ms · ≈ {String(speed).replace(/\B(?=(\d{3})+(?!\d))/g, "\u00a0")} fois plus lent
                </span>
            </div>

            <p className="mt-3 min-h-[3.75rem] sm:min-h-[2.5rem] text-sm text-primary-text dark:text-primary-text-dark">
                {captionFor(cur, slow)}
                {lend && cur.kind !== "lent" && " Le nœud 3 n'a rien à envoyer : son créneau de données est prêté au nœud 1, dont la part double."}
            </p>
        </div>
    );
}
