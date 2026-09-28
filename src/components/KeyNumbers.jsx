import { useEffect, useLayoutEffect, useRef, useState } from "react";

// A strip of four key numbers. The leading number of each value counts up the
// first time the strip is seen; whatever surrounds it ("/ 227", "Mbit/s", "–9 mm")
// is kept as a static prefix / suffix.

const SETS = {
    uwb: [
        ["194 / 227", "premières mesures réussies avec l'iPhone"],
        ["2 cm", "précision d'une distance"],
        ["6 Hz", "mesures par seconde et par balise"],
        ["4 €", "le microcontrôleur qui répond à l'iPhone"],
    ],
    soundstage: [
        ["3", "balises au mur"],
        ["20 Hz", "positions envoyées au Mac"],
        ["8 cm", "précision de la carte des enceintes"],
        ["8", "canaux audio calculés en continu"],
    ],
    mesh: [
        ["2,5 Mbit/s", "débit mesuré dans un sens"],
        ["90 Hz", "mesures de distance sous charge"],
        ["6–9 mm", "écart-type par paire"],
        ["0", "erreur de trame"],
    ],
};
const INTROS = {
    uwb: "Mesuré sur le banc, entre l'iPhone et les cartes DWM3000.",
    soundstage: "Le système tel qu'il tourne dans le salon.",
    mesh: "Mesuré sur le banc : données et distances sur les mêmes cartes UWB.",
};
const DURATION = 900;

// "2,5 Mbit/s" -> { prefix: "", value: 2.5, decimals: 1, comma: true, suffix: " Mbit/s" }
function parse(text) {
    const m = text.match(/^(\D*?)(\d+(?:[.,]\d+)?)([\s\S]*)$/);
    if (!m) return { prefix: text, value: 0, decimals: 0, comma: false, suffix: "", none: true };
    const num = m[2], sep = num.search(/[.,]/);
    return {
        prefix: m[1], suffix: m[3],
        value: parseFloat(num.replace(",", ".")),
        decimals: sep < 0 ? 0 : num.length - sep - 1,
        comma: num.includes(","),
    };
}
const format = (p, v) => {
    const s = v.toFixed(p.decimals);
    return p.comma ? s.replace(".", ",") : s;
};
// A range ("–9 mm") keeps its upper bound at full size; any other suffix
// (unit, "/ 227") is set smaller so four tiles fit at 375 px.
function splitSuffix(suffix) {
    const m = suffix.match(/^([–-]\d+(?:[.,]\d+)?)([\s\S]*)$/);
    return m ? [m[1], m[2]] : ["", suffix];
}
const easeOut = (t) => 1 - Math.pow(1 - t, 3);

// Layout effect on the client (hide the final values before first paint), plain
// effect on the server where layout effects do nothing.
const useIsoLayoutEffect = typeof document !== "undefined" ? useLayoutEffect : useEffect;

export default function KeyNumbers({ set = "uwb" }) {
    const key = SETS[set] ? set : "uwb";
    const items = SETS[key];
    const parsed = items.map(([v]) => parse(v));
    const ref = useRef(null);
    // progress 0..1 of the count-up; 1 on the server so static HTML shows real values
    const [k, setK] = useState(1);
    const started = useRef(false);

    useIsoLayoutEffect(() => {
        const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
        const el = ref.current;
        if (reduce || !el || typeof IntersectionObserver === "undefined") return;
        setK(0);
        let raf;
        const run = () => {
            const t0 = performance.now();
            const tick = (now) => {
                const t = Math.min((now - t0) / DURATION, 1);
                setK(easeOut(t));
                if (t < 1) raf = requestAnimationFrame(tick);
            };
            raf = requestAnimationFrame(tick);
        };
        const io = new IntersectionObserver(([e]) => {
            if (e.isIntersecting && !started.current) { started.current = true; io.disconnect(); run(); }
        }, { threshold: 0.4 });
        io.observe(el);
        return () => { io.disconnect(); cancelAnimationFrame(raf); };
    }, []);

    return (
        <div ref={ref} className="not-prose rounded-[28px] bg-background-secondary dark:bg-background-secondary-dark p-5 sm:p-6">
            <div className="mb-4">
                <p className="text-title3 font-bold text-primary-text dark:text-primary-text-dark">En chiffres</p>
                <p className="text-sm text-secondary-text dark:text-secondary-text-dark">{INTROS[key]}</p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
            {items.map(([, label], i) => {
                const p = parsed[i];
                const [big, small] = splitSuffix(p.suffix);
                return (
                    <div key={i} className="rounded-2xl bg-background-primary dark:bg-background-primary-dark px-3 py-4 sm:px-4 text-center">
                        <p className="text-title1 font-bold leading-tight tabular-nums text-primary-text dark:text-primary-text-dark">
                            {p.prefix}{p.none ? null : format(p, p.value * k)}
                            {big}
                            {small && <span className="text-title3">{small}</span>}
                        </p>
                        <p className="mt-1 text-sm leading-snug text-secondary-text dark:text-secondary-text-dark">{label}</p>
                    </div>
                );
            })}
            </div>
        </div>
    );
}
