# WebGL2 Dice Roller — Design Specification

## Goal

Build a mobile-first HTML application for Android WebView that renders a tactile 3D dice tray and optional dice tower with Three.js/WebGL2, supports d4 through d100, produces unbiased random outcomes, reacts to collisions with sound and vibration, and allows background, tray, tower, and dice skins to be changed independently.

## Product Experience

The app opens directly into a full-screen tabletop scene. The tray and dice remain the visual focus. A compact top HUD shows the latest result and quick sound/vibration controls. A compact bottom control surface contains the die selector, quantity control, direct/tower throw mode, primary Roll button, and access to skins and session history.

The reference screenshot supplies the dark RPG tone and control vocabulary, but its long browser-page layout is intentionally replaced by a one-screen mobile app composition. All core controls remain reachable with one thumb and do not cover the settled dice.

## Supported Dice

- d4, d6, d8, d10, d12, and d20 are rendered as their real polyhedral shapes.
- d100 is represented by the tabletop-standard pair of d10 dice: one numbered in tens (00–90) and one numbered in units (0–9).
- Quantity can be set from 1 to 6 for d4–d20. d100 always creates one percentile pair per requested die.
- The result HUD shows each die result and the total. d100 shows the combined percentile value, treating 00 + 0 as 100.

## Randomness and Settling

The approved hybrid model separates outcome generation from visual simulation.

1. `crypto.getRandomValues()` selects every logical result with rejection sampling, avoiding modulo bias.
2. Cannon-es simulates gravity, collisions, friction, restitution, and angular motion.
3. Three.js mirrors every physics body's position and orientation each frame.
4. Once all bodies are below linear and angular thresholds for a stable time window—or a strict timeout is reached—the settle controller rotates each die to the already-selected result and puts its physics body to sleep.
5. A new roll resets bodies, timers, collision throttles, and displayed state. No die remains in an endless-spin state.

This produces fair random values, visibly physical throws, and deterministic completion on mobile hardware.

## 3D Scene and Physics

- WebGL2 is required. A clear unsupported-device panel appears if a WebGL2 context cannot be created.
- The scene contains a table/environment, a distinct tray base, and four raised tray walls. Only the tray is a collision container.
- The dice tower is a separate scene entity, never a recolor of the tray or background. It appears only in Tower mode at the rear of the tray and uses internal deflectors to redirect falling dice into the tray. Direct mode removes the tower from the active scene.
- The camera is perspective, top-down at an angle, and adjusts to portrait and landscape sizes.
- Lighting uses an ambient/hemisphere contribution plus a key shadow-casting light.
- Renderer pixel ratio is capped for predictable WebView performance.
- Dice meshes use convex polyhedron collision shapes. Dice quantity and contact counts are bounded.
- Contact materials provide believable bounce on the first impacts and rapid damping afterward.

## Audio and Haptics

- Web Audio is unlocked on the first user gesture.
- Collision impulse maps to click volume, pitch variation, and a short low-frequency body resonance.
- Per-body throttling prevents repeated audio chatter while a die rests against a surface.
- Strong impacts call `navigator.vibrate()` with short intensity-banded patterns when available and enabled.
- Sound and vibration can be toggled separately. Unsupported vibration fails silently without affecting the roll.

## Skin System

Four independent categories are exposed in the skin sheet:

- Background/table: ivy parchment from the supplied reference, midnight slate, and warm walnut.
- Tray: supplied black leather with antique-gold trim as the hero design, oxblood leather, and moss velvet.
- Tower: supplied octagonal light-wood form with a dark engraved body as the hero design, rune walnut, and compact plain oak.
- Dice: black obsidian, howlite, opalite, blue sandstone, amethyst, bloodstone, and prismatic glass, following the supplied material board.

Each category owns distinct scene tokens and materials. Changing the background does not recolor the tray; changing the tray does not replace the background or tower; changing the tower does not alter the tray; changing dice only updates dice materials and label contrast. Selection is stored in `localStorage`.

