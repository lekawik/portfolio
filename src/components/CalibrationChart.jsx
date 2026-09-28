import { useEffect, useRef, useState } from "react";

// Real measurements from the SoundStage level calibration (2026-09-26), taken at
// the sweet spot with the iPhone microphone. Levels are relative band levels (dB).
// Trims are attenuation-only: every speaker is brought down to the quietest (Ls).

const SPEAKERS = [
    { id: "L", level: -47.7, trim: -1.95, oct: [2.6, 0.8, -2.2, -1.3] },
    { id: "R", level: -47.0, trim: -2.65, oct: [0.7, 0.8, -1.3, -0.2] },
    { id: "C", level: -49.1, trim: -0.55, oct: [2.1, 0.0, -2.6, 0.5] },
    { id: "Ls", level: -49.65, trim: 0, oct: [-1.4, 0.1, 1.3, -0.1] },
    { id: "Rs", level: -48.5, trim: -1.15, oct: [-0.7, -0.9, 1.5, 0.1] },
    { id: "Lb", level: -48.35, trim: -1.3, oct: [-1.4, -0.3, 1.7, 0.1] },
];
const OCTAVES = ["500 Hz", "1 kHz", "2 kHz", "4 kHz"];
const OCT_SHORT = ["500", "1k", "2k", "4k"];
const REF = Math.min(...SPEAKERS.map((s) => s.level));   // Ls, the quietest
const DOMAIN = [-52, -46];                                // level axis (dB)
const TICKS = [-52, -50, -48, -46];
const OCT_MAX = 3;                                        // timbre axis: +-3 dB
const ACCENT = "rgba(88,86,214,1)";
const ORANGE = "#f0a030";

// French number: U+2212 minus, comma decimal, trailing zeros trimmed down to minDec.
function fr(v, minDec = 0, maxDec = 2, plus = false) {
    let s = Math.abs(v).toFixed(maxDec);
    while (s.includes(".") && s.split(".")[1].length > minDec && s.endsWith("0")) s = s.slice(0, -1);
    if (s.endsWith(".")) s = s.slice(0, -1);
    s = s.replace(".", ",");
    if (Math.abs(v) < 1e-9) return s;
    return (v < 0 ? "−" : plus ? "+" : "") + s;
}
const pct = (db) => (((db - DOMAIN[0]) / (DOMAIN[1] - DOMAIN[0])) * 100).toFixed(2);

// True once the element has scrolled into view (never at render: SSR-safe).
function useSeen(ref) {
    const [seen, setSeen] = useState(false);
    useEffect(() => {
        const el = ref.current;
        if (!el || typeof IntersectionObserver === "undefined") { setSeen(true); return; }
        const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setSeen(true); io.disconnect(); } }, { threshold: 0.3 });
        io.observe(el);
        return () => io.disconnect();
    }, [ref]);
    return seen;
}

const HATCH = `repeating-linear-gradient(135deg, ${ACCENT} 0 3px, rgba(88,86,214,0.25) 3px 6px)`;

