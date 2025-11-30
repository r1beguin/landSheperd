/**
 * RenderSystem - Système de rendu WebGL optimisé
 * 
 * Ce module gère uniquement le rendu des entités et objets du jeu.
 * Il utilise les gestionnaires de shaders et géométries pour optimiser
 * les performances et fournit des méthodes de rendu pour différents types d'objets.
 * 
 * Fonctionnalités principales :
 * - Rendu optimisé des entités avec batching
 * - Gestion des uniformes de caméra et transformation
 * - Interface simple pour ajouter de nouveaux types de rendu
 * - Comptage automatique des appels de rendu pour debug
 */

class RenderSystem {
    constructor(gl, shaderManager, geometryManager) {
        this.gl = gl;
        this.shaderManager = shaderManager;
        this.geometryManager = geometryManager;
        
        // Compteurs pour le debug
        this.renderCallsThisFrame = 0;
        this.entitiesRendered = 0;
        
        // Cache des programmes actifs
        this.currentProgram = null;
    }
    
    beginFrame() {
        // Réinitialiser les compteurs
        this.renderCallsThisFrame = 0;
        this.entitiesRendered = 0;
        
        // Effacer le framebuffer
        this.gl.clear(this.gl.COLOR_BUFFER_BIT);
    }
    
    endFrame() {
        // Nettoyer l'état
        this.currentProgram = null;
    }
    
    // Rendu d'un personnage/entité
    renderCharacter(character, viewMatrix, lightingManager) {
        const programInfo = this.shaderManager.useProgram('basic');
        if (!programInfo) return;
        
        this.currentProgram = programInfo;
        
        const characterData = character.getRenderData();
        const geometry = this.geometryManager.getGeometry('quad_5_5_false');
        
        // Configurer les uniformes
        this.setBasicUniforms(programInfo, viewMatrix, lightingManager);
        this.gl.uniform2f(programInfo.uniforms.u_translation, characterData.position.x, characterData.position.y);
        this.gl.uniform2f(programInfo.uniforms.u_scale, characterData.scale, characterData.scale);
        this.gl.uniform4f(programInfo.uniforms.u_color, ...characterData.color);
        
        // Configurer et dessiner la géométrie
        this.drawGeometry(geometry, programInfo.attributes.a_position);
        
        this.entitiesRendered++;
    }
    
    // Rendu d'un rectangle simple
    renderRect(x, y, width, height, color, viewMatrix, lightingManager) {
        const programInfo = this.shaderManager.useProgram('basic');
        if (!programInfo) return;
        
        this.currentProgram = programInfo;
        
        // Obtenir ou créer la géométrie pour ce rectangle
        const geometryKey = `quad_${width}_${height}_false`;
        let geometry = this.geometryManager.getGeometry(geometryKey);
        if (!geometry) {
            geometry = this.geometryManager.createQuad(width, height, false);
        }
        
        // Configurer les uniformes
        this.setBasicUniforms(programInfo, viewMatrix, lightingManager);
        this.gl.uniform2f(programInfo.uniforms.u_translation, x, y);
        this.gl.uniform2f(programInfo.uniforms.u_scale, 1.0, 1.0);
        this.gl.uniform4f(programInfo.uniforms.u_color, ...color);
        
        // Configurer et dessiner la géométrie
        this.drawGeometry(geometry, programInfo.attributes.a_position);
        
        this.entitiesRendered++;
    }
    
    // Rendu d'un cercle
    renderCircle(x, y, radius, color, viewMatrix, lightingManager, segments = 16) {
        const programInfo = this.shaderManager.useProgram('basic');
        if (!programInfo) return;
        
        this.currentProgram = programInfo;
        
        // Obtenir ou créer la géométrie pour ce cercle
        const geometryKey = `circle_${radius}_${segments}`;
        let geometry = this.geometryManager.getGeometry(geometryKey);
        if (!geometry) {
            geometry = this.geometryManager.createCircle(radius, segments);
        }
        
        // Configurer les uniformes
        this.setBasicUniforms(programInfo, viewMatrix, lightingManager);
        this.gl.uniform2f(programInfo.uniforms.u_translation, x, y);
        this.gl.uniform2f(programInfo.uniforms.u_scale, 1.0, 1.0);
        this.gl.uniform4f(programInfo.uniforms.u_color, ...color);
        
        // Configurer la géométrie
        this.geometryManager.bindGeometry(geometry, programInfo.attributes.a_position);
        
        // Dessiner avec le mode approprié pour le cercle
        this.gl.drawArrays(geometry.drawMode || this.gl.TRIANGLES, 0, geometry.vertexCount);
        this.renderCallsThisFrame++;
        this.entitiesRendered++;
    }
    
