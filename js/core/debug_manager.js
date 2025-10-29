/**
 * DebugManager - Gestionnaire d'interface de debug et de métriques de performance
 * 
 * Ce module gère l'affichage des informations de debug en temps réel, incluant
 * les FPS, le nombre de géométries, la position du joueur et autres métriques.
 * Il charge la configuration depuis config.json et gère l'interface utilisateur de debug.
 * 
 * Fonctionnalités principales :
 * - Chargement dynamique de la configuration de debug
 * - Interface utilisateur flottante en overlay
 * - Calcul et affichage des FPS en temps réel
 * - Comptage des géométries et entités actives
 * - Toggle on/off du mode debug via configuration
 */

class DebugManager {
    constructor() {
        this.config = null;
        this.isEnabled = false;
        this.debugPanel = null;
        this.isInitialized = false;
        
        // État initial des calques (défini dès le constructeur)
        this.layerStates = {
            water: false,
            pollution: false
        };
        
        // Métriques FPS
        this.frameCount = 0;
        this.lastFPSUpdate = 0;
        this.currentFPS = 0;
        this.frameBuffer = [];
        
        // Métriques de performance
        this.geometryCount = 0;
        this.entityCount = 0;
        this.renderCalls = 0;
    }

    async initialize() {
        await this.loadConfig();
        this.isInitialized = true;
        return this.isEnabled;
    }

    async loadConfig() {
        try {
            const response = await fetch('./config.json');
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            this.config = await response.json();
            this.isEnabled = this.config.debug.enabled;
            
            console.log('Configuration chargée:', this.config);
            
            if (this.isEnabled) {
                this.createDebugPanel();
                console.log('Debug mode activé - Interface créée');
            } else {
                console.log('Debug mode désactivé via configuration');
            }
        } catch (error) {
            console.warn('Impossible de charger config.json, debug désactivé:', error);
            this.isEnabled = false;
            // Créer une configuration par défaut
            this.config = {
                debug: {
                    enabled: false,
                    showFPS: true,
                    showGeometryCount: true,
                    showPlayerPosition: true,
                    refreshRate: 60
                }
            };
        }
    }

