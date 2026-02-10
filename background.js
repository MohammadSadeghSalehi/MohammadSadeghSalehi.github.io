/**
 * Connected Field Background (Constellation Effect)
 * Particles connected by lines, resembling a neural network or star field.
 */

const container = document.getElementById('floating-container');
const canvas = document.createElement('canvas');
container.innerHTML = ''; // Clear previous DOM elements
container.appendChild(canvas);

const ctx = canvas.getContext('2d');

// Configuration
let CONFIG = {
    PARTICLE_COUNT: 80,
    CONNECT_DISTANCE: 150,
    rad: 2,
    speed: 0.8,
    colors: {
        dot: 'rgba(37, 99, 235, 0.5)', // Default Primary
        line: 'rgba(37, 99, 235, 0.15)'
    }
};

let particles = [];
let width, height;

// Theme integration
function updateThemeColors(c1, c2, bg) {
    // Convert hex to rgba for canvas
    const hexToRgb = (hex) => {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null;
    }

    const rgb = hexToRgb(c1);
    if (rgb) {
        CONFIG.colors.dot = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.6)`;
        CONFIG.colors.line = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.2)`;
    }
}
// Expose specific global for script.js to call
window.updateFluidColors = updateThemeColors;

class Particle {
    constructor() {
        this.x = Math.random() * width;
        this.y = Math.random() * height;
        this.vx = (Math.random() - 0.5) * CONFIG.speed;
        this.vy = (Math.random() - 0.5) * CONFIG.speed;
        this.size = Math.random() * 2 + 1;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;

        // Bounce off walls
        if (this.x < 0 || this.x > width) this.vx *= -1;
        if (this.y < 0 || this.y > height) this.vy *= -1;

        // Mouse interaction
        let dx = mouse.x - this.x;
        let dy = mouse.y - this.y;
        let distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < 200) {
            const forceDirectionX = dx / distance;
            const forceDirectionY = dy / distance;
            const force = (200 - distance) / 200;
            const directionMultiplier = 1; // 1 = attract, -1 = repel

            // Gentle attraction to mouse
            this.vx += forceDirectionX * force * 0.05 * directionMultiplier;
            this.vy += forceDirectionY * force * 0.05 * directionMultiplier;
        }
    }

    draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fillStyle = CONFIG.colors.dot;
        ctx.fill();
    }
}

// Mouse state
let mouse = { x: null, y: null };
window.addEventListener('mousemove', (e) => {
    mouse.x = e.x;
    mouse.y = e.y;
});

function init() {
    resize();
    particles = [];
    // Adjust count for mobile
    const count = window.innerWidth < 768 ? 40 : CONFIG.PARTICLE_COUNT;

    for (let i = 0; i < count; i++) {
        particles.push(new Particle());
    }
}

function resize() {
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;
}

function animate() {
    ctx.clearRect(0, 0, width, height);

    for (let i = 0; i < particles.length; i++) {
        particles[i].update();
        particles[i].draw();

        // Draw connections
        for (let j = i; j < particles.length; j++) {
            let dx = particles[i].x - particles[j].x;
            let dy = particles[i].y - particles[j].y;
            let distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < CONFIG.CONNECT_DISTANCE) {
                ctx.beginPath();
                ctx.strokeStyle = CONFIG.colors.line;
                ctx.lineWidth = 1;
                ctx.moveTo(particles[i].x, particles[i].y);
                ctx.lineTo(particles[j].x, particles[j].y);
                ctx.stroke();
            }
        }
    }
    requestAnimationFrame(animate);
}

window.addEventListener('resize', () => {
    resize();
    init();
});

init();
animate();

// Check if theme was already set in script.js and we missed it (race condition)
if (document.body.getAttribute('data-theme') === 'dark') {
    // Default dark colors if not passed yet
    updateThemeColors('#60a5fa', '#3b82f6', '#0f172a');
}
