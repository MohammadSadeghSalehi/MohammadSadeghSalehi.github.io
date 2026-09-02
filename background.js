/**
 * Alive reptile scale field.
 * Hex-packed scutes with a traveling wave, breath, and mouse ripple.
 * Theme follows html[data-theme] every frame so night mode cannot desync.
 */

const container = document.getElementById('floating-container');
const canvas = document.createElement('canvas');
container.innerHTML = '';
container.appendChild(canvas);

const ctx = canvas.getContext('2d', { alpha: true });

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

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const CONFIG = {
    colW: 30,
    baseRadius: 16.6,
    dark: false,
    colors: {
        c1: { r: 150, g: 158, b: 168 },
        c2: { r: 110, g: 150, b: 186 },
        sheen: { r: 255, g: 255, b: 255 },
        rim: { r: 90, g: 100, b: 112 },
        bg: { r: 245, g: 245, b: 247 }
    }
};

let width = 0;
let height = 0;
let dpr = 1;
let mouse = { x: 0, y: 0 };
let targetMouse = { x: 0, y: 0 };
let hero = { cx: 0, cy: 0, rx: 1, ry: 1, ready: false };
let running = true;
let lastTheme = '';

function applyTheme(isDark) {
    CONFIG.dark = !!isDark;
    if (isDark) {
        CONFIG.colors.bg = { r: 0, g: 0, b: 0 };
        CONFIG.colors.c1 = { r: 26, g: 78, b: 104 };
        CONFIG.colors.c2 = { r: 64, g: 168, b: 196 };
        CONFIG.colors.sheen = { r: 186, g: 232, b: 248 };
        CONFIG.colors.rim = { r: 10, g: 36, b: 50 };
    } else {
        CONFIG.colors.bg = { r: 245, g: 245, b: 247 };
        CONFIG.colors.c1 = { r: 148, g: 156, b: 166 };
        CONFIG.colors.c2 = { r: 86, g: 150, b: 214 };
        CONFIG.colors.sheen = { r: 255, g: 255, b: 255 };
        CONFIG.colors.rim = { r: 120, g: 130, b: 142 };
    }
}

function isDarkMode() {
    return document.documentElement.getAttribute('data-theme') === 'dark';
}

function syncTheme() {
    const isDark = isDarkMode();
    const key = isDark ? 'dark' : 'light';
    if (key !== lastTheme) {
        lastTheme = key;
        applyTheme(isDark);
        canvas.style.backgroundColor = isDark ? '#000000' : '#f5f5f7';
    }
}

applyTheme(isDarkMode());
lastTheme = CONFIG.dark ? 'dark' : 'light';
canvas.style.backgroundColor = CONFIG.dark ? '#000000' : '#f5f5f7';

window.updateFluidColors = () => {
    lastTheme = '';
    syncTheme();
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
        mouse.x = width * 0.7;
        mouse.y = height * 0.32;
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
    if (r.width < 8 || r.bottom < -40 || r.top > height + 40) {
        hero.ready = false;
        return;
    }
    hero.cx = r.left + r.width * 0.5;
    hero.cy = r.top + r.height * 0.4;
    hero.rx = r.width * 0.72 + 88;
    hero.ry = r.height * 0.82 + 72;
    hero.ready = true;
}

function textMask(x, y) {
    if (!hero.ready) return 1;
    const dx = (x - hero.cx) / hero.rx;
    const dy = (y - hero.cy) / hero.ry;
    const d = Math.sqrt(dx * dx + dy * dy);
    if (d >= 1.15) return 1;
    if (d <= 0.3) return 0.08;
    const t = (d - 0.3) / 0.85;
    const s = t * t * (3 - 2 * t);
    return 0.08 + 0.92 * s;
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
    syncTheme();
    const bg = CONFIG.colors.bg;
    ctx.fillStyle = `rgb(${bg.r}, ${bg.g}, ${bg.b})`;
    ctx.fillRect(0, 0, width, height);

    refreshHero();

    const colW = CONFIG.colW;
    const rowH = colW * 0.86602540378;
    const seconds = timeMs * 0.001;
    const speed = reduceMotion ? 0.45 : 1;
    const t = seconds * speed;
    const rows = Math.ceil(height / rowH) + 2;
    const cols = Math.ceil(width / colW) + 2;
    const ambient = CONFIG.dark ? 0.09 : 0.05;
    const amp = CONFIG.dark ? 0.16 : 0.1;

    for (let row = -1; row < rows; row++) {
        const y = row * rowH;
        const xOff = (row & 1) * colW * 0.5;
        for (let col = -1; col < cols; col++) {
            const x = col * colW + xOff;

            const n1 = SimplexNoise.noise(x * 0.0044, y * 0.0044 + t * 0.42);
            const n2 = SimplexNoise.noise(x * 0.0028 + 12, y * 0.0028 - t * 0.18);
            const travel = Math.sin(x * 0.016 + y * 0.011 - t * 2.35);
            const breath = 0.5 + 0.5 * Math.sin(t * 1.35 + n2);

            const dx = x - mouse.x;
            const dy = y - mouse.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            let mouseEffect = Math.max(0, (320 - dist) / 320);
            mouseEffect *= mouseEffect * (0.65 + 0.35 * Math.sin(dist * 0.045 - t * 6));

            const lift = 0.5 + 0.28 * n1 + 0.22 * travel * breath;
            const mask = textMask(x, y);
            if (mask < 0.06) continue;

            const radius = CONFIG.baseRadius * (0.62 + 0.4 * lift) + mouseEffect * 4.2;
            if (radius < 1.2) continue;

            let alpha = (ambient + lift * amp + mouseEffect * 0.18) * mask;
            if (alpha > 0.38) alpha = 0.38;

            const tone = mix(CONFIG.colors.c1, CONFIG.colors.c2, 0.5 + 0.5 * n2);
            ctx.beginPath();
            ctx.arc(x, y, radius, 0, Math.PI * 2);
            ctx.fillStyle = rgba(tone, alpha);
            ctx.fill();

            ctx.strokeStyle = rgba(CONFIG.colors.rim, alpha * 0.4);
            ctx.lineWidth = 0.6;
            ctx.stroke();

            if (lift > 0.58 && mask > 0.2) {
                ctx.beginPath();
                ctx.arc(x - radius * 0.2, y - radius * 0.26, radius * 0.24, 0, Math.PI * 2);
                ctx.fillStyle = rgba(CONFIG.colors.sheen, alpha * 0.28);
                ctx.fill();
            }
        }
    }
}

function animate(timeMs) {
    if (!width) resize();
    mouse.x += (targetMouse.x - mouse.x) * 0.07;
    mouse.y += (targetMouse.y - mouse.y) * 0.07;
    drawField(timeMs);
    if (running) requestAnimationFrame(animate);
}

window.addEventListener('resize', resize);

document.addEventListener('mousemove', (e) => {
    targetMouse.x = e.clientX;
    targetMouse.y = e.clientY;
});

document.addEventListener('visibilitychange', () => {
    running = document.visibilityState === 'visible';
    if (running) requestAnimationFrame(animate);
});

new MutationObserver(() => {
    lastTheme = '';
    syncTheme();
}).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

resize();
syncTheme();
drawField(0);
requestAnimationFrame(animate);
