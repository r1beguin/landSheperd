/**
 * GraphicsEngine - Main WebGL rendering engine for Land Shepherd game
 * 
 * This module constitutes the heart of the rendering system, orchestrating all
 * graphics components of the game. It coordinates modular managers (input, camera, rendering)
 * and manages the main game loop with a decoupled architecture.
 * 
 * Main features:
 * - Orchestration of modular systems
 * - Optimized game loop with deltaTime
 * - WebGL context initialization and configuration
 * - Unified interface for game control
 */

class GraphicsEngine {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.gl = null;
        
        // Modular managers
        this.shaderManager = null;
        this.geometryManager = null;
        this.debugManager = null;
        this.timeManager = null;
        this.inputManager = null;
        this.cameraManager = null;
        this.renderSystem = null;
        
        // Entities
        this.player = null;
        this.entities = [];
        
        // Timing for performance
        this.lastTime = 0;
        this.deltaTime = 0;
        
        // Flag for layer synchronization (once only)
        this.layersSynchronized = false;
        
        this.initEngine();
    }
    
    async initEngine() {
        try {
            this.initWebGL();
            await this.initManagers();
            this.setupShaders();
            this.setupGeometry();
            this.setupViewport();
            this.setupGameSystems();
            this.initPlayer();
            
            // Start render loop
            this.render(0);
            console.log('[INIT] Graphics engine initialized successfully');
        } catch (error) {
            console.error('[ERROR] Error during engine initialization:', error);
            throw error;
        }
    }
    
    initWebGL() {
        // Get WebGL context
        this.gl = this.canvas.getContext('webgl2') || this.canvas.getContext('webgl');
        
        if (!this.gl) {
            throw new Error('WebGL is not supported on this browser');
        }
        
        console.log('[INIT] WebGL initialized successfully');
    }
    
    async initManagers() {
        // Base managers
        this.shaderManager = new ShaderManager(this.gl);
        this.geometryManager = new GeometryManager(this.gl);
        this.debugManager = new DebugManager();
        
        // Wait for debug manager initialization to get config
        const debugEnabled = await this.debugManager.initialize();
        this.config = this.debugManager.getConfig();
        console.log('[INIT] Debug manager initialized. Debug mode:', debugEnabled ? 'enabled' : 'disabled');
        
        // Time manager with configuration (provide default if config.time is undefined)
        this.timeManager = new TimeManager(this.config.time || {});
        
        // Texture manager with configuration
        this.textureGenerator = new TextureGenerator(this.gl, this.config);
        
        // Soil manager with configuration
        this.soilManager = new SoilManager(this.gl, this.geometryManager, this.textureGenerator, this.config);
        
        // Initialize plant manager after soil manager
        this.plantManager = new PlantManager(this.soilManager);
        
        // System managers
        this.inputManager = new InputManager(this.canvas);
        this.cameraManager = new CameraManager(this.canvas.width, this.canvas.height);
        this.renderSystem = new RenderSystem(this.gl, this.shaderManager, this.geometryManager);
    }
    
    setupShaders() {
        const vertexShaderSource = `
            attribute vec2 a_position;
            uniform vec2 u_resolution;
            uniform vec2 u_translation;
            uniform vec2 u_scale;
            uniform vec4 u_color;
            uniform float u_zoom;
            uniform vec2 u_camera;
            
            varying vec4 v_color;
            
            void main() {
                // Apply scale to geometry
                vec2 scaledPosition = a_position * u_scale;
                
                // Apply translation (entity position)
                vec2 worldPosition = scaledPosition + u_translation;
                
                // Apply camera (offset)
                vec2 cameraPosition = worldPosition - u_camera;
                
                // Apply zoom
                vec2 zoomedPosition = cameraPosition * u_zoom;
                
                // Center zoom on screen
                vec2 screenCenter = u_resolution * 0.5;
                vec2 finalPosition = zoomedPosition + screenCenter;
                
                // Convert to clip space
                vec2 zeroToOne = finalPosition / u_resolution;
                vec2 zeroToTwo = zeroToOne * 2.0;
                vec2 clipSpace = zeroToTwo - 1.0;
                
                gl_Position = vec4(clipSpace * vec2(1, -1), 0, 1);
                v_color = u_color;
            }
        `;
        
        const fragmentShaderSource = `
            precision mediump float;
            varying vec4 v_color;
            
            void main() {
                gl_FragColor = v_color;
            }
        `;

        // Shader for textures
        const textureVertexShaderSource = `
            attribute vec2 a_position;
            attribute vec2 a_texCoord;
            uniform vec2 u_resolution;
            uniform vec2 u_translation;
            uniform vec2 u_scale;
            uniform float u_zoom;
            uniform vec2 u_camera;
            
            varying vec2 v_texCoord;
            
            void main() {
                // Apply scale to geometry
                vec2 scaledPosition = a_position * u_scale;
                
                // Apply translation (entity position)
                vec2 worldPosition = scaledPosition + u_translation;
                
                // Apply camera (offset)
                vec2 cameraPosition = worldPosition - u_camera;
                
                // Apply zoom
                vec2 zoomedPosition = cameraPosition * u_zoom;
                
                // Center zoom on screen
                vec2 screenCenter = u_resolution * 0.5;
                vec2 finalPosition = zoomedPosition + screenCenter;
                
                // Convert to clip space
                vec2 zeroToOne = finalPosition / u_resolution;
                vec2 zeroToTwo = zeroToOne * 2.0;
                vec2 clipSpace = zeroToTwo - 1.0;
                
                gl_Position = vec4(clipSpace * vec2(1, -1), 0, 1);
                v_texCoord = a_texCoord;
            }
        `;
        
        const textureFragmentShaderSource = `
            precision mediump float;
            uniform sampler2D u_texture;
            varying vec2 v_texCoord;
            
            void main() {
                gl_FragColor = texture2D(u_texture, v_texCoord);
            }
        `;
        
        this.shaderManager.createProgram(vertexShaderSource, fragmentShaderSource, 'basic');
        this.shaderManager.createProgram(textureVertexShaderSource, textureFragmentShaderSource, 'texture');
    }
    
    setupGeometry() {
        // Create reusable quad geometry
        this.geometryManager.createQuad(5, 5, false);
    }
    
    setupViewport() {
        // Adjust canvas size to window
        this.resizeCanvas();
        
        // Set WebGL viewport
        this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
        
        // Set background color (gray)
        this.gl.clearColor(0.5, 0.5, 0.5, 1.0); // RGB: 128, 128, 128
    }

    setupGameSystems() {
        this.setupInputHandlers();
        this.setupCameraControls();
    }
    
    setupInputHandlers() {
        // Handle clicks to move player
        this.inputManager.on('click', (event) => {
            if (event.button === 0 && this.player) { // Left click
                const worldCoords = this.cameraManager.screenToWorld(event.x, event.y);
                this.player.moveTo(worldCoords.x, worldCoords.y);
            }
        });
        
        // Handle right-click cycle: spawn seedling → advance growth → delete plant
        this.inputManager.on('mousedown', (event) => {
            if (event.button === 2) { // Right click for plant cycle
                const worldCoords = this.cameraManager.screenToWorld(event.x, event.y);
                
                // Use soil manager's worldToGrid method for proper coordinate conversion
                const gridCoords = this.soilManager.worldToGrid(worldCoords.x, worldCoords.y);
                const gridX = gridCoords.x;
                const gridY = gridCoords.y;
                
                // Check if there's actually soil at this location AND if it's currently being rendered
                const soil = this.soilManager.getSoilAt(gridX, gridY);
                const isCurrentlyVisible = this.soilManager.isSoilCurrentlyVisible(gridX, gridY);
                
                if (soil && isCurrentlyVisible) {
                    // Check if there's already a plant at this location
                    const existingPlant = this.plantManager.getPlantAt(gridX, gridY);
                    
                    if (!existingPlant) {
                        // First right click: spawn seedling at exact click position
                        const currentDay = this.timeManager.getCurrentDayPrecise();
                        this.plantManager.addPlantAtPosition(gridX, gridY, worldCoords.x, worldCoords.y, 'urtica_dioica', currentDay);
                    } else {
                        // Second right click: try to advance growth stage
                        const currentDay = this.timeManager.getCurrentDayPrecise();
                        const advanced = existingPlant.advanceGrowthStage(currentDay);
                        if (!advanced) {
                            // Third right click: delete the plant (already at final stage)
                            this.plantManager.removePlant(gridX, gridY);
                        }
                    }
                }
            }
        });
        
        // Handle resize
        this.inputManager.on('resize', (event) => {
            this.resizeCanvas(event.width, event.height);
        });
    }
    
    setupCameraControls() {
        // Handle zoom with mouse wheel
        this.inputManager.on('wheel', (event) => {
            if (event.deltaY > 0) {
                this.cameraManager.zoomOut(event.x, event.y);
            } else {
                this.cameraManager.zoomIn(event.x, event.y);
            }
        });
        
        // Handle keyboard controls for time speed
        this.inputManager.on('keydown', (event) => {
            switch(event.key) {
                case ' ': // Spacebar - Toggle pause
                    this.timeManager.togglePause();
                    break;
                case '+':
                case '=': // Increase time speed
                    this.timeManager.increaseTimeScale();
                    break;
                case '-':
                case '_': // Decrease time speed
                    this.timeManager.decreaseTimeScale();
                    break;
                case '1': // Normal speed
                    this.timeManager.setTimeScalePreset('normal');
                    break;
                case '2': // Fast speed
                    this.timeManager.setTimeScalePreset('fast');
                    break;
                case '3': // Very fast speed
                    this.timeManager.setTimeScalePreset('veryFast');
                    break;
                case '0': // Pause
                    this.timeManager.setTimeScalePreset('pause');
                    break;
                case 'f':
                case 'F': // Toggle fertility overlay
                    if (this.debugManager) {
                        const state = this.debugManager.toggleFertilityOverlay();
                        // Force soil refresh to show/hide overlay immediately
                        // Setting needsRefresh triggers updateVisibleCells on next render
                        // which recalculates visible cells and picks up the new overlay state
                        if (this.soilManager) {
                            this.soilManager.needsRefresh = true;
                            // Also update visible cells immediately to force visual refresh
                            if (this.cameraManager) {
                                this.soilManager.updateVisibleCells(this.cameraManager);
                            }
                        }
                    }
                    break;
            }
        });
    }

    resizeCanvas(width = window.innerWidth, height = window.innerHeight) {
        // Adjust canvas resolution to window size
        this.canvas.width = width;
        this.canvas.height = height;
        
        // Adjust CSS size
        this.canvas.style.width = width + 'px';
        this.canvas.style.height = height + 'px';
        
        if (this.gl) {
            this.renderSystem.setViewport(width, height);
        }
        
        // Update camera
        if (this.cameraManager) {
            this.cameraManager.resize(width, height);
        }
        
        // DO NOT reposition player on resize - keep world position
        // Player should stay at the center of the map where the tree is
    }
    
    initPlayer() {
        // Position player at the center of the screen (screen coordinates)
        const screenCenterX = 0; // Screen center in world coordinates
        const screenCenterY = 0; // Screen center in world coordinates
        
        if (this.config?.debug?.enabled) {
            console.log(`[INIT] Positioning player at the center of the screen: (${screenCenterX}, ${screenCenterY})`);
        }
        
        // More visible color: bright red instead of green
        this.player = new Character(screenCenterX, screenCenterY, 8, [1.0, 0.2, 0.2, 1.0]); // Bright red and larger
        
        // Center camera on the center of the map where the tree is
        // With centered coordinate system, the center of the map is at (0,0)
        const mapCenterX = 0; // Map center in world coordinates
        const mapCenterY = 0; // Map center in world coordinates
        
        this.cameraManager.setPosition(mapCenterX, mapCenterY);
        this.cameraManager.setZoom(2.0); // Zoom to better see the tree
        
        if (this.config?.debug?.enabled) {
            console.log(`[CAMERA] Camera positioned at the center of the map: (${mapCenterX}, ${mapCenterY}) with zoom 2.0`);
        }
        
        // Add player to the list of entities
        this.entities.push(this.player);
    }
    
    render(currentTime) {
        // Calculate deltaTime for smooth animations
        this.deltaTime = currentTime - this.lastTime;
        this.lastTime = currentTime;
        
        // Update systems
        this.update(this.deltaTime);
        
        // Start rendering
        this.renderSystem.beginFrame();
        
        // Get camera view matrix
        const viewMatrix = this.cameraManager.getViewMatrix();
        
        // Render all entities
        this.renderEntities(viewMatrix);
        
        // End rendering
        this.renderSystem.endFrame();
        
        // Update debug metrics
        this.updateDebugMetrics(currentTime);
        
        // Synchronization removed - layers are correctly initialized by default
        // if (!this.layersSynchronized && this.debugManager && this.debugManager.isDebugEnabled()) {
        //     this.debugManager.synchronizeInitialState();
        //     this.layersSynchronized = true;
        // }
        
        // Continue render loop
        requestAnimationFrame((time) => this.render(time));
    }
    
    update(deltaTime) {
        // Update time manager and get game days elapsed
        const gameDaysElapsed = this.timeManager.update(deltaTime);
        const currentDay = this.timeManager.getCurrentDayPrecise();
        
        // Update camera
        this.cameraManager.update();
        
        // Update soil system
        this.soilManager.update(deltaTime);
        
        // Update plant manager with game time
        this.plantManager.update(gameDaysElapsed, currentDay);
        
        // Update all entities
        this.entities.forEach(entity => {
            if (entity.update) {
                entity.update(deltaTime);
            }
        });
    }
    
    renderEntities(viewMatrix) {
        // 1. Render soil first (background)
        this.soilManager.renderSoil(this.renderSystem, viewMatrix, this.cameraManager);
        
        // 2. Render plants (middle layer)
        const visibleBounds = this.cameraManager.getVisibleBounds();
        const visiblePlants = this.plantManager.getVisiblePlants(visibleBounds);
        if (visiblePlants.length > 0) {
            this.renderSystem.renderBatch(visiblePlants, viewMatrix);
        }
        
        // 3. Render other entities on top (character, etc.)
        this.renderSystem.renderBatch(this.entities, viewMatrix);
    }
    
    updateDebugMetrics(currentTime) {
        // Update time UI (always visible)
        this.updateTimeUI();
        
        if (!this.debugManager || !this.debugManager.isDebugEnabled()) return;
        
        // Update FPS
        this.debugManager.updateFPS(currentTime);
        
        // Update geometry count
        const geometryCount = this.geometryManager.geometries.size;
        this.debugManager.updateGeometryCount(geometryCount);
        
        // Update player position
        if (this.player) {
            this.debugManager.updatePlayerPosition(
                this.player.position.x + this.player.size / 2,
                this.player.position.y + this.player.size / 2
            );
        }
        
        // Update render metrics
        this.debugManager.updateRenderCalls(this.renderSystem.getRenderCalls());
        this.debugManager.updateZoomLevel(this.cameraManager.zoom);
        
        // Update soil system metrics
        this.debugManager.updateSoilMetrics(
            this.soilManager.getVisibleCellsCount(),
            this.soilManager.getTotalCells()
        );
        
        // Update plant count
        this.debugManager.updatePlantCount(this.plantManager.plants.size);
        
        // Update soil information under player
        if (this.player) {
            const playerCenterX = this.player.position.x + this.player.size / 2;
            const playerCenterY = this.player.position.y + this.player.size / 2;
            const soilInfo = this.soilManager.getSoilInfoAt(playerCenterX, playerCenterY);
            this.debugManager.updateSoilInfo(soilInfo);
            
            // Update water and pollution intensity levels
            if (soilInfo) {
                this.debugManager.updateWaterLevel(soilInfo.waterRetention, this.textureGenerator);
                this.debugManager.updatePollutionLevel(soilInfo.pollution, this.textureGenerator);
            }
        }
    }
    
    updateTimeUI() {
        // Update time UI display
        const currentDayElement = document.getElementById('current-day');
        const timeSpeedElement = document.getElementById('time-speed');
        
        if (currentDayElement && this.timeManager) {
            currentDayElement.textContent = this.timeManager.getCurrentDay();
        }
        
        if (timeSpeedElement && this.timeManager) {
            timeSpeedElement.textContent = this.timeManager.getTimeScaleDisplayString();
        }
    }
    
    // Public API to add/remove entities
    addEntity(entity) {
        this.entities.push(entity);
    }
    
    removeEntity(entity) {
        const index = this.entities.indexOf(entity);
        if (index > -1) {
            this.entities.splice(index, 1);
        }
    }
    
    // Getters to access systems from outside
    getCamera() {
        return this.cameraManager;
    }
    
    getInput() {
        return this.inputManager;
    }
    
    getRenderSystem() {
        return this.renderSystem;
    }
    
    // Utility methods
    setBackgroundColor(r, g, b, a = 1.0) {
        this.renderSystem.setBackgroundColor(r, g, b, a);
    }
    
    cleanup() {
        if (this.shaderManager) {
            this.shaderManager.cleanup();
        }
        if (this.geometryManager) {
            this.geometryManager.cleanup();
        }
    }
}

// Initialize graphics engine when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
    try {
        window.graphicsEngine = new GraphicsEngine('gameCanvas');
        
        // Also expose as 'graphics' for backward compatibility
        window.graphics = window.graphicsEngine;
        
        console.log('[INIT] Land Shepherd - Graphics engine started');
    } catch (error) {
        console.error('[ERROR] Error during initialization:', error);
        document.body.innerHTML = `<div style="color: red; padding: 20px;">Error: ${error.message}</div>`;
    }
});