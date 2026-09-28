import { useMemo, useRef, useState } from "react";

// Three anchors, one phone. Distances are noisy; optionally one is made too long
// (a body between the phone and anchor C). Plain least squares swallows the bad
// range; the one-sided filter rejects it. All maths inline: nothing to install.

const ROOM = { w: 6, h: 4.5 };           // metres
const ANCHORS = [
    { id: "A", x: 0.4, y: 0.4 },
    { id: "B", x: 5.6, y: 0.4 },
    { id: "C", x: 3.0, y: 4.1 },
];
const SIGMA = 0.06;                        // typical UWB noise, m
const BLOCK = 0.7;                         // body-blocked range excess, m

function seededNoise(seed) {
    // deterministic per position so the picture does not flicker
    let s = Math.floor(seed * 1000) % 2147483647;
    return () => {
        s = (s * 48271) % 2147483647;
        return (s / 2147483647 - 0.5) * 2 * 1.7;
    };
}

function solve(anchors, ranges, weights) {
    // Gauss-Newton from the room centre, weighted least squares on (d - r).
    let x = ROOM.w / 2, y = ROOM.h / 2;
    for (let it = 0; it < 12; it++) {
        let h11 = 0, h12 = 0, h22 = 0, g1 = 0, g2 = 0;
        anchors.forEach((a, i) => {
            const dx = x - a.x, dy = y - a.y;
            const d = Math.max(Math.hypot(dx, dy), 1e-3);
            const r = d - ranges[i];
            const w = weights[i];
            const jx = dx / d, jy = dy / d;
            h11 += w * jx * jx; h12 += w * jx * jy; h22 += w * jy * jy;
            g1 += w * jx * r; g2 += w * jy * r;
        });
        const det = h11 * h22 - h12 * h12;
        if (Math.abs(det) < 1e-9) break;
        const sx = (h22 * g1 - h12 * g2) / det, sy = (h11 * g2 - h12 * g1) / det;
        x -= sx; y -= sy;
        if (Math.hypot(sx, sy) < 1e-4) break;
    }
    return { x, y };
}

