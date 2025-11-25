/**
 * LogReader - Console log capture and analysis system
 * 
 * This manager captures and categorizes console output for the interactive
 * testing framework. It provides filtering, parsing, and assertion capabilities
 * for automated testing scenarios.
 * 
 * Key features:
 * - Real-time console message capture (error, warn, info, log, debug)
 * - Severity-based filtering
 * - Structured log parsing (FPS, WebGL state, manager initialization)
 * - Timing information for performance analysis
 * - Log assertions for automated testing
 * - Pattern matching and search
 * 
 * Performance considerations:
 * - Stream-based processing (no large in-memory buffers)
 * - Configurable log retention limit
 * - Efficient pattern matching with RegExp
 * 
 * @class LogReader
 */
class LogReader {
    constructor() {
        this.logs = [];
        this.originalConsole = {};
        this.isCapturing = false;
        this.maxLogEntries = 1000; // Prevent memory bloat
        this.startTime = null;
        
        // Severity levels
        this.severityLevels = {
            error: 4,
            warn: 3,
            info: 2,
            log: 1,
            debug: 0
        };
        
        // Statistics
        this.stats = {
            total: 0,
            error: 0,
            warn: 0,
            info: 0,
            log: 0,
            debug: 0
        };
        
        // Pattern matchers for structured log parsing
        this.patterns = {
            fps: /FPS[:\s]+(\d+)/i,
            webgl: /\[WebGL\]|WebGL\s+(ok|initialized|failed|error)/i,
            manager: /\[([\w]+Manager)\]\s+(Initialized|Ready|Failed|Error)/i,
            timing: /(\d+(?:\.\d+)?)\s*ms/i,
            error_line: /at\s+(.+):(\d+):(\d+)/,
            memory: /(\d+(?:\.\d+)?)\s*(MB|KB|bytes)/i
        };
        
        console.log('[LogReader] Initialized');
    }
    
    /**
     * Start capturing console output
     * Hooks into console methods to intercept messages
     * 
     * @param {Object} options - Capture options
     * @param {number} options.maxEntries - Maximum log entries to keep (default: 1000)
     * @param {boolean} options.passthrough - Whether to still output to console (default: true)
     */
    startCapture(options = {}) {
        if (this.isCapturing) {
            console.warn('[LogReader] Already capturing');
            return;
        }
        
        this.maxLogEntries = options.maxEntries || this.maxLogEntries;
        const passthrough = options.passthrough !== false;
        
        // Store original console methods
        ['error', 'warn', 'info', 'log', 'debug'].forEach(method => {
            this.originalConsole[method] = console[method];
        });
        
        // Hook console methods
        this.hookConsoleMethod('error', passthrough);
        this.hookConsoleMethod('warn', passthrough);
        this.hookConsoleMethod('info', passthrough);
        this.hookConsoleMethod('log', passthrough);
        this.hookConsoleMethod('debug', passthrough);
        
        this.isCapturing = true;
        this.startTime = performance.now();
        
        console.log('[LogReader] Started capturing console output');
    }
    
    /**
     * Hook a specific console method
     * @private
     */
    hookConsoleMethod(method, passthrough) {
        const original = this.originalConsole[method];
        const self = this;
        
        console[method] = function(...args) {
            // Create log entry
            const entry = {
                type: method,
                severity: self.severityLevels[method],
                timestamp: new Date().toISOString(),
                timeOffset: performance.now() - self.startTime,
                message: args.map(arg => {
                    if (typeof arg === 'object') {
                        try {
                            return JSON.stringify(arg);
                        } catch (e) {
                            return String(arg);
                        }
                    }
                    return String(arg);
                }).join(' '),
                args: args
            };
            
            // Parse structured data
            self.parseLogEntry(entry);
            
            // Store log entry
            self.addLogEntry(entry);
            
            // Passthrough to original console
            if (passthrough) {
                original.apply(console, args);
            }
        };
    }
    
