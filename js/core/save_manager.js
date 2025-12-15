/**
 * SaveManager - Manages game state persistence (save/load) using localStorage
 * 
 * Features:
 * - Save current game state to localStorage with slot system
 * - Load game state from localStorage  
 * - Delete saved games
 * - List all available saves with metadata
 * - Save version validation for compatibility
 * 
 * Save data structure:
 * {
 *     version: "1.0",
 *     timestamp: "ISO8601 string",
 *     metadata: { name, playTime, plantCount, currentDay },
 *     state: { seed, time, weather, camera, soil, plants }
 * }
 */

class SaveManager {
    constructor(graphicsEngine) {
        this.graphicsEngine = graphicsEngine;
        this.config = graphicsEngine.config.saveSystem || {};
        
        // Save system configuration
        this.saveVersion = this.config.saveVersion || "1.0";
        this.storageKeyPrefix = "landShepherd_save_";
        this.maxManualSaves = this.config.maxManualSaves || 3;
        this.maxAutoSaves = this.config.maxAutoSaves || 3;
        
        // Flag to prevent saving during New Game operation
        this.isStartingNewGame = false;
        
        // Auto-save system properties
        this.timeManager = null;
        this.lastAutoSaveDay = 0;
        this.daysSinceLastAutoSave = 0;
        this.autoSaveEnabled = true;  // Default enabled
        this.autoSaveIndicator = null;
    }
    
    /**
     * Setup auto-save system
     * Stores TimeManager reference, registers beforeunload, loads preference
     * @param {TimeManager} timeManager - TimeManager instance
     */
    setupAutoSave(timeManager) {
        this.timeManager = timeManager;
        this.autoSaveIndicator = document.getElementById('auto-save-indicator');
        
        // Load preference from localStorage
        const savedPref = localStorage.getItem('landShepherd_autoSaveEnabled');
        if (savedPref !== null) {
            this.autoSaveEnabled = savedPref === 'true';
        }
        
        // Register beforeunload handler
        window.addEventListener('beforeunload', () => {
            if (this.autoSaveEnabled) {
                this.saveOnClose();
            }
        });
        
        // Initialize day tracking
        if (this.timeManager) {
            this.lastAutoSaveDay = this.timeManager.getCurrentDay();
        }
        
        
        // Expose storage check to console for debugging
        if (typeof window !== 'undefined') {
            window.checkSaveStorage = () => {
                const u = this.getStorageUsage();
                console.log('=== Storage Usage ===');
                console.log(`Total used: ${(u.totalUsed / 1024).toFixed(2)} KB`);
                console.log(`Saves used: ${(u.savesUsed / 1024).toFixed(2)} KB`);
                console.log(`Estimated limit: ${(u.estimatedLimit / 1024).toFixed(0)} KB`);
                console.log(`Percent used: ${u.percentUsed}%`);
                
                // List all saves
                const saves = this.getSaveList();
                console.log(`\nSave slots (${saves.length}):`);
                saves.forEach(save => {
                    const key = this.storageKeyPrefix + save.slotId;
                    const data = localStorage.getItem(key);
                    const size = data ? (data.length / 1024).toFixed(2) : '0';
                    console.log(`  ${save.slotId}: ${size} KB (Day ${save.metadata.currentDay})`);
                });
            };
        }
    }
    
    /**
     * Update called each frame to check for auto-save triggers
     */
    update() {
        if (!this.timeManager || !this.autoSaveEnabled) return;
        
        const currentDay = Math.floor(this.timeManager.getCurrentDay());
        const lastDay = Math.floor(this.lastAutoSaveDay);
        
        // Check if we crossed into a new day
        if (currentDay > lastDay) {
            this.daysSinceLastAutoSave += (currentDay - lastDay);
            this.lastAutoSaveDay = this.timeManager.getCurrentDay();
            
            // Check if interval reached
            const interval = this.config.autoSaveIntervalDays || 7;
            if (this.daysSinceLastAutoSave >= interval) {
                this.autoSave();
                this.daysSinceLastAutoSave = 0;
            }
        }
    }
    
