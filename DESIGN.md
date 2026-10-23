# CHROMIQ visual direction

## Mood

Night-shift studio: a precision builder tool with neutral near-black surfaces, a blue-black canvas, and one confident violet for action and selection. It should feel like a code editor and a site builder at once: quiet chrome so the user's system is the brightest thing on screen.

## Layout

Builder layout, left to right: icon rail, context panel, canvas, inspector. The canvas is the visual focus and sits on its own darker, slightly blue surface so it reads as a stage, separate from the chrome around it. Thin rules separate the regions; there are no cards around them.

```
┌──┬──────────────┬─────────────────────────────────┬──────────────┐
│◆ │ Panel title  │ views      [devices] width zoom  undo · Export │
│▣ │ ──────────── │ ┌─────────────────────────────┐ │ ▾ Type       │
│◷ │ list items   │ │                             │ │ ▾ Color      │
│⚙ │              │ │     live preview (stage)    │ │ ▸ Shape      │
│? │              │ └─────────────────────────────┘ │ ▸ Contrast   │
└──┴──────────────┴─────────────────────────────────┴──────────────┘
```

- **Top bar** (about 48px): brand mark, project name with switcher in the center, then search, share, and save status on the right. It contains no tools.
- **Icon rail** (48px): the brand mark at the top, then one icon per panel: Starters, Projects, Snapshots, Versions, and Settings. Help and keyboard shortcuts sit at the bottom. The active icon has a 2px `--accent` bar on its inner edge and an `--accent-fg` icon. Every icon has a tooltip and an accessible name. Clicking the active icon collapses the panel.
- **Context panel** (about 240px, collapsible): shows the list for the active rail icon, with a title row and an action (+) on the right. One panel at a time. Lists use 32px rows; the current item is marked with `--panel-2` fill and a check.
- **Canvas header**: one bar in this order:
  - view tabs on the left (Canvas, Compare, Themes, Restyle)
  - the device switcher in the center
  - on the right: the Select tool, surface and vision selects, undo/redo, snapshot, import, and Export as the only filled button
- **Canvas stage**: `--canvas` background with the preview centered and a status line underneath for the source type, the size, and any simulation.
- **Inspector** (about 300px): a header with the subject ("System tokens"), then stacked collapsible sections: Type, Color, Shape, and Contrast. Several sections can be open at once, and their open state is remembered per browser. Section headers are 36px rows with a chevron, title, and an optional action on the right (Randomize, Fix all, Reset). Inside a section, related fields sit side by side (font + weight, radius + border), with number fields next to sliders for exact values.
- **Narrow widths**:
  - Below 1100px the context panel closes by default and opens over the canvas.
  - Below 900px the inspector becomes a drawer toggled from the canvas header.
  - The page itself never scrolls; only the panel, stage, and inspector scroll internally.

## Color

Taken from the reference shot: neutral graphite panels (no warm or green cast), a blue-black canvas, a violet accent, and a blue-grey for secondary text. The violet is used for actions, focus, the active tool, and selected states only. It is never a background wash, gradient, or glow.

Two reading modes share one set of role tokens in `app/globals.css`: Comfort (default) softens text and the accent for long sessions, and High contrast uses crisper near-black/near-white values and the full-strength violet. The workbench also has a light chrome variant (`.is-light`).

| Role | Token | Comfort | High contrast | Light | Light high contrast |
| --- | --- | --- | --- | --- | --- |
| App background | `--bg` | `#131316` | `#0c0c0e` | `#f1f1f5` | `#f6f6f9` |
| Deepest surface, code blocks | `--bg-deep` | `#0b0b0d` | `#050506` | `#e7e7ed` | `#ececf1` |
| Panels, sidebar, inspector | `--panel` | `#17171a` | `#111113` | `#f6f6f9` | `#fafafc` |
| Fields, raised rows | `--panel-2` | `#1d1d21` | `#18181b` | `#ebebf0` | `#efeff4` |
| Canvas stage | `--canvas` | `#0e121a` | `#0b0e15` | `#e4e6ee` | `#e8eaf1` |
| Text | `--text` | `#dcdde4` | `#f5f5f8` | `#1f1f26` | `#17171c` |
| Secondary text | `--muted` | `#8d97a8` | `#a7b1c2` | `#5d6676` | `#4f5868` |
| Rules and borders | `--line` | `#2a2b30` | `#33353b` | `#d6d7df` | `#c9cbd5` |
| Accent fill (buttons, active tool) | `--accent` | `#8f72f5` | `#7f44ff` | `#6d4ae8` | `#5b33d6` |
| Accent as text or icon | `--accent-fg` | `#a585ff` | `#b39aff` | `#5b33d6` | `#4c26c4` |
| Label on accent fill | `--accent-ink` | `#0b0b0d` | `#ffffff` | `#ffffff` | `#ffffff` |
| Canvas selection | `--select` | `#e07bff` | `#ee8cff` | `#9533b8` | `#8f2bb2` |
| Data and info | `--cyan` | `#7fa6e8` | `#8cb4ff` | `#2f5fb8` | `#234f9f` |
| Danger and warnings | `--coral` | `#e07a6b` | `#ff7a63` | `#b44a3a` | `#a33a2a` |