export default function UwbTrilateration() {
    const [phone, setPhone] = useState({ x: 2.2, y: 2.4 });
    const [blocked, setBlocked] = useState(false);
    const [filter, setFilter] = useState(false);
    const dragging = useRef(false);
    const svgRef = useRef(null);

    const model = useMemo(() => {
        const noise = seededNoise(phone.x * 7.3 + phone.y * 3.1);
        const ranges = ANCHORS.map((a, i) => {
            const d = Math.hypot(phone.x - a.x, phone.y - a.y);
            return d + SIGMA * noise() + (blocked && a.id === "C" ? BLOCK : 0);
        });
        const plain = solve(ANCHORS, ranges, [1, 1, 1]);
        // one-sided gate: a range LONGER than the plain solution predicts by > 3 sigma
        // is a body block; drop it and re-solve (the real filter does this per update)
        let weights = [1, 1, 1];
        let rejected = null;
        if (filter) {
            ANCHORS.forEach((a, i) => {
                const pred = Math.hypot(plain.x - a.x, plain.y - a.y);
                if (ranges[i] - pred > 3 * SIGMA) { weights[i] = 0; rejected = a.id; }
            });
        }
        const sol = filter ? solve(ANCHORS, ranges, weights.map((w) => w || 1e-3)) : plain;
        const err = Math.hypot(sol.x - phone.x, sol.y - phone.y);
        return { ranges, sol, err, rejected };
    }, [phone, blocked, filter]);

    const toRoom = (evt) => {
        const svg = svgRef.current;
        const pt = svg.createSVGPoint();
        const src = evt.touches ? evt.touches[0] : evt;
        pt.x = src.clientX; pt.y = src.clientY;
        const p = pt.matrixTransform(svg.getScreenCTM().inverse());
        return { x: Math.min(Math.max(p.x, 0.2), ROOM.w - 0.2), y: Math.min(Math.max(ROOM.h - p.y, 0.2), ROOM.h - 0.2) };
    };
    const start = (e) => { dragging.current = true; setPhone(toRoom(e)); };
    const move = (e) => { if (dragging.current) { e.preventDefault(); setPhone(toRoom(e)); } };
    const stop = () => { dragging.current = false; };
    const S = (p) => ({ x: p.x, y: ROOM.h - p.y });   // room (y up) -> svg (y down)

    return (
        <div className="not-prose">
            <p className="text-title3 font-bold text-primary-text dark:text-primary-text-dark">Trilatération UWB</p>
            <p className="text-sm text-secondary-text dark:text-secondary-text-dark mb-3">
                Déplacez le téléphone (vert). Les cercles sont les distances mesurées, bruit compris. La croix est la position calculée.
            </p>
            <svg
                ref={svgRef}
                viewBox={`0 0 ${ROOM.w} ${ROOM.h}`}
                className="w-full touch-none select-none bg-background-secondary dark:bg-background-secondary-dark"
                style={{ aspectRatio: `${ROOM.w} / ${ROOM.h}` }}
                onMouseDown={start} onMouseMove={move} onMouseUp={stop} onMouseLeave={stop}
                onTouchStart={start} onTouchMove={move} onTouchEnd={stop}
            >
                {ANCHORS.map((a, i) => {
                    const s = S(a);
                    const bad = model.rejected === a.id;
                    return (
                        <g key={a.id}>
                            <circle cx={s.x} cy={s.y} r={model.ranges[i]} fill="none"
                                stroke={bad ? "#d98a1f" : "rgba(88,86,214,0.8)"} strokeWidth="0.02"
                                strokeDasharray={bad ? "0.08 0.06" : undefined} />
                            <rect x={s.x - 0.12} y={s.y - 0.12} width="0.24" height="0.24" fill="rgba(88,86,214,1)" />
                            <text x={s.x} y={s.y - 0.2} fontSize="0.22" textAnchor="middle" fill="currentColor">{a.id}</text>
                            <text x={s.x} y={s.y + 0.4} fontSize="0.16" textAnchor="middle" fill="currentColor" opacity="0.7">
                                {model.ranges[i].toFixed(2)} m
                            </text>
                        </g>
                    );
                })}
                {blocked && (() => {
                    // the body: a disc between the phone and C
                    const c = ANCHORS[2];
                    const dx = c.x - phone.x, dy = c.y - phone.y, d = Math.hypot(dx, dy);
                    const b = S({ x: phone.x + (dx / d) * 0.25, y: phone.y + (dy / d) * 0.25 });
                    return <circle cx={b.x} cy={b.y} r="0.18" fill="currentColor" opacity="0.25" />;
                })()}
                {(() => {
                    const s = S(model.sol);
                    return (
                        <g stroke="#e0483a" strokeWidth="0.04">
                            <line x1={s.x - 0.15} y1={s.y} x2={s.x + 0.15} y2={s.y} />
                            <line x1={s.x} y1={s.y - 0.15} x2={s.x} y2={s.y + 0.15} />
                        </g>
                    );
                })()}
                {(() => {
                    const s = S(phone);
                    return <circle cx={s.x} cy={s.y} r="0.14" fill="#34c759" stroke="white" strokeWidth="0.03" style={{ cursor: "grab" }} />;
                })()}
            </svg>
            <div className="mt-3 flex flex-wrap gap-4 items-center text-sm text-primary-text dark:text-primary-text-dark">
                <label className="flex items-center gap-2">
                    <input type="checkbox" checked={blocked} onChange={(e) => setBlocked(e.target.checked)} />
                    Mon corps entre le téléphone et C (+{BLOCK.toFixed(1)} m)
                </label>
                <label className="flex items-center gap-2">
                    <input type="checkbox" checked={filter} onChange={(e) => setFilter(e.target.checked)} />
                    Filtre à sens unique (rejette les distances trop longues)
                </label>
                <span className="font-mono">
                    erreur {Math.round(model.err * 100)} cm{model.rejected ? `, ${model.rejected} rejetée` : ""}
                </span>
            </div>
        </div>
    );
}
