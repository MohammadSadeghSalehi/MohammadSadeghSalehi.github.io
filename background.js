/* 
    Fluid Simulation Background 
    Based on WebGL Fluid Simulation concepts.
    Simplified/customized for this portfolio.
*/

const canvas = document.createElement('canvas');
canvas.id = 'fluid-canvas';
document.body.prepend(canvas);

// Configuration
const config = {
    TEXTURE_DOWNSAMPLE: 1,
    DENSITY_DISSIPATION: 0.98,
    VELOCITY_DISSIPATION: 0.99,
    PRESSURE: 0.4,
    PRESSURE_ITERATIONS: 10,
    CURL: 20,
    SPLAT_RADIUS: 0.005
};

let gl = canvas.getContext('webgl');
if (!gl) gl = canvas.getContext('experimental-webgl');

// Basic shader sources (vertex/fragment)
const baseVertexShader = `
    attribute vec2 aPosition;
    varying vec2 vUv;
    void main () {
        vUv = aPosition * 0.5 + 0.5;
        gl_Position = vec4(aPosition, 0.0, 1.0);
    }
`;

const clearShader = `
    precision mediump float;
    varying vec2 vUv;
    uniform sampler2D uTexture;
    uniform float value;
    void main () {
        gl_FragColor = value * texture2D(uTexture, vUv);
    }
`;

const splatShader = `
    precision highp float;
    precision highp sampler2D;
    varying vec2 vUv;
    uniform sampler2D uTarget;
    uniform float aspectRatio;
    uniform vec3 color;
    uniform vec2 point;
    uniform float radius;
    void main () {
        vec2 p = vUv - point.xy;
        p.x *= aspectRatio;
        vec3 splat = exp(-dot(p, p) / radius) * color;
        vec3 base = texture2D(uTarget, vUv).xyz;
        gl_FragColor = vec4(base + splat, 1.0);
    }
`;

const advectionShader = `
    precision highp float;
    precision highp sampler2D;
    varying vec2 vUv;
    uniform sampler2D uVelocity;
    uniform sampler2D uSource;
    uniform vec2 texelSize;
    uniform float dt;
    uniform float dissipation;
    void main () {
        vec2 coord = vUv - dt * texture2D(uVelocity, vUv).xy * texelSize;
        vec4 result = texture2D(uSource, coord);
        float decay = 1.0 + dissipation * dt;
        gl_FragColor = result / decay;
    }
`;

// ... Additional shaders for divergence, curl, vorticity, pressure, gradient subtract would go here
// implementing a FULL stable fluids is huge. 
// For a "Liquid Ripple" distortion effect, we can cheat with a simpler refraction shader.

// Let's implement a simpler "Ripple" distortion effect using a grid mesh or a simpler shader approach
// that responds to mouse/scroll, instead of full Navier-Stokes, to ensure performance and simpler code maintenance.

/* 
   Restarting with a "Ripple" Distortion Shader approach for background 
*/

const vertexShaderSrc = `
attribute vec2 a_position;
attribute vec2 a_texCoord;
varying vec2 v_texCoord;
void main() {
   gl_Position = vec4(a_position, 0, 1);
   v_texCoord = a_texCoord;
}
`;

const fragmentShaderSrc = `
precision mediump float;
uniform vec2 u_resolution;
uniform float u_time;
uniform vec2 u_mouse;
uniform float u_scroll;

void main() {
    vec2 st = gl_FragCoord.xy / u_resolution.xy;
    
    // Liquid/Ripple effect
    float time = u_time * 0.5;
    
    // Distance from mouse
    float dist = distance(st, u_mouse);
    
    // Ripple based on distance and time
    float ripple = sin(dist * 20.0 - time * 2.0) * 0.01;
    
    // Add scroll influence
    float scrollWave = sin(st.y * 10.0 + u_scroll * 0.1) * 0.005;
    
    // Color gradient background
    vec3 color1 = vec3(0.1, 0.4, 0.9); // Blue
    vec3 color2 = vec3(0.6, 0.1, 0.8); // Purple
    vec3 bg = mix(color1, color2, st.y + st.x + sin(time));
    
    // Apply ripple to color
    bg += ripple + scrollWave;
    
    // Darken for better text contrast
    bg *= 0.15; // Very dark background
    
    gl_FragColor = vec4(bg, 1.0);
}
`;

function createShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error(gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
    }
    return shader;
}

function createProgram(gl, vertexShader, fragmentShader) {
    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error(gl.getProgramInfoLog(program));
        return null;
    }
    return program;
}

const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSrc);
const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSrc);
const program = createProgram(gl, vertexShader, fragmentShader);

const positionAttributeLocation = gl.getAttribLocation(program, "a_position");
const texCoordAttributeLocation = gl.getAttribLocation(program, "a_texCoord");

const positionBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
    -1, -1,
    1, -1,
    -1, 1,
    -1, 1,
    1, -1,
    1, 1,
]), gl.STATIC_DRAW);

const texCoordBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
    0.0, 0.0,
    1.0, 0.0,
    0.0, 1.0,
    0.0, 1.0,
    1.0, 0.0,
    1.0, 1.0,
]), gl.STATIC_DRAW);

let mouseX = 0;
let mouseY = 0;
let scrollY = 0;

document.addEventListener('mousemove', (e) => {
    mouseX = e.clientX / window.innerWidth;
    mouseY = 1.0 - e.clientY / window.innerHeight; // Flip Y
});

document.addEventListener('scroll', () => {
    scrollY = window.scrollY;
});

function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
}
window.addEventListener('resize', resize);
resize();

function render(time) {
    time *= 0.001; // convert to seconds

    gl.useProgram(program);

    // Attributes
    gl.enableVertexAttribArray(positionAttributeLocation);
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.vertexAttribPointer(positionAttributeLocation, 2, gl.FLOAT, false, 0, 0);

    gl.enableVertexAttribArray(texCoordAttributeLocation);
    gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
    gl.vertexAttribPointer(texCoordAttributeLocation, 2, gl.FLOAT, false, 0, 0);

    // Uniforms
    gl.uniform2f(gl.getUniformLocation(program, "u_resolution"), gl.canvas.width, gl.canvas.height);
    gl.uniform1f(gl.getUniformLocation(program, "u_time"), time);
    gl.uniform2f(gl.getUniformLocation(program, "u_mouse"), mouseX, mouseY);
    gl.uniform1f(gl.getUniformLocation(program, "u_scroll"), scrollY);

    gl.drawArrays(gl.TRIANGLES, 0, 6);

    requestAnimationFrame(render);
}

requestAnimationFrame(render);
