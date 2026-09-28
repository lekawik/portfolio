import { useEffect, useRef, useState } from "react";

// Animated double-sided two-way ranging (DS-TWR) ladder, broadcast variant:
// A and B exchange four frames, C only listens. Timestamps are offsets on each
// node's own clock, in ns (A's origin: A1 departure; B's origin: A1 arrival).
// Ideal clocks, true A-B distance 1.00 m. The formula is applied to the very
// values displayed, so the numbers on screen are self-consistent.

const ACCENT = "rgba(88,86,214,1)";
const ORANGE = "#f0a030";
const GREEN = "#34c759";
const MONO = "ui-monospace, SFMono-Regular, Menlo, monospace";
const SANS = "ui-sans-serif, system-ui, -apple-system, sans-serif";

const C_LIGHT = 299792458;              // m/s
const TOF = (1.0 / C_LIGHT) * 1e9;      // 3.336 ns for 1.00 m
const DB = 250000;                      // B's reply delay, ns
const DA = 280000;                      // A's reply delay, ns
const round3 = (v) => Math.round(v * 1000) / 1000;
const RA = round3(2 * TOF + DB);        // A: A1 tx -> B1 rx
const RB = round3(2 * TOF + DA);        // B: B1 tx -> A2 rx
const TOF_EST = (RA * RB - DA * DB) / (RA + RB + DA + DB);
const DIST_EST = TOF_EST * 1e-9 * C_LIGHT;

// French number formatting done by hand (identical on server and client).
function fmt(v, dec) {
    const [i, f] = Math.abs(v).toFixed(dec).split(".");
    const g = i.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
    return (v < 0 ? "−" : "") + g + (f ? "," + f : "");
}

// Geometry, viewBox units.
const W = 420, H = 384;
const X = { A: 112, B: 280, C: 395 };
const DROP = 16;                                  // vertical drop of a frame between A and B
const SLOPE = DROP / (X.B - X.A);
const TOP = 44, BOTTOM = 360;
const MAIN_END = 0.6;                             // share of the step animation spent on A<->B
const C_SPAN = 1 - MAIN_END;                     // share spent on the (shorter) hop to C

const FRAMES = [
    { name: "A₁", from: "A", to: "B", y: 70, step: 1, payload: null },
    { name: "B₁", from: "B", to: "A", y: 156, step: 2, payload: "porte : réception de A₁" },
    { name: "A₂", from: "A", to: "B", y: 242, step: 3, payload: "porte : réception de B₁" },
    { name: "B₂", from: "B", to: "A", y: 328, step: 4, payload: "porte : réception de A₂" },
].map((f) => {
    const yB = f.from === "A" ? f.y + DROP : f.y;          // where the frame is at B's lifeline
    return {
        ...f,
        main: { x1: X[f.from], y1: f.y, x2: X[f.to], y2: f.y + DROP },
        side: { x1: X.B, y1: yB, x2: X.C, y2: yB + (X.C - X.B) * SLOPE },
        sideStart: f.from === "A" ? MAIN_END : 0,
    };
});

const STAMPS = [
    { node: "A", y: 70, v: 0, step: 1, at: 0 },
    { node: "B", y: 86, v: 0, step: 1, at: MAIN_END },
    { node: "B", y: 156, v: DB, step: 2, at: 0 },
    { node: "A", y: 172, v: RA, step: 2, at: MAIN_END },
    { node: "A", y: 242, v: RA + DA, step: 3, at: 0 },
    { node: "B", y: 258, v: DB + RB, step: 3, at: MAIN_END },
    { node: "B", y: 328, v: DB + RB + DB, step: 4, at: 0 },
    { node: "A", y: 344, v: RA + DA + RA, step: 4, at: MAIN_END },
];

// Intervals shown as brackets once the formula appears.
const BRACKETS = [
    { id: "Ra", side: "A", y1: 70, y2: 172, color: ACCENT },
    { id: "Da", side: "A", y1: 176, y2: 242, color: ORANGE },
    { id: "Db", side: "B", y1: 86, y2: 156, color: ORANGE },
    { id: "Rb", side: "B", y1: 160, y2: 258, color: ACCENT },
];

