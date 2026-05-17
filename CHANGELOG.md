# Changelog

All notable changes to Ball Bouncer are documented here.

---

## [1.4.0] - 2026-05-17

### New Features
- **Gravity direction** — G-Angle slider (0–359°) rotates the gravity vector; 0° = down, 90° = right, 180° = inverted gravity
- **Collision sparks** — particle burst emitted at the wall contact point on every hard bounce; sparks obey current gravity direction
- **Ad space rework** — left column is now a full-height fixed glassmorphism overlay floating in the game foreground; backdrop blur + neon accent border

### Improvements
- Canvas extends under the ad overlay for more game area; simulation center uses full screen width
- Ad column breakpoint lowered to 800px for better mid-size screen coverage

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