    // Rendu d'un rectangle avec texture
    renderTexturedRect(x, y, width, height, texture, viewMatrix, lightingManager, tint = [1, 1, 1, 1]) {
        const programInfo = this.shaderManager.useProgram('texture');
        if (!programInfo) return;
        
        this.currentProgram = programInfo;
        
        // Obtenir ou créer la géométrie avec coordonnées de texture
        const geometryKey = `quad_tex_${width}_${height}_false`;
        let geometry = this.geometryManager.getGeometry(geometryKey);
        if (!geometry) {
            geometry = this.geometryManager.createQuadWithTexCoords(width, height, false);
        }
        
        // Activer le blending pour la transparence
        this.gl.enable(this.gl.BLEND);
        this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);
        
        // Activer la texture
        this.gl.activeTexture(this.gl.TEXTURE0);
        this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
        
        // Configurer les uniformes
        this.setTextureUniforms(programInfo, viewMatrix, lightingManager);
        this.gl.uniform2f(programInfo.uniforms.u_translation, x, y);
        this.gl.uniform2f(programInfo.uniforms.u_scale, 1.0, 1.0);
        this.gl.uniform1i(programInfo.uniforms.u_texture, 0); // Texture unit 0
        this.gl.uniform4f(programInfo.uniforms.u_tint, tint[0], tint[1], tint[2], tint[3]);
        
        // Configurer et dessiner la géométrie avec coordonnées de texture
        this.drawTexturedGeometry(geometry, programInfo.attributes.a_position, programInfo.attributes.a_texCoord);
        
        // Désactiver le blending après usage
        this.gl.disable(this.gl.BLEND);
        
