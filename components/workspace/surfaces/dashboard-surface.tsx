"use client";
import { useState } from "react";
import { Bell, BarChart3, Home, Search, Settings, Users } from "lucide-react";
import { Ed, type SurfaceProps } from "./editable";

const nav = [
  { icon: Home, label: "Overview" },
  { icon: BarChart3, label: "Reports" },
  { icon: Users, label: "Members" },
  { icon: Settings, label: "Settings" },
];

const kpis = [
  { label: "Metric A", value: "1,284", delta: "+4.2%" },
  { label: "Metric B", value: "92.4%", delta: "+0.8%" },
  { label: "Metric C", value: "318", delta: "-1.6%" },
  { label: "Metric D", value: "$12.6k", delta: "+2.1%" },
];

const bars = [42, 58, 49, 72, 64, 81, 70, 88, 76, 94, 83, 90];

const rows = [
  { name: "Project Alpha", owner: "Sample A", status: "success", label: "Healthy" },
  { name: "Project Beta", owner: "Sample B", status: "warning", label: "Review" },
  { name: "Project Gamma", owner: "Sample C", status: "danger", label: "Blocked" },
  { name: "Project Delta", owner: "Sample D", status: "success", label: "Healthy" },
];

const filters = ["All", "Healthy", "Review", "Blocked"];
const ranges = ["7d", "30d", "90d"];

export function DashboardSurface({ variant }: SurfaceProps) {
  const [filter, setFilter] = useState("All");
  const [range, setRange] = useState("30d");
  const [compare, setCompare] = useState(true);
  const shown = rows.filter((r) => filter === "All" || r.label === filter);
  const max = Math.max(...bars);

  return (
    <div className="sf-dash">
      <aside className="sf-dash-side" aria-label="App navigation">
        <span className="sf-dash-logo"><i aria-hidden="true" /> Northstar</span>
        {nav.map(({ icon: Icon, label }, i) => (
          <a
            key={label}
            href="#d"
            className={i === 0 ? "is-active" : ""}
            aria-current={i === 0 ? "page" : undefined}
            onClick={(e) => e.preventDefault()}
          >
            <Icon size={15} /> <span>{label}</span>
          </a>
        ))}
      </aside>

      <div className="sf-dash-main">
        <div className="sf-dash-top">
          <label className="sf-dash-search">
            <Search size={14} />
            <input type="search" placeholder="Search" aria-label="Search" />
          </label>
          <button className="sf-icon-btn" aria-label="Notifications">
            <Bell size={14} />
          </button>
          <button className="sf-btn sf-btn-primary sf-btn-sm" disabled>
            Export
          </button>
        </div>

        <div className="sf-dash-content">
          <div className="sf-dash-head">
            <div>
              <Ed as="h2">{variant === "b" ? "Direction 02" : "Overview"}</Ed>
              <small className="sf-chip">Sample data</small>
            </div>
            <div className="sf-seg" role="group" aria-label="Date range">
              {ranges.map((r) => (
                <button
                  key={r}
                  aria-pressed={range === r}
                  className={range === r ? "is-on" : ""}
                  onClick={() => setRange(r)}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          <div className="sf-dash-kpis">
            {kpis.map((k) => (
              <div className="sf-dash-kpi" key={k.label}>
                <small>{k.label}</small>
                <strong>{k.value}</strong>
                <span className={k.delta.startsWith("-") ? "is-down" : "is-up"}>
                  {k.delta}
                </span>
              </div>
            ))}
          </div>

          <div className="sf-dash-panel">
            <div className="sf-dash-panel-head">
              <Ed as="h3">Activity</Ed>
              <label className="sf-switch-row">
                <button
                  role="switch"
                  aria-checked={compare}
                  aria-label="Compare to previous period"
                  className={`sf-switch${compare ? " is-on" : ""}`}
                  onClick={() => setCompare((c) => !c)}
                />
                Compare
              </label>
            </div>
            <svg
              className="sf-dash-chart"
              viewBox="0 0 240 90"
              preserveAspectRatio="none"
              role="img"
              aria-label="Sample bar chart"
            >
              {bars.map((b, i) => (
                <g key={i}>
                  {compare && (
                    <rect
                      className="sf-chart-prev"
                      x={i * 20 + 3}
                      y={88 - (b * 0.7 * 80) / max}
                      width="6"
                      height={(b * 0.7 * 80) / max}
                      rx="1"
                    />
                  )}
                  <rect
                    className="sf-chart-bar"
                    x={i * 20 + (compare ? 10 : 6)}
                    y={88 - (b * 80) / max}
                    width={compare ? 6 : 10}
                    height={(b * 80) / max}
                    rx="1"
                  />
                </g>
              ))}
              <line x1="0" x2="240" y1="88" y2="88" className="sf-chart-axis" />
            </svg>
          </div>

          <div className="sf-dash-panel">
            <div className="sf-dash-panel-head">
              <Ed as="h3">Projects</Ed>
              <div className="sf-chips" role="group" aria-label="Filter by status">
                {filters.map((f) => (
                  <button
                    key={f}
                    aria-pressed={filter === f}
                    className={`sf-chip-btn${filter === f ? " is-on" : ""}`}
                    onClick={() => setFilter(f)}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>
            <div className="sf-table-wrap">
              <table className="sf-table">
                <thead>
                  <tr><th>Name</th><th>Owner</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {shown.map((r) => (
                    <tr key={r.name} tabIndex={0}>
                      <td>{r.name}</td>
                      <td>{r.owner}</td>
                      <td><span className={`sf-badge is-${r.status}`}>{r.label}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
