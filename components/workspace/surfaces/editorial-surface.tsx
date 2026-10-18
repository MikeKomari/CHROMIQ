import { Bookmark, Share2 } from "lucide-react";
import { Ed, type SurfaceProps } from "./editable";

const related = [
  { tag: "Notes", title: "Why quiet interfaces age well" },
  { tag: "Craft", title: "Spacing is a design decision, not a leftover" },
  { tag: "Process", title: "Choosing a type pair you can live with" },
];

export function EditorialSurface({ variant }: SurfaceProps) {
  return (
    <article className="sf-ed">
      <header className="sf-ed-masthead">
        <span className="sf-ed-date">Sample issue / No. 12</span>
        <h2 className="sf-ed-nameplate">
          <Ed>The Northstar Review</Ed>
        </h2>
        <nav className="sf-ed-nav" aria-label="Sections">
          <a href="#ed" onClick={(e) => e.preventDefault()}>Essays</a>
          <a href="#ed" onClick={(e) => e.preventDefault()}>Craft</a>
          <a href="#ed" onClick={(e) => e.preventDefault()}>Notes</a>
        </nav>
      </header>

      <div className="sf-ed-head">
        <Ed as="span" className="sf-ed-kicker">
          {variant === "b" ? "Direction 02" : "Long read"}
        </Ed>
        <Ed as="h1" className="sf-ed-title">
          Make room for the good stuff.
        </Ed>
        <Ed as="p" className="sf-ed-deck">
          A thoughtful toolkit for teams shaping products with clarity,
          character, and a little more breathing room.
        </Ed>
        <div className="sf-ed-byline">
          <span className="sf-ed-avatar" aria-hidden="true">AP</span>
          <span>
            By <b>Alex Placeholder</b>
            <small>Sample date / 8 min read</small>
          </span>
          <span className="sf-ed-actions">
            <button className="sf-icon-btn" aria-label="Save article">
              <Bookmark size={14} />
            </button>
            <button className="sf-icon-btn" aria-label="Share article">
              <Share2 size={14} />
            </button>
          </span>
        </div>
      </div>

      <figure className="sf-ed-figure">
        <div className="sf-ed-image" aria-hidden="true" />
        <Ed as="figcaption">Placeholder image / caption text sits here.</Ed>
      </figure>

      <div className="sf-ed-body">
        <Ed as="p" className="sf-ed-dropcap">
          Good design rarely announces itself. It shows up as the pause between
          two paragraphs, the weight of a heading that knows its place, the
          margin that lets a long sentence finish without crowding the next.
        </Ed>
        <Ed as="p">
          When a system is built from a small set of tokens, every choice has to
          earn its keep. Type, color, radius and spacing stop being decoration
          and become a shared vocabulary the whole team can read.
        </Ed>
        <blockquote className="sf-ed-quote">
          <Ed>Clarity is what is left when nothing else is competing.</Ed>
        </blockquote>
        <Ed as="p">
          Try changing a single value and watch the page respond. A wider
          measure, a slightly tighter line height, a softer accent: each one
          shifts the tone of the reading experience without touching the words.
        </Ed>
        <Ed as="h3">Start with the reading column</Ed>
        <Ed as="p">
          Body text deserves the most attention. Set it first, then let
          headings, captions and links take their cues from it.
        </Ed>
      </div>

      <section className="sf-ed-related" aria-label="Related articles">
        <h3 className="sf-ed-related-title">Keep reading</h3>
        <div className="sf-ed-related-row">
          {related.map((r) => (
            <a
              key={r.title}
              href="#ed"
              className="sf-ed-related-card"
              onClick={(e) => e.preventDefault()}
            >
              <span className="sf-ed-related-thumb" aria-hidden="true" />
              <small>{r.tag}</small>
              <strong>{r.title}</strong>
            </a>
          ))}
        </div>
      </section>
    </article>
  );
}
