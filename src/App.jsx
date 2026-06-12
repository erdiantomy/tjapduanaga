import { useState, useMemo } from "react";

/* ────────────────────────────────────────────────────────────
   TJAP DUA NAGA KOPITIAM — Branch Model v2
   Paper-ledger interface in the brand's chop-stamp crimson.
   Wide-range forecast: 20 → 1,000 sqm. Percentage drivers cap at 100%.
   Seats & staff auto-derive from sqm (toggle off for manual).
   Benchmark: TDN 2025 actuals.  All Rp in juta (jt).
   ──────────────────────────────────────────────────────────── */

const D0 = {
  sqm: 60, seats: 24, staff: 5,
  basket: 40, turns: 2.5, occ: 45,
  delMix: 40, delComm: 25, foodCost: 34,
  rentSqm: 100, salary: 2.6, days: 30,
};

const RANGES = {
  sqm:      { min: 20,  max: 1000, step: 5,   unit: " sqm" },
  seats:    { min: 8,   max: 420,  step: 2,   unit: "" },
  staff:    { min: 2,   max: 90,   step: 1,   unit: " ppl" },
  basket:   { min: 15,  max: 200,  step: 1,   unit: "K" },
  turns:    { min: 0.5, max: 8,    step: 0.5, unit: "×" },
  occ:      { min: 0,   max: 100,  step: 1,   unit: "%" },
  delMix:   { min: 0,   max: 100,  step: 1,   unit: "%" },
  delComm:  { min: 0,   max: 100,  step: 1,   unit: "%" },
  foodCost: { min: 0,   max: 100,  step: 1,   unit: "%" },
  rentSqm:  { min: 20,  max: 600,  step: 5,   unit: "K/sqm" },
  salary:   { min: 1,   max: 15,   step: 0.1, unit: " jt" },
  days:     { min: 20,  max: 31,   step: 1,   unit: " d" },
};

const seatsFromSqm = (sqm) => Math.round(sqm * 0.4);
const staffFromSqm = (sqm) => Math.max(2, Math.round(sqm / 12));

const CAPEX_BASE = [
  { cat: "Civil & Fit-out", items: [
    { n: "Interior & renovation", base: 36, drv: "sqm" },
    { n: "Electrical & plumbing", base: 9, drv: "sqm" },
    { n: "Air conditioning", base: 12, drv: "sqm" },
    { n: "Lighting", base: 4, drv: "sqm" },
  ]},
  { cat: "Furniture", items: [
    { n: "Tables & chairs", base: 14.4, drv: "seat" },
    { n: "Counter & cashier", base: 6, drv: "fix" },
    { n: "Shelving & storage", base: 3, drv: "sqm" },
  ]},
  { cat: "Kitchen & Bar", items: [
    { n: "Cooking line (mie station)", base: 12, drv: "seat" },
    { n: "Refrigeration", base: 8, drv: "seat" },
    { n: "Kopi bar & brewers", base: 6, drv: "fix" },
    { n: "Smallwares & tableware", base: 4, drv: "seat" },
  ]},
  { cat: "Brand & Tech", items: [
    { n: "Signage & facade", base: 8, drv: "fix" },
    { n: "POS (Runchize, 1yr)", base: 2.5, drv: "fix" },
    { n: "CCTV & sound", base: 3.5, drv: "fix" },
    { n: "Menu & print collateral", base: 1.5, drv: "fix" },
  ]},
  { cat: "Pre-opening", items: [
    { n: "Deposit + 3mo rent advance", base: 24, drv: "rent" },
    { n: "Licenses & legal", base: 4, drv: "fix" },
    { n: "Opening inventory", base: 15, drv: "seat" },
    { n: "Recruitment & training", base: 5, drv: "staff" },
    { n: "Launch marketing", base: 6, drv: "fix" },
  ]},
  { cat: "Contingency", items: [
    { n: "Buffer (~10%)", base: 17, drv: "capex" },
  ]},
];

const OPEX_BASE = [
  { n: "Payroll (crew)", drv: "payroll" },
  { n: "Rent", drv: "rentm" },
  { n: "Electricity & water", base: 2.5, drv: "sqm" },
  { n: "Internet & CMS", base: 1.0, drv: "fix" },
  { n: "Marketing & promo", base: 1.5, drv: "rev" },
  { n: "Maintenance", base: 0.8, drv: "sqm" },
  { n: "POS & admin", base: 1.2, drv: "fix" },
];

const LINE_CLAMP = 50000;
const fmt = (v, d = 1) => v == null || !isFinite(v) ? "∞" :
  v.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });
