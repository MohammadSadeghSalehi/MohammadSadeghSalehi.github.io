/**
 * Antigravity Physics Simulation
 * Responsive zero-gravity system for floating UI elements.
 */

const container = document.getElementById('floating-container');

// Configuration
const CONFIG = {
    PARTICLE_COUNT: 12, // Number of floating items
    BASE_SPEED: 0.5,
    REPULSION_RADIUS: 100, // For mouse interaction
    COLLISION_DAMPING: 0.9, // Energy loss on collision
    WALL_BOUNCE: 1.0, // Elasticity
};

// Data to populate floaters (Icons + Text)
const FLOATER_DATA = [
    { icon: 'fas fa-brain', text: 'Machine Learning' },
    { icon: 'fas fa-cube', text: '3D AI' },
    { icon: 'fas fa-eye', text: 'Computer Vision' },
    { icon: 'fas fa-calculator', text: 'Optimization' },
    { icon: 'fas fa-layer-group', text: 'Generative AI' },
    { icon: 'fas fa-code-branch', text: 'Algorithms' },
    { icon: 'fas fa-wave-square', text: 'Inverse Problems' },
    { icon: 'fas fa-chart-line', text: 'Statistics' },
    { icon: 'fab fa-python', text: 'Python' },
    { icon: 'fas fa-project-diagram', text: 'Modelling' },
    { icon: 'fas fa-camera', text: 'Imaging' },
    { icon: 'fas fa-infinity', text: 'Math' }
];

class PhysicsWorld {
    constructor(container) {
        this.container = container;
        this.bodies = [];
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.lastTime = 0;
        this.mouseX = -1000;
        this.mouseY = -1000;

        // Resize state
        this.initialWidth = window.innerWidth;

        this.init();
        this.bindEvents();
        this.animate = this.animate.bind(this);
        requestAnimationFrame(this.animate);
    }

    init() {
        // Create bodies
        FLOATER_DATA.forEach((data, i) => {
            // Limit count based on screen size (mobile optimization)
            if (window.innerWidth < 768 && i >= 6) return;

            const el = document.createElement('div');
            el.className = 'floater';
            el.innerHTML = `<i class="${data.icon}"></i> <span>${data.text}</span>`;
            this.container.appendChild(el);

            // Random start position
            const x = Math.random() * (this.width - 100);
            const y = Math.random() * (this.height - 50);

            // Random velocity
            const angle = Math.random() * Math.PI * 2;
            const speed = CONFIG.BASE_SPEED * (0.5 + Math.random() * 0.5);

            const body = {
                element: el,
                x: x,
                y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                width: 0, // Will be set on first measure
                height: 0,
                radius: 0,
                mass: 1
            };
            this.bodies.push(body);
        });

        // Measure bodies after render
        requestAnimationFrame(() => this.measureBodies());
    }

    measureBodies() {
        this.bodies.forEach(body => {
            const rect = body.element.getBoundingClientRect();
            body.width = rect.width;
            body.height = rect.height;
            // Approximate radius for collision
            body.radius = Math.max(body.width, body.height) / 2;
            body.mass = body.radius; // Mass proportional to size
        });
    }

    bindEvents() {
        window.addEventListener('resize', () => {
            this.handleResize();
        });

        document.addEventListener('mousemove', (e) => {
            this.mouseX = e.clientX;
            this.mouseY = e.clientY;
        });
    }

    handleResize() {
        const newWidth = window.innerWidth;
        const newHeight = window.innerHeight;

        // 2. Object scaling rules
        // Calculate smooth scale factor based on viewport width change
        const scaleFactor = newWidth / this.initialWidth; // Ratio relative to start

        // Update limits
        this.width = newWidth;
        this.height = newHeight;

        // 3. Boundary adjustment
        this.bodies.forEach(body => {
            // Clamp Position: Move inside if outside
            // Preserving physics continuity
            if (body.x > this.width - body.width) body.x = this.width - body.width;
            if (body.y > this.height - body.height) body.y = this.height - body.height;
            if (body.x < 0) body.x = 0;
            if (body.y < 0) body.y = 0;

            // Note: True CSS "Scaling" of text elements is tricky without blur.
            // We'll rely on Flex layout and layout recalculation mostly, 
            // but we could apply a transform scale if desired. 
            // For text legibility, usually re-layout is better, but the user requested scaling.
            // Let's stick to position integrity first.
        });

        // Re-measure in case CSS changed size (media queries)
        this.measureBodies();
    }