    /**
     * Parse structured data from log message
     * @private
     */
    parseLogEntry(entry) {
        const msg = entry.message;
        
        // Extract FPS data
        const fpsMatch = msg.match(this.patterns.fps);
        if (fpsMatch) {
            entry.structured = entry.structured || {};
            entry.structured.fps = parseInt(fpsMatch[1], 10);
        }
        
        // Extract WebGL state
        const webglMatch = msg.match(this.patterns.webgl);
        if (webglMatch) {
            entry.structured = entry.structured || {};
            entry.structured.webgl = webglMatch[1] || 'mentioned';
        }
        
        // Extract manager initialization
        const managerMatch = msg.match(this.patterns.manager);
        if (managerMatch) {
            entry.structured = entry.structured || {};
            entry.structured.manager = {
                name: managerMatch[1],
                status: managerMatch[2]
            };
        }
        
        // Extract timing information
        const timingMatch = msg.match(this.patterns.timing);
        if (timingMatch) {
            entry.structured = entry.structured || {};
            entry.structured.timing = parseFloat(timingMatch[1]);
        }
        
        // Extract error location
        if (entry.type === 'error') {
            const errorLineMatch = msg.match(this.patterns.error_line);
            if (errorLineMatch) {
                entry.structured = entry.structured || {};
                entry.structured.location = {
                    file: errorLineMatch[1],
                    line: parseInt(errorLineMatch[2], 10),
                    column: parseInt(errorLineMatch[3], 10)
                };
            }
        }
        
        // Extract memory information
        const memoryMatch = msg.match(this.patterns.memory);
        if (memoryMatch) {
            entry.structured = entry.structured || {};
            entry.structured.memory = {
                value: parseFloat(memoryMatch[1]),
                unit: memoryMatch[2]
            };
        }
    }
    
    /**
     * Add log entry with overflow management
     * @private
     */
    addLogEntry(entry) {
        this.logs.push(entry);
        this.stats.total++;
        this.stats[entry.type]++;
        
        // Trim old entries if over limit
        if (this.logs.length > this.maxLogEntries) {
            const removed = this.logs.shift();
            this.stats[removed.type]--;
            this.stats.total--;
        }
    }
    
    /**
     * Stop capturing console output
     * Restores original console methods
     */
    stopCapture() {
        if (!this.isCapturing) {
            console.warn('[LogReader] Not currently capturing');
            return;
        }
        
        // Restore original console methods
        ['error', 'warn', 'info', 'log', 'debug'].forEach(method => {
            console[method] = this.originalConsole[method];
        });
        
        this.isCapturing = false;
        
        console.log('[LogReader] Stopped capturing console output', {
            totalLogs: this.logs.length,
            errors: this.stats.error,
            warnings: this.stats.warn
        });
    }
    
    /**
     * Get logs filtered by criteria
     * 
     * @param {Object} filter - Filter options
     * @param {string|Array<string>} filter.type - Log type(s) to include
     * @param {string} filter.severity - Minimum severity level
     * @param {RegExp|string} filter.pattern - Message pattern to match
     * @param {number} filter.since - Timestamp offset to filter from
     * @param {number} filter.limit - Maximum number of logs to return
     * @returns {Array<Object>} Filtered log entries
     */
    getLogs(filter = {}) {
        let filtered = this.logs;
        
        // Filter by type
        if (filter.type) {
            const types = Array.isArray(filter.type) ? filter.type : [filter.type];
            filtered = filtered.filter(log => types.includes(log.type));
        }
        
        // Filter by severity
        if (filter.severity) {
            const minSeverity = this.severityLevels[filter.severity];
            if (minSeverity !== undefined) {
                filtered = filtered.filter(log => log.severity >= minSeverity);
            }
        }
        
        // Filter by pattern
        if (filter.pattern) {
            const pattern = filter.pattern instanceof RegExp 
                ? filter.pattern 
                : new RegExp(filter.pattern, 'i');
            filtered = filtered.filter(log => pattern.test(log.message));
        }
        
        // Filter by time
        if (filter.since !== undefined) {
            filtered = filtered.filter(log => log.timeOffset >= filter.since);
        }
        
        // Limit results
        if (filter.limit) {
            filtered = filtered.slice(-filter.limit);
        }
        
        return filtered;
    }
    
    /**
     * Get errors only
     * @param {number} limit - Maximum number of errors to return
     * @returns {Array<Object>} Error log entries
     */
    getErrors(limit) {
        return this.getLogs({ type: 'error', limit });
    }
    
    /**
     * Get warnings only
     * @param {number} limit - Maximum number of warnings to return
     * @returns {Array<Object>} Warning log entries
     */
    getWarnings(limit) {
        return this.getLogs({ type: 'warn', limit });
    }
    
    /**
     * Search logs by pattern
     * @param {string|RegExp} pattern - Search pattern
     * @param {Object} options - Search options (same as getLogs filter)
     * @returns {Array<Object>} Matching log entries
     */
    search(pattern, options = {}) {
        return this.getLogs({ ...options, pattern });
    }
    
    /**
     * Assert no errors occurred
     * @param {Object} options - Assertion options
     * @param {string} options.pattern - Only consider errors matching this pattern
     * @param {number} options.since - Only consider errors after this time offset
     * @returns {Object} Assertion result with pass/fail status
     */
    assertNoErrors(options = {}) {
        const errors = this.getLogs({ 
            type: 'error', 
            pattern: options.pattern,
            since: options.since
        });
        
        return {
            pass: errors.length === 0,
            errorCount: errors.length,
            errors: errors.map(e => ({
                message: e.message,
                timestamp: e.timestamp
            }))
        };
    }
    
