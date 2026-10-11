import { Command, Download, Palette, Search, Sun, X } from "lucide-react";
import { useEffect, useState } from "react";

export function CommandPalette({
  randomize,
  toggleTheme,
  toggleCompare,
  openImport,
  openInspect,
  openExport,
  close,
}: {
  randomize: () => void;
  toggleTheme: () => void;
  toggleCompare: () => void;
  openImport: () => void;
  openInspect: () => void;
  openExport: () => void;
  close: () => void;
}) {
  const [query, setQuery] = useState("");
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
    { label: "Import tokens", icon: <Download size={15} />, run: openImport },
    {
      label: "Inspect a public URL",
      icon: <Search size={15} />,
      run: openInspect,
    },
    { label: "Export system", icon: <Download size={15} />, run: openExport },
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
