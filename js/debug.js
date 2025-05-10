import { setWindActive, updateWindIntensity, updateBurstFrequency } from './wind.js';

const windIntensitySlider = document.getElementById('wind-intensity');
const burstFrequencySlider = document.getElementById('burst-frequency');
const toggleWindButton = document.getElementById('toggle-wind');
const toggleDebugUIButton = document.getElementById('toggle-debug-ui');
const debugUI = document.getElementById('debug-ui');

let isWindActive = true; // Wind is stopped by default
let isDebugUIVisible = false;

windIntensitySlider.addEventListener('input', (event) => {
    const windIntensity = event.target.value / 100; // Normalize to 0-1 range
    updateWindIntensity(windIntensity);
});

burstFrequencySlider.addEventListener('input', (event) => {
    const burstFrequency = event.target.value / 100; // Normalize to 0-1 range
    updateBurstFrequency(burstFrequency);
});

toggleWindButton.addEventListener('click', () => {
    isWindActive = !isWindActive;
    toggleWindButton.textContent = isWindActive ? 'Stop Wind' : 'Start Wind';
    setWindActive(isWindActive); // Use the function to update the global wind state
});

toggleDebugUIButton.addEventListener('click', () => {
    isDebugUIVisible = !isDebugUIVisible;
    debugUI.style.display = isDebugUIVisible ? 'block' : 'none';
    toggleDebugUIButton.textContent = isDebugUIVisible ? 'Hide Debug UI' : 'Show Debug UI';
});

const stopTimeButton = document.getElementById('stop-time');
let isTimeStopped = false;

stopTimeButton.addEventListener('click', () => {
    isTimeStopped = !isTimeStopped;
    stopTimeButton.textContent = isTimeStopped ? 'Resume Time' : 'Stop Time';
    window.dispatchEvent(new CustomEvent('toggleTime', { detail: isTimeStopped }));
});

const addSquirrelButton = document.getElementById('add-squirrel');
const removeSquirrelButton = document.getElementById('remove-squirrel');

addSquirrelButton.addEventListener('click', () => {
    window.dispatchEvent(new CustomEvent('addSquirrel'));
});

removeSquirrelButton.addEventListener('click', () => {
    window.dispatchEvent(new CustomEvent('removeSquirrel'));
});

let lastFrameTime = performance.now();
let frameCount = 0;
let fps = 0;

function updateFPS() {
    const now = performance.now();
    frameCount++;

    if (now - lastFrameTime >= 1000) {
        fps = frameCount;
        frameCount = 0;
        lastFrameTime = now;
        document.getElementById('fps').textContent = fps;
    }

    requestAnimationFrame(updateFPS);
}

updateFPS();