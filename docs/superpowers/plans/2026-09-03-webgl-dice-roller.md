# WebGL2 Dice Roller Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a WebView-ready mobile dice roller with a physical Three.js/Cannon-es scene, fair d4–d100 outcomes, impact feedback, optional tower mode, history, and independent visual skins.

**Architecture:** A protected Product Design mobile runtime hosts one app screen. Pure core modules own randomness, die definitions, feedback mapping, and settle-state logic; the Three.js/Cannon-es world consumes those modules and emits lifecycle events to a React hook. UI state never reaches into renderer internals, and background, tray, tower, and dice themes use separate identifiers.

**Tech Stack:** React 19, TypeScript 7, Vite 8, Three.js, cannon-es, Vitest, Testing Library, Playwright, Web Audio, Vibration API, CSS.

**Spec:** `docs/superpowers/specs/2026-09-03-webgl-dice-roller-design.md`

## Global Constraints

- WebGL2 is mandatory; never display a fake 2D dice fallback.
- Random results must use `crypto.getRandomValues()` with rejection sampling and never silently fall back to `Math.random()`.
- The approved hybrid roll must always reach a terminal settled state through motion thresholds or a strict timeout.
- d100 is one tens d10 plus one units d10, with `00 + 0` displayed as `100`.
- Background, tray, tower, and dice skin identifiers and materials remain independent.
- Direct mode hides the tower; Tower mode uses the tower as a launcher and the tray as catcher.
- The protected mobile runtime files listed in `AGENTS.md` may not be edited.
- Renderer pixel ratio and dice count are capped for Android WebView performance.

---

### Task 1: Bootstrap the protected mobile project and test harness

**Files:**
- Preserve: `docs/superpowers/specs/2026-09-03-webgl-dice-roller-design.md`
- Preserve: `docs/superpowers/plans/2026-09-03-webgl-dice-roller.md`
- Generate: Product Design mobile runtime files under the project root
- Modify: `package.json`
- Create: `vitest.config.ts`
- Create: `src/test/setup.ts`

**Interfaces:**
- Consumes: the Product Design `mobile-app` template and its protected runtime contract.
- Produces: `npm run test`, Three.js/Cannon-es dependencies, and a runtime that passes `npm run check:runtime`.

- [ ] **Step 1: Bootstrap into a temporary folder and merge without replacing docs, references, or Git history**

Run:

```bash
node /root/.codex/plugins/cache/openai-curated-remote/product-design/0.1.53/scripts/bootstrap-prototype.mjs \
  --template mobile-app \
  --dest /workspace/scratch/be497104ef73/adel-dice-runtime
cp -a /workspace/scratch/be497104ef73/adel-dice-runtime/. /workspace/scratch/be497104ef73/adel-dice-webgl/
```

Expected: protected runtime files exist while `docs/`, `references/`, and `.git/` remain intact.

- [ ] **Step 2: Install baseline and app dependencies**

Run:

```bash
npm ci --prefer-offline --no-audit --no-fund
npm install three cannon-es
npm install --save-dev vitest jsdom @testing-library/react @testing-library/jest-dom @types/three
```

- [ ] **Step 3: Add the test script and harness**

Add these scripts to `package.json`:

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

Create `vitest.config.ts` with a jsdom environment and `src/test/setup.ts` that imports `@testing-library/jest-dom/vitest`.

- [ ] **Step 4: Verify the protected runtime before app code**

Run: `npm run check:runtime`

