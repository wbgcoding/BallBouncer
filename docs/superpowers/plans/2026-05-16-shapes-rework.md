# Shapes Rework Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expand BallBouncer's outer shapes from 16→24 and inner cross shapes from 12→18, fix broken custom-shape button icons, and shrink button height so the new 3rd row fits without panel scrolling.

**Architecture:** All changes live in the single file `C:\Claude\ballbouncer\ballbouncer.html`. Shape definitions are static JS arrays (`SHAPES`, `CROSS_SHAPES`). Computed shapes (Gear, Crescent, Snowflake, Pinwheel, Star-Cross) are generated once at module init by helper functions and stored as `pts` arrays. The icon renderer, physics verts function, and drawing function each need a `custom:true` branch added or fixed.

**Tech Stack:** Vanilla JS, HTML5 Canvas 2D, SVG (for panel button icons), no build step — edit the HTML file directly, verify in browser at `http://localhost:3333`.

**Spec:** `docs/superpowers/specs/2026-05-16-shapes-rework-design.md`

---

## File Map

| File | Changes |
|------|---------|
| `ballbouncer.html` (CSS ~line 185) | Shrink `.shape-btn` to `height:22px` |
| `ballbouncer.html` (JS ~line 530) | Replace `SHAPES` array (16→24 entries) |
| `ballbouncer.html` (JS ~line 574) | Replace `CROSS_SHAPES` array (12→18 entries) |
| `ballbouncer.html` (JS ~line 867) | Fix `iconCrossPoints` signature to accept shape object |
| `ballbouncer.html` (JS ~line 880) | Fix `iconPoints` dead code + operator precedence bug |
| `ballbouncer.html` (JS ~line 1122) | Fix `innerShapeVerts` to handle `custom:true` crosses |

---

## Task 1: Fix `iconPoints()` — kill dead code + fix operator precedence

**File:** `ballbouncer.html` (~line 880)

**The bug:** The first `if (shape.custom)` branch has wrong operator precedence:
```
(ox + nx * ca - ny * sa).toFixed(2) * R
```
This computes `(ox + translated_x)`, calls `.toFixed(2)` → string, then `* R` → number. For `Ghost` top point `[0, -1]` with `ox=16, R=13`: result is `(16 + 0).toFixed(2) * 13 = "16.00" * 13 = 208` — way outside the 32×32 viewBox, so the polygon is invisible. The second `if (shape.custom)` block below it is dead code (never reached) with the correct formula.

- [ ] **Step 1: Open the file and find `iconPoints`**

  In `ballbouncer.html`, find `function iconPoints` (~line 880). Read it fully — you'll see:
  ```javascript
  function iconPoints(shape, R, ox, oy) {
      if (shape.custom) {
          const ca = Math.cos(shape.sa || 0), sa = Math.sin(shape.sa || 0);
          return shape.pts.map(([nx, ny]) =>
              `${(ox + nx * ca - ny * sa).toFixed(2) * R},${(oy + nx * sa + ny * ca).toFixed(2) * R}`
          ).join(' ');
      }
      // fix: apply R to the custom transform properly   ← comment on dead code
      if (shape.custom) {   ← DEAD CODE
          ...
      }
      const { sides, star, ir = 0.4, sa } = shape;
      ...
  }
  ```

- [ ] **Step 2: Replace the entire `function iconPoints` block with the corrected version**

  Replace everything from `function iconPoints(` to the closing `}` of the function with:
  ```javascript
  function iconPoints(shape, R, ox, oy) {
      if (shape.custom) {
          const ca = Math.cos(shape.sa || 0), sinA = Math.sin(shape.sa || 0);
          return shape.pts.map(([nx, ny]) => {
              const rx = (nx * ca - ny * sinA) * R * 0.85;
              const ry = (nx * sinA + ny * ca) * R * 0.85;
              return `${(ox + rx).toFixed(2)},${(oy + ry).toFixed(2)}`;
          }).join(' ');
      }
      const { sides, star, ir = 0.4, sa } = shape;
      if (star) {
          return Array.from({ length: sides * 2 }, (_, i) => {
              const r = i % 2 === 0 ? R : R * ir;
              const a = sa + i * Math.PI / sides;
              return `${(ox + r * Math.cos(a)).toFixed(2)},${(oy + r * Math.sin(a)).toFixed(2)}`;
          }).join(' ');
      }
      const n = sides === 0 ? 48 : sides;
      return Array.from({ length: n }, (_, i) => {
          const a = sa + i * 2 * Math.PI / n;
          return `${(ox + R * Math.cos(a)).toFixed(2)},${(oy + R * Math.sin(a)).toFixed(2)}`;
      }).join(' ');
  }
  ```