    createDebugPanel() {
        // Créer le panneau de debug
        this.debugPanel = document.createElement('div');
        this.debugPanel.id = 'debug-panel';
        this.debugPanel.innerHTML = `
            <div class="debug-header">
                <span>🐛 Debug Info</span>
                <button id="debug-toggle">×</button>
            </div>
            <div class="debug-content">
                <div class="debug-metric">
                    <span class="debug-label">FPS:</span>
                    <span id="debug-fps">0</span>
                </div>
                <div class="debug-metric">
                    <span class="debug-label">Géométries:</span>
                    <span id="debug-geometry">0</span>
                </div>
                <div class="debug-metric">
                    <span class="debug-label">Position joueur:</span>
                    <span id="debug-player-pos">0, 0</span>
                </div>
                <div class="debug-metric">
                    <span class="debug-label">Zoom:</span>
                    <span id="debug-zoom">1.0x</span>
                </div>
                <div class="debug-metric">
                    <span class="debug-label">Appels de rendu:</span>
                    <span id="debug-render-calls">0</span>
                </div>
                <div class="debug-metric">
                    <span class="debug-label">Cellules de sol:</span>
                    <span id="debug-soil-cells">0 / 0</span>
                </div>
                <div class="debug-metric">
                    <span class="debug-label">Arbres:</span>
                    <span id="debug-trees">0 / 0</span>
                </div>
                <div class="debug-metric">
                    <span class="debug-label">Espèces:</span>
                    <span id="debug-tree-species">Chênes: 0, Pins: 0, Châtaigniers: 0</span>
                </div>
                <div class="debug-metric">
                    <span class="debug-label">Sol sous joueur:</span>
                    <span id="debug-soil-info">N/A</span>
                </div>
                <div class="debug-metric">
                    <span class="debug-label">Arbre sous joueur:</span>
                    <span id="debug-tree-info">N/A</span>
                </div>
                <div class="debug-metric">
                    <span class="debug-label">Niveau eau:</span>
                    <span id="debug-water-level">N/A</span>
                </div>
                <div class="debug-metric">
                    <span class="debug-label">Niveau pollution:</span>
                    <span id="debug-pollution-level">N/A</span>
                </div>
                <div class="debug-controls">
                    <button id="toggle-water-layer" class="debug-toggle-btn inactive">💧 Eau</button>
                    <button id="toggle-pollution-layer" class="debug-toggle-btn inactive">☢️ Pollution</button>
                </div>
                <div class="debug-shadow-controls">
                    <div class="debug-section-title">🌑 Contrôles d'Ombre</div>
                    <div class="debug-slider-group">
                        <label class="debug-slider-label">Largeur: <span id="shadow-width-value">1.0x</span></label>
                        <input type="range" id="shadow-width" min="0.5" max="3" step="0.1" value="1.0" class="debug-slider">
                    </div>
                    <div class="debug-slider-group">
                        <label class="debug-slider-label">Hauteur: <span id="shadow-height-value">0.6x</span></label>
                        <input type="range" id="shadow-height" min="0.2" max="1.5" step="0.1" value="0.6" class="debug-slider">
                    </div>
                    <div class="debug-slider-group">
                        <label class="debug-slider-label">Longueur: <span id="shadow-length-value">1.5x</span></label>
                        <input type="range" id="shadow-length" min="0.5" max="3" step="0.1" value="1.5" class="debug-slider">
                    </div>
                    <div class="debug-slider-group">
                        <label class="debug-slider-label">Rotation: <span id="shadow-rotation-value">0°</span></label>
                        <input type="range" id="shadow-rotation" min="0" max="360" value="0" class="debug-slider">
                    </div>
                    <div class="debug-slider-group">
                        <label class="debug-slider-label">Translation X: <span id="shadow-translate-x-value">0px</span></label>
                        <input type="range" id="shadow-translate-x" min="-50" max="50" value="0" class="debug-slider">
                    </div>
                    <div class="debug-slider-group">
                        <label class="debug-slider-label">Translation Y: <span id="shadow-translate-y-value">0px</span></label>
                        <input type="range" id="shadow-translate-y" min="-50" max="50" value="0" class="debug-slider">
                    </div>
                    <div class="debug-slider-group">
                        <label class="debug-slider-label">Opacité: <span id="shadow-opacity-value">50%</span></label>
                        <input type="range" id="shadow-opacity" min="10" max="80" value="50" class="debug-slider">
                    </div>
                    <button id="toggle-shadows" class="debug-toggle-btn active">🌑 Ombres</button>
                </div>
            </div>
        `;

        // Ajouter les styles
        this.addDebugStyles();
        
        // Ajouter au DOM
        document.body.appendChild(this.debugPanel);
        
        // Ajouter l'événement de toggle du panneau
        document.getElementById('debug-toggle').addEventListener('click', () => {
            this.togglePanel();
        });
        
        // Attendre un petit délai pour que le DOM soit prêt, puis initialiser les toggles
        setTimeout(() => {
            this.initializeLayerToggles();
            this.initializeShadowControls();
        }, 100);
    }
    
    initializeLayerToggles() {
        // État initial des calques (désactivés par défaut)
        this.layerStates = {
            water: false,
            pollution: false
        };
        
        // Mettre à jour l'apparence des boutons pour refléter l'état désactivé
        setTimeout(() => {
            const waterBtn = document.getElementById('toggle-water-layer');
            const pollutionBtn = document.getElementById('toggle-pollution-layer');
            
            if (waterBtn) {
                this.updateToggleButton(waterBtn, false);
            }
            if (pollutionBtn) {
                this.updateToggleButton(pollutionBtn, false);
            }
        }, 10);
        
        // Gestionnaire pour le toggle de l'eau
        document.getElementById('toggle-water-layer').addEventListener('click', (e) => {
            this.layerStates.water = !this.layerStates.water;
            this.updateToggleButton(e.target, this.layerStates.water);
            this.onLayerToggleChange('water', this.layerStates.water);
        });
        
        // Gestionnaire pour le toggle de la pollution
        document.getElementById('toggle-pollution-layer').addEventListener('click', (e) => {
            this.layerStates.pollution = !this.layerStates.pollution;
            this.updateToggleButton(e.target, this.layerStates.pollution);
            this.onLayerToggleChange('pollution', this.layerStates.pollution);
        });
    }
    
    updateToggleButton(button, isActive) {
        if (isActive) {
            button.classList.remove('inactive');
            button.classList.add('active');
        } else {
            button.classList.remove('active');
            button.classList.add('inactive');
        }
    }
    