## Supplied Visual References

- `references/tower-wooden-runic.jpg`: tall octagonal wooden tower, layered wooden crown/base, dark or rune-engraved central panels, and a visible lower exit chute.
- `references/tray-black-gold.jpg`: square deep black tray, antique-gold rim, pierced filigree side panels, floral linework, and a central d20 emblem.
- `references/dice-materials.jpg`: gemstone, stone, wood, opaque, and translucent d20 finishes used as the material and label-contrast guide.
- `references/background-ivy-frame.jpg`: pale parchment field with asymmetric ivy and Art Nouveau vine border, used as an app-background skin outside the 3D tray.

The tower and tray photographs are shape/material references, not flat background images pasted onto geometry. The implementation uses lightweight procedural 3D forms and materials so it remains responsive in Android WebView. The ivy artwork is used directly as the parchment background skin.

## Interface States

- Idle: die type and quantity are editable; Roll is prominent.
- Rolling: controls that would invalidate the throw are disabled; the result reads “Rolling…”.
- Settled: result chips and total appear; history receives one entry.
- Skin sheet open: categorized previews with selected states; scene remains visible behind a dim scrim.
- Throw mode changes between a direct toss and a tower drop without mixing or renaming either object.
- History sheet open: newest entries first with clear-history action.
- WebGL2 unsupported: explanatory fallback with no fake 2D dice.

## Accessibility and Mobile Constraints

- Interactive targets are at least 44 CSS pixels.
- Controls have labels, keyboard focus styles, and useful pressed/selected states.
- Text and controls respect Android WebView safe-area insets.
- Reduced-motion mode shortens the throw and settle time without changing randomness.
- The viewport disables accidental page overscroll while preserving control-sheet scrolling.

## Architecture

- `src/core/random.ts`: unbiased integer generation and roll construction.
- `src/core/dice.ts`: die definitions, d100 composition, and display formatting.
- `src/scene/geometries.ts`: render and convex-physics geometry factories.
- `src/scene/materials.ts`: independent skin definitions and Three.js materials.
- `src/scene/Tower.ts`: lightweight tower mesh, internal deflectors, throw entrance, exit, and visibility lifecycle.
- `src/scene/DiceWorld.ts`: renderer, scene, physics world, bodies, collisions, lifecycle, and disposal.
- `src/audio/ImpactFeedback.ts`: Web Audio and vibration mapping.
- `src/hooks/useDiceRoller.ts`: UI-facing roll state and world orchestration.
- `src/Prototype.tsx`: the app screen and interaction flow.
- `src/prototype.css`: app-specific responsive visual system.

The Product Design mobile runtime remains intact around the app screen.

## Error Handling

- Cryptographic RNG absence is treated as unsupported rather than silently downgraded to `Math.random()`.
- Renderer initialization failures show the unsupported panel.
- Audio initialization, audio playback, localStorage, and vibration failures are non-fatal and isolated.
- Physics settles through both motion thresholds and a maximum-duration safety cutoff.

## Verification

- Unit tests cover unbiased-range boundaries with an injectable entropy source, d100 composition, result formatting, collision feedback bands, and settling-state transitions.
- Runtime protection, TypeScript, production build, and Sites packaging checks must pass.
- Browser verification covers initial render, every die selector, quantity changes, a full roll to settled state, d100 display, independent skin changes, history, sound/vibration toggles, resize, console errors, and WebGL2 readiness.
- Visual QA compares the supplied reference and a browser-rendered mobile screen at normalized size. The reference is an art-direction source rather than a pixel-identical layout target; deliberate one-screen differences are documented.

## Out of Scope for Version One

- Multiplayer, accounts, cloud history, backend APIs, custom formulas/modifiers, advantage/disadvantage, and downloadable skin packs.
- A single physical 100-face zocchihedron.
- Android native wrapper code; the deliverable is WebView-ready web content.