- [ ] **Step 3: Verify in browser console**

  Open `http://localhost:3333`, open DevTools console, run:
  ```javascript
  // Ghost is shape index 11 in the current SHAPES array
  const ghost = SHAPES[11];
  console.log('Ghost custom:', ghost.custom);  // should be true
  console.log('Ghost icon pts:', iconPoints(ghost, 13, 16, 16));
  // Expected: a string of 14 comma-separated coordinate pairs, all values roughly in 4..28 range
  // Bad output: values like 200, 208 mean bug still present
  ```

- [ ] **Step 4: Verify all 5 custom shape buttons show visible icons**

  Reload the page. The shape grid second row should now show Ghost, Cat, Pac-Man, Heart, Crown with visible outlines instead of blank squares.

- [ ] **Step 5: Commit**
  ```
  git add ballbouncer.html
  git commit -m "fix: iconPoints custom shape operator precedence — restore visible button icons"
  ```

---

## Task 2: Shrink shape button CSS to fit 3rd row without scrolling

**File:** `ballbouncer.html` (~line 185–205)

**Why:** Adding a 3rd row to the cross grid (currently 6-col, buttons ~31px square via `aspect-ratio:1`) adds ~34px of height. An explicit `height:22px` makes both grids uniform height and recovers the scroll budget.

- [ ] **Step 1: Find and update `.shape-btn` CSS**

  Find the `.shape-btn` rule (currently uses `aspect-ratio:1` with no explicit height). Change it to:
  ```css
  .shape-btn {
      height: 22px;
      background:#0b1222; border:1.5px solid #162030;
      border-radius:4px; cursor:pointer;
      display:flex; align-items:center; justify-content:center;
      padding:0;
      transition:border-color .15s, background .15s, box-shadow .15s;
  }
  ```
  _(Remove `aspect-ratio:1` — explicit height overrides it. Width is now determined by the grid column fraction.)_

- [ ] **Step 2: Update SVG icon sizes to match the smaller button**

  Find these two rules and update:
  ```css
  #shape-grid .shape-btn svg { width:14px; height:14px; display:block; }
  #cross-grid .shape-btn svg { width:16px; height:16px; display:block; }
  ```
  _(Was 16px/20px — reduced proportionally for 22px button height.)_

- [ ] **Step 3: Verify in browser — reload and check panel height**

  Run in DevTools console:
  ```javascript
  const panel = document.getElementById('panel');
  console.log('scrollHeight:', panel.scrollHeight, 'clientHeight:', panel.clientHeight);
  // scrollHeight must equal clientHeight (no overflow) after the 3rd row is added in Task 3
  // After this task alone it should be LESS than before since cross buttons shrank
  ```

- [ ] **Step 4: Commit**
  ```
  git add ballbouncer.html
  git commit -m "style: shrink shape-btn to 22px height to fit 3-row grids without panel scroll"
  ```

---

## Task 3: Replace SHAPES array (16 → 24 entries)

**File:** `ballbouncer.html` (~line 530)

**What changes:** Remove `4-Star`. Add `12-gon`. Add 8 new custom shapes: Gear, Lightning, Arrow, Crescent, Shield (Row 2); Skull, Fish, Rocket (Row 3). Five existing customs (Ghost–Crown) stay; their icons now render correctly from Task 1.

Computed shapes (Gear, Crescent) need generator functions inserted BEFORE the `SHAPES` array.

