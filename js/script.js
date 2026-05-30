'use strict';

// ── Canvas setup ──────────────────────────────────────────────
const c      = document.getElementById('c');
const ctx    = c.getContext('2d', { alpha: false });
const logoEl = document.getElementById('canvas-logo');
let W = window.innerWidth, H = window.innerHeight, cx = W / 2, cy = H / 2, SHAPE_R = 100, INNER_R = 50;
let shapeSize = 47, shapeAngle = 0, innerShapeAngle = 0;
let gravity = 0.13, gravityAngle = 0, maxBallSpeed = 15, spin = 0.013;
let innerSpin = 0.008, shapeSpinSign = 1, innerSpinSign = 1;
let crossHoleEnabled = false, crossHoleTip = null, crossHoleHalf = 2;
let crossHoleArmIdx = 0, crossHoleNextChange = 0, crossHoleInterval = 5000;
let crossHoleLocalAngle = null, gameSpeed = 1;
let logoArmIdx = 0, logoNextChange = 0, logoLocalAngle = null;
let balls = [], sparks = [];
const PANEL_W = 220, SUBSTEPS = 2, DPR = Math.min(window.devicePixelRatio || 1, 2);

// ── Physics constants ───────────────────────────────────────────
const BALL_FRICTION        = 0.9994;   // velocity decay per frame
const ANGULAR_DECAY        = 0.9985;   // angular velocity decay per frame
const BOUNCE_RESTITUTION   = 1.8;      // bounce coefficient (velocity reflection multiplier)
const BOUNDARY_BOUNCE      = 2.0;      // boundary safety bounce coefficient
const FRICTION_FACTOR      = 0.22;     // tangential friction factor for spin transfer
const BALL_FRICTION_FACTOR = 0.12;     // ball-to-ball tangential friction factor

function updateRadius() {
    SHAPE_R = (shapeSize / 100) * 0.90 * Math.min(W, H);
    
    let minOuterR = SHAPE_R;
    const shape = typeof currentShape !== 'undefined' ? currentShape : null;
    if (shape) {
        if (shape.star) {
            minOuterR = SHAPE_R * (shape.ir || 0.4);
        } else if (shape.custom) {
            let minD = 1.0;
            const pts = shape.pts || [];
            for (let i = 0; i < pts.length; i++) {
                const d = Math.hypot(pts[i][0], pts[i][1]);
                if (d < minD) minD = d;
            }
            minOuterR = SHAPE_R * minD;
        } else if (shape.sides > 2) {
            minOuterR = SHAPE_R * Math.cos(Math.PI / shape.sides);
        }
    }

    const csEl = document.getElementById('sCrossSize');
    INNER_R = Math.min(SHAPE_R * 0.95, minOuterR * 0.95) * ((csEl ? +csEl.value : 50) / 100);
}

function resizeCanvas() {
    const isMobile = window.innerWidth <= 800;
    const effectivePanelW = isMobile ? 0 : PANEL_W;
    const cssW = window.innerWidth - effectivePanelW, cssH = window.innerHeight;
    c.width = Math.round(cssW * DPR); c.height = Math.round(cssH * DPR);
    c.style.width = cssW + 'px'; c.style.height = cssH + 'px';
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    W = cssW; H = cssH;
    cx = cssW / 2; cy = H / 2;
    updateRadius();
    bgCanvas.width = Math.round(W * DPR); bgCanvas.height = Math.round(H * DPR);
    bgCtx.setTransform(DPR, 0, 0, DPR, 0, 0);
    if (typeof rebuildBgCanvas === 'function') rebuildBgCanvas();
}

// Mobile Menu Toggle
const menuToggle = document.getElementById('menuToggle');
const panel = document.getElementById('panel');
const backdrop = document.getElementById('panel-backdrop');

