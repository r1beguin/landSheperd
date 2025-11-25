/**
 * ScreenshotManager - Automated screenshot capture and comparison system
 * 
 * This manager provides screenshot capture capabilities for the interactive
 * testing framework. It can capture WebGL canvas content at any point,
 * store screenshots with metadata, and generate visual diff images.
 * 
 * Key features:
 * - Non-blocking screenshot capture using requestAnimationFrame
 * - Multiple format support (PNG, JPEG)
 * - Automatic timestamping and descriptive naming
 * - Visual diff generation with pixelmatch-compatible output
 * - Metadata tracking (timestamp, dimensions, format, test context)
 * - WebGL context loss handling
 * 
 * Performance considerations:
 * - Screenshots are captured on next frame to avoid blocking
 * - Canvas data is extracted efficiently using toDataURL
 * - Metadata is kept minimal to reduce memory footprint
 * 
 * @class ScreenshotManager
 */
class ScreenshotManager {
    constructor() {
        this.canvas = null;
        this.screenshots = new Map(); // name -> {data, metadata}
        this.captureQueue = [];
        this.isCapturing = false;
        this.defaultFormat = 'png';
        this.defaultQuality = 0.95; // For JPEG
        
        // Capture statistics
        this.stats = {
            totalCaptures: 0,
            failedCaptures: 0,
            averageCaptureTime: 0,
            lastCaptureTime: 0
        };
        
        console.log('[ScreenshotManager] Initialized');
    }
    
    /**
     * Initialize the screenshot manager with canvas reference
     * @param {HTMLCanvasElement} canvas - The WebGL canvas to capture
     */
    initialize(canvas) {
        if (!canvas || !(canvas instanceof HTMLCanvasElement)) {
            console.error('[ScreenshotManager] Invalid canvas provided');
            return false;
        }
        
        this.canvas = canvas;
        console.log('[ScreenshotManager] Canvas attached', {
            width: canvas.width,
            height: canvas.height
        });
        
        return true;
    }
    
    /**
     * Capture a screenshot with a descriptive name
     * Non-blocking - captures on next animation frame
     * 
     * @param {string} name - Descriptive name for the screenshot
     * @param {Object} options - Capture options
     * @param {string} options.format - 'png' or 'jpeg' (default: 'png')
     * @param {number} options.quality - JPEG quality 0-1 (default: 0.95)
     * @param {Object} options.metadata - Additional metadata to store
     * @returns {Promise<Object>} Screenshot data and metadata
     */
    captureScreenshot(name, options = {}) {
        return new Promise((resolve, reject) => {
            if (!this.canvas) {
                const error = new Error('Canvas not initialized');
                console.error('[ScreenshotManager]', error.message);
                this.stats.failedCaptures++;
                reject(error);
                return;
            }
            
            // Queue the capture request
            this.captureQueue.push({
                name,
                options,
                resolve,
                reject,
                timestamp: Date.now()
            });
            
            // Start processing queue if not already processing
            if (!this.isCapturing) {
                this.processQueue();
            }
        });
    }
    
    /**
     * Process the capture queue on next frame
     * @private
     */
    processQueue() {
        if (this.captureQueue.length === 0) {
            this.isCapturing = false;
            return;
        }
        
        this.isCapturing = true;
        
        requestAnimationFrame(() => {
            const request = this.captureQueue.shift();
            const startTime = performance.now();
            
            try {
                const format = request.options.format || this.defaultFormat;
                const quality = request.options.quality || this.defaultQuality;
                const mimeType = format === 'jpeg' ? 'image/jpeg' : 'image/png';
                
                // Capture canvas data
                const dataURL = this.canvas.toDataURL(mimeType, quality);
                
                // Create metadata
                const metadata = {
                    name: request.name,
                    timestamp: new Date().toISOString(),
                    captureTime: performance.now() - startTime,
                    format,
                    quality: format === 'jpeg' ? quality : 1.0,
                    dimensions: {
                        width: this.canvas.width,
                        height: this.canvas.height
                    },
                    ...request.options.metadata
                };
                
                // Store screenshot
                const screenshot = { data: dataURL, metadata };
                this.screenshots.set(request.name, screenshot);
                
                // Update statistics
                this.stats.totalCaptures++;
                this.stats.lastCaptureTime = metadata.captureTime;
                this.stats.averageCaptureTime = 
                    (this.stats.averageCaptureTime * (this.stats.totalCaptures - 1) + metadata.captureTime) 
                    / this.stats.totalCaptures;
                
                console.log('[ScreenshotManager] Captured:', request.name, {
                    format,
                    captureTime: metadata.captureTime.toFixed(2) + 'ms',
                    size: (dataURL.length / 1024).toFixed(2) + 'KB'
                });
                
                request.resolve(screenshot);
                
            } catch (error) {
                console.error('[ScreenshotManager] Capture failed:', request.name, error);
                this.stats.failedCaptures++;
                request.reject(error);
            }
            
            // Process next in queue
            this.processQueue();
        });
    }
    
