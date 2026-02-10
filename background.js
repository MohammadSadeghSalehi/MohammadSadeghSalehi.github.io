/**
 * 3D Reptile Field Background
 * A coherent grid of points oscillating in a 3D-like wave pattern (Simplex Noise).
 * Reacts to mouse for color and "tilt".
 */

const container = document.getElementById('floating-container');
const canvas = document.createElement('canvas');
container.innerHTML = '';
container.appendChild(canvas);

const ctx = canvas.getContext('2d');

// --- Simplex Noise Implementation (Minimal) ---
const SimplexNoise = (function () {
    let F2 = 0.5 * (Math.sqrt(3.0) - 1.0);
    let G2 = (3.0 - Math.sqrt(3.0)) / 6.0;
    let p = new Uint8Array(256);
    let perm = new Uint8Array(512);
    let gradP = new Float32Array(512);

    // Gradient vectors
    let grad3 = [[1, 1, 0], [-1, 1, 0], [1, -1, 0], [-1, -1, 0],
    [1, 0, 1], [-1, 0, 1], [1, 0, -1], [-1, 0, -1],
    [0, 1, 1], [0, -1, 1], [0, 1, -1], [0, -1, -1]];

    // Seed
    for (let i = 0; i < 256; i++) p[i] = Math.floor(Math.random() * 256);
    for (let i = 0; i < 512; i++) {
        perm[i] = p[i & 255];
        let g = grad3[perm[i] % 12];
        gradP[i * 3] = g[0]; gradP[i * 3 + 1] = g[1]; gradP[i * 3 + 2] = g[2];
    }

    return {
        noise: function (xin, yin) {
            let n0, n1, n2;
            let s = (xin + yin) * F2;
            let i = Math.floor(xin + s);
            let j = Math.floor(yin + s);
            let t = (i + j) * G2;
            let X0 = i - t;
            let Y0 = j - t;
            let x0 = xin - X0;
            let y0 = yin - Y0;
            let i1, j1;
            if (x0 > y0) { i1 = 1; j1 = 0; } else { i1 = 0; j1 = 1; }
            let x1 = x0 - i1 + G2;
            let y1 = y0 - j1 + G2;
            let x2 = x0 - 1.0 + 2.0 * G2;
            let y2 = y0 - 1.0 + 2.0 * G2;
            let ii = i & 255;
            let jj = j & 255;

            // Corner 0
            let gi0 = (ii + perm[jj]) % 12;
            let t0 = 0.5 - x0 * x0 - y0 * y0;
            if (t0 < 0) n0 = 0.0;
            else { t0 *= t0; n0 = t0 * t0 * (grad3[gi0][0] * x0 + grad3[gi0][1] * y0); }

            // Corner 1
            let gi1 = (ii + i1 + perm[jj + j1]) % 12;
            let t1 = 0.5 - x1 * x1 - y1 * y1;
            if (t1 < 0) n1 = 0.0;
            else { t1 *= t1; n1 = t1 * t1 * (grad3[gi1][0] * x1 + grad3[gi1][1] * y1); }

            // Corner 2
            let gi2 = (ii + 1 + perm[jj + 1]) % 12;
            let t2 = 0.5 - x2 * x2 - y2 * y2;
            if (t2 < 0) n2 = 0.0;
            else { t2 *= t2; n2 = t2 * t2 * (grad3[gi2][0] * x2 + grad3[gi2][1] * y2); }

            return 70.0 * (n0 + n1 + n2);
        }
    };
})();

// --- Configuration ---
let CONFIG = {
    gridSize: 35, // Distance between points
    baseRadius: 2,
    waveSpeed: 0.0003, // Slower for elegance
    waveScale: 0.003,  // Zoom of noise
    mouseInfluence: 0.05,
    colors: {
        c1: { r: 37, g: 99, b: 235 }, // Blue
        c2: { r: 168, g: 85, b: 247 }, // Purple
        bg: { r: 248, g: 250, b: 252 } // White/Slate
    }
};

