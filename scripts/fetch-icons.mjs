// Vendors the brand logos we use into ./icons/<key>.svg so we don't depend on
// upstream packages at runtime. Sources: Simple Icons (CC0) and a couple from
// devicon (MIT). Re-run after changing the OS/plugin lists. See icons/CREDITS.md.
import fs from 'node:fs';

const SI = (slug) => 'https://cdn.jsdelivr.net/npm/simple-icons@16/icons/' + slug + '.svg';
const DV = (p) => 'https://cdn.jsdelivr.net/npm/devicon@2.16.0/icons/' + p + '.svg';

// key -> source URL (omit a key to leave it as a text fallback, e.g. aws)
const SRC = {
  // OS
  ubuntu: SI('ubuntu'), debian: SI('debian'), macos: SI('apple'), arch: SI('archlinux'),
  fedora: SI('fedora'), alpine: SI('alpinelinux'), mint: SI('linuxmint'), manjaro: SI('manjaro'),
  kali: SI('kalilinux'), centos: SI('centos'), rhel: SI('redhat'), rocky: SI('rockylinux'),
  alma: SI('almalinux'), opensuse: SI('opensuse'), raspbian: SI('raspberrypi'), gentoo: SI('gentoo'),
  void: SI('voidlinux'), nixos: SI('nixos'), popos: SI('popos'), elementary: SI('elementary'),
  freebsd: SI('freebsd'), wsl: SI('linux'), windows: DV('windows11/windows11-original'),
  termux: SI('gnometerminal'),
  // generic
  git: SI('git'),
  // plugins
  node: SI('nodedotjs'), python: SI('python'), docker: SI('docker'), rust: SI('rust'), go: SI('go'),
  ruby: SI('ruby'), php: SI('php'), java: SI('openjdk'), kotlin: SI('kotlin'), swift: SI('swift'),
  deno: SI('deno'), bun: SI('bun'), dotnet: SI('dotnet'), elixir: SI('elixir'), dart: SI('dart'),
  zig: SI('zig'), lua: SI('lua'), perl: SI('perl'), haskell: SI('haskell'), terraform: SI('terraform'),
  k8s: SI('kubernetes'), gcp: SI('googlecloud'), cpp: SI('cplusplus'), c: SI('c'), csharp: SI('dotnet'),
  fsharp: SI('fsharp'), scala: SI('scala'), clojure: SI('clojure'), erlang: SI('erlang'),
  julia: SI('julia'), r: SI('r'), nim: SI('nim'), crystal: SI('crystal'), elm: SI('elm'),
  ocaml: SI('ocaml'), gleam: SI('gleam'), solidity: SI('solidity'), react: SI('react'),
  vue: SI('vuedotjs'), angular: SI('angular'), svelte: SI('svelte'), next: SI('nextdotjs'),
  nuxt: SI('nuxt'), astro: SI('astro'), vite: SI('vite'), tailwind: SI('tailwindcss'),
  rails: SI('rubyonrails'), django: SI('django'), laravel: SI('laravel'), spring: SI('spring'),
  flutter: SI('flutter'), npm: SI('npm'), yarn: SI('yarn'), pnpm: SI('pnpm'), brew: SI('homebrew'),
  poetry: SI('poetry'), gradle: SI('gradle'), maven: SI('apachemaven'), conda: SI('anaconda'),
  postgres: SI('postgresql'), mysql: SI('mysql'), mongodb: SI('mongodb'), redis: SI('redis'),
  sqlite: SI('sqlite'), mariadb: SI('mariadb'), elastic: SI('elasticsearch'),
  azure: DV('azure/azure-original'), helm: SI('helm'), ansible: SI('ansible'), vault: SI('vault'),
  nginx: SI('nginx'), vercel: SI('vercel'), netlify: SI('netlify'), firebase: SI('firebase'),
  supabase: SI('supabase'), cloudflare: SI('cloudflare'), github: SI('github'), gitlab: SI('gitlab'),
  podman: SI('podman'), vim: SI('vim'), neovim: SI('neovim'), tmux: SI('tmux'), zsh: SI('zsh'),
  bash: SI('gnubash')
};

fs.mkdirSync('icons', { recursive: true });
let ok = 0; const fail = [];
for (const [key, url] of Object.entries(SRC)) {
  const r = await fetch(url);
  if (!r.ok) { fail.push(key + ' (' + r.status + ')'); continue; }
  fs.writeFileSync('icons/' + key + '.svg', await r.text());
  ok++;
}
console.log('wrote ' + ok + ' icons to icons/');
if (fail.length) console.log('FAILED: ' + fail.join(', '));
