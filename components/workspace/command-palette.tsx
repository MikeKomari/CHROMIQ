import {
  Command,
  Contrast,
  Download,
  Globe2,
  Palette,
  Search,
  Sun,
  SunMoon,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useContrast } from "@/hooks/use-contrast";
import { UI_SCALES, useUiScale } from "@/hooks/use-ui-scale";

export function CommandPalette({
  randomize,
  toggleTheme,
  toggleCompare,
  toggleThemes,
  openImport,
  openInspect,
  openExport,
  openRestyle,
  close,
}: {
  randomize: () => void;
  toggleTheme: () => void;
  toggleCompare: () => void;
  toggleThemes: () => void;
  openImport: () => void;
  openInspect: () => void;
  openExport: () => void;
  openRestyle: () => void;
  close: () => void;
}) {
  const [query, setQuery] = useState("");
  const [contrast, setContrast] = useContrast();
  const [uiScale, setUiScale] = useUiScale();
  const stepScale = (step: number) => {
    const next = UI_SCALES[UI_SCALES.indexOf(uiScale) + step];
    if (next) setUiScale(next);
  };
  const actions = [
    {
      label: "Randomize color direction",
      icon: <Palette size={15} />,
      run: randomize,
    },
    {
      label: "Toggle preview theme",
      icon: <Sun size={15} />,
      run: toggleTheme,
    },
    {
      label: "Compare variants",
      icon: <Command size={15} />,
      run: toggleCompare,
    },
    {
      label: "Preview light and dark side by side",
      icon: <SunMoon size={15} />,
      run: toggleThemes,
    },
    { label: "Import tokens", icon: <Download size={15} />, run: openImport },
    {
      label: "Inspect a public URL",
      icon: <Search size={15} />,
      run: openInspect,
    },
    {
      label: "Restyle a website from a URL",
      icon: <Globe2 size={15} />,
      run: openRestyle,
    },
    { label: "Export system", icon: <Download size={15} />, run: openExport },
    {
      label: "Toggle high contrast",
      icon: <Contrast size={15} />,
      run: () => setContrast(contrast === "high" ? "comfort" : "high"),
    },
    {
      label: "Increase interface text",
      icon: <ZoomIn size={15} />,
      run: () => stepScale(1),
    },
    {
      label: "Decrease interface text",
      icon: <ZoomOut size={15} />,
      run: () => stepScale(-1),
    },
  ];
  const filtered = actions.filter((action) =>
    action.label.toLowerCase().includes(query.toLowerCase()),
  );
  const [activeIndex, setActiveIndex] = useState(0);
  useEffect(() => setActiveIndex(0), [query]);
  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setActiveIndex((current) =>
          filtered.length ? (current + 1) % filtered.length : 0,
        );
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        setActiveIndex((current) =>
          filtered.length
            ? (current - 1 + filtered.length) % filtered.length
            : 0,
        );
      }
      if (event.key === "Enter" && filtered[activeIndex]) {
        event.preventDefault();
        filtered[activeIndex].run();
        close();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [activeIndex, close, filtered]);
  return (
    <div className="modal-backdrop" onClick={close}>
      <section
        className="command-modal"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="command-search">
          <Search size={16} />
          <input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search actions"
          />
          <kbd>ESC</kbd>
          <button
            className="icon-button"
            onClick={close}
            aria-label="Close command palette"
          >
            <X size={15} />
          </button>
        </div>
        <div className="command-list">
          {filtered.map((action, index) => (
            <button
              key={action.label}
              className={activeIndex === index ? "active" : ""}
              onClick={() => {
                action.run();
                close();
              }}
            >
              {action.icon}
              <span>{action.label}</span>
              <kbd>↵</kbd>
            </button>
          ))}
          {!filtered.length && (
            <div className="empty-state">No actions match “{query}”.</div>
          )}
        </div>
      </section>
    </div>
  );
}
