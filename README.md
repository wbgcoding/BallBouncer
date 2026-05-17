# Ball Bouncer

A canvas-based physics playground — launch balls inside spinning geometric shapes and watch the chaos unfold.

## Screenshots

![Theme showcase](docs/screenshot-themes.png)
![Cross hole](docs/screenshot-hole.png)
![Ball colors](docs/screenshot-balls.png)

## Features

- 32 outer geometric shapes — polygons (triangle → 16-gon), stars, and hand-crafted characters (Ghost, Cat, Pac-Man, Heart, Crown, Skull, Fish, Rocket, Bat, Bell, Cloud, Flame, and more)
- 18+ inner cross shapes — plus, X, Y, 5–12 arm crosses, Snowflake, Pinwheel, Star-Cross
- Cross hole — a gap in the cross that lets balls escape, with configurable size and arm-cycling
- 14 ball color themes including SciFi, Inferno, Vibrant, and Aurora
- 14 UI color themes
- 14 background fog modes — static tints, cycling rainbow, fast fireworks
- Rainbow logo animations with arm cycling
- 3D portal dots on cross vertices
- Spatial audio — pitch-shifted bounce sounds with reverb and stereo panning
- Background music via Web Audio API
- i18n support across 8 languages
- Direction toggles (L/R) for outer shape and cross rotation
- Animation speed control (global playback multiplier)
- Dynamic hole size and cycle-rate sliders
- Random theme cycling — auto-rotates shapes, colors, and backgrounds
- Comet trails with bezier curves and glow
- Responsive — fills any window size

## How to Play

Open the page and balls spawn inside a spinning shape. They obey gravity and collide with the outer walls and the inner cross. Use the control panel to customize shapes, colors, speed, and sound. Enable the cross hole to let balls pass through a gap in the cross.

## Controls

| Panel section | Description |
|---|---|
| Shape | Pick outer shape, set size and rotation speed |
| Cross | Pick inner cross shape, set size and rotation speed |
| Rotation direction | L/R toggles for outer shape and cross |
| Animation speed | Global playback speed multiplier |
| Cross hole | Enable gap in cross; set size and arm-cycle rate |
| Ball theme | 14 color palettes for the balls |
| UI theme | 14 color themes for the interface |
| Background | 14 fog/background styles |
| Balls / Size / Speed / Gravity | Core physics sliders |
| Random size | Variance in ball radius |
| Fog | Comet trail length |
| Sound / Music | Toggle bounce sounds and background music |
| Language | Switch between 8 supported languages |
| Random themes | Auto-cycle themes, shapes, and backgrounds |

## Tech Stack

- Single HTML file (`ballbouncer.html`) — no build step, no dependencies
- Vanilla JavaScript
- HTML5 Canvas 2D API
- Web Audio API
- Deployed on Vercel

## Live Demo

[https://ballbouncer.vercel.app](https://ballbouncer.vercel.app)

## License

MIT