const CAPTIONS = [
    "Trois nœuds, chacun avec sa propre horloge. Personne n'a encore émis.",
    "A émet la trame A₁ et note l'heure de départ ; B horodate son arrivée, et C, à l'écoute, l'entend aussi.",
    "Après un délai de réponse Db, B répond par B₁, qui porte l'heure de réception de A₁ ; A horodate son arrivée.",
    "Après un délai Da, A émet A₂, qui porte l'heure de réception de B₁ ; B l'horodate à son tour.",
    "B émet B₂, qui porte l'heure de réception de A₂ : les quatre intervalles sont maintenant connus de tous.",
    `Chaque intervalle est mesuré sur une seule horloge, donc le décalage entre A et B disparaît : il reste ${fmt(TOF_EST, 2)} ns de vol, soit ${fmt(DIST_EST, 2)} m.`,
    "C a tout entendu : il calcule A–B sans avoir émis.",
];
const LAST = CAPTIONS.length - 1;
const STEP_MS = 2200;
const ANIM_MS = 1100;

const clamp01 = (v) => Math.min(1, Math.max(0, v));
const n2 = (v) => v.toFixed(2);

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

// One hop of a frame, drawn up to fraction f, with a travelling pulse at its tip.
function Hop({ seg, f, color, opacity, dashed, marker, pulse }) {
    if (f <= 0) return null;
    const x2 = seg.x1 + (seg.x2 - seg.x1) * f, y2 = seg.y1 + (seg.y2 - seg.y1) * f;
    return (
        <g>
            <line x1={n2(seg.x1)} y1={n2(seg.y1)} x2={n2(x2)} y2={n2(y2)} stroke={color} strokeOpacity={opacity}
                strokeWidth={dashed ? 1 : 1.6} strokeDasharray={dashed ? "4 3" : undefined}
                markerEnd={f >= 1 ? `url(#${marker})` : undefined} />
            {f < 1 && (
                <g>
                    <circle cx={n2(x2)} cy={n2(y2)} r={(pulse * 2.4).toFixed(2)} fill={ACCENT} fillOpacity={dashed ? 0.12 : 0.22} />
                    <circle cx={n2(x2)} cy={n2(y2)} r={pulse.toFixed(2)} fill={ACCENT} fillOpacity={dashed ? 0.5 : 1} />
                </g>
            )}
        </g>
    );
}

function Bracket({ b, show }) {
    const onA = b.side === "A";
    const x = onA ? X.A + 10 : X.B - 10, tick = onA ? -5 : 5;
    return (
        <g opacity={show.toFixed(3)}>
            <path d={`M ${x + tick} ${b.y1} H ${x} V ${b.y2} H ${x + tick}`} fill="none" stroke={b.color} strokeWidth="2" strokeLinejoin="round" />
            <text x={onA ? x + 5 : x - 5} y={((b.y1 + b.y2) / 2 + 4).toFixed(1)} textAnchor={onA ? "start" : "end"}
                fontSize="12.5" fontWeight="700" fill={b.color} fontFamily={SANS}>
                {b.id[0]}<tspan fontSize="9" dy="2">{b.id[1]}</tspan>
            </text>
        </g>
    );
}

// A variable name coloured like its bracket on the ladder.
function V({ id }) {
    const b = BRACKETS.find((x) => x.id === id);
    return <span className="font-bold" style={{ color: b.color }}>{id[0]}<sub>{id[1]}</sub></span>;
}

