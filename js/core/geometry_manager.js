/**
 * GeometryManager - Gestionnaire des géométries et buffers WebGL
 * 
 * Ce module centralise la création et la gestion des formes géométriques réutilisables.
 * Il optimise les performances en évitant la recréation de géométries identiques
 * et fournit des primitives communes (carrés, cercles) prêtes à l'emploi.
 * 
 * Fonctionnalités principales :
 * - Cache des géométries par clé unique (dimensions, type)
 * - Création de formes primitives (quad, cercle)
 * - Gestion automatique des buffers WebGL
 * - Binding optimisé des attributs de vertex
 */

class GeometryManager {
    constructor(gl) {
        this.gl = gl;
        this.geometries = new Map();
    }

    createQuad(width, height, centered = false) {
        const key = `quad_${width}_${height}_${centered}`;
        
        if (this.geometries.has(key)) {
            return this.geometries.get(key);
        }

        let vertices;
        if (centered) {
            const halfW = width / 2;
            const halfH = height / 2;
            vertices = new Float32Array([
                -halfW, -halfH,  // Coin en bas à gauche
                halfW, -halfH,   // Coin en bas à droite
                -halfW, halfH,   // Coin en haut à gauche
                halfW, -halfH,   // Coin en bas à droite
                halfW, halfH,    // Coin en haut à droite
                -halfW, halfH    // Coin en haut à gauche
            ]);
        } else {
            vertices = new Float32Array([
                0, 0,           // Coin en bas à gauche
                width, 0,       // Coin en bas à droite
                0, height,      // Coin en haut à gauche
                width, 0,       // Coin en bas à droite
                width, height,  // Coin en haut à droite
                0, height       // Coin en haut à gauche
            ]);
        }

        const buffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, vertices, this.gl.STATIC_DRAW);

        const geometry = {
            buffer: buffer,
            vertexCount: 6,
            width: width,
            height: height,
            centered: centered
        };

