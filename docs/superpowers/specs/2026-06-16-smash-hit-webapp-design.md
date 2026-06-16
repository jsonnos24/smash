# Smash Hit Web App — Design Spec

**Date:** 2026-06-16
**Status:** Approved design, ready for implementation planning
**Scope:** v1 / Lean MVP

## 1. Overview

A browser-based game inspired by the iOS game *Smash Hit*: a first-person, on-rails experience where the player glides forward through a surreal world and throws metal balls to shatter glass obstacles. The player has a limited ball reserve — hitting obstacles drains it, smashing crystals refills it, and (in Normal mode) running out ends the run.

The game runs as a single-page web app that works on both desktop (mouse) and mobile (touch) with an identical control model. No backend; all data is local to the browser.

### Goals
- Capture the core thrill of *Smash Hit* — forward momentum, precise aiming, satisfying glass shatter, and ammo-as-life resource tension.
- Ship a polished, genuinely fun core loop with a small amount of content.
- Provide a difficulty curve that increases **very steadily** across levels, with no spikes.
- Offer a **Casual mode** where the run can never end.

### Non-goals (v1)
- No online accounts, leaderboards, or backend.
- No true rigid-body fracture physics (shatter is cosmetic).
- No music-reactive/rhythmic level generation (noted as a future enhancement).
- No endless "Journey" mode (noted as a future enhancement).

### Legal note
All audio and visual assets will be original or royalty-free. The game does **not** use *Smash Hit*'s copyrighted soundtrack, art, or assets. It is an original work inspired by the genre.

## 2. Key Decisions (locked)

| Topic | Decision |
|---|---|
| Visual fidelity | **Stylized 3D** — real 3D + forward-on-rails motion; simplified, cosmetic glass shatter (particle/chunk burst, not true fracture). |
| Controls | **Tap/click to throw** at the cursor/touch point. Identical on desktop and mobile. Auto-forward motion. |
| Level construction | **Hybrid** — hand-authored room templates (each with a difficulty rating + theme tag), stitched procedurally to match a target difficulty. |
| Themed rooms | Room templates carry a theme tag; variety emerges as rooms are stitched. |
| Ball economy | **Faithful** — obstacle hits spend balls; crystals refill + score. |
| Modes | **Normal** (zero balls ends the run) + **Casual** (balls clamp ≥1, crystals more generous, run never ends). |
| Progression | **Discrete numbered levels** (6 in v1). Journey/endless mode is a future addition. |
| Audio | **Music + SFX**, original/royalty-free. Level generation independent of music in v1. |
| v1 content | **Lean MVP** — ~6 levels, 2–3 room themes, Normal + Casual, local save (no accounts). |
| Tech stack | **Three.js renderer + lightweight custom arcade physics** (raycast hit detection, ballistic balls, cosmetic shatter). TypeScript + Vite. |
| Default world theme | **Crystal Cavern** — deep teal / mint / amber gemstone glass, warm and organic. |
| HUD | **Informative** — ball reserve bar, live score + streak multiplier, mode badge, room/distance readout. |

## 3. Architecture

A single-page web app, no backend. Plain TypeScript + Three.js, bundled with Vite. Split into small, single-purpose modules. The dependency direction is **one-way**: UI and rendering read game state; game logic never imports rendering. This keeps the gameplay core (economy, generation, scoring) pure and testable without a browser.

### Module breakdown

**Rendering & engine**
- `renderer/` — Three.js scene, camera, lighting, and Crystal Cavern material/theme definitions. Visual layer only.
- `engine/loop.ts` — fixed-timestep game loop (update → render), pause/resume, delta-time handling with clamping.
- `engine/physics.ts` — custom arcade physics: ballistic ball motion, raycast hit detection against obstacle/crystal colliders, and spawning cosmetic shatter bursts. No persistent rigid bodies.

**Gameplay (pure, headless-testable)**
- `game/state.ts` — authoritative run state (ball count, score, streak multiplier, distance, current room, mode). Pure data + reducers; single source of truth.
- `game/economy.ts` — ball economy rules (collision cost, crystal refill, Normal-vs-Casual differences). Pure functions.
- `game/input.ts` — normalizes mouse-click and touch-tap into a single "throw at screen point" event, identical across platforms.
- `game/throw.ts` — converts a screen point into a ball trajectory in world space.

**Content**
- `content/rooms/` — hand-authored room templates (geometry + obstacle/crystal placements + difficulty rating + theme tag), each as data.
- `content/levels.ts` — the 6 level definitions: target difficulty band + length.
- `generator/levelBuilder.ts` — stitches rooms into a level matching the target difficulty (the hybrid system).

**Shell & UI**
- `ui/` — HUD (reserve bar, score, streak, mode badge, room/distance), menus, mode toggle, pause, results screen. DOM/CSS overlay on top of the canvas.
- `persistence/save.ts` — local high scores / progress / settings via `localStorage`, with shape validation.
- `audio/` — music-per-theme + SFX, master/mute control, lazy loading, autoplay gating.

## 4. Game Loop & Data Flow

`engine/loop.ts` runs a fixed timestep (~60Hz) with delta clamping so slow devices stay deterministic.

Each frame:
1. **Advance the world** — the level scrolls toward the player at the current speed; rooms ahead spawn, passed rooms despawn. Object pooling avoids mid-run allocation.
2. **Process input** — any tap/click queued this frame becomes a throw. `throw.ts` turns the screen point into a ballistic ball; `physics.ts` advances live balls and raycasts them against colliders.
3. **Resolve hits** — on a hit, `economy.ts` applies the rule (obstacle → spend balls + cosmetic shatter burst; crystal → refill + score + streak bump). Results write to `state.ts`.
4. **Check end conditions** — Normal: balls = 0 → run ends, results screen. Casual: clamp balls ≥ 1, never ends. Reaching the level's end distance → level complete.
5. **Render** — `renderer/` draws the scene from current state; `ui/` updates the HUD from the same state.