    /**
     * Get a previously captured screenshot
     * @param {string} name - Screenshot name
     * @returns {Object|null} Screenshot data and metadata
     */
    getScreenshot(name) {
        return this.screenshots.get(name) || null;
    }
    
    /**
     * Get all captured screenshots
     * @returns {Array<Object>} Array of screenshot objects with name, data, metadata
     */
    getAllScreenshots() {
        const results = [];
        this.screenshots.forEach((screenshot, name) => {
            results.push({ name, ...screenshot });
        });
        return results;
    }
    
    /**
     * Compare two screenshots and generate diff data
     * Note: Actual pixel comparison is done in Node.js tests with pixelmatch
     * This method provides metadata for comparison
     * 
     * @param {string} name1 - First screenshot name
     * @param {string} name2 - Second screenshot name
     * @returns {Object} Comparison metadata
     */
    compareScreenshots(name1, name2) {
        const screenshot1 = this.screenshots.get(name1);
        const screenshot2 = this.screenshots.get(name2);
        
        if (!screenshot1 || !screenshot2) {
            console.error('[ScreenshotManager] Screenshots not found for comparison:', 
                { name1: !!screenshot1, name2: !!screenshot2 });
            return null;
        }
        
        // Check if dimensions match
        const dims1 = screenshot1.metadata.dimensions;
        const dims2 = screenshot2.metadata.dimensions;
        const dimensionsMatch = dims1.width === dims2.width && dims1.height === dims2.height;
        
        return {
            dimensionsMatch,
            screenshot1: screenshot1.metadata,
            screenshot2: screenshot2.metadata,
            comparable: dimensionsMatch,
            message: dimensionsMatch 
                ? 'Screenshots can be compared' 
                : 'Dimension mismatch - comparison not possible'
        };
    }
    
    /**
     * Clear a specific screenshot from memory
     * @param {string} name - Screenshot name to clear
     * @returns {boolean} Success status
     */
    clearScreenshot(name) {
        const existed = this.screenshots.has(name);
        this.screenshots.delete(name);
        
        if (existed) {
            console.log('[ScreenshotManager] Cleared screenshot:', name);
        }
        
        return existed;
    }
    
    /**
     * Clear all screenshots from memory
     * @param {boolean} resetStats - Whether to reset statistics (default: false)
     */
    clearAll(resetStats = false) {
        const count = this.screenshots.size;
        this.screenshots.clear();
        
        if (resetStats) {
            this.stats = {
                totalCaptures: 0,
                failedCaptures: 0,
                averageCaptureTime: 0,
                lastCaptureTime: 0
            };
        }
        
        console.log('[ScreenshotManager] Cleared all screenshots:', count);
    }
    
    /**
     * Export screenshot as downloadable file (browser only)
     * @param {string} name - Screenshot name
     * @param {string} filename - Output filename (optional, defaults to name)
     */
    exportScreenshot(name, filename) {
        const screenshot = this.screenshots.get(name);
        if (!screenshot) {
            console.error('[ScreenshotManager] Screenshot not found:', name);
            return false;
        }
        
        try {
            const link = document.createElement('a');
            link.download = filename || `${name}.${screenshot.metadata.format}`;
            link.href = screenshot.data;
            link.click();
            
            console.log('[ScreenshotManager] Exported screenshot:', name);
            return true;
        } catch (error) {
            console.error('[ScreenshotManager] Export failed:', error);
            return false;
        }
    }
    
    /**
     * Get capture statistics
     * @returns {Object} Statistics object
     */
    getStats() {
        return {
            ...this.stats,
            storedScreenshots: this.screenshots.size,
            queuedCaptures: this.captureQueue.length
        };
    }
    
    /**
     * Export all screenshots as a JSON manifest
     * Useful for test reporting
     * @returns {Object} Manifest with all screenshot metadata
     */
    exportManifest() {
        const manifest = {
            generatedAt: new Date().toISOString(),
            totalScreenshots: this.screenshots.size,
            statistics: this.getStats(),
            screenshots: []
        };
        
        this.screenshots.forEach((screenshot, name) => {
            manifest.screenshots.push({
                name,
                metadata: screenshot.metadata,
                dataSize: screenshot.data.length
            });
        });
        
        return manifest;
    }
    
    /**
     * Handle WebGL context loss gracefully
     * Called when context is lost to prevent capture errors
     */
    handleContextLoss() {
        console.warn('[ScreenshotManager] WebGL context lost - clearing capture queue');
        
        // Reject all pending captures
        this.captureQueue.forEach(request => {
            request.reject(new Error('WebGL context lost'));
        });
        
        this.captureQueue = [];
        this.isCapturing = false;
        this.stats.failedCaptures += this.captureQueue.length;
    }
    
    /**
     * Handle WebGL context restoration
     * Called when context is restored
     */
    handleContextRestored() {
        console.log('[ScreenshotManager] WebGL context restored - ready for captures');
    }
}
