# Changelog

All notable changes to **x-zsh**. Format loosely follows
[Keep a Changelog](https://keepachangelog.com/); versions follow semver.

## 0.7.2

- **Fixed:** a centered ancestor (e.g. a hero section with `text-align: center`)
  centered the terminal's content. Inherited CSS properties cross the shadow
  boundary, so `:host` now pins `text-align: start`.

## 0.7.1

- **Fixed:** loading the script in `<head>` without `defer` rendered an empty,
  never-animating terminal. The parser upgrades `<x-zsh>` at its opening tag —
  before the session text between the tags exists — so the element read an
  empty script. Setup now waits for the initial parse to finish
  (`DOMContentLoaded`) when upgraded mid-parse; script placement no longer
  matters. Dynamically created elements are unaffected.

## 0.7.0

- **Compact prompt** (`compact`) — an icons-only prompt (hides OS name + plugin versions).
- **Right prompt / tail** (`clock`) — a ticking time, plus a red `✘ <code>` status segment
  after a command whose output included an `error:` (like p10k's `RPROMPT`).
- **Accessibility:** `aria-label`s on all controls + copy buttons, a `role`/label on the
  window, and copy buttons are now reachable on **touch** and via **keyboard focus**
  (no longer hover-only).
- **Performance:** animation **pauses while scrolled out of view** and resumes on return;
  a `disconnectedCallback` clears timers/observers when an element is removed.
- **Prompt:** long directories are **truncated** (`~/…/c/d`) so they don't clip the
  powerline bar on narrow screens.
- **FOUC guard:** the script hides un-upgraded `<x-zsh>` so the raw markup never flashes.
- **Types:** ship `x-zsh.d.ts` (TypeScript declarations).
- **Docs:** corrected size/version claims, documented the HTML-escaping caveat and the
  JavaScript API; added badges, a changelog, and a favicon.

## 0.6.0

- `prompt-char` attribute — set the prompt symbol (`$`, `%`, `#`, `➜`, `λ`, …).
- Terminal-accurate command wrapping: no orphaned prompt, breaks at the column
  (`word-break: break-all`), fills the full width.
- Refreshed the demo GIF with the real brand logos.

## 0.5.0

- Named themes via `theme="…"` (tokyonight, dracula, nord, catppuccin, gruvbox,
  solarized, onedark, rosepine) and `XZsh.theme()` to register your own. Every color is a
  themeable CSS custom property.

## 0.4.0

- Real brand-logo icons (Simple Icons + a few devicon), **vendored into the package** and
  loaded lazily, tinted to the segment color via CSS mask — no third-party runtime
  dependency. `XZsh.iconBase` to relocate them.

## 0.3.1

- Fix git branch tracking (shows only when the cwd is inside a repo).
- Social-media preview (Open Graph + Twitter Card + image).
- Ship a minified build; `unpkg`/`jsDelivr` serve it.

## 0.3.0

- Per-plugin versions (`plugins="node@22"`), a custom plugin/OS registration API, 85+
  built-in plugins, and source viewers on every docs sample.

## 0.2.0

- 24 OS distros and 23 prompt plugins.

## 0.1.0 – 0.1.1

- First release: the `<x-zsh>` element, grammar, animation, controls, loop. Automated,
  tokenless npm publishing via GitHub Actions OIDC with provenance.