- [ ] **Step 1: Insert shape generator functions before the SHAPES definition**

  Find the `// ── Shape definitions ──` comment and insert these functions immediately before it:
  ```javascript
  // ── Computed shape point generators ───────────────────────────
  function makeGearPts(teeth = 8, outer = 1.0, inner = 0.72) {
      const step = Math.PI * 2 / teeth;
      const half  = step * 0.25;
      const pts = [];
      for (let i = 0; i < teeth; i++) {
          const c = i * step - Math.PI / 2;
          pts.push([Math.cos(c - half) * inner, Math.sin(c - half) * inner]);
          pts.push([Math.cos(c - half) * outer, Math.sin(c - half) * outer]);
          pts.push([Math.cos(c + half) * outer, Math.sin(c + half) * outer]);
          pts.push([Math.cos(c + half) * inner, Math.sin(c + half) * inner]);
      }
      return pts;
  }

  function makeCrescentPts() {
      const outerR = 1.0, innerR = 0.72, dx = -0.38;
      const ix = (1 + dx*dx - innerR*innerR) / (2*dx);
      const iy = Math.sqrt(Math.max(0, 1 - ix*ix));
      const pts = [];
      // Outer arc: CCW from bottom intersection → right → top intersection
      const a0 = Math.atan2(-iy, ix), a1 = Math.atan2(iy, ix);
      let span = a1 - a0; if (span <= 0) span += Math.PI * 2;
      for (let i = 0; i <= 10; i++) {
          const a = a0 + span * i / 10;
          pts.push([Math.cos(a) * outerR, Math.sin(a) * outerR]);
      }
      // Inner arc: CCW from top intersection → left (through inner circle's left side) → bottom
      const b0 = Math.atan2( iy, ix - dx), b1 = Math.atan2(-iy, ix - dx);
      let ispan = b1 - b0; if (ispan <= 0) ispan += Math.PI * 2;
      for (let i = 0; i <= 6; i++) {
          const a = b0 + ispan * i / 6;
          pts.push([dx + Math.cos(a) * innerR, Math.sin(a) * innerR]);
      }
      return pts;
  }
  ```

