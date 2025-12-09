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
    constructor(gl, shaderManager, geometryManager, config = null) {
        this.gl = gl;
        this.shaderManager = shaderManager;
        this.geometryManager = geometryManager;
        this.config = config;
        
        // Compteurs pour le debug
        this.renderCallsThisFrame = 0;
        this.entitiesRendered = 0;
        
        // Cache des programmes actifs
        this.currentProgram = null;
        
        // Cell highlight state
        this.highlightedCell = { x: null, y: null };
        
        // Character position for transparency calculation
        this.characterPosition = { x: 0, y: 0 };
    }
    
    /**
     * Set config reference (called after config is loaded)
     * @param {Object} config - Game configuration object
     */
    setConfig(config) {
        this.config = config;
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
    
    // Rendu d'un rectangle d'eau avec shader animé
    renderWaterRect(x, y, width, height, baseColor, viewMatrix, lightingManager, time) {
        const programInfo = this.shaderManager.useProgram('water');
        if (!programInfo) {
            // Fallback to basic rendering if water shader unavailable
            console.warn('Water shader not available, falling back to basic rendering');
            return this.renderRect(x, y, width, height, baseColor, viewMatrix, lightingManager);
        }
        
        this.currentProgram = programInfo;
        
        // Obtenir ou créer la géométrie avec coordonnées de texture
        const geometryKey = `quad_tex_${width}_${height}_false`;
        let geometry = this.geometryManager.getGeometry(geometryKey);
        if (!geometry) {
            geometry = this.geometryManager.createQuadWithTexCoords(width, height, false);
        }
        
        // Configurer les uniformes de base
        this.gl.uniform2f(programInfo.uniforms.u_resolution, viewMatrix.resolution.width, viewMatrix.resolution.height);
        this.gl.uniform1f(programInfo.uniforms.u_zoom, viewMatrix.zoom);
        this.gl.uniform2f(programInfo.uniforms.u_camera, viewMatrix.position.x, viewMatrix.position.y);
        this.gl.uniform2f(programInfo.uniforms.u_translation, x, y);
        this.gl.uniform2f(programInfo.uniforms.u_scale, 1.0, 1.0);
        
        // Configurer les uniformes spécifiques à l'eau
        this.gl.uniform4f(programInfo.uniforms.u_baseColor, baseColor[0], baseColor[1], baseColor[2], baseColor[3]);
        this.gl.uniform1f(programInfo.uniforms.u_time, time);
        this.gl.uniform2f(programInfo.uniforms.u_worldPos, x, y);
        
        // Appliquer l'éclairage
        if (programInfo.uniforms.u_ambientLight) {
            if (lightingManager && lightingManager.isEnabled()) {
                const ambientColor = lightingManager.getAmbientColor();
                this.gl.uniform3f(programInfo.uniforms.u_ambientLight, ambientColor[0], ambientColor[1], ambientColor[2]);
            } else {
                // Default: full brightness (no lighting)
                this.gl.uniform3f(programInfo.uniforms.u_ambientLight, 1.0, 1.0, 1.0);
            }
        }
        
        // Configurer et dessiner la géométrie
        this.drawTexturedGeometry(geometry, programInfo.attributes.a_position, programInfo.attributes.a_texCoord);
        
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
    
    /**
     * Render isometric diamond-shaped tile
     * @param {number} x - World X coordinate
     * @param {number} y - World Y coordinate
     * @param {number} tileWidth - Tile width in pixels
     * @param {number} tileHeight - Tile height in pixels
     * @param {Array} color - RGBA color array
     * @param {Object} viewMatrix - Camera view matrix
     * @param {Object} lightingManager - Lighting manager reference
     */
    renderIsoDiamond(x, y, tileWidth, tileHeight, color, viewMatrix, lightingManager) {
        const programInfo = this.shaderManager.useProgram('basic');
        if (!programInfo) return;
        
        this.currentProgram = programInfo;
        
        // Get diamond geometry
        const geometry = this.geometryManager.createIsoDiamond(tileWidth, tileHeight);
        
        // Set uniforms
        this.setBasicUniforms(programInfo, viewMatrix, lightingManager);
        this.gl.uniform2f(programInfo.uniforms.u_translation, x, y);
        this.gl.uniform2f(programInfo.uniforms.u_scale, 1.0, 1.0);
        this.gl.uniform4f(programInfo.uniforms.u_color, ...color);
        
        // Draw geometry
        this.drawGeometry(geometry, programInfo.attributes.a_position);
        
        this.entitiesRendered++;
    }

    /**
     * Render isometric water diamond with animated shader
     * @param {number} x - World X coordinate
     * @param {number} y - World Y coordinate
     * @param {number} tileWidth - Tile width in pixels
     * @param {number} tileHeight - Tile height in pixels
     * @param {Array} baseColor - RGBA color array
     * @param {Object} viewMatrix - Camera view matrix
     * @param {Object} lightingManager - Lighting manager reference
     * @param {number} time - Current time in seconds
     */
    renderWaterDiamond(x, y, tileWidth, tileHeight, baseColor, viewMatrix, lightingManager, time) {
        const programInfo = this.shaderManager.useProgram('water');
        if (!programInfo) {
            // Fallback to basic rendering if water shader unavailable
            return this.renderIsoDiamond(x, y, tileWidth, tileHeight, baseColor, viewMatrix, lightingManager);
        }
        
        this.currentProgram = programInfo;
        
        // Get diamond geometry with texture coordinates
        const geometry = this.geometryManager.createIsoDiamondWithTexCoords(tileWidth, tileHeight);
        
        // Set uniforms
        this.gl.uniform2f(programInfo.uniforms.u_resolution, viewMatrix.resolution.width, viewMatrix.resolution.height);
        this.gl.uniform1f(programInfo.uniforms.u_zoom, viewMatrix.zoom);
        this.gl.uniform2f(programInfo.uniforms.u_camera, viewMatrix.position.x, viewMatrix.position.y);
        this.gl.uniform2f(programInfo.uniforms.u_translation, x, y);
        this.gl.uniform2f(programInfo.uniforms.u_scale, 1.0, 1.0);
        
        // Water shader uniforms
        this.gl.uniform4f(programInfo.uniforms.u_baseColor, baseColor[0], baseColor[1], baseColor[2], baseColor[3]);
        this.gl.uniform1f(programInfo.uniforms.u_time, time);
        this.gl.uniform2f(programInfo.uniforms.u_worldPos, x, y);
        
        // Apply lighting
        if (programInfo.uniforms.u_ambientLight) {
            if (lightingManager && lightingManager.isEnabled()) {
                const ambientColor = lightingManager.getAmbientColor();
                this.gl.uniform3f(programInfo.uniforms.u_ambientLight, ambientColor[0], ambientColor[1], ambientColor[2]);
            } else {
                this.gl.uniform3f(programInfo.uniforms.u_ambientLight, 1.0, 1.0, 1.0);
            }
        }
        
        // Draw geometry
        this.drawTexturedGeometry(geometry, programInfo.attributes.a_position, programInfo.attributes.a_texCoord);
        
        this.entitiesRendered++;
    }
    
    // Rendu d'un rectangle avec texture
    renderTexturedRect(x, y, width, height, texture, viewMatrix, lightingManager, tint = [1, 1, 1, 1], layer = 'middle') {
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
        
        // Set transparency uniforms (only for top layer)
        this.setTransparencyUniforms(programInfo, layer);
        
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
            // Get plant layer for transparency calculation
            const layer = plant.getLayer ? plant.getLayer() : 'middle';
            
            this.renderTexturedRect(
                renderData.x, 
                renderData.y, 
                renderData.width, 
                renderData.height, 
                webglTexture, 
                viewMatrix,
                lightingManager,
                renderData.tint || [1, 1, 1, 1],
                layer
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
    
    /**
     * Set transparency uniforms for character see-through effect
     * Only applies to top layer plants
     * @param {Object} programInfo - Shader program info
     * @param {string} layer - Entity layer (bottom, middle, or top)
     */
    setTransparencyUniforms(programInfo, layer) {
        // Check if uniforms exist (shader may not have them)
        if (!programInfo.uniforms.u_transparencyEnabled) return;
        
        // Get character position from stored reference
        const characterPos = this.characterPosition || { x: 0, y: 0 };
        
        // Get transparency config
        const config = this.config?.world?.character?.transparencyCircle;
        const enabled = config?.enabled && layer === 'top';
        
        if (enabled) {
            const radius = config.radius || 60;
            const falloff = config.falloffCurve || 2.0;
            
            this.gl.uniform2f(programInfo.uniforms.u_characterPos, characterPos.x, characterPos.y);
            this.gl.uniform1f(programInfo.uniforms.u_transparencyRadius, radius);
            this.gl.uniform1f(programInfo.uniforms.u_transparencyFalloff, falloff);
            this.gl.uniform1f(programInfo.uniforms.u_transparencyEnabled, 1.0);
        } else {
            this.gl.uniform1f(programInfo.uniforms.u_transparencyEnabled, 0.0);
        }
    }
    
    /**
     * Update character position for transparency calculation
     * Called from render loop to keep character position in sync
     * @param {Object} position - Character position {x, y}
     */
    setCharacterPosition(position) {
        this.characterPosition = position;
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
    
    /**
     * Render cell highlight at specified grid coordinates
     * Renders a soft green border around a cell
     * @param {Object} viewMatrix - Camera view matrix
     * @param {Object} lightingManager - Lighting manager reference
     * @param {number} cellSize - Size of one cell (from config)
     */
    renderCellHighlight(viewMatrix, lightingManager, cellSize) {
        // Only render if highlight is active
        if (this.highlightedCell.x === null || this.highlightedCell.y === null) {
            return;
        }
        
        // Check projection mode - use this.config if available, otherwise skip
        if (!this.config || !this.config.world || !this.config.world.rendering) {
            console.warn('RenderSystem: config not available for renderCellHighlight');
            return;
        }
        
        const isIsometric = this.config.world.rendering.projection === 'isometric';
        
        if (isIsometric) {
            // ISOMETRIC: Render diamond-shaped highlight
            this.renderIsometricCellHighlight(viewMatrix, lightingManager);
        } else {
            // ORTHOGRAPHIC: Render square highlight
            this.renderOrthographicCellHighlight(viewMatrix, lightingManager, cellSize);
        }
    }
    
    /**
     * Render orthographic cell highlight (square border)
     * @param {Object} viewMatrix - Camera view matrix
     * @param {Object} lightingManager - Lighting manager reference
     * @param {number} cellSize - Size of one cell
     */
    renderOrthographicCellHighlight(viewMatrix, lightingManager, cellSize) {
        // Convert grid coordinates to world space
        const worldX = this.highlightedCell.x * cellSize;
        const worldY = this.highlightedCell.y * cellSize;
        
        // Soft green color with transparency
        const highlightColor = [0.0, 1.0, 0.0, 0.3];
        
        // Enable blending for transparency
        this.gl.enable(this.gl.BLEND);
        this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);
        
        // Get shader program
        const programInfo = this.shaderManager.useProgram('basic');
        if (!programInfo) {
            this.gl.disable(this.gl.BLEND);
            return;
        }
        
        this.currentProgram = programInfo;
        
        // Set uniforms
        this.setBasicUniforms(programInfo, viewMatrix, lightingManager);
        this.gl.uniform4f(programInfo.uniforms.u_color, ...highlightColor);
        
        // Border thickness in pixels
        const borderThickness = 2;
        
        // Render 4 rectangles forming a border
        // Top border
        this.gl.uniform2f(programInfo.uniforms.u_translation, worldX, worldY + cellSize - borderThickness);
        this.gl.uniform2f(programInfo.uniforms.u_scale, 1.0, 1.0);
        const topBorder = this.geometryManager.getGeometry(`quad_${cellSize}_${borderThickness}_false`) || 
                          this.geometryManager.createQuad(cellSize, borderThickness, false);
        this.drawGeometry(topBorder, programInfo.attributes.a_position);
        
        // Bottom border
        this.gl.uniform2f(programInfo.uniforms.u_translation, worldX, worldY);
        const bottomBorder = this.geometryManager.getGeometry(`quad_${cellSize}_${borderThickness}_false`) || 
                             this.geometryManager.createQuad(cellSize, borderThickness, false);
        this.drawGeometry(bottomBorder, programInfo.attributes.a_position);
        
        // Left border
        this.gl.uniform2f(programInfo.uniforms.u_translation, worldX, worldY);
        const leftBorder = this.geometryManager.getGeometry(`quad_${borderThickness}_${cellSize}_false`) || 
                           this.geometryManager.createQuad(borderThickness, cellSize, false);
        this.drawGeometry(leftBorder, programInfo.attributes.a_position);
        
        // Right border
        this.gl.uniform2f(programInfo.uniforms.u_translation, worldX + cellSize - borderThickness, worldY);
        const rightBorder = this.geometryManager.getGeometry(`quad_${borderThickness}_${cellSize}_false`) || 
                            this.geometryManager.createQuad(borderThickness, cellSize, false);
        this.drawGeometry(rightBorder, programInfo.attributes.a_position);
        
        // Disable blending after rendering
        this.gl.disable(this.gl.BLEND);
    }
    
    /**
     * Render isometric cell highlight (diamond border)
     * @param {Object} viewMatrix - Camera view matrix
     * @param {Object} lightingManager - Lighting manager reference
     */
    renderIsometricCellHighlight(viewMatrix, lightingManager) {
        if (!this.config || !this.config.world || !this.config.world.rendering || !this.config.world.rendering.isometric) {
            console.warn('RenderSystem: isometric config not available');
            return;
        }
        
        const isoConfig = this.config.world.rendering.isometric;
        const tileWidth = isoConfig.tileWidth;
        const tileHeight = isoConfig.tileHeight;
        
        // Convert grid coords to isometric world coords
        const isoPos = IsometricUtils.gridToIso(
            this.highlightedCell.x, 
            this.highlightedCell.y, 
            tileWidth, 
            tileHeight
        );
        
        // White color with transparency (more visible than green on varied backgrounds)
        const highlightColor = [1.0, 1.0, 1.0, 0.3];
        
        // Render diamond outline using renderIsoDiamond
        this.renderIsoDiamond(
            isoPos.x, 
            isoPos.y, 
            tileWidth, 
            tileHeight, 
            highlightColor, 
            viewMatrix, 
            lightingManager
        );
    }
    
    /**
     * Set the highlighted cell coordinates
     * @param {number} x - Grid X coordinate
     * @param {number} y - Grid Y coordinate
     */
    setHighlightedCell(x, y) {
        this.highlightedCell.x = x;
        this.highlightedCell.y = y;
    }
    
    /**
     * Clear the highlighted cell (disable highlight)
     */
    clearHighlightedCell() {
        this.highlightedCell.x = null;
        this.highlightedCell.y = null;
    }
    
    /**
     * Get the currently highlighted cell
     * @returns {Object|null} Object with {x, y} if cell is highlighted, null otherwise
     */
    getHighlightedCell() {
        if (this.highlightedCell.x !== null && this.highlightedCell.y !== null) {
            return { x: this.highlightedCell.x, y: this.highlightedCell.y };
        }
        return null;
    }
    
    /**
     * Render plants sorted by layer for proper Z-ordering
     * Renders in order: bottom → middle → top
     * In isometric mode, also sorts by Z-order within each layer
     * @param {Array} plants - Array of plant entities
     * @param {Object} viewMatrix - Camera view matrix
     * @param {Object} lightingManager - Lighting manager reference
     */
    renderPlantsByLayer(plants, viewMatrix, lightingManager) {
        if (!plants || plants.length === 0) return;
        
        // Use this.config instead of window.config
        if (!this.config || !this.config.world || !this.config.world.rendering) {
            console.warn('RenderSystem: config not available for renderPlantsByLayer');
            return;
        }
        
        const config = this.config.world.rendering;
        const isIsometric = config.projection === 'isometric';
        
        // Group plants by layer
        const layerGroups = {
            bottom: [],
            middle: [],
            top: []
        };
        
        plants.forEach(plant => {
            const layer = plant.getLayer ? plant.getLayer() : 'middle';
            if (layerGroups[layer]) {
                layerGroups[layer].push(plant);
            }
        });
        
        // Render each layer in order (bottom to top)
        const renderOrder = ['bottom', 'middle', 'top'];
        
        renderOrder.forEach(layerName => {
            const layerPlants = layerGroups[layerName];
            if (layerPlants.length === 0) return;
            
            // ISOMETRIC: Sort by Z-order within each layer (back-to-front)
            if (isIsometric && config.isometric && config.isometric.depthSortingEnabled) {
                layerPlants.sort((a, b) => {
                    const zA = IsometricUtils.getZOrder(a.gridX, a.gridY);
                    const zB = IsometricUtils.getZOrder(b.gridX, b.gridY);
                    return zA - zB;  // Render back plants first
                });
            }
            
            // Log layer rendering for debugging (can be disabled via config)
            if (this.config?.world?.plants?.layers?.renderLogging) {
                console.log(`Rendering ${layerPlants.length} plants in ${layerName} layer (isometric: ${isIsometric})`);
            }
            
            // Render all plants in this layer (back-to-front if isometric)
            layerPlants.forEach(plant => {
                this.renderPlant(plant, viewMatrix, lightingManager);
            });
        });
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