    onLayerToggleChange(layerType, isEnabled) {
        // Émettre un événement pour notifier les autres systèmes
        if (window.graphics && window.graphics.textureGenerator) {
            window.graphics.textureGenerator.setLayerVisibility(layerType, isEnabled);
            console.log(`🎛️ Calque ${layerType} ${isEnabled ? 'activé' : 'désactivé'}`);
        }
    }
    
    // Synchroniser l'état initial des calques avec le TextureGenerator
    synchronizeInitialState() {
        if (window.graphics && window.graphics.textureGenerator) {
            // Appliquer l'état initial (désactivé) aux calques
            window.graphics.textureGenerator.setLayerVisibility('water', this.layerStates.water);
            window.graphics.textureGenerator.setLayerVisibility('pollution', this.layerStates.pollution);
            console.log('🔄 État initial des calques synchronisé avec TextureGenerator');
            return true;
        }
        return false;
    }

    // Forcer la synchronisation immédiate (appelée depuis le moteur)
    forceSynchronization(textureGenerator) {
        if (textureGenerator && this.layerStates) {
            textureGenerator.setLayerVisibility('water', this.layerStates.water);
            textureGenerator.setLayerVisibility('pollution', this.layerStates.pollution);
            console.log('🔄 Synchronisation forcée des calques');
        }
    }

    addDebugStyles() {
        const style = document.createElement('style');
        style.textContent = `
            #debug-panel {
                position: fixed;
                top: 10px;
                left: 10px;
                background: rgba(0, 0, 0, 0.8);
                color: #00ff00;
                font-family: 'Courier New', monospace;
                font-size: 12px;
                border: 1px solid #00ff00;
                border-radius: 5px;
                padding: 0;
                z-index: 10000;
                min-width: 200px;
                backdrop-filter: blur(5px);
            }
            
            .debug-header {
                background: rgba(0, 255, 0, 0.2);
                padding: 5px 10px;
                display: flex;
                justify-content: space-between;
                align-items: center;
                border-bottom: 1px solid #00ff00;
            }
            
            #debug-toggle {
                background: none;
                border: none;
                color: #00ff00;
                font-size: 14px;
                cursor: pointer;
                padding: 0;
                width: 20px;
                height: 20px;
            }
            
            #debug-toggle:hover {
                background: rgba(255, 255, 255, 0.1);
                border-radius: 3px;
            }
            
            .debug-content {
                padding: 10px;
            }
            
            .debug-metric {
                display: flex;
                justify-content: space-between;
                margin-bottom: 5px;
            }
            
            .debug-label {
                color: #ffff00;
            }
            
            .debug-panel-collapsed .debug-content {
                display: none;
            }
            
            .debug-controls {
                margin-top: 10px;
                padding-top: 10px;
                border-top: 1px solid #333;
                display: flex;
                gap: 5px;
            }
            
            .debug-toggle-btn {
                background: rgba(0, 255, 0, 0.2);
                border: 1px solid #00ff00;
                color: #00ff00;
                padding: 4px 8px;
                border-radius: 3px;
                cursor: pointer;
                font-size: 10px;
                transition: all 0.2s;
            }
            
            .debug-toggle-btn:hover {
                background: rgba(0, 255, 0, 0.3);
            }
            
            .debug-toggle-btn.active {
                background: rgba(0, 255, 0, 0.4);
                box-shadow: 0 0 5px rgba(0, 255, 0, 0.3);
            }
            
            .debug-toggle-btn.inactive {
                background: rgba(128, 128, 128, 0.2);
                border-color: #666;
                color: #666;
            }
            
            .debug-shadow-controls {
                margin-top: 15px;
                padding-top: 10px;
                border-top: 1px solid #333;
            }
            
            .debug-section-title {
                color: #ffff00;
                font-weight: bold;
                margin-bottom: 10px;
                text-align: center;
            }
            
            .debug-slider-group {
                margin-bottom: 8px;
                display: flex;
                flex-direction: column;
                gap: 3px;
            }
            
            .debug-slider-label {
                color: #00ffff;
                font-size: 11px;
                display: flex;
                justify-content: space-between;
            }
            
            .debug-slider {
                width: 100%;
                height: 15px;
                -webkit-appearance: none;
                background: rgba(0, 255, 0, 0.2);
                border-radius: 3px;
                outline: none;
            }
            
            .debug-slider::-webkit-slider-thumb {
                -webkit-appearance: none;
                width: 15px;
                height: 15px;
                background: #00ff00;
                border-radius: 50%;
                cursor: pointer;
            }
            
            .debug-slider::-moz-range-thumb {
                width: 15px;
                height: 15px;
                background: #00ff00;
                border-radius: 50%;
                cursor: pointer;
                border: none;
            }
        `;
        document.head.appendChild(style);
    }