const cl = (v, lo, hi) => Math.min(Math.max(v, lo), hi);

/* ── brand tokens · from the Tjap Dua Naga chop ── */
const RED  = "#8E1A1B";   // dragon crimson — accents, headers, red ink
const RD   = "#A92219";   // losses (red ink, slightly hotter)
const GN   = "#2F6B45";   // gains (tea-leaf green)
const INK  = "#2A1B12";   // espresso ink
const MUT  = "#8C7456";   // faded ink
const PAPER = "#F4EBDA";  // aged kopitiam paper
const CARD  = "#FBF5E7";  // ledger card
const BRD   = "#DFCDA9";  // ruled line
const FIELD = "#FFFDF4";  // input wells

export default function App() {
  const [d, setD] = useState(D0);
  const [link, setLink] = useState(true);
  const [mf, setMf] = useState({});
  const [target, setTarget] = useState("");

  const setK = (k, raw) => {
    const v = +raw;
    if (isNaN(v)) return;
    const { min, max } = RANGES[k];
    const next = { ...d, [k]: cl(v, min, max) };
    if (link && k === "sqm") {
      next.seats = cl(seatsFromSqm(next.sqm), RANGES.seats.min, RANGES.seats.max);
      next.staff = cl(staffFromSqm(next.sqm), RANGES.staff.min, RANGES.staff.max);
    }
    setD(next);
  };

  const r = useMemo(() => ({
    sqm: d.sqm / D0.sqm,
    seat: d.seats / D0.seats,
    staff: d.staff / D0.staff,
    rent: (d.rentSqm * d.sqm) / (D0.rentSqm * D0.sqm),
    fix: 1,
  }), [d]);

  const capex = useMemo(() => {
    let running = 0;
    const cats = CAPEX_BASE.map((c, ci) => {
      const items = c.items.map((it, ii) => {
        const f = mf[`${ci}-${ii}`] ?? 1;
        const ratio = it.drv === "capex" ? null : (r[it.drv] ?? 1);
        const cost = it.drv === "capex"
          ? cl(Math.round(running * 0.1 * f * 10) / 10, 0, LINE_CLAMP)
          : cl(Math.round(it.base * ratio * f * 10) / 10, 0, LINE_CLAMP);
        running += cost;
        return { ...it, cost, delta: cost - it.base };
      });
      return { cat: c.cat, items, sub: items.reduce((s, i) => s + i.cost, 0) };
    });
    const total = cats.reduce((s, c) => s + c.sub, 0);
    const baseTotal = CAPEX_BASE.flatMap(c => c.items).reduce((s, i) => s + i.base, 0);
    return { cats, total, baseTotal, liveFactor: total / baseTotal };
  }, [r, mf]);

  const rebalance = () => {
    const t = parseFloat(target);
    if (!t || t <= 0 || isNaN(t)) return;
    const factor = t / capex.total;
    const next = {};
    CAPEX_BASE.forEach((c, ci) => c.items.forEach((_, ii) => {
      next[`${ci}-${ii}`] = (mf[`${ci}-${ii}`] ?? 1) * factor;
    }));
    setMf(next); setTarget("");
  };

  const pl = useMemo(() => {
    const covers = d.seats * d.turns * (d.occ / 100);
    const dineIn = covers * d.basket * d.days / 1000;
    const mixSafe = cl(d.delMix, 0, 95) / 100;
    const delivery = dineIn * mixSafe / (1 - mixSafe);
    const gross = dineIn + delivery;
    const revRatio = gross > 0 ? gross / 54 : 1;
    const cogs = gross * d.foodCost / 100;
    const comm = delivery * d.delComm / 100;
    const gp = gross - cogs - comm;
    const opexItems = OPEX_BASE.map((o) => {
      let cost;
      if (o.drv === "payroll") cost = d.staff * d.salary;
      else if (o.drv === "rentm") cost = (d.rentSqm * d.sqm) / 1000;
      else if (o.drv === "rev") cost = o.base * Math.max(0.5, revRatio);
      else cost = o.base * (r[o.drv] ?? 1);
      return { n: o.n, cost: Math.round(cost * 100) / 100 };
    });
    const opexTotal = opexItems.reduce((s, i) => s + i.cost, 0);
    const noi = gp - opexTotal;
    const margin = gross > 0 ? noi / gross : 0;
    const labor = opexItems[0].cost;
    const laborPct = gross > 0 ? labor / gross * 100 : 0;
    const cmPct = gross > 0 ? gp / gross : 0;
    const beRev = cmPct > 0 ? opexTotal / cmPct : Infinity;
    const payback = noi > 0 ? capex.total / noi : Infinity;
    const fiveYr = capex.total > 0 ? (noi * 60) / capex.total : 0;
    let cum = 0;
    const ramp = Array.from({ length: 12 }, (_, i) => {
      const m = i + 1;
      const rev = gross * (0.4 + 0.6 * m / 12);
      const mNoi = rev * cmPct - opexTotal;
      cum += mNoi;
      return { m, rev, mNoi, cum };
    });
    return { covers, dineIn, delivery, gross, cogs, comm, gp, noi, margin, laborPct, cmPct, beRev, payback, fiveYr, ramp, opexItems, opexTotal };
  }, [d, r, capex.total]);

  const deltas = useMemo(() =>
    capex.cats.flatMap((c) => c.items.map((it) => ({
      n: it.n, cat: c.cat, abs: it.delta, pct: it.base ? it.delta / it.base * 100 : 0,
    }))).filter(x => Math.abs(x.abs) > 0.05).sort((a, b) => Math.abs(b.abs) - Math.abs(a.abs)).slice(0, 10),
  [capex]);

  const pos = pl.noi > 0;
  const beMonth = pl.ramp.find(x => x.mNoi > 0)?.m;
  const maxBar = Math.max(...pl.ramp.map(x => x.rev), pl.beRev * 1.05, 1);

  const jump = (id) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });

  const Slider = ({ k, label, derived }) => {
    const { min, max, step, unit } = RANGES[k];
    return (
      <div style={{ marginBottom: 16, opacity: derived ? 0.55 : 1 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 11, letterSpacing: ".06em", textTransform: "uppercase", color: MUT, marginBottom: 6 }}>
          <span>{label}{derived && <span style={{ color: RED }}> · auto</span>}</span>
          <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <input type="number" value={d[k]} min={min} max={max} step={step}
              disabled={derived}
              onChange={(e) => setK(k, e.target.value)}
              style={{ width: 64, background: FIELD, border: `1px solid ${BRD}`, color: INK, padding: "4px 6px", borderRadius: 4, fontSize: 13, fontFamily: "'IBM Plex Mono',monospace", textAlign: "right" }} />
            <span style={{ color: MUT, fontSize: 11 }}>{unit}</span>
          </span>
        </div>
        <input type="range" min={min} max={max} step={step} value={d[k]}
          disabled={derived}
          onChange={(e) => setK(k, e.target.value)}
          style={{ width: "100%", accentColor: RED }} />
      </div>
    );
  };

  const Ledger = ({ id, children }) => (
    <div id={id} style={{ background: CARD, border: `1px solid ${BRD}`, borderRadius: 6, padding: "18px 18px 8px", scrollMarginTop: 150, boxShadow: "0 1px 2px rgba(80,40,20,.06)" }}>{children}</div>
  );
  const H = ({ children, right }) => (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 8, borderBottom: `2px solid ${RED}26`, paddingBottom: 8, marginBottom: 10 }}>
      <h2 style={{ fontFamily: "'Fraunces',serif", fontSize: 17, fontWeight: 700, color: RED, margin: 0, letterSpacing: ".01em" }}>{children}</h2>
      {right}
    </div>
  );
  const Row = ({ l, v, sub, color, dim }) => (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: `1px dotted ${BRD}`, fontSize: 13, gap: 10 }}>
      <span style={{ color: dim ? MUT : INK, paddingLeft: sub ? 14 : 0 }}>{l}</span>
      <span style={{ fontFamily: "'IBM Plex Mono',monospace", color: color || INK, whiteSpace: "nowrap" }}>{v}</span>
    </div>
  );
  const Ghost = ({ children }) => (
    <div style={{ fontSize: 10, color: MUT, marginTop: 2, lineHeight: 1.5 }}>{children}</div>
  );

  return (
    <div style={{ minHeight: "100vh", background: PAPER, color: INK, fontFamily: "'IBM Plex Sans',sans-serif" }}>
      <style>{`
        body{margin:0}
        input[type=range]{-webkit-appearance:none;background:#E7D9BB;border-radius:3px;height:6px;cursor:pointer;touch-action:none}
        input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:24px;height:24px;border-radius:50%;background:${RED};border:3px solid ${PAPER};box-shadow:0 0 0 1px ${RED};cursor:grab}
        input[type=range]::-webkit-slider-thumb:active{cursor:grabbing;transform:scale(1.15)}
        input[type=range]::-moz-range-thumb{width:24px;height:24px;border-radius:50%;background:${RED};border:3px solid ${PAPER};cursor:grab}
        input[type=range]:disabled::-webkit-slider-thumb{background:#C5B190;box-shadow:0 0 0 1px #C5B190}
        input[type=number]::-webkit-inner-spin-button{opacity:1}
        input:focus-visible,button:focus-visible{outline:2px solid ${RED};outline-offset:2px}
        @media(max-width:840px){.grid-main{grid-template-columns:1fr !important}}`}</style>

      {/* sticky ledger bar + quick nav */}
      <div style={{ position: "sticky", top: 0, zIndex: 10, background: "#F4EBDAF0", backdropFilter: "blur(8px)", borderBottom: `1px solid ${BRD}` }}>
        <div style={{ maxWidth: 1060, margin: "0 auto", padding: "10px 16px 6px", display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(120px,1fr))", gap: 12 }}>
          {[
            ["CAPEX", `Rp ${fmt(capex.total, 0)} jt`, `×${fmt(capex.liveFactor, 3)} vs seed`, RED],
            ["NOI / mo", `Rp ${fmt(pl.noi)} jt`, `margin ${fmt(pl.margin * 100)}%`, pos ? GN : RD],
            ["Payback", isFinite(pl.payback) ? `${fmt(pl.payback)} mo` : "∞", "steady state", pos ? INK : RD],
            ["5-yr multiple", `${fmt(pl.fiveYr, 2)}×`, "NOI×60 / CAPEX", pl.fiveYr >= 2 ? GN : INK],
          ].map(([l, v, s, c]) => (
            <div key={l}>
              <div style={{ fontSize: 10, letterSpacing: ".1em", textTransform: "uppercase", color: MUT }}>{l}</div>
              <div style={{ fontFamily: "'Fraunces',serif", fontSize: 21, fontWeight: 700, color: c, lineHeight: 1.1 }}>{v}</div>
              <div style={{ fontSize: 10, color: MUT }}>{s}</div>
            </div>
          ))}
        </div>
        <div style={{ maxWidth: 1060, margin: "0 auto", padding: "0 16px 8px", display: "flex", gap: 6, overflowX: "auto" }}>
          {[["drivers", "Drivers"], ["pnl", "P&L"], ["capexS", "CAPEX"], ["opexS", "OPEX"], ["rampS", "Ramp"]].map(([id, lbl]) => (
            <button key={id} onClick={() => jump(id)}
              style={{ background: "transparent", border: `1px solid ${BRD}`, color: MUT, borderRadius: 999, padding: "4px 14px", fontSize: 11, cursor: "pointer", whiteSpace: "nowrap" }}>
              {lbl}
            </button>
          ))}
        </div>
      </div>

      <div style={{ maxWidth: 1060, margin: "0 auto", padding: "24px 16px 60px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, margin: "4px 0 6px" }}>
          <img src="/logo.png" alt="Tjap Dua Naga Kopitiam" width="84" height="84" style={{ display: "block", flexShrink: 0 }} />
          <div>
            <h1 style={{ fontFamily: "'Fraunces',serif", fontSize: 30, fontWeight: 700, margin: 0, color: RED, lineHeight: 1.1 }}>
              Tjap Dua Naga <span style={{ color: INK }}>· Branch Model</span>
            </h1>
            <p style={{ color: MUT, fontSize: 13, margin: "6px 0 0" }}>
              20 → 1,000 sqm forecast range. Percentage drivers cap at 100%. Seats & crew follow sqm unless unlinked.
            </p>
          </div>
        </div>
        <div style={{ height: 18 }} />

        <div className="grid-main" style={{ display: "grid", gridTemplateColumns: "minmax(280px,320px) 1fr", gap: 20, alignItems: "start" }}>

          {/* ── DRIVERS ── */}
          <Ledger id="drivers">
            <H right={
              <button onClick={() => setLink(!link)}
                style={{ background: link ? RED : "transparent", color: link ? "#FBF5E7" : MUT, border: `1px solid ${link ? RED : BRD}`, borderRadius: 999, padding: "4px 12px", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
                {link ? "Linked to sqm" : "Manual"}
              </button>
            }>Drivers</H>
            <Slider k="sqm" label="Floor area" />
            <Slider k="seats" label="Seats" derived={link} />
            <Slider k="staff" label="Crew" derived={link} />
            <Slider k="basket" label="Avg basket" />
            <Slider k="turns" label="Table turns / day" />
            <Slider k="occ" label="Seat occupancy" />
            <Slider k="delMix" label="Delivery mix" />
            <Slider k="delComm" label="Platform commission" />
            <Slider k="foodCost" label="Food cost" />
            <Slider k="rentSqm" label="Rent" />
            <Slider k="salary" label="Salary / crew" />
            <Slider k="days" label="Days open" />
            <div style={{ fontSize: 11, color: MUT, paddingBottom: 10, lineHeight: 1.6 }}>
              {fmt(pl.covers, 0)} covers/day · dine-in Rp {fmt(pl.dineIn)} jt + delivery Rp {fmt(pl.delivery)} jt
              {link && <><br />auto: {seatsFromSqm(d.sqm)} seats (0.4/sqm) · {staffFromSqm(d.sqm)} crew (1/12 sqm)</>}
            </div>
          </Ledger>

          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

            {/* ── P&L ── */}
            <Ledger id="pnl">
              <H right={<span style={{ fontSize: 11, color: MUT }}>monthly, steady state</span>}>Profit & Loss</H>
              <Row l="Gross revenue" v={`Rp ${fmt(pl.gross)} jt`} />
              <Ghost>2025 actual steady state: Rp 45–57 jt/mo at 60 sqm. Anything materially above proven demand is a location bet — validate footfall.</Ghost>
              <Row l="COGS (food, drink, pack, gas)" v={`− ${fmt(pl.cogs)}`} sub dim />
              <Row l="Delivery commission" v={`− ${fmt(pl.comm)}`} sub dim />
              <Row l="Gross profit" v={`Rp ${fmt(pl.gp)} jt · ${fmt(pl.cmPct * 100, 0)}%`} color={RED} />
              <Row l="OPEX" v={`− ${fmt(pl.opexTotal)}`} sub dim />
              <Row l="NOI" v={`Rp ${fmt(pl.noi)} jt`} color={pos ? GN : RD} />
              <div style={{ display: "flex", gap: 18, padding: "10px 0 12px", flexWrap: "wrap" }}>
                <div>
                  <div style={{ fontSize: 10, color: MUT, textTransform: "uppercase", letterSpacing: ".08em" }}>Breakeven revenue</div>
                  <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 15 }}>Rp {fmt(pl.beRev)} jt/mo</div>
                  <Ghost>2025 actual: ~Rp 55 jt/mo</Ghost>
                </div>
                <div>
                  <div style={{ fontSize: 10, color: MUT, textTransform: "uppercase", letterSpacing: ".08em" }}>Labor % of revenue</div>
                  <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 15, color: pl.laborPct > 30 ? RD : pl.laborPct > 25 ? RED : GN }}>
                    {fmt(pl.laborPct)}%
                  </div>
                  <Ghost>2025 actual: 35.6% — the killer. Target ≤ 25%.</Ghost>
                </div>
                <div>
                  <div style={{ fontSize: 10, color: MUT, textTransform: "uppercase", letterSpacing: ".08em" }}>Revenue / sqm</div>
                  <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 15 }}>Rp {fmt(pl.gross / d.sqm * 1000, 0)}K</div>
                  <Ghost>2025 actual: ~Rp 900K/sqm</Ghost>
                </div>
              </div>
            </Ledger>

            {/* ── CAPEX ── */}
            <Ledger id="capexS">
              <H right={
                <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                  <input value={target} onChange={(e) => setTarget(e.target.value)} placeholder={`target (now ${fmt(capex.total, 0)})`}
                    inputMode="decimal"
                    style={{ width: 120, background: FIELD, border: `1px solid ${BRD}`, color: INK, padding: "6px 8px", borderRadius: 4, fontSize: 12, fontFamily: "'IBM Plex Mono',monospace" }} />
                  <button onClick={rebalance} style={{ background: RED, color: "#FBF5E7", border: 0, borderRadius: 4, padding: "7px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                    Rebalance
                  </button>
                  {Object.keys(mf).length > 0 &&
                    <button onClick={() => setMf({})} style={{ background: "transparent", color: MUT, border: `1px solid ${BRD}`, borderRadius: 4, padding: "7px 10px", fontSize: 12, cursor: "pointer" }}>Reset</button>}
                </div>
              }>CAPEX · Rp {fmt(capex.total, 0)} jt</H>
              {capex.cats.map((c) => (
                <div key={c.cat} style={{ marginBottom: 8 }}>
                  <Row l={c.cat} v={`Rp ${fmt(c.sub)} jt`} color={RED} />
                  {c.items.map((it) => (
                    <Row key={it.n} sub dim l={`${it.n}${it.drv !== "fix" ? ` · ${it.drv}` : ""}`}
                      v={<>
                        {fmt(it.cost)}
                        {Math.abs(it.delta) > 0.05 &&
                          <span style={{ color: it.delta > 0 ? RD : GN, marginLeft: 6, fontSize: 11 }}>
                            {it.delta > 0 ? "+" : ""}{fmt(it.delta)}
                          </span>}
                      </>} />
                  ))}
                </div>
              ))}
              <Ghost>Contingency floats at 10% of live build cost. At large formats (300+ sqm), unit costs per sqm typically compress 15–25% — treat the top of the range as conservative.</Ghost>
              <div style={{ height: 10 }} />
            </Ledger>

            {/* ── OPEX ── */}
            <Ledger id="opexS">
              <H>OPEX · Rp {fmt(pl.opexTotal)} jt / mo</H>
              {pl.opexItems.map((o) => <Row key={o.n} l={o.n} v={`Rp ${fmt(o.cost)} jt`} dim />)}
              <Ghost>Payroll = crew × salary, live. 2025 actual blended labor ran ~Rp 17 jt/mo against Rp 50 jt revenue — that ratio is what closed the store.</Ghost>
              <div style={{ height: 10 }} />
            </Ledger>

            {/* ── 12-MONTH RAMP ── */}
            <Ledger id="rampS">
              <H right={<span style={{ fontSize: 11, color: beMonth ? GN : RD }}>
                {beMonth ? `breaks even month ${beMonth}` : "never breaks even — adjust drivers"}</span>}>
                12-Month Ramp
              </H>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 130, position: "relative", marginBottom: 6 }}>
                <div style={{ position: "absolute", left: 0, right: 0, bottom: `${cl(pl.beRev / maxBar * 100, 0, 100)}%`, borderTop: `1px dashed ${RD}99` }}>
                  <span style={{ position: "absolute", right: 0, top: -14, fontSize: 9, color: RD }}>breakeven Rp {fmt(pl.beRev, 0)}</span>
                </div>
                {pl.ramp.map((x) => (
                  <div key={x.m} style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "flex-end", height: "100%" }}>
                    <div title={`M${x.m}: rev ${fmt(x.rev)} · NOI ${fmt(x.mNoi)}`}
                      style={{ height: `${x.rev / maxBar * 100}%`, background: x.mNoi > 0 ? GN : RD, borderRadius: "2px 2px 0 0", opacity: .85 }} />
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", gap: 4, fontSize: 9, color: MUT, marginBottom: 10 }}>
                {pl.ramp.map(x => <div key={x.m} style={{ flex: 1, textAlign: "center" }}>{x.m}</div>)}
              </div>
              <Row l="Year-1 cumulative NOI" v={`Rp ${fmt(pl.ramp[11].cum)} jt`} color={pl.ramp[11].cum > 0 ? GN : RD} />
              <Row l="vs CAPEX" v={`${fmt(pl.ramp[11].cum / capex.total * 100, 0)}% recovered in Y1`} dim />
              <div style={{ height: 8 }} />
            </Ledger>

            {/* ── SCALING DELTAS ── */}
            {deltas.length > 0 && (
              <Ledger>
                <H>Scaling Details · vs seed</H>
                {deltas.map((x) => (
                  <Row key={x.n} l={`${x.n} (${x.cat})`} dim
                    v={<span style={{ color: x.abs > 0 ? RD : GN }}>
                      {x.abs > 0 ? "+" : ""}{fmt(x.abs)} jt · {x.pct > 0 ? "+" : ""}{fmt(x.pct, 0)}%
                    </span>} />
                ))}
                <div style={{ height: 8 }} />
              </Ledger>
            )}

            <div style={{ fontSize: 11, color: MUT, lineHeight: 1.7, padding: "0 4px" }}>
              <span style={{ color: RED, fontFamily: "'Fraunces',serif", fontWeight: 600 }}>2025 benchmark · </span>
              Steady state Rp 50–57 jt/mo at ~60 sqm · breakeven Rp 55 jt · food cost 34.3% · labor 35.6% (cause of failure) ·
              delivery commission 35.5% of online GMV · basket ~Rp 40K (estimated). Delivery mix is slider-legal to 100% but computed at a 95% ceiling — at 100% the dine-in-anchored formula has no finite solution; a pure cloud-kitchen model needs a different revenue engine.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