        this.entitiesRendered++;
    }

    // Rendu des plantes avec texture canvas
    renderPlant(plant, viewMatrix, lightingManager) {
        if (!plant.hasTexture()) return;
        
        const renderData = plant.getRenderData();
        
        // Create WebGL texture from canvas if needed
        let webglTexture = plant.webglTexture;
        if (!webglTexture && renderData.texture) {
            webglTexture = this.createTextureFromCanvas(renderData.texture);
            plant.webglTexture = webglTexture; // Cache the texture
        }
        
        if (webglTexture) {
            this.renderTexturedRect(
                renderData.x, 
                renderData.y, 
                renderData.width, 
                renderData.height, 
                webglTexture, 
                viewMatrix,
                lightingManager,
                renderData.tint || [1, 1, 1, 1]
            );
        }
    }

    // Create WebGL texture from canvas
    createTextureFromCanvas(canvas) {
        const texture = this.gl.createTexture();
        this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
        
        // Upload the canvas to the texture
        this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.gl.RGBA, this.gl.UNSIGNED_BYTE, canvas);
        
        // Set filtering
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.NEAREST);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.NEAREST);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
        
        return texture;
    }
    
    // Configuration des uniformes de base (caméra, résolution)
    setBasicUniforms(programInfo, viewMatrix, lightingManager) {
        this.gl.uniform2f(programInfo.uniforms.u_resolution, viewMatrix.resolution.width, viewMatrix.resolution.height);
        this.gl.uniform1f(programInfo.uniforms.u_zoom, viewMatrix.zoom);
        this.gl.uniform2f(programInfo.uniforms.u_camera, viewMatrix.position.x, viewMatrix.position.y);
        
        // Apply lighting if available
        if (programInfo.uniforms.u_ambientLight) {
            if (lightingManager && lightingManager.isEnabled()) {
                const ambientColor = lightingManager.getAmbientColor();
                this.gl.uniform3f(programInfo.uniforms.u_ambientLight, ambientColor[0], ambientColor[1], ambientColor[2]);
            } else {
                // Default: full brightness (no lighting)
                this.gl.uniform3f(programInfo.uniforms.u_ambientLight, 1.0, 1.0, 1.0);
            }
        }
    }
    
    // Configuration des uniformes pour les textures
    setTextureUniforms(programInfo, viewMatrix, lightingManager) {
        this.gl.uniform2f(programInfo.uniforms.u_resolution, viewMatrix.resolution.width, viewMatrix.resolution.height);
        this.gl.uniform1f(programInfo.uniforms.u_zoom, viewMatrix.zoom);
        this.gl.uniform2f(programInfo.uniforms.u_camera, viewMatrix.position.x, viewMatrix.position.y);
        
        // Apply lighting if available
        if (programInfo.uniforms.u_ambientLight) {
            if (lightingManager && lightingManager.isEnabled()) {
                const ambientColor = lightingManager.getAmbientColor();
                this.gl.uniform3f(programInfo.uniforms.u_ambientLight, ambientColor[0], ambientColor[1], ambientColor[2]);
            } else {
                // Default: full brightness (no lighting)
                this.gl.uniform3f(programInfo.uniforms.u_ambientLight, 1.0, 1.0, 1.0);
            }
        }
    }
    
    // Méthode utilitaire pour dessiner une géométrie
    drawGeometry(geometry, attributeLocation) {
        this.geometryManager.bindGeometry(geometry, attributeLocation);
        this.gl.drawArrays(this.gl.TRIANGLES, 0, geometry.vertexCount);
        this.renderCallsThisFrame++;
    }
    
    // Méthode utilitaire pour dessiner une géométrie avec texture
    drawTexturedGeometry(geometry, positionLocation, texCoordLocation) {
        this.geometryManager.bindGeometryWithTexCoords(geometry, positionLocation, texCoordLocation);
        this.gl.drawArrays(this.gl.TRIANGLES, 0, geometry.vertexCount);
        this.renderCallsThisFrame++;
    }
    
    // Rendu en batch pour optimiser les performances
    renderBatch(entities, viewMatrix, lightingManager) {
        if (entities.length === 0) return;
        
        // Grouper par type de rendu
        const batches = this.groupEntitiesByRenderType(entities);
        
        // Rendre chaque batch
        for (const [renderType, entitiesBatch] of batches) {
            this.renderEntityBatch(renderType, entitiesBatch, viewMatrix, lightingManager);
        }
    }
    
    groupEntitiesByRenderType(entities) {
        const batches = new Map();
        
        entities.forEach(entity => {
            const renderType = entity.getRenderType ? entity.getRenderType() : 'character';
            if (!batches.has(renderType)) {
                batches.set(renderType, []);
            }
            batches.get(renderType).push(entity);
        });
        
        return batches;
    }
    
    renderEntityBatch(renderType, entities, viewMatrix, lightingManager) {
        switch (renderType) {
            case 'character':
                entities.forEach(entity => this.renderCharacter(entity, viewMatrix, lightingManager));
                break;
            case 'plant':
                entities.forEach(entity => this.renderPlant(entity, viewMatrix, lightingManager));
                break;
            case 'rect':
                entities.forEach(entity => {
                    const data = entity.getRenderData();
                    this.renderRect(data.x, data.y, data.width, data.height, data.color, viewMatrix, lightingManager);
                });
                break;
            case 'click-marker':
                entities.forEach(entity => {
                    const data = entity.getRenderData();
                    this.renderRect(data.x, data.y, data.width, data.height, data.color, viewMatrix, lightingManager);
                });
                break;
            case 'circle':
                entities.forEach(entity => {
                    const data = entity.getRenderData();
                    this.renderCircle(data.x, data.y, data.radius, data.color, viewMatrix, lightingManager, data.segments);
                });
                break;
            case 'soil':
                // Le rendu du sol est géré directement par le SoilManager
                // pour optimiser les performances avec le culling
                break;
            default:
                console.warn(`Type de rendu non supporté: ${renderType}`);
        }
    }
    
    // Getters pour les métriques de debug
    getRenderCalls() {
        return this.renderCallsThisFrame;
    }
    
    getEntitiesRendered() {
        return this.entitiesRendered;
    }
    
    // Configuration du rendu
    setBackgroundColor(r, g, b, a = 1.0) {
        this.gl.clearColor(r, g, b, a);
    }
    
    // Gestion du viewport
    setViewport(width, height) {
        this.gl.viewport(0, 0, width, height);
    }
    
    /**
     * Render rain particles
     * @param {Object} weatherManager - Weather manager with particle data
     * @param {Object} cameraManager - Camera manager for view matrix
     * @param {Object} lightingManager - Lighting manager for ambient light
     */
    renderParticles(weatherManager, cameraManager, lightingManager) {
        if (!weatherManager || !weatherManager.isEnabled()) {
            return;
        }
        
        // Render rain particles first (blue-ish, small)
        this.renderParticleType(weatherManager, cameraManager, lightingManager, 'rain');
        
        // Then render splash particles (white, brighter)
        this.renderParticleType(weatherManager, cameraManager, lightingManager, 'splash');
    }
    
    /**
     * Render particles of a specific type
     * @param {Object} weatherManager - Weather manager with particle data
     * @param {Object} cameraManager - Camera manager for view matrix
     * @param {Object} lightingManager - Lighting manager for ambient light
     * @param {string} type - Particle type ('rain' or 'splash')
     */
    renderParticleType(weatherManager, cameraManager, lightingManager, type) {
        const particles = weatherManager.getActiveParticles(type);
        if (particles.length === 0) {
            return;
        }
        
        // Get particle shader
        const shader = this.shaderManager.getProgram('particleShader');
        if (!shader) {
            console.error('Particle shader not found');
            return;
        }
        
        this.gl.useProgram(shader.program);
        this.currentProgram = shader;
        
        // Build particle data (interleaved: x, y, size, alpha)
        const vertexData = new Float32Array(particles.length * 4);
        for (let i = 0; i < particles.length; i++) {
            const p = particles[i];
            const offset = i * 4;
            vertexData[offset + 0] = p.x;
            vertexData[offset + 1] = p.y;
            vertexData[offset + 2] = p.size;
            vertexData[offset + 3] = p.alpha;
        }
        
        // Create or update buffer
        if (!this.particleBuffer) {
            this.particleBuffer = this.gl.createBuffer();
        }
        
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.particleBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, vertexData, this.gl.DYNAMIC_DRAW);
        
        // Set attributes (interleaved data)
        const positionLoc = shader.attributes['a_position'];
        const sizeLoc = shader.attributes['a_size'];
        const alphaLoc = shader.attributes['a_alpha'];
        
        const stride = 4 * 4; // 4 floats * 4 bytes per float
        
        this.gl.enableVertexAttribArray(positionLoc);
        this.gl.vertexAttribPointer(positionLoc, 2, this.gl.FLOAT, false, stride, 0);
        
        this.gl.enableVertexAttribArray(sizeLoc);
        this.gl.vertexAttribPointer(sizeLoc, 1, this.gl.FLOAT, false, stride, 8);
        
        this.gl.enableVertexAttribArray(alphaLoc);
        this.gl.vertexAttribPointer(alphaLoc, 1, this.gl.FLOAT, false, stride, 12);
        
        // Set uniforms
        const viewMatrix = cameraManager.getViewMatrix();
        this.gl.uniform2f(shader.uniforms['u_resolution'], viewMatrix.resolution.width, viewMatrix.resolution.height);
        this.gl.uniform1f(shader.uniforms['u_zoom'], viewMatrix.zoom);
        this.gl.uniform2f(shader.uniforms['u_camera'], viewMatrix.position.x, viewMatrix.position.y);
        
        // Get particle color from weather manager config (type-specific)
        const particleColor = weatherManager.getParticleColor(type);
        this.gl.uniform4f(shader.uniforms['u_color'], 
            particleColor[0] / 255, 
            particleColor[1] / 255, 
            particleColor[2] / 255, 
            particleColor[3] / 255
        );
        
        // Apply lighting uniform
        if (shader.uniforms['u_ambientLight']) {
            if (lightingManager && lightingManager.isEnabled()) {
                const ambientColor = lightingManager.getAmbientColor();
                this.gl.uniform3f(shader.uniforms['u_ambientLight'], ambientColor[0], ambientColor[1], ambientColor[2]);
            } else {
                // Default: full brightness (no lighting)
                this.gl.uniform3f(shader.uniforms['u_ambientLight'], 1.0, 1.0, 1.0);
            }
        }
        
        // Enable blending for transparency
        this.gl.enable(this.gl.BLEND);
        this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);
        
        // Draw particles as points
        this.gl.drawArrays(this.gl.POINTS, 0, particles.length);
        
        // Disable blending
        this.gl.disable(this.gl.BLEND);
        
        this.renderCallsThisFrame++;
        this.entitiesRendered += particles.length;
    }
}