    togglePanel() {
        if (this.debugPanel) {
            this.debugPanel.classList.toggle('debug-panel-collapsed');
            const toggleBtn = document.getElementById('debug-toggle');
            toggleBtn.textContent = this.debugPanel.classList.contains('debug-panel-collapsed') ? '+' : '×';
        }
    }

    updateFPS(currentTime) {
        if (!this.isEnabled) return;

        this.frameCount++;
        
        // Calculer les FPS toutes les secondes
        if (currentTime - this.lastFPSUpdate >= 1000) {
            this.currentFPS = Math.round((this.frameCount * 1000) / (currentTime - this.lastFPSUpdate));
            this.frameCount = 0;
            this.lastFPSUpdate = currentTime;
            
            // Mettre à jour l'affichage
            const fpsElement = document.getElementById('debug-fps');
            if (fpsElement) {
                fpsElement.textContent = this.currentFPS;
                
                // Colorer selon les performances
                if (this.currentFPS >= 55) {
                    fpsElement.style.color = '#00ff00';
                } else if (this.currentFPS >= 30) {
                    fpsElement.style.color = '#ffff00';
                } else {
                    fpsElement.style.color = '#ff0000';
                }
            }
        }
    }

    updateGeometryCount(count) {
        if (!this.isEnabled) return;
        
        this.geometryCount = count;
        const element = document.getElementById('debug-geometry');
        if (element) {
            element.textContent = count;
        }
    }

    updatePlayerPosition(x, y) {
        if (!this.isEnabled) return;
        
        const element = document.getElementById('debug-player-pos');
        if (element) {
            element.textContent = `${Math.round(x)}, ${Math.round(y)}`;
        }
    }

    updateRenderCalls(calls) {
        if (!this.isEnabled) return;
        
        this.renderCalls = calls;
        const element = document.getElementById('debug-render-calls');
        if (element) {
            element.textContent = calls;
        }
    }

    updateZoomLevel(zoom) {
        if (!this.isEnabled) return;
        
        const element = document.getElementById('debug-zoom');
        if (element) {
            element.textContent = `${zoom.toFixed(2)}x`;
            
            // Colorer selon le niveau de zoom
            if (zoom === 1.0) {
                element.style.color = '#00ff00'; // Vert pour zoom normal
            } else if (zoom > 1.0) {
                element.style.color = '#ffff00'; // Jaune pour zoom avant
            } else {
                element.style.color = '#ff8800'; // Orange pour zoom arrière
            }
        }
    }

    updateSoilMetrics(visibleCells, totalCells) {
        if (!this.isEnabled) return;
        
        const element = document.getElementById('debug-soil-cells');
        if (element) {
            element.textContent = `${visibleCells} / ${totalCells}`;
            
            // Colorer selon la charge de rendu
            const ratio = visibleCells / totalCells;
            if (ratio < 0.1) {
                element.style.color = '#00ff00'; // Vert pour faible charge
            } else if (ratio < 0.3) {
                element.style.color = '#ffff00'; // Jaune pour charge moyenne
            } else {
                element.style.color = '#ff8800'; // Orange pour charge élevée
            }
        }
    }

    updateSoilInfo(soilInfo) {
        if (!this.isEnabled) return;
        
        const element = document.getElementById('debug-soil-info');
        if (element) {
            if (soilInfo) {
                const fertility = Math.round(soilInfo.fertility);
                const pollution = Math.round(soilInfo.pollution);
                element.textContent = `F:${fertility}% P:${pollution}%`;
                
                // Colorer selon la fertilité
                if (fertility > 70 && pollution < 30) {
                    element.style.color = '#00ff00'; // Vert pour sol sain
                } else if (fertility > 40) {
                    element.style.color = '#ffff00'; // Jaune pour sol moyen
                } else {
                    element.style.color = '#ff8800'; // Orange pour sol pauvre
                }
            } else {
                element.textContent = 'N/A';
                element.style.color = '#888888';
            }
        }
    }

