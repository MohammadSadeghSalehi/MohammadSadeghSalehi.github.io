/**
 * Reptile scale field
 * Hex-packed scutes with a slow traveling wave and a soft mask
 * behind the hero type so name, title, and expertise stay readable.
 */

const container = document.getElementById('floating-container');
const canvas = document.createElement('canvas');
container.innerHTML = '';
container.appendChild(canvas);

const ctx = canvas.getContext('2d', { alpha: false });

const SimplexNoise = (function () {
    const F2 = 0.5 * (Math.sqrt(3.0) - 1.0);
    const G2 = (3.0 - Math.sqrt(3.0)) / 6.0;
    const p = new Uint8Array(256);
    const perm = new Uint8Array(512);
    const grad3 = [[1, 1, 0], [-1, 1, 0], [1, -1, 0], [-1, -1, 0],
        [1, 0, 1], [-1, 0, 1], [1, 0, -1], [-1, 0, -1],
        [0, 1, 1], [0, -1, 1], [0, 1, -1], [0, -1, -1]];

    for (let i = 0; i < 256; i++) p[i] = Math.floor(Math.random() * 256);
    for (let i = 0; i < 512; i++) perm[i] = p[i & 255];

    return {
        noise(xin, yin) {
            const s = (xin + yin) * F2;
            const i = Math.floor(xin + s);
            const j = Math.floor(yin + s);
            const t = (i + j) * G2;
            const x0 = xin - (i - t);
            const y0 = yin - (j - t);
            const i1 = x0 > y0 ? 1 : 0;
            const j1 = x0 > y0 ? 0 : 1;
            const x1 = x0 - i1 + G2;
            const y1 = y0 - j1 + G2;
            const x2 = x0 - 1.0 + 2.0 * G2;
            const y2 = y0 - 1.0 + 2.0 * G2;
            const ii = i & 255;
            const jj = j & 255;

            let n0 = 0, n1 = 0, n2 = 0;
            let t0 = 0.5 - x0 * x0 - y0 * y0;
            if (t0 > 0) {
                t0 *= t0;
                const g = grad3[(ii + perm[jj]) % 12];
                n0 = t0 * t0 * (g[0] * x0 + g[1] * y0);
            }
            let t1 = 0.5 - x1 * x1 - y1 * y1;
            if (t1 > 0) {
                t1 *= t1;
                const g = grad3[(ii + i1 + perm[jj + j1]) % 12];
                n1 = t1 * t1 * (g[0] * x1 + g[1] * y1);
            }
            let t2 = 0.5 - x2 * x2 - y2 * y2;
            if (t2 > 0) {
                t2 *= t2;
                const g = grad3[(ii + 1 + perm[jj + 1]) % 12];
                n2 = t2 * t2 * (g[0] * x2 + g[1] * y2);
            }
            return 70.0 * (n0 + n1 + n2);
        }
    };
})();

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const CONFIG = {
    colW: 32,
    baseRadius: 17.4,
    waveSpeed: 0.00016,
    waveScale: 0.0031,
    colors: {
        c1: { r: 150, g: 158, b: 168 },
        c2: { r: 110, g: 150, b: 186 },
        sheen: { r: 255, g: 255, b: 255 },
        rim: { r: 90, g: 100, b: 112 },
        bg: { r: 245, g: 245, b: 247 }
    },
    ambient: 0.045,
    amp: 0.07
};

let width = 0;
let height = 0;
let dpr = 1;
let mouse = { x: 0, y: 0 };
let targetMouse = { x: 0, y: 0 };
let hero = { cx: 0, cy: 0, rx: 1, ry: 1, ready: false };
let running = true;

function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
}

function applyTheme(isDark, bg) {
    if (isDark) {
        CONFIG.colors.bg = bg || { r: 0, g: 0, b: 0 };
        CONFIG.colors.c1 = { r: 28, g: 72, b: 94 };
        CONFIG.colors.c2 = { r: 46, g: 112, b: 138 };
        CONFIG.colors.sheen = { r: 170, g: 214, b: 232 };
        CONFIG.colors.rim = { r: 14, g: 40, b: 54 };
        CONFIG.ambient = 0.07;
        CONFIG.amp = 0.1;
    } else {
        CONFIG.colors.bg = bg || { r: 245, g: 245, b: 247 };
        CONFIG.colors.c1 = { r: 156, g: 162, b: 170 };
        CONFIG.colors.c2 = { r: 120, g: 152, b: 182 };
        CONFIG.colors.sheen = { r: 255, g: 255, b: 255 };
        CONFIG.colors.rim = { r: 128, g: 136, b: 146 };
        CONFIG.ambient = 0.034;
        CONFIG.amp = 0.05;
    }
}

applyTheme(document.documentElement.getAttribute('data-theme') === 'dark');

window.updateFluidColors = (c1Hex, c2Hex, bgHex) => {
    const bg = hexToRgb(bgHex);
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark' ||
        (bg && bg.r + bg.g + bg.b < 80);
    applyTheme(isDark, bg);
};

