/**
 * 1. NAVIGATION ENGINE
 */
let currentIdx = 0;
const slides = document.querySelectorAll('.slide');
const counter = document.getElementById('page-counter');

function updateNavigation() {
    slides.forEach((s, i) => {
        s.classList.toggle('active', i === currentIdx);
    });
    counter.innerHTML = `<span>${currentIdx + 1}</span> / ${slides.length}`;
}

window.setSlide = id => {
    if (id < slides.length && id >= 0) {
        currentIdx = id;
        updateNavigation();
    }
}

window.nextSlide = function() {
    if (currentIdx < slides.length - 1) {
        currentIdx++;
        updateNavigation();
    }
}

window.prevSlide = function() {
    if (currentIdx > 0) {
        currentIdx--;
        updateNavigation();
    }
}

window.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight' || e.key === ' ') nextSlide();
    if (e.key === 'ArrowLeft') prevSlide();
});

/* UI */

let ui_time = 3;
let ui_counter;

function showUI(){
    document.body.classList.add("show-ui");
    ui_time = 3;
}

setInterval(() => {
    if(ui_time <= 0) return;
    ui_time -= 1;
    if(ui_time <= 0){
        document.body.classList.remove("show-ui");
    }
}, 1000);

window.addEventListener("mousemove", showUI);
window.addEventListener("click", showUI);
[...document.querySelectorAll(".ui")].forEach(el => {
    el.addEventListener("hover", showUI);
    el.addEventListener("click", showUI);
});

function toggleFullscreen(){
    if(document.fullscreenElement == null){
        if(document.body.requestFullscreen) document.body.requestFullscreen();
        else if(document.body.mozRequestFullscreen) document.body.mozRequestFullscreen();
        else document.body.webkitRequestFullscreen();
        document.querySelector("#fullscreen-btn").innerHTML = '<i class="fa-solid fa-compress"></i>';
    } else {
        if(document.cancelFullscreen) document.cancelFullScreen();
        else if(document.mozCancelFullscreen) document.mozCancelFullScreen();
        else document.webkitCancelFullScreen();
        document.querySelector("#fullscreen-btn").innerHTML = '<i class="fa-solid fa-expand"></i>';
    }
}

/**
 * 2. BOIDS SIMULATION (Slide 6)
 */
const boidsCanvas = document.getElementById('boidsCanvas');
const bCtx = boidsCanvas.getContext('2d');
let boids = [];
let boidRules = { sep: true, ali: true, coh: true };

function fitCanvas(canvas, ctx) {
    const rect = canvas.getBoundingClientRect();
    const cssWidth = Math.max(1, Math.round(rect.width));
    const cssHeight = Math.max(1, Math.round(rect.height));
    const dpr = window.devicePixelRatio || 1;
    const pixelWidth = Math.round(cssWidth * dpr);
    const pixelHeight = Math.round(cssHeight * dpr);

    if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
        canvas.width = pixelWidth;
        canvas.height = pixelHeight;
    }

    // Draw using CSS pixel coordinates while keeping sharp rendering.
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { width: cssWidth, height: cssHeight };
}

function initBoids() {
    const size = fitCanvas(boidsCanvas, bCtx);
    boids = [];
    for (let i = 0; i < 70; i++) {
        boids.push({
            x: Math.random() * size.width,
            y: Math.random() * size.height,
            vx: (Math.random() - 0.5) * 4,
            vy: (Math.random() - 0.5) * 4
        });
    }
}

window.toggleBoidRule = function(rule, btn) {
    boidRules[rule] = !boidRules[rule];
    btn.classList.toggle('active', boidRules[rule]);
}

function runBoids() {
    const size = fitCanvas(boidsCanvas, bCtx);
    bCtx.clearRect(0, 0, size.width, size.height);
    boids.forEach(b => {
        let sX = 0, sY = 0, aX = 0, aY = 0, cX = 0, cY = 0, neighbors = 0;
        boids.forEach(other => {
            if (b === other) return;
            let d = Math.hypot(b.x - other.x, b.y - other.y);
            if (d < 60) {
                if (d < 25) { sX += b.x - other.x; sY += b.y - other.y; }
                aX += other.vx; aY += other.vy;
                cX += other.x; cY += other.y;
                neighbors++;
            }
        });

        if (neighbors > 0) {
            if (boidRules.sep) { b.vx += sX * 0.05; b.vy += sY * 0.05; }
            if (boidRules.ali) { b.vx += (aX/neighbors - b.vx) * 0.05; b.vy += (aY/neighbors - b.vy) * 0.05; }
            if (boidRules.coh) { b.vx += (cX/neighbors - b.x) * 0.01; b.vy += (cY/neighbors - b.y) * 0.01; }
        }

        let speed = Math.hypot(b.vx, b.vy);
        if (speed > 3) { b.vx = (b.vx/speed)*3; b.vy = (b.vy/speed)*3; }

        b.x += b.vx; b.y += b.vy;
        if (b.x < 0) b.x = size.width; if (b.x > size.width) b.x = 0;
        if (b.y < 0) b.y = size.height; if (b.y > size.height) b.y = 0;

        bCtx.fillStyle = '#14b8a6';
        bCtx.beginPath(); bCtx.arc(b.x, b.y, 4, 0, Math.PI * 2); bCtx.fill();
    });
    requestAnimationFrame(runBoids);
}

