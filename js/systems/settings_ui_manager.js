/**
 * SettingsUIManager - Settings Menu UI System
 * 
 * Manages the settings modal UI for save/load functionality.
 * Provides gear icon button, modal overlay, and menu buttons.
 * 
 * Features:
 * - Settings gear icon in top-right corner
 * - Modal overlay with dark backdrop
 * - Save/Load game buttons
 * - New Game options (Same Map / New Map)
 * - Auto-save toggle
 * - Escape key and outside click to close
 */

class SettingsUIManager {
    constructor() {
        // DOM element references
        this.settingsButton = null;
        this.settingsModal = null;
        this.modalBackdrop = null;
        this.closeButton = null;
        
        // Save manager reference (set via setSaveManager)
        this.saveManager = null;
        
        // State
        this.isOpen = false;
        this.autoSaveEnabled = true;
        
        // Bind methods for event listeners
        this._handleKeyDown = this._handleKeyDown.bind(this);
        this._handleBackdropClick = this._handleBackdropClick.bind(this);
    }
    
    /**
     * Set SaveManager reference for button handlers
     * @param {SaveManager} saveManager - SaveManager instance
     */
    setSaveManager(saveManager) {
        this.saveManager = saveManager;
        // Sync auto-save state with SaveManager
        if (this.saveManager) {
            this.saveManager.setAutoSaveEnabled(this.autoSaveEnabled);
        }
    }
    
    /**
     * Initialize the settings UI
     * Called after DOM is ready
     */
    initialize() {
        this._cacheElements();
        this._setupEventListeners();
        
        // Restore auto-save preference from localStorage
        const savedPref = localStorage.getItem('landShepherd_autoSaveEnabled');
        if (savedPref !== null) {
            this.autoSaveEnabled = savedPref === 'true';
            if (this.autoSaveCheckbox) {
                this.autoSaveCheckbox.checked = this.autoSaveEnabled;
            }
        }
    }
    
    /**
     * Cache DOM element references
     * @private
     */
    _cacheElements() {
        this.settingsButton = document.getElementById('settings-button');
        this.settingsModal = document.getElementById('settings-modal');
        this.modalBackdrop = document.getElementById('settings-backdrop');
        this.closeButton = document.getElementById('settings-close-btn');
        
        // Save slots container (M4)
        this.saveSlotsContainer = document.getElementById('save-slots-container');
        
        // Button elements
        this.newGameSameMapBtn = document.getElementById('new-game-same-map-btn');
        this.newGameNewMapBtn = document.getElementById('new-game-new-map-btn');
        this.autoSaveCheckbox = document.getElementById('auto-save-checkbox');
    }
    
    /**
     * Set up event listeners for UI interactions
     * @private
     */
    _setupEventListeners() {
        // Settings button click
        if (this.settingsButton) {
            this.settingsButton.addEventListener('click', () => this.open());
        }
        
        // Close button click
        if (this.closeButton) {
            this.closeButton.addEventListener('click', () => this.close());
        }
        
        // Backdrop click to close
        if (this.modalBackdrop) {
            this.modalBackdrop.addEventListener('click', this._handleBackdropClick);
        }
        
        // Escape key to close
        document.addEventListener('keydown', this._handleKeyDown);
        
        // Menu button handlers
        if (this.newGameSameMapBtn) {
            this.newGameSameMapBtn.addEventListener('click', () => this._onNewGameSameMap());
        }
        
        if (this.newGameNewMapBtn) {
            this.newGameNewMapBtn.addEventListener('click', () => this._onNewGameNewMap());
        }
        
        if (this.autoSaveCheckbox) {
            this.autoSaveCheckbox.addEventListener('change', (e) => this._onAutoSaveToggle(e));
        }
    }
    
    /**
     * Handle keydown events
     * @private
     * @param {KeyboardEvent} event
     */
    _handleKeyDown(event) {
        if (event.key === 'Escape' && this.isOpen) {
            this.close();
        }
    }
    
    /**
     * Handle backdrop click
     * @private
     * @param {MouseEvent} event
     */
    _handleBackdropClick(event) {
        // Only close if clicking directly on backdrop, not modal content
        if (event.target === this.modalBackdrop) {
            this.close();
        }
    }
    
    /**
     * Open the settings modal
     */
    open() {
        if (this.settingsModal && this.modalBackdrop) {
            this.modalBackdrop.classList.add('active');
            this.settingsModal.classList.add('active');
            this.isOpen = true;
            
            // Refresh save slots when opening (M4)
            this._refreshSaveSlots();
        }
    }
    