function resize() {
    width = window.innerWidth;
    height = window.innerHeight;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (!mouse.x && !mouse.y) {
        mouse.x = width * 0.62;
        mouse.y = height * 0.38;
        targetMouse.x = mouse.x;
        targetMouse.y = mouse.y;
    }
}

function refreshHero() {
    const intro = document.querySelector('.profile-intro');
    if (!intro) {
        hero.ready = false;
        return;
    }
    const r = intro.getBoundingClientRect();
    if (r.width < 8 || r.bottom < 0 || r.top > height) {
        hero.ready = false;
        return;
    }
    hero.cx = r.left + r.width * 0.5;
    hero.cy = r.top + r.height * 0.42;
    hero.rx = r.width * 0.78 + 96;
    hero.ry = r.height * 0.92 + 84;
    hero.ready = true;
}

function textMask(x, y) {
    if (!hero.ready) return 1;
    const dx = (x - hero.cx) / hero.rx;
    const dy = (y - hero.cy) / hero.ry;
    const d = Math.sqrt(dx * dx + dy * dy);
    if (d >= 1.2) return 1;
    if (d <= 0.28) return 0.03;
    const t = (d - 0.28) / 0.92;
    const s = t * t * (3 - 2 * t);
    return 0.03 + 0.97 * s;
}

function mix(a, b, t) {
    return {
        r: a.r + (b.r - a.r) * t,
        g: a.g + (b.g - a.g) * t,
        b: a.b + (b.b - a.b) * t
    };
}

function rgba(c, a) {
    return `rgba(${c.r | 0}, ${c.g | 0}, ${c.b | 0}, ${a})`;
}

function drawField(timeMs) {
    const bg = CONFIG.colors.bg;
    ctx.fillStyle = `rgb(${bg.r}, ${bg.g}, ${bg.b})`;
    ctx.fillRect(0, 0, width, height);

    refreshHero();

    const colW = CONFIG.colW;
    const rowH = colW * 0.86602540378;
    const t = reducedMotion ? 0 : timeMs;
    const rows = Math.ceil(height / rowH) + 2;
    const cols = Math.ceil(width / colW) + 2;

    for (let row = -1; row < rows; row++) {
        const y = row * rowH;
        const xOff = (row & 1) * colW * 0.5;
        for (let col = -1; col < cols; col++) {
            const x = col * colW + xOff;

            const n1 = SimplexNoise.noise(
                x * CONFIG.waveScale,
                y * CONFIG.waveScale + t * CONFIG.waveSpeed
            );
            const n2 = SimplexNoise.noise(
                x * CONFIG.waveScale * 0.55 + 18,
                y * CONFIG.waveScale * 0.55
            );

            const dx = x - mouse.x;
            const dy = y - mouse.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            let mouseEffect = Math.max(0, (280 - dist) / 280);
            mouseEffect *= mouseEffect;

            const lift = 0.5 + 0.5 * n1;
            const mask = textMask(x, y);
            if (mask < 0.04) continue;

            const radius = CONFIG.baseRadius * (0.78 + 0.22 * lift) + mouseEffect * 2.4;
            if (radius < 1) continue;

            let alpha = (CONFIG.ambient + lift * CONFIG.amp + mouseEffect * 0.1) * mask;
            if (alpha > 0.22) alpha = 0.22;

            const tone = mix(CONFIG.colors.c1, CONFIG.colors.c2, 0.5 + 0.5 * n2);
            ctx.beginPath();
            ctx.arc(x, y, radius, 0, Math.PI * 2);
            ctx.fillStyle = rgba(tone, alpha);
            ctx.fill();

            ctx.strokeStyle = rgba(CONFIG.colors.rim, alpha * 0.32);
            ctx.lineWidth = 0.55;
            ctx.stroke();

            if (radius > 6 && mask > 0.18) {
                ctx.beginPath();
                ctx.arc(x - radius * 0.22, y - radius * 0.28, radius * 0.26, 0, Math.PI * 2);
                ctx.fillStyle = rgba(CONFIG.colors.sheen, alpha * 0.22);
                ctx.fill();
            }
        }
    }
}

function animate(timeMs) {
    if (!width) resize();
    if (!reducedMotion) {
        mouse.x += (targetMouse.x - mouse.x) * 0.035;
        mouse.y += (targetMouse.y - mouse.y) * 0.035;
    }
    drawField(timeMs);
    if (running && !reducedMotion) requestAnimationFrame(animate);
}

window.addEventListener('resize', () => {
    resize();
    if (reducedMotion) drawField(0);
});

document.addEventListener('mousemove', (e) => {
    targetMouse.x = e.clientX;
    targetMouse.y = e.clientY;
});

document.addEventListener('visibilitychange', () => {
    running = document.visibilityState === 'visible';
    if (running && !reducedMotion) requestAnimationFrame(animate);
});

new MutationObserver(() => {
    applyTheme(document.documentElement.getAttribute('data-theme') === 'dark', CONFIG.colors.bg);
}).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

resize();
if (reducedMotion) {
    drawField(0);
} else {
    requestAnimationFrame(animate);
}