    /**
     * Assert specific log pattern exists
     * @param {string|RegExp} pattern - Pattern to search for
     * @param {Object} options - Search options
     * @returns {Object} Assertion result
     */
    assertLogExists(pattern, options = {}) {
        const matches = this.search(pattern, options);
        
        return {
            pass: matches.length > 0,
            matchCount: matches.length,
            matches: matches.slice(0, 5).map(m => ({
                message: m.message,
                timestamp: m.timestamp
            }))
        };
    }
    
    /**
     * Assert warning count is within threshold
     * @param {number} maxWarnings - Maximum acceptable warnings
     * @param {Object} options - Filter options
     * @returns {Object} Assertion result
     */
    assertWarningCount(maxWarnings, options = {}) {
        const warnings = this.getLogs({ ...options, type: 'warn' });
        
        return {
            pass: warnings.length <= maxWarnings,
            warningCount: warnings.length,
            maxWarnings,
            warnings: warnings.slice(-10).map(w => ({
                message: w.message,
                timestamp: w.timestamp
            }))
        };
    }
    
    /**
     * Get statistics summary
     * @returns {Object} Statistics object
     */
    getStats() {
        return {
            ...this.stats,
            captureTime: this.startTime ? performance.now() - this.startTime : 0,
            isCapturing: this.isCapturing
        };
    }
    
    /**
     * Generate detailed report
     * @returns {Object} Comprehensive report with logs, stats, and analysis
     */
    generateReport() {
        const report = {
            generatedAt: new Date().toISOString(),
            captureTime: this.startTime ? performance.now() - this.startTime : 0,
            statistics: this.getStats(),
            summary: {
                hasErrors: this.stats.error > 0,
                hasWarnings: this.stats.warn > 0,
                totalMessages: this.logs.length
            },
            errors: this.getErrors(50),
            warnings: this.getWarnings(50),
            recentLogs: this.logs.slice(-100)
        };
        
        // Add structured data analysis
        report.analysis = this.analyzeStructuredData();
        
        return report;
    }
    
    /**
     * Analyze structured data from logs
     * @private
     */
    analyzeStructuredData() {
        const analysis = {
            fpsReadings: [],
            webglEvents: [],
            managerStatus: [],
            timings: []
        };
        
        this.logs.forEach(log => {
            if (log.structured) {
                if (log.structured.fps !== undefined) {
                    analysis.fpsReadings.push({
                        fps: log.structured.fps,
                        timestamp: log.timestamp
                    });
                }
                
                if (log.structured.webgl) {
                    analysis.webglEvents.push({
                        status: log.structured.webgl,
                        timestamp: log.timestamp
                    });
                }
                
                if (log.structured.manager) {
                    analysis.managerStatus.push({
                        ...log.structured.manager,
                        timestamp: log.timestamp
                    });
                }
                
                if (log.structured.timing !== undefined) {
                    analysis.timings.push({
                        duration: log.structured.timing,
                        message: log.message.substring(0, 100),
                        timestamp: log.timestamp
                    });
                }
            }
        });
        
        // Calculate FPS statistics
        if (analysis.fpsReadings.length > 0) {
            const fpsValues = analysis.fpsReadings.map(r => r.fps);
            analysis.fpsStats = {
                min: Math.min(...fpsValues),
                max: Math.max(...fpsValues),
                average: fpsValues.reduce((a, b) => a + b, 0) / fpsValues.length,
                samples: fpsValues.length
            };
        }
        
        return analysis;
    }
    
    /**
     * Clear all captured logs
     * @param {boolean} resetStats - Whether to reset statistics (default: false)
     */
    clearLogs(resetStats = false) {
        const count = this.logs.length;
        this.logs = [];
        
        if (resetStats) {
            this.stats = {
                total: 0,
                error: 0,
                warn: 0,
                info: 0,
                log: 0,
                debug: 0
            };
            this.startTime = performance.now();
        }
        
        console.log('[LogReader] Cleared logs:', count);
    }
    
    /**
     * Export logs as JSON
     * @param {Object} filter - Filter options (same as getLogs)
     * @returns {string} JSON string of filtered logs
     */
    exportJSON(filter = {}) {
        const logs = this.getLogs(filter);
        return JSON.stringify({
            exportedAt: new Date().toISOString(),
            statistics: this.getStats(),
            logs
        }, null, 2);
    }
}
