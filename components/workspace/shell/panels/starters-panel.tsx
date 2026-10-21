import { Check } from "lucide-react";
import { starters } from "@/data/workspace";

export function StartersPanel({
  activeStarter,
  selectStarter,
  readOnly,
}: {
  activeStarter: string;
  selectStarter: (starter: (typeof starters)[number]) => void;
  readOnly: boolean;
}) {
  return (
    <ul className="panel-list" aria-label="Starter systems">
      {starters.map((starter) => {
        const current = activeStarter === starter.name;
        return (
          <li key={starter.name}>
            <button
              type="button"
              className={`panel-row ${current ? "current" : ""}`}
              aria-current={current ? "true" : undefined}
              title={starter.meta}
              disabled={readOnly}
              onClick={() => selectStarter(starter)}
            >
              <span className="panel-row-swatch" style={{ background: starter.accent }} />
              <span className="panel-row-name">{starter.name}</span>
              <span className="panel-row-meta">{starter.meta}</span>
              {current && <Check size={14} className="panel-row-check" />}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