let width, height;
let time = 0;
let mouse = { x: 0, y: 0 };
let targetMouse = { x: 0, y: 0 };

// --- Theme Handling ---
window.updateFluidColors = (c1Hex, c2Hex, bgHex) => {
    const hexToRgb = (hex) => {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null;
    }

    const c1 = hexToRgb(c1Hex);
    const c2 = hexToRgb(c2Hex);
    const bg = hexToRgb(bgHex);

    if (c1) CONFIG.colors.c1 = c1;
    if (c2) CONFIG.colors.c2 = c2;
    if (bg) CONFIG.colors.bg = bg;
};

// --- Setup ---
function resize() {
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;
    // Set center as default mouse
    if (mouse.x === 0 && mouse.y === 0) {
        mouse.x = width / 2;
        mouse.y = height / 2;
        targetMouse.x = width / 2;
        targetMouse.y = height / 2;
    }
}
window.addEventListener('resize', resize);
document.addEventListener('mousemove', (e) => {
    targetMouse.x = e.clientX;
    targetMouse.y = e.clientY;
});

// --- Render Loop ---
function animate(t) {
    if (!width) resize();

    // Smooth mouse interaction
    mouse.x += (targetMouse.x - mouse.x) * 0.05;
    mouse.y += (targetMouse.y - mouse.y) * 0.05;

    // Clear
    ctx.clearRect(0, 0, width, height);
    // Optional: Fill BG if canvas isn't transparent (we rely on transparent canvas + CSS bg for glass)
    // But for points to look good, we can just leave it transparent or draw.

    // Draw Grid
    const cols = Math.ceil(width / CONFIG.gridSize);
    const rows = Math.ceil(height / CONFIG.gridSize);

    // Calculate color mixing factor based on mouse position (normalized X)
    // Moves from Color1 to Color2 as you move left-to-right
    let mixFactor = mouse.x / width;

    // Interpolate current palette
    const r = CONFIG.colors.c1.r + (CONFIG.colors.c2.r - CONFIG.colors.c1.r) * mixFactor;
    const g = CONFIG.colors.c1.g + (CONFIG.colors.c2.g - CONFIG.colors.c1.g) * mixFactor;
    const b = CONFIG.colors.c1.b + (CONFIG.colors.c2.b - CONFIG.colors.c1.b) * mixFactor;

    const fillStyle = `rgba(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}`;

    for (let x = 0; x <= width + CONFIG.gridSize; x += CONFIG.gridSize) {
        for (let y = 0; y <= height + CONFIG.gridSize; y += CONFIG.gridSize) {

            // Noise 1: Wave motion
            // Use time and spatial coords
            let n1 = SimplexNoise.noise(
                x * CONFIG.waveScale,
                y * CONFIG.waveScale + t * CONFIG.waveSpeed
            );

            // Mouse Distort 
            // Calculate distance to mouse
            let dx = x - mouse.x;
            let dy = y - mouse.y;
            let dist = Math.sqrt(dx * dx + dy * dy);

            // Create a "lens" or "bulge" effect near mouse
            let mouseEffect = Math.max(0, (400 - dist) / 400); // 0 to 1
            mouseEffect = Math.pow(mouseEffect, 2); // Sharpen curve

            // Reptile Scale Effect
            // Points grow/shrink based on noise and mouse
            let radius = CONFIG.baseRadius + (n1 * 3) + (mouseEffect * 4);

            // Clamp radius
            if (radius < 0) radius = 0;

            // Alpha also affected by size (smaller = fainter) for depth
            let alpha = 0.3 + (n1 * 0.2) + (mouseEffect * 0.4);
            if (alpha > 1) alpha = 1;

            ctx.beginPath();
            ctx.arc(x, y, radius, 0, Math.PI * 2);
            ctx.fillStyle = `${fillStyle}, ${alpha})`;
            ctx.fill();
        }
    }

    requestAnimationFrame(animate);
}

resize();
requestAnimationFrame(animate);
