/**
 * ShaderManager - Gestionnaire centralisé des programmes de shaders WebGL
 * 
 * Ce module gère la compilation, la liaison et la mise en cache des shaders WebGL.
 * Il évite les recompilations inutiles en cachant les shaders et programmes déjà créés,
 * et automatise la récupération des emplacements des attributs et uniformes.
 * 
 * Fonctionnalités principales :
 * - Cache intelligent des shaders par hash du code source
 * - Création et gestion des programmes de shaders
 * - Auto-détection des attributs et uniformes actifs
 * - Nettoyage automatique des ressources WebGL
 */

class ShaderManager {
    constructor(gl) {
        this.gl = gl;
        this.programs = new Map();
        this.shaders = new Map();
    }

    createShader(type, source) {
        const shaderKey = `${type}_${this.hashCode(source)}`;
        
        if (this.shaders.has(shaderKey)) {
            return this.shaders.get(shaderKey);
        }

        const shader = this.gl.createShader(type);
        this.gl.shaderSource(shader, source);
        this.gl.compileShader(shader);

        if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
            console.error('Erreur de compilation du shader:', this.gl.getShaderInfoLog(shader));
            this.gl.deleteShader(shader);
            return null;
        }

        this.shaders.set(shaderKey, shader);
        return shader;
    }

    createProgram(vertexSource, fragmentSource, programName) {
        if (this.programs.has(programName)) {
            return this.programs.get(programName);
        }

        const vertexShader = this.createShader(this.gl.VERTEX_SHADER, vertexSource);
        const fragmentShader = this.createShader(this.gl.FRAGMENT_SHADER, fragmentSource);

        if (!vertexShader || !fragmentShader) {
            return null;
        }

        const program = this.gl.createProgram();
        this.gl.attachShader(program, vertexShader);
        this.gl.attachShader(program, fragmentShader);
        this.gl.linkProgram(program);

        if (!this.gl.getProgramParameter(program, this.gl.LINK_STATUS)) {
            console.error('Erreur de liaison du programme:', this.gl.getProgramInfoLog(program));
            this.gl.deleteProgram(program);
            return null;
        }

        // Cache les emplacements des attributs et uniformes
        const programInfo = {
            program: program,
            attributes: {},
            uniforms: {}
        };

        // Obtenir automatiquement tous les attributs
        const numAttributes = this.gl.getProgramParameter(program, this.gl.ACTIVE_ATTRIBUTES);
        for (let i = 0; i < numAttributes; i++) {
            const info = this.gl.getActiveAttrib(program, i);
            programInfo.attributes[info.name] = this.gl.getAttribLocation(program, info.name);
        }

        // Obtenir automatiquement tous les uniformes
        const numUniforms = this.gl.getProgramParameter(program, this.gl.ACTIVE_UNIFORMS);
        for (let i = 0; i < numUniforms; i++) {
            const info = this.gl.getActiveUniform(program, i);
            programInfo.uniforms[info.name] = this.gl.getUniformLocation(program, info.name);
        }

        this.programs.set(programName, programInfo);
        return programInfo;
    }

    getProgram(name) {
        return this.programs.get(name);
    }

    useProgram(name) {
        const programInfo = this.programs.get(name);
        if (programInfo) {
            this.gl.useProgram(programInfo.program);
            return programInfo;
        }
        return null;
    }

    hashCode(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        return hash;
    }

    cleanup() {
        for (const shader of this.shaders.values()) {
            this.gl.deleteShader(shader);
        }
        for (const programInfo of this.programs.values()) {
            this.gl.deleteProgram(programInfo.program);
        }
        this.shaders.clear();
        this.programs.clear();
    }
}