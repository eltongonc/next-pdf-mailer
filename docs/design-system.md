# Paperpost design system

The application follows the [Paperpost Figma design system](https://www.figma.com/design/cQ6RQ4t4E4efFEv8TgUbzN/Paperpost?node-id=68-80) and uses Mantine controls with Paperpost theme defaults. The current application theme is light, with neutral surfaces and concentrated forest-green accents inspired by [EvenGreener](https://evengreener.com/), with architectural geometry and typography details from [Heron](https://heronaiapp.com/).

## Styling ownership

| File | Responsibility |
| --- | --- |
| [design-tokens.css](../src/app/design-tokens.css) | Source primitives and semantic colors, typography, spacing, geometry, and focus tokens. |
| [ui-provider.tsx](../src/components/ui-provider.tsx) | Mantine theme, component defaults, semantic CSS variable mapping, and forced light color scheme. |
| [ui-theme.module.css](../src/components/ui-theme.module.css) | Scoped Mantine control overrides. |
| [globals.css](../src/app/globals.css) | Application layout, responsive behavior, and existing application classes. |
| [layout.tsx](../src/app/layout.tsx) | Global stylesheet imports, font variables, color-scheme script, and provider placement. |

## Brand palette

The current brand uses this mint/green scale, in Mantine shade order 0–9:

`#eefcf8`, `#def5ef`, `#b7ecdd`, `#8de3cb`, `#6cdbbb`, `#58d6b1`, `#4dd4ac`, `#23b38c`, `#32a785`, `#135e4a`.

The scale is defined as `--pp-palette-brand-0` through `--pp-palette-brand-9` and mirrored in the Mantine `paperpost` palette. Keep both definitions synchronized. The brand scale supplies accents rather than large application surfaces. Canvas uses warm off-white `#f5f4ef`, the sidebar and panels use white, previews and selected backgrounds use ivory `#f0efe7`, and borders use neutral `#deded7`. Mint shade 1 is reserved for success backgrounds. Primary actions, links, focus, and success text use shade 9. White text on shade 9 has a 7.70:1 contrast ratio. Filled-action hover slightly darkens shade 9. Warning and error colors use the complementary warm palette below.

### Warm accents and neutrals

| Color | Role |
| --- | --- |
| `#135e4a` | Primary actions, links, focus, and success text. |
| `#23b38c` | Brand shade 7 and decorative template thumbnail accents through `--pp-action-accent`. |
| `#ad5c51` | Clay error borders. |
| `#f4cbb2` | Peach primitive, mixed with 70% white for restrained warning backgrounds and paired with brown `#71452c` text. |
| `#000000` | Floating shadow base and primary hover shading. |
| `#3d3d49` | Main text and code surfaces. |
| `#ffffff` | Panels, inputs, inverse text, and code text. |

White and warm neutrals dominate. Green primary buttons, links, focus states, and a small active-navigation indicator carry the brand. Charcoal headings use a stronger weight; Inter and the existing application layout remain in place. Clay and peach provide restrained status accents. Supporting text uses charcoal-derived `#646471`. Error text uses deeper clay `#86463e` on pale clay `#f9eeeb` (6.24:1 contrast). Mantine alert and validation colors map to these semantic tokens. Use bright green decoratively rather than behind white text; filled primary actions keep the darker green.

## Architectural styling

Heron's influence appears in thin section rules, connected metric columns, smaller corner radii, larger charcoal page headings, and compact monospace metadata. Template thumbnails use a subtle CSS drafting grid. The API callout uses a charcoal surface with white text and a restrained peach label. The light application canvas and green action palette remain from the earlier direction.

Keep these treatments functional: metric columns stack with separators on mobile, metadata remains legible, and decorative grids stay outside customer document content. Use Inter for application text and IBM Plex Mono for technical labels. Do not add loading sequences or scroll effects to everyday dashboard tasks.

## Components and tokens

Reuse Mantine buttons, form controls, tabs, alerts, badges, and panels where they fit the existing UI. Extend the shared provider for common control defaults rather than repeating overrides in each view. Keep document template HTML separate from application UI styling.

Use semantic tokens such as `--pp-action-primary`, `--pp-text-secondary`, and `--pp-surface-default` in application styles. Keep source palette primitives separate from semantic roles. Pair status foregrounds with their matching `--pp-status-*-bg` backgrounds. Supporting text uses the accessible charcoal-derived neutral.

Inter and IBM Plex Mono are loaded through `next/font/google` and served locally. Compilation needs access to Google Fonts. Preserve the font variables when changing the root layout.

## Control behavior

Give controls accessible labels, preserve visible keyboard focus, and declare button types inside forms. Mantine password inputs include a visibility button; browser tests must identify the intended form action specifically.

Apply fixed single-line heights to input and select elements only. Textareas need their own sizing; the HTML and sample-data editors must show multiple lines. Preserve tab keyboard behavior, busy/disabled states, error messages, and mobile layouts when replacing controls.

## Verification

Run lint, type checking, and a production build for theme or stylesheet changes. Run the playground browser smoke test against an unconfigured development server and the account browser test against the configured Docker app, as described in [README checks](../README.md#checks).

Inspect screenshots as well as assertions: rendering can succeed while a CSS override makes an editor unusable. Check desktop and mobile overflow, editor sizing, preview visibility, and browser console errors. The playground smoke test includes an editor-height regression assertion.
