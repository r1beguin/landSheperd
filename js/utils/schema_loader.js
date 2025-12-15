/**
 * SchemaLoader - Utility for fetching and caching JSON schema files
 * 
 * Provides centralized schema loading with caching to avoid redundant fetches.
 * Used by ConfigValidator to validate configuration and species files.
 * 
 * Usage:
 *   const loader = new SchemaLoader();
 *   const schema = await loader.loadSchema('schemas/config.schema.json');
 */

class SchemaLoader {
    constructor() {
        this.schemas = new Map(); // Cache for loaded schemas
    }
    
    /**
     * Load a schema from a path (with caching)
     * @param {string} path - Path to schema file
     * @returns {Promise<Object>} Parsed schema object
     * @throws {Error} If schema fails to load
     */
    async loadSchema(path) {
        // Check cache first
        if (this.schemas.has(path)) {
            return this.schemas.get(path);
        }
        
        try {
            // Add cache-busting parameter to ensure fresh schema loads
            const cacheBustPath = `${path}?v=${Date.now()}`;
            const response = await fetch(cacheBustPath);
            if (!response.ok) {
                throw new Error(`Failed to load schema: ${path} (status ${response.status})`);
            }
            
            const schema = await response.json();
            
            // Cache the loaded schema
            this.schemas.set(path, schema);
            
            return schema;
        } catch (error) {
            // Suppress network errors during page navigation (expected during reload)
            if (error.name === 'TypeError' && error.message.includes('fetch')) {
                // Silently fail - page is navigating away
                return null;
            }
            console.error(`SchemaLoader: Error loading schema from ${path}:`, error);
            throw error;
        }
    }
    
    /**
     * Clear cached schemas (useful for testing)
     */
    clearCache() {
        this.schemas.clear();
    }
}

// Make SchemaLoader available globally
if (typeof window !== 'undefined') {
    window.SchemaLoader = SchemaLoader;
}
