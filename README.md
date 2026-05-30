# &lt;x-zsh&gt;

[![npm version](https://img.shields.io/npm/v/x-zsh?logo=npm&color=cb3837)](https://www.npmjs.com/package/x-zsh)
[![minzipped size](https://img.shields.io/bundlephobia/minzip/x-zsh?color=8a2be2)](https://bundlephobia.com/package/x-zsh)
[![license: MIT](https://img.shields.io/npm/l/x-zsh?color=blue)](LICENSE)
[![publish](https://img.shields.io/badge/published%20via-GitHub%20Actions%20%2B%20provenance-2ea44f?logo=github)](https://github.com/i-rocky/x-zsh/actions)

**Drop-in animated terminal walkthroughs as an HTML element.** Write a terminal session
in plain text and `x-zsh` renders an animated, Powerlevel10k-style zsh — typing,
spinners, progress bars — fully isolated in its own Shadow DOM.

It's a *walkthrough player*, not an emulator: you can't type into it, and there's no
backend. Perfect for docs, READMEs-as-pages, landing pages, and install guides.

<p align="center">
  <img src="media/demo.gif" alt="x-zsh rendering an animated terminal install walkthrough" width="760">
</p>

- 🪶 One `<script>`, zero config, no dependencies (~11 KB minified + gzipped)
- 🛡️ Self-isolated in Shadow DOM — styles can't leak in or out
- ⌨️ Human-feeling typing (jitter + a blink at the prompt before each command)
- 📊 Authentic spinners and five real progress-bar styles (pip, wget, curl, cargo, tqdm)
- ⏯️ Optional controls (step / play-pause / replay) and infinite looping
- 🎨 Themeable via CSS custom properties; light & dark built in
- ♿ Respects `prefers-reduced-motion`

> **Live docs & examples:** https://i-rocky.github.io/x-zsh/

---

## Install

### CDN

```html
<!-- unpkg, latest (serves the minified build) -->
<script src="https://unpkg.com/x-zsh"></script>

<!-- or jsDelivr, pinned to a version -->
<script src="https://cdn.jsdelivr.net/npm/x-zsh@0.6/x-zsh.min.js"></script>
```

### npm

```sh
npm install x-zsh
```

```js
import 'x-zsh'; // side-effect import registers the <x-zsh> element
```

The script auto-registers `<x-zsh>` on load — there is nothing to initialize.

> A standards custom-element name must contain a hyphen, so the tag is `<x-zsh>`
> (not `<shell>`). Register a different tag with `XZsh.register('my-term')`.

---

## Quick start

```html
<x-zsh os="ubuntu" plugins="node" height="260" controls>
  note: Spin up the project locally.
  cmd: git clone https://github.com/acme/widget.git
  Cloning into 'widget'...
  spinner[2s]: Receiving objects => Received 2,418 objects, done.
  cmd: cd widget && npm install
  progress[2.4s]: Installing dependencies
  success: added 219 packages in 2s
  cmd: npm run dev
  info: ➜  Local:   http://localhost:5173/
</x-zsh>
```

---

## The language

The content between the tags is a tiny line-based language. **A bare line is stdout** of
the command above it; you only reach for a verb when a line isn't plain output. Only the
reserved words below (lowercase, followed by `:`) are verbs — any other `word:` renders as
ordinary output (no need to escape a stray `:`). Indentation is stripped.

> Because the content lives in your HTML, literal `<`, `>`, and `&` must be HTML-escaped as
> `&lt;`, `&gt;`, `&amp;` (e.g. `cmd: grep "&lt;div&gt;"`) — otherwise the browser's parser
> eats them before x-zsh sees the text.

### Input

| Verb | Meaning |
|---|---|
| `cmd:` | The user types a command (prompt + typing animation). |
| `root:` | A command needing root — rendered as `sudo <command>` on the normal prompt. |
| `type:` | A typed response; appends inline to the previous line (e.g. answering `[Y/n]`). |
| `key:` | A keypress glyph — `key: ^C`, `key: enter`, `key: tab`. |

### Output

| Verb | Meaning |
|---|---|
| *(bare line)* | Standard output. |
| `warning:` | Yellow. |
| `error:` | Red. |
| `success:` | Green. |
| `info:` | Cyan. |
| `note:` | An author's aside, rendered as a dimmed shell comment (`# text`). |

### Time & effects

| Verb | Meaning |
|---|---|
| `delay[800]:` | Pause; renders nothing. |
| `spinner[2s]: label => done` | Spinner for the duration, then `✓ done` (`=> done` optional). |
| `progress[3s]: label` | Progress bar 0→100% over the duration. |

### Screen & context

| Verb | Meaning |
|---|---|
| `clear:` | Clear the screen. |
| `prompt: dir=… branch=…` | Change prompt context — keys `user host dir branch git`. |
| `# …` | A source comment; never renders. |

**Auto-tracked (no verb):** `cd app` (incl. `&&` chains) updates the directory segment;
`git init`/`git clone` reveals the branch segment; `git checkout -b dev` switches it;
`source .venv/bin/activate` (or `conda activate`, `workon`) reveals the `python` venv
segment, and `deactivate` hides it.

### Durations & styles

The bracket on timed verbs holds a **duration** and/or a **style**, in any order:
`progress[3s pip]`, `spinner[1.5s line]`. Durations accept `800` (ms), `800ms`, `2s`, `1.5s`.

- **Progress styles:** `block` (default, tqdm/pip), `pip` (rich), `wget`, `curl`, `arrow` (cargo).
- **Spinner styles:** `dots` (default), `line`, `bar`, `arc`, `circle`.

---

## Attributes

All optional, set on the `<x-zsh>` tag.

| Attribute | Default | What it does |
|---|---|---|
| `os` | `ubuntu` | Prompt icon + brand color. One of: `ubuntu, debian, macos, arch, fedora, alpine, mint, manjaro, kali, centos, rhel, rocky, alma, opensuse, raspbian, gentoo, void, nixos, popos, elementary, windows, wsl, freebsd, termux`. |
| `mode` | `dark` | `dark` or `light`. |
| `theme` | — | Named palette: `tokyonight, dracula, nord, catppuccin, gruvbox, solarized, onedark, rosepine`. Register more with `XZsh.theme()`. |
| `plugins` | — | Comma list of prompt segments, each with an optional `@version` (e.g. `node@22,go@1.23,k8s@staging`). 85+ built-ins span languages, runtimes, frameworks, package managers, databases, and cloud/devops (`node, python, go, rust, ruby, php, java, react, vue, postgres, redis, docker, k8s, aws, terraform, …`). Register your own with `XZsh.plugin()`. (`python` shows only after a venv is activated, unless you pass an explicit `python@3.12`.) |
| `user` `host` `dir` `branch` | `you localhost ~ main` | Initial prompt context. |
| `title` | `user@host: dir` | Window title-bar text. |
| `prompt-char` | `❯` | The prompt symbol before each command — e.g. `$`, `%`, `#`, `➜`, `λ`. |
| `compact` | off | Icons-only prompt — hides the OS name and plugin versions (keeps dir/branch). |
| `clock` | off | Show a ticking time in the right prompt (tail). |
| `height` | — | Fixed screen height (px number or CSS length). Scrolls internally; auto-scrolls. |
| `rows` | — | Fixed height in text rows (overrides `height`). |
| `speed` | `34` | Average ms per typed character. |
| `gap` | `900` | ms the prompt blinks before a command starts typing. |
| `bar` | `block` | Default progress-bar style. |
| `controls` | off | Show the step / play-pause / replay bar. |
| `loop` | off | Replay forever. |
| `loop-delay` | `1400` | ms between loops. |

The **right prompt** (tail) — like p10k's `RPROMPT` — shows the ticking `clock` and, after a
command whose output included an `error:`, a red `✘ <code>` status segment.

It plays when scrolled into view, pauses while scrolled out of view, and resumes when it
comes back. It also respects `prefers-reduced-motion` (renders instantly, no animation).

## JavaScript API

Each element exposes playback methods, and `XZsh` has a few statics:

```js
const term = document.querySelector('x-zsh');
term.play(); term.pause(); term.replay();
term.stepForward(); term.stepBack();

XZsh.theme('name', { … });          // register a theme
XZsh.plugin('name', { … });         // register a plugin segment
XZsh.os('name', { … });             // register an OS
XZsh.register('my-term');           // also define under another hyphenated tag
XZsh.iconBase = '/my/icons/';       // serve the vendored logos from elsewhere
```

---

## Theming

Pick a built-in palette with the `theme` attribute — `tokyonight, dracula, nord,
catppuccin, gruvbox, solarized, onedark, rosepine`:

```html
<x-zsh theme="dracula"> … </x-zsh>
```

Register your own (keys: `bg fg muted accent accent2 ok warn err info comment dir git`):

```js
XZsh.theme('mytheme', { bg: '#101418', fg: '#e6edf3', accent: '#3fb950', accent2: '#58a6ff' });
```

Or just override the CSS custom properties directly on the host — they're all themeable:

```css
x-zsh { --bg: #1e1e2e; --fg: #cdd6f4; --accent2: #89b4fa; }
x-zsh::part(window) { border-radius: 6px; }
```

OS/plugin segments keep their brand colors; the theme controls the background, text,
prompt accent, output colors, and the dir/git segments. `mode="light"` is a quick built-in
light palette (a `theme` takes precedence over it).

## Custom plugins & pinned versions

Pin any segment's version inline, and register your own segments at runtime:

```html
<x-zsh plugins="node@22.3.0, go@1.23, k8s@staging"> … </x-zsh>
```

```js
import 'x-zsh';
// register before the element scrolls into view (e.g. in <head>)
XZsh.plugin('acme', { slug: 'docker', txt: 'v2', bg: '#5b21b6', fg: '#fff' }); // a Simple Icons slug
XZsh.plugin('beta', { url: 'https://…/logo.svg', bg: '#222', fg: '#fff' });    // any monochrome SVG URL
XZsh.plugin('gamma',{ icon: '🚀', bg: '#222', fg: '#fff' });                   // emoji/text fallback
XZsh.os('myos',     { name: 'MyOS', slug: 'archlinux', bg: '#222', fg: '#fff' });
```

Then `<x-zsh os="myos" plugins="acme@v3">` renders your custom OS and segment.

### Icons load on demand

Built-in OS/plugin logos are **real brand icons, vendored into this package** under
[`icons/`](icons/) — so there's no runtime dependency on a third-party repo that could
change or disappear. They're loaded **lazily** and tinted to the segment color via CSS
`mask`; a logo is fetched only when its plugin/OS actually appears, so the script itself
stays ~11 KB. The base resolves next to wherever you load `x-zsh` (npm, a CDN, or your own
host), so the same origin serves the icons; override with `XZsh.iconBase = '/my/icons/'`.
Offline, segments still show their text/version, just without the glyph.

Logos come from [Simple Icons](https://github.com/simple-icons/simple-icons) (CC0) and a
couple from [devicon](https://github.com/devicons/devicon) (MIT) — see
[`icons/CREDITS.md`](icons/CREDITS.md). Regenerate with `node scripts/fetch-icons.mjs`.

---

## Browser support

Any browser with Custom Elements v1 and Shadow DOM v1 (all current evergreen browsers).
Box-drawing/powerline separators are drawn with CSS, so no special fonts are required.

---

## Development

See [CONTRIBUTING.md](CONTRIBUTING.md). In short: it's one dependency-free file
(`x-zsh.js`) and a static docs page (`index.html`).

```sh
git clone https://github.com/i-rocky/x-zsh
cd x-zsh
npm start          # serves the docs at http://localhost:8000
```

## License

[MIT](LICENSE)
