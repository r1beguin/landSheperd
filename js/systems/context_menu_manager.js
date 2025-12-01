/**
 * ContextMenuManager - Handles right-click context menu for plant and soil interactions
 * Displays contextual information and action options based on what was clicked
 */
class ContextMenuManager {
    constructor(canvas, soilManager, plantManager, timeManager) {
        this.canvas = canvas;
        this.soilManager = soilManager;
        this.plantManager = plantManager;
        this.timeManager = timeManager;
        
        this.menuElement = null;
        this.isVisible = false;
        this.currentGridX = null;
        this.currentGridY = null;
        this.currentWorldX = null;
        this.currentWorldY = null;
        
        // Real-time update system
        this.updateIntervalId = null;
        this.updateFrequencyMs = 100; // Update every 100ms for smooth real-time feedback
        
        this.createMenuElement();
        this.setupEventListeners();
    }
    
    createMenuElement() {
        // Create menu container
        this.menuElement = document.createElement('div');
        this.menuElement.id = 'context-menu';
        this.menuElement.style.display = 'none';
        document.body.appendChild(this.menuElement);
    }
    
    setupEventListeners() {
        // Close menu on click outside
        document.addEventListener('click', (event) => {
            if (this.isVisible && !this.menuElement.contains(event.target)) {
                this.hide();
            }
        });
        
        // Close menu on escape key
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && this.isVisible) {
                this.hide();
            }
        });
    }
    
    show(screenX, screenY, worldX, worldY, gridX, gridY) {
        this.currentGridX = gridX;
        this.currentGridY = gridY;
        this.currentWorldX = worldX;
        this.currentWorldY = worldY;
        
        // Get soil and plant data
        const soil = this.soilManager.getSoilAt(gridX, gridY);
        const plant = this.plantManager.getPlantAt(gridX, gridY);
        
        if (!soil) {
            return; // No soil, no menu
        }
        
        // Build menu content
        this.menuElement.innerHTML = this.buildMenuHTML(soil, plant);
        
        // Position menu at cursor
        this.positionMenu(screenX, screenY);
        
        // Setup button handlers after HTML is rendered
        this.setupButtonHandlers(plant);
        
        // Show menu
        this.menuElement.style.display = 'block';
        this.isVisible = true;
        
        // Start real-time update loop
        this.startUpdateLoop();
    }
    
    /**
     * Refresh menu content without repositioning
     * Updates plant/soil information in real-time using DOM updates (not innerHTML)
     */
    refresh() {
        if (!this.isVisible) {
            return;
        }
        
        // Get current soil and plant data
        const soil = this.soilManager.getSoilAt(this.currentGridX, this.currentGridY);
        const plant = this.plantManager.getPlantAt(this.currentGridX, this.currentGridY);
        
        if (!soil) {
            this.hide(); // Soil disappeared, close menu
            return;
        }
        
        // Update only the dynamic values using DOM queries
        // This preserves button handlers and prevents click blocking
        this.updateSoilValues(soil);
        
        if (plant) {
            this.updatePlantValues(plant, soil);
        }
    }
    
    /**
     * Update soil nutrient values in the DOM
     */
    updateSoilValues(soil) {
        const reqs = this.getNetterRequirements();
        
        // Update each nutrient row
        this.updateNutrientValue('N', soil.nitrogen, reqs.nitrogen);
        this.updateNutrientValue('P', soil.phosphorus, reqs.phosphorus);
        this.updateNutrientValue('K', soil.potassium, reqs.potassium);
        this.updateNutrientValue('OM', soil.organicMatter, reqs.organicMatter);
        
        // Update fertility
        const fertilityElements = this.menuElement.querySelectorAll('.context-menu-row');
        fertilityElements.forEach(row => {
            const label = row.querySelector('.context-menu-label');
            if (label && label.textContent === 'Fertility:') {
                const value = row.querySelector('.context-menu-value');
                if (value) {
                    value.textContent = `${soil.fertility.toFixed(1)}%`;
                }
            }
        });
    }
    
    /**
     * Update a single nutrient row
     */
    updateNutrientValue(symbol, value, requirements) {
        const rows = this.menuElement.querySelectorAll('.context-menu-row');
        
        rows.forEach(row => {
            const label = row.querySelector('.context-menu-label');
            if (label && label.textContent === `${symbol}:`) {
                // Update value
                const valueElement = row.querySelector('.context-menu-value');
                if (valueElement) {
                    valueElement.textContent = value.toFixed(1);
                }
                
                // Update bar width and status
                const bar = row.querySelector('.context-menu-bar');
                const status = row.querySelector('.context-menu-status');
                
                if (bar && status) {
                    const min = requirements.minimum;
                    const opt = requirements.optimal;
                    
                    let statusText = '';
                    let statusClass = '';
                    if (value < min) {
                        statusText = 'Critical';
                        statusClass = 'status-critical';
                    } else if (value < opt) {
                        statusText = 'Low';
                        statusClass = 'status-low';
                    } else {
                        statusText = 'Good';
                        statusClass = 'status-good';
                    }
                    
                    bar.style.width = `${Math.min(100, value)}%`;
                    bar.className = `context-menu-bar ${statusClass}`;
                    status.textContent = statusText;
                    status.className = `context-menu-status ${statusClass}`;
                }
            }
        });
    }
    
    /**
     * Update plant values in the DOM
     */
    updatePlantValues(plant, soil) {
        const rows = this.menuElement.querySelectorAll('.context-menu-row');
        
        rows.forEach(row => {
            const label = row.querySelector('.context-menu-label');
            if (!label) return;
            
            const labelText = label.textContent;
            const valueElement = row.querySelector('.context-menu-value');
            
            if (labelText === 'Stage:' && valueElement) {
                valueElement.textContent = plant.stage;
            }
            else if (labelText === 'Age:' && valueElement) {
                valueElement.textContent = `${plant.age.toFixed(1)} days`;
            }
            else if (labelText === 'Progress:' && valueElement) {
                const currentStageIndex = plant.species.growthStages.findIndex(s => s.name === plant.stage);
                if (currentStageIndex !== -1) {
                    const stageConfig = plant.species.growthStages[currentStageIndex];
                    const daysToGrow = stageConfig.daysToGrow;
                    
                    if (daysToGrow && daysToGrow > 0) {
                        const progress = Math.min(100, (plant.accumulatedGrowthDays / daysToGrow) * 100);
                        valueElement.textContent = `${progress.toFixed(0)}%`;
                        
                        const bar = row.querySelector('.context-menu-bar');
                        if (bar) {
                            bar.style.width = `${progress}%`;
                        }
                    }
                }
            }
            else if (labelText === 'Growth Rate:' && valueElement) {
                const growthRate = plant.calculateGrowthRate();
                const ratePercent = (growthRate * 100).toFixed(0);
                valueElement.textContent = `${ratePercent}%`;
                
                const status = row.querySelector('.context-menu-status');
                if (status) {
                    let rateStatus = '';
                    let rateClass = '';
                    if (growthRate >= 0.8) {
                        rateStatus = 'Optimal';
                        rateClass = 'status-good';
                    } else if (growthRate >= 0.5) {
                        rateStatus = 'Good';
                        rateClass = 'status-good';
                    } else if (growthRate >= 0.2) {
                        rateStatus = 'Slow';
                        rateClass = 'status-low';
                    } else {
                        rateStatus = 'Stunted';
                        rateClass = 'status-critical';
                    }
                    
                    status.textContent = rateStatus;
                    status.className = `context-menu-status ${rateClass}`;
                }
            }
            else if (labelText === 'Days Stunted:' && valueElement) {
                valueElement.textContent = plant.daysStunted.toFixed(1);
            }
        });
    }
    
    /**
     * Start the update loop for real-time data refresh
     */
    startUpdateLoop() {
        // Clear any existing interval
        this.stopUpdateLoop();
        
        // Start new interval
        this.updateIntervalId = setInterval(() => {
            this.refresh();
        }, this.updateFrequencyMs);
    }
    
    /**
     * Stop the update loop
     */
    stopUpdateLoop() {
        if (this.updateIntervalId !== null) {
            clearInterval(this.updateIntervalId);
            this.updateIntervalId = null;
        }
    }
    
    buildMenuHTML(soil, plant) {
        let html = '<div class="context-menu-header">';
        
        if (plant) {
            html += `<div class="context-menu-title">🌿 ${plant.species.commonName}</div>`;
        } else {
            html += '<div class="context-menu-title">🌱 Empty Soil</div>';
        }
        
        html += '</div>';
        
        // Soil information section
        html += '<div class="context-menu-section">';
        html += '<div class="context-menu-subtitle">Soil Nutrients</div>';
        html += this.buildSoilInfo(soil);
        html += '</div>';
        
        // Plant information section (if plant exists)
        if (plant) {
            html += '<div class="context-menu-section">';
            html += '<div class="context-menu-subtitle">Plant Status</div>';
            html += this.buildPlantInfo(plant, soil);
            html += '</div>';
        }
        
        // Actions section
        html += '<div class="context-menu-section">';
        html += '<div class="context-menu-subtitle">Actions</div>';
        html += '<div class="context-menu-actions">';
        
        if (plant) {
            html += '<button class="context-menu-btn" data-action="advance">Advance Growth</button>';
            html += '<button class="context-menu-btn context-menu-btn-danger" data-action="remove">Remove Plant</button>';
        } else {
            html += '<button class="context-menu-btn context-menu-btn-primary" data-action="plant">Plant Nettle</button>';
        }
        
        html += '<button class="context-menu-btn context-menu-btn-secondary" data-action="close">Close</button>';
        html += '</div>';
        html += '</div>';
        
        return html;
    }
    
    buildSoilInfo(soil) {
        const reqs = this.getNetterRequirements();
        
        let html = '<div class="context-menu-grid">';
        
        // Nitrogen
        html += this.buildNutrientRow('N', 'Nitrogen', soil.nitrogen, reqs.nitrogen);
        
        // Phosphorus
        html += this.buildNutrientRow('P', 'Phosphorus', soil.phosphorus, reqs.phosphorus);
        
        // Potassium
        html += this.buildNutrientRow('K', 'Potassium', soil.potassium, reqs.potassium);
        
        // Organic Matter
        html += this.buildNutrientRow('OM', 'Organic Matter', soil.organicMatter, reqs.organicMatter);
        
        // Fertility average
        html += '<div class="context-menu-row">';
        html += '<div class="context-menu-label">Fertility:</div>';
        html += `<div class="context-menu-value">${soil.fertility.toFixed(1)}%</div>`;
        html += '</div>';
        
        html += '</div>';
        
        return html;
    }
    
    buildNutrientRow(symbol, name, value, requirements) {
        const min = requirements.minimum;
        const opt = requirements.optimal;
        
        // Determine status
        let status = '';
        let statusClass = '';
        if (value < min) {
            status = 'Critical';
            statusClass = 'status-critical';
        } else if (value < opt) {
            status = 'Low';
            statusClass = 'status-low';
        } else {
            status = 'Good';
            statusClass = 'status-good';
        }
        
        let html = '<div class="context-menu-row">';
        html += `<div class="context-menu-label">${symbol}:</div>`;
        html += `<div class="context-menu-value">${value.toFixed(1)}</div>`;
        html += `<div class="context-menu-bar-container">`;
        html += `<div class="context-menu-bar ${statusClass}" style="width: ${Math.min(100, value)}%"></div>`;
        html += `</div>`;
        html += `<div class="context-menu-status ${statusClass}">${status}</div>`;
        html += '</div>';
        
        return html;
    }
    
    buildPlantInfo(plant, soil) {
        let html = '<div class="context-menu-grid">';
        
        // Growth stage
        html += '<div class="context-menu-row">';
        html += '<div class="context-menu-label">Stage:</div>';
        html += `<div class="context-menu-value">${plant.stage}</div>`;
        html += '</div>';
        
        // Age
        html += '<div class="context-menu-row">';
        html += '<div class="context-menu-label">Age:</div>';
        html += `<div class="context-menu-value">${plant.age.toFixed(1)} days</div>`;
        html += '</div>';
        
        // Growth progress
        const currentStageIndex = plant.species.growthStages.findIndex(s => s.name === plant.stage);
        if (currentStageIndex !== -1) {
            const stageConfig = plant.species.growthStages[currentStageIndex];
            const daysToGrow = stageConfig.daysToGrow;
            
            if (daysToGrow && daysToGrow > 0) {
                const progress = Math.min(100, (plant.accumulatedGrowthDays / daysToGrow) * 100);
                
                html += '<div class="context-menu-row">';
                html += '<div class="context-menu-label">Progress:</div>';
                html += `<div class="context-menu-value">${progress.toFixed(0)}%</div>`;
                html += '<div class="context-menu-bar-container">';
                html += `<div class="context-menu-bar status-good" style="width: ${progress}%"></div>`;
                html += '</div>';
                html += '</div>';
            }
        }
        
        // Growth rate
        const growthRate = plant.calculateGrowthRate();
        const ratePercent = (growthRate * 100).toFixed(0);
        let rateStatus = '';
        let rateClass = '';
        if (growthRate >= 0.8) {
            rateStatus = 'Optimal';
            rateClass = 'status-good';
        } else if (growthRate >= 0.5) {
            rateStatus = 'Good';
            rateClass = 'status-good';
        } else if (growthRate >= 0.2) {
            rateStatus = 'Slow';
            rateClass = 'status-low';
        } else {
            rateStatus = 'Stunted';
            rateClass = 'status-critical';
        }
        
        html += '<div class="context-menu-row">';
        html += '<div class="context-menu-label">Growth Rate:</div>';
        html += `<div class="context-menu-value">${ratePercent}%</div>`;
        html += `<div class="context-menu-status ${rateClass}">${rateStatus}</div>`;
        html += '</div>';
        
        // Stunted status
        if (plant.isStunted) {
            html += '<div class="context-menu-row">';
            html += '<div class="context-menu-warning">⚠ Plant is stunted!</div>';
            html += '</div>';
            
            html += '<div class="context-menu-row">';
            html += '<div class="context-menu-label">Days Stunted:</div>';
            html += `<div class="context-menu-value">${plant.daysStunted.toFixed(1)}</div>`;
            html += '</div>';
        }
        
        // Nutrient deficiency detection
        const reqs = plant.species.environment.nutrientRequirements;
        const deficiencies = [];
        if (soil.nitrogen < reqs.nitrogen.minimum) deficiencies.push('Nitrogen');
        if (soil.phosphorus < reqs.phosphorus.minimum) deficiencies.push('Phosphorus');
        if (soil.potassium < reqs.potassium.minimum) deficiencies.push('Potassium');
        if (soil.organicMatter < reqs.organicMatter.minimum) deficiencies.push('Organic Matter');
        
        if (deficiencies.length > 0) {
            html += '<div class="context-menu-row">';
            html += `<div class="context-menu-warning">⚠ Deficient: ${deficiencies.join(', ')}</div>`;
            html += '</div>';
        }
        
        html += '</div>';
        
        return html;
    }
    
    getNetterRequirements() {
        // Get nettle requirements from species config
        const nettleConfig = this.plantManager.speciesConfigs.get('urtica_dioica');
        if (nettleConfig && nettleConfig.environment && nettleConfig.environment.nutrientRequirements) {
            return nettleConfig.environment.nutrientRequirements;
        }
        
        // Fallback defaults
        return {
            nitrogen: { minimum: 15, optimal: 50 },
            phosphorus: { minimum: 10, optimal: 30 },
            potassium: { minimum: 10, optimal: 30 },
            organicMatter: { minimum: 5, optimal: 40 }
        };
    }
    
    setupButtonHandlers(plant) {
        const buttons = this.menuElement.querySelectorAll('[data-action]');
        
        buttons.forEach(button => {
            button.addEventListener('click', (event) => {
                event.stopPropagation();
                const action = button.getAttribute('data-action');
                this.handleAction(action, plant);
            });
        });
    }
    
    handleAction(action, plant) {
        const currentDay = this.timeManager.getCurrentDayPrecise();
        
        switch (action) {
            case 'plant':
                // Plant new nettle at the clicked position
                this.plantManager.addPlantAtPosition(
                    this.currentGridX, 
                    this.currentGridY, 
                    this.currentWorldX, 
                    this.currentWorldY,
                    'urtica_dioica',
                    currentDay
                );
                break;
                
            case 'advance':
                // Advance plant growth stage
                if (plant) {
                    plant.advanceGrowthStage(currentDay);
                }
                break;
                
            case 'remove':
                // Remove plant
                if (plant) {
                    this.plantManager.removePlant(this.currentGridX, this.currentGridY);
                }
                break;
                
            case 'close':
                // Just close the menu
                break;
        }
        
        this.hide();
    }
    
    positionMenu(screenX, screenY) {
        // Get menu dimensions
        this.menuElement.style.display = 'block';
        const rect = this.menuElement.getBoundingClientRect();
        const menuWidth = rect.width;
        const menuHeight = rect.height;
        
        // Get viewport dimensions
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        
        // Calculate position (offset slightly from cursor)
        let x = screenX + 10;
        let y = screenY + 10;
        
        // Adjust if menu would overflow viewport
        if (x + menuWidth > viewportWidth) {
            x = screenX - menuWidth - 10;
        }
        
        if (y + menuHeight > viewportHeight) {
            y = screenY - menuHeight - 10;
        }
        
        // Clamp to viewport
        x = Math.max(5, Math.min(x, viewportWidth - menuWidth - 5));
        y = Math.max(5, Math.min(y, viewportHeight - menuHeight - 5));
        
        this.menuElement.style.left = x + 'px';
        this.menuElement.style.top = y + 'px';
    }
    
    hide() {
        // Stop real-time updates
        this.stopUpdateLoop();
        
        this.menuElement.style.display = 'none';
        this.isVisible = false;
        this.currentGridX = null;
        this.currentGridY = null;
        this.currentWorldX = null;
        this.currentWorldY = null;
    }
    
    isMenuVisible() {
        return this.isVisible;
    }
}
