import { ArrowRight, Blocks, Check, Gauge, Layers } from "lucide-react";
import { Ed, type SurfaceProps } from "./editable";

const features = [
  { icon: Layers, title: "Composable parts", body: "Small building blocks that fit together without extra glue." },
  { icon: Gauge, title: "Fast by default", body: "Sensible defaults so the first draft already feels considered." },
  { icon: Blocks, title: "Built to extend", body: "Bring your own components and keep the rules in one place." },
];

const tiers = [
  { name: "Starter", price: "$0", note: "For trying things out", items: ["One workspace", "Core components"], featured: false },
  { name: "Team", price: "$00", note: "For shared systems", items: ["Unlimited workspaces", "Shared tokens", "Version history"], featured: true },
  { name: "Scale", price: "Custom", note: "For larger groups", items: ["Everything in Team", "Admin controls"], featured: false },
];

export function SaasSurface({ variant }: SurfaceProps) {
  return (
    <div className="sf-saas">
      <header className="sf-saas-nav">
        <span className="sf-saas-logo"><i aria-hidden="true" /> Northstar</span>
        <nav aria-label="Primary">
          <a href="#s" onClick={(e) => e.preventDefault()}>Product</a>
          <a href="#s" onClick={(e) => e.preventDefault()}>Pricing</a>
          <a href="#s" onClick={(e) => e.preventDefault()}>Docs</a>
        </nav>
        <button className="sf-btn sf-btn-primary sf-btn-sm">Get started</button>
      </header>

      <section className="sf-saas-hero">
        <div className="sf-saas-hero-copy">
          <Ed as="span" className="sf-chip">
            {variant === "b" ? "Direction 02" : "Now in preview"}
          </Ed>
          <Ed as="h1" className="sf-saas-title">
            Build the interface your team actually wants.
          </Ed>
          <Ed as="p" className="sf-saas-lede">
            A calm, token-driven toolkit for shaping products with clarity and
            a little more room to think.
          </Ed>
          <div className="sf-row">
            <button className="sf-btn sf-btn-primary">
              Start building <ArrowRight size={14} />
            </button>
            <button className="sf-btn sf-btn-secondary">View the docs</button>
          </div>
        </div>
        <div className="sf-saas-mock" role="img" aria-label="Product panel mock">
          <div className="sf-saas-mock-bar"><i /><i /><i /></div>
          <div className="sf-saas-mock-body">
            <div className="sf-saas-mock-side">
              <b /><b /><b /><b />
            </div>
            <div className="sf-saas-mock-main">
              <div className="sf-saas-mock-line wide" />
              <div className="sf-saas-mock-line" />
              <div className="sf-saas-mock-tiles"><span /><span /><span /></div>
              <div className="sf-saas-mock-chart">
                <i style={{ height: "40%" }} /><i style={{ height: "65%" }} />
                <i style={{ height: "50%" }} /><i style={{ height: "80%" }} />
                <i style={{ height: "58%" }} /><i style={{ height: "90%" }} />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="sf-saas-features" aria-label="Features">
        {features.map(({ icon: Icon, title, body }) => (
          <div className="sf-saas-feature" key={title}>
            <span className="sf-saas-icon"><Icon size={18} /></span>
            <Ed as="h3">{title}</Ed>
            <Ed as="p">{body}</Ed>
          </div>
        ))}
      </section>

      <section className="sf-saas-pricing" aria-label="Pricing">
        <div className="sf-saas-section-head">
          <Ed as="h2">Simple plans</Ed>
          <small>Placeholder pricing</small>
        </div>
        <div className="sf-saas-tiers">
          {tiers.map((t) => (
            <div
              key={t.name}
              className={`sf-saas-tier${t.featured ? " is-featured" : ""}`}
            >
              <strong>{t.name}</strong>
              <span className="sf-saas-price">{t.price}</span>
              <small>{t.note}</small>
              <ul>
                {t.items.map((i) => (
                  <li key={i}><Check size={13} /> {i}</li>
                ))}
              </ul>
              <button
                className={`sf-btn ${t.featured ? "sf-btn-primary" : "sf-btn-secondary"}`}
              >
                Choose {t.name}
              </button>
            </div>
          ))}
        </div>
      </section>

      <section className="sf-saas-cta">
        <Ed as="h2">Ready when you are.</Ed>
        <button className="sf-btn sf-btn-inverse">Get started</button>
      </section>
    </div>
  );
}