### Data flow (one-directional)

```
input → throw → physics(raycast) → economy → state
                                               │
                              ┌────────────────┴───────────────┐
                          renderer (scene)              ui (HUD/menus)
```

State is the single source of truth. Renderer and UI are pure consumers; they never mutate state. This enables headless testing of the full gameplay core.

### Throw model
The tap point is unprojected into world space to get a direction. The ball travels ballistically with slight gravity for a satisfying arc. A raycast each step against pooled colliders detects hits. After a hit, the shatter is cosmetic only — a capped, short-lived particle burst, then removed.

## 5. Level Generation & Difficulty Curve

This is the core of the "steadily increasing difficulty" requirement.

### Difficulty as a number
Each room template carries a `difficulty` rating (1–10) derived from measurable factors:
- **Obstacle density** — glass blocking the path per meter.
- **Forced-throw count** — obstacles that must be broken to pass (vs. dodgeable scenery).
- **Crystal generosity** — how freely the room refills balls (higher = easier).
- **Speed** — how fast the segment scrolls.
- **Pattern complexity** — moving panes, narrow gaps, multi-hit obstacles.

### The level builder (`generator/levelBuilder.ts`)
Each of the 6 levels has a target difficulty **band** and a length. The builder selects rooms whose ratings fall within the band and stitches them into a level, easing from the band's low end to its high end. Difficulty therefore rises both **within** a level and **across** levels — two nested, gentle ramps.

### "Very steady" guarantee
Bands **overlap deliberately**: each level starts no harder than the previous level ended. Global speed and ball-cost scale on a shallow, roughly linear curve — no spikes.

| Level | Difficulty band | Start balls | Speed | Crystal generosity |
|---|---|---|---|---|
| 1 | 1.0 – 2.0 | 25 | 1.00× | very high |
| 2 | 1.8 – 3.0 | 25 | 1.06× | high |
| 3 | 2.8 – 4.2 | 22 | 1.12× | high |
| 4 | 4.0 – 5.5 | 22 | 1.20× | medium |
| 5 | 5.2 – 7.0 | 20 | 1.28× | medium |
| 6 | 6.8 – 8.5 | 20 | 1.38× | lean |

Casual mode uses the same tables but clamps balls ≥ 1 and bumps crystal generosity one tier, so the curve is *felt* without failure.

These values are the starting point for tuning; the unit tests assert the structural invariants (band containment, in-level low→high ramp, cross-level overlap) rather than exact constants.

## 6. Modes & Economy Detail

A single mode toggle on the main menu and pause screen, persisted to `localStorage`. It changes only `economy.ts` parameters — never level layout — so a level plays identically in both modes except for failure handling.

**Normal**
- Start with the level's ball count.
- Obstacle hits spend balls (cost scales gently per the difficulty table).
- Crystals refill balls + add score + raise the streak multiplier.
- Balls reach 0 → run ends → results screen (score, distance, Retry).

**Casual**
- Same economy and feedback.
- Balls clamp to a minimum of 1; crystal generosity bumps one tier.
- The run never ends; the player always reaches the level's end.

**Scoring**
- Points from crystals smashed and obstacles cleared, multiplied by a streak multiplier.
- Streak climbs as hits chain without a miss; a miss resets it in Normal and softens it (rather than zeroing) in Casual.
- Final score + balls-saved drives the results screen; stored as a local per-level best.

**Feedback**
- The HUD `×N streak` indicator and reserve bar animate on each event.
- Shatter bursts and a crystal chime provide the satisfying punch.

## 7. Error Handling, Performance & Testing

### Error handling & resilience
- **No WebGL / context lost** — detect on boot, show a friendly fallback; attempt context-restore on loss rather than crashing.
- **Performance auto-scaling** — sample frame time at startup and adapt quality (particle counts, shadow/post-FX, draw distance) to keep mobile smooth; a manual quality setting overrides it.
- **Audio gating** — music starts on first user interaction (tap-to-start); muted state and volume persist.
- **Corrupt/missing save** — `persistence/save.ts` validates stored shape and falls back to defaults.
- **Pause on blur / visibility change** — tabbing away or backgrounding on mobile pauses the loop cleanly.

### Performance budget
- Object pooling for rooms, obstacles, balls, and shard particles — no mid-run allocation.
- Cosmetic-only shatter (capped, short-lived particles) keeps GC quiet.
- Target 60fps desktop; smooth 30–60fps mobile.

### Testing strategy
- **Unit tests (headless, no browser)** for the pure core:
  - `economy.ts` — Normal vs Casual rules, costs, refills, the ≥1 clamp.
  - Scoring & streak behavior.
  - `levelBuilder` — assert each generated level stays within its band, ramps low→high, and that bands overlap across levels. This is where the "very steady curve" requirement is *proven*.
- **Integration tests** for `input → throw → physics → economy → state` on scripted scenarios.
- **Manual playtest checklist** per level/mode for feel.

## 8. Future Enhancements (out of scope for v1)
- Journey / endless mode with checkpoints and a high-score chase.
- Music-reactive level generation (obstacles spawn in time with the soundtrack).
- Online leaderboards / accounts (backend).
- Additional levels and room themes (mostly content work).
- Optional true rigid-body shatter on high-end devices.