    /**
     * Perform interval auto-save to rotating slots
     */
    autoSave() {
        const slotId = this.getOldestAutoSaveSlot();
        
        try {
            this.showSaveIndicator();
            const success = this.save(slotId);
            // Hide indicator after delay
            setTimeout(() => this.hideSaveIndicator(), 1500);
            return success;
        } catch (error) {
            console.error('[SAVE] Auto-save failed:', error);
            return false;
        }
    }
    
     /**
      * Save to auto_close slot when browser closes
      * This is called synchronously in beforeunload
      */
     saveOnClose() {
         // Skip saving if we're in the middle of an auto-load reload
         if (localStorage.getItem('landShepherd_pendingLoad')) {
             return false;
         }
         
         // Skip saving if we're starting a new game
         if (this.isStartingNewGame) {
             return false;
         }
         
         return this.save('auto_close');
     }
    
    /**
     * Find the oldest auto-save slot to overwrite
     * Returns first empty slot or oldest by timestamp
     * @returns {string} Slot ID to use (auto_1, auto_2, or auto_3)
     */
    getOldestAutoSaveSlot() {
        const slots = ['auto_1', 'auto_2', 'auto_3'];
        let oldestSlot = slots[0];
        let oldestTime = Infinity;
        
        for (const slotId of slots) {
            const key = this.storageKeyPrefix + slotId;
            const data = localStorage.getItem(key);
            
            if (!data) {
                return slotId;  // Empty slot, use it first
            }
            
            try {
                const save = JSON.parse(data);
                const saveTime = new Date(save.timestamp).getTime();
                if (saveTime < oldestTime) {
                    oldestTime = saveTime;
                    oldestSlot = slotId;
                }
            } catch (e) {
                return slotId;  // Corrupted, overwrite it
            }
        }
        
        return oldestSlot;
    }
    
    /**
     * Get the most recent auto-save slot (auto_1, auto_2, auto_3)
     * @returns {string|null} Slot ID of most recent auto-save, or null if none exist
     */
    getMostRecentAutoSaveSlot() {
        const slots = ['auto_1', 'auto_2', 'auto_3'];
        let newestSlot = null;
        let newestTime = 0;
        
        for (const slotId of slots) {
            const key = this.storageKeyPrefix + slotId;
            const data = localStorage.getItem(key);
            
            if (!data) continue;
            
            try {
                const save = JSON.parse(data);
                const saveTime = new Date(save.timestamp).getTime();
                if (saveTime > newestTime) {
                    newestTime = saveTime;
                    newestSlot = slotId;
                }
            } catch (e) {
                // Skip corrupted saves
            }
        }
        
        return newestSlot;
    }
    
