import { useMemo, useRef, useState } from "react";

// Three anchors, one phone. Distances are noisy; optionally one is made too long
// (a body between the phone and anchor C). Plain least squares swallows the bad
// range; the one-sided filter rejects it. All maths inline.

const ROOM = { w: 6, h: 4.5 };
const ANCHORS = [
    { id: "A", x: 0.5, y: 0.5 },
    { id: "B", x: 5.5, y: 0.5 },
    { id: "C", x: 3.0, y: 4.0 },
];
const SIGMA = 0.06;
const BLOCK = 0.7;
const ACCENT = "rgba(88, 86, 214, 1)";
const WARN = "#f0a030";
const BAD = "#e0483a";
const PHONE = "#34c759";

function seededNoise(seed) {
    let s = Math.floor(seed * 1000) % 2147483647;
    return () => { s = (s * 48271) % 2147483647; return (s / 2147483647 - 0.5) * 2 * 1.7; };
}

function solve(anchors, ranges, weights) {
    let x = ROOM.w / 2, y = ROOM.h / 2;
    for (let it = 0; it < 12; it++) {
        let h11 = 0, h12 = 0, h22 = 0, g1 = 0, g2 = 0;
        anchors.forEach((a, i) => {
            const dx = x - a.x, dy = y - a.y, d = Math.max(Math.hypot(dx, dy), 1e-3);
            const r = d - ranges[i], w = weights[i], jx = dx / d, jy = dy / d;
            h11 += w * jx * jx; h12 += w * jx * jy; h22 += w * jy * jy; g1 += w * jx * r; g2 += w * jy * r;
        });
        const det = h11 * h22 - h12 * h12;
        if (Math.abs(det) < 1e-9) break;
        const sx = (h22 * g1 - h12 * g2) / det, sy = (h11 * g2 - h12 * g1) / det;
        x -= sx; y -= sy;
        if (Math.hypot(sx, sy) < 1e-4) break;
    }
    return { x, y };
}