    updateWaterLevel(waterValue, textureGenerator) {
        if (!this.isEnabled) return;
        
        const element = document.getElementById('debug-water-level');
        if (element && textureGenerator) {
            if (waterValue !== null && waterValue !== undefined) {
                const waterLevels = textureGenerator.waterLevels;
                const stats = textureGenerator.getIntensityStats(waterValue, waterLevels, 'eau');
                
                if (stats.level > 0) {
                    element.textContent = `Niv.${stats.level} (${Math.round(waterValue)}%)`;
                    element.style.color = stats.color;
                } else {
                    element.textContent = `Sec (${Math.round(waterValue)}%)`;
                    element.style.color = '#8B4513'; // Brun pour sol sec
                }
            } else {
                element.textContent = 'N/A';
                element.style.color = '#888888';
            }
        }
    }

    updatePollutionLevel(pollutionValue, textureGenerator) {
        if (!this.isEnabled) return;
        
        const element = document.getElementById('debug-pollution-level');
        if (element && textureGenerator) {
            if (pollutionValue !== null && pollutionValue !== undefined) {
                const pollutionLevels = textureGenerator.pollutionLevels;
                const stats = textureGenerator.getIntensityStats(pollutionValue, pollutionLevels, 'pollution');
                
                if (stats.level > 0) {
                    element.textContent = `Niv.${stats.level} (${Math.round(pollutionValue)}%)`;
                    element.style.color = stats.color;
                } else {
                    element.textContent = `Propre (${Math.round(pollutionValue)}%)`;
                    element.style.color = '#228B22'; // Vert pour sol propre
                }
            } else {
                element.textContent = 'N/A';
                element.style.color = '#888888';
            }
        }
    }

    updateTreeMetrics(visibleTrees, totalTrees) {
        if (!this.isEnabled) return;
        
        const element = document.getElementById('debug-trees');
        if (element) {
            element.textContent = `${visibleTrees} / ${totalTrees}`;
            
            // Colorer selon la densité d'arbres
            if (totalTrees === 0) {
                element.style.color = '#888888'; // Gris pour aucun arbre
            } else {
                const ratio = visibleTrees / totalTrees;
                if (ratio < 0.1) {
                    element.style.color = '#00ff00'; // Vert pour faible charge
                } else if (ratio < 0.3) {
                    element.style.color = '#ffff00'; // Jaune pour charge moyenne
                } else {
                    element.style.color = '#ff8800'; // Orange pour charge élevée
                }
            }
        }
    }

    updateTreeSpecies(speciesCount) {
        if (!this.isEnabled) return;
        
        const element = document.getElementById('debug-tree-species');
        if (element) {
            const chenes = speciesCount.chene || 0;
            const pins = speciesCount.pin || 0;
            const chataigniers = speciesCount.chataignier || 0;
            
            element.textContent = `Chênes: ${chenes}, Pins: ${pins}, Châtaigniers: ${chataigniers}`;
            
            // Colorer selon la diversité
            const total = chenes + pins + chataigniers;
            const diversity = (chenes > 0 ? 1 : 0) + (pins > 0 ? 1 : 0) + (chataigniers > 0 ? 1 : 0);
            
            if (total === 0) {
                element.style.color = '#888888'; // Gris pour aucun arbre
            } else if (diversity === 3) {
                element.style.color = '#00ff00'; // Vert pour diversité maximale
            } else if (diversity === 2) {
                element.style.color = '#ffff00'; // Jaune pour diversité moyenne
            } else {
                element.style.color = '#ff8800'; // Orange pour faible diversité
            }
        }
    }

    updateTreeInfo(treeInfo) {
        if (!this.isEnabled) return;
        
        const element = document.getElementById('debug-tree-info');
        if (element) {
            if (treeInfo) {
                const health = Math.round(treeInfo.health);
                const maturity = Math.round(treeInfo.maturity);
                element.textContent = `${treeInfo.species} (${maturity}%, S:${health}%)`;
                
                // Colorer selon la santé de l'arbre
                if (health > 80) {
                    element.style.color = '#00ff00'; // Vert pour arbre sain
                } else if (health > 50) {
                    element.style.color = '#ffff00'; // Jaune pour arbre moyen
                } else {
                    element.style.color = '#ff8800'; // Orange pour arbre en mauvaise santé
                }
            } else {
                element.textContent = 'N/A';
                element.style.color = '#888888';
            }
        }
    }

