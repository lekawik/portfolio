import { useEffect, useRef, useState } from "react";

// A fixed six-step story of one blocked UWB range. Three anchors, one phone that
// does not move. A body between the phone and anchor C makes C's range 70 cm too
// long; a plain least-squares fix drifts, a one-sided gate (ranges can only be
// too long) drops C and the fix comes back. All maths inline and deterministic.

const ROOM = { w: 6, h: 4.5 };
const ANCHORS = [
    { id: "A", x: 0.5, y: 0.5 },
    { id: "B", x: 5.5, y: 0.5 },
    { id: "C", x: 3.0, y: 4.0 },
];
const PHONE = { x: 2.4, y: 2.2 };
const NOISE = [0.02, -0.03, 0.004];   // fixed per-anchor range noise (m)
const SIGMA = 0.06;                  // assumed range standard deviation (m)
const BLOCK = 0.7;                   // extra path through / around the body (m)
const STEP_MS = 2500;
const ACCENT = "rgba(88,86,214,1)";
const ORANGE = "#f0a030";
const GREEN = "#34c759";
const RED = "#e0483a";

// Weighted Gauss-Newton on range residuals, same as the old trilateration toy.
function solve(ranges, weights, init) {
    let x = init.x, y = init.y;
    for (let it = 0; it < 20; it++) {
        let h11 = 0, h12 = 0, h22 = 0, g1 = 0, g2 = 0;
        ANCHORS.forEach((a, i) => {
            const dx = x - a.x, dy = y - a.y, d = Math.max(Math.hypot(dx, dy), 1e-3);
            const r = d - ranges[i], w = weights[i], jx = dx / d, jy = dy / d;
            h11 += w * jx * jx; h12 += w * jx * jy; h22 += w * jy * jy; g1 += w * jx * r; g2 += w * jy * r;
        });
        const det = h11 * h22 - h12 * h12;
        if (Math.abs(det) < 1e-9) break;
        const sx = (h22 * g1 - h12 * g2) / det, sy = (h11 * g2 - h12 * g1) / det;
        x -= sx; y -= sy;
        if (Math.hypot(sx, sy) < 1e-5) break;
    }
    return { x, y };
}

const dist = (p, q) => Math.hypot(p.x - q.x, p.y - q.y);
const W = 1 / (SIGMA * SIGMA);
const CENTER = { x: ROOM.w / 2, y: ROOM.h / 2 };

// Everything the story needs, computed once at module load (same on server and client).
const CLEAN = ANCHORS.map((a, i) => dist(PHONE, a) + NOISE[i]);
const BLOCKED = CLEAN.map((r, i) => (ANCHORS[i].id === "C" ? r + BLOCK : r));
const FIX_CLEAN = solve(CLEAN, [W, W, W], CENTER);
const FIX_NAIVE = solve(BLOCKED, [W, W, W], FIX_CLEAN);
// The gate compares each new range with the range predicted from the tracked
// position (the last good fix). Only a positive excess is suspicious.
const INNOVATION = BLOCKED.map((r, i) => r - dist(FIX_CLEAN, ANCHORS[i]));
const GATED = INNOVATION.map((e) => e > 3 * SIGMA);
const FIX_GATED = solve(BLOCKED, GATED.map((g) => (g ? 0 : W)), FIX_CLEAN);

// Body disc: 35 cm from the phone, towards C.
const toC = { x: ANCHORS[2].x - PHONE.x, y: ANCHORS[2].y - PHONE.y };
const toCLen = Math.hypot(toC.x, toC.y);
const BODY = { x: PHONE.x + (toC.x / toCLen) * 0.4, y: PHONE.y + (toC.y / toCLen) * 0.4 };

const STEPS = [
    {
        title: "Trois distances propres",
        caption: "Chaque balise mesure sa distance au téléphone : trois cercles. Leur point commun, calculé par moindres carrés, tombe sur le téléphone à quelques centimètres près.",
        extra: 0, fix: FIX_CLEAN, body: false, cState: "ok",
    },
    {
        title: "Je me retourne",
        caption: "Je tourne le dos à la balise C : mon corps se retrouve entre le téléphone et elle. L'onde UWB ne le traverse presque pas.",
        extra: 0, fix: FIX_CLEAN, body: true, cState: "ok",
    },
    {
        title: "C lit 70 cm de trop",
        caption: "Le signal direct est absorbé ; C ne reçoit plus qu'un trajet qui contourne le corps ou rebondit sur un mur. Il est plus long : C annonce 70 cm de trop.",
        extra: BLOCK, fix: FIX_CLEAN, body: true, cState: "long",
    },
    {
        title: "La solution naïve dérive",
        caption: "Les moindres carrés font confiance aux trois mesures et répartissent l'erreur : la position calculée glisse loin du téléphone, qui n'a pourtant pas bougé.",
        extra: BLOCK, fix: FIX_NAIVE, body: true, cState: "long",
    },
    {
        title: "Trop longue, donc suspecte",
        caption: "Le filtre compare chaque distance à celle qu'il attendait d'après la position suivie. C dépasse de 70 cm, bien plus que trois écarts-types (18 cm) : elle est suspecte.",
        extra: BLOCK, fix: FIX_NAIVE, body: true, cState: "rejected",
    },
    {
        title: "Le filtre à sens unique l'ignore",
        caption: "Une distance UWB ne peut être que trop longue (corps, réflexion), jamais trop courte : rien ne va plus vite que le trajet direct. Le filtre n'écarte donc que les excès. Avec A et B seules, la croix revient sur le téléphone.",
        extra: BLOCK, fix: FIX_GATED, body: true, cState: "rejected",
    },
];

