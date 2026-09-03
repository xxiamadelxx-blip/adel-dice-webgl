# Browser QA — Adel Dice WebGL2

## Environment

- Preview: local Sites-ready Vite build in the selected cloud Chrome.
- Mobile runtime: iPhone preset; intended screen 393 × 852 CSS px; rendered at 0.9174 scale inside the available cloud viewport.
- WebGL2: unavailable in this cloud browser. The app showed its explicit unsupported state; no canvas was created.

## Primary interactions tested

- Increased quantity to 2, selected d100, and confirmed the CTA changed to `БРОСИТЬ 2D100`.
- Switched from direct tray to `Через башню`.
- Rolled d100; the cryptographic percentile results `66 + 93` settled as `159` and appeared in the result panel and session history.
- Toggled sound and vibration off and confirmed both semantic pressed states changed; restored them afterward.
- Independently applied `Полуночный сланец`, `Бычья кровь`, `Рунический орех`, and `Аметист`; then restored all four defaults.
- Opened the history sheet and confirmed one `2d100` entry.
- Confirmed the skins/history sheets do not leave the simulated keyboard visible.
- Confirmed header, result, warning, and bottom controls stay within the phone screen.
- Confirmed visual QA signals: `profile=adel-dice-webgl-v1`, `fallback=false`, and phase transitions from `idle` to `settled`. The cloud browser correctly reported `status=unsupported` because it exposes no WebGL2 context.

## Console review

- No app-origin warning or error appeared in the clean verification tab.
- A Chrome-extension metadata error is external to the app.
- A React hook-order error occurred only during hot-module replacement after adding a hook; a clean reload removed it and it is not present in the production build.

## Blocker

Physical Three.js rendering, collision animation, collision audio, and impact vibration could not be exercised in the cloud browser because it does not expose a WebGL2 context. These paths are covered by unit/integration tests and require the final hardware-accelerated Android WebView pass.