    incrementRenderCall() {
        if (!this.isEnabled) return;
        this.renderCalls++;
    }

    resetRenderCalls() {
        if (!this.isEnabled) return;
        this.renderCalls = 0;
    }

    getConfig() {
        return this.config;
    }

    isDebugEnabled() {
        return this.isEnabled;
    }

    log(message, type = 'info') {
        if (!this.isEnabled) return;
        
        const timestamp = new Date().toLocaleTimeString();
        const prefix = `[${timestamp}] [DEBUG]`;
        
        switch (type) {
            case 'error':
                console.error(prefix, message);
                break;
            case 'warn':
                console.warn(prefix, message);
                break;
            default:
                console.log(prefix, message);
        }
    }
    
    initializeShadowControls() {
        // Paramètres d'ombre par défaut
        this.shadowParams = {
            width: 1.0,
            height: 0.6,
            length: 1.5,
            rotation: 0,
            translateX: 0,
            translateY: 0,
            opacity: 50,
            enabled: true
        };
        
        // Gestionnaires des sliders
        const shadowWidth = document.getElementById('shadow-width');
        const shadowHeight = document.getElementById('shadow-height');
        const shadowLength = document.getElementById('shadow-length');
        const shadowRotation = document.getElementById('shadow-rotation');
        const shadowOpacity = document.getElementById('shadow-opacity');
        const shadowTranslateX = document.getElementById('shadow-translate-x');
        const shadowTranslateY = document.getElementById('shadow-translate-y');
        const shadowToggle = document.getElementById('toggle-shadows');
        
        if (shadowWidth) {
            shadowWidth.addEventListener('input', (e) => {
                this.shadowParams.width = parseFloat(e.target.value);
                document.getElementById('shadow-width-value').textContent = `${this.shadowParams.width}x`;
                this.onShadowParamChange();
            });
        }
        
        if (shadowHeight) {
            shadowHeight.addEventListener('input', (e) => {
                this.shadowParams.height = parseFloat(e.target.value);
                document.getElementById('shadow-height-value').textContent = `${this.shadowParams.height}x`;
                this.onShadowParamChange();
            });
        }
        
        if (shadowLength) {
            shadowLength.addEventListener('input', (e) => {
                this.shadowParams.length = parseFloat(e.target.value);
                document.getElementById('shadow-length-value').textContent = `${this.shadowParams.length}x`;
                this.onShadowParamChange();
            });
        }
        
        if (shadowRotation) {
            shadowRotation.addEventListener('input', (e) => {
                this.shadowParams.rotation = parseInt(e.target.value);
                document.getElementById('shadow-rotation-value').textContent = `${this.shadowParams.rotation}°`;
                this.onShadowParamChange();
            });
        }
        
        if (shadowOpacity) {
            shadowOpacity.addEventListener('input', (e) => {
                this.shadowParams.opacity = parseInt(e.target.value);
                document.getElementById('shadow-opacity-value').textContent = `${this.shadowParams.opacity}%`;
                this.onShadowParamChange();
            });
        }
        
        if (shadowTranslateX) {
            shadowTranslateX.addEventListener('input', (e) => {
                this.shadowParams.translateX = parseInt(e.target.value);
                document.getElementById('shadow-translate-x-value').textContent = `${this.shadowParams.translateX}px`;
                this.onShadowParamChange();
            });
        }
        
        if (shadowTranslateY) {
            shadowTranslateY.addEventListener('input', (e) => {
                this.shadowParams.translateY = parseInt(e.target.value);
                document.getElementById('shadow-translate-y-value').textContent = `${this.shadowParams.translateY}px`;
                this.onShadowParamChange();
            });
        }
        
        if (shadowToggle) {
            shadowToggle.addEventListener('click', (e) => {
                this.shadowParams.enabled = !this.shadowParams.enabled;
                this.updateToggleButton(e.target, this.shadowParams.enabled);
                this.onShadowParamChange();
            });
        }
    }
    
    onShadowParamChange() {
        // Notifier le système d'arbres des changements de paramètres d'ombre
        if (window.graphics && window.graphics.treeManager) {
            window.graphics.treeManager.setShadowParams(this.shadowParams);
        }
    }
    
    getShadowParams() {
        return this.shadowParams;
    }
}