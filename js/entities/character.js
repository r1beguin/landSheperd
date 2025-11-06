/**
 * Character - Classe entité représentant un personnage jouable
 * 
 * Cette classe encapsule toute la logique d'un personnage dans le jeu, incluant
 * la position, le mouvement, l'animation et le rendu. Elle fournit une interface
 * simple pour contrôler le personnage et obtenir ses données de rendu.
 * 
 * Fonctionnalités principales :
 * - Système de mouvement fluide avec interpolation
 * - Animation de scale pendant le déplacement
 * - Gestion des couleurs et tailles paramétrables
 * - Interface de rendu découplée de l'implémentation WebGL
 */
class Character {
    constructor(x, y, size = 5, color = [0.0, 1.0, 0.0, 1.0]) {
        this.position = { x, y };
        this.targetPosition = { x, y };
        this.size = size;
        this.color = color;
        this.speed = 0.005;
        this.isMoving = false;
        
        // État de l'animation
        this.animationProgress = 0;
    }

    moveTo(x, y) {
        this.targetPosition.x = x - this.size / 2; // Centrer sur le point
        this.targetPosition.y = y - this.size / 2;
        this.isMoving = true;
        this.animationProgress = 0;
    }

    update(deltaTime) {
        if (this.isMoving) {
            const dx = this.targetPosition.x - this.position.x;
            const dy = this.targetPosition.y - this.position.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < 1) {
                // Arrivé à destination
                this.position.x = this.targetPosition.x;
                this.position.y = this.targetPosition.y;
                this.isMoving = false;
                this.animationProgress = 1;
            } else {
                // Se déplacer vers la cible avec interpolation fluide
                const moveDistance = this.speed * distance * deltaTime;
                this.position.x += (dx / distance) * moveDistance;
                this.position.y += (dy / distance) * moveDistance;
                this.animationProgress = Math.min(1, this.animationProgress + deltaTime * 0.001);
            }
        }
    }

    getRenderData() {
        return {
            position: this.position,
            size: this.size,
            color: this.color,
            scale: this.isMoving ? 1 + Math.sin(this.animationProgress * Math.PI * 4) * 0.1 : 1
        };
    }

    getRenderType() {
        return 'character';
    }

    isAt(x, y, threshold = 5) {
        const dx = this.position.x + this.size / 2 - x;
        const dy = this.position.y + this.size / 2 - y;
        return Math.sqrt(dx * dx + dy * dy) < threshold;
    }
}