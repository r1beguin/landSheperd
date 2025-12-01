/**
 * InputManager - Gestionnaire centralisé des entrées utilisateur
 * 
 * Ce module capture et traite tous les événements d'entrée (souris, clavier, molette).
 * Il découple la logique d'entrée du moteur de rendu et fournit une interface
 * événementielle pour que d'autres systèmes puissent réagir aux actions utilisateur.
 * 
 * Fonctionnalités principales :
 * - Capture des événements souris (clic, déplacement, molette)
 * - Gestion du clavier avec état des touches
 * - Système d'événements pour notifier les autres systèmes
 * - Conversion automatique des coordonnées écran
 */

class InputManager {
    constructor(canvas) {
        this.canvas = canvas;
        this.listeners = new Map();
        
        // État des entrées
        this.mouseState = {
            x: 0,
            y: 0,
            leftButton: false,
            rightButton: false,
            middleButton: false
        };
        
        this.keyState = new Map();
        
        // Manager references for species palette
        this.plantManager = null;
        
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        // Événements souris
        this.canvas.addEventListener('click', (event) => {
            const coords = this.getCanvasCoordinates(event);
            this.emit('click', {
                x: coords.x,
                y: coords.y,
                button: event.button,
                originalEvent: event
            });
        });
        
        this.canvas.addEventListener('mousedown', (event) => {
            this.updateMouseState(event);
            const coords = this.getCanvasCoordinates(event);
            this.emit('mousedown', {
                x: coords.x,
                y: coords.y,
                button: event.button,
                originalEvent: event
            });
        });
        
        this.canvas.addEventListener('mouseup', (event) => {
            this.updateMouseState(event);
            const coords = this.getCanvasCoordinates(event);
            this.emit('mouseup', {
                x: coords.x,
                y: coords.y,
                button: event.button,
                originalEvent: event
            });
        });
        
        this.canvas.addEventListener('mousemove', (event) => {
            const coords = this.getCanvasCoordinates(event);
            this.mouseState.x = coords.x;
            this.mouseState.y = coords.y;
            
            this.emit('mousemove', {
                x: coords.x,
                y: coords.y,
                deltaX: event.movementX,
                deltaY: event.movementY,
                originalEvent: event
            });
        });
        
        // Événement molette
        this.canvas.addEventListener('wheel', (event) => {
            event.preventDefault();
            const coords = this.getCanvasCoordinates(event);
            
            this.emit('wheel', {
                x: coords.x,
                y: coords.y,
                deltaY: event.deltaY,
                deltaX: event.deltaX,
                originalEvent: event
            });
        });
        
        // Événements clavier
        window.addEventListener('keydown', (event) => {
            this.keyState.set(event.code, true);
            this.emit('keydown', {
                code: event.code,
                key: event.key,
                originalEvent: event
            });
        });
        
        window.addEventListener('keyup', (event) => {
            this.keyState.set(event.code, false);
            this.emit('keyup', {
                code: event.code,
                key: event.key,
                originalEvent: event
            });
        });
        
        // Empêcher le menu contextuel
        this.canvas.addEventListener('contextmenu', (event) => {
            event.preventDefault();
        });
        
        // Gestion du redimensionnement
        window.addEventListener('resize', () => {
            this.emit('resize', {
                width: window.innerWidth,
                height: window.innerHeight
            });
        });
    }
    
    updateMouseState(event) {
        switch (event.button) {
            case 0: // Bouton gauche
                this.mouseState.leftButton = event.type === 'mousedown';
                break;
            case 1: // Bouton milieu
                this.mouseState.middleButton = event.type === 'mousedown';
                break;
            case 2: // Bouton droit
                this.mouseState.rightButton = event.type === 'mousedown';
                break;
        }
    }
    
    getCanvasCoordinates(event) {
        const rect = this.canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        
        // Convertir vers les coordonnées canvas
        const canvasX = (x / rect.width) * this.canvas.width;
        const canvasY = (y / rect.height) * this.canvas.height;
        
        return { x: canvasX, y: canvasY };
    }
    
    // Système d'événements
    on(eventType, callback) {
        if (!this.listeners.has(eventType)) {
            this.listeners.set(eventType, []);
        }
        this.listeners.get(eventType).push(callback);
    }
    
    off(eventType, callback) {
        if (this.listeners.has(eventType)) {
            const callbacks = this.listeners.get(eventType);
            const index = callbacks.indexOf(callback);
            if (index > -1) {
                callbacks.splice(index, 1);
            }
        }
    }
    
    emit(eventType, data) {
        if (this.listeners.has(eventType)) {
            const callbacks = this.listeners.get(eventType);
            callbacks.forEach(callback => callback(data));
        }
    }
    
    // Méthodes utilitaires pour l'état
    isKeyPressed(code) {
        return this.keyState.get(code) || false;
    }
    
    isMouseButtonPressed(button) {
        switch (button) {
            case 0: return this.mouseState.leftButton;
            case 1: return this.mouseState.middleButton;
            case 2: return this.mouseState.rightButton;
            default: return false;
        }
    }
    
    getMousePosition() {
        return { x: this.mouseState.x, y: this.mouseState.y };
    }
    
    /**
     * Set plant manager reference for species selection
     * @param {PlantManager} plantManager - The plant manager instance
     */
    setPlantManager(plantManager) {
        this.plantManager = plantManager;
        // Initialize species palette UI
        this.initSpeciesPalette();
    }
    
    /**
     * Initialize species palette interactions
     */
    initSpeciesPalette() {
        const paletteIcons = document.querySelectorAll('.species-icon');
        
        paletteIcons.forEach(icon => {
            icon.addEventListener('click', (e) => {
                e.preventDefault();
                
                const speciesId = icon.dataset.species;
                
                // Update PlantManager selection
                if (this.plantManager) {
                    this.plantManager.setSelectedSpecies(speciesId);
                    
                    // Update UI to show selection
                    paletteIcons.forEach(i => i.classList.remove('selected'));
                    icon.classList.add('selected');
                    
                    // Update info text
                    const speciesConfig = this.plantManager.getSpeciesById(speciesId);
                    if (speciesConfig) {
                        const infoElement = document.getElementById('selected-species-info');
                        const layerName = speciesConfig.layer || 'middle';
                        if (infoElement) {
                            infoElement.textContent = `${speciesConfig.commonName} selected (${layerName} layer)`;
                        }
                    }
                    
                    console.log(`Selected species: ${speciesId}`);
                }
            });
        });
    }
}