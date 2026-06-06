# Changelog

All notable changes to BallBouncer are documented here.

---

## [1.9.0] - 2026-06-06

### Improvements
- **Smoother trails** — trail rendering no longer copies data every frame, keeping the framerate stable even with hundreds of balls and long trails
- **Leaner auto-cycle engine** — the four auto-cycle features (themes, background, shapes, cross) now share one timer system, making toggling them snappier and more reliable
- **Mobile settings button translated** — the settings tooltip on phones now follows your language like everything else

### Fixes
- **Italian translation** — the "Storm" theme showed its German name in Italian; it now correctly reads "Tempesta"
- **Internal cleanup** — removed duplicate startup code and a duplicated style rule; no visible change, just a tidier engine

---

## [1.8.2] - 2026-05-30

### Features
- **Animated rainbow ball icon** — the sound icon is now a small animated 3D rainbow sphere matching the logo
- **Language selector with 43 translated strings** — tooltips and labels fully localized in all 8 languages

### Improvements
- **Mobile UI overhaul** — settings panel scrolling fixed, theme grids show all rows, logo moved to the top edge, bottom row no longer hidden behind the browser navigation bar
- **Escape-proof physics** — balls can no longer tunnel through walls at high speed; the shape gently rescales and snaps them back inside
- **Fog effect optimized** — capped to 8 layered objects to prevent lag on slower devices

### Fixes
- Corrected shape size calculation and an HTML nesting issue; removed dead CSS and 11 unused files

---

## [1.7.0] - 2026-05-29

### Performance & Core
- **Engine Overhaul** — Switched to high-performance for-loops and vertex object pooling across the entire physics and render pipeline. Frame rates are now rock-solid at 60 FPS, even on mobile.
- **Shadow-free Rendering** — Replaced expensive canvas shadows with optimized HSL layers and opacity gradients. The aesthetic remains identical, but the CPU/GPU load is drastically reduced.
- **Smart Scaling** — Physics boundaries and cross-size limits now calculate dynamically. The inner cross is guaranteed to stay within the outer shape, regardless of complexity.

### Features
- **Enhanced Random Mode** — The "Everything Random" action now includes the Cross Hole feature, randomizing its state, size, and movement intervals for ultimate variety.
- **Attention Cues** — The auto-cycle button now subtly flashes in RGB when inactive, guiding new users to the most fun feature without being intrusive.
- **UI Refinements** — Polished mobile scaling with a new sliding settings menu, blur-backdrop, and touch-optimized controls.

### Improvements
- **Project Structure** — Organized files into a clean `css/` and `js/` hierarchy.
- **Persistent Logic** — Fog and trail settings are now strictly user-controlled and won't be overridden by random actions.
- **Ball Limit** — Maximum ball count capped at 500 for stability, with random actions targeting a safe 60% load (300 balls).

---

## [1.6.0] - 2026-05-18

### New Features
- **Party effect on cycle buttons** — the "5s" and "10s" interval buttons and the timer bar now pulse with the same rainbow party animation as the "Everything Random" button when the cycle is active
- **Ball count expanded** — ball count range extended from 0–100 to 0–200 for denser simulations
- **Cross size extended** — inner cross maximum size increased by 50% for more extreme shapes

### Improvements
- **Sound icon overhaul** — music note icon now has a vivid rainbow gradient (matching the logo ball) with no outer border ring; ball-sound button replaced with an animated 3D rainbow sphere matching the top-bar ball icon exactly
- **Ball size range refined** — minimum ball size lowered to 1, default set to 5; physical radius is scaled up 20% beyond the slider value for a more satisfying feel at all sizes
- **Random Theme / Random Bg default off** — both auto-cycle toggles now start disabled so the initial look is stable; startup and Reset still randomize from the softer row-1 UI themes
- **Gravity default lowered to 3** — gentler starting gravity makes the initial experience more floaty
- **Animation Speed control compact** — the AnimSpeed slider row is visually smaller to reduce panel clutter

---

## [1.5.0] - 2026-05-17