- [ ] **Step 2: Replace the entire `const SHAPES = [...]` block**

  Replace everything from `const SHAPES = [` through the closing `];` with:
  ```javascript
  const SHAPES = [
      // ── Row 1: core polygons + tight stars ──────────────────────
      { sides:3,  star:false, label:'Triangle', sa:-Math.PI/2 },
      { sides:4,  star:false, label:'Square',   sa:-Math.PI/4 },
      { sides:5,  star:false, label:'Pentagon', sa:-Math.PI/2 },
      { sides:6,  star:false, label:'Hexagon',  sa:-Math.PI/3 },
      { sides:8,  star:false, label:'Octagon',  sa:-3*Math.PI/8 },
      { sides:12, star:false, label:'12-gon',   sa:-Math.PI/12 },
      { sides:3,  star:true,  label:'3-Star',   sa:-Math.PI/2, ir:0.25 },
      { sides:5,  star:true,  label:'5-Star',   sa:-Math.PI/2, ir:0.382 },
      // ── Row 2: more stars + wild geometric ──────────────────────
      { sides:6,  star:true,  label:'6-Star',   sa:-Math.PI/2, ir:0.50 },
      { sides:8,  star:true,  label:'8-Star',   sa:-Math.PI/2, ir:0.40 },
      { sides:0,  star:false, label:'Circle',   sa:0 },
      { custom:true, label:'Gear',      sa:0, pts: makeGearPts() },
      { custom:true, label:'Lightning', sa:0, pts:[
          [ 0.10,-1.00],[ 0.55,-0.15],[ 0.90,-0.15],
          [ 0.00, 0.05],[ 0.45, 0.05],
          [-0.10, 1.00],[-0.55, 0.15],[-0.90, 0.15],
          [ 0.00,-0.05],[-0.45,-0.05],
      ]},
      { custom:true, label:'Arrow',     sa:0, pts:[
          [ 0.00,-1.00],[ 0.65,-0.20],[ 0.28,-0.20],
          [ 0.28, 1.00],[-0.28, 1.00],[-0.28,-0.20],[-0.65,-0.20],
      ]},
      { custom:true, label:'Crescent',  sa:0, pts: makeCrescentPts() },
      { custom:true, label:'Shield',    sa:0, pts:[
          [-0.85,-1.00],[ 0.85,-1.00],[ 0.85, 0.25],[ 0.00, 1.00],[-0.85, 0.25],
      ]},
      // ── Row 3: existing customs (icons now fixed) + new characters
      { custom:true, label:'Ghost', sa:0, pts:[
          [0,-1],[0.62,-0.72],[0.88,-0.08],[0.72,0.38],
          [0.88,0.65],[0.55,0.50],[0.28,0.65],[0,0.50],
          [-0.28,0.65],[-0.55,0.50],[-0.88,0.65],
          [-0.72,0.38],[-0.88,-0.08],[-0.62,-0.72],
      ]},
      { custom:true, label:'Cat', sa:0, pts:[
          [0,-0.88],[0.28,-0.78],[0.55,-1.05],[0.76,-0.68],
          [0.92,-0.10],[0.88,0.52],[0.48,0.88],[0,0.95],
          [-0.48,0.88],[-0.88,0.52],[-0.92,-0.10],
          [-0.76,-0.68],[-0.55,-1.05],[-0.28,-0.78],
      ]},
      { custom:true, label:'Pac-Man', sa:0, pts:[
          [0.819,-0.574],[0,0],[0.819,0.574],
          [0.583,0.812],[0.280,0.960],[-0.052,0.999],
          [-0.379,0.925],[-0.665,0.747],[-0.875,0.485],
          [-0.987,0.165],[-0.987,-0.165],[-0.875,-0.485],
          [-0.665,-0.747],[-0.379,-0.925],[-0.052,-0.999],
          [0.280,-0.960],[0.583,-0.812],
      ]},
      { custom:true, label:'Heart', sa:0, pts:[
          [0,-0.52],[0.52,-1.0],[0.98,-0.55],[1.0,0.08],
          [0.72,0.52],[0.38,0.82],[0,1.0],
          [-0.38,0.82],[-0.72,0.52],[-1.0,0.08],
          [-0.98,-0.55],[-0.52,-1.0],
      ]},
      { custom:true, label:'Crown', sa:0, pts:[
          [-1.0,0.75],[-1.0,-0.05],[-0.8,-0.70],[-0.6,-0.05],
          [-0.4,-0.82],[-0.2,-0.05],[0,-1.0],
          [0.2,-0.05],[0.4,-0.82],[0.6,-0.05],
          [0.8,-0.70],[1.0,-0.05],[1.0,0.75],
      ]},
      { custom:true, label:'Skull', sa:0, pts:[
          [-0.55,-1.00],[ 0.55,-1.00],[ 0.92,-0.55],[ 0.95, 0.10],
          [ 0.65, 0.55],[ 0.38, 0.55],[ 0.38, 0.95],
          [ 0.10, 0.95],[ 0.10, 0.55],[-0.10, 0.55],[-0.10, 0.95],
          [-0.38, 0.95],[-0.38, 0.55],[-0.65, 0.55],
          [-0.95, 0.10],[-0.92,-0.55],
      ]},
      { custom:true, label:'Fish', sa:0, pts:[
          [-1.00, 0.00],[-0.65, 0.45],[-0.25, 0.25],[ 0.50, 0.60],
          [ 1.00, 0.00],[ 0.50,-0.60],[-0.25,-0.25],[-0.65,-0.45],
      ]},
      { custom:true, label:'Rocket', sa:0, pts:[
          [ 0.00,-1.00],[ 0.30,-0.40],[ 0.30, 0.45],[ 0.65, 0.80],
          [ 0.65, 1.00],[ 0.30, 0.80],[ 0.00, 0.70],
          [-0.30, 0.80],[-0.65, 1.00],[-0.65, 0.80],
          [-0.30, 0.45],[-0.30,-0.40],
      ]},
  ];
  ```

- [ ] **Step 3: Update `currentShape` default to still point at Hexagon**

  Hexagon is now at index **3** in the new array (unchanged). Verify the line after `SHAPES`:
  ```javascript
  let currentShape = SHAPES[3]; // Hexagon — index unchanged
  ```