    /**
     * Close the settings modal
     */
    close() {
        if (this.settingsModal && this.modalBackdrop) {
            this.modalBackdrop.classList.remove('active');
            this.settingsModal.classList.remove('active');
            this.isOpen = false;
        }
    }
    
    /**
     * Toggle the settings modal
     */
    toggle() {
        if (this.isOpen) {
            this.close();
        } else {
            this.open();
        }
    }
    
    /**
     * Check if modal is currently open
     * @returns {boolean}
     */
    isModalOpen() {
        return this.isOpen;
    }
    
    /**
     * Get auto-save enabled state
     * @returns {boolean}
     */
    isAutoSaveEnabled() {
        return this.autoSaveEnabled;
    }
    
    /**
     * Set auto-save enabled state
     * @param {boolean} enabled
     */
    setAutoSaveEnabled(enabled) {
        this.autoSaveEnabled = enabled;
        if (this.autoSaveCheckbox) {
            this.autoSaveCheckbox.checked = enabled;
        }
    }
    
    // Button click handlers (connected to SaveManager)
    
    /**
     * Handle New Game (Same Map) button click
     * @private
     */
    _onNewGameSameMap() {
        if (this.saveManager) {
            this.saveManager.newGameSameMap();
        } else {
            // Fallback: reload with same seed from localStorage
            window.location.reload();
        }
    }
    
    /**
     * Handle New Game (New Map) button click
     * @private
     */
    _onNewGameNewMap() {
        if (this.saveManager) {
            this.saveManager.newGameNewMap();
        } else {
            // Fallback: clear seed and reload
            localStorage.removeItem('landShepherd_seed');
            window.location.reload();
        }
    }
    
    /**
     * Handle Auto-save toggle change
     * @private
     * @param {Event} event
     */
    _onAutoSaveToggle(event) {
        this.autoSaveEnabled = event.target.checked;
        localStorage.setItem('landShepherd_autoSaveEnabled', this.autoSaveEnabled.toString());
        if (this.saveManager) {
            this.saveManager.setAutoSaveEnabled(this.autoSaveEnabled);
        }
    }
    
    // ===== M4: Save Slot Management =====
    
    /**
     * Refresh save slots display (M4)
     * Queries SaveManager for save list and renders slot UI
     * @private
     */
    _refreshSaveSlots() {
        if (!this.saveSlotsContainer || !this.saveManager) return;
        
        // Get all save slots
        const saveList = this.saveManager.getSaveList();
        const saveMap = new Map(saveList.map(save => [save.slotId, save]));
        
        // Define slot order: manual slots first, then auto slots
        const slotIds = ['manual_1', 'manual_2', 'manual_3', 'auto_1', 'auto_2', 'auto_3'];
        
        // Clear container
        this.saveSlotsContainer.innerHTML = '';
        
        // Generate slot HTML for each slot
        slotIds.forEach(slotId => {
            const saveData = saveMap.get(slotId);
            const slotElement = this._createSlotElement(slotId, saveData);
            this.saveSlotsContainer.appendChild(slotElement);
        });
    }
    