if (menuToggle && panel && backdrop) {
    menuToggle.addEventListener('click', () => {
        const isOpen = panel.classList.toggle('open');
        backdrop.classList.toggle('open', isOpen);
        
        // Change icon between Hamburger and X
        menuToggle.innerHTML = isOpen 
            ? `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`
            : `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>`;
        
        menuToggle.style.background = isOpen ? 'rgba(0,212,255,0.2)' : 'rgba(11,18,34,0.8)';
    });
    
    // Close menu when clicking outside (on backdrop)
    backdrop.addEventListener('click', () => {
        panel.classList.remove('open');
        backdrop.classList.remove('open');
        menuToggle.style.background = 'rgba(11,18,34,0.8)';
        menuToggle.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>`;
    });
}

const _defaultR = Math.round(Math.max(3, Math.min(18, (47 / 100) * 0.90 * Math.min(window.innerWidth, window.innerHeight) * 0.018)));
let BALL_R = _defaultR;
let sizeRandomness = 0;

// ── Color themes ──────────────────────────────────────────────
const THEMES = [
    // Color-wheel order: red → orange → yellow → lime → green → teal → cyan → ice-blue → blue → violet → purple → magenta → pink → silver
    { id:'blood',  name:'Blood',  swatch:'#cc0022', bg1:'#1a0007', bg2:'#0a0003', shapeStroke:'#ff2244', shapeShadow:'#cc0022', shapeFill:'rgba(28,0,7,.55)',    dotFill:'#ff8899', dotShadow:'#cc0022', tick:'rgba(204,0,34,.22)',    accent:'#ff2244', glow15:'rgba(255,34,68,.15)',    glow70:'rgba(255,34,68,.70)',    panel:'#060002', panelBorder:'#130007', trackEmpty:'#130007' },
    { id:'lava',   name:'Lava',   swatch:'#ff3300', bg1:'#280800', bg2:'#130300', shapeStroke:'#ff5522', shapeShadow:'#ff3300', shapeFill:'rgba(50,8,0,.55)',    dotFill:'#ffaa77', dotShadow:'#ff3300', tick:'rgba(255,51,0,.22)',    accent:'#ff5522', glow15:'rgba(255,85,34,.15)',    glow70:'rgba(255,85,34,.70)',    panel:'#0f0100', panelBorder:'#240600', trackEmpty:'#240600' },
    { id:'ember',  name:'Ember',  swatch:'#ff7700', bg1:'#201000', bg2:'#0f0800', shapeStroke:'#ffaa44', shapeShadow:'#ff7700', shapeFill:'rgba(32,14,0,.55)',   dotFill:'#ffcc88', dotShadow:'#ff7700', tick:'rgba(255,119,0,.22)',   accent:'#ffaa44', glow15:'rgba(255,170,68,.15)',   glow70:'rgba(255,170,68,.70)',   panel:'#0b0500', panelBorder:'#1c0a00', trackEmpty:'#1c0a00' },
    { id:'gold',   name:'Gold',   swatch:'#ffcc00', bg1:'#1a1200', bg2:'#0c0900', shapeStroke:'#ffd700', shapeShadow:'#ffcc00', shapeFill:'rgba(28,18,0,.55)',   dotFill:'#fff0aa', dotShadow:'#ffcc00', tick:'rgba(255,204,0,.22)',   accent:'#ffd700', glow15:'rgba(255,215,0,.15)',    glow70:'rgba(255,215,0,.70)',    panel:'#070500', panelBorder:'#160f00', trackEmpty:'#160f00' },
    { id:'toxic',  name:'Toxic',  swatch:'#aaff00', bg1:'#091400', bg2:'#040a00', shapeStroke:'#ccff44', shapeShadow:'#aaff00', shapeFill:'rgba(8,18,0,.55)',    dotFill:'#ddff88', dotShadow:'#aaff00', tick:'rgba(170,255,0,.22)',   accent:'#ccff44', glow15:'rgba(204,255,68,.15)',   glow70:'rgba(204,255,68,.70)',   panel:'#030600', panelBorder:'#091100', trackEmpty:'#091100' },
    { id:'forest', name:'Forest', swatch:'#00dd66', bg1:'#0a2010', bg2:'#050f08', shapeStroke:'#44ffaa', shapeShadow:'#00dd66', shapeFill:'rgba(0,20,10,.55)',   dotFill:'#88ffcc', dotShadow:'#00dd66', tick:'rgba(0,220,102,.22)',   accent:'#44ffaa', glow15:'rgba(68,255,170,.15)',   glow70:'rgba(68,255,170,.70)',   panel:'#040e05', panelBorder:'#0a1f0c', trackEmpty:'#0a1f0c' },
    { id:'mint',   name:'Mint',   swatch:'#00ffcc', bg1:'#061a14', bg2:'#030d0a', shapeStroke:'#44ffee', shapeShadow:'#00ffcc', shapeFill:'rgba(2,18,12,.55)',   dotFill:'#aaffee', dotShadow:'#00ffcc', tick:'rgba(0,255,204,.22)',   accent:'#44ffee', glow15:'rgba(68,255,238,.15)',   glow70:'rgba(68,255,238,.70)',   panel:'#020806', panelBorder:'#061510', trackEmpty:'#061510' },
    { id:'cyber',  name:'SciFi',   swatch:'#00d4ff', bg1:'#1a2850', bg2:'#0a0f25', shapeStroke:'#22ccff', shapeShadow:'#00d4ff', shapeFill:'rgba(10,25,60,.55)',  dotFill:'#88eeff', dotShadow:'#00d4ff', tick:'rgba(0,180,255,.22)',   accent:'#00d4ff', glow15:'rgba(0,212,255,.15)',    glow70:'rgba(0,212,255,.70)',    panel:'#07071a', panelBorder:'#111128', trackEmpty:'#1a2a40' },
    { id:'ice',    name:'Inferno', swatch:'#ff5500', bg1:'#220800', bg2:'#0e0300', shapeStroke:'#ff7711', shapeShadow:'#ff5500', shapeFill:'rgba(34,8,0,.55)',   dotFill:'#ffaa55', dotShadow:'#ff5500', tick:'rgba(255,85,0,.22)',    accent:'#ff7711', glow15:'rgba(255,119,17,.15)',   glow70:'rgba(255,119,17,.70)',   panel:'#0c0200', panelBorder:'#1e0500', trackEmpty:'#1e0500' },
    { id:'ocean',  name:'Vibrant', swatch:'#ff0088', bg1:'#1e0018', bg2:'#0e000c', shapeStroke:'#ff44aa', shapeShadow:'#ff0088', shapeFill:'rgba(30,0,22,.55)',  dotFill:'#ffaadd', dotShadow:'#ff0088', tick:'rgba(255,0,136,.22)',   accent:'#ff44aa', glow15:'rgba(255,68,170,.15)',   glow70:'rgba(255,68,170,.70)',   panel:'#090011', panelBorder:'#1a0018', trackEmpty:'#1a0018' },
    { id:'violet', name:'Aurora',  swatch:'#00ff88', bg1:'#001e12', bg2:'#000e09', shapeStroke:'#44ffaa', shapeShadow:'#00ff88', shapeFill:'rgba(0,22,12,.55)',  dotFill:'#88ffcc', dotShadow:'#00ff88', tick:'rgba(0,255,136,.22)',   accent:'#44ffaa', glow15:'rgba(68,255,170,.15)',   glow70:'rgba(68,255,170,.70)',   panel:'#000e07', panelBorder:'#001b0e', trackEmpty:'#001b0e' },
    { id:'galaxy', name:'Galaxy',  swatch:'#9944ff', bg1:'#0a001e', bg2:'#05000f', shapeStroke:'#bb66ff', shapeShadow:'#9944ff', shapeFill:'rgba(14,0,28,.55)',  dotFill:'#ddaaff', dotShadow:'#9944ff', tick:'rgba(153,68,255,.22)',  accent:'#bb66ff', glow15:'rgba(187,102,255,.15)',  glow70:'rgba(187,102,255,.70)',  panel:'#030008', panelBorder:'#0a0018', trackEmpty:'#0a0018' },
    { id:'neon',   name:'Neon',    swatch:'#ff00ff', bg1:'#1a0030', bg2:'#0a0018', shapeStroke:'#ff44ff', shapeShadow:'#ff00ff', shapeFill:'rgba(30,0,50,.55)',  dotFill:'#ffaaff', dotShadow:'#ff00ff', tick:'rgba(255,0,255,.22)',   accent:'#ff44ff', glow15:'rgba(255,68,255,.15)',   glow70:'rgba(255,68,255,.70)',   panel:'#090011', panelBorder:'#1c0030', trackEmpty:'#1c0030' },
    { id:'plasma', name:'Plasma',  swatch:'#ff22cc', bg1:'#180020', bg2:'#0a0012', shapeStroke:'#ff44ee', shapeShadow:'#ff22cc', shapeFill:'rgba(28,0,36,.55)',  dotFill:'#ff99ff', dotShadow:'#ff22cc', tick:'rgba(255,34,204,.22)',  accent:'#ff44ee', glow15:'rgba(255,68,238,.15)',   glow70:'rgba(255,68,238,.70)',   panel:'#080010', panelBorder:'#180022', trackEmpty:'#180022' },
];
let currentTheme = THEMES[0];

// ── Ball color themes ──────────────────────────────────────────
let _gradHue = 0;
const BALL_THEMES = [
    // Row 1 — pure rainbow single hues
    { id:'r-red',    name:'Red',      swatch:'#ff2244', getHSL:()=>({ h:345+Math.random()*25,  s:90+Math.random()*10, l:45+Math.random()*20 }) },
    { id:'r-orange', name:'Orange',   swatch:'#ff6600', getHSL:()=>({ h:18+Math.random()*16,   s:92+Math.random()*8,  l:52+Math.random()*16 }) },
    { id:'r-yellow', name:'Yellow',   swatch:'#ffdd00', getHSL:()=>({ h:50+Math.random()*12,   s:90+Math.random()*10, l:54+Math.random()*14 }) },
    { id:'r-green',  name:'Green',    swatch:'#22ee44', getHSL:()=>({ h:128+Math.random()*26,  s:78+Math.random()*18, l:44+Math.random()*20 }) },
    { id:'r-cyan',   name:'Cyan',     swatch:'#00ddff', getHSL:()=>({ h:188+Math.random()*18,  s:88+Math.random()*12, l:52+Math.random()*16 }) },
    { id:'r-blue',   name:'Blue',     swatch:'#2255ff', getHSL:()=>({ h:220+Math.random()*22,  s:85+Math.random()*15, l:50+Math.random()*18 }) },
    { id:'r-violet', name:'Violet',   swatch:'#8833ff', getHSL:()=>({ h:268+Math.random()*24,  s:82+Math.random()*18, l:45+Math.random()*22 }) },
    // Row 2 — themed effects
    { id:'galaxy',   name:'Galaxy',   swatch:'#220055', getHSL:()=>({ h:248+Math.random()*72,  s:68+Math.random()*28, l:24+Math.random()*32 }) },
    { id:'fireball', name:'Fire',     swatch:'#ff4400', getHSL:()=>({ h:Math.random()*42,      s:92+Math.random()*8,  l:50+Math.random()*18 }) },
    { id:'ocean',    name:'Ocean',    swatch:'#0077cc', getHSL:()=>({ h:195+Math.random()*40,  s:72+Math.random()*22, l:40+Math.random()*28 }) },
    { id:'neonball', name:'Neon',     swatch:'#ff00ff', getHSL:()=>({ h:Math.random()*360,     s:95+Math.random()*5,  l:50+Math.random()*12 }) },
    { id:'rainbow',  name:'Rainbow',  swatch:'conic-gradient(#f00,#ff0,#0f0,#0ff,#00f,#f0f,#f00)', getHSL:()=>({ h:Math.random()*360, s:92+Math.random()*8, l:52+Math.random()*12 }) },
    { id:'gradient', name:'Gradient', swatch:'linear-gradient(135deg,#f00,#ff0,#0f0,#0ff,#00f,#f0f)', getHSL:()=>{ _gradHue=(_gradHue+24)%360; return {h:_gradHue,s:90,l:55}; } },
    { id:'standard', name:'Pearl',    swatch:'#eeeeff', getHSL:()=>({ h:Math.random()*360,     s:8+Math.random()*22,  l:72+Math.random()*20 }) },
];
let currentBallTheme = BALL_THEMES[0];

// ── Background/fog themes ──────────────────────────────────────
const FOG_THEMES = [
    // Color-wheel order: none → red → rust → orange → yellow → lime → teal → blue → slate → purple → dark-purple → pink → cycle
    { id:'standard',  name:'Standard',  swatch:'#888899', tint:null },
    { id:'bloodfog',  name:'Blood',     swatch:'#cc1122', tint:'180,0,15' },
    { id:'rust',      name:'Rust',      swatch:'#cc4400', tint:'150,55,0' },
    { id:'fire',      name:'Fire',      swatch:'#ff6600', tint:'160,55,0' },
    { id:'solar',     name:'Solar',     swatch:'#ffaa00', tint:'210,110,0' },
    { id:'acidfog',   name:'Acid',      swatch:'#99ee00', tint:'100,160,0' },
    { id:'aurora',    name:'Aurora',    swatch:'#00cc77', tint:'0,180,100' },
    { id:'ocean',     name:'Ocean',     swatch:'#0077cc', tint:'0,40,120' },
    { id:'steel',     name:'Steel',     swatch:'#667788', tint:'18,28,52' },
    { id:'void',      name:'Void',      swatch:'#220044', tint:'20,0,50' },
    { id:'galaxy',    name:'Galaxy',    swatch:'#7733ee', tint:'55,10,140' },
    { id:'sakura',    name:'Sakura',    swatch:'#ff66aa', tint:'255,100,155' },
    { id:'rainbow',   name:'Rainbow',   swatch:'#ff4422', tint:'cycle' },
    { id:'firework',  name:'Firework',  swatch:'#ffaaff', tint:'fast' },
];
let currentFogTheme = FOG_THEMES[0];
let bgFade = 15, trailLength = 0, frameCount = 0;
let bgAnimMult = 1.0;

// ── Background canvas ──────────────────────────────────────────
const bgCanvas = document.createElement('canvas');
const bgCtx = bgCanvas.getContext('2d');

function rebuildBgCanvas() {
    if (!W || !H) return;
    const gr = bgCtx.createRadialGradient(cx, cy, 0, cx, cy, (SHAPE_R || 100) * 1.4);
    gr.addColorStop(0, currentTheme.bg1);
    gr.addColorStop(1, currentTheme.bg2);
    bgCtx.fillStyle = gr;
    bgCtx.fillRect(0, 0, W, H);
}

// ── Computed shape point generators ───────────────────────────
function makeGearPts(teeth = 8, outer = 1.0, inner = 0.72) {
    const step = Math.PI * 2 / teeth, half = step * 0.25;
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
    const ix = (1 + dx * dx - innerR * innerR) / (2 * dx);
    const iy = Math.sqrt(Math.max(0, 1 - ix * ix));
    const pts = [];
    const a0 = Math.atan2(-iy, ix), a1 = Math.atan2(iy, ix);
    let span = a1 - a0; if (span <= 0) span += Math.PI * 2;
    for (let i = 0; i <= 10; i++) {
        const a = a0 + span * i / 10;
        pts.push([Math.cos(a) * outerR, Math.sin(a) * outerR]);
    }
    const b0 = Math.atan2(iy, ix - dx), b1 = Math.atan2(-iy, ix - dx);
    let ispan = b1 - b0; if (ispan <= 0) ispan += Math.PI * 2;
    for (let i = 0; i <= 6; i++) {
        const a = b0 + ispan * i / 6;
        pts.push([dx + Math.cos(a) * innerR, Math.sin(a) * innerR]);
    }
    return pts;
}

// ── Shape definitions ──────────────────────────────────────────
const SHAPES = [
    // Row 1 — polygons + tight stars
    { sides:3,  star:false, label:'Triangle', sa:-Math.PI/2 },
    { sides:4,  star:false, label:'Square',   sa:-Math.PI/4 },
    { sides:5,  star:false, label:'Pentagon', sa:-Math.PI/2 },
    { sides:6,  star:false, label:'Hexagon',  sa:-Math.PI/3 },
    { sides:8,  star:false, label:'Octagon',  sa:-3*Math.PI/8 },
    { sides:12, star:false, label:'12-gon',   sa:-Math.PI/12 },
    { sides:3,  star:true,  label:'3-Star',   sa:-Math.PI/2, ir:0.25 },
    { sides:5,  star:true,  label:'5-Star',   sa:-Math.PI/2, ir:0.382 },
    // Row 2 — more stars + wild geometric
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
    // Row 3 — customs (icons now fixed) + new characters
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
    // Row 4 — extra wild
    { sides:16, star:false, label:'16-gon',   sa:-Math.PI/16 },
    { sides:4,  star:true,  label:'4-Star',   sa:Math.PI/4, ir:0.32 },
    { sides:12, star:true,  label:'Sun',      sa:-Math.PI/12, ir:0.28 },
    { custom:true, label:'Hourglass', sa:0, pts:[
        [-1.00,-1.00],[ 1.00,-1.00],[ 0.06, 0.00],[ 1.00, 1.00],
        [-1.00, 1.00],[-0.06, 0.00],
    ]},
    { custom:true, label:'Flame', sa:0, pts:[
        [ 0.00,-1.00],[ 0.28,-0.45],[ 0.60, 0.10],[ 0.82, 0.55],
        [ 0.62, 0.88],[ 0.30, 0.65],[ 0.42, 0.85],[ 0.00, 0.62],
        [-0.42, 0.85],[-0.30, 0.65],[-0.62, 0.88],
        [-0.82, 0.55],[-0.60, 0.10],[-0.28,-0.45],
    ]},
    { custom:true, label:'Bat', sa:0, pts:[
        [ 0.00, 0.20],[ 0.25,-0.05],[ 0.42, 0.28],[ 0.58,-0.08],
        [ 0.88,-0.52],[ 1.00,-0.12],[ 0.82, 0.08],[ 0.55, 0.08],
        [ 0.22, 0.55],[ 0.12, 0.95],[ 0.00, 0.72],[-0.12, 0.95],
        [-0.22, 0.55],[-0.55, 0.08],[-0.82, 0.08],[-1.00,-0.12],
        [-0.88,-0.52],[-0.58,-0.08],[-0.42, 0.28],[-0.25,-0.05],
    ]},
    { custom:true, label:'Bell', sa:0, pts:[
        [-0.50,-1.00],[ 0.50,-1.00],[ 0.50,-0.75],[ 0.82,-0.18],
        [ 1.00, 0.32],[ 0.80, 0.75],[ 0.40, 0.88],[ 0.18, 0.68],
        [ 0.18, 1.00],[-0.18, 1.00],[-0.18, 0.68],[-0.40, 0.88],
        [-0.80, 0.75],[-1.00, 0.32],[-0.82,-0.18],[-0.50,-0.75],
    ]},
    { custom:true, label:'Cloud', sa:0, pts:[
        [-1.00, 0.12],[-0.88,-0.15],[-0.62,-0.38],[-0.30,-0.42],
        [-0.12,-0.72],[ 0.18,-0.82],[ 0.48,-0.68],[ 0.68,-0.32],
        [ 0.88,-0.12],[ 1.00, 0.12],[ 1.00, 0.70],[-1.00, 0.70],
    ]},
];
let currentShape = SHAPES[3];

// ── Cross shape generators ─────────────────────────────────────
function makeSnowflakePts() {
    const pts = [];
    const arms = 6, step = Math.PI * 2 / arms, sa = -Math.PI / 2;
    for (let i = 0; i < arms; i++) {
        const a = sa + i * step;
        const px = Math.sin(a), py = -Math.cos(a);
        pts.push([Math.cos(a - Math.PI/6) * 0.65, Math.sin(a - Math.PI/6) * 0.65]);
        pts.push([Math.cos(a) * 0.58 + px * 0.09,  Math.sin(a) * 0.58 + py * 0.09]);
        pts.push([Math.cos(a),                      Math.sin(a)]);
        pts.push([Math.cos(a) * 0.58 - px * 0.09,  Math.sin(a) * 0.58 - py * 0.09]);
        pts.push([Math.cos(a + Math.PI/6) * 0.65,  Math.sin(a + Math.PI/6) * 0.65]);
        pts.push([Math.cos(a + step/2) * 0.15,     Math.sin(a + step/2) * 0.15]);
    }
    return pts;
}

function makePinwheelPts() {
    const pts = [];
    const arms = 4, step = Math.PI * 2 / arms, sa = -Math.PI / 2;
    const sw = Math.PI / 6, hw = 0.22, nearR = 0.12;
    for (let i = 0; i < arms; i++) {
        const a = sa + i * step, aS = a + sw;
        const px = -Math.sin(aS), py = Math.cos(aS);
        pts.push([Math.cos(a) * nearR + px * hw, Math.sin(a) * nearR + py * hw]);
        pts.push([Math.cos(aS)         + px * hw, Math.sin(aS)         + py * hw]);
        pts.push([Math.cos(aS)         - px * hw, Math.sin(aS)         - py * hw]);
        pts.push([Math.cos(a) * nearR - px * hw, Math.sin(a) * nearR - py * hw]);
    }
    return pts;
}

function makeTriquetraPts() {
    const pts = [];
    const arms = 3, step = Math.PI * 2 / arms, sa = -Math.PI / 2;
    for (let i = 0; i < arms; i++) {
        const a = sa + i * step;
        const px = Math.sin(a), py = -Math.cos(a);
        pts.push([Math.cos(a) * 0.12 + px * 0.10, Math.sin(a) * 0.12 + py * 0.10]);
        pts.push([Math.cos(a) * 0.62 + px * 0.60, Math.sin(a) * 0.62 + py * 0.60]);
        pts.push([Math.cos(a),                     Math.sin(a)]);
        pts.push([Math.cos(a) * 0.62 - px * 0.60, Math.sin(a) * 0.62 - py * 0.60]);
        pts.push([Math.cos(a) * 0.12 - px * 0.10, Math.sin(a) * 0.12 - py * 0.10]);
    }
    return pts;
}

function makeStarCrossPts() {
    const pts = [];
    const arms = 4, step = Math.PI * 2 / arms, sa = -Math.PI / 2;
    for (let i = 0; i < arms; i++) {
        const a = sa + i * step;
        const px = Math.sin(a), py = -Math.cos(a);
        pts.push([Math.cos(a) * 0.12 + px * 0.12, Math.sin(a) * 0.12 + py * 0.12]);
        pts.push([Math.cos(a) * 0.82 + px * 0.50, Math.sin(a) * 0.82 + py * 0.50]);
        pts.push([Math.cos(a),                     Math.sin(a)]);
        pts.push([Math.cos(a) * 0.82 - px * 0.50, Math.sin(a) * 0.82 - py * 0.50]);
        pts.push([Math.cos(a) * 0.12 - px * 0.12, Math.sin(a) * 0.12 - py * 0.12]);
    }
    return pts;
}

// ── Cross shape definitions ────────────────────────────────────
const CROSS_SHAPES = [
    { arms:4,  armWidth:0.18, label:'Plus',     sa:-Math.PI/2 },
    { arms:4,  armWidth:0.33, label:'Fat Plus', sa:-Math.PI/2 },
    { arms:4,  armWidth:0.18, label:'X',        sa:-Math.PI/4 },
    { arms:4,  armWidth:0.33, label:'Fat X',    sa:-Math.PI/4 },
    { arms:3,  armWidth:0.25, label:'Y',        sa:-Math.PI/2 },
    { arms:3,  armWidth:0.42, label:'Fat Y',    sa:-Math.PI/2 },
    { arms:6,  armWidth:0.18, label:'6-Cross',  sa:0 },
    { arms:6,  armWidth:0.28, label:'Wide 6',   sa:0 },
    { arms:8,  armWidth:0.12, label:'8-Cross',  sa:0 },
    { arms:8,  armWidth:0.20, label:'Wide 8',   sa:0 },
    { arms:5,  armWidth:0.18, label:'5-Cross',  sa:-Math.PI/2 },
    { arms:12, armWidth:0.09, label:'12-Cross', sa:0 },
    { arms:10, armWidth:0.08, label:'10-Cross', sa:0 },
    { arms:10, armWidth:0.14, label:'Wide 10',  sa:0 },
    { arms:7,  armWidth:0.14, label:'7-Cross',  sa:-Math.PI/2 },
    { custom:true, label:'Snowflake',  pts: makeSnowflakePts() },
    { custom:true, label:'Pinwheel',   pts: makePinwheelPts() },
    { custom:true, label:'StarCross',  pts: makeStarCrossPts() },
    // Row 4 — more arm variants + custom
    { arms:3,  armWidth:0.14, label:'Thin Y',  sa:-Math.PI/2 },
    { arms:4,  armWidth:0.07, label:'Needle+', sa:-Math.PI/2 },
    { arms:5,  armWidth:0.30, label:'Wide 5',  sa:-Math.PI/2 },
    { arms:6,  armWidth:0.42, label:'Fat 6',   sa:0 },
    { arms:9,  armWidth:0.11, label:'9-Cross', sa:0 },
    { custom:true, label:'Triquetra', pts: makeTriquetraPts() },
];
let currentCrossShape = CROSS_SHAPES[0];

// ── Audio ──────────────────────────────────────────────────────
let audioCtx = null, masterGain = null, ballGain = null, reverbNode = null;
let audioMuted = false, ballSoundMuted = false;
let audioVol = 0.10, audioStarted = false, ballSoundVol = 0.02;
let soundsThisFrame = 0;
const MAX_SOUNDS_PER_FRAME = 3;

function startAudio() {
    if (audioStarted) return;
    audioStarted = true;
    try {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();

        // Long airy reverb — 4 s tail for deep space feel
        const revLen = Math.floor(audioCtx.sampleRate * 4.0);
        const revBuf = audioCtx.createBuffer(2, revLen, audioCtx.sampleRate);
        for (let ch = 0; ch < 2; ch++) {
            const d = revBuf.getChannelData(ch);
            for (let i = 0; i < revLen; i++)
                d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / revLen, 1.6);
        }
        reverbNode = audioCtx.createConvolver();
        reverbNode.buffer = revBuf;

        // Slow echo (0.9 s, 45 % feedback)
        const delay = audioCtx.createDelay(1.5);
        delay.delayTime.value = 0.90;
        const delayFB = audioCtx.createGain();
        delayFB.gain.value = 0.45;
        delay.connect(delayFB); delayFB.connect(delay);

        masterGain = audioCtx.createGain();
        masterGain.gain.value = audioMuted ? 0 : audioVol;
        reverbNode.connect(masterGain);
        delay.connect(masterGain);
        masterGain.connect(audioCtx.destination);

        ballGain = audioCtx.createGain();
        ballGain.gain.value = ballSoundMuted ? 0 : 1;
        ballGain.connect(audioCtx.destination);

        // Sub drone: 27.5 Hz sine with ultra-slow tremolo
        {
            const osc = audioCtx.createOscillator(), gn = audioCtx.createGain();
            const trem = audioCtx.createOscillator(), tremG = audioCtx.createGain();
            osc.type = 'sine'; osc.frequency.value = 27.5;
            trem.frequency.value = 0.05; tremG.gain.value = 0.012;
            trem.connect(tremG); tremG.connect(gn.gain);
            gn.gain.value = 0.032;
            osc.connect(gn); gn.connect(reverbNode);
            osc.start(); trem.start();
        }

        // Beating double drone: 55 Hz + 55.28 Hz → 0.28 Hz pulse
        [55, 55.28].forEach(f => {
            const osc = audioCtx.createOscillator(), gn = audioCtx.createGain();
            osc.type = 'sine'; osc.frequency.value = f;
            gn.gain.value = 0.020;
            osc.connect(gn); gn.connect(reverbNode); osc.start();
        });

        // Tri-pad cluster: three detuned triangle pairs + slow LFO swell
        const padLfo = audioCtx.createOscillator(), padLfoG = audioCtx.createGain();
        padLfo.frequency.value = 0.07; padLfoG.gain.value = 0.010;
        padLfo.connect(padLfoG); padLfo.start();
        [[110, 0.016], [164.8, 0.011], [220, 0.007]].forEach(([freq, gain]) => {
            const p1 = audioCtx.createOscillator(), p2 = audioCtx.createOscillator();
            const filt = audioCtx.createBiquadFilter(), pg = audioCtx.createGain();
            p1.type = p2.type = 'triangle';
            p1.frequency.value = freq; p2.frequency.value = freq * 1.0055;
            filt.type = 'lowpass'; filt.frequency.value = freq * 2.8; filt.Q.value = 0.8;
            pg.gain.value = gain;
            padLfoG.connect(pg.gain);
            p1.connect(filt); p2.connect(filt); filt.connect(pg); pg.connect(reverbNode);
            p1.start(); p2.start();
        });

        // Bandpass space shimmer: looped noise through narrow BP filter
        {
            const nLen = Math.floor(audioCtx.sampleRate * 3);
            const nBuf = audioCtx.createBuffer(1, nLen, audioCtx.sampleRate);
            const nd = nBuf.getChannelData(0);
            for (let i = 0; i < nLen; i++) nd[i] = Math.random() * 2 - 1;
            const src = audioCtx.createBufferSource(), gn = audioCtx.createGain();
            const bp  = audioCtx.createBiquadFilter();
            src.buffer = nBuf; src.loop = true;
            bp.type = 'bandpass'; bp.frequency.value = 2800; bp.Q.value = 10;
            gn.gain.value = 0.0035;
            src.connect(bp); bp.connect(gn); gn.connect(reverbNode); src.start();
        }

        scheduleMelody(delay);
    } catch (e) { console.warn('Audio unavailable', e); }
}

// Minor-pentatonic + tritone colour notes across five octaves
const SCALE = [55, 65.4, 73.4, 82.4, 98, 110, 130.8, 146.8, 164.8, 196,
               220, 261.6, 293.7, 329.6, 392, 440, 523.3, 587.3, 659.3, 784, 880, 1046.5];

function playNote(dest, freq, vol = 0.036, dur = 3.5) {
    if (!audioCtx || audioMuted) return;
    const o1 = audioCtx.createOscillator(), o2 = audioCtx.createOscillator();
    const filt = audioCtx.createBiquadFilter(), env = audioCtx.createGain();
    o1.type = o2.type = 'sine';
    o1.frequency.value = freq; o2.frequency.value = freq * 1.0028; // subtle chorus
    filt.type = 'lowpass'; filt.frequency.value = Math.min(freq * 4, 3200); filt.Q.value = 0.7;
    const t = audioCtx.currentTime;
    env.gain.setValueAtTime(0, t);
    env.gain.linearRampToValueAtTime(vol, t + 0.70);        // slow fade-in
    env.gain.setValueAtTime(vol, t + dur - 1.0);
    env.gain.exponentialRampToValueAtTime(0.0001, t + dur); // slow fade-out
    o1.connect(filt); o2.connect(filt); filt.connect(env); env.connect(dest);
    o1.start(t); o1.stop(t + dur + 0.1);
    o2.start(t); o2.stop(t + dur + 0.1);
}

function scheduleMelody(dest) {
    const freq = SCALE[Math.floor(Math.random() * SCALE.length)];
    const dur  = 3.5 + Math.random() * 3.5;
    playNote(dest, freq, 0.026 + Math.random() * 0.020, dur);
    // Occasional soft fifth harmony
    if (Math.random() < 0.35)
        setTimeout(() => playNote(dest, freq * 1.5, 0.015, dur * 0.8), 700 + Math.random() * 1300);
    // Sparse onset: 2.5–6 s gap
    setTimeout(() => scheduleMelody(dest), 2500 + Math.random() * 3500);
}

function playBallHit(speed, ballX) {
    if (!audioCtx || ballSoundMuted || !ballGain || ballSoundVol <= 0) return;
    if (soundsThisFrame >= MAX_SOUNDS_PER_FRAME) return;
    soundsThisFrame++;
    const osc = audioCtx.createOscillator();
    const env = audioCtx.createGain();
    const pan = audioCtx.createStereoPanner();
    pan.pan.value = Math.max(-1, Math.min(1, (ballX - cx) / SHAPE_R));
    osc.type = 'sine';
    osc.frequency.value = Math.min(200 + speed * 38, 1800);
    const t   = audioCtx.currentTime;
    const vol = ballSoundVol * 0.22;
    env.gain.setValueAtTime(vol, t);
    env.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
    osc.connect(env); env.connect(pan); pan.connect(ballGain);
    osc.start(t); osc.stop(t + 0.11);
}

const kickAudio = () => { startAudio(); audioCtx && audioCtx.resume(); };
['pointerdown', 'keydown'].forEach(ev => document.addEventListener(ev, kickAudio, { once: true }));

document.addEventListener('visibilitychange', () => {
    if (!audioCtx || !masterGain) return;
    masterGain.gain.value = (!audioMuted && !document.hidden) ? audioVol : 0;
});

document.getElementById('muteBtn').addEventListener('click', function () {
    kickAudio();
    audioMuted = !audioMuted;
    if (masterGain) masterGain.gain.value = audioMuted ? 0 : audioVol;
    this.classList.toggle('muted', audioMuted);
    saveSettings();
});

document.getElementById('ballMuteBtn').addEventListener('click', function () {
    ballSoundMuted = !ballSoundMuted;
    if (ballGain) ballGain.gain.value = ballSoundMuted ? 0 : 1;
    this.classList.toggle('muted', ballSoundMuted);
    saveSettings();
});

const sVolumeEl = document.getElementById('sVolume');
sVolumeEl.addEventListener('input', function () {
    kickAudio();
    audioVol = +this.value / 100;
    if (masterGain && !audioMuted) masterGain.gain.value = audioVol;
    trackBg(this);
    saveSettings();
});

// ── Physics state ──────────────────────────────────────────────
shapeSpinSign = 1; innerSpinSign = 1;
crossHoleTip = null; crossHoleHalf = 2;
crossHoleArmIdx = 0; crossHoleNextChange = 0; crossHoleInterval = 5000;
crossHoleLocalAngle = null;
logoArmIdx = 0; logoNextChange = 0; logoLocalAngle = null;
gameSpeed = 1;

function getCrossTipCenter(iVerts) {
    const n = iVerts.length;
    let maxD = 0, tipX = cx, tipY = cy, capIdx = 0;
    for (let i = 0; i < n; i++) {
        const a = iVerts[i], b = iVerts[(i + 1) % n];
        const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
        const d = Math.hypot(mx - cx, my - cy);
        if (d > maxD) { maxD = d; tipX = mx; tipY = my; capIdx = i; }
    }
    return { x: tipX, y: tipY, capIdx };
}

// Per-frame cache for custom arm tips (reset at start of update/draw)
let _armTipsCache = null;

// For custom shapes: find all arm tips as local distance maxima
function getCustomArmTips(iVerts) {
    if (_armTipsCache) return _armTipsCache;
    const n = iVerts.length;
    const dists = iVerts.map((v, i) => {
        const b = iVerts[(i + 1) % n];
        const mx = (v.x + b.x) / 2, my = (v.y + b.y) / 2;
        return { mx, my, d: Math.hypot(mx - cx, my - cy), idx: i };
    });
    const threshold = INNER_R * 0.55;
    const tips = [];
    for (let i = 0; i < n; i++) {
        const prev = dists[(i - 1 + n) % n].d;
        const curr = dists[i].d;
        const next = dists[(i + 1) % n].d;
        if (curr >= prev && curr > next && curr > threshold) {
            tips.push({ x: dists[i].mx, y: dists[i].my, capIdx: dists[i].idx });
        }
    }
    _armTipsCache = tips.length > 0 ? tips : [getCrossTipCenter(iVerts)];
    return _armTipsCache;
}

function getCrossTipForArm(iVerts, armIdx) {
    const shape = currentCrossShape;
    if (shape.custom || !shape.arms) {
        const tips = getCustomArmTips(iVerts);
        return tips[armIdx % tips.length] || tips[0];
    }
    const n = iVerts.length;
    // Clamp into range: lastInnerVerts may briefly belong to a cross with
    // fewer vertices than the current one (e.g. during rapid randomization).
    const capIdx = ((armIdx % shape.arms) * 3) % n;
    const a = iVerts[capIdx], b = iVerts[(capIdx + 1) % n];
    if (!a || !b) return getCrossTipCenter(iVerts);
    return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, capIdx };
}

// Angle-stable hole tip: avoids per-frame vertex-index flicker on spiky crosses
function getCrossHoleTipFromAngle(iVerts) {
    const worldAngle = crossHoleLocalAngle + innerShapeAngle;
    const n = iVerts.length;
    const threshold = INNER_R * 0.55;
    let bestIdx = 0, bestDiff = Infinity;
    for (let i = 0; i < n; i++) {
        const a = iVerts[i], b = iVerts[(i + 1) % n];
        const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
        if (Math.hypot(mx - cx, my - cy) < threshold) continue;
        let diff = Math.abs(Math.atan2(my - cy, mx - cx) - worldAngle);
        if (diff > Math.PI) diff = Math.PI * 2 - diff;
        if (diff < bestDiff) { bestDiff = diff; bestIdx = i; }
    }
    const a = iVerts[bestIdx], b = iVerts[(bestIdx + 1) % n];
    return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, capIdx: bestIdx };
}

// ── Ball sprites ───────────────────────────────────────────────
function makeBallSprite(h, s, l, r) {
    const sz  = Math.ceil(r * 2) + 2;
    const oc  = (typeof OffscreenCanvas !== 'undefined')
        ? new OffscreenCanvas(sz, sz)
        : Object.assign(document.createElement('canvas'), { width: sz, height: sz });
    const oc2 = oc.getContext('2d');
    const o   = 1;
    const gr  = oc2.createRadialGradient(
        o + r - r * .32, o + r - r * .36, r * .06,
        o + r, o + r, r
    );
    gr.addColorStop(0,   '#fff');
    gr.addColorStop(0.3, `hsl(${h},${s}%,${l + 10}%)`);
    gr.addColorStop(1,   `hsl(${h},${s}%,${l - 22}%)`);
    oc2.beginPath();
    oc2.arc(o + r, o + r, r, 0, Math.PI * 2);
    oc2.fillStyle = gr;
    oc2.fill();
    // Asymmetric arc for visible spin
    oc2.save();
    oc2.beginPath();
    oc2.arc(o + r, o + r, r - 0.5, 0, Math.PI * 2);
    oc2.clip();
    oc2.globalAlpha = 0.44;
    oc2.strokeStyle = `hsl(${(h + 55) % 360},90%,90%)`;
    oc2.lineWidth   = Math.max(0.7, r * 0.14);
    oc2.lineCap     = 'round';
    oc2.beginPath();
    oc2.arc(o + r, o + r, r * 0.56, -Math.PI * 0.62, Math.PI * 0.28);
    oc2.stroke();
    oc2.restore();
    return oc;
}

// ── Ball factory ───────────────────────────────────────────────
function makeBall() {
    const a = Math.random() * Math.PI * 2;
    const d = Math.random() * SHAPE_R * 0.72;
    const { h, s, l } = currentBallTheme.getHSL();
    const r = Math.max(1, BALL_R + (Math.random() * 2 - 1) * sizeRandomness * BALL_R * 0.15);
    return {
        h, s, l, r,
        x: cx + Math.cos(a) * d,
        y: cy + Math.sin(a) * d,
        vx: (Math.random() * 2 - 1) * 4,
        vy: (Math.random() * 2 - 1) * 4,
        omega: 0, angle: 0,
        insideCross: false,
        escaped: false,
        sprite: makeBallSprite(h, s, l, r),
    };
}
// ── SVG icon helpers ───────────────────────────────────────────
const NS = 'http://www.w3.org/2000/svg';

function iconCrossPoints(shape) {
    const R = 13, O = 16;
    if (shape.custom) {
        return shape.pts.map(([nx, ny]) =>
            `${(O + nx * R * 0.85).toFixed(2)},${(O + ny * R * 0.85).toFixed(2)}`
        ).join(' ');
    }
    const { arms, armWidth, sa } = shape;
    const wr = armWidth * R;
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

function iconPoints(shape, R, ox, oy) {
    if (shape.custom) {
        const ca = Math.cos(shape.sa || 0), sinA = Math.sin(shape.sa || 0);
        return shape.pts.map(([nx, ny]) => {
            const rx = (nx * ca - ny * sinA) * R * 0.85;
            const ry = (nx * sinA + ny * ca)  * R * 0.85;
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

// ── Shape button grid ──────────────────────────────────────────
const shapeGrid = document.getElementById('shape-grid');

SHAPES.forEach(shape => {
    const btn = document.createElement('button');
    btn.className = 'shape-btn' + (shape === currentShape ? ' active' : '');
    btn.title = shape.label;
    btn.dataset.i18nTitle = shape.label;
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', '0 0 32 32');
    let el;
    if (!shape.custom && shape.sides === 0) {
        el = document.createElementNS(NS, 'circle');
        el.setAttribute('cx', '16'); el.setAttribute('cy', '16'); el.setAttribute('r', '13');
    } else {
        el = document.createElementNS(NS, 'polygon');
        el.setAttribute('points', iconPoints(shape, 13, 16, 16));
    }
    svg.appendChild(el);
    btn.appendChild(svg);
    btn.addEventListener('click', () => {
        shapeGrid.querySelectorAll('.shape-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentShape = shape;
        const verts = shapeVerts(shapeAngle);
        for (let i = 0, len = balls.length; i < len; i++) {
            const b = balls[i];
            if (!b.escaped && !insidePoly(b.x, b.y, verts)) b.escaped = true;
        }
        saveSettings();
    });
    shapeGrid.appendChild(btn);
});

// ── Settings ───────────────────────────────────────────────────
const DEFAULTS = {
    balls:100, ballSize:_defaultR, gravity:5, ballSpeed:5, shapeSpeed:2, shapeSize:50,
    volume:10, ballSound:2, crossSize:50, crossSpeed:1,
    animSpeed:50, fogTrail:0, sizeRandomness:0, gravityAngle:0, gameSpeed:1, crossHole:false, crossHoleSize:1, crossHoleTimeout:5,
    shapeIdx:3, crossIdx:0,
    themeId:'cyber', ballThemeId:'standard', fogThemeId:'standard',
    audioMuted:false, ballSoundMuted:false,
};

let _suppressSave = false;

function saveSettings() {
    if (_suppressSave) return;
    localStorage.setItem('bb', JSON.stringify({
        balls:         +document.getElementById('sBalls').value,
        ballSize:      +document.getElementById('sBallSize').value,
        gravity:       +document.getElementById('sGravity').value,
        ballSpeed:     +document.getElementById('sBallSpeed').value,
        shapeSpeed:    +document.getElementById('sShapeSpeed').value,
        shapeSize:     +document.getElementById('sShapeSize').value,
        volume:        +document.getElementById('sVolume').value,
        ballSound:     +document.getElementById('sBallSound').value,
        crossSize:     +document.getElementById('sCrossSize').value,
        crossSpeed:    +document.getElementById('sCrossSpeed').value,
        animSpeed:     +document.getElementById('sAnimSpeed').value,
        gravityAngle:  +document.getElementById('sGravityAngle').value,
        fogTrail:      +document.getElementById('sFogTrail').value,
        sizeRandomness:+document.getElementById('sSizeRandom').value,
        shapeIdx:      SHAPES.indexOf(currentShape),
        crossIdx:      CROSS_SHAPES.indexOf(currentCrossShape),
        themeId:       currentTheme.id,
        ballThemeId:   currentBallTheme.id,
        fogThemeId:    currentFogTheme.id,
        audioMuted, ballSoundMuted,
        shapeDir: shapeSpinSign,
        crossDir: innerSpinSign,
        crossHole: crossHoleEnabled,
        crossHoleSize: crossHoleHalf,
        crossHoleTimeout: Math.min(crossHoleInterval / 1000, 10),
        gameSpeed:     +document.getElementById('sGameSpeed').value,
    }));
}

function applySettings(s) {
    _suppressSave = true;
    // Restore direction signs before sliders fire (sliders use signs)
    if (s.shapeDir != null) shapeSpinSign = s.shapeDir;
    if (s.crossDir != null) innerSpinSign = s.crossDir;
    const set = (id, val) => {
        if (val == null) return;
        const el = document.getElementById(id);
        if (el) { el.value = val; el.dispatchEvent(new Event('input')); }
    };
    set('sBalls',       s.balls);
    set('sBallSize',    s.ballSize);
    set('sGravity',     s.gravity);
    set('sBallSpeed',   s.ballSpeed);
    set('sShapeSpeed',  s.shapeSpeed);
    set('sShapeSize',   s.shapeSize);
    set('sCrossSize',   s.crossSize);
    set('sCrossSpeed',  s.crossSpeed);
    set('sAnimSpeed',   s.animSpeed ?? 50);
    set('sGravityAngle', s.gravityAngle ?? 0);
    set('sGameSpeed',   s.gameSpeed ?? 1);
    set('sFogTrail',    s.fogTrail);
    set('sSizeRandom',  s.sizeRandomness);
    if (s.volume != null) {
        const el = document.getElementById('sVolume');
        el.value = s.volume; audioVol = s.volume / 100; trackBg(el);
    }
    if (s.ballSound != null) {
        const el = document.getElementById('sBallSound');
        el.value = s.ballSound; ballSoundVol = s.ballSound / 100; trackBg(el);
    }
    if (s.audioMuted != null && s.audioMuted !== audioMuted) {
        audioMuted = s.audioMuted;
        if (masterGain) masterGain.gain.value = audioMuted ? 0 : audioVol;
        document.getElementById('muteBtn').classList.toggle('muted', audioMuted);
    }
    if (s.ballSoundMuted != null && s.ballSoundMuted !== ballSoundMuted) {
        ballSoundMuted = s.ballSoundMuted;
        if (ballGain) ballGain.gain.value = ballSoundMuted ? 0 : 1;
        document.getElementById('ballMuteBtn').classList.toggle('muted', ballSoundMuted);
    }
    if (s.shapeIdx != null) shapeGrid.querySelectorAll('.shape-btn')[s.shapeIdx]?.click();
    if (s.crossIdx != null) document.querySelectorAll('#cross-grid .shape-btn')[s.crossIdx]?.click();
    if (s.themeId)    { const t = THEMES.find(x => x.id === s.themeId);       if (t) setTheme(t);          }
    if (s.ballThemeId){ const t = BALL_THEMES.find(x => x.id === s.ballThemeId); if (t) setBallTheme(t, false); }
    if (s.fogThemeId) { const t = FOG_THEMES.find(x => x.id === s.fogThemeId);   if (t) setFogTheme(t, false);  }
    if (s.crossHole != null) {
        crossHoleEnabled = !!s.crossHole;
        document.getElementById('crossHoleCheck').checked = crossHoleEnabled;
        if (!crossHoleEnabled) {
            for (let i = 0, len = balls.length; i < len; i++) balls[i].insideCross = false;
        }
    }
    updateVisibility();
    if (s.crossHoleSize != null) {
        crossHoleHalf = Math.max(1, s.crossHoleSize);
        const el = document.getElementById('sCrossHoleSize');
        el.value = crossHoleHalf; trackBg(el);
    }
    if (s.crossHoleTimeout != null) {
        const v = Math.min(Math.max(0, s.crossHoleTimeout), 10);
        crossHoleInterval = v * 1000;
        const el = document.getElementById('sCrossHoleTimeout');
        if (el) {
            el.value = v; trackBg(el);
            const str = STRINGS[currentLang] || STRINGS.en;
            document.getElementById('vCrossHoleTimeout').textContent = v === 0 ? (str.none || 'None') : (v + 's');
        }
    }
    // Refresh direction indicators after all settings applied
    updateDirBtn('dirShapeL', 'dirShapeR', shapeSpinSign >= 0);
    updateDirBtn('dirCrossL', 'dirCrossR', innerSpinSign < 0);
    _suppressSave = false;
}

function loadSettings() {
    try {
        const s = JSON.parse(localStorage.getItem('bb'));
        if (s) applySettings(s);
    } catch (_) {}
}

// ── Slider helper ──────────────────────────────────────────────
function trackBg(el) {
    const pct = ((el.value - el.min) / (el.max - el.min)) * 100;
    el.style.background = `linear-gradient(to right,${currentTheme.accent} ${pct}%,${currentTheme.trackEmpty} ${pct}%)`;
}

function slider(id, valId, fn) {
    const el  = document.getElementById(id);
    const vEl = document.getElementById(valId);
    const upd = () => { vEl.textContent = el.value; trackBg(el); fn(+el.value); saveSettings(); };
    el.addEventListener('input', upd);
    vEl.textContent = el.value; trackBg(el); fn(+el.value);
}

slider('sBalls',      'vBalls',      v => { while (balls.length < v) balls.push(makeBall()); balls.length = v; });
slider('sBallSize',   'vBallSize',   v => {
    BALL_R = v;
    for (let i = 0, len = balls.length; i < len; i++) {
        const b = balls[i]; b.r = clampedR(); b.sprite = makeBallSprite(b.h, b.s, b.l, b.r);
    }
});
slider('sSizeRandom', 'vSizeRandom', v => {
    sizeRandomness = v;
    for (let i = 0, len = balls.length; i < len; i++) {
        const b = balls[i]; b.r = clampedR(); b.sprite = makeBallSprite(b.h, b.s, b.l, b.r);
    }
});
{
    const el = document.getElementById('sAnimSpeed');
    const vAnimEl = document.getElementById('vAnimSpeed');
    el.addEventListener('input', () => {
        vAnimEl.textContent = el.value;
        setAnimSpeed(+el.value); trackBg(el); saveSettings();
    });
    vAnimEl.textContent = el.value;
    trackBg(el); setAnimSpeed(+el.value);
}
slider('sFogTrail', 'vFogTrail', v => {
    trailLength = v;
    if (!v) for (let i = 0, len = balls.length; i < len; i++) balls[i].trail = null;
});
slider('sGravity',    'vGravity',    v => { gravity = v * 0.026; });
slider('sGravityAngle', 'vGravityAngle', v => { gravityAngle = v; });
slider('sBallSpeed',  'vBallSpeed',  v => { maxBallSpeed = v * 3; });
slider('sShapeSpeed', 'vShapeSpeed', v => { spin = v * 0.0026 * shapeSpinSign; });
slider('sShapeSize', 'vShapeSize', v => {
    shapeSize = v; updateRadius(); rebuildBgCanvas();
    for (let i = 0; i < balls.length; i++) respawnBall(balls[i]);
});

document.getElementById('sBallSound').addEventListener('input', function () {
    ballSoundVol = +this.value / 100;
    trackBg(this);
    saveSettings();
});
trackBg(sVolumeEl);
trackBg(document.getElementById('sBallSound'));
trackBg(document.getElementById('sCrossHoleSize'));
trackBg(document.getElementById('sCrossHoleTimeout'));

function clampedR() {
    return Math.max(1, BALL_R + (Math.random() * 2 - 1) * sizeRandomness * BALL_R * 0.15);
}

// ── Animation speed ────────────────────────────────────────────
function setAnimSpeed(v) {
    // v=50 → 1× normal; v=100 → 2×; v=1 → ~0×
    bgAnimMult = v / 50;
}

// ── Game speed ─────────────────────────────────────────────────
{
    const el  = document.getElementById('sGameSpeed');
    const vEl = document.getElementById('vGameSpeed');
    el.addEventListener('input', () => {
        gameSpeed = +el.value;
        vEl.textContent = gameSpeed + '×';
        trackBg(el); saveSettings();
    });
    vEl.textContent = el.value + '×';
    trackBg(el);
}

// ── Dynamic hole size max ──────────────────────────────────────
function updateHoleSizeMax() {
    const iV = innerShapeVerts(innerShapeAngle);
    const n  = iV.length;
    const maxHalf = Math.max(1, Math.floor((n - 2) / 2));
    const el = document.getElementById('sCrossHoleSize');
    el.max = maxHalf;
    if (+el.value > maxHalf) {
        el.value = maxHalf;
        crossHoleHalf = maxHalf;
    }
    trackBg(el);
}

// ── Random Themes cycle ────────────────────────────────────────
let _cycleTimer = null, _cycleActive = false;

function scheduleNextCycle() {
    _cycleTimer = setTimeout(() => {
        if (!_cycleActive) return;
        _suppressSave = true;
        setTheme(THEMES[Math.floor(Math.random() * THEMES.length)]);
        setBallTheme(BALL_THEMES[Math.floor(Math.random() * BALL_THEMES.length)]);
        _suppressSave = false;
        saveSettings();
        scheduleNextCycle();
    }, 20000 + Math.random() * 20000);
}

document.getElementById('rndThemesCheck').addEventListener('change', function() {
    _cycleActive = this.checked;
    clearTimeout(_cycleTimer);
    _cycleTimer = null;
    if (_cycleActive) {
        _suppressSave = true;
        setTheme(THEMES[Math.floor(Math.random() * THEMES.length)]);
        setBallTheme(BALL_THEMES[Math.floor(Math.random() * BALL_THEMES.length)]);
        _suppressSave = false;
        scheduleNextCycle();
    }
    saveSettings();
});

// ── Random Background cycle ────────────────────────────────────
let _bgCycleTimer = null, _bgCycleActive = false;

function scheduleNextBgCycle() {
    _bgCycleTimer = setTimeout(() => {
        if (!_bgCycleActive) return;
        _suppressSave = true;
        setFogTheme(FOG_THEMES[Math.floor(Math.random() * FOG_THEMES.length)]);
        _suppressSave = false;
        saveSettings();
        scheduleNextBgCycle();
    }, 20000 + Math.random() * 20000);
}

document.getElementById('rndBgCheck').addEventListener('change', function() {
    _bgCycleActive = this.checked;
    clearTimeout(_bgCycleTimer);
    _bgCycleTimer = null;
    if (_bgCycleActive) {
        _suppressSave = true;
        setFogTheme(FOG_THEMES[Math.floor(Math.random() * FOG_THEMES.length)]);
        _suppressSave = false;
        scheduleNextBgCycle();
    }
    saveSettings();
});

// ── Manual hole cycle button ───────────────────────────────────
document.getElementById('holeCycleBtn').addEventListener('click', () => {
    if (!crossHoleEnabled) return;
    const iV0 = lastInnerVerts || innerShapeVerts(innerShapeAngle);
    const numArms = currentCrossShape.custom
        ? getCustomArmTips(iV0).length
        : (currentCrossShape.arms || 4);
    crossHoleArmIdx = (crossHoleArmIdx + 1) % numArms;
    crossHoleNextChange = performance.now() + crossHoleInterval;
    crossHoleLocalAngle = null; // re-lock on next update()
});

// ── Cross Hole toggle ──────────────────────────────────────────
document.getElementById('crossHoleCheck').addEventListener('change', function() {
    crossHoleEnabled = this.checked;
    updateVisibility();
    if (crossHoleEnabled) {
        crossHoleArmIdx = 0;
        crossHoleLocalAngle = null;
        crossHoleNextChange = performance.now() + crossHoleInterval;
        const iVerts = lastInnerVerts || innerShapeVerts(innerShapeAngle);
        const target = Math.max(3, Math.floor(balls.length * 0.05));
        let seeded = 0;
        for (let attempt = 0; seeded < target && attempt < 400; attempt++) {
            const a = Math.random() * Math.PI * 2, d = INNER_R * (0.2 + Math.random() * 0.55);
            const x = cx + Math.cos(a) * d, y = cy + Math.sin(a) * d;
            if (insidePoly(x, y, iVerts)) {
                let b = null;
                for (let i = 0, len = balls.length; i < len; i++) {
                    if (!balls[i].insideCross) { b = balls[i]; break; }
                }
                if (!b) break;
                b.x = x; b.y = y;
                b.vx = (Math.random() * 2 - 1) * 6;
                b.vy = (Math.random() * 2 - 1) * 6;
                b.insideCross = true;
                seeded++;
            }
        }
    } else {
        for (let i = 0, len = balls.length; i < len; i++) balls[i].insideCross = false;
    }
    saveSettings();
});

// ── Cross Hole size slider ──────────────────────────────────────
document.getElementById('sCrossHoleSize').addEventListener('click', e => e.stopPropagation());
document.getElementById('sCrossHoleSize').addEventListener('input', function() {
    crossHoleHalf = parseInt(this.value, 10);
    trackBg(this);
    saveSettings();
});

document.getElementById('sCrossHoleTimeout').addEventListener('click', e => e.stopPropagation());
document.getElementById('sCrossHoleTimeout').addEventListener('input', function() {
    const v = parseInt(this.value, 10);
    crossHoleInterval = v * 1000;
    const s = STRINGS[currentLang] || STRINGS.en;
    document.getElementById('vCrossHoleTimeout').textContent = v === 0 ? (s.none || 'None') : (v + 's');
    if (crossHoleEnabled && v > 0) crossHoleNextChange = performance.now() + crossHoleInterval;
    trackBg(this);
    saveSettings();
});

// ── Pause / Resume ─────────────────────────────────────────────
const ICON_PAUSE = `<svg width="11" height="13" viewBox="0 0 11 13" fill="currentColor"><rect x="0.5" y="0.5" width="3.5" height="12" rx="1.5"/><rect x="7" y="0.5" width="3.5" height="12" rx="1.5"/></svg>`;
const ICON_PLAY  = `<svg width="11" height="13" viewBox="0 0 11 13" fill="currentColor"><path d="M1.5 1 L10.5 6.5 L1.5 12 Z"/></svg>`;
let paused = false;
const pauseBtn = document.getElementById('pauseBtn');

pauseBtn.addEventListener('click', () => {
    paused = !paused;
    pauseBtn.innerHTML = paused ? ICON_PLAY : ICON_PAUSE;
    const s = STRINGS[currentLang] || STRINGS.en;
    pauseBtn.title = paused ? s.resumeSim : s.pauseSim;
    pauseBtn.classList.toggle('paused', paused);
});

// ── Physics helpers ────────────────────────────────────────────
// ── Global pools to minimize GC pressure ────────────────────────
const _vertsPool = Array.from({ length: 256 }, () => ({ x: 0, y: 0 }));
const _innerVertsPool = Array.from({ length: 256 }, () => ({ x: 0, y: 0 }));
let _vertsCount = 0;
let _innerVertsCount = 0;

function shapeVerts(angle) {
    if (currentShape.custom) {
        const { pts } = currentShape;
        const ca = Math.cos(angle), sa = Math.sin(angle);
        _vertsCount = pts.length;
        for (let i = 0; i < _vertsCount; i++) {
            const pt = pts[i];
            const v = _vertsPool[i];
            v.x = cx + (pt[0] * ca - pt[1] * sa) * SHAPE_R;
            v.y = cy + (pt[0] * sa + pt[1] * ca) * SHAPE_R;
        }
        return _vertsPool.slice(0, _vertsCount);
    }
    const { sides, star, ir = 0.4 } = currentShape;
    const n = sides === 0 ? 48 : sides;
    if (star) {
        _vertsCount = n * 2;
        for (let i = 0; i < _vertsCount; i++) {
            const r = i % 2 === 0 ? SHAPE_R : SHAPE_R * ir;
            const a = angle + i * Math.PI / n;
            const v = _vertsPool[i];
            v.x = cx + r * Math.cos(a);
            v.y = cy + r * Math.sin(a);
        }
        return _vertsPool.slice(0, _vertsCount);
    }
    _vertsCount = n;
    const step = 2 * Math.PI / n;
    for (let i = 0; i < n; i++) {
        const a = angle + i * step;
        const v = _vertsPool[i];
        v.x = cx + SHAPE_R * Math.cos(a);
        v.y = cy + SHAPE_R * Math.sin(a);
    }
    return _vertsPool.slice(0, _vertsCount);
}

function innerShapeVerts(angle) {
    const shape = currentCrossShape;
    const r = INNER_R;
    if (shape.custom) {
        const ca = Math.cos(angle), sa = Math.sin(angle);
        const pts = shape.pts;
        _innerVertsCount = pts.length;
        for (let i = 0; i < _innerVertsCount; i++) {
            const pt = pts[i];
            const v = _innerVertsPool[i];
            v.x = cx + (pt[0] * ca - pt[1] * sa) * r;
            v.y = cy + (pt[0] * sa + pt[1] * ca) * r;
        }
        return _innerVertsPool.slice(0, _innerVertsCount);
    }
    const { arms, armWidth } = shape;
    const wr = armWidth * r;
    const step = 2 * Math.PI / arms, sinStep = Math.sin(step);
    _innerVertsCount = arms * 3;
    for (let i = 0; i < arms; i++) {
        const a = angle + i * step, b = a + step;
        const v1 = _innerVertsPool[i * 3];
        const v2 = _innerVertsPool[i * 3 + 1];
        const v3 = _innerVertsPool[i * 3 + 2];
        v1.x = cx + r * Math.cos(a) + wr * Math.sin(a);
        v1.y = cy + r * Math.sin(a) - wr * Math.cos(a);
        v2.x = cx + r * Math.cos(a) - wr * Math.sin(a);
        v2.y = cy + r * Math.sin(a) + wr * Math.cos(a);
        v3.x = cx + wr * (Math.cos(a) + Math.cos(b)) / sinStep;
        v3.y = cy + wr * (Math.sin(a) + Math.sin(b)) / sinStep;
    }
    return _innerVertsPool.slice(0, _innerVertsCount);
}

function insidePoly(px, py, verts) {
    let inside = false;
    for (let i = 0, j = verts.length - 1; i < verts.length; j = i++) {
        const { x: xi, y: yi } = verts[i], { x: xj, y: yj } = verts[j];
        if ((yi > py) !== (yj > py) && px < (xj - xi) * (py - yi) / (yj - yi) + xi)
            inside = !inside;
    }
    return inside;
}

function respawnBall(ball) {
    const a = Math.random() * Math.PI * 2, d = Math.random() * SHAPE_R * 0.28;
    ball.x  = cx + Math.cos(a) * d;
    ball.y  = cy + Math.sin(a) * d;
    ball.vx = (Math.random() * 2 - 1) * 3;
    ball.vy = (Math.random() * 2 - 1) * 3;
    ball.omega = 0;
    ball.insideCross = false;
    ball.escaped = false;
    ball.trail = null;
}

// Hole mask: for cross shape with hole, skip collisions on hole arm
// ci = cap index of hole tip, half = half-width of hole in segments
function shouldSkipCollision(i, n, ci, half) {
    if (ci < 0) return false;
    let d = (i - ci + n) % n;
    if (d > n - d) d = n - d;
    return d <= half;
}

// Shared wall collision handler with optional hole mask
function handleWallCollision(ball, verts, wallSpin, holeMask = null) {
    const n = verts.length, cx_v = cx, cy_v = cy;
    for (let i = 0; i < n; i++) {
        if (holeMask && shouldSkipCollision(i, n, holeMask.ci, holeMask.half)) continue;
        const a = verts[i], b = verts[(i + 1) % n];
        const edx = b.x - a.x, edy = b.y - a.y, lenSq = edx * edx + edy * edy;
        if (lenSq < 0.0001) continue;
        const t = Math.max(0, Math.min(1, ((ball.x - a.x) * edx + (ball.y - a.y) * edy) / lenSq));
        const cpx = a.x + t * edx, cpy = a.y + t * edy;
        const dx = ball.x - cpx, dy = ball.y - cpy, d2 = dx * dx + dy * dy, r = ball.r;
        if (d2 < r * r && d2 > 0) {
            const dist = Math.sqrt(d2), nx = dx / dist, ny = dy / dist;
            const evx = -wallSpin * (cpy - cy_v), evy = wallSpin * (cpx - cx_v);
            const dvx = ball.vx - evx, dvy = ball.vy - evy, vn = dvx * nx + dvy * ny;
            if (vn < 0) {
                ball.vx -= BOUNCE_RESTITUTION * vn * nx; ball.vy -= BOUNCE_RESTITUTION * vn * ny;
                const tx = -ny, ty = nx, vt = dvx * tx + dvy * ty - ball.omega * r, fj = FRICTION_FACTOR * vt;
                ball.vx -= fj * tx; ball.vy -= fj * ty; ball.omega += fj / r;
                playBallHit(Math.hypot(ball.vx, ball.vy), ball.x);
                if (Math.abs(vn) > 1.5) addSparks(ball, cpx, cpy);
            }
            ball.x += nx * (r - dist); ball.y += ny * (r - dist);
        }
    }
}

// Wrapper for outer shape collisions (no hole)
function wallCollide(ball, verts, wallSpin) {
    handleWallCollision(ball, verts, wallSpin, null);
}

// Wrapper for inner cross shape with optional hole
function crossWallCollide(ball, verts, wallSpin) {
    const ci = crossHoleTip ? crossHoleTip.capIdx : -1;
    const half = crossHoleHalf;
    handleWallCollision(ball, verts, wallSpin, {ci: ci, half: half});
}

function containBallOutside(ball, iv) {
    if (insidePoly(ball.x, ball.y, iv)) {
        const dx = ball.x - cx, dy = ball.y - cy, d = Math.hypot(dx, dy) || 1, nx = dx / d, ny = dy / d;
        const vn = ball.vx * nx + ball.vy * ny;
        if (vn < 0) { ball.vx -= BOUNCE_RESTITUTION * vn * nx; ball.vy -= BOUNCE_RESTITUTION * vn * ny; }
        ball.x += nx * ball.r * 2; ball.y += ny * ball.r * 2;
    }
}

function boundarySafety(b) {
    const R_s = SHAPE_R * (currentShape.custom ? 1.5 : 1.0), dx = b.x - cx, dy = b.y - cy, d = Math.hypot(dx, dy);
    if (d > R_s - b.r && d > 0) {
        const nx = dx / d, ny = dy / d;
        b.x = cx + nx * (R_s - b.r - 0.5); b.y = cy + ny * (R_s - b.r - 0.5);
        const vn = b.vx * nx + b.vy * ny;
        if (vn > 0) { b.vx -= BOUNDARY_BOUNCE * vn * nx; b.vy -= BOUNDARY_BOUNCE * vn * ny; }
    }
}

function containBall(b, v) {
    if (!insidePoly(b.x, b.y, v)) {
        const dx = cx - b.x, dy = cy - b.y, d = Math.hypot(dx, dy) || 1, nx = dx / d, ny = dy / d;
        const vn = b.vx * nx + b.vy * ny;
        if (vn < 0) { b.vx -= BOUNCE_RESTITUTION * vn * nx; b.vy -= BOUNCE_RESTITUTION * vn * ny; }
        b.x += nx * (b.r * 2 + d * 0.18); b.y += ny * (b.r * 2 + d * 0.18);
    }
}

const _ballHash = new Map();
function ballCollide() {
    const cellSz = Math.max(BALL_R * 2, 1) * 2.6;
    const inv    = 1 / cellSz;
    _ballHash.clear();
    const n = balls.length;
    for (let i = 0; i < n; i++) {
        const b = balls[i];
        if (b.escaped) continue;
        const k = ((Math.floor(b.x * inv) & 0xFFFF) | ((Math.floor(b.y * inv) & 0xFFFF) << 16)) >>> 0;
        let cell = _ballHash.get(k);
        if (!cell) { cell = []; _ballHash.set(k, cell); }
        cell.push(i);
    }
    for (let i = 0; i < n; i++) {
        const a  = balls[i];
        if (a.escaped) continue;
        const gx = Math.floor(a.x * inv), gy = Math.floor(a.y * inv);
        for (let ddx = -1; ddx <= 1; ddx++) {
            for (let ddy = -1; ddy <= 1; ddy++) {
                const k    = (((gx + ddx) & 0xFFFF) | (((gy + ddy) & 0xFFFF) << 16)) >>> 0;
                const cell = _ballHash.get(k);
                if (!cell) continue;
                for (let ci = 0; ci < cell.length; ci++) {
                    const j = cell[ci];
                    if (j <= i) continue;
                    const b    = balls[j];
                    const ex   = b.x - a.x, ey = b.y - a.y;
                    const d2   = ex * ex + ey * ey;
                    const diam = a.r + b.r;
                    if (d2 < diam * diam && d2 > 0) {
                        const d  = Math.sqrt(d2);
                        const nx = ex / d, ny = ey / d;
                        const ov = (diam - d) * 0.5;
                        a.x -= nx * ov; a.y -= ny * ov;
                        b.x += nx * ov; b.y += ny * ov;
                        const vn = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
                        if (vn < 0) {
                            a.vx += vn * nx; a.vy += vn * ny;
                            b.vx -= vn * nx; b.vy -= vn * ny;
                            const tx = -ny, ty = nx;
                            const vt = (b.vx - a.vx) * tx + (b.vy - a.vy) * ty
                                     + (a.omega + b.omega) * (a.r + b.r) * 0.5;
                            const fj = BALL_FRICTION_FACTOR * vt;
                            a.vx += fj * tx; a.vy += fj * ty;
                            b.vx -= fj * tx; b.vy -= fj * ty;
                            a.omega -= fj / a.r * 0.5;
                            b.omega += fj / b.r * 0.5;
                        }
                    }
                }
            }
        }
    }
}

let lastVerts = null, lastInnerVerts = null;

function update() {
    _armTipsCache = null;
    soundsThisFrame = 0;
    if (crossHoleEnabled) {
        const now = performance.now();
        const iV0 = innerShapeVerts(innerShapeAngle);
        if (now >= crossHoleNextChange || crossHoleLocalAngle === null) {
            const numArms = currentCrossShape.custom ? getCustomArmTips(iV0).length : (currentCrossShape.arms || 4);
            let next;
            do { next = (Math.random() * numArms) | 0; } while (next === crossHoleArmIdx && numArms > 1);
            crossHoleArmIdx = next;
            crossHoleNextChange = (crossHoleInterval > 0) ? (now + crossHoleInterval) : Infinity;
            crossHoleLocalAngle = null; 
        }
        if (crossHoleLocalAngle === null) {
            const tip0 = getCrossTipForArm(iV0, crossHoleArmIdx);
            crossHoleLocalAngle = Math.atan2(tip0.y - cy, tip0.x - cx) - innerShapeAngle;
            crossHoleTip = tip0;
        } else {
            crossHoleTip = getCrossHoleTipFromAngle(iV0);
        }
    } else {
        crossHoleTip = crossHoleLocalAngle = null;
    }

    const subSpin = spin / SUBSTEPS, subInnerSpin = innerSpin / SUBSTEPS;
    const gRad = gravityAngle * Math.PI / 180;
    const gx = Math.sin(gRad) * gravity / SUBSTEPS, gy = Math.cos(gRad) * gravity / SUBSTEPS;

    for (let s = 0; s < SUBSTEPS; s++) {
        shapeAngle += subSpin;
        innerShapeAngle -= subInnerSpin;
        const verts = shapeVerts(shapeAngle), iVerts = innerShapeVerts(innerShapeAngle);
        if (s === SUBSTEPS - 1) { lastVerts = verts; lastInnerVerts = iVerts; }

        for (let i = 0, len = balls.length; i < len; i++) {
            const b = balls[i];
            b.vx += gx; b.vy += gy;
            let spd = Math.hypot(b.vx, b.vy);
            if (spd > maxBallSpeed) { const f = maxBallSpeed / spd; b.vx *= f; b.vy *= f; }
            b.vx *= BALL_FRICTION; b.vy *= BALL_FRICTION;
            b.x += b.vx / SUBSTEPS; b.y += b.vy / SUBSTEPS;
            b.angle += b.omega / SUBSTEPS; b.omega *= ANGULAR_DECAY;

            if (b.escaped) continue;
            wallCollide(b, verts, spin);
            if (crossHoleEnabled) crossWallCollide(b, iVerts, -innerSpin);
            else {
                wallCollide(b, iVerts, -innerSpin);
                containBallOutside(b, iVerts);
            }
            boundarySafety(b);
            containBall(b, verts);

            spd = Math.hypot(b.vx, b.vy);
            if (spd > maxBallSpeed * 1.6) { const f = maxBallSpeed * 1.6 / spd; b.vx *= f; b.vy *= f; }
        }
        ballCollide();
    }

    const R2 = SHAPE_R * 0.2;
    for (let i = 0, len = balls.length; i < len; i++) {
        const b = balls[i];
        if (b.escaped) {
            if (b.x + b.r < -80 || b.x - b.r > W + 80 || b.y + b.r < -80 || b.y - b.r > H + 80) respawnBall(b);
        } else if (!insidePoly(b.x, b.y, lastVerts)) {
            const a = Math.random() * Math.PI * 2;
            b.x = cx + Math.cos(a) * R2; b.y = cy + Math.sin(a) * R2;
            b.vx *= -0.3; b.vy *= -0.3;
        }
    }
    if (trailLength > 0) {
        for (let i = 0, len = balls.length; i < len; i++) {
            const b = balls[i];
            if (!b.trail) b.trail = [];
            b.trail.push({ x: b.x, y: b.y });
            if (b.trail.length > trailLength) b.trail.shift();
        }
    }
}

// ── Portal dot (3D sphere like ball icon) ──────────────────────
function drawPortalDot(px, py, r) {
    const hue = (frameCount * 2 * bgAnimMult) % 360;
    const gr = ctx.createRadialGradient(px - r * 0.32, py - r * 0.36, r * 0.06, px, py, r);
    gr.addColorStop(0, '#fff'); gr.addColorStop(0.28, `hsl(${hue},90%,62%)`); gr.addColorStop(1, `hsl(${(hue + 60) % 360},85%,32%)`);
    ctx.beginPath(); ctx.arc(px, py, r, 0, Math.PI * 2); ctx.fillStyle = gr; ctx.fill();
    ctx.save();
    ctx.beginPath(); ctx.arc(px, py, r - 0.5, 0, Math.PI * 2); ctx.clip();
    ctx.globalAlpha = 0.44; ctx.strokeStyle = `hsl(${(hue + 55) % 360},90%,90%)`; ctx.lineWidth = Math.max(0.7, r * 0.14); ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(px, py, r * 0.56, -Math.PI * 0.62, Math.PI * 0.28); ctx.stroke();
    ctx.restore();
    const hl = ctx.createRadialGradient(px - r * 0.30, py - r * 0.36, 0, px - r * 0.15, py - r * 0.18, r * 0.50);
    hl.addColorStop(0, 'rgba(255,255,255,.88)'); hl.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.beginPath(); ctx.arc(px, py, r, 0, Math.PI * 2); ctx.fillStyle = hl; ctx.fill();
}

// ── Collision sparks ───────────────────────────────────────────
const MAX_SPARKS = 300;

function addSparks(ball, wx, wy) {
    if (sparks.length >= MAX_SPARKS) return;
    const count = 3 + Math.floor(Math.random() * 3);
    const hue   = `hsl(${ball.h},${ball.s}%,${Math.min(ball.l + 25, 95)}%)`;
    for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const spd   = 0.8 + Math.random() * 2.5;
        sparks.push({
            x: wx, y: wy,
            vx: Math.cos(angle) * spd + ball.vx * 0.12,
            vy: Math.sin(angle) * spd + ball.vy * 0.12,
            life: 1.0,
            decay: 0.06 + Math.random() * 0.08,
            r: 1.0 + Math.random() * 1.8,
            color: hue,
        });
    }
}

// ── Draw ───────────────────────────────────────────────────────
function getFogTint() {
    const t = currentFogTheme.tint;
    if (!t) return null;
    if (t === 'cycle') return `hsl(${(frameCount * 0.5 * bgAnimMult) % 360},90%,50%)`;
    if (t === 'fast')  return `hsl(${(frameCount * 2.5 * bgAnimMult) % 360},100%,65%)`;
    return `rgb(${t})`;
}

function draw() {
    _armTipsCache = null;
    const v = lastVerts || shapeVerts(shapeAngle), iv = lastInnerVerts || innerShapeVerts(innerShapeAngle);

    if (bgFade > 0) {
        const fadeT = bgFade / 30, st = fadeT * fadeT * (3 - 2 * fadeT);
        ctx.globalAlpha = 1 - st * 0.92;
        ctx.drawImage(bgCanvas, 0, 0, W, H);
        const tint = getFogTint();
        if (tint) {
            ctx.globalAlpha = st * 0.10; ctx.fillStyle = tint;
            ctx.fillRect(0, 0, W, H);
        }
        ctx.globalAlpha = 1;
    } else ctx.drawImage(bgCanvas, 0, 0, W, H);

    ctx.beginPath();
    for (let i = 0, len = v.length; i < len; i++) {
        if (i === 0) ctx.moveTo(v[i].x, v[i].y); else ctx.lineTo(v[i].x, v[i].y);
    }
    ctx.closePath();
    ctx.fillStyle = currentTheme.shapeFill; ctx.fill();
    ctx.strokeStyle = currentTheme.shapeStroke; ctx.lineWidth = 3;
    ctx.stroke();

    const { star, sides } = currentShape;
    if (!star && sides > 0 && sides <= 10) {
        ctx.fillStyle = currentTheme.dotFill;
        for (let i = 0, len = v.length; i < len; i++) {
            const p = v[i];
            ctx.beginPath(); ctx.arc(p.x, p.y, 2.5, 0, Math.PI * 2); ctx.fill();
            
            const next = v[(i + 1) % len];
            const mx = (p.x + next.x) * 0.5, my = (p.y + next.y) * 0.5;
            const ex = next.x - p.x, ey = next.y - p.y, d = Math.hypot(ex, ey);
            let nx = ey / d, ny = -ex / d;
            if ((cx - mx) * nx + (cy - my) * ny < 0) { nx = -nx; ny = -ny; }
            ctx.beginPath(); ctx.moveTo(mx, my); ctx.lineTo(mx + nx * 10, my + ny * 10);
            ctx.strokeStyle = currentTheme.tick; ctx.lineWidth = 1.5; ctx.stroke();
        }
    }

    const now = performance.now();
    if (now >= logoNextChange || logoLocalAngle === null) {
        const num = currentCrossShape.custom ? getCustomArmTips(iv).length : (currentCrossShape.arms || 4);
        logoArmIdx = (logoArmIdx + 1) % num;
        logoNextChange = now + 10000 + Math.random() * 10000;
        const tip = getCrossTipForArm(iv, logoArmIdx);
        logoLocalAngle = Math.atan2(tip.y - cy, tip.x - cx) - innerShapeAngle;
    }
    const tipAngle = logoLocalAngle + innerShapeAngle, logoSz = Math.max(10, Math.min(22, INNER_R * 0.18)), dist = INNER_R + logoSz * 1.6;
    logoEl.style.left = `${cx + Math.cos(tipAngle) * dist}px`;
    logoEl.style.top = `${cy + Math.sin(tipAngle) * dist}px`;
    logoEl.style.transform = `translate(-50%,-50%) rotate(${tipAngle + Math.PI / 2}rad)`;
    logoEl.style.fontSize = `${logoSz}px`;

    // Inner cross
    ctx.beginPath();
    for (let i = 0, len = iv.length; i < len; i++) {
        if (i === 0) ctx.moveTo(iv[i].x, iv[i].y); else ctx.lineTo(iv[i].x, iv[i].y);
    }
    ctx.closePath();
    ctx.fillStyle = currentTheme.shapeFill; ctx.fill();
    ctx.strokeStyle = currentTheme.shapeStroke; ctx.lineWidth = 2;
    if (crossHoleEnabled && crossHoleTip) {
        const ni = iv.length, ci = crossHoleTip.capIdx, half = crossHoleHalf;
        let pathOpen = false;
        ctx.beginPath();
        for (let i = 0; i < ni; i++) {
            let d = (i - ci + ni) % ni;
            if (d > ni - d) d = ni - d;
            if (d <= half) { pathOpen = false; continue; }
            if (!pathOpen) { ctx.moveTo(iv[i].x, iv[i].y); pathOpen = true; }
            ctx.lineTo(iv[(i + 1) % ni].x, iv[(i + 1) % ni].y);
        }
        ctx.stroke();
        const gA = iv[(ci - half + ni) % ni], gB = iv[(ci + half + 1) % ni];
        if (gA && gB) { drawPortalDot(gA.x, gA.y, 9); drawPortalDot(gB.x, gB.y, 9); }
    } else ctx.stroke();

    if (trailLength > 0) {
        ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        const SEG = 6;
        for (let i = 0; i < balls.length; i++) {
            const b = balls[i];
            if (!b.trail || b.trail.length < 2) continue;
            const full = [...b.trail, { x: b.x, y: b.y }], fLen = full.length;
            for (let s = 0; s < SEG; s++) {
                const frac = (s + 0.5) / SEG, i0 = (s * fLen / SEG) | 0, i1 = Math.min(((s + 1) * fLen / SEG) | 0, fLen - 1);
                if (i1 <= i0) continue;
                const hue = (b.h + 90 * (1 - frac) + 360) % 360, lgt = Math.min(b.l + 10 + frac * 20, 95);
                ctx.globalAlpha = frac * frac * 0.85;
                ctx.lineWidth = Math.max(0.5, b.r * (0.12 + frac * 0.88) * 1.8);
                ctx.strokeStyle = `hsl(${hue},${b.s}%,${lgt}%)`;
                ctx.beginPath(); ctx.moveTo(full[i0].x, full[i0].y);
                for (let t = i0 + 1; t <= i1; t++) {
                    if (t < fLen - 1) {
                        const mx = (full[t].x + full[t + 1].x) * 0.5, my = (full[t].y + full[t + 1].y) * 0.5;
                        ctx.quadraticCurveTo(full[t].x, full[t].y, mx, my);
                    } else ctx.lineTo(full[t].x, full[t].y);
                }
                ctx.stroke();
            }
        }
        ctx.restore();
        ctx.globalAlpha = 1;
    }

    if (sparks.length > 0) {
        ctx.save();
        const gr = gravityAngle * Math.PI / 180, gsx = Math.sin(gr) * gravity * 0.25, gsy = Math.cos(gr) * gravity * 0.25;
        for (let i = sparks.length - 1; i >= 0; i--) {
            const s = sparks[i];
            s.x += s.vx; s.y += s.vy; s.vx *= 0.97; s.vy *= 0.97; s.vx += gsx; s.vy += gsy;
            s.life -= s.decay;
            if (s.life <= 0) { sparks.splice(i, 1); continue; }
            ctx.globalAlpha = s.life * s.life; ctx.fillStyle = s.color;
            ctx.beginPath(); ctx.arc(s.x, s.y, s.r * s.life, 0, Math.PI * 2); ctx.fill();
        }
        ctx.restore();
        ctx.globalAlpha = 1;
    }

    for (let i = 0, len = balls.length; i < len; i++) {
        const b = balls[i];
        if (b.x + b.r < 0 || b.x - b.r > W || b.y + b.r < 0 || b.y - b.r > H) continue;
        const off = 1 + b.r;
        ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(b.angle); ctx.drawImage(b.sprite, -off, -off); ctx.restore();
    }
}

// ── Cross grid ─────────────────────────────────────────────────
const crossGrid = document.getElementById('cross-grid');
CROSS_SHAPES.forEach(shape => {
    const btn = document.createElement('button');
    btn.className = 'shape-btn' + (shape === currentCrossShape ? ' active' : '');
    btn.title = shape.label;
    btn.dataset.i18nTitle = shape.label;
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', '0 0 32 32');
    const el = document.createElementNS(NS, 'polygon');
    el.setAttribute('points', iconCrossPoints(shape));
    svg.appendChild(el);
    const ballDot = document.createElementNS(NS, 'circle');
    ballDot.setAttribute('cx', '16'); ballDot.setAttribute('cy', '16'); ballDot.setAttribute('r', '3.5');
    ballDot.setAttribute('class', 'cross-ball');
    svg.appendChild(ballDot);
    btn.appendChild(svg);
    btn.addEventListener('click', () => {
        crossGrid.querySelectorAll('.shape-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentCrossShape = shape;
        crossHoleArmIdx = 0;
        logoLocalAngle = null;
        crossHoleLocalAngle = null;
        crossHoleNextChange = performance.now() + crossHoleInterval;
        updateHoleSizeMax();
        saveSettings();
    });
    crossGrid.appendChild(btn);
});

slider('sCrossSize', 'vCrossSize', v => { updateRadius(); updateHoleSizeMax(); logoEl.style.display = v <= 1 ? 'none' : ''; });
slider('sCrossSpeed', 'vCrossSpeed', v => { innerSpin = v * 0.0026 * innerSpinSign; });

// ── Theme functions ────────────────────────────────────────────
function setTheme(theme) {
    currentTheme = theme;
    rebuildBgCanvas();
    const root = document.documentElement;
    root.style.setProperty('--accent',        theme.accent);
    root.style.setProperty('--accent-glow15', theme.glow15);
    root.style.setProperty('--accent-glow70', theme.glow70);
    root.style.setProperty('--panel-bg',      theme.panel);
    root.style.setProperty('--panel-border',  theme.panelBorder);
    root.style.setProperty('--track-empty',   theme.trackEmpty);
    document.querySelectorAll('input[type=range]').forEach(trackBg);
    document.querySelectorAll('.theme-swatch').forEach(btn =>
        btn.classList.toggle('active', btn.dataset.id === theme.id && btn.dataset.grid === 'theme')
    );
    saveSettings();
}

THEMES.forEach(theme => {
    const btn = document.createElement('button');
    btn.className = 'theme-swatch' + (theme === currentTheme ? ' active' : '');
    btn.dataset.id   = theme.id;
    btn.dataset.grid = 'theme';
    btn.title        = theme.name;
    btn.dataset.i18nTitle = theme.name;
    btn.style.background = theme.swatch;
    btn.addEventListener('click', () => setTheme(theme));
    document.getElementById('theme-grid').appendChild(btn);
});

function setBallTheme(theme, recolor = true) {
    currentBallTheme = theme;
    document.querySelectorAll('#ball-theme-grid .theme-swatch').forEach(b =>
        b.classList.toggle('active', b.dataset.id === theme.id)
    );
    if (recolor) {
        for (let i = 0, len = balls.length; i < len; i++) {
            const b = balls[i];
            const { h, s, l } = theme.getHSL();
            b.h = h; b.s = s; b.l = l;
            b.sprite = makeBallSprite(h, s, l, b.r);
        }
    }
    saveSettings();
}

BALL_THEMES.forEach(theme => {
    const btn = document.createElement('button');
    btn.className    = 'theme-swatch' + (theme === currentBallTheme ? ' active' : '');
    btn.dataset.id   = theme.id;
    btn.title        = theme.name;
    btn.dataset.i18nTitle = theme.name;
    btn.style.background = theme.swatch;
    btn.addEventListener('click', () => setBallTheme(theme));
    document.getElementById('ball-theme-grid').appendChild(btn);
});

// ── Mute All ─────────────────────────────────────────────
let allMuted = false;
const muteAllBtn = document.getElementById('muteAllBtn');
muteAllBtn.addEventListener('click', () => {
    allMuted = !allMuted;
    muteAllBtn.classList.toggle('muted', allMuted);
    muteAllBtn.innerHTML = allMuted ? '<span class="btn-icon">&#128263;</span>' : '<span class="btn-icon">&#128266;</span>';
    
    if (allMuted) {
        audioMuted = true;
        ballSoundMuted = true;
        if (masterGain) masterGain.gain.value = 0;
        if (ballGain)   ballGain.gain.value = 0;
        document.getElementById('muteBtn').classList.add('muted');
        document.getElementById('ballMuteBtn').classList.add('muted');
    } else {
        audioMuted = false;
        ballSoundMuted = false;
        if (masterGain) masterGain.gain.value = audioVol;
        if (ballGain)   ballGain.gain.value = 1;
        document.getElementById('muteBtn').classList.remove('muted');
        document.getElementById('ballMuteBtn').classList.remove('muted');
    }
    saveSettings();
});

// ── Conditional Visibility ──────────────────────────────────
function updateVisibility() {
    const animSpeedCtrl = document.getElementById('animSpeedControl');
    if (animSpeedCtrl) {
        animSpeedCtrl.style.display = (currentFogTheme.tint === 'cycle' || currentFogTheme.tint === 'fast') ? 'block' : 'none';
    }
    const crossHoleCtrls = document.getElementById('crossHoleControls');
    if (crossHoleCtrls) {
        crossHoleCtrls.style.display = crossHoleEnabled ? 'block' : 'none';
    }
}

function setFogTheme(theme, save = true) {
    currentFogTheme = theme;
    document.querySelectorAll('#fog-theme-grid .theme-swatch').forEach(b =>
        b.classList.toggle('active', b.dataset.id === theme.id)
    );
    updateVisibility();
    if (save) saveSettings();
}

const fogSwatchGrads = {
    standard: 'linear-gradient(135deg,#888,#ccc)',
    galaxy:   'linear-gradient(135deg,#440088,#8844ff,#00ddff)',
    rainbow:  'linear-gradient(135deg,#f00,#ff0,#0f0,#0ff,#00f,#f0f)',
    fire:     'linear-gradient(135deg,#ff0000,#ff6600,#ffcc00)',
    firework: 'linear-gradient(135deg,#ff00ff,#00ffff,#ffff00,#ff00aa)',
    ocean:    'linear-gradient(135deg,#001133,#0066cc,#00aaff)',
    aurora:   'linear-gradient(135deg,#004422,#00ff88,#00ccff)',
    bloodfog: 'linear-gradient(135deg,#440011,#cc1133,#ff4444)',
    acidfog:  'linear-gradient(135deg,#334400,#aaff00,#ffff44)',
    void:     'linear-gradient(135deg,#110022,#330055,#6600aa)',
    solar:    'linear-gradient(135deg,#aa4400,#ffaa00,#ffff44)',
};

FOG_THEMES.forEach(theme => {
    const btn = document.createElement('button');
    btn.className    = 'theme-swatch' + (theme === currentFogTheme ? ' active' : '');
    btn.dataset.id   = theme.id;
    btn.title        = theme.name;
    btn.dataset.i18nTitle = theme.name;
    btn.style.background = fogSwatchGrads[theme.id] || theme.swatch;
    btn.addEventListener('click', () => setFogTheme(theme));
    document.getElementById('fog-theme-grid').appendChild(btn);
});

// ── i18n ───────────────────────────────────────────────────────
const STRINGS = {
    en: {
        // section titles
        sound:'Sound', shape:'Shape', cross:'Cross', crossHole:'Cross Hole',
        ballColors:'Ball Colors', background:'Background', theme:'Theme',
        language:'Language', hole:'Hole', cycle:'Cycle',
        randomBg:'Random Bg', randomTheme:'Random Theme',
        animSpeed:'Anim Speed', physics:'Physics',
        // labels
        reset:'Reset', speed:'Speed', size:'Size', gravity:'Gravity',
        fog:'Fog', gAngle:'G-Angle', balls:'Balls', randSize:'Rand Size',
        // tooltips
        pauseSim:'Pause simulation', resumeSim:'Resume simulation',
        resetTitle:'Reset simulation',
        rndAll:'Randomize everything', rndAllLabel:'Everything Random',
        cycleAll:'Auto-randomize everything every 5 s',
        toggleMusic:'Toggle music', musicVolume:'Music volume',
        toggleBallSound:'Toggle ball sounds', ballHitVolume:'Ball hit volume',
        muteAll:'Mute all audio',
        revShapeRot:'Reverse shape rotation',
        autoCycleShape:'Auto-cycle shapes every 10–20 s',
        rndShapeBtn:'Random shape',
        revCrossRot:'Reverse cross rotation',
        autoCycleCross:'Auto-cycle cross shapes every 10–20 s',
        rndCrossBtn:'Random cross shape',
        nextArm:'Advance to next arm',
        holeSizeTitle:'Hole size', cycleSpdTitle:'Cycle speed',
        rndBallColors:'Random ball colors',
        rndBgStyle:'Random background style',
        rndThemeBtn:'Random theme',
        // shapes
        Triangle:'Triangle', Square:'Square', Pentagon:'Pentagon', Hexagon:'Hexagon', Octagon:'Octagon', '12-gon':'12-gon', '16-gon':'16-gon',
        '3-Star':'3-Star', '4-Star':'4-Star', '5-Star':'5-Star', '6-Star':'6-Star', '8-Star':'8-Star',
        Circle:'Circle', Gear:'Gear', Lightning:'Lightning', Arrow:'Arrow', Crescent:'Crescent', Shield:'Shield', 
        Ghost:'Ghost', Cat:'Cat', 'Pac-Man':'Pac-Man', Heart:'Heart', Crown:'Crown', Skull:'Skull', Fish:'Fish', Rocket:'Rocket', 
        Sun:'Sun', Hourglass:'Hourglass', Flame:'Flame', Bat:'Bat', Bell:'Bell', Cloud:'Cloud',
        // cross
        Plus:'Plus', 'Fat Plus':'Fat Plus', X:'X', 'Fat X':'Fat X', Y:'Y', 'Fat Y':'Fat Y',
        '6-Cross':'6-Cross', 'Wide 6':'Wide 6', '8-Cross':'8-Cross', 'Wide 8':'Wide 8',
        '5-Cross':'5-Cross', '12-Cross':'12-Cross', '10-Cross':'10-Cross', 'Wide 10':'Wide 10', '7-Cross':'7-Cross',
        'Thin Y':'Thin Y', 'Needle+':'Needle+', 'Wide 5':'Wide 5', 'Fat 6':'Fat 6', '9-Cross':'9-Cross',
        Snowflake:'Snowflake', Pinwheel:'Pinwheel', StarCross:'StarCross', Triquetra:'Triquetra', Flower:'Flower', Star:'Star',
        // themes
        Ocean:'Ocean', Neon:'Neon', Rainbow:'Rainbow', Gradient:'Gradient', Pearl:'Pearl',
        Standard:'Standard', Blood:'Blood', Rust:'Rust', Fire:'Fire', Solar:'Solar', Acid:'Acid', Aurora:'Aurora', Steel:'Steel', Void:'Void', Galaxy:'Galaxy', Sakura:'Sakura', Firework:'Firework',
        Lava:'Lava', Ember:'Ember', Gold:'Gold', Toxic:'Toxic', Forest:'Forest', Mint:'Mint', SciFi:'SciFi', Inferno:'Inferno', Vibrant:'Vibrant', Plasma:'Plasma',
        Red:'Red', Orange:'Orange', Yellow:'Yellow', Green:'Green', Cyan:'Cyan', Blue:'Blue', Violet:'Violet', Storm:'Storm',
        none:'None',
    },
    de: {
        sound:'Ton', shape:'Form', cross:'Kreuz', crossHole:'Kreuzloch',
        ballColors:'Ballfarben', background:'Hintergrund', theme:'Thema',
        language:'Sprache', hole:'Loch', cycle:'Wechsel',
        randomBg:'Zuf. Bg', randomTheme:'Zuf. Thema',
        animSpeed:'Animtempo', physics:'Physik',
        reset:'Zurücksetzen', speed:'Tempo', size:'Größe', gravity:'Schwerkraft',
        fog:'Nebel', gAngle:'Schwerkraftwinkel', balls:'Bälle', randSize:'Zuf. Größe',
        pauseSim:'Simulation pausieren', resumeSim:'Simulation fortsetzen',
        resetTitle:'Simulation zurücksetzen',
        rndAll:'Alles zufällig', rndAllLabel:'Alles zufällig',
        cycleAll:'Alles alle 5 s automatisch zufällig',
        toggleMusic:'Musik ein/aus', musicVolume:'Musiklautstärke',
        toggleBallSound:'Ballsound ein/aus', ballHitVolume:'Aufprall-Lautstärke',
        muteAll:'Alles stummschalten',
        revShapeRot:'Formrotation umkehren',
        autoCycleShape:'Formen alle 10–20 s wechseln',
        rndShapeBtn:'Zufällige Form',
        revCrossRot:'Kreuzrotation umkehren',
        autoCycleCross:'Kreuzformen alle 10–20 s wechseln',
        rndCrossBtn:'Zufällige Kreuzform',
        nextArm:'Nächsten Arm wählen',
        holeSizeTitle:'Lochgröße', cycleSpdTitle:'Wechselgeschwindigkeit',
        rndBallColors:'Zufällige Ballfarben',
        rndBgStyle:'Zufälliger Hintergrundstil',
        rndThemeBtn:'Zufälliges Thema',
        Triangle:'Dreieck', Square:'Quadrat', Pentagon:'Fünfeck', Hexagon:'Sechseck', Octagon:'Achteck', '12-gon':'Zwölfeck', '16-gon':'Sechzehneck',
        '3-Star':'3-Stern', '4-Star':'4-Stern', '5-Star':'5-Stern', '6-Star':'6-Stern', '8-Star':'8-Stern',
        Circle:'Kreis', Gear:'Zahnrad', Lightning:'Blitz', Arrow:'Pfeil', Crescent:'Sichel', Shield:'Schild',
        Ghost:'Geist', Cat:'Katze', 'Pac-Man':'Pac-Man', Heart:'Herz', Crown:'Krone', Skull:'Schädel', Fish:'Fisch', Rocket:'Rakete',
        Sun:'Sonne', Hourglass:'Sanduhr', Flame:'Flamme', Bat:'Fledermaus', Bell:'Glocke', Cloud:'Wolke',
        Plus:'Plus', 'Fat Plus':'Fettes Plus', X:'X', 'Fat X':'Fettes X', Y:'Y', 'Fat Y':'Fettes Y',
        '6-Cross':'6-Kreuz', 'Wide 6':'Breites 6', '8-Cross':'8-Kreuz', 'Wide 8':'Breites 8',
        '5-Cross':'5-Kreuz', '12-Cross':'12-Kreuz', '10-Cross':'10-Kreuz', 'Wide 10':'Breites 10', '7-Cross':'7-Kreuz',
        'Thin Y':'Dünnes Y', 'Needle+':'Nadel+', 'Wide 5':'Breites 5', 'Fat 6':'Fettes 6', '9-Cross':'9-Kreuz',
        Snowflake:'Schneeflocke', Pinwheel:'Windrad', StarCross:'Sternkreuz', Triquetra:'Triquetra', Flower:'Blume', Star:'Stern',
        Ocean:'Ozean', Neon:'Neon', Rainbow:'Regenbogen', Gradient:'Verlauf', Pearl:'Perle',
        Standard:'Standard', Blood:'Blut', Rust:'Rost', Fire:'Feuer', Solar:'Solar', Acid:'Säure', Aurora:'Aurora', Steel:'Stahl', Void:'Leere', Galaxy:'Galaxie', Sakura:'Sakura', Firework:'Feuerwerk',
        Lava:'Lava', Ember:'Glut', Gold:'Gold', Toxic:'Giftig', Forest:'Wald', Mint:'Minze', SciFi:'SciFi', Inferno:'Inferno', Vibrant:'Lebhaft', Plasma:'Plasma',
        Red:'Rot', Orange:'Orange', Yellow:'Gelb', Green:'Grün', Cyan:'Türkis', Blue:'Blau', Violet:'Violett', Storm:'Sturm',
        none:'Kein',
    },
    es: {
        sound:'Sonido', shape:'Forma', cross:'Cruz', crossHole:'Agujero Cruz',
        ballColors:'Colores Bola', background:'Fondo', theme:'Tema',
        language:'Idioma', hole:'Agujero', cycle:'Ciclo',
        randomBg:'Bg Aleatorio', randomTheme:'Tema Aleatorio',
        animSpeed:'Vel. Anim.', physics:'Física',
        reset:'Restablecer', speed:'Velocidad', size:'Tamaño', gravity:'Gravedad',
        fog:'Niebla', gAngle:'Ángulo G', balls:'Pelotas', randSize:'Tam. Aleatorio',
        pauseSim:'Pausar simulación', resumeSim:'Reanudar simulación',
        resetTitle:'Restablecer simulación',
        rndAll:'Aleatorizar todo', rndAllLabel:'Todo al azar',
        cycleAll:'Auto-aleatorizar todo cada 5 s',
        toggleMusic:'Activar/desactivar música', musicVolume:'Volumen de música',
        toggleBallSound:'Activar/desactivar sonido', ballHitVolume:'Volumen de impacto',
        muteAll:'Silenciar todo',
        revShapeRot:'Invertir rotación de forma',
        autoCycleShape:'Ciclar formas cada 10–20 s',
        rndShapeBtn:'Forma aleatoria',
        revCrossRot:'Invertir rotación de cruz',
        autoCycleCross:'Ciclar formas de cruz cada 10–20 s',
        rndCrossBtn:'Cruz aleatoria',
        nextArm:'Avanzar al siguiente brazo',
        holeSizeTitle:'Tamaño del agujero', cycleSpdTitle:'Velocidad de ciclo',
        rndBallColors:'Colores de pelota aleatorios',
        rndBgStyle:'Estilo de fondo aleatorio',
        rndThemeBtn:'Tema aleatorio',
        // shapes
        Triangle:'Triángulo', Square:'Cuadrado', Pentagon:'Pentágono', Hexagon:'Hexágono', Octagon:'Octógono', '12-gon':'12-ágono', '16-gon':'16-ágono',
        '3-Star':'3-Estrella', '4-Star':'4-Estrella', '5-Star':'5-Estrella', '6-Star':'6-Estrella', '8-Star':'8-Estrella',
        Circle:'Círculo', Gear:'Engranaje', Lightning:'Rayo', Arrow:'Flecha', Crescent:'Creciente', Shield:'Escudo',
        Ghost:'Fantasma', Cat:'Gato', 'Pac-Man':'Pac-Man', Heart:'Corazón', Crown:'Corona', Skull:'Calavera', Fish:'Pez', Rocket:'Cohete',
        Sun:'Sol', Hourglass:'Reloj de Arena', Flame:'Llama', Bat:'Murciélago', Bell:'Campana', Cloud:'Nube',
        // cross
        Plus:'Más', 'Fat Plus':'Más Gordo', X:'X', 'Fat X':'X Gorda', Y:'Y', 'Fat Y':'Y Gorda',
        '6-Cross':'6-Cruz', 'Wide 6':'6 Ancha', '8-Cross':'8-Cruz', 'Wide 8':'8 Ancha',
        '5-Cross':'5-Cruz', '12-Cross':'12-Cruz', '10-Cross':'10-Cruz', 'Wide 10':'10 Ancha', '7-Cross':'7-Cruz',
        'Thin Y':'Y Delgada', 'Needle+':'Aguja+', 'Wide 5':'5 Ancha', 'Fat 6':'6 Gorda', '9-Cross':'9-Cruz',
        Snowflake:'Copo de Nieve', Pinwheel:'Molinillo', StarCross:'Cruz de Estrellas', Triquetra:'Triquetra', Flower:'Flor', Star:'Estrella',
        // themes
        Ocean:'Océano', Neon:'Neón', Rainbow:'Arcoíris', Gradient:'Degradado', Pearl:'Perla',
        Standard:'Estándar', Blood:'Sangre', Rust:'Óxido', Fire:'Fuego', Solar:'Solar', Acid:'Ácido', Aurora:'Aurora', Steel:'Acero', Void:'Vacío', Galaxy:'Galaxia', Sakura:'Sakura', Firework:'Fuegos Artificiales',
        Lava:'Lava', Ember:'Ascua', Gold:'Oro', Toxic:'Tóxico', Forest:'Bosque', Mint:'Menta', SciFi:'SciFi', Inferno:'Infierno', Vibrant:'Vibrante', Plasma:'Plasma',
        Red:'Rojo', Orange:'Naranja', Yellow:'Amarillo', Green:'Verde', Cyan:'Cian', Blue:'Azul', Violet:'Violeta', Storm:'Tormenta',
        none:'Ninguno',
    },
    fr: {
        sound:'Son', shape:'Forme', cross:'Croix', crossHole:'Trou Croix',
        ballColors:'Couleurs Balle', background:'Arrière-plan', theme:'Thème',
        language:'Langue', hole:'Trou', cycle:'Cycle',
        randomBg:'Bg Aléat.', randomTheme:'Thème Aléat.',
        animSpeed:'Vit. Anim.', physics:'Physique',
        reset:'Réinitialiser', speed:'Vitesse', size:'Taille', gravity:'Gravité',
        fog:'Brouillard', gAngle:'Angle G', balls:'Balles', randSize:'Taille Aléat.',
        pauseSim:'Mettre en pause', resumeSim:'Reprendre',
        resetTitle:'Réinitialiser la simulation',
        rndAll:'Tout aléatoire', rndAllLabel:'Tout aléatoire',
        cycleAll:'Tout aléatoire toutes les 5 s',
        toggleMusic:'Activer/désactiver la musique', musicVolume:'Volume de la musique',
        toggleBallSound:'Activer/désactiver le son', ballHitVolume:'Volume des impacts',
        muteAll:'Tout couper',
        revShapeRot:'Inverser la rotation de la forme',
        autoCycleShape:'Cycler les formes toutes les 10–20 s',
        rndShapeBtn:'Forme aléatoire',
        revCrossRot:'Inverser la rotation de la croix',
        autoCycleCross:'Cycler les croix toutes les 10–20 s',
        rndCrossBtn:'Croix aléatoire',
        nextArm:'Passer au bras suivant',
        holeSizeTitle:'Taille du trou', cycleSpdTitle:'Vitesse de cycle',
        rndBallColors:'Couleurs de balle aléatoires',
        rndBgStyle:'Style de fond aléatoire',
        rndThemeBtn:'Thème aléatoire',
        // shapes
        Triangle:'Triangle', Square:'Carré', Pentagon:'Pentagone', Hexagon:'Hexagone', Octagon:'Octogone', '12-gon':'Dodécagone', '16-gon':'Hexadécagone',
        '3-Star':'3-Étoile', '4-Star':'4-Étoile', '5-Star':'5-Étoile', '6-Star':'6-Étoile', '8-Star':'8-Étoile',
        Circle:'Cercle', Gear:'Engrenage', Lightning:'Éclair', Arrow:'Flèche', Crescent:'Croissant', Shield:'Bouclier',
        Ghost:'Fantôme', Cat:'Chat', 'Pac-Man':'Pac-Man', Heart:'Cœur', Crown:'Couronne', Skull:'Crâne', Fish:'Poisson', Rocket:'Fusée',
        Sun:'Soleil', Hourglass:'Sablier', Flame:'Flamme', Bat:'Chauve-souris', Bell:'Cloche', Cloud:'Nuage',
        // cross
        Plus:'Plus', 'Fat Plus':'Gros Plus', X:'X', 'Fat X':'Gros X', Y:'Y', 'Fat Y':'Gros Y',
        '6-Cross':'6-Croix', 'Wide 6':'6 Large', '8-Cross':'8-Croix', 'Wide 8':'8 Large',
        '5-Cross':'5-Croix', '12-Cross':'12-Croix', '10-Cross':'10-Croix', 'Wide 10':'10 Large', '7-Cross':'7-Croix',
        'Thin Y':'Y Mince', 'Needle+':'Aiguille+', 'Wide 5':'5 Large', 'Fat 6':'Gros 6', '9-Cross':'9-Croix',
        Snowflake:'Flocon de Neige', Pinwheel:'Moulinet', StarCross:'Croix Étoilée', Triquetra:'Triquetra', Flower:'Fleur', Star:'Étoile',
        // themes
        Ocean:'Océan', Neon:'Néon', Rainbow:'Arc-en-ciel', Gradient:'Dégradé', Pearl:'Perle',
        Standard:'Standard', Blood:'Sang', Rust:'Rouille', Fire:'Feu', Solar:'Solaire', Acid:'Acide', Aurora:'Aurore', Steel:'Acier', Void:'Vide', Galaxy:'Galaxie', Sakura:'Sakura', Firework:'Feu d\'artifice',
        Lava:'Lava', Ember:'Braise', Gold:'Or', Toxic:'Toxique', Forest:'Forêt', Mint:'Menthe', SciFi:'SciFi', Inferno:'Enfer', Vibrant:'Vibrant', Plasma:'Plasma',
        Red:'Rouge', Orange:'Orange', Yellow:'Jaune', Green:'Vert', Cyan:'Cyan', Blue:'Bleu', Violet:'Violet', Storm:'Tempête',
        none:'Aucun',
    },
    it: {
        sound:'Suono', shape:'Forma', cross:'Croce', crossHole:'Buco Croce',
        ballColors:'Colori Palla', background:'Sfondo', theme:'Tema',
        language:'Lingua', hole:'Buco', cycle:'Ciclo',
        randomBg:'Bg Casuale', randomTheme:'Tema Casuale',
        animSpeed:'Vel. Anim.', physics:'Fisica',
        reset:'Reimposta', speed:'Velocità', size:'Dimensione', gravity:'Gravità',
        fog:'Nebbia', gAngle:'Angolo G', balls:'Palle', randSize:'Dim. Casuale',
        pauseSim:'Metti in pausa', resumeSim:'Riprendi',
        resetTitle:'Reimposta simulazione',
        rndAll:'Tutto casuale', rndAllLabel:'Tutto casuale',
        cycleAll:'Auto-casuale ogni 5 s',
        toggleMusic:'Attiva/disattiva musica', musicVolume:'Volume musica',
        toggleBallSound:'Attiva/disattiva suono', ballHitVolume:'Volume impatto',
        muteAll:'Silenzia tutto',
        revShapeRot:'Inverti rotazione forma',
        autoCycleShape:'Cicla forme ogni 10–20 s',
        rndShapeBtn:'Forma casuale',
        revCrossRot:'Inverti rotazione croce',
        autoCycleCross:'Cicla forme croce ogni 10–20 s',
        rndCrossBtn:'Croce casuale',
        nextArm:'Avanza al braccio successivo',
        holeSizeTitle:'Dimensione buco', cycleSpdTitle:'Velocità ciclo',
        rndBallColors:'Colori palla casuali',
        rndBgStyle:'Stile sfondo casuale',
        rndThemeBtn:'Tema casuale',
        // shapes
        Triangle:'Triangolo', Square:'Quadrato', Pentagon:'Pentagono', Hexagon:'Esagono', Octagon:'Ottagono', '12-gon':'Dodecagono', '16-gon':'Esadecagono',
        '3-Star':'3-Stella', '4-Star':'4-Stella', '5-Star':'5-Stella', '6-Star':'6-Stella', '8-Star':'8-Stella',
        Circle:'Cerchio', Gear:'Ingranaggio', Lightning:'Fulmine', Arrow:'Freccia', Crescent:'Mezzaluna', Shield:'Scudo',
        Ghost:'Fantasma', Cat:'Gato', 'Pac-Man':'Pac-Man', Heart:'Cuore', Crown:'Corona', Skull:'Teschio', Fish:'Pesce', Rocket:'Razzo',
        Sun:'Sole', Hourglass:'Clessidra', Flame:'Fiamma', Bat:'Pipistrello', Bell:'Campana', Cloud:'Nuvola',
        // cross
        Plus:'Più', 'Fat Plus':'Più Grasso', X:'X', 'Fat X':'X Grassa', Y:'Y', 'Fat Y':'Y Grassa',
        '6-Cross':'6-Croce', 'Wide 6':'6 Larga', '8-Cross':'8-Croce', 'Wide 8':'8 Larga',
        '5-Cross':'5-Croce', '12-Cross':'12-Croce', '10-Cross':'Dieci rami', 'Wide 10':'Dieci larghi', '7-Cross':'7-Croce',
        'Thin Y':'Y Sottile', 'Needle+':'Ago+', 'Wide 5':'5 Larga', 'Fat 6':'6 Grasso', '9-Cross':'9-Croce',
        Snowflake:'Fiocco di Neve', Pinwheel:'Girandola', StarCross:'Stelle incrociate', Triquetra:'Triquetra', Flower:'Fiore', Star:'Stella',
        // themes
        Ocean:'Oceano', Neon:'Neon', Rainbow:'Arcobaleno', Gradient:'Sfumatura', Pearl:'Perla',
        Standard:'Standard', Blood:'Sangue', Rust:'Ruggine', Fire:'Fuoco', Solar:'Solare', Acid:'Acido', Aurora:'Aurora', Steel:'Acciaio', Void:'Vuoto', Galaxy:'Galassia', Sakura:'Sakura', Firework:'Fuochi d\'artificio',
        Lava:'Lava', Ember:'Brace', Gold:'Oro', Toxic:'Tossico', Forest:'Foresta', Mint:'Menta', SciFi:'SciFi', Inferno:'Inferno', Vibrant:'Vibrante', Plasma:'Plasma',
        Red:'Rosso', Orange:'Arancione', Yellow:'Giallo', Green:'Verde', Cyan:'Ciano', Blue:'Blu', Violet:'Viola', Storm:'Sturm',
        none:'Nessuno',
    },
    pt: {
        sound:'Som', shape:'Forma', cross:'Cruz', crossHole:'Buraco Cruz',
        ballColors:'Cores Bola', background:'Plano de Fundo', theme:'Tema',
        language:'Idioma', hole:'Buraco', cycle:'Ciclo',
        randomBg:'Bg Aleatório', randomTheme:'Tema Aleatório',
        animSpeed:'Vel. Anim.', physics:'Física',
        reset:'Redefinir', speed:'Velocidade', size:'Tamanho', gravity:'Gravidade',
        fog:'Névoa', gAngle:'Ângulo G', balls:'Bolas', randSize:'Tam. Aleatório',
        pauseSim:'Pausar simulação', resumeSim:'Retomar simulação',
        resetTitle:'Redefinir simulação',
        rndAll:'Aleatório geral', rndAllLabel:'Tudo aleatório',
        cycleAll:'Auto-aleatório a cada 5 s',
        toggleMusic:'Ativar/desativar música', musicVolume:'Volume da música',
        toggleBallSound:'Ativar/desativar som', ballHitVolume:'Volume do impacto',
        muteAll:'Silenciar tudo',
        revShapeRot:'Inverter rotação da forma',
        autoCycleShape:'Ciclar formas a cada 10–20 s',
        rndShapeBtn:'Forma aleatória',
        revCrossRot:'Inverter rotação da cruz',
        autoCycleCross:'Ciclar formas de cruz a cada 10–20 s',
        rndCrossBtn:'Cruz aleatória',
        nextArm:'Avançar para o próximo braço',
        holeSizeTitle:'Tamanho do buraco', cycleSpdTitle:'Velocidade do ciclo',
        rndBallColors:'Cores de bola aleatórias',
        rndBgStyle:'Estilo de fondo aleatório',
        rndThemeBtn:'Tema aleatório',
        // shapes
        Triangle:'Triângulo', Square:'Quadrado', Pentagon:'Pentágono', Hexagon:'Hexágono', Octagon:'Octógono', '12-gon':'Dodecágono', '16-gon':'Hexadecágono',
        '3-Star':'3-Estrela', '4-Star':'4-Estrela', '5-Star':'5-Estrela', '6-Star':'6-Estrela', '8-Star':'8-Estrela',
        Circle:'Círculo', Gear:'Engrenagem', Lightning:'Raio', Arrow:'Seta', Crescent:'Crescente', Shield:'Escudo',
        Ghost:'Fantasma', Cat:'Gato', 'Pac-Man':'Pac-Man', Heart:'Coração', Crown:'Coroa', Skull:'Caveira', Fish:'Peixe', Rocket:'Foguete',
        Sun:'Sol', Hourglass:'Ampulheta', Flame:'Chama', Bat:'Morcego', Bell:'Sino', Cloud:'Nuvem',
        // cross
        Plus:'Mais', 'Fat Plus':'Mais Gordo', X:'X', 'Fat X':'X Gordo', Y:'Y', 'Fat Y':'Y Gordo',
        '6-Cross':'6-Cruz', 'Wide 6':'6 Larga', '8-Cross':'8-Cruz', 'Wide 8':'8 Larga',
        '5-Cross':'5-Cruz', '12-Cross':'12-Cruz', '10-Cross':'10-Cruz', 'Wide 10':'10 Larga', '7-Cross':'7-Cruz',
        'Thin Y':'Y Fino', 'Needle+':'Agulha+', 'Wide 5':'5 Largo', 'Fat 6':'6 Gordo', '9-Cross':'9-Cruz',
        Snowflake:'Floco de Neve', Pinwheel:'Cata-vento', StarCross:'Cruz Estelar', Triquetra:'Triquetra', Flower:'Flor', Star:'Estrela',
        // themes
        Ocean:'Oceano', Neon:'Neon', Rainbow:'Arco-íris', Gradient:'Gradiente', Pearl:'Pérola',
        Standard:'Padrão', Blood:'Sangue', Rust:'Ferrugem', Fire:'Fogo', Solar:'Solar', Acid:'Ácido', Aurora:'Aurora', Steel:'Aço', Void:'Vazio', Galaxy:'Galáxia', Sakura:'Sakura', Firework:'Fogos de artifício',
        Lava:'Lava', Ember:'Brasa', Gold:'Ouro', Toxic:'Tóxico', Forest:'Floresta', Mint:'Menta', SciFi:'SciFi', Inferno:'Inferno', Vibrant:'Vibrante', Plasma:'Plasma',
        Red:'Vermelho', Orange:'Laranja', Yellow:'Amarelo', Green:'Verde', Cyan:'Ciano', Blue:'Azul', Violet:'Violeta', Storm:'Tempestade',
        none:'Nenhum',
    },
    ja: {
        sound:'サウンド', shape:'形', cross:'クロス', crossHole:'クロス穴',
        ballColors:'ボール色', background:'背景', theme:'テーマ',
        language:'言語', hole:'穴', cycle:'サイクル',
        randomBg:'ランダムBg', randomTheme:'ランダムテーマ',
        animSpeed:'アニメ速度', physics:'物理',
        reset:'リセット', speed:'速度', size:'サイズ', gravity:'重力',
        fog:'霧', gAngle:'重力角度', balls:'ボール', randSize:'サイズ変動',
        pauseSim:'シミュレーションを一時停止', resumeSim:'シミュレーションを再開',
        resetTitle:'シミュレーションをリセット',
        rndAll:'すべてをランダム化', rndAllLabel:'すべてランダム',
        cycleAll:'5秒ごとにすべてランダム',
        toggleMusic:'音楽オン/オフ', musicVolume:'音楽ボリューム',
        toggleBallSound:'ボール音オン/オフ', ballHitVolume:'衝突音ボリューム',
        muteAll:'すべてミュート',
        revShapeRot:'形の回転を反転',
        autoCycleShape:'10〜20秒ごとに形を切替',
        rndShapeBtn:'ランダムな形',
        revCrossRot:'クロスの回転を反転',
        autoCycleCross:'10〜20秒ごとにクロスを切替',
        rndCrossBtn:'ランダムなクロス',
        nextArm:'次のアームへ',
        holeSizeTitle:'穴のサイズ', cycleSpdTitle:'サイクル速度',
        rndBallColors:'ランダムなボール色',
        rndBgStyle:'ランダムな背景スタイル',
        rndThemeBtn:'ランダムなテーマ',
        // shapes
        Triangle:'三角形', Square:'正方形', Pentagon:'五角形', Hexagon:'六角形', Octagon:'八角形', '12-gon':'十二角形', '16-gon':'十六角形',
        '3-Star':'三つ星', '4-Star':'四つ星', '5-Star':'五つ星', '6-Star':'六つ星', '8-Star':'八つ星',
        Circle:'円', Gear:'歯車', Lightning:'雷', Arrow:'矢印', Crescent:'三日月', Shield:'盾',
        Ghost:'ゴースト', Cat:'猫', 'Pac-Man':'パックマン', Heart:'ハート', Crown:'王冠', Skull:'骸骨', Fish:'魚', Rocket:'ロケット',
        Sun:'太陽', Hourglass:'砂時計', Flame:'炎', Bat:'コウモリ', Bell:'鐘', Cloud:'雲',
        // cross
        Plus:'プラス', 'Fat Plus':'太いプラス', X:'X', 'Fat X':'太いX', Y:'Y', 'Fat Y':'太いY',
        '6-Cross':'6方向クロス', 'Wide 6':'太い6方向', '8-Cross':'8方向クロス', 'Wide 8':'太い8方向',
        '5-Cross':'5方向クロス', '12-Cross':'12方向クロス', '10-Cross':'10方向クロス', 'Wide 10':'太い10方向', '7-Cross':'7方向クロス',
        'Thin Y':'細いY', 'Needle+':'ニードル+', 'Wide 5':'太い5方向', 'Fat 6':'太い6方向', '9-Cross':'9方向クロス',
        Snowflake:'雪の結晶', Pinwheel:'風車', StarCross:'スタークロス', Triquetra:'トリケトラ', Flower:'花', Star:'星',
        // themes
        Ocean:'オーシャン', Neon:'ネオン', Rainbow:'虹', Gradient:'グラデーション', Pearl:'パール',
        Standard:'標準', Blood:'ブラッド', Rust:'ラスト', Fire:'ファイア', Solar:'ソーラー', Acid:'アシッド', Aurora:'オーロラ', Steel:'スチール', Void:'ヴォイド', Galaxy:'ギャラクシー', Sakura:'サクラ', Firework:'花火',
        Lava:'ラヴァ', Ember:'エンバー', Gold:'ゴールド', Toxic:'トキシック', Forest:'フォレスト', Mint:'ミント', SciFi:'SciFi', Inferno:'インフェルノ', Vibrant:'ヴァイブラント', Plasma:'プラズマ',
        Red:'赤', Orange:'オレンジ', Yellow:'黄', Green:'緑', Cyan:'シアン', Blue:'青', Violet:'バイオレット', Storm:'ストーム',
        none:'なし',
    },
    zh: {
        sound:'声音', shape:'形状', cross:'十字', crossHole:'十字孔',
        ballColors:'球颜色', background:'背景', theme:'主题',
        language:'语言', hole:'孔', cycle:'循环',
        randomBg:'随机背景', randomTheme:'随机主题',
        animSpeed:'动画速度', physics:'物理',
        reset:'重置', speed:'速度', size:'大小', gravity:'重力',
        fog:'雾', gAngle:'重力角度', balls:'球', randSize:'随机大小',
        pauseSim:'暂停模拟', resumeSim:'恢复模拟',
        resetTitle:'重置模拟',
        rndAll:'随机所有', rndAllLabel:'全部随机',
        cycleAll:'每5秒自动随机',
        toggleMusic:'开关音乐', musicVolume:'音乐音量',
        toggleBallSound:'开关球音效', ballHitVolume:'撞击音量',
        muteAll:'全部静音',
        revShapeRot:'反转形状旋转',
        autoCycleShape:'每10–20秒切换形状',
        rndShapeBtn:'随机形状',
        revCrossRot:'反转十字旋转',
        autoCycleCross:'每10–20秒切换十字形状',
        rndCrossBtn:'随机十字',
        nextArm:'前往下一臂',
        holeSizeTitle:'孔大小', cycleSpdTitle:'循环速度',
        rndBallColors:'随机球颜色',
        rndBgStyle:'随机背景样式',
        rndThemeBtn:'随机主题',
        // shapes
        Triangle:'三角形', Square:'正方形', Pentagon:'五角形', Hexagon:'六角形', Octagon:'八角形', '12-gon':'十二边形', '16-gon':'十六边形',
        '3-Star':'三星', '4-Star':'四星', '5-Star':'五星', '6-Star':'六星', '8-Star':'八星',
        Circle:'圆形', Gear:'齿轮', Lightning:'闪电', Arrow:'箭头', Crescent:'月牙', Shield:'护盾',
        Ghost:'幽灵', Cat:'猫', 'Pac-Man':'吃豆人', Heart:'爱心', Crown:'皇冠', Skull:'骷髅', Fish:'鱼', Rocket:'火箭',
        Sun:'太阳', Hourglass:'沙漏', Flame:'火焰', Bat:'蝙蝠', Bell:'铃铛', Cloud:'云',
        // cross
        Plus:'加号', 'Fat Plus':'粗加号', X:'X形', 'Fat X':'粗X形', Y:'Y形', 'Fat Y':'粗Y形',
        '6-Cross':'六角十字', 'Wide 6':'粗六角', '8-Cross':'八角十字', 'Wide 8':'粗八角',
        '5-Cross':'五角十字', '12-Cross':'十二角十字', '10-Cross':'十角十字', 'Wide 10':'粗十角', '7-Cross':'七角十字',
        'Thin Y':'细Y形', 'Needle+':'针形+', 'Wide 5':'粗五角', 'Fat 6':'粗六角', '9-Cross':'九角十字',
        Snowflake:'雪花', Pinwheel:'风车', StarCross:'星形十字', Triquetra:'三曲枝', Flower:'花朵', Star:'星星',
        // themes
        Ocean:'海洋', Neon:'霓虹', Rainbow:'彩虹', Gradient:'渐变', Pearl:'珍珠',
        Standard:'标准', Blood:'血红', Rust:'生锈', Fire:'火焰', Solar:'太阳', Acid:'酸性', Aurora:'极光', Steel:'钢铁', Void:'虚空', Galaxy:'银河', Sakura:'樱花', Firework:'烟花',
        Lava:'熔岩', Ember:'余烬', Gold:'黄金', Toxic:'有毒', Forest:'森林', Mint:'薄荷', SciFi:'科幻', Inferno:'地狱', Vibrant:'鲜艳', Plasma:'等离子',
        Red:'红色', Orange:'橙色', Yellow:'黄色', Green:'绿色', Cyan:'青色', Blue:'蓝色', Violet:'紫色', Storm:'风暴',
        none:'无',
    },
};
let currentLang = 'en';

function setLang(code) {
    if (!STRINGS[code]) return;
    currentLang = code;
    const s = STRINGS[code];
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.dataset.i18n;
        if (s[key] != null) el.textContent = s[key];
    });
    document.querySelectorAll('[data-i18n-title]').forEach(el => {
        const key = el.dataset.i18nTitle;
        if (s[key] != null) el.title = s[key];
    });
    // Keep pause button title in sync with current paused state
    if (typeof paused !== 'undefined') {
        const pb = document.getElementById('pauseBtn');
        if (pb) pb.title = paused ? s.resumeSim : s.pauseSim;
    }
    document.querySelectorAll('.lang-option').forEach(btn =>
        btn.classList.toggle('active', btn.dataset.lang === code)
    );
    document.getElementById('langCode').textContent = code.toUpperCase();

    // Refresh range labels that use localized strings like 'None'
    const vHoleTimeout = document.getElementById('vCrossHoleTimeout');
    if (vHoleTimeout) {
        const v = parseInt(document.getElementById('sCrossHoleTimeout').value, 10);
        vHoleTimeout.textContent = v === 0 ? (s.none || 'None') : (v + 's');
    }

    localStorage.setItem('bb_lang', code);
}

// Auto-detect browser language on load
{
    const saved = localStorage.getItem('bb_lang');
    const detected = (navigator.language || 'en').slice(0, 2).toLowerCase();
    setLang(saved || (STRINGS[detected] ? detected : 'en'));
}

{
    const langTrigger = document.getElementById('langTrigger');
    const langMenu    = document.getElementById('langMenu');

    langTrigger.addEventListener('click', e => {
        e.stopPropagation();
        const open = langMenu.classList.toggle('open');
        langTrigger.classList.toggle('open', open);
    });

    document.querySelectorAll('.lang-option').forEach(btn =>
        btn.addEventListener('click', () => {
            setLang(btn.dataset.lang);
            langMenu.classList.remove('open');
            langTrigger.classList.remove('open');
        })
    );

    document.addEventListener('click', () => {
        langMenu.classList.remove('open');
        langTrigger.classList.remove('open');
    });
}

// ── Direction buttons ──────────────────────────────────────────
function updateDirBtn(lId, rId, isRight) {
    const l = document.getElementById(lId), r = document.getElementById(rId);
    if (l) l.className = isRight ? 'dir-badge' : 'dir-badge on';
    if (r) r.className = isRight ? 'dir-badge on' : 'dir-badge';
}

document.getElementById('dirShape').addEventListener('click', function() {
    shapeSpinSign = -shapeSpinSign;
    spin = -spin;
    updateDirBtn('dirShapeL', 'dirShapeR', shapeSpinSign >= 0);
    saveSettings();
});
document.getElementById('dirCross').addEventListener('click', function() {
    innerSpinSign = -innerSpinSign;
    innerSpin = -innerSpin;
    updateDirBtn('dirCrossL', 'dirCrossR', innerSpinSign < 0);
    saveSettings();
});

// Initial indicator state (shape=CW/R, cross=CCW/L)
updateDirBtn('dirShapeL', 'dirShapeR', true);
updateDirBtn('dirCrossL', 'dirCrossR', false);

document.getElementById('rndShape').addEventListener('click', () => {
    const btns = [...shapeGrid.querySelectorAll('.shape-btn')];
    btns[Math.floor(Math.random() * btns.length)]?.click();
});
document.getElementById('rndCross').addEventListener('click', () => {
    const btns = [...crossGrid.querySelectorAll('.shape-btn')];
    btns[Math.floor(Math.random() * btns.length)]?.click();
});
document.getElementById('rndBallTheme').addEventListener('click', () => {
    setBallTheme(BALL_THEMES[Math.floor(Math.random() * BALL_THEMES.length)]);
});
document.getElementById('rndFogTheme').addEventListener('click', () => {
    setFogTheme(FOG_THEMES[Math.floor(Math.random() * FOG_THEMES.length)]);
});
document.getElementById('rndTheme').addEventListener('click', () => {
    setTheme(THEMES[Math.floor(Math.random() * THEMES.length)]);
});

// ── Shape / Cross auto-cycle ───────────────────────────────────
let shapeCycleActive = false, shapeCycleTimer = null;
let crossCycleActive = false, crossCycleTimer = null;

function scheduleShapeCycle() {
    shapeCycleTimer = setTimeout(() => {
        if (!shapeCycleActive) return;
        const btns = [...shapeGrid.querySelectorAll('.shape-btn')];
        btns[Math.floor(Math.random() * btns.length)]?.click();
        scheduleShapeCycle();
    }, 10000 + Math.random() * 10000);
}

function scheduleCrossCycle() {
    crossCycleTimer = setTimeout(() => {
        if (!crossCycleActive) return;
        const btns = [...crossGrid.querySelectorAll('.shape-btn')];
        btns[Math.floor(Math.random() * btns.length)]?.click();
        scheduleCrossCycle();
    }, 10000 + Math.random() * 10000);
}

document.getElementById('cycleShape').addEventListener('click', function() {
    shapeCycleActive = !shapeCycleActive;
    this.classList.toggle('active', shapeCycleActive);
    clearTimeout(shapeCycleTimer);
    if (shapeCycleActive) scheduleShapeCycle();
});

document.getElementById('cycleCross').addEventListener('click', function() {
    crossCycleActive = !crossCycleActive;
    this.classList.toggle('active', crossCycleActive);
    clearTimeout(crossCycleTimer);
    if (crossCycleActive) scheduleCrossCycle();
});

// ── Everything Random ──────────────────────────────────────────
document.getElementById('rndAllBtn').addEventListener('click', () => {
    _suppressSave = true;

    setTheme(THEMES[Math.floor(Math.random() * THEMES.length)]);
    setBallTheme(BALL_THEMES[Math.floor(Math.random() * BALL_THEMES.length)]);

    const shapeBtns = [...shapeGrid.querySelectorAll('.shape-btn')];
    shapeBtns[Math.floor(Math.random() * shapeBtns.length)]?.click();
    const crossBtns = [...crossGrid.querySelectorAll('.shape-btn')];
    crossBtns[Math.floor(Math.random() * crossBtns.length)]?.click();

    const newShapeDir = Math.random() > 0.5 ? 1 : -1;
    if (newShapeDir !== shapeSpinSign) document.getElementById('dirShape').click();
    const newCrossDir = Math.random() > 0.5 ? 1 : -1;
    if (newCrossDir !== innerSpinSign) document.getElementById('dirCross').click();

    const rnd = (id, lo, hi, step = 1) => {
        const el = document.getElementById(id);
        if (!el) return;
        el.value = lo + Math.floor(Math.random() * (Math.floor((hi - lo) / step) + 1)) * step;
        el.dispatchEvent(new Event('input'));
    };

    // Randomize Cross Hole
    const chk = document.getElementById('crossHoleCheck');
    if (chk) {
        chk.checked = Math.random() > 0.5;
        chk.dispatchEvent(new Event('change'));
    }
    updateHoleSizeMax();
    const chsEl = document.getElementById('sCrossHoleSize');
    if (chsEl) rnd('sCrossHoleSize', 1, parseInt(chsEl.max, 10) || 3);
    rnd('sCrossHoleTimeout', 0, 10);

    rnd('sGravity',      0,   10);
    rnd('sGravityAngle', 0,  315, 45);
    rnd('sShapeSpeed',   1,   15);
    rnd('sShapeSize',   20,   80);
    rnd('sCrossSpeed',   1,   15);
    rnd('sCrossSize',   20,   80);
    rnd('sBalls',       20,  300);
    rnd('sBallSize',     3,   14);
    rnd('sBallSpeed',    2,   15);

    _suppressSave = false;
    saveSettings();

    // Party flash — restart animation even if already mid-flash
    const btn = document.getElementById('rndAllBtn');
    btn.classList.remove('party-flash');
    void btn.offsetWidth;
    btn.classList.add('party-flash');
    btn.addEventListener('animationend', () => btn.classList.remove('party-flash'), { once: true });
});

// ── Everything Cycle ───────────────────────────────────────────
let allCycleActive = false, allCycleTimer = null;

document.getElementById('cycleAllBtn').addEventListener('click', function() {
    allCycleActive = !allCycleActive;
    this.classList.toggle('party-active', allCycleActive);
    document.getElementById('rndAllBtn').classList.toggle('party-active', allCycleActive);
    clearInterval(allCycleTimer);
    if (allCycleActive) {
        document.getElementById('rndAllBtn').click();
        allCycleTimer = setInterval(() => document.getElementById('rndAllBtn').click(), 5000);
    }
});

// Randomized attention flash for cycle button when inactive
function scheduleAttentionFlash() {
    const delay = 8000 + Math.random() * 7000; // 8–15 s
    setTimeout(() => {
        if (!allCycleActive) {
            const cBtn = document.getElementById('cycleAllBtn');
            if (cBtn) {
                cBtn.classList.remove('party-flash');
                void cBtn.offsetWidth; // Force reflow
                cBtn.classList.add('party-flash');
                setTimeout(() => {
                    if (!allCycleActive) cBtn.classList.remove('party-flash');
                }, 800);
            }
        }
        scheduleAttentionFlash();
    }, delay);
}
scheduleAttentionFlash();

// ── Reset ──────────────────────────────────────────────────────
document.getElementById('resetBtn').addEventListener('click', () => {
    if (paused) { paused = false; pauseBtn.innerHTML = ICON_PAUSE; pauseBtn.classList.remove('paused'); }
    applySettings(DEFAULTS);
    setBallTheme(currentBallTheme, true);
    localStorage.removeItem('bb');
    shapeAngle = 0; innerShapeAngle = 0;
    for (let i = 0, len = balls.length; i < len; i++) respawnBall(balls[i]);
});

// ── Resize handler ─────────────────────────────────────────────
let _resizeSaveTimer = null;
window.addEventListener('resize', () => {
    const prevR = SHAPE_R;
    resizeCanvas();
    if (prevR > 0 && SHAPE_R !== prevR) {
        const scale = SHAPE_R / prevR;
        BALL_R = Math.max(3, Math.min(18, BALL_R * scale));
        const sEl = document.getElementById('sBallSize');
        sEl.value = Math.round(BALL_R);
        trackBg(sEl);
        document.getElementById('vBallSize').textContent = sEl.value;
        for (let i = 0; i < balls.length; i++) {
            const b = balls[i]; b.r = clampedR(); b.sprite = makeBallSprite(b.h, b.s, b.l, b.r);
        }
    }
    rebuildBgCanvas();
    for (let i = 0; i < balls.length; i++) respawnBall(balls[i]);

    clearTimeout(_resizeSaveTimer);
    _resizeSaveTimer = setTimeout(saveSettings, 500);
});

// ── Favicon ────────────────────────────────────────────────────
(function setFavicon() {
    const fc = document.createElement('canvas');
    fc.width = fc.height = 64;
    const fx = fc.getContext('2d');
    const cx = 32, cy = 32, hex = 27, crossR = 16, crossW = 5, ballR = 9;

    // Dark background
    fx.fillStyle = '#07071a';
    fx.fillRect(0, 0, 64, 64);

    // Hexagon
    fx.beginPath();
    for (let i = 0; i < 6; i++) {
        const a = -Math.PI / 2 + i * Math.PI / 3;
        i ? fx.lineTo(cx + Math.cos(a) * hex, cy + Math.sin(a) * hex)
          : fx.moveTo(cx + Math.cos(a) * hex, cy + Math.sin(a) * hex);
    }
    fx.closePath();
    fx.strokeStyle = '#00d4ff'; fx.lineWidth = 2.5;
    fx.shadowColor = '#00d4ff'; fx.shadowBlur = 8;
    fx.stroke();

    // Cross (plus shape)
    fx.shadowColor = '#88aaff'; fx.shadowBlur = 5;
    fx.fillStyle = 'rgba(100,160,255,0.22)';
    fx.strokeStyle = 'rgba(100,180,255,0.55)'; fx.lineWidth = 1.5;
    fx.beginPath();
    fx.rect(cx - crossR, cy - crossW, crossR * 2, crossW * 2);
    fx.rect(cx - crossW, cy - crossR, crossW * 2, crossR * 2);
    fx.fill(); fx.stroke();

    // Colorful ball
    fx.shadowColor = '#ff66ff'; fx.shadowBlur = 14;
    const gr = fx.createRadialGradient(cx - 3, cy - 3, 1, cx, cy, ballR);
    gr.addColorStop(0,    '#ffffff');
    gr.addColorStop(0.25, '#ff88ff');
    gr.addColorStop(0.55, '#5533ff');
    gr.addColorStop(1,    '#000033');
    fx.beginPath(); fx.arc(cx, cy, ballR, 0, Math.PI * 2);
    fx.fillStyle = gr; fx.fill();

    // Specular highlight
    fx.shadowBlur = 0;
    const hl = fx.createRadialGradient(cx - 3.5, cy - 3.5, 0.5, cx - 2, cy - 2, 4);
    hl.addColorStop(0, 'rgba(255,255,255,.85)');
    hl.addColorStop(1, 'rgba(255,255,255,0)');
    fx.beginPath(); fx.arc(cx - 2, cy - 2, 4, 0, Math.PI * 2);
    fx.fillStyle = hl; fx.fill();

    document.getElementById('favicon').href = fc.toDataURL();
})();

resizeCanvas();
ctx.drawImage(bgCanvas, 0, 0, W, H);

// Initial balls population now that SHAPE_R, cx, cy are set
balls = Array.from({ length: 100 }, makeBall);

loadSettings();
updateHoleSizeMax();

const ballSizeEl = document.getElementById('sBallSize');
if (ballSizeEl) ballSizeEl.value = BALL_R;

// Randomize all themes on every startup
_suppressSave = true;
setTheme(THEMES[Math.floor(Math.random() * THEMES.length)]);
setBallTheme(BALL_THEMES[Math.floor(Math.random() * BALL_THEMES.length)]);
setFogTheme(FOG_THEMES[Math.floor(Math.random() * FOG_THEMES.length)]);
_suppressSave = false;

// ── Game loop ──────────────────────────────────────────────────
function loop() {
    if (!paused) {
        if (bgFade > 0) bgFade--;
        for (let i = 0; i < gameSpeed; i++) { update(); frameCount++; }
    }
    draw();
    requestAnimationFrame(loop);
}
loop();