- [ ] **Step 4: Verify in browser console**

  ```javascript
  console.log('SHAPES count:', SHAPES.length); // expect 24
  console.log('slot 5 label:', SHAPES[5].label);  // expect '12-gon'
  console.log('slot 11 label:', SHAPES[11].label); // expect 'Gear'
  console.log('slot 21 label:', SHAPES[21].label); // expect 'Skull'
  console.log('Gear pts count:', SHAPES[11].pts.length); // expect 32
  console.log('Crescent pts count:', SHAPES[14].pts.length); // expect 18
  ```

- [ ] **Step 5: Visually verify the shape grid**

  Reload the page. The shape section should now have **3 rows of 8 buttons**. Check:
  - Row 3 shows Ghost, Cat, Pac-Man, Heart, Crown (all with visible icons from Task 1), Skull, Fish, Rocket
  - Click Gear — balls bounce inside a gear-shaped container
  - Click Lightning — balls bounce inside a lightning bolt container
  - Panel must NOT scroll

- [ ] **Step 6: Commit**
  ```
  git add ballbouncer.html
  git commit -m "feat: expand SHAPES 16→24, add Gear/Lightning/Arrow/Crescent/Shield/Skull/Fish/Rocket"
  ```

---

## Task 4: Fix `iconCrossPoints` + add custom cross support + expand CROSS_SHAPES to 18

**File:** `ballbouncer.html` (~line 867 for iconCrossPoints, ~line 574 for CROSS_SHAPES, ~line 1430 for cross grid creation)

**What changes:** `iconCrossPoints(arms, armWidth, sa)` → `iconCrossPoints(shape)` to support `custom:true` cross shapes. CROSS_SHAPES grows from 12 → 18 (add 10-thin, 10-wide, 7-Cross, Snowflake, Pinwheel, Star-Cross).

- [ ] **Step 1: Insert cross generator functions before CROSS_SHAPES**

  Find `// ── Cross shape definitions ──` and insert before it:
  ```javascript
  // ── Computed cross shape point generators ─────────────────────
  function makeSnowflakePts() {
      const mainR = 1.0, branchR = 0.62, valleyR = 0.18, bOff = Math.PI / 9;
      const pts = [];
      for (let i = 0; i < 6; i++) {
          const a = i / 6 * Math.PI * 2 - Math.PI / 2;
          pts.push([Math.cos(a - Math.PI / 6) * valleyR, Math.sin(a - Math.PI / 6) * valleyR]);
          pts.push([Math.cos(a - bOff) * branchR,        Math.sin(a - bOff) * branchR]);
          pts.push([Math.cos(a) * mainR,                  Math.sin(a) * mainR]);
          pts.push([Math.cos(a + bOff) * branchR,        Math.sin(a + bOff) * branchR]);
      }
      return pts;
  }

  function makePinwheelPts() {
      const outerR = 0.95, innerR = 0.28, sweep = Math.PI / 5;
      const pts = [];
      for (let i = 0; i < 4; i++) {
          const a = i / 4 * Math.PI * 2 - Math.PI / 4;
          pts.push([Math.cos(a + sweep) * outerR,  Math.sin(a + sweep) * outerR]);
          pts.push([Math.cos(a + Math.PI / 4 + sweep * 0.3) * innerR,
                    Math.sin(a + Math.PI / 4 + sweep * 0.3) * innerR]);
      }
      return pts;
  }

  function makeStarCrossPts() {
      const shaftW = 0.15, tipW = 0.50, shaftEnd = 0.72, tipR = 1.0;
      const pts = [];
      for (let i = 0; i < 4; i++) {
          const a = i / 4 * Math.PI * 2;
          const ax = Math.cos(a), ay = Math.sin(a);
          const px = -ay, py = ax;
          const mid = (shaftEnd + tipR) / 2;
          pts.push([ax * shaftEnd + px * shaftW, ay * shaftEnd + py * shaftW]);
          pts.push([ax * mid       + px * tipW,  ay * mid       + py * tipW]);
          pts.push([ax * tipR,                    ay * tipR]);
          pts.push([ax * mid       - px * tipW,  ay * mid       - py * tipW]);
          pts.push([ax * shaftEnd  - px * shaftW, ay * shaftEnd  - py * shaftW]);
      }
      return pts;
  }
  ```

