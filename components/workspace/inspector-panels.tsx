import type { Dispatch, SetStateAction } from "react";
import { RotateCcw, Sparkles } from "lucide-react";
import { motion } from "motion/react";
import { contrastRatio, contrastStatus, semanticPairs } from "@/lib/contrast";
import { loadFontFamily } from "@/lib/fonts";
import { fontCatalog } from "@/data/workspace";
import type {
  FontEntry,
  HarmonyMode,
  TokenUpdate,
  Tokens,
} from "@/types/workspace";

function SectionHeading({
  label,
  action,
}: {
  label: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="section-heading">
      <span>{label}</span>
      {action}
    </div>
  );
}

export function TypePanel({
  tokens,
  updateTokens,
}: {
  tokens: Tokens;
  updateTokens: TokenUpdate;
}) {
  return (
    <div className="panel-content">
      <SectionHeading label="Type pairing" />
      <div className="type-specimen">
        <span className="sample-label">Display · {tokens.displayFont}</span>
        <strong style={{ fontFamily: `"${tokens.displayFont}"` }}>Ag</strong>
        <p style={{ fontFamily: `"${tokens.bodyFont}"` }}>
          Work with intent, ship with confidence.
        </p>
        <code style={{ fontFamily: `"${tokens.monoFont}"` }}>
          --prism-accent · 0 1 2 3 4 5
        </code>
      </div>
      <FontSelect
        label="Display"
        value={tokens.displayFont}
        onChange={(value) => updateTokens({ displayFont: value })}
        options={fontCatalog}
      />
      <FontSelect
        label="Body"
        value={tokens.bodyFont}
        onChange={(value) => updateTokens({ bodyFont: value })}
        options={fontCatalog}
      />
      <FontSelect
        label="Mono"
        value={tokens.monoFont}
        onChange={(value) => updateTokens({ monoFont: value })}
        options={fontCatalog}
      />
      <div className="control-group">
        <div className="control-label">
          <span>Scale</span>
          <span className="mono-value">{tokens.typeScale.toFixed(2)}×</span>
        </div>
        <input
          type="range"
          min="0.8"
          max="1.3"
          step="0.01"
          value={tokens.typeScale}
          onChange={(event) =>
            updateTokens({ typeScale: Number(event.target.value) })
          }
        />
      </div>
      <div className="inspector-divider" />
      <SectionHeading label="Text rhythm" />
      <div className="control-group">
        <div className="control-label">
          <span>Body line height</span>
          <span className="mono-value">{tokens.lineHeight.toFixed(2)}</span>
        </div>
        <input
          type="range"
          min="1.1"
          max="2"
          step="0.05"
          value={tokens.lineHeight}
          onChange={(event) =>
            updateTokens({ lineHeight: Number(event.target.value) })
          }
        />
      </div>
      <div className="control-group">
        <div className="control-label">
          <span>Heading tracking</span>
          <span className="mono-value">{tokens.tracking.toFixed(2)}em</span>
        </div>
        <input
          type="range"
          min="-0.12"
          max="0.01"
          step="0.01"
          value={tokens.tracking}
          onChange={(event) =>
            updateTokens({ tracking: Number(event.target.value) })
          }
        />
      </div>
    </div>
  );
}

function FontSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: FontEntry[];
}) {
  return (
    <label className="font-select">
      <span>{label}</span>
      <select
        value={value}
        onChange={(event) => {
          const next = event.target.value;
          loadFontFamily(next);
          onChange(next);
        }}
      >
        {options.map((font) => (
          <option
            key={font.name}
            value={font.name}
            style={{ fontFamily: `"${font.name}"` }}
          >
            {font.name}
          </option>
        ))}
      </select>
    </label>
  );
}

