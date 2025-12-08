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
            
            // Validate config.json AFTER config is loaded by DebugManager
            await this.validateConfig();
            
            this.setupShaders();
            this.setupGeometry();
            this.setupViewport();
            this.setupGameSystems();
            this.initPlayer();
            
            // Initialize weather manager with current game day
            if (this.weatherManager) {
                this.weatherManager.initialize(this.timeManager.getCurrentDay());
            }
            
            // Start render loop
            this.render(0);
        } catch (error) {
            console.error('[ERROR] Error during engine initialization:', error);
            throw error;
        }
    }
    
    async validateConfig() {
        try {
            // Load config schema
            const schemaLoader = new SchemaLoader();
            const configSchema = await schemaLoader.loadSchema('schemas/config.schema.json');
            
            // Validate config
            const validator = new ConfigValidator();
            const configResult = validator.validateConfig(this.config, configSchema);
            
            if (!configResult.valid) {
                const errorMsg = validator.formatErrorMessage(configResult.errors);
                console.error('Config validation failed:', errorMsg);
                throw new Error(`Invalid config.json:\n${errorMsg}`);
            }
            
            console.log('Config validated successfully');
        } catch (error) {
            // Re-throw to halt initialization
            throw error;
        }
    }
    
    initWebGL() {
        // Get WebGL context
        this.gl = this.canvas.getContext('webgl2') || this.canvas.getContext('webgl');
        
        if (!this.gl) {
            throw new Error('WebGL is not supported on this browser');
        }
    }
    
    // Update seed UI display
    updateSeedUI() {
        if (!this.soilManager) return;
        
        const currentSeedElement = document.getElementById('current-seed');
        if (currentSeedElement) {
            currentSeedElement.textContent = this.soilManager.getSeed();
        }
    }
    
    // Initialize seed UI interactions
    initializeSeedUI() {
        // Update display
        this.updateSeedUI();
        
        // Copy seed button
        const copySeedBtn = document.getElementById('copy-seed-btn');
        if (copySeedBtn) {
            copySeedBtn.addEventListener('click', () => {
                const seed = this.soilManager.getSeed();
                navigator.clipboard.writeText(seed.toString()).then(() => {
                    console.log(`Seed ${seed} copied to clipboard`);
                    // Visual feedback
                    copySeedBtn.textContent = '✓';
                    setTimeout(() => {
                        copySeedBtn.textContent = '📋';
                    }, 1000);
                }).catch(err => {
                    console.error('Failed to copy seed:', err);
                });
            });
        }
        
        // Regenerate button
        const regenerateBtn = document.getElementById('regenerate-btn');
        const seedInput = document.getElementById('seed-input');
        
        if (regenerateBtn && seedInput) {
            regenerateBtn.addEventListener('click', () => {
                const inputValue = seedInput.value.trim();
                
                // If empty, clear localStorage to trigger random generation
                if (inputValue === '') {
                    console.log('Empty seed input - generating random seed');
                    localStorage.removeItem('landShepherd_seed');
                    window.location.reload();
                    return;
                }
                
                const inputSeed = parseInt(inputValue);
                
                if (isNaN(inputSeed) || inputSeed < 0 || inputSeed > 4294967295) {
                    console.warn('Invalid seed. Must be between 0 and 4294967295');
                    return;
                }
                
                // Store seed in localStorage
                localStorage.setItem('landShepherd_seed', inputSeed.toString());
                
                // Reload page to regenerate with new seed
                window.location.reload();
            });
        }
        
        // Store current seed in localStorage for persistence
        localStorage.setItem('landShepherd_seed', this.soilManager.getSeed().toString());
    }
    
    // Get seed from URL, localStorage, or config (priority order)
    static getSeedFromSources(config) {
        // Priority 1: URL parameter
        const urlParams = new URLSearchParams(window.location.search);
        const urlSeed = urlParams.get('seed');
        if (urlSeed !== null) {
            const seed = parseInt(urlSeed);
            if (!isNaN(seed) && seed >= 0 && seed <= 4294967295) {
                console.log(`Using seed from URL: ${seed}`);
                return seed;
            }
        }
        
        // Priority 2: localStorage
        const storedSeed = localStorage.getItem('landShepherd_seed');
        if (storedSeed !== null) {
            const seed = parseInt(storedSeed);
            if (!isNaN(seed) && seed >= 0 && seed <= 4294967295) {
                console.log(`Using seed from localStorage: ${seed}`);
                return seed;
            }
        }
        
        // Priority 3: config.json
        if (config.world?.terrain?.seed !== undefined && config.world.terrain.seed !== null) {
            console.log(`Using seed from config: ${config.world.terrain.seed}`);
            return config.world.terrain.seed;
        }
        
        // Priority 4: random (null will trigger random generation in SoilManager)
        return null;
    }
    
    async initManagers() {
        // Base managers
        this.shaderManager = new ShaderManager(this.gl);
        this.geometryManager = new GeometryManager(this.gl);
        this.debugManager = new DebugManager();
        
        // Wait for debug manager initialization to get config
        const debugEnabled = await this.debugManager.initialize();
        this.config = this.debugManager.getConfig();
        
        // Make config globally accessible for entities and managers
        window.config = this.config;
        
        // Get seed from URL, localStorage, or config
        const seedFromSources = GraphicsEngine.getSeedFromSources(this.config);
        if (seedFromSources !== null) {
            // Override config with seed from higher priority source
            if (!this.config.world.terrain) {
                this.config.world.terrain = {};
            }
            this.config.world.terrain.seed = seedFromSources;
        }
        
        // Time manager with configuration (provide default if config.time is undefined)
        this.timeManager = new TimeManager(this.config.time || {});
        this.timeManager.initialize(this.config); // Initialize flood events config
        
        // Weather manager with configuration (after TimeManager)
        this.weatherManager = new WeatherManager(this.config.world?.weather || {});
        
        // Lighting manager with configuration (after TimeManager and WeatherManager)
        this.lightingManager = new LightingManager(
            this.config.world?.lighting || {},
            this.timeManager,
            this.weatherManager
        );
        
        // Texture manager with configuration
        this.textureGenerator = new TextureGenerator(this.gl, this.config);
        
        // Soil manager with configuration (seed will be used from config)
        this.soilManager = new SoilManager(this.gl, this.geometryManager, this.textureGenerator, this.config);
        
        // Initialize plant manager after soil manager
        this.plantManager = new PlantManager(this.soilManager);
        
        // System managers
        this.inputManager = new InputManager(this.canvas);
        this.cameraManager = new CameraManager(this.canvas.width, this.canvas.height);
        this.renderSystem = new RenderSystem(this.gl, this.shaderManager, this.geometryManager);
        this.renderSystem.setConfig(this.config); // Pass config reference for projection mode
        this.overlayManager = new OverlayManager();
        
        // Set camera manager reference in soil manager for isometric rendering
        this.soilManager.setCameraManager(this.cameraManager);
        
        // Context menu manager (initialized after other managers are ready)
        this.contextMenuManager = new ContextMenuManager(
            this.canvas, 
            this.soilManager, 
            this.plantManager, 
            this.timeManager,
            this  // Pass graphicsEngine reference for RenderSystem access
        );
        
        // Initialize seed UI after soil manager is ready
        this.initializeSeedUI();
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
            uniform vec3 u_ambientLight;
            varying vec4 v_color;
            
            void main() {
                // Apply ambient lighting (multiply RGB, preserve alpha)
                vec3 litColor = v_color.rgb * u_ambientLight;
                gl_FragColor = vec4(litColor, v_color.a);
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
            uniform vec4 u_tint;
            uniform vec3 u_ambientLight;
            varying vec2 v_texCoord;
            
            void main() {
                vec4 texColor = texture2D(u_texture, v_texCoord);
                vec4 tintedColor = texColor * u_tint;
                
                // Apply ambient lighting (multiply RGB, preserve alpha)
                vec3 litColor = tintedColor.rgb * u_ambientLight;
                gl_FragColor = vec4(litColor, tintedColor.a);
            }
        `;
        
        // Particle shader for rain effects
        const particleVertexShaderSource = `
            attribute vec2 a_position;     // World position (x, y)
            attribute float a_size;        // Particle size (1-3 pixels)
            attribute float a_alpha;       // Transparency (0-1)
            
            uniform vec2 u_resolution;     // Screen resolution
            uniform float u_zoom;          // Camera zoom
            uniform vec2 u_camera;         // Camera position
            
            varying float v_alpha;         // Pass alpha to fragment shader
            
            void main() {
                // Apply camera (offset)
                vec2 cameraPosition = a_position - u_camera;
                
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
                gl_PointSize = a_size * u_zoom; // Scale particle size with zoom
                v_alpha = a_alpha;
            }
        `;
        
        const particleFragmentShaderSource = `
            precision mediump float;
            
            uniform vec4 u_color;          // Rain particle color (configurable)
            uniform vec3 u_ambientLight;   // Ambient lighting
            varying float v_alpha;         // Alpha from vertex shader
            
            void main() {
                // Make particles round (circular shape)
                vec2 coord = gl_PointCoord - vec2(0.5);
                if (length(coord) > 0.5) {
                    discard;  // Discard pixels outside circle
                }
                
                // Apply ambient lighting to particle color
                vec3 litColor = u_color.rgb * u_ambientLight;
                
                // Apply color with per-particle alpha
                gl_FragColor = vec4(litColor, u_color.a * v_alpha);
            }
        `;
        
        // Water shader with animated ripples
        const waterVertexShaderSource = `
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
        
        const waterFragmentShaderSource = `
            precision mediump float;
            
            varying vec2 v_texCoord;
            
            uniform vec4 u_baseColor;      // Base water color from soil.baseColor
            uniform vec3 u_ambientLight;   // Lighting from LightingManager
            uniform float u_time;          // Time for animation
            uniform vec2 u_worldPos;       // World position for variation
            
            void main() {
                // Create ripple effect using sine waves
                float wave1 = sin(v_texCoord.x * 10.0 + u_time * 2.0) * 0.02;
                float wave2 = sin(v_texCoord.y * 8.0 + u_time * 1.5) * 0.015;
                float wave3 = sin((v_texCoord.x + v_texCoord.y) * 12.0 + u_time * 2.5) * 0.01;
                
                // Combine waves for ripple effect
                float ripple = wave1 + wave2 + wave3;
                
                // Modulate brightness slightly based on ripples
                float brightness = 1.0 + ripple;
                
                // Apply base color, brightness, and lighting
                vec3 waterColor = u_baseColor.rgb * brightness;
                vec3 finalColor = waterColor * u_ambientLight;
                
                gl_FragColor = vec4(finalColor, u_baseColor.a);
            }
        `;
        
        this.shaderManager.createProgram(vertexShaderSource, fragmentShaderSource, 'basic');
        this.shaderManager.createProgram(textureVertexShaderSource, textureFragmentShaderSource, 'texture');
        this.shaderManager.createProgram(particleVertexShaderSource, particleFragmentShaderSource, 'particleShader');
        this.shaderManager.createProgram(waterVertexShaderSource, waterFragmentShaderSource, 'water');
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
        // Set plant manager reference for species palette
        this.inputManager.setPlantManager(this.plantManager);
        
        // Set camera projection mode from config
        const projectionMode = this.config.world?.rendering?.projection || 'orthographic';
        this.cameraManager.setProjectionMode(projectionMode);
        
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
        
        // Handle right-click to show context menu
        this.inputManager.on('mousedown', (event) => {
            if (event.button === 2) { // Right click for context menu
                try {
                    // Prevent default context menu (use originalEvent)
                    if (event.originalEvent) {
                        event.originalEvent.preventDefault();
                    }
                    
                    const worldCoords = this.cameraManager.screenToWorld(event.x, event.y);
                    
                    // Use projection-aware coordinate conversion
                    let gridX, gridY;
                    const projection = this.config.world.rendering.projection;
                    
                    if (projection === 'isometric') {
                        // ISOMETRIC: Use IsometricUtils for screen-to-grid conversion
                        const isoConfig = this.config.world.rendering.isometric;
                        const gridCoords = IsometricUtils.isoToGrid(
                            worldCoords.x, 
                            worldCoords.y, 
                            isoConfig.tileWidth, 
                            isoConfig.tileHeight
                        );
                        gridX = gridCoords.x;
                        gridY = gridCoords.y;
                    } else {
                        // ORTHOGRAPHIC: Use traditional worldToGrid conversion
                        const gridCoords = this.soilManager.worldToGrid(worldCoords.x, worldCoords.y);
                        gridX = gridCoords.x;
                        gridY = gridCoords.y;
                    }
                    
                    // Check if there's actually soil at this location AND if it's currently being rendered
                    const soil = this.soilManager.getSoilAt(gridX, gridY);
                    const isCurrentlyVisible = this.soilManager.isSoilCurrentlyVisible(gridX, gridY);
                    
                    if (soil && isCurrentlyVisible) {
                        // FIXED: Calculate actual world position from grid coordinates
                        // This ensures plants are spawned at correct grid cell centers
                        let cellWorldX, cellWorldY;
                        if (projection === 'isometric') {
                            // In isometric, convert grid back to isometric world coords
                            const isoConfig = this.config.world.rendering.isometric;
                            const isoPos = IsometricUtils.gridToIso(gridX, gridY, isoConfig.tileWidth, isoConfig.tileHeight);
                            cellWorldX = isoPos.x;
                            cellWorldY = isoPos.y;
                        } else {
                            // In orthographic, use cell center
                            const cellSize = this.soilManager.cellSize;
                            cellWorldX = gridX * cellSize + cellSize / 2;
                            cellWorldY = gridY * cellSize + cellSize / 2;
                        }
                        
                        // Show context menu at cursor position
                        this.contextMenuManager.show(
                            event.x, 
                            event.y, 
                            cellWorldX, 
                            cellWorldY, 
                            gridX, 
                            gridY
                        );
                    }
                } catch (error) {
                    console.error('[ERROR] Right-click handler failed:', error);
                }
            }
        });
        
        // Prevent browser context menu on canvas
        this.canvas.addEventListener('contextmenu', (event) => {
            event.preventDefault();
            return false;
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
                case 'F': // Cycle nutrient overlay modes
                    if (this.overlayManager) {
                        const newMode = this.overlayManager.cycleMode();
                        
                        // Force soil refresh to show new overlay mode
                        if (this.soilManager) {
                            this.soilManager.needsRefresh = true;
                            // Update visible cells immediately to force visual refresh
                            if (this.cameraManager) {
                                this.soilManager.updateVisibleCells(this.cameraManager);
                            }
                        }
                    }
                    break;
                case 'm':
                case 'M': // Cycle weather manually
                    if (this.weatherManager && this.timeManager) {
                        const currentWeather = this.weatherManager.getCurrentWeather();
                        const currentDay = this.timeManager.getCurrentDay();
                        
                        // Cycle through weather states: sunny → cloudy → rainy → sunny
                        let newWeather;
                        switch (currentWeather) {
                            case 'sunny':
                                newWeather = 'cloudy';
                                break;
                            case 'cloudy':
                                newWeather = 'rainy';
                                break;
                            case 'rainy':
                                newWeather = 'sunny';
                                break;
                            default:
                                newWeather = 'sunny';
                        }
                        
                        this.weatherManager.setWeather(newWeather, currentDay);
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
        
        // More visible color: bright red instead of green
        this.player = new Character(screenCenterX, screenCenterY, 8, [1.0, 0.2, 0.2, 1.0]); // Bright red and larger
        
        // Center camera on the center of the map where the tree is
        // With centered coordinate system, the center of the map is at (0,0)
        const mapCenterX = 0; // Map center in world coordinates
        const mapCenterY = 0; // Map center in world coordinates
        
        this.cameraManager.setPosition(mapCenterX, mapCenterY);
        this.cameraManager.setZoom(2.0); // Zoom to better see the tree
        
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
        // Update time system
        const gameDaysElapsed = this.timeManager.update(deltaTime);
        const currentDay = this.timeManager.getCurrentDayPrecise();
        
        // Handle camera movement with arrow keys or WASD
        const panSpeed = 0.3; // Pixels per millisecond
        const panDelta = panSpeed * deltaTime;
        
        if (this.inputManager.isKeyPressed('ArrowLeft') || this.inputManager.isKeyPressed('KeyA')) {
            this.cameraManager.move(-panDelta, 0);
        }
        if (this.inputManager.isKeyPressed('ArrowRight') || this.inputManager.isKeyPressed('KeyD')) {
            this.cameraManager.move(panDelta, 0);
        }
        if (this.inputManager.isKeyPressed('ArrowUp') || this.inputManager.isKeyPressed('KeyW')) {
            this.cameraManager.move(0, -panDelta);
        }
        if (this.inputManager.isKeyPressed('ArrowDown') || this.inputManager.isKeyPressed('KeyS')) {
            this.cameraManager.move(0, panDelta);
        }
        
        // Update weather
        if (this.weatherManager) {
            this.weatherManager.update(currentDay);
        }
        
        // Update lighting (after time and weather updates)
        if (this.lightingManager) {
            this.lightingManager.update(deltaTime);
        }
        
        // Update weather particles (uses real-time deltaTime in seconds)
        if (this.weatherManager) {
            this.weatherManager.updateParticles(deltaTime / 1000, this.cameraManager);
        }
        
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
        this.soilManager.renderSoil(this.renderSystem, viewMatrix, this.cameraManager, this.lightingManager);
        
        // 2. Render plants by layer for proper Z-ordering (bottom → middle → top)
        const visibleBounds = this.cameraManager.getVisibleBounds();
        const visiblePlants = this.plantManager.getVisiblePlants(visibleBounds);
        if (visiblePlants.length > 0) {
            this.renderSystem.renderPlantsByLayer(visiblePlants, viewMatrix, this.lightingManager);
        }
        
        // 3. Render cell highlight (above plants, below particles)
        const cellSize = this.config.world.map.cellSize;
        this.renderSystem.renderCellHighlight(viewMatrix, this.lightingManager, cellSize);
        
        // 4. Render rain particles (above plants, below UI)
        if (this.weatherManager) {
            this.renderSystem.renderParticles(this.weatherManager, this.cameraManager, this.lightingManager);
        }
        
        // 5. Render other entities on top (character, etc.)
        this.renderSystem.renderBatch(this.entities, viewMatrix, this.lightingManager);
    }
    
    updateDebugMetrics(currentTime) {
        // Update time UI (always visible)
        this.updateTimeUI();
        
        // Log time of day info periodically (every 5 seconds)
        // Time logging disabled for production
        
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
        
        // Update weather metrics
        this.debugManager.updateWeatherMetrics(this.weatherManager, this.timeManager);
        
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
        const timeOfDayElement = document.getElementById('time-of-day');
        const lightingPhaseElement = document.getElementById('lighting-phase');
        
        if (currentDayElement && this.timeManager) {
            currentDayElement.textContent = this.timeManager.getCurrentDay();
        }
        
        if (timeOfDayElement && this.timeManager) {
            timeOfDayElement.textContent = this.timeManager.getTimeOfDayString();
        }
        
        if (lightingPhaseElement && this.lightingManager) {
            const phase = this.lightingManager.getCurrentPhase();
            // Capitalize first letter and make it readable
            const phaseDisplay = phase.charAt(0).toUpperCase() + phase.slice(1).replace(/([A-Z])/g, ' $1').trim();
            lightingPhaseElement.textContent = phaseDisplay;
        }
        
        if (timeSpeedElement && this.timeManager) {
            timeSpeedElement.textContent = this.timeManager.getTimeScaleDisplayString();
        }
        
        // Update overlay UI display
        this.updateOverlayUI();
        
        // Update weather UI display
        this.updateWeatherUI();
    }
    
    updateOverlayUI() {
        if (!this.overlayManager) return;
        
        const mode = this.overlayManager.getCurrentMode();
        const overlayModeElement = document.getElementById('overlay-mode');
        const overlayHintElement = document.getElementById('overlay-hint');
        const overlayLegendElement = document.getElementById('overlay-legend');
        
        if (overlayModeElement) {
            overlayModeElement.textContent = mode.name;
        }
        
        if (overlayHintElement) {
            overlayHintElement.textContent = this.overlayManager.getHintText();
        }
        
        if (overlayLegendElement) {
            // Show legend only when overlay is active
            overlayLegendElement.style.display = this.overlayManager.isOverlayActive() ? 'block' : 'none';
        }
    }
    
    updateWeatherUI() {
        if (!this.weatherManager || !this.weatherManager.isEnabled()) return;
        
        const currentWeather = this.weatherManager.getCurrentWeather();
        const rainIntensity = this.weatherManager.getRainIntensity();
        const timeUntilChange = this.weatherManager.getTimeUntilTransition(this.timeManager.getCurrentDay());
        
        // Update weather icon and state
        const weatherIconElement = document.getElementById('weather-icon');
        const weatherStateElement = document.getElementById('weather-state');
        
        if (weatherIconElement && weatherStateElement) {
            switch (currentWeather) {
                case 'sunny':
                    weatherIconElement.textContent = '☀️';
                    weatherStateElement.textContent = 'Sunny';
                    break;
                case 'cloudy':
                    weatherIconElement.textContent = '☁️';
                    weatherStateElement.textContent = 'Cloudy';
                    break;
                case 'rainy':
                    weatherIconElement.textContent = '🌧️';
                    weatherStateElement.textContent = 'Rainy';
                    break;
            }
        }
        
        // Update rain intensity bar (only show for rainy weather)
        const rainIntensityContainer = document.getElementById('rain-intensity-container');
        const intensityFillElement = document.getElementById('intensity-fill');
        
        if (rainIntensityContainer && intensityFillElement) {
            if (currentWeather === 'rainy') {
                rainIntensityContainer.style.display = 'block';
                intensityFillElement.style.width = `${rainIntensity * 100}%`;
            } else {
                rainIntensityContainer.style.display = 'none';
            }
        }
        
        // Update next change timing
        const nextChangeElement = document.getElementById('next-change');
        if (nextChangeElement) {
            if (timeUntilChange > 0) {
                nextChangeElement.textContent = `${timeUntilChange.toFixed(1)} days`;
            } else {
                nextChangeElement.textContent = 'Soon';
            }
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
    } catch (error) {
        console.error('[ERROR] Error during initialization:', error);
        document.body.innerHTML = `<div style="color: red; padding: 20px;">Error: ${error.message}</div>`;
    }
});