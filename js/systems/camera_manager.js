/**
 * CameraManager - Gestionnaire de caméra et système de zoom
 * 
 * Ce module gère la caméra virtuelle du jeu, incluant la position, le zoom,
 * et les transformations de coordonnées entre l'espace monde et l'espace écran.
 * Il fournit des méthodes pour contrôler la caméra et convertir les coordonnées.
 * 
 * Fonctionnalités principales :
 * - Gestion de la position et du zoom de la caméra
 * - Conversion coordonnées monde ↔ écran
 * - Zoom centré sur un point spécifique
 * - Contraintes de zoom configurables
 */

class CameraManager {
    constructor(canvasWidth, canvasHeight) {
        this.canvas = { width: canvasWidth, height: canvasHeight };
        
        // État de la caméra
        this.position = { x: 0, y: 0 };
        this.zoom = 1.0;
        
        // Contraintes
        this.minZoom = 0.5;
        this.maxZoom = 5.0;
        this.zoomSpeed = 0.1;
        
        // Pour le suivi fluide
        this.target = null;
        this.followSpeed = 0.05;
        
        // Projection mode (orthographic or isometric)
        this.projectionMode = 'orthographic';
    }
    
    // Gestion du zoom
    setZoom(newZoom, centerX = null, centerY = null) {
        const clampedZoom = Math.max(this.minZoom, Math.min(this.maxZoom, newZoom));
        
        if (centerX !== null && centerY !== null) {
            // Zoom centré sur un point spécifique
            const worldPointBefore = this.screenToWorld(centerX, centerY);
            this.zoom = clampedZoom;
            const worldPointAfter = this.screenToWorld(centerX, centerY);
            
            // Ajuster la position pour maintenir le point sous le curseur
            this.position.x += worldPointBefore.x - worldPointAfter.x;
            this.position.y += worldPointBefore.y - worldPointAfter.y;
        } else {
            this.zoom = clampedZoom;
        }
        
        return this.zoom;
    }
    
    zoomIn(centerX = null, centerY = null) {
        const newZoom = this.zoom * (1 + this.zoomSpeed);
        return this.setZoom(newZoom, centerX, centerY);
    }
    
    zoomOut(centerX = null, centerY = null) {
        const newZoom = this.zoom * (1 - this.zoomSpeed);
        return this.setZoom(newZoom, centerX, centerY);
    }
    
    // Gestion de la position
    setPosition(x, y) {
        this.position.x = x;
        this.position.y = y;
    }
    
    move(deltaX, deltaY) {
        // Apply isometric pan scale if in isometric mode
        const panScale = this.getIsometricPanScale();
        this.position.x += deltaX * panScale;
        this.position.y += deltaY * panScale;
    }
    
    /**
     * Get pan scale factor based on projection mode
     * Isometric tiles are wider (2:1 ratio), so panning feels better with scaled movement
     * @returns {number} Pan scale multiplier
     */
    getIsometricPanScale() {
        if (this.projectionMode === 'isometric') {
            return 0.7; // Reduce pan speed for isometric to feel more natural
        }
        return 1.0; // No scaling for orthographic
    }
    
    // Suivi d'une cible
    setTarget(entity) {
        this.target = entity;
    }
    
    clearTarget() {
        this.target = null;
    }
    
    update() {
        if (this.target) {
            // Suivre la cible avec interpolation fluide
            const targetX = this.target.position.x + this.target.size / 2;
            const targetY = this.target.position.y + this.target.size / 2;
            
            const deltaX = targetX - this.position.x;
            const deltaY = targetY - this.position.y;
            
            this.position.x += deltaX * this.followSpeed;
            this.position.y += deltaY * this.followSpeed;
        }
    }
    
    // Conversions de coordonnées
    screenToWorld(screenX, screenY) {
        // Centrer par rapport à l'écran
        const centeredX = screenX - this.canvas.width * 0.5;
        const centeredY = screenY - this.canvas.height * 0.5;
        
        // Appliquer le zoom inverse
        const worldX = centeredX / this.zoom + this.position.x;
        const worldY = centeredY / this.zoom + this.position.y;
        
        return { x: worldX, y: worldY };
    }
    
    worldToScreen(worldX, worldY) {
        const cameraX = worldX - this.position.x;
        const cameraY = worldY - this.position.y;
        
        const zoomedX = cameraX * this.zoom;
        const zoomedY = cameraY * this.zoom;
        
        const screenX = zoomedX + this.canvas.width * 0.5;
        const screenY = zoomedY + this.canvas.height * 0.5;
        
        return { x: screenX, y: screenY };
    }
    
    // Mise à jour de la taille du canvas
    resize(width, height) {
        this.canvas.width = width;
        this.canvas.height = height;
    }
    
    // Getters pour les uniformes shaders
    getViewMatrix() {
        return {
            zoom: this.zoom,
            position: { ...this.position },
            resolution: { ...this.canvas }
        };
    }
    
    // Méthodes utilitaires
    isPointVisible(worldX, worldY, margin = 0) {
        const screen = this.worldToScreen(worldX, worldY);
        return screen.x >= -margin && 
               screen.x <= this.canvas.width + margin &&
               screen.y >= -margin && 
               screen.y <= this.canvas.height + margin;
    }
    
    getVisibleBounds() {
        const topLeft = this.screenToWorld(0, 0);
        const bottomRight = this.screenToWorld(this.canvas.width, this.canvas.height);
        
        return {
            left: topLeft.x,
            top: topLeft.y,
            right: bottomRight.x,
            bottom: bottomRight.y,
            width: bottomRight.x - topLeft.x,
            height: bottomRight.y - topLeft.y
        };
    }
    
    // Projection mode management
    setProjectionMode(mode) {
        this.projectionMode = mode;
        console.log(`CameraManager projection mode: ${this.projectionMode}`);
    }
}