const S = (p) => ({ x: p.x, y: ROOM.h - p.y });   // room (y up) -> SVG (y down)
const f3 = (v) => v.toFixed(3);
const frNum = (v, d) => v.toFixed(d).replace(".", ",");
const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

// Smoothly tweens {extra, x, y} towards the current step's target.
function useTween(target, ms = 700) {
    const [v, setV] = useState(target);
    const cur = useRef(target);
    useEffect(() => {
        const from = { ...cur.current }, t0 = performance.now();
        let raf;
        const tick = (now) => {
            const k = ease(Math.min((now - t0) / ms, 1));
            const next = {
                extra: from.extra + (target.extra - from.extra) * k,
                x: from.x + (target.x - from.x) * k,
                y: from.y + (target.y - from.y) * k,
            };
            cur.current = next; setV(next);
            if (k < 1) raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(raf);
    }, [target.extra, target.x, target.y, ms]);
    return v;
}

export default function BodyBlockStory() {
    const [step, setStep] = useState(0);
    const [auto, setAuto] = useState(false);
    const last = STEPS.length - 1;

    // Auto-play starts once hydrated (client:visible), unless reduced motion is asked.
    useEffect(() => {
        const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
        if (!reduce) setAuto(true);
    }, []);
    useEffect(() => {
        if (!auto) return;
        if (step >= last) { setAuto(false); return; }
        const id = setTimeout(() => setStep((s) => Math.min(s + 1, last)), STEP_MS);
        return () => clearTimeout(id);
    }, [auto, step, last]);

    const st = STEPS[step];
    const tw = useTween({ extra: st.extra, x: st.fix.x, y: st.fix.y });
    const fix = { x: tw.x, y: tw.y };
    const errCm = Math.round(dist(fix, PHONE) * 100);
    const bad = errCm > 15;

    const next = () => { setAuto(false); setStep((s) => Math.min(s + 1, last)); };
    const replay = () => { setStep(0); setAuto(true); };
    const goto = (i) => { setAuto(false); setStep(i); };

    const ph = S(PHONE), so = S(fix), body = S(BODY);
    const innovC = INNOVATION[2];

    return (
        <div className="not-prose rounded-[28px] bg-background-secondary dark:bg-background-secondary-dark p-5 sm:p-6">
            <div className="mb-4">
                <p className="text-title3 font-bold text-primary-text dark:text-primary-text-dark">Un corps devant une balise</p>
                <p className="text-sm text-secondary-text dark:text-secondary-text-dark">
                    Le téléphone ne bouge pas. En six étapes : ce qu'un corps fait à une mesure UWB, et comment le filtre s'en protège.
                </p>
            </div>

            <svg viewBox={`0 0 ${ROOM.w} ${ROOM.h}`}
                className="w-full select-none rounded-3xl bg-background-primary dark:bg-background-primary-dark text-primary-text dark:text-primary-text-dark"
                style={{ aspectRatio: `${ROOM.w} / ${ROOM.h}` }}
                role="img" aria-label={`Étape ${step + 1} : ${st.title}`}>
                <defs>
                    <radialGradient id="bbs-ph" r="0.5"><stop offset="0" stopColor={GREEN} stopOpacity="0.35" /><stop offset="1" stopColor={GREEN} stopOpacity="0" /></radialGradient>
                </defs>
                {Array.from({ length: ROOM.w + 1 }, (_, i) => <line key={`v${i}`} x1={i} y1={0} x2={i} y2={ROOM.h} stroke="currentColor" strokeOpacity="0.06" strokeWidth="0.01" />)}
                {Array.from({ length: Math.ceil(ROOM.h) + 1 }, (_, i) => <line key={`h${i}`} x1={0} y1={i} x2={ROOM.w} y2={i} stroke="currentColor" strokeOpacity="0.06" strokeWidth="0.01" />)}

                {/* range circles */}
                {ANCHORS.map((a, i) => {
                    const s = S(a), isC = a.id === "C";
                    const r = CLEAN[i] + (isC ? tw.extra : 0);
                    const state = isC ? st.cState : "ok";
                    const col = state === "rejected" ? RED : state === "long" ? ORANGE : ACCENT;
                    return (
                        <circle key={`c${a.id}`} cx={f3(s.x)} cy={f3(s.y)} r={f3(r)}
                            fill={col} fillOpacity={state === "rejected" ? "0.02" : "0.05"} stroke={col}
                            strokeWidth="0.025" strokeOpacity={state === "rejected" ? "0.7" : "0.85"}
                            strokeDasharray={state === "rejected" ? "0.12 0.08" : undefined}
                            style={{ transition: "stroke 0.4s, fill 0.4s" }} />
                    );
                })}

                {/* body between the phone and C */}
                <g style={{ opacity: st.body ? 1 : 0, transition: "opacity 0.6s" }}>
                    <circle cx={f3(body.x)} cy={f3(body.y)} r="0.24" fill="currentColor" fillOpacity="0.18" stroke="currentColor" strokeOpacity="0.3" strokeWidth="0.015" />
                    <text x={f3(body.x + 0.3)} y={f3(body.y + 0.05)} fontSize="0.17" fill="currentColor" fillOpacity="0.6" fontFamily="ui-sans-serif, system-ui">corps</text>
                </g>

                {/* anchors and their ranges */}
                {ANCHORS.map((a, i) => {
                    const s = S(a), isC = a.id === "C";
                    const r = CLEAN[i] + (isC ? tw.extra : 0);
                    const top = a.y > ROOM.h / 2;
                    return (
                        <g key={a.id}>
                            <circle cx={f3(s.x)} cy={f3(s.y)} r="0.17" fill={ACCENT} />
                            <text x={f3(s.x)} y={f3(s.y + 0.06)} fontSize="0.17" textAnchor="middle" fill="white" fontWeight="600" fontFamily="ui-sans-serif, system-ui">{a.id}</text>
                            <text x={f3(top ? s.x - 0.26 : s.x)} y={f3(top ? s.y + 0.05 : s.y + 0.42)} fontSize="0.18"
                                textAnchor={top ? "end" : "middle"} fill="currentColor" fillOpacity="0.7" fontFamily="ui-monospace, monospace">
                                {frNum(r, 2)} m
                            </text>
                        </g>
                    );
                })}

                {/* gate verdict next to C */}
                <text x={f3(S(ANCHORS[2]).x + 0.26)} y={f3(S(ANCHORS[2]).y + 0.05)} fontSize="0.18" fill={RED} fontWeight="600"
                    fontFamily="ui-monospace, monospace" style={{ opacity: st.cState === "rejected" ? 1 : 0, transition: "opacity 0.4s" }}>
                    +{frNum(innovC, 2)} m &gt; 3σ
                </text>

                {/* error link, cross, phone */}
                <line x1={f3(ph.x)} y1={f3(ph.y)} x2={f3(so.x)} y2={f3(so.y)} stroke={RED} strokeWidth="0.015" strokeOpacity={bad ? "0.6" : "0"} strokeDasharray="0.05 0.05" />
                <circle cx={f3(ph.x)} cy={f3(ph.y)} r="0.45" fill="url(#bbs-ph)" />
                <circle cx={f3(ph.x)} cy={f3(ph.y)} r="0.15" fill={GREEN} stroke="white" strokeWidth="0.035" />
                <g stroke={bad ? RED : "currentColor"} strokeOpacity={bad ? "1" : "0.85"} strokeWidth="0.045" strokeLinecap="round">
                    <line x1={f3(so.x - 0.15)} y1={f3(so.y)} x2={f3(so.x + 0.15)} y2={f3(so.y)} />
                    <line x1={f3(so.x)} y1={f3(so.y - 0.15)} x2={f3(so.x)} y2={f3(so.y + 0.15)} />
                </g>
            </svg>

            <div className="mt-4 flex items-center justify-between gap-3">
                <p className="text-body font-bold text-primary-text dark:text-primary-text-dark">
                    <span className="font-mono text-secondary-text dark:text-secondary-text-dark mr-2">{step + 1}/{STEPS.length}</span>
                    {st.title}
                </p>
                <span className={`shrink-0 rounded-full px-3 py-1.5 text-sm font-mono ${bad
                    ? "bg-red-500/15 text-red-500"
                    : "bg-background-primary dark:bg-background-primary-dark text-primary-text dark:text-primary-text-dark"}`}>
                    erreur {errCm} cm
                </span>
            </div>
            <p className="mt-2 min-h-[5.5rem] sm:min-h-[4rem] text-sm text-secondary-text dark:text-secondary-text-dark">{st.caption}</p>

            <div className="mt-3 flex flex-wrap items-center gap-2">
                <button type="button" onClick={next} disabled={step >= last}
                    className="rounded-full px-5 py-2.5 text-body font-medium bg-accent text-white transition-opacity hover:opacity-90 disabled:opacity-40">
                    Étape suivante
                </button>
                <button type="button" onClick={replay}
                    className="rounded-full px-4 py-2.5 text-body font-medium bg-background-primary dark:bg-background-primary-dark text-primary-text dark:text-primary-text-dark hover:opacity-80">
                    Rejouer
                </button>
                <div className="ml-auto flex items-center gap-1.5" aria-label="Étapes">
                    {STEPS.map((s, i) => (
                        <button key={i} type="button" onClick={() => goto(i)} title={s.title} aria-label={`Étape ${i + 1} : ${s.title}`}
                            className={`h-2.5 rounded-full transition-all ${i === step ? "w-6 bg-accent" : "w-2.5 bg-gray opacity-40 hover:opacity-70"}`} />
                    ))}
                </div>
            </div>
        </div>
    );
}