    /**
     * Check for auto-save on startup and initiate load if found
     * Priority: Most recent auto-save slot (auto_1/2/3) > auto_close
     * @returns {boolean} True if auto-load was initiated
     */
    checkAutoCloseLoad() {
        // Don't auto-load if there's a pending manual load
        if (localStorage.getItem('landShepherd_pendingLoad')) {
            return false;
        }
        
        // Check if auto-save is disabled - don't auto-load if so
        const autoSavePref = localStorage.getItem('landShepherd_autoSaveEnabled');
        if (autoSavePref === 'false') {
            return false;
        }
        
        // Priority 1: Check for most recent auto-save slot
        const mostRecentSlot = this.getMostRecentAutoSaveSlot();
        if (mostRecentSlot) {
            try {
                const key = this.storageKeyPrefix + mostRecentSlot;
                const saveData = JSON.parse(localStorage.getItem(key));
                
                // Validate version
                if (!this._validateVersion(saveData.version)) {
                    console.warn(`[SAVE] Auto-save ${mostRecentSlot} has incompatible version, checking auto_close`);
                } else {
                    // Set up for load
                    if (saveData.state.seed !== undefined) {
                        localStorage.setItem('landShepherd_seed', saveData.state.seed.toString());
                    }
                    
                    localStorage.setItem('landShepherd_pendingLoad', mostRecentSlot);
                    window.location.reload();
                    return true;
                }
            } catch (error) {
                console.error(`[SAVE] Failed to parse auto-save ${mostRecentSlot}:`, error);
            }
        }
        
        // Priority 2: Fall back to auto_close save
        const autoCloseKey = this.storageKeyPrefix + 'auto_close';
        const autoCloseSave = localStorage.getItem(autoCloseKey);
        
        if (!autoCloseSave) {
            return false;
        }
        
        try {
            const saveData = JSON.parse(autoCloseSave);
            
            // Validate version
            if (!this._validateVersion(saveData.version)) {
                console.warn('[SAVE] Auto-close save has incompatible version, skipping');
                return false;
            }
            
            // Set up for load (same mechanism as manual load)
            if (saveData.state.seed !== undefined) {
                localStorage.setItem('landShepherd_seed', saveData.state.seed.toString());
            }
            
            // Use auto_close slot for load
            localStorage.setItem('landShepherd_pendingLoad', 'auto_close');
            
            window.location.reload();
            return true;
            
        } catch (error) {
            console.error('[SAVE] Failed to parse auto-close save:', error);
            return false;
        }
    }
    
    /**
     * Set auto-save enabled preference and persist to localStorage
     * @param {boolean} enabled - Whether auto-save is enabled
     */
    setAutoSaveEnabled(enabled) {
        this.autoSaveEnabled = enabled;
        localStorage.setItem('landShepherd_autoSaveEnabled', enabled.toString());
    }
    
    /**
     * Get current auto-save enabled state
     * @returns {boolean}
     */
    isAutoSaveEnabled() {
        return this.autoSaveEnabled;
    }
    
    /**
     * Show the save indicator
     */
    showSaveIndicator() {
        if (this.autoSaveIndicator) {
            this.autoSaveIndicator.classList.add('visible');
        }
    }
    
    /**
     * Hide the save indicator
     */
    hideSaveIndicator() {
        if (this.autoSaveIndicator) {
            this.autoSaveIndicator.classList.remove('visible');
        }
    }
    
    /**
     * Save current game state to a slot
     * @param {string} slotId - Save slot identifier (e.g., 'manual_1', 'auto_1')
     * @returns {boolean} True if save successful
     */
    save(slotId) {
        try {
            // Gather state from all managers
            const state = this._gatherState();
            
            // Generate save metadata
            const metadata = this._generateMetadata(slotId);
            
            // Create save data structure
            const saveData = {
                version: this.saveVersion,
                timestamp: new Date().toISOString(),
                metadata: metadata,
                state: state
            };
            
            // Serialize and store in localStorage
            const storageKey = this.storageKeyPrefix + slotId;
            const serialized = JSON.stringify(saveData);
            
            try {
                // Remove old value from this slot first to avoid quota issues during overwrite
                localStorage.removeItem(storageKey);
                localStorage.setItem(storageKey, serialized);
            } catch (quotaError) {
                // Handle quota exceeded - try to make space
                if (quotaError.name === 'QuotaExceededError' || 
                    quotaError.code === 22 || 
                    quotaError.code === 1014) {
                    console.warn('[SAVE] Storage quota exceeded, attempting cleanup...');
                    
                    if (this._freeStorageSpace(slotId)) {
                        // Retry save after cleanup
                        localStorage.setItem(storageKey, serialized);
                    } else {
                        throw new Error('Unable to free enough storage space');
                    }
                } else {
                    throw quotaError;
                }
            }
            
            return true;
            
        } catch (error) {
            console.error('[SAVE] Failed to save game:', error);
            return false;
        }
    }
    
