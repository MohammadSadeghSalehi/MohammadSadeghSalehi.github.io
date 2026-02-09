/* 
    Fluid Simulation Background 
    Based on WebGL Fluid Simulation concepts.
    Simplified/customized for this portfolio.
*/

const canvas = document.createElement('canvas');
canvas.id = 'fluid-canvas';
canvas.style.position = 'fixed';
canvas.style.top = '0';
canvas.style.left = '0';
canvas.style.width = '100%';
canvas.style.height = '100vh';
canvas.style.zIndex = '-1';
canvas.style.pointerEvents = 'none';
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
uniform vec3 u_color1;
uniform vec3 u_color2;
uniform vec3 u_bg_color;

// Simplex 2D noise
vec3 permute(vec3 x) { return mod(((x*34.0)+1.0)*x, 289.0); }
float snoise(vec2 v){
  const vec4 C = vec4(0.211324865405187, 0.366025403784439,
           -0.577350269189626, 0.024390243902439);
  vec2 i  = floor(v + dot(v, C.yy) );
  vec2 x0 = v -   i + dot(i, C.xx);
  vec2 i1;
  i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod(i, 289.0);
  vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 ))
  + i.x + vec3(0.0, i1.x, 1.0 ));
  vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
  m = m*m ;
  return 105.0 * dot( m*m, vec3( dot(p.x,x0), dot(p.y,x12.xy), dot(p.z,x12.zw) ) );
}

void main() {
    vec2 st = gl_FragCoord.xy / u_resolution.xy;
    st.x *= u_resolution.x / u_resolution.y; // Aspect ratio fix (makes scale consistent)
    
    float time = u_time * 0.2;
    
    // Scale up for detail
    vec2 p = st * 3.0; // Zoom out
    
    // Domain Warping for Liquid/Reptile effect
    vec2 q = vec2(0.);
    q.x = snoise(p + vec2(time * 0.5, time * 0.5));
    q.y = snoise(p + vec2(1.0));

    vec2 r = vec2(0.);
    r.x = snoise(p + 1.0 * q + vec2(1.7, 9.2) + 0.15 * time);
    r.y = snoise(p + 1.0 * q + vec2(8.3, 2.8) + 0.126 * time);

    float f = snoise(p + r);

    // Mix colors based on noise value 'f'
    // Map f (-1, 1) to (0, 1)
    f = f * 0.5 + 0.5;
    
    // Make the pattern more distinct
    f = pow(f, 0.8); 

    // Base background
    vec3 color = u_bg_color;
    
    // Mix in the dynamic colors
    // We use the warped coordinates 'r' to create swirling interactions
    float mixAmount1 = smoothstep(0.2, 0.8, f + r.x * 0.5);
    float mixAmount2 = smoothstep(0.2, 0.8, f - r.y * 0.5);
    
    color = mix(color, u_color1, mixAmount1 * 0.6); // 0.6 opacity
    color = mix(color, u_color2, mixAmount2 * 0.5); 

    // Mouse Interaction: Ripples
    vec2 mouseUV = u_mouse;
    mouseUV.x *= u_resolution.x / u_resolution.y;
    float dist = distance(st, mouseUV);
    float interaction = smoothstep(0.3, 0.0, dist);
    color += interaction * 0.15 * u_color1; // Add glow near mouse

    gl_FragColor = vec4(color, 1.0);
}
`;

// Default colors (will be overridden by site data)
let configColors = {
    color1: [0.1, 0.4, 0.9], // Blue
    color2: [0.6, 0.1, 0.8], // Purple
    bgColor: [0.05, 0.05, 0.1] // Dark BG
};

// Global function to update colors from script.js
window.updateFluidColors = (c1, c2, bg) => {
    // Helper to hex to normalized vec3
    const hexToVec3 = (hex) => {
        let r = 0, g = 0, b = 0;
        if (hex.length === 4) {
            r = parseInt(hex[1] + hex[1], 16);
            g = parseInt(hex[2] + hex[2], 16);
            b = parseInt(hex[3] + hex[3], 16);
        } else if (hex.length === 7) {
            r = parseInt(hex.slice(1, 3), 16);
            g = parseInt(hex.slice(3, 5), 16);
            b = parseInt(hex.slice(5, 7), 16);
        }
        return [r / 255, g / 255, b / 255];
    };

    if (c1) configColors.color1 = hexToVec3(c1);
    if (c2) configColors.color2 = hexToVec3(c2);
    if (bg) configColors.bgColor = hexToVec3(bg);
};

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

    gl.uniform3fv(gl.getUniformLocation(program, "u_color1"), configColors.color1);
    gl.uniform3fv(gl.getUniformLocation(program, "u_color2"), configColors.color2);
    gl.uniform3fv(gl.getUniformLocation(program, "u_bg_color"), configColors.bgColor);

    gl.drawArrays(gl.TRIANGLES, 0, 6);

    requestAnimationFrame(render);
}

requestAnimationFrame(render);