export function ColorPanel({
  tokens,
  updateTokens,
  locked,
  setLocked,
  randomize,
  harmony,
  setHarmony,
}: {
  tokens: Tokens;
  updateTokens: TokenUpdate;
  locked: string[];
  setLocked: Dispatch<SetStateAction<string[]>>;
  randomize: () => void;
  harmony: HarmonyMode;
  setHarmony: (harmony: HarmonyMode) => void;
}) {
  const toggleLock = (key: string) =>
    setLocked((current) =>
      current.includes(key)
        ? current.filter((item) => item !== key)
        : [...current, key],
    );
  return (
    <div className="panel-content">
      <SectionHeading
        label="Palette"
        action={
          <button className="tiny-link" onClick={randomize}>
            <RotateCcw size={12} /> Randomize
          </button>
        }
      />
      <div className="palette-stack">
        <ColorRow
          label="Accent"
          value={tokens.accent}
          token="accent"
          updateTokens={updateTokens}
          locked={locked.includes("accent")}
          toggleLock={toggleLock}
        />
        <ColorRow
          label="Accent soft"
          value={tokens.accentSoft}
          token="accentSoft"
          updateTokens={updateTokens}
          locked={locked.includes("accentSoft")}
          toggleLock={toggleLock}
        />
        <ColorRow
          label="Ink"
          value={tokens.ink}
          token="ink"
          updateTokens={updateTokens}
          locked={locked.includes("ink")}
          toggleLock={toggleLock}
        />
        <ColorRow
          label="Paper"
          value={tokens.paper}
          token="paper"
          updateTokens={updateTokens}
          locked={locked.includes("paper")}
          toggleLock={toggleLock}
        />
      </div>
      <SectionHeading label="State colors" />
      <div className="palette-stack">
        <ColorRow
          label="Success"
          value={tokens.success}
          token="success"
          updateTokens={updateTokens}
          lockable={false}
        />
        <ColorRow
          label="Warning"
          value={tokens.warning}
          token="warning"
          updateTokens={updateTokens}
          lockable={false}
        />
        <ColorRow
          label="Danger"
          value={tokens.danger}
          token="danger"
          updateTokens={updateTokens}
          lockable={false}
        />
      </div>
      <label className="harmony-select">
        <span>Harmony mode</span>
        <select
          value={harmony}
          onChange={(event) => setHarmony(event.target.value as HarmonyMode)}
        >
          <option value="analogous">Analogous</option>
          <option value="complementary">Complementary</option>
          <option value="triadic">Triadic</option>
          <option value="monochrome">Monochrome</option>
          <option value="split-complementary">Split-complementary</option>
        </select>
      </label>
      <motion.button className="randomize-button" whileTap={{ scale: 0.98 }} onClick={randomize}>
        <Sparkles size={16} />
        <span>
          <strong>Find a new direction</strong>
          <small>Generate a coherent accent palette</small>
        </span>
        <span className="shortcut">⌘ R</span>
      </motion.button>
      <div className="inspector-divider" />
      <SectionHeading label="Contrast check" />
      <div className="palette-stack">
        {semanticPairs(tokens).map((pair) => {
          const ratio = contrastRatio(pair.fg, pair.bg);
          const status = contrastStatus(ratio);
          return (
            <div className="contrast-row" key={pair.label}>
              <span
                className="contrast-swatch"
                style={{ background: pair.bg, color: pair.fg }}
              >
                Aa
              </span>
              <span>
                <strong>{pair.label}</strong>
                <small>{ratio.toFixed(2)}:1</small>
              </span>
              <span className={`pass-badge ${status === "Fail" ? "fail" : ""}`}>
                {status === "Fail" ? "CHECK" : status.toUpperCase()}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ColorRow({
  label,
  value,
  token,
  updateTokens,
  locked = false,
  toggleLock,
  lockable = true,
}: {
  label: string;
  value: string;
  token: string;
  updateTokens: TokenUpdate;
  locked?: boolean;
  toggleLock?: (key: string) => void;
  lockable?: boolean;
}) {
  return (
    <div className="color-row">
      <input
        type="color"
        value={value}
        onChange={(event) =>
          updateTokens({ [token]: event.target.value } as Partial<Tokens>)
        }
      />
      <span>
        <strong>{label}</strong>
        <small>--prism-{token.replace(/([A-Z])/g, "-$1").toLowerCase()}</small>
      </span>
      <code>{value}</code>
      {lockable && toggleLock && (
        <button
          className={`lock-button ${locked ? "locked" : ""}`}
          onClick={() => toggleLock(token)}
          aria-label={`${locked ? "Release" : "Lock"} ${label}`}
        >
          {locked ? "●" : "○"}
        </button>
      )}
    </div>
  );
}

export function ShapePanel({
  tokens,
  updateTokens,
}: {
  tokens: Tokens;
  updateTokens: TokenUpdate;
}) {
  return (
    <div className="panel-content">
      <SectionHeading
        label="Shape language"
        action={<button className="tiny-link">Reset</button>}
      />
      <div className="control-group">
        <div className="control-label">
          <span>Corner radius</span>
          <span className="mono-value">{tokens.radius}px</span>
        </div>
        <input
          type="range"
          min="0"
          max="28"
          value={tokens.radius}
          onChange={(event) =>
            updateTokens({ radius: Number(event.target.value) })
          }
        />
      </div>
      <div className="radius-demo">
        <div style={{ borderRadius: `${tokens.radius}px` }} />
        <div style={{ borderRadius: `${Math.max(0, tokens.radius - 4)}px` }} />
        <div style={{ borderRadius: `${Math.max(0, tokens.radius - 8)}px` }} />
      </div>
      <div className="inspector-divider" />
      <SectionHeading label="Spacing scale" />
      <div className="control-group">
        <div className="control-label">
          <span>Base unit</span>
          <span className="mono-value">{tokens.spacing}px</span>
        </div>
        <input
          type="range"
          min="4"
          max="16"
          value={tokens.spacing}
          onChange={(event) =>
            updateTokens({ spacing: Number(event.target.value) })
          }
        />
      </div>
      <div className="spacing-bars">
        <span style={{ width: tokens.spacing * 1 }} />
        <span style={{ width: tokens.spacing * 2 }} />
        <span style={{ width: tokens.spacing * 3 }} />
        <span style={{ width: tokens.spacing * 4 }} />
      </div>
      <div className="inspector-divider" />
      <div className="control-group">
        <div className="control-label">
          <span>Border width</span>
          <span className="mono-value">{tokens.borderWidth}px</span>
        </div>
        <input
          type="range"
          min="0"
          max="4"
          step="1"
          value={tokens.borderWidth}
          onChange={(event) =>
            updateTokens({ borderWidth: Number(event.target.value) })
          }
        />
      </div>
      <div className="control-group">
        <div className="control-label">
          <span>Elevation</span>
          <span className="mono-value">{tokens.shadow}</span>
        </div>
        <input
          type="range"
          min="0"
          max="4"
          step="1"
          value={tokens.shadow}
          onChange={(event) =>
            updateTokens({ shadow: Number(event.target.value) })
          }
        />
      </div>
      <div className="control-group">
        <div className="control-label">
          <span>Motion</span>
          <span className="mono-value">{tokens.motion}ms</span>
        </div>
        <input
          type="range"
          min="0"
          max="600"
          step="20"
          value={tokens.motion}
          onChange={(event) =>
            updateTokens({ motion: Number(event.target.value) })
          }
        />
      </div>
      <div className="inspector-divider" />
      <SectionHeading label="Breakpoints" />
      <div className="breakpoint-grid">
        <label>
          SM
          <input
            type="number"
            min={320}
            value={tokens.breakpointSm}
            onChange={(event) =>
              updateTokens({ breakpointSm: Number(event.target.value) })
            }
          />
        </label>
        <label>
          MD
          <input
            type="number"
            min={320}
            value={tokens.breakpointMd}
            onChange={(event) =>
              updateTokens({ breakpointMd: Number(event.target.value) })
            }
          />
        </label>
        <label>
          LG
          <input
            type="number"
            min={320}
            value={tokens.breakpointLg}
            onChange={(event) =>
              updateTokens({ breakpointLg: Number(event.target.value) })
            }
          />
        </label>
      </div>
    </div>
  );
}