Expected: exit 0 and no modified protected runtime hash.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json vitest.config.ts src/test mobile-runtime.lock.json AGENTS.md src/mobile public/assets/iphone public/assets/android public/assets/status
git commit -m "chore: bootstrap mobile WebGL app"
```

### Task 2: Build fair dice-result core with TDD

**Files:**
- Create: `src/core/random.test.ts`
- Create: `src/core/random.ts`
- Create: `src/core/dice.test.ts`
- Create: `src/core/dice.ts`

**Interfaces:**
- Produces: `randomIntInclusive(min, max, entropy?)`, `rollDice(type, quantity, entropy?)`, `combinePercentile(tens, units)`, `formatRoll(result)`.
- Consumes: an optional `EntropySource` so rejection behavior can be tested without mocking browser crypto.

- [ ] **Step 1: Write failing tests for inclusive bounds and rejection sampling**

```ts
it('returns both inclusive bounds from injected entropy', () => {
  expect(randomIntInclusive(1, 20, sequenceEntropy([0]))).toBe(1)
  expect(randomIntInclusive(1, 20, sequenceEntropy([19]))).toBe(20)
})

it('rejects entropy outside the largest even range', () => {
  expect(randomIntInclusive(1, 6, sequenceEntropy([0xffffffff, 5]))).toBe(6)
})
```

- [ ] **Step 2: Run the tests and verify RED**

Run: `npm test -- src/core/random.test.ts`

Expected: FAIL because `randomIntInclusive` does not exist.

- [ ] **Step 3: Implement minimal rejection-sampled crypto RNG**

```ts
export type EntropySource = () => number

export function randomIntInclusive(min: number, max: number, entropy = cryptoUint32): number {
  const span = max - min + 1
  const limit = Math.floor(0x100000000 / span) * span
  let value = entropy()
  while (value >= limit) value = entropy()
  return min + (value % span)
}
```

- [ ] **Step 4: Run the RNG tests and verify GREEN**

Run: `npm test -- src/core/random.test.ts`

Expected: all RNG tests pass.

- [ ] **Step 5: Write failing tests for every die and percentile composition**

```ts
it.each([4, 6, 8, 10, 12, 20] as const)('rolls d%s within range', (sides) => {
  const result = rollDice(`d${sides}`, 3, sequenceEntropy([0, 1, 2]))
  expect(result.values).toHaveLength(3)
  expect(result.values.every((value) => value >= 1 && value <= sides)).toBe(true)
})

it('treats 00 and 0 as 100', () => {
  expect(combinePercentile(0, 0)).toBe(100)
})
```

- [ ] **Step 6: Run the dice tests and verify RED**

Run: `npm test -- src/core/dice.test.ts`

Expected: FAIL because the dice API does not exist.

- [ ] **Step 7: Implement die definitions, rolls, d100 pairs, and display formatting**

Define exact discriminated unions:

```ts
export type DieType = 'd4' | 'd6' | 'd8' | 'd10' | 'd12' | 'd20' | 'd100'
export type StandardRoll = { kind: 'standard'; type: Exclude<DieType, 'd100'>; values: number[]; total: number }
export type PercentileRoll = { kind: 'percentile'; type: 'd100'; pairs: { tens: number; units: number; value: number }[]; values: number[]; total: number }
export type RollResult = StandardRoll | PercentileRoll
```

- [ ] **Step 8: Run all core tests**

Run: `npm test -- src/core`

Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add src/core
git commit -m "feat: add fair dice result core"
```

### Task 3: Build impact feedback and deterministic settle controller with TDD

**Files:**
- Create: `src/audio/feedbackBands.test.ts`
- Create: `src/audio/feedbackBands.ts`
- Create: `src/audio/ImpactFeedback.ts`
- Create: `src/scene/settle.test.ts`
- Create: `src/scene/settle.ts`

**Interfaces:**
- Produces: `feedbackForImpulse(impulse)`, `ImpactFeedback.unlock()`, `ImpactFeedback.hit(impulse)`, `updateSettleState(snapshot, deltaMs)`.
- Consumes: collision impulses and per-frame body speed snapshots from `DiceWorld`.

- [ ] **Step 1: Write failing feedback-band tests**

```ts
it.each([
  [0.4, 'none'],
  [1.1, 'light'],
  [3.0, 'medium'],
  [7.0, 'heavy'],
] as const)('maps impulse %s to %s', (impulse, band) => {
  expect(feedbackForImpulse(impulse).band).toBe(band)
})
```

- [ ] **Step 2: Verify RED, implement bands, verify GREEN**

