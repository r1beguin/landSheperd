// PixiJS renderer setup for LandShepherd
// Usage: import { setupPixi, renderWorld } from './renderers/pixiRenderer.js';

import * as PIXI from 'https://cdn.jsdelivr.net/npm/pixi.js@7.2.4/dist/pixi.mjs';

let app;
let treeContainer;
let backgroundContainer;
let flowerContainer;
let beeContainer;
let characterContainer;
let cachedBackground = null;
let cachedGridHash = '';

// --- Batching/reuse for dynamic entities ---
let treeGraphicsPool = [];
let flowerGraphicsPool = [];
let beeGraphicsPool = [];
let characterGraphic = null;
const MAX_POOL_SIZE = 2000; // Limit pool size to avoid unbounded growth

let treeSpritePool = [];
let treeBaseTexture = null;

function hashGrid(grid) {
    // Simple hash: join all cell types and fertility
    return grid.map(row => row.map(cell => cell.type[0] + Math.round(cell.fertility)).join(',')).join(';');
}

function drawBackground(grid, pixelSize) {
    const hash = hashGrid(grid);
    if (cachedBackground && cachedGridHash === hash) {
        return cachedBackground;
    }
    if (cachedBackground) {
        cachedBackground.destroy({ texture: true, children: true });
    }
    const g = new PIXI.Graphics();
    for (let y = 0; y < grid.length; y++) {
        for (let x = 0; x < grid[0].length; x++) {
            const cell = grid[y][x];
            if (cell.type === 'water') {
                g.beginFill(0x1E90FF);
            } else {
                const r = Math.floor((100 - cell.fertility) * 1.2 + 50);
                const gCol = Math.floor((100 - cell.fertility) * 0.6 + 25);
                g.beginFill((r << 16) | (gCol << 8));
            }
            g.drawRect(x * pixelSize, y * pixelSize, pixelSize, pixelSize);
            g.endFill();
        }
    }
    // Convert to sprite for fast rendering
    const texture = app.renderer.generateTexture(g);
    const sprite = new PIXI.Sprite(texture);
    cachedBackground = sprite;
    cachedGridHash = hash;
    return sprite;
}

function getOrCreateGraphic(pool, index) {
    if (pool[index]) {
        pool[index].visible = true;
        return pool[index];
    } else if (pool.length < MAX_POOL_SIZE) {
        const g = new PIXI.Graphics();
        pool.push(g);
        return g;
    } else {
        // Reuse the last graphic if pool is full
        return pool[pool.length - 1];
    }
}

function hideUnusedGraphics(pool, usedCount) {
    for (let i = usedCount; i < pool.length; i++) {
        pool[i].visible = false;
    }
    // Optionally shrink pool if it grows too large
    if (pool.length > MAX_POOL_SIZE) {
        for (let i = MAX_POOL_SIZE; i < pool.length; i++) {
            pool[i].destroy();
        }
        pool.length = MAX_POOL_SIZE;
    }
}

function getOrCreateSprite(pool, index, baseTexture) {
    if (pool[index]) {
        pool[index].visible = true;
        return pool[index];
    } else {
        const sprite = new PIXI.Sprite(baseTexture);
        pool.push(sprite);
        return sprite;
    }
}

function hideUnusedSprites(pool, usedCount) {
    for (let i = usedCount; i < pool.length; i++) {
        pool[i].visible = false;
    }
}

function generateTreeBaseTexture(pixelSize, width, height, color = 0x228B22) {
    const g = new PIXI.Graphics();
    // Simple rectangle for now; can be improved for more detail
    g.beginFill(color);
    g.drawRect(0, 0, width * pixelSize, height * pixelSize);
    g.endFill();
    return app.renderer.generateTexture(g);
}

export function setupPixi(canvasId, width, height) {
    app = new PIXI.Application({
        view: document.getElementById(canvasId),
        width,
        height,
        backgroundColor: 0x222222,
        antialias: false,
        resolution: window.devicePixelRatio || 1,
        autoDensity: true
    });
    backgroundContainer = new PIXI.Container();
    treeContainer = new PIXI.Container();
    flowerContainer = new PIXI.Container();
    beeContainer = new PIXI.Container();
    characterContainer = new PIXI.Container();
    app.stage.addChild(backgroundContainer);
    app.stage.addChild(treeContainer);
    app.stage.addChild(flowerContainer);
    app.stage.addChild(beeContainer);
    app.stage.addChild(characterContainer);
}