    /**
     * Attempt to free storage space by removing old auto-saves
     * @param {string} protectedSlotId - Slot ID to protect from deletion
     * @returns {boolean} True if space was freed
     * @private
     */
     _freeStorageSpace(protectedSlotId) {
        
        // Get all our save slots
        const allSlots = ['auto_1', 'auto_2', 'auto_3', 'auto_close', 'manual_1', 'manual_2', 'manual_3'];
        const saves = [];
        
        for (const slotId of allSlots) {
            if (slotId === protectedSlotId) continue;
            
            const key = this.storageKeyPrefix + slotId;
            const data = localStorage.getItem(key);
            if (data) {
                try {
                    const parsed = JSON.parse(data);
                    saves.push({
                        slotId,
                        key,
                        size: data.length,
                        timestamp: new Date(parsed.timestamp).getTime(),
                        isAuto: slotId.startsWith('auto_')
                    });
                } catch (e) {
                    // Corrupted save, safe to delete
                    localStorage.removeItem(key);
                    return true;
                }
            }
        }
        
        // Sort by priority: prefer deleting auto-saves, then oldest first
        saves.sort((a, b) => {
            // Auto-saves before manual saves
            if (a.isAuto !== b.isAuto) return a.isAuto ? -1 : 1;
            // Oldest first
            return a.timestamp - b.timestamp;
        });
        
        // Delete oldest save to make room
        if (saves.length > 0) {
            const toDelete = saves[0];
            localStorage.removeItem(toDelete.key);
            return true;
        }
        
        return false;
    }
    
    /**
     * Get localStorage usage statistics
     * @returns {Object} Usage info with used, total (estimated), and percentage
     */
    getStorageUsage() {
        let totalSize = 0;
        let saveSize = 0;
        
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            const value = localStorage.getItem(key);
            const size = (key.length + value.length) * 2; // UTF-16 chars = 2 bytes
            totalSize += size;
            
            if (key.startsWith(this.storageKeyPrefix)) {
                saveSize += size;
            }
        }
        
        // localStorage limit is typically 5MB
        const estimatedLimit = 5 * 1024 * 1024;
        