Run: `npm test -- src/audio/feedbackBands.test.ts`

Expected before implementation: FAIL. Expected afterward: PASS with volume clamped to `0..0.36` and vibration patterns `[]`, `[8]`, `[12]`, or `[18, 18, 10]`.

- [ ] **Step 3: Write failing settle-state tests**

```ts
it('settles after every body is quiet for 550ms', () => {
  const state = updateSettleState(quietSnapshot, 551)
  expect(state.phase).toBe('settled')
})

it('forces settling at 5200ms even when a body keeps spinning', () => {
  const state = updateSettleState(spinningSnapshotAt(5201), 16)
  expect(state.phase).toBe('settled')
  expect(state.reason).toBe('timeout')
})
```

- [ ] **Step 4: Verify RED, implement the pure settle state machine, verify GREEN**

Run: `npm test -- src/scene/settle.test.ts`

Expected after implementation: both motion-threshold and timeout paths pass.

- [ ] **Step 5: Implement `ImpactFeedback` around Web Audio and `navigator.vibrate`**

Use dependency injection for `AudioContext` creation and vibration so initialization failures remain non-fatal. Throttle each body to one sound per 55ms.

- [ ] **Step 6: Run module and full tests**

Run: `npm test`

Expected: all tests pass with no unhandled audio or navigator errors.

- [ ] **Step 7: Commit**

```bash
git add src/audio src/scene/settle.ts src/scene/settle.test.ts
git commit -m "feat: add impact feedback and settle controller"
```

### Task 4: Build polyhedral geometry, skins, tray, and tower with TDD

**Files:**
- Create: `src/scene/skins.test.ts`
- Create: `src/scene/skins.ts`
- Create: `src/scene/geometries.test.ts`
- Create: `src/scene/geometries.ts`
- Create: `src/scene/Tower.ts`
- Create: `src/scene/labelTexture.ts`

**Interfaces:**
- Produces: `SKINS`, `resolveSkinSelection`, `createDieGeometry`, `createConvexShape`, `createTowerGroup`, and generated label textures.
- Consumes: die types and four independent selected skin ids.

- [ ] **Step 1: Write failing tests proving skin independence and persisted fallback behavior**

```ts
it('changes one skin category without altering the others', () => {
  const next = resolveSkinSelection(DEFAULT_SKINS, { tray: 'oxblood' })
  expect(next).toEqual({ ...DEFAULT_SKINS, tray: 'oxblood' })
})

it('falls back only for an invalid category id', () => {
  expect(resolveSkinSelection({ ...DEFAULT_SKINS, dice: 'missing' }).dice).toBe(DEFAULT_SKINS.dice)
})
```

- [ ] **Step 2: Verify RED, implement the typed catalog, verify GREEN**

Run: `npm test -- src/scene/skins.test.ts`

Catalog exact ids: backgrounds `ivy | slate | walnut`; trays `black-gold | oxblood | moss`; towers `treewood | rune-walnut | plain-oak`; dice `obsidian | howlite | opalite | blue-sandstone | amethyst | bloodstone | prismatic`.

- [ ] **Step 3: Write failing tests for geometry vertices and convex shape availability**

```ts
it.each(['d4', 'd6', 'd8', 'd10', 'd12', 'd20'] as const)('creates %s render and physics geometry', (type) => {
  expect(createDieGeometry(type).getAttribute('position').count).toBeGreaterThan(0)
  expect(createConvexShape(type).vertices.length).toBeGreaterThan(3)
})
```

- [ ] **Step 4: Verify RED, implement geometry factories, verify GREEN**

Use Three.js polyhedron primitives plus a convex-hull extraction that de-duplicates positions and maps face indices into Cannon-es `ConvexPolyhedron` faces.

- [ ] **Step 5: Implement app-owned label textures and the reference-led tower**

Create number canvases at 256px with accessible contrast. Build the tower from low-poly octagonal wood rings, dark inset panels, a top opening, lower chute, and two invisible internal Cannon-es deflectors; do not load a large external GLB.