export default function RangingLadder() {
    const [step, setStep] = useState(0);
    const [prog, setProg] = useState(1);
    const [auto, setAuto] = useState(false);
    const raf = useRef(0);

    // Auto-play by default, unless the visitor asked for reduced motion.
    useEffect(() => {
        try { if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) setAuto(true); } catch { /* ignore */ }
    }, []);

    // Animate the current step from 0 to 1.
    useEffect(() => {
        if (step === 0) { setProg(1); return; }
        const t0 = performance.now();
        setProg(0);
        const tick = (now) => {
            const p = clamp01((now - t0) / ANIM_MS);
            setProg(p);
            if (p < 1) raf.current = requestAnimationFrame(tick);
        };
        raf.current = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(raf.current);
    }, [step]);

    // Auto-play: one step every 2.2 s, a longer pause at the end, then loop.
    useEffect(() => {
        if (!auto) return;
        const id = setTimeout(() => setStep((s) => (s >= LAST ? 0 : s + 1)), step >= LAST ? STEP_MS * 2 : STEP_MS);
        return () => clearTimeout(id);
    }, [auto, step]);

    const next = () => { setAuto(false); setStep((s) => (s >= LAST ? 0 : s + 1)); };
    const phase = (s) => (step > s ? 1 : step === s ? prog : 0);   // progress of the step s
    const brackets = phase(5);
    const cOn = phase(6);
    const fade = (p, at) => clamp01((p - at) / 0.15);

    return (
        <div className="not-prose rounded-[28px] bg-background-secondary dark:bg-background-secondary-dark p-5 sm:p-6">
            <div className="mb-4">
                <p className="text-title3 font-bold text-primary-text dark:text-primary-text-dark">Quatre trames, une distance</p>
                <p className="text-sm text-secondary-text dark:text-secondary-text-dark">
                    Chaque nœud horodate ce qu'il émet et ce qu'il reçoit, sur sa propre horloge ; deux allers-retours entre A et B suffisent, et C, qui écoute, obtient la mesure gratuitement.
                </p>
            </div>

            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-1.5" aria-label={`Étape ${step} sur ${LAST}`}>
                    {CAPTIONS.map((_, i) => (
                        <span key={i} className={`h-2 rounded-full transition-all ${i === step ? "w-5 bg-accent" : i < step ? "w-2 bg-accent opacity-50" : "w-2 bg-gray opacity-40"}`} />
                    ))}
                    <span className="ml-2 text-xs font-mono text-secondary-text dark:text-secondary-text-dark">{step} / {LAST}</span>
                </div>
                <div className="flex gap-2">
                    <Pill on={auto} onChange={setAuto}>{auto ? "Lecture auto : oui" : "Lecture auto : non"}</Pill>
                    <button type="button" onClick={next}
                        className="rounded-full px-4 py-2 text-sm font-medium bg-accent text-white hover:opacity-90 transition-opacity">
                        {step >= LAST ? "Rejouer" : "Étape suivante"}
                    </button>
                </div>
            </div>

            <svg viewBox={`0 0 ${W} ${H}`} role="img"
                aria-label="Échelle des temps : trames A1, B1, A2, B2 entre les nœuds A et B, écoutées par C"
                className="block mx-auto w-full max-w-[520px] select-none rounded-3xl bg-background-primary dark:bg-background-primary-dark text-primary-text dark:text-primary-text-dark">
                <defs>
                    <marker id="rl-ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
                        <path d="M0,0 L10,5 L0,10 z" fill={ACCENT} />
                    </marker>
                    <marker id="rl-ahm" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto">
                        <path d="M0,0 L10,5 L0,10 z" fill="currentColor" fillOpacity="0.45" />
                    </marker>
                </defs>

                {/* C's column lights up at the last step */}
                {cOn > 0 && <rect x={X.C - 14} y={TOP - 4} width="28" height={BOTTOM - TOP + 8} rx="14" fill={GREEN} fillOpacity={(0.16 * cOn).toFixed(3)} />}

                {/* node headers and lifelines */}
                {["A", "B", "C"].map((n) => {
                    const isC = n === "C";
                    const col = isC && cOn > 0.5 ? GREEN : "currentColor";
                    return (
                        <g key={n}>
                            <text x={X[n]} y="21" textAnchor="middle" fontSize="16" fontWeight="700" fill={col} fontFamily={SANS}>{n}</text>
                            <text x={isC ? W - 4 : X[n]} y="35" textAnchor={isC ? "end" : "middle"} fontSize="10" fill="currentColor" fillOpacity="0.55" fontFamily={SANS}>
                                {isC ? "à l'écoute" : `horloge de ${n}`}
                            </text>
                            <line x1={X[n]} y1={TOP} x2={X[n]} y2={BOTTOM} stroke={col} strokeOpacity={isC && cOn <= 0.5 ? 0.25 : 0.45}
                                strokeWidth={isC ? 1 : 1.3} />
                        </g>
                    );
                })}

                {/* frames */}
                {FRAMES.map((fr) => {
                    const p = phase(fr.step);
                    if (p <= 0) return null;
                    const mainF = clamp01(p / MAIN_END);
                    const sideF = clamp01((p - fr.sideStart) / C_SPAN);
                    const mx = (X.A + X.B) / 2, my = fr.y + DROP / 2;
                    const heardByC = sideF >= 1;
                    return (
                        <g key={fr.name}>
                            <circle cx={X[fr.from]} cy={fr.y} r="3.2" fill={ACCENT} />
                            <Hop seg={fr.side} f={sideF} color="currentColor" opacity="0.4" dashed marker="rl-ahm" pulse={3} />
                            <Hop seg={fr.main} f={mainF} color={ACCENT} opacity="1" marker="rl-ah" pulse={4} />
                            {mainF >= 1 && <circle cx={X[fr.to]} cy={fr.y + DROP} r="3.2" fill="none" stroke={ACCENT} strokeWidth="1.5" />}
                            {heardByC && cOn > 0 && <circle cx={X.C} cy={n2(fr.side.y2)} r="3.6" fill={GREEN} opacity={cOn.toFixed(3)} />}
                            <g opacity={clamp01(mainF * 2).toFixed(3)}>
                                <text x={mx} y={my - 7} textAnchor="middle" fontSize="12.5" fontWeight="700" fill="currentColor" fontFamily={SANS}>trame {fr.name}</text>
                                {fr.payload && <text x={mx} y={my + 16} textAnchor="middle" fontSize="10.5" fill="currentColor" fillOpacity="0.6" fontFamily={SANS}>{fr.payload}</text>}
                            </g>
                        </g>
                    );
                })}

                {/* timestamps, each on its own node's clock */}
                {STAMPS.map((s, i) => {
                    const p = phase(s.step);
                    const o = step > s.step ? 1 : fade(p, s.at);
                    if (o <= 0) return null;
                    const onA = s.node === "A";
                    const fresh = step === s.step;
                    return (
                        <text key={i} x={onA ? X.A - 8 : X.B + 8} y={onA ? s.y + 4 : s.y - 5} textAnchor={onA ? "end" : "start"}
                            fontSize="11.5" fontFamily={MONO} fill={fresh ? ACCENT : "currentColor"} fillOpacity={fresh ? 1 : 0.75}
                            opacity={o.toFixed(3)} fontWeight={fresh ? 700 : 400}>
                            {s.v === 0 ? "t+0" : `t+${fmt(s.v, 3)}`}
                        </text>
                    );
                })}

                {/* intervals, once the formula is shown */}
                {brackets > 0 && BRACKETS.map((b) => <Bracket key={b.id} b={b} show={brackets} />)}

                <text x="18" y={H - 10} fontSize="9.5" fill="currentColor" fillOpacity="0.5" fontFamily={SANS}>horodatages en ns</text>
                {brackets > 0 && (
                    <text x={(X.A + X.B) / 2} y={H - 7} textAnchor="middle" fontSize="13" fontWeight="700" fill={ACCENT} opacity={brackets.toFixed(3)} fontFamily={SANS}>
                        d = {fmt(DIST_EST, 2)} m
                    </text>
                )}
                {cOn > 0 && (
                    <text x={W - 20} y={H - 7} textAnchor="end" fontSize="12" fontWeight="700" fill={GREEN} opacity={cOn.toFixed(3)} fontFamily={SANS}>
                        A–B : {fmt(DIST_EST, 2)} m
                    </text>
                )}
            </svg>

            <p className="mt-3 min-h-[3.75rem] sm:min-h-[2.5rem] text-sm text-primary-text dark:text-primary-text-dark" aria-live="polite">
                {CAPTIONS[step]}
            </p>

            {/* the formula, applied to the values on the ladder */}
            <div aria-hidden={step < 5}
                className={`mt-2 rounded-2xl bg-background-primary dark:bg-background-primary-dark px-4 py-3 font-mono text-xs sm:text-sm leading-relaxed text-primary-text dark:text-primary-text-dark overflow-hidden transition-all duration-500 ${step >= 5 ? "opacity-100 max-h-60" : "opacity-0 max-h-0 !py-0"}`}>
                <div>
                    tof = (<V id="Ra" />·<V id="Rb" /> − <V id="Da" />·<V id="Db" />) / (<V id="Ra" /> + <V id="Rb" /> + <V id="Da" /> + <V id="Db" />)
                </div>
                <div className="mt-1 text-secondary-text dark:text-secondary-text-dark">
                    <V id="Ra" /> = {fmt(RA, 3)} · <V id="Rb" /> = {fmt(RB, 3)} · <V id="Da" /> = {fmt(DA, 3)} · <V id="Db" /> = {fmt(DB, 3)} ns
                </div>
                <div className="mt-1">
                    tof = {fmt(TOF_EST, 2)} ns → d = c · tof = <span className="font-bold" style={{ color: ACCENT }}>{fmt(DIST_EST, 2)} m</span>
                </div>
            </div>

        </div>
    );
}
