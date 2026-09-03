# Adel Dice WebGL2

Mobile-first dice roller for an HTML WebView. The enhanced path renders a Three.js WebGL2 scene with Cannon physics, an ornate tray, an optional procedural dice tower, collision-driven audio, and impact-scaled vibration.

## Included

- Dice: d4, d6, d8, d10, d12, d20, and d100.
- d100 is rendered as two d10 bodies: percentile tens and units.
- Fair outcomes use rejection-sampled `crypto.getRandomValues`; physics only animates the already-selected result.
- Quantity 1–6, direct tray or tower mode, session history, and persistent preferences.
- Independent background, tray, tower, and dice skins based on the supplied visual references.
- Graceful no-WebGL2 mode keeps numeric rolling and history available.

## Run and verify

```bash
npm install
npm test
npm run build
npm run dev
```

The production WebView files are generated under `dist/client`.

## WebView host notes

- Enable JavaScript, WebGL2, hardware acceleration, and DOM storage.
- Keep audio behind the first user gesture; the roll button unlocks Web Audio.
- Android vibration uses `navigator.vibrate`. Grant vibration capability in the native host if required.
- WKWebView does not consistently expose `navigator.vibrate`; connect a native haptics message handler if iOS vibration is mandatory.
- Serve the build from HTTPS or a trusted app-local origin so secure randomness and browser media APIs remain available.