- [ ] **Step 6: Run tests and typecheck**

Run: `npm test && npx tsc --noEmit`

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/scene
git commit -m "feat: add dice geometry and independent scene skins"
```

### Task 5: Integrate the Three.js and Cannon-es world

**Files:**
- Create: `src/scene/DiceWorld.test.ts`
- Create: `src/scene/DiceWorld.ts`
- Create: `src/hooks/useDiceRoller.ts`

**Interfaces:**
- Produces: `DiceWorld.mount`, `roll`, `setSkins`, `setThrowMode`, `resize`, `dispose`, and UI-facing `useDiceRoller` state.
- Consumes: core roll results, geometries, skin catalog, tower group, settle controller, and impact feedback.

- [ ] **Step 1: Write failing lifecycle tests with an injected renderer adapter**

```ts
it('emits rolling then settled exactly once for a roll', async () => {
  const phases: string[] = []
  const world = createTestWorld({ onPhase: (phase) => phases.push(phase) })
  world.roll(rollDice('d20', 1, sequenceEntropy([19])))
  world.advance(5300)
  expect(phases).toEqual(['rolling', 'settled'])
})

it('removes the tower in direct mode', () => {
  const world = createTestWorld()
  world.setThrowMode('direct')
  expect(world.hasVisibleTower()).toBe(false)
})
```

- [ ] **Step 2: Run the lifecycle tests and verify RED**

Run: `npm test -- src/scene/DiceWorld.test.ts`

Expected: FAIL because `DiceWorld` does not exist.

- [ ] **Step 3: Implement the minimal world lifecycle**

Initialize WebGL2 explicitly, cap device pixel ratio at 1.75, use fixed-step Cannon updates, install tray floor/walls, spawn dice from direct or tower positions, map collision impulses, and dispose geometries/materials/listeners.

- [ ] **Step 4: Add hybrid final-face orientation and sleep**

Store the selected logical value on each die. At settle, slerp each mesh/body toward a precomputed orientation for that value over 180ms, zero velocities, set `CANNON.Body.SLEEPING`, then emit the result once.

- [ ] **Step 5: Verify GREEN and add the hook**

Run: `npm test -- src/scene/DiceWorld.test.ts`

Implement `useDiceRoller` to own phase, selected type, quantity, mode, selected skins, toggles, result, and session history while exposing a canvas mount ref.

- [ ] **Step 6: Run full tests and commit**

```bash
npm test
git add src/scene/DiceWorld.ts src/scene/DiceWorld.test.ts src/hooks
git commit -m "feat: integrate physical dice world"
```

### Task 6: Build the mobile UI and persistent controls with TDD

**Files:**
- Create: `src/Prototype.test.tsx`
- Modify: `src/Prototype.tsx`
- Modify: `src/prototype.css`
- Modify: `AGENTS.md`

**Interfaces:**
- Consumes: `useDiceRoller`, Product Design `BottomSheet`, `Carousel`, and the supplied local assets.
- Produces: one-screen app UI with working dice, quantity, mode, roll, skin, history, sound, and haptic controls.

- [ ] **Step 1: Write failing interaction tests**

```tsx
it('selects d100 and starts one percentile roll', async () => {
  render(<Prototype worldFactory={fakeWorldFactory} />)
  await user.click(screen.getByRole('button', { name: 'd100' }))
  await user.click(screen.getByRole('button', { name: /бросить/i }))
  expect(fakeWorld.roll).toHaveBeenCalledWith(expect.objectContaining({ type: 'd100' }))
})

