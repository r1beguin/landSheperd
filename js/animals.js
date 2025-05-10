import { Plant } from './plants.js';
import { Soil } from './soil.js';
import { PLANT_TYPES } from './plants.js';

class Squirrel {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.color = '#D2691E'; // Ginger color
        this.moveInterval = Math.random() * 4000 + 1000; // Random interval between 1 to 5 seconds
        this.lastMoveTime = performance.now();
        this.hasSpawnedTree = false; // Track if a tree has been spawned during the current movement
    }

    moveToRandomTree(grid) {
        const trees = [];

        // Find all tree cells in the grid
        for (let y = 0; y < grid.length; y++) {
            for (let x = 0; x < grid[y].length; x++) {
                if (grid[y][x] instanceof Plant) {
                    trees.push({ x, y });
                }
            }
        }

        if (trees.length > 0) {
            const randomTree = trees[Math.floor(Math.random() * trees.length)];
            this.targetX = randomTree.x;
            this.targetY = randomTree.y;
        }
    }

    update(grid, deltaTime) {
        const currentTime = performance.now();
        if (currentTime - this.lastMoveTime >= this.moveInterval) {
            this.moveToRandomTree(grid);
            this.lastMoveTime = currentTime;
        }

        // Smoothly move towards the target position
        if (this.targetX !== undefined && this.targetY !== undefined) {
            const dx = this.targetX - this.x;
            const dy = this.targetY - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance > 0) {
                const speed = 3; // Speed factor for smooth movement
                const stepX = (dx / distance) * speed * deltaTime;
                const stepY = (dy / distance) * speed * deltaTime;

                const previousX = Math.floor(this.x);
                const previousY = Math.floor(this.y);

                this.x += stepX;
                this.y += stepY;

                // Snap to target if close enough
                if (Math.abs(this.x - this.targetX) < 0.1 && Math.abs(this.y - this.targetY) < 0.1) {
                    this.x = this.targetX;
                    this.y = this.targetY;
                    this.targetX = undefined;
                    this.targetY = undefined;
                }

                // Check if the squirrel crosses a soil cell and attempt to spawn a tree
                const crossedX = Math.floor(this.x);
                const crossedY = Math.floor(this.y);

                if (
                    crossedX >= 0 && crossedX < grid[0].length &&
                    crossedY >= 0 && crossedY < grid.length &&
                    grid[crossedY][crossedX] instanceof Soil &&
                    grid[crossedY][crossedX].type === 'soil' &&
                    !this.hasSpawnedTree // Ensure only one tree is spawned per movement
                ) {
                    const fertility = grid[crossedY][crossedX].fertility;
                    const baseProbability = 1 / 10; // Base probability of 1 tree per 10 cells crossed
                    const maxProbability = 1 / 2; // Max probability of 1 tree per 2 cells crossed
                    const spawnProbability = baseProbability + (fertility / 100) * (maxProbability - baseProbability);

                    if (Math.random() < spawnProbability) {
                        const species = Object.keys(PLANT_TYPES);
                        const randomSpecies = species[Math.floor(Math.random() * species.length)];
                        grid[crossedY][crossedX] = new Plant(randomSpecies, PLANT_TYPES[randomSpecies]);
                        this.hasSpawnedTree = true; // Mark that a tree has been spawned
                    }
                }

                // Reset the tree spawn flag when the squirrel reaches its target
                if (this.targetX === undefined && this.targetY === undefined) {
                    this.hasSpawnedTree = false;
                }
            }
        }
    }
}

export { Squirrel };