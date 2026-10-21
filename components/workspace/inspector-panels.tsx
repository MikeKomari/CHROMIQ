import { useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { Moon, Sun, TriangleAlert } from "lucide-react";
import { colorRamp } from "@/lib/scales";
import { themeColors, themeRoleLabels, themeTokenKeys } from "@/lib/theme";
import { fontCatalog } from "@/data/workspace";
import type { ColorSwatch } from "@/components/ui/color-picker";
import { AccentScale, ColorRow } from "@/components/workspace/shell/color-fields";
import { FontSelect, SliderField } from "@/components/workspace/shell/inspector-fields";
import type {
  HarmonyMode,
  Mode,
  ThemeRole,
  TokenUpdate,
  Tokens,
} from "@/types/workspace";

/** Section bodies for the inspector. The section chrome (header, toggle, action) lives in shell/inspector.tsx. */

function GroupLabel({ children }: { children: React.ReactNode }) {
  return <div className="contrast-group-label">{children}</div>;
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
      <div className="field-grid">
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
      </div>
      <SliderField
        label="Scale"
        value={tokens.typeScale}
        min={0.8}
        max={1.3}
        step={0.01}
        decimals={2}
        unit="×"
        onChange={(typeScale, options) => updateTokens({ typeScale }, options)}
      />
      <SliderField
        label="Line height"
        value={tokens.lineHeight}
        min={1.1}
        max={2}
        step={0.05}
        decimals={2}
        onChange={(lineHeight, options) => updateTokens({ lineHeight }, options)}
      />
      <SliderField
        label="Tracking"
        value={tokens.tracking}
        min={-0.12}
        max={0.01}
        step={0.01}
        decimals={2}
        unit="em"
        onChange={(tracking, options) => updateTokens({ tracking }, options)}
      />
    </div>
  );
}

export function ColorPanel({
  tokens,
  updateTokens,
  locked,
  setLocked,
  randomizeWarning,
  harmony,
  setHarmony,
  mode,
  setMode,
  deriveDark,
}: {
  tokens: Tokens;
  updateTokens: TokenUpdate;
  locked: string[];
  setLocked: Dispatch<SetStateAction<string[]>>;
  randomizeWarning: string | null;
  harmony: HarmonyMode;
  setHarmony: (harmony: HarmonyMode) => void;
  mode: Mode;
  setMode: (mode: Mode) => void;
  deriveDark: () => void;
}) {
  const toggleLock = (key: string) =>
    setLocked((current) =>
      current.includes(key)
        ? current.filter((item) => item !== key)
        : [...current, key],
    );
  const [openToken, setOpenToken] = useState<string | null>(null);
  const colors = themeColors(tokens, mode);
  const ramp = colorRamp(colors.accent);
  const pickerSwatches: ColorSwatch[] = [
    { label: "Background", value: colors.background },
    { label: "Text", value: colors.foreground },
    { label: "Accent", value: colors.accent },
    { label: "Accent soft", value: colors.accentSoft },
    { label: "Accent 300", value: ramp[300] },
    { label: "Accent 500", value: ramp[500] },
    { label: "Accent 700", value: ramp[700] },
  ];
  const pickerProps = (token: string) => ({
    open: openToken === token,
    setOpen: (open: boolean) => setOpenToken(open ? token : null),
    swatches: pickerSwatches,
  });
  return (
    <div className="panel-content">
      <div
        className="theme-tabs"
        role="radiogroup"
        aria-label="Theme being edited"
        onKeyDown={(event) => {
          if (
            !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(
              event.key,
            )
          )
            return;
          event.preventDefault();
          const next = mode === "light" ? "dark" : "light";
          setMode(next);
          event.currentTarget
            .querySelector<HTMLButtonElement>(`[data-theme-tab="${next}"]`)
            ?.focus();
        }}
      >
        {(["light", "dark"] as const).map((item) => (
          <button
            key={item}
            type="button"
            role="radio"
            data-theme-tab={item}
            aria-checked={mode === item}
            tabIndex={mode === item ? 0 : -1}
            className={mode === item ? "active" : ""}
            onClick={() => setMode(item)}
          >
            {item === "light" ? <Sun size={13} /> : <Moon size={13} />}
            {item === "light" ? "Light" : "Dark"}
          </button>
        ))}
      </div>
      <div className="palette-stack">
        {(Object.keys(themeTokenKeys[mode]) as ThemeRole[]).map((role) => {
          const token = themeTokenKeys[mode][role];
          return (
            <ColorRow
              key={token}
              label={themeRoleLabels[role]}
              value={tokens[token] as string}
              token={token}
              updateTokens={updateTokens}
              locked={locked.includes(token)}
              toggleLock={toggleLock}
              {...pickerProps(token)}
            />
          );
        })}
      </div>
      <AccentScale accent={colors.accent} />
      {mode === "dark" && (
        <button className="tiny-link derive-link" onClick={deriveDark}>
          <Moon size={12} /> Derive dark from light
        </button>
      )}
      <GroupLabel>State colors</GroupLabel>
      <div className="palette-stack">
        <ColorRow
          label="Success"
          value={tokens.success}
          token="success"
          updateTokens={updateTokens}
          lockable={false}
          {...pickerProps("success")}
        />
        <ColorRow
          label="Warning"
          value={tokens.warning}
          token="warning"
          updateTokens={updateTokens}
          lockable={false}
          {...pickerProps("warning")}
        />
        <ColorRow
          label="Danger"
          value={tokens.danger}
          token="danger"
          updateTokens={updateTokens}
          lockable={false}
          {...pickerProps("danger")}
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
      {randomizeWarning && (
        <p className="panel-warning" role="status">
          <TriangleAlert size={13} /> {randomizeWarning}
        </p>
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
      <SliderField
        label="Radius"
        value={tokens.radius}
        min={0}
        max={28}
        unit="px"
        onChange={(radius, options) => updateTokens({ radius }, options)}
      />
      <div className="radius-demo">
        <div style={{ borderRadius: `${tokens.radius}px` }} />
        <div style={{ borderRadius: `${Math.max(0, tokens.radius - 4)}px` }} />
        <div style={{ borderRadius: `${Math.max(0, tokens.radius - 8)}px` }} />
      </div>
      <SliderField
        label="Border"
        value={tokens.borderWidth}
        min={0}
        max={4}
        unit="px"
        onChange={(borderWidth, options) => updateTokens({ borderWidth }, options)}
      />
      <SliderField
        label="Spacing"
        value={tokens.spacing}
        min={4}
        max={16}
        unit="px"
        onChange={(spacing, options) => updateTokens({ spacing }, options)}
      />
      <div className="spacing-bars">
        <span style={{ width: tokens.spacing * 1 }} />
        <span style={{ width: tokens.spacing * 2 }} />
        <span style={{ width: tokens.spacing * 3 }} />
        <span style={{ width: tokens.spacing * 4 }} />
      </div>
      <SliderField
        label="Elevation"
        value={tokens.shadow}
        min={0}
        max={4}
        onChange={(shadow, options) => updateTokens({ shadow }, options)}
      />
      <SliderField
        label="Motion"
        value={tokens.motion}
        min={0}
        max={600}
        step={20}
        unit="ms"
        onChange={(motion, options) => updateTokens({ motion }, options)}
      />
      <GroupLabel>Breakpoints</GroupLabel>
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