- [ ] **Step 2: Replace the entire `const CROSS_SHAPES = [...]` block**

  ```javascript
  const CROSS_SHAPES = [
      // ── Row 1: plus/X/Y pairs ──────────────────────────────────
      { arms:4,  armWidth:0.18, label:'Plus',     sa:-Math.PI/2 },
      { arms:4,  armWidth:0.33, label:'Fat Plus', sa:-Math.PI/2 },
      { arms:4,  armWidth:0.18, label:'X',        sa:-Math.PI/4 },
      { arms:4,  armWidth:0.33, label:'Fat X',    sa:-Math.PI/4 },
      { arms:3,  armWidth:0.25, label:'Y',        sa:-Math.PI/2 },
      { arms:3,  armWidth:0.42, label:'Fat Y',    sa:-Math.PI/2 },
      // ── Row 2: multi-arm pairs ─────────────────────────────────
      { arms:5,  armWidth:0.18, label:'5-Cross',  sa:-Math.PI/2 },
      { arms:6,  armWidth:0.18, label:'6-Cross',  sa:0 },
      { arms:6,  armWidth:0.28, label:'Wide 6',   sa:0 },
      { arms:8,  armWidth:0.12, label:'8-Cross',  sa:0 },
      { arms:8,  armWidth:0.20, label:'Wide 8',   sa:0 },
      { arms:12, armWidth:0.09, label:'12-Cross', sa:0 },
      // ── Row 3: extended + custom ───────────────────────────────
      { arms:7,  armWidth:0.14, label:'7-Cross',  sa:-Math.PI/2 },
      { arms:10, armWidth:0.08, label:'10-Cross', sa:0 },
      { arms:10, armWidth:0.14, label:'Wide 10',  sa:0 },
      { custom:true, label:'Snowflake', sa:0, pts: makeSnowflakePts() },
      { custom:true, label:'Pinwheel',  sa:0, pts: makePinwheelPts() },
      { custom:true, label:'Star-Cross',sa:0, pts: makeStarCrossPts() },
  ];
  ```

- [ ] **Step 3: Fix `iconCrossPoints` to accept a shape object**

  Find `function iconCrossPoints(arms, armWidth, sa)` (~line 867) and replace with:
  ```javascript
  function iconCrossPoints(shape) {
      if (shape.custom) {
          return shape.pts.map(([x, y]) =>
              `${(16 + x * 13 * 0.85).toFixed(2)},${(16 + y * 13 * 0.85).toFixed(2)}`
          ).join(' ');
      }
      const { arms, armWidth, sa } = shape;
      const R = 13, O = 16, wr = armWidth * R;
      const step = 2 * Math.PI / arms, sinStep = Math.sin(step);
      const pts = [];
      for (let i = 0; i < arms; i++) {
          const a = sa + i * step, b = a + step;
          pts.push(`${(O + R * Math.cos(a) + wr * Math.sin(a)).toFixed(2)},${(O + R * Math.sin(a) - wr * Math.cos(a)).toFixed(2)}`);
          pts.push(`${(O + R * Math.cos(a) - wr * Math.sin(a)).toFixed(2)},${(O + R * Math.sin(a) + wr * Math.cos(a)).toFixed(2)}`);
          pts.push(`${(O + wr * (Math.cos(a) + Math.cos(b)) / sinStep).toFixed(2)},${(O + wr * (Math.sin(a) + Math.sin(b)) / sinStep).toFixed(2)}`);
      }
      return pts.join(' ');
  }
  ```

- [ ] **Step 4: Update the call site in the cross grid creation loop**

  Find the cross grid creation loop (~line 1430). Update the `iconCrossPoints` call:
  ```javascript
  // Before:
  el.setAttribute('points', iconCrossPoints(shape.arms, shape.armWidth, shape.sa));
  // After:
  el.setAttribute('points', iconCrossPoints(shape));
  ```

