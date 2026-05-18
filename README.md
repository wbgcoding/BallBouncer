# 🎱 Ball Bouncer

**Interactive physics playground** — launch balls inside spinning geometric shapes and watch the chaos unfold. Tune gravity, spin, sound, and visual effects in real time.

🔗 **[Live Demo](https://ballbouncer.vercel.app)**

---

## Screenshots

| Themes | Cross Hole | Sparks |
|--------|-----------|--------|
| ![Themes](docs/screenshot-themes.jpg) | ![Cross hole](docs/screenshot-hole.jpg) | ![Sparks](docs/screenshot-balls.jpg) |

---

## Features

### ⚙️ Physics
- **32 outer shapes** — triangles, hexagons, stars, and hand-crafted characters (Ghost, Cat, Pac-Man, Heart, Crown, Skull, Fish, Rocket, Bat, Bell, Cloud, Flame, and more)
- **24 inner cross shapes** — plus, fat-plus, X, Y, 3–12 arm variants, Snowflake, Pinwheel, StarCross, Triquetra, and more
- **Gravity direction** — rotate the gravity vector to any angle (0° = down, 90° = sideways, 180° = inverted)
- **Cross hole** — configurable gap lets balls pass through; cycles between arms automatically or manually
- **Collision sparks** — particle burst on every hard bounce
- **Comet trails** — Bézier trails with glow
- **0–200 balls** — from empty to wall-to-wall chaos

### 🎨 Visuals
- **14 ball color themes** including Fire, Galaxy, Rainbow, Gradient
- **14 UI color themes** — Blood, Lava, Ember, Gold, SciFi, Inferno, Vibrant, Aurora, Galaxy, Neon, Plasma…
- **14 background fog modes** — static tints, cycling rainbow, fast fireworks
- **Animation speed** — controls background fog color-cycling speed (Rainbow / Firework modes)
- **3D portal dots** — shiny sphere markers at cross-hole endpoints
- **Animated rainbow logo** with 3D-sphere ball icon and arm-cycling canvas label
- **HiDPI-aware canvas** — sharp on Retina/4K displays

### 🔊 Audio
- **Spatial bounce sounds** — pitch-shifted, reverb-wet, stereo-panned on ball–wall impact
- **Generative background music** — melody, bass, kick, hi-hat via Web Audio API
- **Rainbow sound icons** — animated 3D sphere for ball-sound, rainbow gradient music note

### 🖥️ UI & Accessibility
- **8 languages** — English, Deutsch, Español, Français, Italiano, Português, 日本語, 中文 (auto-detected)
- **Everything Is Crazy Random** — one button randomizes all shapes, themes, physics and directions; cycle mode auto-repeats every 5 s or 10 s with a countdown bar
- **Party effect on cycle** — the timer bar and interval buttons pulse with rainbow animation when the cycle is active
- **Pause freezes everything** — Pause button halts the simulation AND all auto-cycle timers simultaneously
- **Cross Hole controls dim** when the feature is off, making panel state at-a-glance readable
- **Random theme cycling** — auto-rotates all three theme layers; fires immediately on enable
- **Direction toggles** — reverse outer shape or cross rotation independently
- **Fully responsive** — scales to any window size

---

## 🕹️ How to Play

1. Open the page — balls spawn inside a spinning polygon with an inner cross
2. Adjust **Shape** and **Cross** sliders for size and rotation speed
3. Enable **Cross Hole** to let balls escape through a gap; use the **↺ Cycle** button to manually rotate the gap
4. Drag **G-Angle** to rotate gravity (try 180° for inverted gravity!)
5. Tweak **Ball Colors**, **Theme**, and **Background** to your taste
6. Enable **Random Theme / Random Bg** for an auto-cycling light show

---

## Controls

| Panel section | What it does |
|---|---|
| Sound | Toggle music / ball sounds; set volumes; game speed |
| Everything Random | One-shot randomize all shapes, themes and physics |
| ↺ (cycle button) | Auto-randomize every 5 s or 10 s; shows countdown bar; text changes to "EVERYTHING IS CRAZY RANDOM" |
| 5s / 10s presets | Switch auto-randomize interval; selected preset highlighted with party pulse |
| Shape | Pick outer shape; set size and rotation speed |
| Cross | Pick inner cross; set size and rotation speed |
| L / R buttons | Reverse outer shape or cross spin direction |
| Animation Speed | Speed of background fog color cycling (Rainbow / Firework modes) |
| Cross Hole | Toggle gap; set size; manually cycle or auto-cycle between arms |
| Ball Colors | 14 color palettes for the balls |
| Balls / Size / Speed | Core ball physics (0–200 balls, size 1–10) |
| Gravity / G-Angle | Gravity strength and direction |
| Fog | Comet trail length |
| Background | Fog overlay style |
| Theme | Interface color theme |
| Language | UI language (8 supported) |

---

## 🛠️ Tech Stack

- **Vanilla JS + HTML5 Canvas 2D** — zero dependencies, single HTML file
- **Web Audio API** — generative music and spatial sound
- **CSS custom properties** — theme switching and animation speed control
- **OffscreenCanvas / requestAnimationFrame** — 60 fps simulation
- **Vercel** — static hosting with edge caching
