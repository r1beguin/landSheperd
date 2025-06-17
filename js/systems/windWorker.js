self.onmessage = function (event) {
    const { grid, deltaTime, windIntensity } = event.data; // Accept windIntensity from the main thread

    const time = performance.now() * 0.001;

    for (let y = 0; y < grid.length; y++) {
        for (let x = 0; x < grid[y].length; x++) {
            const cell = grid[y][x];
            if (cell && cell.type === 'plant') {
                const baseWindFactor = 1.5 * Math.sin(time + x * 0.1);
                cell.windOffset = baseWindFactor * cell.maxWindOffset * windIntensity; // Use dynamic windIntensity
            }
        }
    }

    self.postMessage({ updatedGrid: grid });
};