function Pill({ on, onChange, children }) {
    return (
        <button type="button" onClick={() => onChange(!on)}
            className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${on
                ? "bg-accent text-white"
                : "bg-background-primary dark:bg-background-primary-dark text-primary-text dark:text-primary-text-dark hover:opacity-80"}`}>
            {children}
        </button>
    );
}

export default function UwbTrilateration() {
    const [phone, setPhone] = useState({ x: 2.2, y: 2.4 });
    const [blocked, setBlocked] = useState(false);
    const [filter, setFilter] = useState(false);
    const dragging = useRef(false);
    const svgRef = useRef(null);

    const model = useMemo(() => {
        const noise = seededNoise(phone.x * 7.3 + phone.y * 3.1);
        const ranges = ANCHORS.map((a) => Math.hypot(phone.x - a.x, phone.y - a.y) + SIGMA * noise() + (blocked && a.id === "C" ? BLOCK : 0));
        const plain = solve(ANCHORS, ranges, [1, 1, 1]);
        let weights = [1, 1, 1], rejected = null;
        if (filter) {
            ANCHORS.forEach((a, i) => {
                const pred = Math.hypot(plain.x - a.x, plain.y - a.y);
                if (ranges[i] - pred > 3 * SIGMA) { weights[i] = 0; rejected = a.id; }
            });
        }
        const sol = filter ? solve(ANCHORS, ranges, weights.map((w) => w || 1e-3)) : plain;
        return { ranges, sol, err: Math.hypot(sol.x - phone.x, sol.y - phone.y), rejected };
    }, [phone, blocked, filter]);

    const toRoom = (evt) => {
        const svg = svgRef.current, pt = svg.createSVGPoint();
        const src = evt.touches ? evt.touches[0] : evt;
        pt.x = src.clientX; pt.y = src.clientY;
        const p = pt.matrixTransform(svg.getScreenCTM().inverse());
        return { x: Math.min(Math.max(p.x, 0.25), ROOM.w - 0.25), y: Math.min(Math.max(ROOM.h - p.y, 0.25), ROOM.h - 0.25) };
    };
    const start = (e) => { dragging.current = true; setPhone(toRoom(e)); };
    const move = (e) => { if (dragging.current) { e.preventDefault(); setPhone(toRoom(e)); } };
    const stop = () => { dragging.current = false; };
    const S = (p) => ({ x: p.x, y: ROOM.h - p.y });
    const ph = S(phone), so = S(model.sol);
    const errCm = Math.round(model.err * 100);

    return (
        <div className="not-prose rounded-[28px] bg-background-secondary dark:bg-background-secondary-dark p-5 sm:p-6">
            <div className="mb-4">
                <p className="text-title3 font-bold text-primary-text dark:text-primary-text-dark">Trilatération UWB</p>
                <p className="text-sm text-secondary-text dark:text-secondary-text-dark">
                    Déplacez le téléphone (vert). Les cercles sont les distances mesurées, bruit compris ; la croix est la position calculée.
                </p>
            </div>
            <svg ref={svgRef} viewBox={`0 0 ${ROOM.w} ${ROOM.h}`}
                className="w-full touch-none select-none rounded-3xl bg-background-primary dark:bg-background-primary-dark"
                style={{ aspectRatio: `${ROOM.w} / ${ROOM.h}` }}
                onMouseDown={start} onMouseMove={move} onMouseUp={stop} onMouseLeave={stop}
                onTouchStart={start} onTouchMove={move} onTouchEnd={stop}>
                <defs>
                    <radialGradient id="tri-ph" r="0.5"><stop offset="0" stopColor={PHONE} stopOpacity="0.35" /><stop offset="1" stopColor={PHONE} stopOpacity="0" /></radialGradient>
                </defs>
                {Array.from({ length: ROOM.w + 1 }, (_, i) => <line key={`v${i}`} x1={i} y1={0} x2={i} y2={ROOM.h} stroke="currentColor" strokeOpacity="0.06" strokeWidth="0.01" />)}
                {Array.from({ length: Math.ceil(ROOM.h) + 1 }, (_, i) => <line key={`h${i}`} x1={0} y1={i} x2={ROOM.w} y2={i} stroke="currentColor" strokeOpacity="0.06" strokeWidth="0.01" />)}
                {ANCHORS.map((a, i) => {
                    const s = S(a), bad = model.rejected === a.id, long = blocked && a.id === "C";
                    const col = bad ? BAD : long ? WARN : ACCENT;
                    return (
                        <g key={a.id}>
                            <circle cx={s.x} cy={s.y} r={model.ranges[i]} fill={col} fillOpacity="0.05" stroke={col}
                                strokeWidth="0.025" strokeOpacity={bad ? 0.5 : 0.85} strokeDasharray={bad ? "0.1 0.07" : undefined}
                                style={{ transition: "r 0.12s" }} />
                            <circle cx={s.x} cy={s.y} r="0.17" fill={ACCENT} />
                            <text x={s.x} y={s.y + 0.06} fontSize="0.16" textAnchor="middle" fill="white" fontWeight="600" fontFamily="ui-sans-serif, system-ui">{a.id}</text>
                            <text x={s.x} y={s.y + (a.y > ROOM.h / 2 ? -0.28 : 0.42)} fontSize="0.15" textAnchor="middle" fill="currentColor" fillOpacity="0.7" fontFamily="ui-monospace, monospace">
                                {model.ranges[i].toFixed(2)} m
                            </text>
                        </g>
                    );
                })}
                {blocked && (() => {
                    const c = ANCHORS[2], dx = c.x - phone.x, dy = c.y - phone.y, d = Math.hypot(dx, dy);
                    const b = S({ x: phone.x + (dx / d) * 0.3, y: phone.y + (dy / d) * 0.3 });
                    return <circle cx={b.x} cy={b.y} r="0.2" fill="currentColor" fillOpacity="0.2" />;
                })()}
                {/* solution: soft error link + cross */}
                <line x1={ph.x} y1={ph.y} x2={so.x} y2={so.y} stroke={BAD} strokeWidth="0.015" strokeOpacity="0.5" strokeDasharray="0.05 0.05" />
                <g stroke={BAD} strokeWidth="0.045" strokeLinecap="round" style={{ transition: "transform 0.12s" }}>
                    <line x1={so.x - 0.15} y1={so.y} x2={so.x + 0.15} y2={so.y} />
                    <line x1={so.x} y1={so.y - 0.15} x2={so.x} y2={so.y + 0.15} />
                </g>
                <circle cx={ph.x} cy={ph.y} r="0.45" fill="url(#tri-ph)" />
                <circle cx={ph.x} cy={ph.y} r="0.15" fill={PHONE} stroke="white" strokeWidth="0.035" style={{ cursor: "grab" }} />
            </svg>
            <div className="mt-4 flex flex-wrap items-center gap-2">
                <Pill on={blocked} onChange={setBlocked}>Mon corps devant C (+{BLOCK.toFixed(1)} m)</Pill>
                <Pill on={filter} onChange={setFilter}>Filtre à sens unique</Pill>
                <span className={`ml-auto rounded-full px-3 py-1.5 text-sm font-mono ${errCm > 25 ? "bg-red-500/15 text-red-500" : "bg-background-primary dark:bg-background-primary-dark text-primary-text dark:text-primary-text-dark"}`}>
                    erreur {errCm} cm{model.rejected ? ` · ${model.rejected} rejetée` : ""}
                </span>
            </div>
        </div>
    );
}