    /**
     * Create HTML element for a save slot (M4)
     * @private
     * @param {string} slotId - Slot identifier
     * @param {Object|null} saveData - Save data or null if empty
     * @returns {HTMLElement} Slot element
     */
    _createSlotElement(slotId, saveData) {
        const isManual = slotId.startsWith('manual_');
        const slotNumber = slotId.split('_')[1];
        const slotName = isManual ? `Manual Save ${slotNumber}` : `Auto-save ${slotNumber}`;
        
        const slotDiv = document.createElement('div');
        slotDiv.className = `save-slot ${saveData ? '' : 'empty'}`;
        slotDiv.dataset.slotId = slotId;
        
        // Slot header
        const header = document.createElement('div');
        header.className = 'slot-header';
        
        const nameSpan = document.createElement('span');
        nameSpan.className = 'slot-name';
        nameSpan.textContent = slotName;
        
        const badge = document.createElement('span');
        badge.className = `slot-type-badge ${isManual ? 'manual' : 'auto'}`;
        badge.textContent = isManual ? 'Manual' : 'Auto';
        
        header.appendChild(nameSpan);
        header.appendChild(badge);
        slotDiv.appendChild(header);
        
        if (saveData) {
            // Slot has data - show info and actions
            const info = document.createElement('div');
            info.className = 'slot-info';
            
            // Format timestamp
            const date = new Date(saveData.timestamp);
            const dateStr = date.toLocaleDateString();
            const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            
            info.innerHTML = `
                <div class="slot-info-row">
                    <span class="slot-info-label">Saved:</span>
                    <span class="slot-info-value">${dateStr} ${timeStr}</span>
                </div>
                <div class="slot-info-row">
                    <span class="slot-info-label">Day:</span>
                    <span class="slot-info-value">${Math.floor(saveData.metadata.currentDay)}</span>
                </div>
                <div class="slot-info-row">
                    <span class="slot-info-label">Plants:</span>
                    <span class="slot-info-value">${saveData.metadata.plantCount}</span>
                </div>
            `;
            
            slotDiv.appendChild(info);
            
            // Action buttons
            const actions = document.createElement('div');
            actions.className = 'slot-actions';
            
            const saveBtn = document.createElement('button');
            saveBtn.className = 'slot-btn slot-btn-save';
            saveBtn.textContent = 'Overwrite';
            saveBtn.addEventListener('click', () => this._onSlotSave(slotId));
            
            const loadBtn = document.createElement('button');
            loadBtn.className = 'slot-btn slot-btn-load';
            loadBtn.textContent = 'Load';
            loadBtn.addEventListener('click', () => this._onSlotLoad(slotId));
            
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'slot-btn slot-btn-delete';
            deleteBtn.textContent = 'Delete';
            deleteBtn.addEventListener('click', () => this._onSlotDelete(slotId));
            
            actions.appendChild(loadBtn);
            actions.appendChild(saveBtn);
            actions.appendChild(deleteBtn);
            slotDiv.appendChild(actions);
            
        } else {
            // Empty slot - show message and save button
            const emptyMsg = document.createElement('div');
            emptyMsg.className = 'slot-empty-message';
            emptyMsg.textContent = 'Empty slot';
            slotDiv.appendChild(emptyMsg);
            
            const actions = document.createElement('div');
            actions.className = 'slot-actions';
            
            const saveBtn = document.createElement('button');
            saveBtn.className = 'slot-btn slot-btn-save';
            saveBtn.textContent = 'Save Here';
            saveBtn.addEventListener('click', () => this._onSlotSave(slotId));
            
            actions.appendChild(saveBtn);
            slotDiv.appendChild(actions);
        }
        
        return slotDiv;
    }
    
    /**
     * Handle save to slot (M4)
     * @private
     * @param {string} slotId - Slot identifier
     */
    _onSlotSave(slotId) {
        if (!this.saveManager) return;
        
        const success = this.saveManager.save(slotId);
        
        if (success) {
            // Refresh slots to show updated data
            this._refreshSaveSlots();
            
            // Show visual feedback
            const slotElement = this.saveSlotsContainer.querySelector(`[data-slot-id="${slotId}"]`);
            if (slotElement) {
                slotElement.style.borderColor = '#4CAF50';
                setTimeout(() => {
                    slotElement.style.borderColor = '';
                }, 1000);
            }
        }
    }
    
    /**
     * Handle load from slot (M4)
     * @private
     * @param {string} slotId - Slot identifier
     */
    _onSlotLoad(slotId) {
        if (!this.saveManager) return;
        
        const success = this.saveManager.load(slotId);
        
        if (success) {
            this.close(); // Close settings - page will reload
        }
    }
    
    /**
     * Handle delete slot (M4)
     * @private
     * @param {string} slotId - Slot identifier
     */
    _onSlotDelete(slotId) {
        if (!this.saveManager) return;
        
        // Confirm deletion
        const isManual = slotId.startsWith('manual_');
        const slotNumber = slotId.split('_')[1];
        const slotName = isManual ? `Manual Save ${slotNumber}` : `Auto-save ${slotNumber}`;
        
        if (!confirm(`Delete ${slotName}? This cannot be undone.`)) {
            return;
        }
        
        const success = this.saveManager.deleteSave(slotId);
        
        if (success) {
            // Refresh slots to show empty slot
            this._refreshSaveSlots();
        }
    }
    
    /**
     * Cleanup event listeners
     */
    cleanup() {
        document.removeEventListener('keydown', this._handleKeyDown);
        
        if (this.modalBackdrop) {
            this.modalBackdrop.removeEventListener('click', this._handleBackdropClick);
        }
    }
}
