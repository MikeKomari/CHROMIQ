# PRISM visual direction

## Mood

Editorial industrial: a precision tool with the atmosphere of a print studio and the utility of a code editor.

## Layout

Three-part workbench: compact navigation rail, wide canvas, inspector drawer. The canvas is the visual focus. Use a 12-column rhythm, thin rules, and deliberate asymmetry.

## Color

Calm, low-glare charcoal surfaces (never pure black or pure white) with warm paper preview surfaces. A muted lime-sage is the action accent; desaturated cyan and coral are reserved for data accents and state feedback. Glows and heavy shadows are avoided. Two reading modes share one token set: Comfort (default) softens text, accents, and borders for long sessions, and High contrast restores crisp near-black/near-white values with the saturated acid-lime accent. Body text stays at 7:1 or better and muted text at 4.5:1 or better in both modes. Always expose light and dark preview modes.

## Typography

Three-role system: a display face for headlines, a body face for running text, and a mono face for values, labels, tokens, and code. The type panel pairs any font from a curated Google Fonts set into these roles. House defaults: Space Grotesk (display), Inter (body), IBM Plex Mono (mono). Avoid generic system UI type for primary text.

### Workbench UI type

The workspace chrome (topbar, sidebar, toolbars, inspector, modals, palette, restyle controls) uses Inter for UI text at a 14px base, with 11px as the absolute minimum (uppercase eyebrows and keyboard hints only). Space Grotesk is reserved for headings, the brand lockup, and large titles. IBM Plex Mono is for values, hex codes, token names, shortcuts, and code, not general labels. Sizes come from the `--fs-2xs` to `--fs-4xl` tokens, which scale with the Interface text size preference (Default, Large, Extra large) in Workspace settings or the command palette. Preview surfaces are driven by the user's tokens and are unaffected.

## Shape and depth

Use small radii, thin borders, layered shadows, and very limited blur. No purple gradients, glassmorphism, or floating orb decoration.

## Motion

Use short, interruptible transitions for controls and a single staggered entrance for the workspace. Respect `prefers-reduced-motion`.

## Interaction

Every control must have a visible state. Randomize should be undoable and should preserve locked tokens. Exports should be copyable and downloadable.