### New Features
- **Everything Cycle progress bar** — reverse countdown bar under the "Everything Random" button shows time remaining until next randomization
- **5 s / 10 s interval presets** — two small buttons below the cycle button let you switch the auto-randomize interval; selected preset is highlighted
- **"EVERYTHING IS CRAZY RANDOM" mode** — button text changes while the cycle is active to make it unmistakably clear
- **Cycle activates theme loops** — enabling the cycle button now also enables "Random Theme" and "Random Bg" toggles for smooth continuous variety; disabling the cycle reverts both

### Improvements
- **Panel layout rework** — Sound (Ton) section moved above Everything Random for a more logical flow
- **Pause halts all cycles** — pressing Pause now freezes every auto-cycle (shapes, cross, themes, background, everything-random) and pauses the countdown bar; Resume restarts them all
- **Cross Hole controls dim when disabled** — hole size and cycle sliders become visually greyed out when Cross Hole is toggled off, making the panel state immediately readable
- **Floating logo scales with cross size** — canvas "BallBouncer" label now stays proportionally near the cross arm tip regardless of cross size (small or large)
- **SEO overhaul** — full Open Graph, Twitter card, JSON-LD structured data, canonical URL, and robots meta; `vercel.json` updated with security headers and proper rewrites

---

## [1.4.0] - 2026-05-17

### New Features
- **Gravity direction** — G-Angle slider (0–359°) rotates the gravity vector; 0° = down, 90° = right, 180° = inverted gravity
- **Collision sparks** — particle burst emitted at the wall contact point on every hard bounce; sparks obey current gravity direction
- **Ad space rework** — left column is now a full-height fixed glassmorphism overlay floating in the game foreground; backdrop blur + neon accent border

### Improvements
- Canvas extends under the ad overlay for more game area; simulation center uses full screen width

---

## [1.3.0] - 2026-05-17

### New Features
- **i18n** — 8 languages: EN, DE, ES, FR, IT, PT, JA, ZH; auto-detected from browser; persisted to localStorage
- **Animation Speed slider** — replaces Fade slider; controls all CSS animation durations globally (logo, title sweep, cross-ball rainbow)
- **Manual Cycle button** — advances the cross-hole gap to the next arm on click
- **6 new cross shapes** (row 4) — Thin Y, Needle+, Wide 5, Fat 6, 9-Cross, Triquetra
- **HiDPI canvas** — buffer scaled by devicePixelRatio (capped at 2×) for sharp rendering on Retina/4K displays

### Improvements
- Random Bg and Random Theme toggles now apply one immediate change on enable before the 20–40 s timer
- Cross hole "Hole Cycle" renamed to "Cycle"; label row split into two for clarity
- Dynamic hole slider max: recomputed as `⌊(n−2)/2⌋` whenever cross shape or size changes
- Per-frame cache for `getCustomArmTips` avoids redundant computation
- Off-screen balls skipped in the render loop

---

## [1.2.0] - 2026-05-16

### New Features
- UI rework with improved dark-neon panel styling
- 32 outer shapes (up from 16)
- Color deduplication across themes
- Favicon with canvas-rendered miniature
- Random theme cycling — auto-rotates all three theme layers
- Random background cycling
- Ball color theme picker (14 palettes including Galaxy, Fire, Rainbow, Gradient, Pearl)
- L/R direction toggles for outer shape and cross
- Cross hole size and cycle sliders
- Logo arm cycling — canvas label orbits a random arm
- 3D portal dots on cross-hole endpoints

### Themes row 2 reworked
- SciFi, Inferno, Vibrant, Aurora, Galaxy, Neon, Plasma

---

## [1.1.0] - 2026-05-15

- Cross hole feature — configurable gap in the inner cross that balls can pass through
- Cross hole cycles through arms automatically over time

---

## [1.0.0] - 2026-05-14

- Initial release — balls bouncing inside a spinning geometric shape with an inner cross
- Gravity, speed, size sliders; spatial audio; Web Audio background music
