# Paperpost design system

The application follows the [Paperpost Figma design system](https://www.figma.com/design/cQ6RQ4t4E4efFEv8TgUbzN/Paperpost?node-id=68-80) and uses Mantine controls with Paperpost theme defaults. The current application theme is light.

## Styling ownership

| File | Responsibility |
| --- | --- |
| [design-tokens.css](../src/app/design-tokens.css) | Source primitives and semantic colors, typography, spacing, geometry, and focus tokens. |
| [ui-provider.tsx](../src/components/ui-provider.tsx) | Mantine theme, component defaults, semantic CSS variable mapping, and forced light color scheme. |
| [ui-theme.module.css](../src/components/ui-theme.module.css) | Scoped Mantine control overrides. |
| [globals.css](../src/app/globals.css) | Application layout, responsive behavior, and existing application classes. |
| [layout.tsx](../src/app/layout.tsx) | Global stylesheet imports, font variables, color-scheme script, and provider placement. |

## Components and tokens

Reuse Mantine buttons, form controls, tabs, alerts, badges, and panels where they fit the existing UI. Extend the shared provider for common control defaults rather than repeating overrides in each view. Keep document template HTML separate from application UI styling.

Use semantic tokens such as `--pp-action-primary`, `--pp-text-secondary`, and `--pp-surface-default` in application styles. Keep source palette primitives separate from semantic roles. Pair status foregrounds with their matching `--pp-status-*-bg` backgrounds. Supporting text uses the accessible neutral; the original source neutral remains available as a primitive.

Inter and IBM Plex Mono are loaded through `next/font/google` and served locally. Compilation needs access to Google Fonts. Preserve the font variables when changing the root layout.

## Control behavior

Give controls accessible labels, preserve visible keyboard focus, and declare button types inside forms. Mantine password inputs include a visibility button; browser tests must identify the intended form action specifically.

Apply fixed single-line heights to input and select elements only. Textareas need their own sizing; the HTML and sample-data editors must show multiple lines. Preserve tab keyboard behavior, busy/disabled states, error messages, and mobile layouts when replacing controls.

## Verification

Run lint, type checking, and a production build for theme or stylesheet changes. Run the playground browser smoke test against an unconfigured development server and the account browser test against the configured Docker app, as described in [README checks](../README.md#checks).

Inspect screenshots as well as assertions: rendering can succeed while a CSS override makes an editor unusable. Check desktop and mobile overflow, editor sizing, preview visibility, and browser console errors. The playground smoke test includes an editor-height regression assertion.
