/**
 * GraphicsEngine - Moteur de rendu WebGL principal du jeu Land Shepherd
 * 
 * Ce module constitue le cœur du système de rendu, orchestrant tous les composants
 * graphiques du jeu. Il coordonne les gestionnaires modulaires (input, caméra, rendu)
 * et gère la boucle de jeu principale avec une architecture découplée.
 * 
 * Fonctionnalités principales :
 * - Orchestration des systèmes modulaires
 * - Boucle de jeu optimisée avec deltaTime
 * - Initialisation et configuration du contexte WebGL
 * - Interface unifiée pour le contrôle du jeu
 */

class GraphicsEngine {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.gl = null;
        
        // Gestionnaires modulaires
        this.shaderManager = null;
        this.geometryManager = null;
        this.debugManager = null;
        this.inputManager = null;
        this.cameraManager = null;
        this.renderSystem = null;
        
        // Entités
        this.player = null;
        this.entities = [];
        
        // Timing pour les performances
        this.lastTime = 0;
        this.deltaTime = 0;
        
        // Flag pour synchronisation des calques (une seule fois)
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
            
            // Démarrer la boucle de rendu
            this.render(0);
            console.log('Moteur graphique initialisé avec succès');
        } catch (error) {
            console.error('Erreur lors de l\'initialisation du moteur:', error);
            throw error;
        }
    }
    
    initWebGL() {
        // Obtenir le contexte WebGL
        this.gl = this.canvas.getContext('webgl2') || this.canvas.getContext('webgl');
        
        if (!this.gl) {
            throw new Error('WebGL n\'est pas supporté sur ce navigateur');
        }
        
        console.log('WebGL initialisé avec succès');
    }
    
    async initManagers() {
        // Gestionnaires de base
        this.shaderManager = new ShaderManager(this.gl);
        this.geometryManager = new GeometryManager(this.gl);
        this.debugManager = new DebugManager();
        
        // Attendre l'initialisation du debug manager pour récupérer la config
        const debugEnabled = await this.debugManager.initialize();
        this.config = this.debugManager.getConfig();
        console.log('Debug manager initialisé. Mode debug:', debugEnabled ? 'activé' : 'désactivé');
        
        // Gestionnaire de textures avec configuration
        this.textureGenerator = new TextureGenerator(this.gl, this.config);
        
        // Gestionnaire de sol avec configuration
        this.soilManager = new SoilManager(this.gl, this.geometryManager, this.textureGenerator, this.config);
        
        // Gestionnaire d'arbres avec dépendances
        this.treeManager = new TreeManager(this.gl, this.geometryManager, this.soilManager, this.config);
        
        // Gestionnaires de systèmes
        this.inputManager = new InputManager(this.canvas);
        this.cameraManager = new CameraManager(this.canvas.width, this.canvas.height);
        this.renderSystem = new RenderSystem(this.gl, this.shaderManager, this.geometryManager);
        
        // Forcer la synchronisation des calques après l'initialisation du TextureGenerator
        // SUPPRIMÉ - cause des régénérations inutiles
        // if (this.debugManager.isDebugEnabled()) {
        //     this.debugManager.forceSynchronization(this.textureGenerator);
        // }
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
                // Appliquer le scale à la géométrie
                vec2 scaledPosition = a_position * u_scale;
                
                // Appliquer la translation (position de l'entité)
                vec2 worldPosition = scaledPosition + u_translation;
                
                // Appliquer la caméra (décalage)
                vec2 cameraPosition = worldPosition - u_camera;
                
                // Appliquer le zoom
                vec2 zoomedPosition = cameraPosition * u_zoom;
                
                // Centrer le zoom sur l'écran
                vec2 screenCenter = u_resolution * 0.5;
                vec2 finalPosition = zoomedPosition + screenCenter;
                
                // Convertir vers l'espace clip
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

        // Shader pour textures
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
                // Appliquer le scale à la géométrie
                vec2 scaledPosition = a_position * u_scale;
                
                // Appliquer la translation (position de l'entité)
                vec2 worldPosition = scaledPosition + u_translation;
                
                // Appliquer la caméra (décalage)
                vec2 cameraPosition = worldPosition - u_camera;
                
                // Appliquer le zoom
                vec2 zoomedPosition = cameraPosition * u_zoom;
                
                // Centrer le zoom sur l'écran
                vec2 screenCenter = u_resolution * 0.5;
                vec2 finalPosition = zoomedPosition + screenCenter;
                
                // Convertir vers l'espace clip
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
        // Créer la géométrie réutilisable du carré
        this.geometryManager.createQuad(5, 5, false);
    }
    
    setupViewport() {
        // Ajuster la taille du canvas à la fenêtre
        this.resizeCanvas();
        
        // Définir le viewport WebGL
        this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
        
        // Définir la couleur de fond (gris)
        this.gl.clearColor(0.5, 0.5, 0.5, 1.0); // RGB: 128, 128, 128
    }

    setupGameSystems() {
        this.setupInputHandlers();
        this.setupCameraControls();
    }
    
    setupInputHandlers() {
        // Gestion des clics pour déplacer le joueur
        this.inputManager.on('click', (event) => {
            if (event.button === 0 && this.player) { // Clic gauche
                const worldCoords = this.cameraManager.screenToWorld(event.x, event.y);
                this.player.moveTo(worldCoords.x, worldCoords.y);
            }
        });
        
        // Gestion du redimensionnement
        this.inputManager.on('resize', (event) => {
            this.resizeCanvas(event.width, event.height);
        });
    }
    
    setupCameraControls() {
        // Gestion du zoom avec la molette
        this.inputManager.on('wheel', (event) => {
            if (event.deltaY > 0) {
                this.cameraManager.zoomOut(event.x, event.y);
            } else {
                this.cameraManager.zoomIn(event.x, event.y);
            }
        });
    }

    resizeCanvas(width = window.innerWidth, height = window.innerHeight) {
        // Ajuster la résolution du canvas à la taille de la fenêtre
        this.canvas.width = width;
        this.canvas.height = height;
        
        // Ajuster la taille CSS
        this.canvas.style.width = width + 'px';
        this.canvas.style.height = height + 'px';
        
        if (this.gl) {
            this.renderSystem.setViewport(width, height);
        }
        
        // Mettre à jour la caméra
        if (this.cameraManager) {
            this.cameraManager.resize(width, height);
        }
        
        // NE PAS repositionner le joueur au redimensionnement - garder sa position monde
        // Le joueur doit rester au centre de la carte où se trouve l'arbre
    }
    
    initPlayer() {
        // Positionner le joueur au centre de l'écran (coordonnées écran)
        const screenCenterX = 0; // Centre écran en coordonnées monde
        const screenCenterY = 0; // Centre écran en coordonnées monde
        
        console.log(`🎯 Positionnement du joueur au centre de l'écran: (${screenCenterX}, ${screenCenterY})`);
        
        // Couleur plus visible : rouge vif au lieu de vert
        this.player = new Character(screenCenterX, screenCenterY, 8, [1.0, 0.2, 0.2, 1.0]); // Rouge vif et plus gros
        
        // Centrer la caméra sur le centre de la carte où se trouve l'arbre
        // Avec le système de coordonnées centrées, le centre de la carte est à (0,0)
        const mapCenterX = 0; // Centre de la carte en coordonnées monde
        const mapCenterY = 0; // Centre de la carte en coordonnées monde
        
        this.cameraManager.setPosition(mapCenterX, mapCenterY);
        this.cameraManager.setZoom(2.0); // Zoom pour mieux voir l'arbre
        
        console.log(`📷 Caméra positionnée sur le centre de la carte: (${mapCenterX}, ${mapCenterY}) avec zoom 2.0`);
        
        // Ajouter le joueur à la liste des entités
        this.entities.push(this.player);
    }
    
    render(currentTime) {
        // Calculer deltaTime pour des animations fluides
        this.deltaTime = currentTime - this.lastTime;
        this.lastTime = currentTime;
        
        // Mettre à jour les systèmes
        this.update(this.deltaTime);
        
        // Commencer le rendu
        this.renderSystem.beginFrame();
        
        // Obtenir la matrice de vue de la caméra
        const viewMatrix = this.cameraManager.getViewMatrix();
        
        // Rendre toutes les entités
        this.renderEntities(viewMatrix);
        
        // Terminer le rendu
        this.renderSystem.endFrame();
        
        // Mettre à jour les métriques de debug
        this.updateDebugMetrics(currentTime);
        
        // Synchronisation supprimée - les calques sont correctement initialisés par défaut
        // if (!this.layersSynchronized && this.debugManager && this.debugManager.isDebugEnabled()) {
        //     this.debugManager.synchronizeInitialState();
        //     this.layersSynchronized = true;
        // }
        
        // Continuer la boucle de rendu
        requestAnimationFrame((time) => this.render(time));
    }
    
    update(deltaTime) {
        // Mettre à jour la caméra
        this.cameraManager.update();
        
        // Mettre à jour le système de sol
        this.soilManager.update(deltaTime);
        
        // Mettre à jour le système d'arbres
        this.treeManager.update(deltaTime);
        
        // Mettre à jour toutes les entités
        this.entities.forEach(entity => {
            if (entity.update) {
                entity.update(deltaTime);
            }
        });
    }
    
    renderEntities(viewMatrix) {
        // 1. Rendre le sol en premier (arrière-plan)
        this.soilManager.renderSoil(this.renderSystem, viewMatrix, this.cameraManager);
        
        // 2. Rendre les arbres par-dessus le sol
        this.treeManager.renderTrees(this.renderSystem, viewMatrix, this.cameraManager);
        
        // 3. Rendre les autres entités par-dessus (personnage, etc.)
        this.renderSystem.renderBatch(this.entities, viewMatrix);
    }
    
    updateDebugMetrics(currentTime) {
        if (!this.debugManager || !this.debugManager.isDebugEnabled()) return;
        
        // Mettre à jour les FPS
        this.debugManager.updateFPS(currentTime);
        
        // Mettre à jour le nombre de géométries
        const geometryCount = this.geometryManager.geometries.size;
        this.debugManager.updateGeometryCount(geometryCount);
        
        // Mettre à jour la position du joueur
        if (this.player) {
            this.debugManager.updatePlayerPosition(
                this.player.position.x + this.player.size / 2,
                this.player.position.y + this.player.size / 2
            );
        }
        
        // Mettre à jour les métriques de rendu
        this.debugManager.updateRenderCalls(this.renderSystem.getRenderCalls());
        this.debugManager.updateZoomLevel(this.cameraManager.zoom);
        
        // Mettre à jour les métriques du système de sol
        this.debugManager.updateSoilMetrics(
            this.soilManager.getVisibleCellsCount(),
            this.soilManager.getTotalCells()
        );
        
        // Mettre à jour les métriques du système d'arbres
        this.debugManager.updateTreeMetrics(
            this.treeManager.getVisibleTreesCount(),
            this.treeManager.getTotalTrees()
        );
        this.debugManager.updateTreeSpecies(this.treeManager.getSpeciesCount());
        
        // Mettre à jour les informations du sol sous le joueur
        if (this.player) {
            const playerCenterX = this.player.position.x + this.player.size / 2;
            const playerCenterY = this.player.position.y + this.player.size / 2;
            const soilInfo = this.soilManager.getSoilInfoAt(playerCenterX, playerCenterY);
            this.debugManager.updateSoilInfo(soilInfo);
            
            // Mettre à jour les informations de l'arbre sous le joueur
            const treeInfo = this.treeManager.getTreeInfoAt(playerCenterX, playerCenterY);
            this.debugManager.updateTreeInfo(treeInfo);
            
            // Mettre à jour les niveaux d'intensité d'eau et de pollution
            if (soilInfo) {
                this.debugManager.updateWaterLevel(soilInfo.waterRetention, this.textureGenerator);
                this.debugManager.updatePollutionLevel(soilInfo.pollution, this.textureGenerator);
            }
        }
    }
    
    // API publique pour ajouter/supprimer des entités
    addEntity(entity) {
        this.entities.push(entity);
    }
    
    removeEntity(entity) {
        const index = this.entities.indexOf(entity);
        if (index > -1) {
            this.entities.splice(index, 1);
        }
    }
    
    // Getters pour accéder aux systèmes depuis l'extérieur
    getCamera() {
        return this.cameraManager;
    }
    
    getInput() {
        return this.inputManager;
    }
    
    getRenderSystem() {
        return this.renderSystem;
    }
    
    // Méthodes utilitaires
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

// Initialiser le moteur graphique quand le DOM est prêt
document.addEventListener('DOMContentLoaded', async () => {
    try {
        const graphics = new GraphicsEngine('gameCanvas');
        
        // Exposer globalement pour debug
        window.graphics = graphics;
        
        console.log('Land Shepherd - Moteur graphique démarré');
    } catch (error) {
        console.error('Erreur lors de l\'initialisation:', error);
        document.body.innerHTML = `<div style="color: red; padding: 20px;">Erreur: ${error.message}</div>`;
    }
});