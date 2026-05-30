// Type definitions for x-zsh — animated terminal walkthroughs as a custom element.
// `import 'x-zsh'` registers the <x-zsh> element and the global XZsh.

export interface XZshElement extends HTMLElement {
  /** Start (or resume) playback. */
  play(): void;
  /** Pause playback, snapping the in-flight effect to its end. */
  pause(): void;
  /** Restart from the beginning. */
  replay(): void;
  /** Render the next item instantly and pause. */
  stepForward(): void;
  /** Rebuild up to the previous item instantly and pause. */
  stepBack(): void;
}

export interface PluginDef {
  /** A Simple Icons slug (loaded from its CDN). */
  slug?: string;
  /** Any monochrome SVG URL. */
  url?: string;
  /** Emoji / text / inline-SVG fallback when no slug or url is given. */
  icon?: string;
  /** Version text shown after the icon. */
  txt?: string;
  /** Segment background color. */
  bg?: string;
  /** Segment foreground (icon + text) color. */
  fg?: string;
}

export interface OSDef {
  name?: string;
  slug?: string;
  url?: string;
  icon?: string;
  bg?: string;
  fg?: string;
}

export interface ThemeVars {
  bg?: string; fg?: string; muted?: string;
  accent?: string; accent2?: string;
  ok?: string; warn?: string; err?: string; info?: string;
  comment?: string; dir?: string; git?: string;
}

export interface XZshStatic {
  /** Base URL the vendored logos are served from. Resolves next to the script; overridable. */
  iconBase: string;
  themes: Record<string, ThemeVars>;
  /** Register or override a named theme. */
  theme(name: string, vars: ThemeVars): XZshStatic;
  /** Register or override a prompt plugin segment. */
  plugin(name: string, def: PluginDef): XZshStatic;
  /** Register or override an OS. */
  os(name: string, def: OSDef): XZshStatic;
  /** Also define the element under another hyphenated tag name. */
  register(tag: string): void;
  plugins: Record<string, PluginDef>;
  osList: Record<string, OSDef>;
}

declare global {
  interface Window { XZsh: XZshStatic; }
  const XZsh: XZshStatic;
  interface HTMLElementTagNameMap { 'x-zsh': XZshElement; }
}

export {};
