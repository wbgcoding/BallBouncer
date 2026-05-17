# Ball Bouncer

**Interactive physics playground** — launch balls inside spinning geometric shapes and watch the chaos unfold. Tune gravity, spin, sound, and visual effects in real time.

🔗 **[Live Demo](https://ballbouncer.vercel.app)**

---

## Screenshots

| Themes | Cross Hole | Sparks |
|--------|-----------|--------|
| ![Themes](docs/screenshot-themes.png) | ![Cross hole](docs/screenshot-hole.png) | ![Sparks](docs/screenshot-balls.png) |

---

## Features

### Physics
- **32 outer shapes** — triangles, hexagons, stars, and hand-crafted characters (Ghost, Cat, Pac-Man, Heart, Crown, Skull, Fish, Rocket, Bat, Bell, Cloud, Flame, and more)
- **24 inner cross shapes** — plus, fat-plus, X, Y, 3–12 arm variants, Snowflake, Pinwheel, StarCross, Triquetra, and more
- **Gravity direction** — rotate the gravity vector to any angle (0° = down, 90° = sideways, 180° = inverted)
- **Cross hole** — configurable gap lets balls pass through; cycles between arms automatically or manually
- **Collision sparks** — particle burst on every hard bounce
- **Comet trails** — Bézier trails with glow

### Visuals
- **14 ball color themes** including Fire, Galaxy, Rainbow, Gradient
- **14 UI color themes** — Blood, Lava, Ember, Gold, SciFi, Inferno, Vibrant, Aurora, Galaxy, Neon, Plasma…
- **14 background fog modes** — static tints, cycling rainbow, fast fireworks
- **Animation speed** — global playback multiplier for all CSS animations
- **3D portal dots** — shiny sphere markers at cross-hole endpoints
- **Animated rainbow logo** with 3D-sphere ball icon and arm-cycling canvas label
- **HiDPI-aware canvas** — sharp on Retina/4K displays

### Audio
- **Spatial bounce sounds** — pitch-shifted, reverb-wet, stereo-panned on ball–wall impact
- **Generative background music** — melody, bass, kick, hi-hat via Web Audio API

### UI & Accessibility
- **8 languages** — English, Deutsch, Español, Français, Italiano, Português, 日本語, 中文 (auto-detected)
- **Random theme cycling** — auto-rotates all three theme layers; fires immediately on enable
- **Direction toggles** — reverse outer shape or cross rotation independently
- **Fully responsive** — scales to any window size

---

## How to Play

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
| Shape | Pick outer shape; set size and rotation speed |
| Cross | Pick inner cross; set size and rotation speed |
| L / R buttons | Reverse outer shape or cross spin direction |
| Animation Speed | Global speed for all CSS animations |
| Cross Hole | Toggle gap; set size; manually cycle or auto-cycle between arms |
| Ball Colors | 14 color palettes for the balls |
| Balls / Size / Speed | Core ball physics |
| Gravity / G-Angle | Gravity strength and direction |
| Fog | Comet trail length |
| Background | Fog overlay style |
| Theme | Interface color theme |
| Language | UI language (8 supported) |
| Sound / Music | Toggle bounce sounds and background music |

---

## Tech Stack

- **Vanilla JS + HTML5 Canvas 2D** — zero dependencies, single HTML file
- **Web Audio API** — generative music and spatial sound
- **CSS custom properties** — theme switching and animation speed control
- **OffscreenCanvas / requestAnimationFrame** — 60 fps simulation
- **Vercel** — static hosting with edge caching

---

## Self-hosting / Development

Just open `ballbouncer.html` in any modern browser — no build step needed.

For local dev server (HMR not required):
```
node -e "require('http').createServer((q,r)=>{const fs=require('fs'),p=require('path');let f=p.join(__dirname,q.url==='/'?'ballbouncer.html':q.url);fs.readFile(f,(e,d)=>{r.writeHead(e?404:200);r.end(d||'')});}).listen(3333)"
```
Then open `http://localhost:3333`.

### AdSense Integration

Uncomment the `<ins class="adsbygoogle">` block in `ballbouncer.html` and replace `ca-pub-XXXX` / slot ID with your credentials.

---

## License

MIT © bgcoding