    updatePhysics() {
        // Simple steps for collision and movement
        for (let i = 0; i < this.bodies.length; i++) {
            const body = this.bodies[i];

            // 1. Move
            body.x += body.vx;
            body.y += body.vy;

            // 2. Wall Collision (Bounce)
            if (body.x <= 0) {
                body.x = 0;
                body.vx *= -1;
            } else if (body.x + body.width >= this.width) {
                body.x = this.width - body.width;
                body.vx *= -1;
            }

            if (body.y <= 0) {
                body.y = 0;
                body.vy *= -1;
            } else if (body.y + body.height >= this.height) {
                body.y = this.height - body.height;
                body.vy *= -1;
            }

            // 3. Mouse Repulsion
            const dx = body.x + body.width / 2 - this.mouseX;
            const dy = body.y + body.height / 2 - this.mouseY;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < CONFIG.REPULSION_RADIUS) {
                const force = (CONFIG.REPULSION_RADIUS - dist) / CONFIG.REPULSION_RADIUS;
                const angle = Math.atan2(dy, dx);
                body.vx += Math.cos(angle) * force * 0.5;
                body.vy += Math.sin(angle) * force * 0.5;
            }

            // 4. Object Collision (Circle approximation)
            for (let j = i + 1; j < this.bodies.length; j++) {
                const other = this.bodies[j];

                // Center distance
                const c1x = body.x + body.width / 2;
                const c1y = body.y + body.height / 2;
                const c2x = other.x + other.width / 2;
                const c2y = other.y + other.height / 2;

                const distX = c1x - c2x;
                const distY = c1y - c2y;
                const distance = Math.sqrt(distX * distX + distY * distY);
                const minDist = (body.radius + other.radius) * 0.8; // Overlap allowance (boxes vs circles)

                if (distance < minDist) {
                    // Collision detected
                    // Resolve overlap
                    const angle = Math.atan2(distY, distX);
                    const overlap = minDist - distance;
                    const moveX = Math.cos(angle) * overlap * 0.5;
                    const moveY = Math.sin(angle) * overlap * 0.5;

                    body.x += moveX;
                    body.y += moveY;
                    other.x -= moveX;
                    other.y -= moveY;

                    // Elastic collision response
                    // Swap velocities simplified (assuming roughly equal mass or handling mass)
                    // For better visuals, just nudging directions is often smoother than true elastic physics which can be chaotic

                    const tx = (body.vx - other.vx) * 0.1; // Exchange momentum factor
                    const ty = (body.vy - other.vy) * 0.1;

                    body.vx -= tx;
                    body.vy -= ty;
                    other.vx += tx;
                    other.vy += ty;
                }
            }

            // 5. Friction / Speed Limit
            const speed = Math.sqrt(body.vx * body.vx + body.vy * body.vy);
            const maxSpeed = 2.0;
            const minSpeed = 0.2;

            if (speed > maxSpeed) {
                body.vx = (body.vx / speed) * maxSpeed;
                body.vy = (body.vy / speed) * maxSpeed;
            }
            if (speed < minSpeed) {
                // Prevent stoppage
                body.vx *= 1.01;
                body.vy *= 1.01;
            }
        }
    }

    render() {
        // Sync DOM
        this.bodies.forEach(body => {
            // Using translate3d for GPU acceleration
            body.element.style.transform = `translate3d(${body.x}px, ${body.y}px, 0)`;
        });
    }

    animate(time) {
        // Delta time could be used here for smoother interpolation
        // but fixed step is fine for this simple shim
        this.updatePhysics();
        this.render();
        requestAnimationFrame(this.animate);
    }
}

// Initialize when DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        new PhysicsWorld(document.getElementById('floating-container'));
    });
} else {
    new PhysicsWorld(document.getElementById('floating-container'));
}