        return {
            totalUsed: totalSize,
            savesUsed: saveSize,
            estimatedLimit: estimatedLimit,
            percentUsed: ((totalSize / estimatedLimit) * 100).toFixed(1)
        };
    }
    
    /**
     * Load game state from a slot
     * This triggers a page reload with the saved seed, then restores state after reload
     * @param {string} slotId - Save slot identifier
     * @returns {boolean} True if load initiated successfully
     */
    load(slotId) {
        try {
            
            const storageKey = this.storageKeyPrefix + slotId;
            const serialized = localStorage.getItem(storageKey);
            
            if (!serialized) {
                console.warn(`[LOAD] No save found in slot: ${slotId}`);
                return false;
            }
            
            const saveData = JSON.parse(serialized);
            
            // Validate save version
            if (!this._validateVersion(saveData.version)) {
                console.error(`[LOAD] Incompatible save version: ${saveData.version} (expected ${this.saveVersion})`);
                return false;
            }
            
            // Store the seed to ensure terrain regenerates correctly
            if (saveData.state.seed !== undefined) {
                localStorage.setItem('landShepherd_seed', saveData.state.seed.toString());
            }
            
            // Store pending load info - will be processed after page reload
            localStorage.setItem('landShepherd_pendingLoad', slotId);
            
            // Reload page to regenerate terrain with correct seed
            window.location.reload();
            
            return true;
            
        } catch (error) {
            console.error('[LOAD] Failed to load game:', error);
            return false;
        }
    }
    
    /**
     * Check for and process any pending load after page initialization
     * Should be called after all managers are initialized
     * Returns a promise that resolves when load is complete
     */
    async processPendingLoad() {
        const pendingSlotId = localStorage.getItem('landShepherd_pendingLoad');
        
        if (!pendingSlotId) {
            return false;
        }
        
        try {
            // Wait for species configs to load before deserializing plants
            if (this.graphicsEngine.plantManager) {
                await this.graphicsEngine.plantManager.speciesLoaded;
            }
            
            const storageKey = this.storageKeyPrefix + pendingSlotId;
            const serialized = localStorage.getItem(storageKey);
            
            if (!serialized) {
                console.warn(`[LOAD] Pending load slot not found: ${pendingSlotId}`);
                return false;
            }
            
            const saveData = JSON.parse(serialized);
            
            // Now restore the non-terrain state (terrain was regenerated from seed on page load)
            this._restoreState(saveData.state);
            
            return true;
            
        } catch (error) {
            console.error('[LOAD] Failed to process pending load:', error);
            return false;
        }
    }
    
    /**
     * Delete a save slot
     * @param {string} slotId - Save slot identifier
     * @returns {boolean} True if deletion successful
     */
    deleteSave(slotId) {
        try {
            const key = this.storageKeyPrefix + slotId;
            localStorage.removeItem(key);
            return true;
        } catch (error) {
            console.error('[SAVE] Failed to delete save:', error);
            return false;
        }
    }
    
    /**
     * Get list of all saves with metadata
     * @returns {Array} Array of save metadata objects
     */
    getSaveList() {
        const saves = [];
        
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            
            if (key && key.startsWith(this.storageKeyPrefix)) {
                try {
                    const serialized = localStorage.getItem(key);
                    const saveData = JSON.parse(serialized);
                    const slotId = key.replace(this.storageKeyPrefix, '');
                    
                    saves.push({
                        slotId: slotId,
                        version: saveData.version,
                        timestamp: saveData.timestamp,
                        metadata: saveData.metadata
                    });
                } catch (error) {
                    console.warn(`[SAVE] Failed to parse save ${key}:`, error);
                }
            }
        }
        
        // Sort by timestamp (newest first)
        saves.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        
        return saves;
    }
    
    /**
     * Check if a save exists in a slot
     * @param {string} slotId - Save slot identifier
     * @returns {boolean} True if save exists
     */
    hasSave(slotId) {
        const storageKey = this.storageKeyPrefix + slotId;
        return localStorage.getItem(storageKey) !== null;
    }
    
    /**
     * Gather state from all managers
     * @returns {Object} Complete game state
     * @private
     */
    _gatherState() {
        const state = {};
        
        // Get seed from SoilManager
        if (this.graphicsEngine.soilManager) {
            state.seed = this.graphicsEngine.soilManager.getSeed();
        }
        
        // Get TimeManager state
        if (this.graphicsEngine.timeManager && this.graphicsEngine.timeManager.serialize) {
            state.time = this.graphicsEngine.timeManager.serialize();
        }
        
        // Get WeatherManager state
        if (this.graphicsEngine.weatherManager && this.graphicsEngine.weatherManager.serialize) {
            state.weather = this.graphicsEngine.weatherManager.serialize();
        }
        
        // Get Camera state
        if (this.graphicsEngine.cameraManager) {
            state.camera = {
                x: this.graphicsEngine.cameraManager.position.x,
                y: this.graphicsEngine.cameraManager.position.y,
                zoom: this.graphicsEngine.cameraManager.zoom
            };
        }
        
        // Get SoilManager state
        if (this.graphicsEngine.soilManager && this.graphicsEngine.soilManager.serialize) {
            state.soil = this.graphicsEngine.soilManager.serialize();
        }
        
        // Get PlantManager state
        if (this.graphicsEngine.plantManager && this.graphicsEngine.plantManager.serialize) {
            state.plants = this.graphicsEngine.plantManager.serialize();
        }
        
        return state;
    }
    
    /**
     * Restore state to all managers
     * @param {Object} state - Game state to restore
     * @private
     */
    _restoreState(state) {
        // Restore seed to localStorage for terrain regeneration
        if (state.seed !== undefined) {
            localStorage.setItem('landShepherd_seed', state.seed.toString());
        }
        
        // Restore TimeManager state
        if (state.time && this.graphicsEngine.timeManager && this.graphicsEngine.timeManager.deserialize) {
            this.graphicsEngine.timeManager.deserialize(state.time);
        }
        
        // Restore WeatherManager state
        if (state.weather && this.graphicsEngine.weatherManager && this.graphicsEngine.weatherManager.deserialize) {
            this.graphicsEngine.weatherManager.deserialize(state.weather);
        }
        
        // Restore Camera state
        if (state.camera && this.graphicsEngine.cameraManager) {
            // Use default values if camera position is invalid
            const camX = typeof state.camera.x === 'number' ? state.camera.x : 0;
            const camY = typeof state.camera.y === 'number' ? state.camera.y : 0;
            const camZoom = typeof state.camera.zoom === 'number' ? state.camera.zoom : 1.0;
            
            this.graphicsEngine.cameraManager.setPosition(camX, camY);
            this.graphicsEngine.cameraManager.setZoom(camZoom);
        }
        
        // Restore SoilManager state
        if (state.soil && this.graphicsEngine.soilManager && this.graphicsEngine.soilManager.deserialize) {
            this.graphicsEngine.soilManager.deserialize(state.soil);
        }
        
        // Restore PlantManager state (must be after SoilManager)
        if (state.plants && this.graphicsEngine.plantManager && this.graphicsEngine.plantManager.deserialize) {
            this.graphicsEngine.plantManager.deserialize(state.plants);
        }
        
        // Update UI after restoration
        this.graphicsEngine.updateSeedUI();
    }
    
    /**
     * Generate save metadata
     * @param {string} slotId - Save slot identifier
     * @returns {Object} Metadata object
     * @private
     */
    _generateMetadata(slotId) {
        const isAutoSave = slotId.startsWith('auto_');
        const slotNumber = slotId.split('_')[1] || '1';
        
        let plantCount = 0;
        if (this.graphicsEngine.plantManager) {
            plantCount = this.graphicsEngine.plantManager.getAllPlants().length;
        }
        
        let currentDay = 0;
        if (this.graphicsEngine.timeManager) {
            currentDay = this.graphicsEngine.timeManager.getCurrentDay();
        }
        
        return {
            name: isAutoSave ? `Auto-save ${slotNumber}` : `Manual Save ${slotNumber}`,
            playTime: 0, // Future use - would need to track actual play time
            plantCount: plantCount,
            currentDay: currentDay
        };
    }
    
    /**
     * Validate save version compatibility
     * @param {string} version - Save version string
     * @returns {boolean} True if compatible
     * @private
     */
    _validateVersion(version) {
        // For now, only exact version match
        // Future: implement version migration
        return version === this.saveVersion;
    }
    
    /**
     * Start a new game with the same map (keep seed, reset state)
     */
    newGameSameMap() {
        // Set flag to prevent saveOnClose from running
        this.isStartingNewGame = true;
        
        // Get current seed before reset
        const currentSeed = this.graphicsEngine.soilManager ? 
            this.graphicsEngine.soilManager.getSeed() : null;
        
        if (currentSeed !== null) {
            // Store seed in localStorage to persist across reload
            localStorage.setItem('landShepherd_seed', currentSeed.toString());
        }
        
        // Clear all auto-save slots to prevent auto-load
        this.deleteSave('auto_close');
        this.deleteSave('auto_1');
        this.deleteSave('auto_2');
        this.deleteSave('auto_3');
        
        // Clear any pending load flags
        localStorage.removeItem('landShepherd_pendingLoad');
        
        // Reload the page to reset all state
        window.location.reload();
    }
    
    /**
     * Start a new game with a new random map
     */
    newGameNewMap() {
        // Set flag to prevent saveOnClose from running
        this.isStartingNewGame = true;
        
        // Clear seed from localStorage to trigger random generation
        localStorage.removeItem('landShepherd_seed');
        
        // Clear all auto-save slots to prevent auto-load
        this.deleteSave('auto_close');
        this.deleteSave('auto_1');
        this.deleteSave('auto_2');
        this.deleteSave('auto_3');
        
        // Clear any pending load flags
        localStorage.removeItem('landShepherd_pendingLoad');
        
        // Reload the page to reset all state
        window.location.reload();
    }
}