Rules:

- Text stays at 7:1 or better against panels and secondary text at 4.5:1 or better, in every mode. Accent text (`--accent-fg`) is 4.5:1 or better; the accent fill is 3:1 or better against its panel; the label on an accent fill is 4.5:1 or better.
- `--select` (magenta-violet) marks the element picked on the canvas: its outline, its tag chip, and nothing else. Keeping it distinct from `--accent` means a selected element never looks like a pressed button.
- `--cyan` is for data and information, and `--coral` for danger and failing checks. Neither is decorative.
- Never use pure black or pure white surfaces.
- Preview surfaces are the user's own tokens and ignore all of the above. The starter systems keep their own palettes.

## Typography

Three-role system: a display face for headlines, a body face for running text, and a mono face for values, labels, tokens, and code. The type panel pairs any font from a curated Google Fonts set into these roles. House defaults: Space Grotesk (display), Inter (body), IBM Plex Mono (mono). Avoid generic system UI type for primary text.

### Workbench UI type

The workspace chrome (topbar, sidebar, toolbars, inspector, modals, palette, restyle controls) uses Inter for UI text at a 14px base, with 11px as the absolute minimum (uppercase eyebrows and keyboard hints only). Space Grotesk is reserved for headings, the brand lockup, and large titles. IBM Plex Mono is for values, hex codes, token names, shortcuts, and code, not general labels. Sizes come from the `--fs-2xs` to `--fs-4xl` tokens, which scale with the Interface text size preference (Default, Large, Extra large) in Workspace settings or the command palette. Preview surfaces are driven by the user's tokens and are unaffected.

## Shape and depth

Small radii (4px controls, 6px popovers, 8px modals), 1px borders in `--line`, and depth from surface steps (`--bg-deep` → `--panel` → `--panel-2`) rather than shadows. Floating layers (popovers, menus, modals) get one soft shadow. No gradients except inside the color picker's hue and saturation controls, no glassmorphism, no glow, and no floating orb decoration.

## Components

### Device switcher

A centered segmented control above the canvas: Desktop, Tablet, and Mobile as icon buttons, then a mono width readout (`1440 px`) that becomes a number field when clicked, then a compact zoom stepper (− 100% +). The active device uses a `--accent` fill with `--accent-ink` icon; the others are plain icons on `--panel-2`. Typing a width switches to Custom.

### Select tool and token popover

- The Select tool (pointer icon, shortcut V) toggles between editing preview text and selecting elements. While it is on, the active tool button is filled with `--accent`, hovered elements get a 1px dashed `--select` outline, and the selected element a 2px solid `--select` outline with a small tag chip (`button · btn-primary`) in `--select` with `--bg-deep` text.
- The popover opens beside the selected element and stays inside the canvas: `--panel` background, 1px `--line-strong` border, 6px radius, one soft shadow, at most about 300px wide.
- Rows are grouped as Color, Shape, and Type. Each row shows a swatch or value, the role name, the token name in mono, and the value.
- Derived values (such as the label color on an accent fill) are shown but are not editable, and are labeled as derived.
- The footer says the tokens were matched from computed styles, because the match is an inference.

### Color picker

An inline panel, not a native input. From top to bottom: a saturation/brightness square, a hue slider, a hex field in mono, and a row of quick swatches (theme colors and accent-scale steps). Thumbs are 12px rings in `--text` with a 1px `--bg-deep` outer ring, so they stay visible on any color. Dragging is a single undo step. The square and the slider are fully keyboard operable.

## Motion

Use short, interruptible transitions (120–180ms) for controls, and a single staggered entrance for the workspace. Popovers fade and rise 4px. Selection outlines appear instantly, without animation. Respect `prefers-reduced-motion`.

## Interaction

- Every control must have a visible state, and focus rings use `--accent`.
- Randomize is undoable and preserves locked tokens.
- Edits made from the canvas popover go through the same token model as the inspector, so they are undoable and show up in exports.
- Exports are copyable and downloadable.