- [ ] **Step 5: Verify in browser console**

  ```javascript
  console.log('CROSS_SHAPES count:', CROSS_SHAPES.length); // expect 18
  console.log('slot 15 label:', CROSS_SHAPES[15].label);   // expect 'Snowflake'
  console.log('slot 16 label:', CROSS_SHAPES[16].label);   // expect 'Pinwheel'
  // Check snowflake pts count:
  console.log('Snowflake pts:', CROSS_SHAPES[15].pts.length); // expect 24
  ```

- [ ] **Step 6: Visually verify the cross grid**

  Reload. Cross section should have **3 rows of 6 buttons**. Check:
  - Snowflake, Pinwheel, Star-Cross buttons show visible icons (not blank)
  - 10-Cross and Wide 10 buttons show 10-arm stars
  - Panel still doesn't scroll

- [ ] **Step 7: Commit**
  ```
  git add ballbouncer.html
  git commit -m "feat: expand CROSS_SHAPES 12→18, fix iconCrossPoints for custom cross shapes"
  ```

---

## Task 5: Fix `innerShapeVerts` to handle custom cross shapes

**File:** `ballbouncer.html` (~line 1122)

**Why:** `innerShapeVerts` currently only knows about the arm-based formula. Selecting Snowflake, Pinwheel, or Star-Cross as the inner shape will currently ignore `shape.custom` and pass `undefined` to the arm formula, producing garbage verts (or a crash).

- [ ] **Step 1: Find `function innerShapeVerts`**

  Current code:
  ```javascript
  function innerShapeVerts(angle) {
      const { arms, armWidth } = currentCrossShape;
      const r = INNER_R, wr = armWidth * r;
      const step = 2 * Math.PI / arms, sinStep = Math.sin(step);
      const verts = [];
      for (let i = 0; i < arms; i++) {
          const a = angle + i * step, b = a + step;
          verts.push({ x: cx + r * Math.cos(a) + wr * Math.sin(a), y: cy + r * Math.sin(a) - wr * Math.cos(a) });
          verts.push({ x: cx + r * Math.cos(a) - wr * Math.sin(a), y: cy + r * Math.sin(a) + wr * Math.cos(a) });
          verts.push({ x: cx + wr * (Math.cos(a) + Math.cos(b)) / sinStep, y: cy + wr * (Math.sin(a) + Math.sin(b)) / sinStep });
      }
      return verts;
  }
  ```

- [ ] **Step 2: Add the `custom:true` branch at the top of `innerShapeVerts`**

  Replace the function with:
  ```javascript
  function innerShapeVerts(angle) {
      if (currentCrossShape.custom) {
          const { pts } = currentCrossShape;
          const ca = Math.cos(angle), sinA = Math.sin(angle);
          return pts.map(([nx, ny]) => ({
              x: cx + (nx * ca - ny * sinA) * INNER_R,
              y: cy + (nx * sinA + ny * ca)  * INNER_R,
          }));
      }
      const { arms, armWidth } = currentCrossShape;
      const r = INNER_R, wr = armWidth * r;
      const step = 2 * Math.PI / arms, sinStep = Math.sin(step);
      const verts = [];
      for (let i = 0; i < arms; i++) {
          const a = angle + i * step, b = a + step;
          verts.push({ x: cx + r * Math.cos(a) + wr * Math.sin(a), y: cy + r * Math.sin(a) - wr * Math.cos(a) });
          verts.push({ x: cx + r * Math.cos(a) - wr * Math.sin(a), y: cy + r * Math.sin(a) + wr * Math.cos(a) });
          verts.push({ x: cx + wr * (Math.cos(a) + Math.cos(b)) / sinStep, y: cy + wr * (Math.sin(a) + Math.sin(b)) / sinStep });
      }
      return verts;
  }
  ```

- [ ] **Step 3: Verify in browser**

  Click "Snowflake" in the Cross section. The inner shape in the canvas should render as a snowflake outline, and balls should bounce against it correctly. Click "Pinwheel" and "Star-Cross" — same check.

  Run in console:
  ```javascript
  // Switch to Snowflake cross
  document.querySelectorAll('#cross-grid .shape-btn')[15].click();
  const verts = innerShapeVerts(0);
  console.log('Snowflake vert count:', verts.length); // expect 24
  console.log('first vert:', verts[0]); // expect {x: number, y: number} — not NaN
  ```