export function renderWorld(grid, trees, flowers, bees, character, pixelSize) {
    backgroundContainer.removeChildren();
    backgroundContainer.addChild(drawBackground(grid, pixelSize));
    // Debug: log pool sizes and background regeneration
    if (window.DEBUG_PIXI) {
        console.log('[PixiRenderer] treePool:', treeGraphicsPool.length, 'flowerPool:', flowerGraphicsPool.length, 'beePool:', beeGraphicsPool.length);
        if (window._lastBgHash !== cachedGridHash) {
            console.log('[PixiRenderer] Background regenerated. Hash:', cachedGridHash);
            window._lastBgHash = cachedGridHash;
        }
    }
    // --- Trees ---
    treeContainer.removeChildren();
    let treeCount = 0;
    for (const tree of trees) {
        if (tree.isDead) continue;
        const g = getOrCreateGraphic(treeGraphicsPool, treeCount);
        g.clear();
        // Trunk with curve (use stored trunkCurve)
        for (let i = 0; i < tree.height; i++) {
            const trunkX = tree.trunkCurve[i] || tree.x;
            g.beginFill(0x8B5A2B);
            g.drawRect((trunkX - Math.floor(tree.width / 2)) * pixelSize, (tree.y - i) * pixelSize, tree.width * pixelSize, pixelSize);
            g.endFill();
            g.beginFill(0xB8864B);
            g.drawRect(trunkX * pixelSize, (tree.y - i) * pixelSize, 0.5 * pixelSize, pixelSize);
            g.endFill();
        }
        // Branches
        g.beginFill(0x8B5A2B);
        for (const branch of tree.branches) {
            for (let l = 0; l < branch.length; l++) {
                g.drawRect((branch.x + branch.dir * l) * pixelSize, (branch.y - l) * pixelSize, pixelSize, pixelSize);
            }
        }
        g.endFill();
        // Leaves as colored cells (persistent, no flicker, incremental)
        if (tree.hasLeaves && tree.leafCells) {
            for (const leaf of tree.leafCells) {
                const leafColorNum = new PIXI.Color(leaf.color).toNumber();
                g.beginFill(leafColorNum);
                g.drawRect((leaf.x + (leaf.windOffset || 0)) * pixelSize, leaf.y * pixelSize, pixelSize, pixelSize);
                g.endFill();
            }
        }
        treeContainer.addChild(g);
        treeCount++;
    }
    hideUnusedGraphics(treeGraphicsPool, treeCount);
    // --- Flowers ---
    flowerContainer.removeChildren();
    let flowerCount = 0;
    for (const flower of flowers) {
        const g = getOrCreateGraphic(flowerGraphicsPool, flowerCount);
        g.clear();
        const colorNum = new PIXI.Color(flower.color).toNumber();
        g.beginFill(colorNum);
        g.drawRect(flower.x * pixelSize, flower.y * pixelSize, pixelSize, pixelSize);
        g.endFill();
        flowerContainer.addChild(g);
        flowerCount++;
    }
    hideUnusedGraphics(flowerGraphicsPool, flowerCount);
    // --- Bees ---
    beeContainer.removeChildren();
    let beeCount = 0;
    for (const bee of bees) {
        const g = getOrCreateGraphic(beeGraphicsPool, beeCount);
        g.clear();
        g.beginFill(0xFFD700);
        g.drawRect(bee.x * pixelSize, bee.y * pixelSize, pixelSize, pixelSize);
        g.endFill();
        g.beginFill(0xFFFFFF, 0.5);
        if (bee.animFrame === 0) {
            g.drawRect((bee.x - 0.3) * pixelSize, (bee.y - 0.3) * pixelSize, pixelSize * 0.7, pixelSize * 0.7);
            g.drawRect((bee.x + 0.6) * pixelSize, (bee.y - 0.3) * pixelSize, pixelSize * 0.7, pixelSize * 0.7);
        } else {
            g.drawRect((bee.x - 0.2) * pixelSize, (bee.y - 0.5) * pixelSize, pixelSize * 0.5, pixelSize * 0.5);
            g.drawRect((bee.x + 0.7) * pixelSize, (bee.y - 0.5) * pixelSize, pixelSize * 0.5, pixelSize * 0.5);
        }
        g.endFill();
        beeContainer.addChild(g);
        beeCount++;
    }
    hideUnusedGraphics(beeGraphicsPool, beeCount);
    // --- Character ---
    characterContainer.removeChildren();
    if (!characterGraphic) {
        characterGraphic = new PIXI.Graphics();
    }
    characterGraphic.clear();
    // Head (3x3 cells, top center)
    characterGraphic.beginFill(0xFFD39B);
    characterGraphic.drawRect((character.x - 0.5) * pixelSize, (character.y - 2) * pixelSize, 3 * pixelSize, 3 * pixelSize);
    characterGraphic.endFill();
    // Eyes
    characterGraphic.beginFill(0x222222);
    characterGraphic.drawRect((character.x + 0.5) * pixelSize, (character.y - 1) * pixelSize, pixelSize, pixelSize);
    characterGraphic.drawRect((character.x + 1.5) * pixelSize, (character.y - 1) * pixelSize, pixelSize, pixelSize);
    characterGraphic.endFill();
    // Mouth
    characterGraphic.beginFill(0xB8864B);
    characterGraphic.drawRect((character.x + 0.5) * pixelSize, character.y * pixelSize, 2 * pixelSize, pixelSize / 2);
    characterGraphic.endFill();
    // Body (center column, 4x2 cells)
    characterGraphic.beginFill(0x4682B4);
    characterGraphic.drawRect((character.x + 0.5) * pixelSize, (character.y + 1) * pixelSize, 2 * pixelSize, 4 * pixelSize);
    characterGraphic.endFill();
    // Arms (2x6 cells, left and right)
    characterGraphic.beginFill(0xFFD39B);
    characterGraphic.drawRect((character.x - 1.5) * pixelSize, (character.y + 1) * pixelSize, 2 * pixelSize, 6 * pixelSize);
    characterGraphic.drawRect((character.x + 2.5) * pixelSize, (character.y + 1) * pixelSize, 2 * pixelSize, 6 * pixelSize);
    characterGraphic.endFill();
    // Hands (2x2 cells, left and right)
    characterGraphic.beginFill(0xFFD39B);
    characterGraphic.drawRect((character.x - 1.5) * pixelSize, (character.y + 6) * pixelSize, 2 * pixelSize, 2 * pixelSize);
    characterGraphic.drawRect((character.x + 2.5) * pixelSize, (character.y + 6) * pixelSize, 2 * pixelSize, 2 * pixelSize);
    characterGraphic.endFill();
    // Legs (2x4 cells, left and right) - animate for walk
    characterGraphic.beginFill(0x2F4F4F);
    if (character.animFrame === 0) {
        // Frame 0: legs together
        characterGraphic.drawRect((character.x + 0.5) * pixelSize, (character.y + 5) * pixelSize, pixelSize, 4 * pixelSize);
        characterGraphic.drawRect((character.x + 1.5) * pixelSize, (character.y + 5) * pixelSize, pixelSize, 4 * pixelSize);
    } else {
        // Frame 1: legs apart
        characterGraphic.drawRect((character.x - 0.5) * pixelSize, (character.y + 6) * pixelSize, pixelSize, 3 * pixelSize);
        characterGraphic.drawRect((character.x + 2.5) * pixelSize, (character.y + 6) * pixelSize, pixelSize, 3 * pixelSize);
    }
    characterGraphic.endFill();
    // Shoes (2x2 cells, left and right)
    characterGraphic.beginFill(0x000000);
    characterGraphic.drawRect((character.x + 0.5) * pixelSize, (character.y + 9) * pixelSize, pixelSize, pixelSize);
    characterGraphic.drawRect((character.x + 1.5) * pixelSize, (character.y + 9) * pixelSize, pixelSize, pixelSize);
    characterGraphic.endFill();
    characterContainer.addChild(characterGraphic);
}