it('changes tray skin without changing tower or background', async () => {
  render(<Prototype worldFactory={fakeWorldFactory} />)
  await user.click(screen.getByRole('button', { name: /скины/i }))
  await user.click(screen.getByRole('tab', { name: /лоток/i }))
  await user.click(screen.getByRole('button', { name: /чёрное золото/i }))
  expect(fakeWorld.setSkins).toHaveBeenLastCalledWith(
    expect.objectContaining({ background: 'ivy', tray: 'black-gold', tower: 'treewood' }),
  )
})
```

- [ ] **Step 2: Run the UI tests and verify RED**

Run: `npm test -- src/Prototype.test.tsx`

Expected: FAIL because the product UI is not implemented.

- [ ] **Step 3: Implement the screen composition**

Use a layered app shell: fixed top HUD, central canvas, compact fixed control dock, `BottomSheet` for skins, and `BottomSheet` for history. Use `Carousel` for die chips and skin previews. Keep app-owned controls clear of device status/navigation areas.

- [ ] **Step 4: Implement visible states and persistence**

Disable invalid controls during rolling, show result chips, persist skin ids and feedback toggles, keep session history newest-first, and expose an unsupported-WebGL2 panel.

- [ ] **Step 5: Match the approved art direction**

Use the ivy parchment asset as one background skin, black/gold tray tokens from the tray reference, wood/dark panels from the tower reference, and material-specific color/roughness/transmission from the dice board. Do not paste the tower/tray photographs into the live 3D scene.

- [ ] **Step 6: Verify GREEN and protect durable decisions**

Run: `npm test -- src/Prototype.test.tsx`

Append the four-reference mapping and tower/direct-mode decision to `AGENTS.md` under prototype-specific guidance.

- [ ] **Step 7: Run runtime check and commit**

```bash
npm run check:runtime
git add src/Prototype.tsx src/Prototype.test.tsx src/prototype.css AGENTS.md public/assets
git commit -m "feat: build mobile dice roller interface"
```

### Task 7: Browser verification, visual QA, and final packaging

**Files:**
- Create: `browser-qa.md`
- Create: `design-qa.md`
- Create: `artifacts/implementation-mobile-screen.png`
- Create: `artifacts/reference-comparison.png`
- Create: `README.md`

**Interfaces:**
- Consumes: the complete app, supplied reference images, Work Mode cloud browser, and build scripts.
- Produces: verified preview, QA evidence, production bundle, and a project archive.

- [ ] **Step 1: Run automated verification**

```bash
npm test
npm run check:runtime
npm run build
npm run test:sites
```

Expected: all commands exit 0; `dist/client/index.html`, `dist/server/index.js`, and `dist/.openai/hosting.json` exist.

- [ ] **Step 2: Start Work Mode preview**

Run: `sites-preview start "$PWD"`

Open the app in the cloud browser at the required Work Mode preview address and keep it open.

- [ ] **Step 3: Test primary interactions in the browser**

Verify every die chip, quantity bounds, direct and tower mode, roll-to-settled timing, d100 formatting, four independent skin categories, history clearing, sound/haptic toggles, portrait/landscape resilience, WebGL2 ready state, and zero console errors. Record results in `browser-qa.md`.

- [ ] **Step 4: Capture normalized mobile evidence**

Run `npm run check:runtime`, capture `[data-testid="device-screen"]` at its unscaled CSS size and deviceScaleFactor 1, and save it to `artifacts/implementation-mobile-screen.png`.

- [ ] **Step 5: Create one comparison image and run design QA**

Place the app capture beside the reference image(s) in `artifacts/reference-comparison.png`. Write `design-qa.md` with source paths, pixel dimensions, viewport, state, full-view evidence, focused-region evidence, interactions, console result, findings, iteration history, and `final result: passed|blocked`.

- [ ] **Step 6: Fix every P0/P1/P2 and repeat capture/comparison**

Re-run browser checks and update `design-qa.md` until no actionable P0/P1/P2 remains. P3 items may remain under follow-up polish.

- [ ] **Step 7: Add WebView handoff and create archive**

Document `npm run build` and the `dist/client` WebView asset path in `README.md`. Create `adel-dice-webgl.zip` excluding `.git`, `node_modules`, and transient preview files.

- [ ] **Step 8: Fresh final verification and commit**

```bash
npm test && npm run check:runtime && npm run build && npm run test:sites
git add README.md browser-qa.md design-qa.md artifacts
git commit -m "test: verify WebGL dice roller experience"
```
