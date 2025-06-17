import { setWindActive, updateWindIntensity, updateBurstFrequency } from './systems/wind.js';

const windIntensitySlider = document.getElementById('wind-intensity');
const burstFrequencySlider = document.getElementById('burst-frequency');
const toggleWindButton = document.getElementById('toggle-wind');
const toggleDebugUIButton = document.getElementById('toggle-debug-ui');
const debugUI = document.getElementById('debug-ui');

let isWindActive = true; // Wind is stopped by default
let isDebugUIVisible = false;

let windIntensity = 1;
let windBurstFrequency = 1;

if (windIntensitySlider) {
    windIntensitySlider.addEventListener('input', (event) => {
        windIntensity = event.target.value / 100; // Normalize to 0-1 range
        updateWindIntensity(windIntensity);
    });
    windIntensity = windIntensitySlider.value / 100;
}

if (burstFrequencySlider) {
    burstFrequencySlider.addEventListener('input', (event) => {
        windBurstFrequency = event.target.value / 100; // Normalize to 0-1 range
        updateBurstFrequency(windBurstFrequency);
    });
    windBurstFrequency = burstFrequencySlider.value / 100;
}

window.addEventListener('windIntensityChanged', (e) => {
    windIntensity = e.detail;
    updateWindIntensity(windIntensity);
});

window.addEventListener('windBurstFrequencyChanged', (e) => {
    windBurstFrequency = e.detail;
    updateBurstFrequency(windBurstFrequency);
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

let frameCount = 0;
let fps = 0;

export function countFrame() {
    frameCount++;
}

setInterval(() => {
    fps = frameCount;
    frameCount = 0;
    const fpsElem = document.getElementById('fps');
    if (fpsElem) fpsElem.textContent = fps;
}, 1000);