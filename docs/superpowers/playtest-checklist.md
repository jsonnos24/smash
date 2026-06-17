# Smash Hit Web — Manual Playtest Checklist

Run `npm run dev` and open the printed URL.

## Cross-device controls (Global Constraint)
- [ ] Desktop: clicking aims and throws toward the cursor.
- [ ] Mobile (or devtools touch emulation): tapping throws toward the tap point.
- [ ] Both feel identical; no mode switch needed.

## Core loop
- [ ] Balls fly with a slight arc and shatter obstacles on contact.
- [ ] Smashing crystals visibly refills the reserve bar and bumps score.
- [ ] Streak multiplier climbs on chained hits and the HUD updates live.
- [ ] Shatter bursts appear and fade (cosmetic, no leftover debris).

## Modes (Spec §6)
- [ ] Normal: reserve can hit zero → "Run Over" results screen.
- [ ] Casual: reserve never drops below 1; run always reaches "Level Complete".
- [ ] Mode toggle on the main menu persists across reloads.

## Difficulty curve (Spec §5)
- [ ] Level 1 feels gentle; each subsequent level feels only slightly harder.
- [ ] No sudden spikes between levels.

## Robustness (Spec §7)
- [ ] Backgrounding the tab pauses the game.
- [ ] Reloading keeps unlocked levels and best scores.
- [ ] Muting persists; audio starts only after the first tap/click.
- [ ] On a throttled CPU (devtools 6× slowdown) the game stays responsive.

## Tuning notes
- Record any level that feels too hard/easy; adjust `LEVELS` constants or room
  difficulty ratings, re-run `npm test` (curve invariants must still pass), and re-playtest.