- [ ] **Step 4: Commit**
  ```
  git add ballbouncer.html
  git commit -m "fix: innerShapeVerts supports custom cross shape pts for Snowflake/Pinwheel/Star-Cross"
  ```

---

## Task 6: Final browser verification

- [ ] **Step 1: Reload and run full smoke check in console**

  ```javascript
  // Shape counts
  console.assert(SHAPES.length === 24, 'SHAPES should have 24 entries');
  console.assert(CROSS_SHAPES.length === 18, 'CROSS_SHAPES should have 18 entries');

  // Default shape is still Hexagon (idx 3)
  console.assert(currentShape === SHAPES[3], 'Default shape should be Hexagon');
  console.assert(currentShape.label === 'Hexagon', 'Default shape label');

  // No panel scroll
  const p = document.getElementById('panel');
  console.assert(p.scrollHeight <= p.clientHeight + 2, 'Panel must not scroll');

  // iconPoints handles custom correctly
  const ghost = SHAPES.find(s => s.label === 'Ghost');
  const pts = iconPoints(ghost, 13, 16, 16).split(' ');
  const allInRange = pts.every(pair => {
      const [x, y] = pair.split(',').map(Number);
      return x > 2 && x < 30 && y > 2 && y < 30;
  });
  console.assert(allInRange, 'Ghost icon pts should all be within 32x32 viewBox');

  console.log('All checks passed ✓');
  ```

- [ ] **Step 2: Click through all 24 outer shapes**

  Visually confirm each shape renders correctly in the canvas as a container. Balls should stay inside. Pay attention to: Gear (teeth visible), Lightning (zigzag), Arrow (arrowhead + shaft), Crescent (moon shape), Skull (jaw notch visible in the silhouette).

- [ ] **Step 3: Click through all 18 cross shapes**

  Confirm the inner cross renders for each. Snowflake should show 6 arms with secondary branches. Pinwheel should look swept/rotated. Star-Cross should show 4 arms with diamond tips.

- [ ] **Step 4: Check localStorage round-trip**

  Change a few settings, reload. Settings should restore. Change shape to Rocket, reload — Rocket should still be selected.

  ```javascript
  // Quick check: save and verify shapeIdx
  const saved = JSON.parse(localStorage.getItem('bb') || '{}');
  console.log('saved shapeIdx:', saved.shapeIdx); // should be a number 0-23
  ```

- [ ] **Step 5: Final commit**
  ```
  git add ballbouncer.html
  git commit -m "feat: shapes rework complete — 24 outer shapes, 18 cross shapes, all icons fixed"
  ```

---

## Self-Review Notes

- **Spec coverage:** All spec sections covered: layout (Task 2), 24 outer shapes (Task 3), 18 crosses (Task 4), icon bug fix (Tasks 1+4), innerShapeVerts (Task 5), computed generators (Tasks 3+4).
- **DEFAULTS.shapeIdx:** Hexagon stays at index 3 in both old and new SHAPES array — no change needed.
- **DEFAULTS.crossIdx:** Plus stays at index 0 in the new CROSS_SHAPES array — no change needed. Note: 5-Cross moves from index 10→6 in the reordering; old localStorage saves with `crossIdx:10` will load 8-Cross instead — harmless.
- **4-Star removal:** Confirmed absent from new SHAPES array. Old localStorage saves with `shapeIdx:6` (old 4-Star) will now load 3-Star (new index 6), which is a harmless fallback.
- **iconCrossPoints signature change:** Only one call site — updated in Task 4 Step 4.
- **Concave shapes:** Fish, Skull, Pac-Man are concave polygons. `wallCollide` iterates all edges — this works but balls may occasionally pass through tight concave corners. This is existing behavior (Ghost/Cat already concave) and is out of scope.
- **makeStarCrossPts:** Produces 20 pts (5 per arm × 4 arms). The `innerShapeVerts` fix handles any number of pts correctly.
