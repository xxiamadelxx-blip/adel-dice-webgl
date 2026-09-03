# Design QA — Adel Dice WebGL2

## Comparison target

- Source visual truth:
  - `references/tower-wooden-runic.jpg` — optional wooden runic tower.
  - `references/tray-black-gold.jpg` — black felt tray with warm wood/gold trim.
  - `references/dice-materials.jpg` — gemstone, glass, stone, and obsidian finishes.
  - `references/background-ivy-frame.jpg` — parchment/ivy application background.
  - `/workspace/scratch/be497104ef73/upload/01-1000046433.jpg` — mobile control density and hierarchy reference.
- Browser-rendered implementation screenshot: `artifacts/main-screen.jpg`.
- Combined comparison evidence: `artifacts/design-qa-comparison.jpg`.
- Focused state evidence: `artifacts/history-screen.jpg` and the in-browser skins sheet.

## Viewport and normalization

- Cloud browser screenshot: 1363 × 936 px, device scale factor 1.
- Intended mobile CSS viewport: 393 × 852 CSS px.
- Measured browser screen: 360.52 × 781.59 px because the protected mobile runtime scaled the phone to 0.9174 to fit the cloud viewport.
- Source pixels: tower 1536 × 1152; tray 1536 × 1536; dice 658 × 1536; background 1023 × 1536; original mobile reference 474 × 2047.
- Comparison normalization: reference contact sheet fit to 900 × 920; implementation phone crop fit to 460 × 920. This comparison is suitable for art direction and hierarchy, not pixel-perfect 1:1 claims.
- State: d100 selected, tower mode selected, one result settled; cloud-browser WebGL2 unavailable warning visible.

## Findings

- [P1] The core 3D scene cannot be visually compared in the available cloud browser.
  - Location: `.scene-layer` / Three.js renderer.
  - Evidence: the source requires a visible tray, tower, and physical dice; the browser capture shows the explicit WebGL2-unavailable state because this cloud Chrome exposes no WebGL2 GPU context.
  - Impact: browser evidence cannot prove final tray/tower/dice material fidelity or collision animation quality.
  - Fix: run the same build in a hardware-accelerated Android WebView or browser exposing WebGL2 and capture the settled direct and tower states at 393 × 852.

## Required fidelity surfaces

- Fonts and typography: passed for the visible shell. Georgia provides the intended fantasy display tone; system sans keeps small Russian controls readable. Weight and hierarchy remain legible at the scaled viewport.
- Spacing and layout rhythm: passed after iteration. Header now clears the iOS status area; the control dock is anchored above the home indicator; result, warning, and sheet regions do not collide.
- Colors and visual tokens: passed for the visible shell. Parchment/ivy, charcoal, oxblood error state, warm gold selection, and translucent dark panels map to the supplied art direction.
- Image quality and asset fidelity: passed for the visible source imagery. The actual ivy asset is used as the background, and the supplied tray/tower/dice references appear in the selector. 3D material fidelity remains blocked by the WebGL2 browser limitation above.
- Copy and content: passed. Russian labels are concise and standalone; d100, quantity, direct/tower, skins, history, sound, and vibration are clear.
- Icons and accessibility: passed for the visible shell. Radix icons use one stroke family; buttons are semantic, labelled, keyboard-focusable, and sized for touch; reduced-motion styling is present.

## Full-view comparison evidence

`artifacts/design-qa-comparison.jpg` shows the five supplied visual sources and the browser implementation in one image. The implementation carries the ivy parchment, dark tray-like control surface, gold accents, fantasy serif hierarchy, and dense mobile controls. The missing visible 3D objects are caused by the unavailable WebGL2 context and remain the blocking difference.

## Focused comparison evidence

- Skins sheet: dark surface and gold selected border retain readable contrast; supplied material/tray imagery is sharp and correctly cropped.
- History sheet: one d100 result is legible, aligned, and does not trigger the template keyboard.
- A focused 3D tray/tower/dice comparison was not possible because the selected cloud browser does not expose WebGL2.

## Comparison history

1. Earlier [P1] control dock appeared at the top because an undefined safe-area variable invalidated `bottom`; fixed with `--device-safe-area-bottom`. Post-fix evidence: `artifacts/main-screen.jpg` shows the dock above the home indicator.
2. Earlier [P2] header overlapped the iOS status area; fixed by moving the app header below the protected status bar and shifting result/warning panels. Post-fix evidence: `artifacts/main-screen.jpg`.
3. Earlier [P2] bottom-sheet content had low contrast on the runtime's white default surface; fixed with app-owned dark sheet tokens and gold selection states. Post-fix evidence: `artifacts/history-screen.jpg` and browser skins-sheet capture.
4. Current [P1] visible 3D fidelity cannot be closed in the cloud browser because WebGL2 is unavailable; no fake 2D dice rendering was substituted.

## Implementation checklist

- [x] Preserve independent background, tray, tower, and dice skin categories.
- [x] Keep tower optional and selected explicitly.
- [x] Verify mobile safe areas, bottom sheets, history, and d100 selection.
- [x] Compare supplied references and browser screenshot in one composite.
- [ ] Capture real WebGL2 direct and tower rolls on hardware-accelerated WebView at 393 × 852.

## Follow-up polish

- [P3] Replace the current procedural tower with an authored GLB if a Meshy/API-backed model-generation environment becomes available.

final result: blocked