/**
 * 3. ACO SIMULATION (Slide 7)
 */
const acoCanvas = document.getElementById('acoCanvas');
const aCtx = acoCanvas.getContext('2d');
let trail = [];

function initACO() {
    fitCanvas(acoCanvas, aCtx);
    resetACO();
}

let grid, cellSize = 10, nextFrame;
let iterations = 0;

window.resetACO = function() {
    window.cancelAnimationFrame(nextFrame);
    const size = fitCanvas(acoCanvas, aCtx);
    iterations = 0;
    const gw = Math.ceil(size.width / cellSize), gh = Math.ceil(size.height / cellSize);
    grid = new Grid(gw, gh);
    runACO();
}

function runACO() {
    const size = fitCanvas(acoCanvas, aCtx);
    grid.colony.iteration();
    iterations += 1;
    const maxPh = grid.max_pheromones;
    for(let y = 0; y < grid.height; y++){
        for(let x = 0; x < grid.width; x++){
            const cell = grid.getCell(x, y);
            if(cell.type == "food") aCtx.fillStyle = "#0f0";
            else if(cell.type == "colony") aCtx.fillStyle = "#f00";
            else if(cell.type == "obstacle") aCtx.fillStyle="#888";
            else aCtx.fillStyle = `rgb(0, 0, ${Math.pow(cell.pheromones / maxPh, 1.5) * 255})`;
            aCtx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
        }
    }
    aCtx.fillStyle = "#fff";
    aCtx.strokeStyle = "#000";
    aCtx.lineWidth = 3;
    aCtx.font = "bold 18px Arial";
    aCtx.textAlign = "start";
    aCtx.textBaseline = "bottom";
    aCtx.strokeText(`Iteration ${iterations}`, 10, size.height - 10);
    aCtx.fillText(`Iteration ${iterations}`, 10, size.height - 10);
    if(currentIdx == 6 && iterations < 500) nextFrame = window.requestAnimationFrame(runACO);
}

/**
 * 4. PSO SIMULATION (Slide 8)
 */
const psoCanvas = document.getElementById('psoCanvas');
const pCtx = psoCanvas.getContext('2d');
let particles = [];
let target = { x: 300, y: 210 };

function initPSO() {
    fitCanvas(psoCanvas, pCtx);
    scatterPSO();
}

window.scatterPSO = function() {
    const size = fitCanvas(psoCanvas, pCtx);
    particles = [];
    target = {
        x: 100 + Math.random() * Math.max(10, size.width - 200),
        y: 100 + Math.random() * Math.max(10, size.height - 200)
    };
    for(let i=0; i<50; i++) {
        particles.push({
            x: Math.random() * size.width,
            y: Math.random() * size.height,
            vx: 0, vy: 0,
            pBest: { x: Math.random() * size.width, y: Math.random() * size.height }
        });
    }
}

function runPSO() {
    const size = fitCanvas(psoCanvas, pCtx);
    pCtx.fillStyle = 'rgba(2, 6, 23, 0.3)';
    pCtx.fillRect(0,0, size.width, size.height);
    
    // Target
    pCtx.strokeStyle = '#f87171'; pCtx.lineWidth = 2; pCtx.beginPath(); pCtx.arc(target.x, target.y, 10, 0, Math.PI*2); pCtx.stroke();

    particles.forEach(p => {
        p.vx += (p.pBest.x - p.x) * 0.01 + (target.x - p.x) * 0.02;
        p.vy += (p.pBest.y - p.y) * 0.01 + (target.y - p.y) * 0.02;
        p.vx *= 0.95; p.vy *= 0.95;
        p.x += p.vx; p.y += p.vy;

        pCtx.fillStyle = 'white'; pCtx.beginPath(); pCtx.arc(p.x, p.y, 3, 0, Math.PI * 2); pCtx.fill();
    });
    requestAnimationFrame(runPSO);
}

// STARTUP
window.addEventListener('load', () => {
    initBoids(); runBoids();
    initACO();
    initPSO(); runPSO();
});

window.addEventListener('resize', () => {
    initBoids();
    initACO();
    initPSO();
});

setSlide(6);