        this.geometries.set(key, geometry);
        return geometry;
    }

    createQuadWithTexCoords(width, height, centered = false) {
        const key = `quad_tex_${width}_${height}_${centered}`;
        
        if (this.geometries.has(key)) {
            return this.geometries.get(key);
        }

        let vertices, texCoords;
        if (centered) {
            const halfW = width / 2;
            const halfH = height / 2;
            vertices = new Float32Array([
                -halfW, -halfH,  // Coin en bas à gauche
                halfW, -halfH,   // Coin en bas à droite
                -halfW, halfH,   // Coin en haut à gauche
                halfW, -halfH,   // Coin en bas à droite
                halfW, halfH,    // Coin en haut à droite
                -halfW, halfH    // Coin en haut à gauche
            ]);
        } else {
            vertices = new Float32Array([
                0, 0,           // Coin en bas à gauche
                width, 0,       // Coin en bas à droite
                0, height,      // Coin en haut à gauche
                width, 0,       // Coin en bas à droite
                width, height,  // Coin en haut à droite
                0, height       // Coin en haut à gauche
            ]);
        }

        // Coordonnées de texture (0,0 en bas à gauche, 1,1 en haut à droite)
        texCoords = new Float32Array([
            0, 0,  // Coin en bas à gauche
            1, 0,  // Coin en bas à droite
            0, 1,  // Coin en haut à gauche
            1, 0,  // Coin en bas à droite
            1, 1,  // Coin en haut à droite
            0, 1   // Coin en haut à gauche
        ]);

        // Buffer pour les positions
        const positionBuffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, positionBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, vertices, this.gl.STATIC_DRAW);

        // Buffer pour les coordonnées de texture
        const texCoordBuffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, texCoordBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, texCoords, this.gl.STATIC_DRAW);

        const geometry = {
            positionBuffer: positionBuffer,
            texCoordBuffer: texCoordBuffer,
            vertexCount: 6,
            width: width,
            height: height,
            centered: centered,
            hasTexCoords: true
        };

        this.geometries.set(key, geometry);
        return geometry;
    }

    createCircle(radius, segments = 16) {
        const key = `circle_${radius}_${segments}`;
        
        if (this.geometries.has(key)) {
            return this.geometries.get(key);
        }

        const vertices = [];
        
        // Centre du cercle
        vertices.push(0, 0);
        
        // Points du cercle
        for (let i = 0; i <= segments; i++) {
            const angle = (i / segments) * Math.PI * 2;
            vertices.push(Math.cos(angle) * radius, Math.sin(angle) * radius);
        }

        const buffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(vertices), this.gl.STATIC_DRAW);

        const geometry = {
            buffer: buffer,
            vertexCount: segments + 2,
            radius: radius,
            segments: segments,
            drawMode: this.gl.TRIANGLE_FAN
        };

        this.geometries.set(key, geometry);
        return geometry;
    }

    /**
     * Create diamond-shaped quad for isometric tiles
     * Uses 2 triangles to form a diamond (rhombus) shape
     * @param {number} tileWidth - Tile width in pixels (e.g., 40)
     * @param {number} tileHeight - Tile height in pixels (e.g., 20)
     * @returns {Object} Geometry with diamond vertices
     */
    createIsoDiamond(tileWidth, tileHeight) {
        const key = `iso_diamond_${tileWidth}_${tileHeight}`;
        
        if (this.geometries.has(key)) {
            return this.geometries.get(key);
        }
        
        const halfW = tileWidth / 2;
        const halfH = tileHeight / 2;
        
        // Diamond vertices (4 corners forming rhombus)
        // Top vertex (0, halfH), Right vertex (halfW, 0)
        // Bottom vertex (0, -halfH), Left vertex (-halfW, 0)
        const vertices = new Float32Array([
            // Triangle 1 (top half)
            0, halfH,        // Top vertex
            -halfW, 0,       // Left vertex
            halfW, 0,        // Right vertex
            
            // Triangle 2 (bottom half)
            0, -halfH,       // Bottom vertex
            halfW, 0,        // Right vertex
            -halfW, 0        // Left vertex
        ]);
        
        const buffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, vertices, this.gl.STATIC_DRAW);
        
        const geometry = {
            buffer: buffer,
            vertexCount: 6,
            width: tileWidth,
            height: tileHeight,
            shape: 'diamond'
        };
        
        this.geometries.set(key, geometry);
        return geometry;
    }

    /**
     * Create diamond-shaped quad with texture coordinates for isometric tiles
     * @param {number} tileWidth - Tile width in pixels
     * @param {number} tileHeight - Tile height in pixels
     * @returns {Object} Geometry with diamond vertices and texture coords
     */
    createIsoDiamondWithTexCoords(tileWidth, tileHeight) {
        const key = `iso_diamond_tex_${tileWidth}_${tileHeight}`;
        
        if (this.geometries.has(key)) {
            return this.geometries.get(key);
        }
        
        const halfW = tileWidth / 2;
        const halfH = tileHeight / 2;
        
        // Diamond vertices
        const vertices = new Float32Array([
            // Triangle 1 (top half)
            0, halfH,        // Top vertex
            -halfW, 0,       // Left vertex
            halfW, 0,        // Right vertex
            
            // Triangle 2 (bottom half)
            0, -halfH,       // Bottom vertex
            halfW, 0,        // Right vertex
            -halfW, 0        // Left vertex
        ]);
        
        // Texture coordinates (map diamond to square texture)
        const texCoords = new Float32Array([
            // Triangle 1
            0.5, 1.0,  // Top vertex
            0.0, 0.5,  // Left vertex
            1.0, 0.5,  // Right vertex
            
            // Triangle 2
            0.5, 0.0,  // Bottom vertex
            1.0, 0.5,  // Right vertex
            0.0, 0.5   // Left vertex
        ]);
        
        // Buffer for positions
        const positionBuffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, positionBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, vertices, this.gl.STATIC_DRAW);
        
        // Buffer for texture coordinates
        const texCoordBuffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, texCoordBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, texCoords, this.gl.STATIC_DRAW);
        
        const geometry = {
            positionBuffer: positionBuffer,
            texCoordBuffer: texCoordBuffer,
            vertexCount: 6,
            width: tileWidth,
            height: tileHeight,
            shape: 'diamond',
            hasTexCoords: true
        };
        
        this.geometries.set(key, geometry);
        return geometry;
    }

    getGeometry(key) {
        return this.geometries.get(key);
    }

    bindGeometry(geometry, attributeLocation) {
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, geometry.buffer);
        this.gl.enableVertexAttribArray(attributeLocation);
        this.gl.vertexAttribPointer(attributeLocation, 2, this.gl.FLOAT, false, 0, 0);
    }

    bindGeometryWithTexCoords(geometry, positionLocation, texCoordLocation) {
        // Lier le buffer de positions
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, geometry.positionBuffer);
        this.gl.enableVertexAttribArray(positionLocation);
        this.gl.vertexAttribPointer(positionLocation, 2, this.gl.FLOAT, false, 0, 0);

        // Lier le buffer de coordonnées de texture
        if (geometry.hasTexCoords && texCoordLocation !== -1) {
            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, geometry.texCoordBuffer);
            this.gl.enableVertexAttribArray(texCoordLocation);
            this.gl.vertexAttribPointer(texCoordLocation, 2, this.gl.FLOAT, false, 0, 0);
        }
    }

    cleanup() {
        for (const geometry of this.geometries.values()) {
            if (geometry.buffer) {
                this.gl.deleteBuffer(geometry.buffer);
            }
            if (geometry.positionBuffer) {
                this.gl.deleteBuffer(geometry.positionBuffer);
            }
            if (geometry.texCoordBuffer) {
                this.gl.deleteBuffer(geometry.texCoordBuffer);
            }
        }
        this.geometries.clear();
    }
}