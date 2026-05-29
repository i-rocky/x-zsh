# Contributing / Development

`x-zsh` is intentionally tiny: **one dependency-free file** (`x-zsh.js`) plus a static
docs page (`index.html`). There is no build step, no bundler, and no framework.

## Run it locally

Any static file server works — the page just loads `x-zsh.js` next to it.

```sh
git clone https://github.com/i-rocky/x-zsh
cd x-zsh
npm start            # python3 -m http.server 8000
# open http://localhost:8000
```

Edit `x-zsh.js`, refresh the page, done.

## Architecture

`x-zsh.js` is a single IIFE that defines one custom element. The flow:

1. **Parse** (`dedent`, `classify`) — the tag's text content is dedented, then each line is
   classified into `{ verb, dur, style, text }`. A line matching a reserved verb word
   becomes that verb; anything else is `out` (stdout). `#` lines are dropped.

2. **Mount** (`connectedCallback` → `build`) — a Shadow DOM is attached and the whole UI
   (window chrome, screen, optional control bar) is rendered from one `:host` stylesheet
   (`Term.css`), so nothing leaks in or out. A fixed `height`/`rows` makes the screen
   scroll internally instead of reflowing the page.

3. **Play** (`observe` → `play`/`loopStep`) — an `IntersectionObserver` starts playback when
   the element scrolls into view. `loopStep` renders one item at a time via an async chain.
   Every transport action (`play`, `pause`, `replay`, `stepForward`, `stepBack`) bumps a
   `_run` token; `loopStep` aborts if its token is stale, so two playbacks can never overlap.

4. **Effects** — `typeInto`, `spinner`, `progress`, and `wait` are all **cancelable**: each
   registers a `_kill` that snaps it to its final state. That's how pause/step feel instant.
   Passing `instant: true` (used by step/rebuild) renders synchronously with no animation.

5. **Context tracking** (`track`, `applyCd`, `applyPrompt`) — commands are inspected so the
   prompt's directory/branch segments update as a real session would.

## Where things live

| Concern | In code |
|---|---|
| Reserved verbs | `RESERVED` array + `VERB_RE` |
| OS palettes / prompt plugins | `OS`, `PLUGINS` |
| Progress bar styles | `BARS` (each returns a line of HTML at a given `pct`) |
| Spinner frame sets | `SPINS` |
| All styling | `Term.css` (a joined string applied inside the shadow root) |
| Public API | `XZsh.register(tag)`, `XZsh.theme(name, vars)` |

## Adding things

- **A progress style:** add a function to `BARS` keyed by name. It receives `(pct, label)`
  and returns the inner HTML. Use `<span class="fc">` for the filled part and
  `<span class="rc">` for the remaining part if you want them colored; add CSS in `Term.css`.
- **A spinner style:** add a frame string to `SPINS`.
- **An OS or plugin segment:** add an entry to `OS` / `PLUGINS`.
- **A verb:** add it to `RESERVED`, handle it in `renderItem`.

## Conventions

- Plain ES (classes + `var`), no transpilation. Keep it dependency-free and one file.
- No backward-compat shims: when a marker or attribute changes, change it cleanly.
- Verify changes in the browser (the docs page exercises every feature).

## Releasing

```sh
npm version patch        # or minor / major
npm publish              # see README of repo for npm + CDN notes
git push --follow-tags
```