function LevelsPanel({ grow }) {
    return (
        <div>
            <div className="relative space-y-2.5">
                {/* reference line (Ls, the quietest), across the bar tracks */}
                <div className="pointer-events-none absolute inset-y-0 z-10" style={{ left: "2.5rem", right: "6.25rem" }}>
                    <div className="absolute -inset-y-1 border-l-2 border-dashed text-primary-text dark:text-primary-text-dark"
                        style={{ left: `${pct(REF)}%`, borderColor: "currentColor", opacity: grow ? 0.55 : 0, transition: "opacity 0.4s ease-out 1.2s" }} />
                </div>
                {SPEAKERS.map((s, i) => {
                    const delay = `${i * 60}ms`;
                    return (
                        <div key={s.id} className="flex items-center gap-3">
                            <span className="w-7 shrink-0 text-body font-bold text-primary-text dark:text-primary-text-dark">{s.id}</span>
                            <div className="relative h-6 flex-1 rounded-full bg-background-primary dark:bg-background-primary-dark overflow-hidden">
                                {/* kept part: up to the reference level */}
                                <div className={`absolute inset-y-0 left-0 rounded-l-full ${s.trim ? "" : "rounded-r-full"}`}
                                    style={{ width: grow ? `${pct(REF)}%` : "0%", background: ACCENT, transition: `width 0.7s ease-out ${delay}` }} />
                                {/* removed part: the trim, hatched */}
                                <div className="absolute inset-y-0 rounded-r-full"
                                    style={{
                                        left: `${pct(REF)}%`, width: grow ? `${(pct(s.level) - pct(REF)).toFixed(2)}%` : "0%",
                                        background: HATCH, transition: `width 0.6s ease-out calc(${delay} + 0.6s)`,
                                    }} />
                            </div>
                            <div className="w-[5.5rem] shrink-0 text-right font-mono leading-tight">
                                <div className="text-xs text-primary-text dark:text-primary-text-dark">{fr(s.level, 1)} dB</div>
                                <div className="text-xs" style={{ color: s.trim ? ORANGE : undefined }}>
                                    {s.trim ? `${fr(s.trim, 1)} dB` : <span className="text-secondary-text dark:text-secondary-text-dark">réf.</span>}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
            {/* axis */}
            <div className="relative mt-2 h-4 text-[11px] font-mono text-secondary-text dark:text-secondary-text-dark" style={{ marginLeft: "2.5rem", marginRight: "6.25rem" }}>
                {TICKS.map((t) => (
                    <span key={t} className="absolute -translate-x-1/2" style={{ left: `${pct(t)}%` }}>{fr(t)}</span>
                ))}
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-secondary-text dark:text-secondary-text-dark">
                <span className="flex items-center gap-1.5"><span className="inline-block h-3 w-5 rounded-sm" style={{ background: ACCENT }} />niveau conservé</span>
                <span className="flex items-center gap-1.5"><span className="inline-block h-3 w-5 rounded-sm" style={{ background: HATCH }} />correction retirée</span>
                <span className="flex items-center gap-1.5"><span className="inline-block h-3 w-0 border-l-2 border-dashed" style={{ borderColor: "currentColor" }} />référence Ls ({fr(REF, 1)} dB)</span>
            </div>
            <p className="mt-3 text-sm text-secondary-text dark:text-secondary-text-dark">
                On ne fait que baisser : chaque enceinte descend au niveau de la plus faible (Ls), jamais d'amplification qui pourrait saturer.
            </p>
        </div>
    );
}

function TimbrePanel({ grow }) {
    return (
        <div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {SPEAKERS.map((s, si) => (
                    <div key={s.id} className="rounded-2xl bg-background-primary dark:bg-background-primary-dark px-3 pt-2 pb-2">
                        <p className="text-body font-bold text-primary-text dark:text-primary-text-dark">{s.id}</p>
                        <div className="relative mt-1 h-24">
                            {/* zero line */}
                            <div className="absolute inset-x-0 top-1/2 border-t text-primary-text dark:text-primary-text-dark" style={{ borderColor: "currentColor", opacity: 0.25 }} />
                            <div className="absolute inset-0 grid grid-cols-4 gap-1.5">
                                {s.oct.map((v, i) => {
                                    const h = `${((Math.abs(v) / OCT_MAX) * 40).toFixed(2)}%`;  // +-3 dB fills 40 % of each half
                                    const up = v >= 0;
                                    return (
                                        <div key={i} className="relative" title={`${OCTAVES[i]} : ${fr(v, 1, 1, true)} dB`}>
                                            <div className="absolute inset-x-0 rounded-[3px]"
                                                style={{
                                                    [up ? "bottom" : "top"]: "50%", height: grow ? h : "0%",
                                                    background: up ? ACCENT : ORANGE,
                                                    transition: `height 0.6s ease-out ${si * 60 + i * 40}ms`,
                                                }} />
                                            <span className="absolute inset-x-0 text-center text-[10px] font-mono leading-none text-secondary-text dark:text-secondary-text-dark"
                                                style={{ ...(up ? { bottom: `calc(50% + ${h} + 2px)` } : { top: `calc(50% + ${h} + 2px)` }), opacity: grow ? 1 : 0, transition: "opacity 0.3s ease-out 0.6s" }}>
                                                {fr(v, 1, 1, true)}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                        <div className="mt-1 grid grid-cols-4 gap-1.5 text-center text-[10px] font-mono text-secondary-text dark:text-secondary-text-dark">
                            {OCT_SHORT.map((o) => <span key={o}>{o}</span>)}
                        </div>
                    </div>
                ))}
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-secondary-text dark:text-secondary-text-dark">
                <span className="flex items-center gap-1.5"><span className="inline-block h-3 w-3 rounded-sm" style={{ background: ACCENT }} />plus présent que les autres</span>
                <span className="flex items-center gap-1.5"><span className="inline-block h-3 w-3 rounded-sm" style={{ background: ORANGE }} />moins présent</span>
                <span>écart à l'enceinte médiane, en dB</span>
            </div>
            <p className="mt-3 text-sm text-primary-text dark:text-primary-text-dark">
                Les enceintes avant ont plus de 500 Hz et moins de 2 kHz que les arrière : deux corrections de ±2,5 dB.
            </p>
        </div>
    );
}

export default function CalibrationChart() {
    const [panel, setPanel] = useState("levels");
    const ref = useRef(null);
    const seen = useSeen(ref);
    // Each panel grows once, the first time it is shown after the card is in view.
    const [grown, setGrown] = useState({ levels: false, timbre: false });
    useEffect(() => {
        if (!seen || grown[panel]) return;
        const id = requestAnimationFrame(() => requestAnimationFrame(() => setGrown((g) => ({ ...g, [panel]: true }))));
        return () => cancelAnimationFrame(id);
    }, [seen, panel, grown]);

    const tabs = [["levels", "Niveaux"], ["timbre", "Timbre"]];
    return (
        <div ref={ref} className="not-prose rounded-[28px] bg-background-secondary dark:bg-background-secondary-dark p-5 sm:p-6">
            <div className="mb-4">
                <p className="text-title3 font-bold text-primary-text dark:text-primary-text-dark">Calibration des six enceintes</p>
                <p className="text-sm text-secondary-text dark:text-secondary-text-dark">
                    Vraies mesures du 26 septembre 2026, au micro de l'iPhone, à la place d'écoute : le niveau de chaque enceinte, puis son timbre par octave.
                </p>
            </div>
            <div className="mb-5 inline-flex rounded-full bg-background-primary dark:bg-background-primary-dark p-1" role="tablist">
                {tabs.map(([id, label]) => (
                    <button key={id} type="button" role="tab" aria-selected={panel === id} onClick={() => setPanel(id)}
                        className={`rounded-full px-5 py-1.5 text-sm font-medium transition-colors ${panel === id
                            ? "bg-accent text-white"
                            : "text-primary-text dark:text-primary-text-dark opacity-70 hover:opacity-100"}`}>
                        {label}
                    </button>
                ))}
            </div>
            {panel === "levels" ? <LevelsPanel grow={grown.levels} /> : <TimbrePanel grow={grown.timbre} />}
        </div>
    );
}
