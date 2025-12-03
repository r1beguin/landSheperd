#!/usr/bin/env node

/**
 * Land Shepherd Config Validation CLI Tool
 * 
 * Validates config.json and all species/*.json files against their schemas.
 * Exit code 0 on success, 1 on failure (CI-friendly).
 * 
 * Usage:
 *   node scripts/validate-config.js
 *   npm run validate:config
 */

const fs = require('fs');
const path = require('path');

// ANSI color codes for terminal output
const colors = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    cyan: '\x1b[36m',
    gray: '\x1b[90m'
};

/**
 * ConfigValidator - Node.js adapted from js/utils/config_validator.js
 * Pure vanilla JS JSON Schema Draft 7 validator
 */
class ConfigValidator {
    constructor() {
        this.resolvedRefs = new Map();
    }

    validateConfig(configObject, schemaObject) {
        this.resolvedRefs.clear();
        const errors = [];
        this._validate(configObject, schemaObject, '', errors);
        return {
            valid: errors.length === 0,
            errors: errors
        };
    }

    validateSpecies(speciesObject, schemaObject) {
        return this.validateConfig(speciesObject, schemaObject);
    }

    formatErrorMessage(errors) {
        if (!errors || errors.length === 0) {
            return 'No errors';
        }

        let message = '';
        errors.forEach((error, index) => {
            message += `  ${colors.red}- ${error.path || 'root'}: ${error.message}${colors.reset}\n`;
        });
        return message;
    }

    _validate(value, schema, path, errors, rootSchema) {
        if (!rootSchema) {
            rootSchema = schema;
        }

        // Handle $ref first
        if (schema.$ref) {
            const resolvedSchema = this._resolveRef(schema.$ref, rootSchema);
            if (resolvedSchema) {
                this._validate(value, resolvedSchema, path, errors, rootSchema);
                return;
            } else {
                errors.push({
                    path: path,
                    message: `Unable to resolve $ref: ${schema.$ref}`
                });
                return;
            }
        }

        // Const validation
        if (schema.hasOwnProperty('const')) {
            if (value !== schema.const) {
                errors.push({
                    path: path,
                    message: `must equal ${schema.const} (got: ${JSON.stringify(value)})`
                });
                return;
            }
        }

        // Type validation
        if (schema.type) {
            if (!this._validateType(value, schema.type, path, errors)) {
                return;
            }
        }

        // Enum validation
        if (schema.enum) {
            if (!schema.enum.includes(value)) {
                const customMessage = schema.errorMessage || 
                    `must be one of: ${schema.enum.join(', ')} (got: ${JSON.stringify(value)})`;
                errors.push({
                    path: path,
                    message: customMessage
                });
                return;
            }
        }

        // Type-specific validations
        const actualType = this._getType(value);

        if (actualType === 'string') {
            this._validateString(value, schema, path, errors);
        } else if (actualType === 'number' || actualType === 'integer') {
            this._validateNumber(value, schema, path, errors);
        } else if (actualType === 'array') {
            this._validateArray(value, schema, path, errors, rootSchema);
        } else if (actualType === 'object') {
            this._validateObject(value, schema, path, errors, rootSchema);
        }
    }

    _validateType(value, schemaType, path, errors) {
        const actualType = this._getType(value);
        const types = Array.isArray(schemaType) ? schemaType : [schemaType];

        if (types.includes('null') && value === null) {
            return true;
        }

        const typeMatch = types.some(t => {
            if (t === 'integer') {
                return Number.isInteger(value);
            }
            if (t === 'number') {
                return typeof value === 'number' && !isNaN(value);
            }
            return actualType === t;
        });

        if (!typeMatch) {
            errors.push({
                path: path,
                message: `must be of type ${types.join(' or ')} (got: ${actualType})`
            });
            return false;
        }
        return true;
    }

    _validateString(value, schema, path, errors) {
        if (schema.minLength !== undefined && value.length < schema.minLength) {
            errors.push({
                path: path,
                message: `string length must be >= ${schema.minLength} (got: ${value.length})`
            });
        }

        if (schema.maxLength !== undefined && value.length > schema.maxLength) {
            errors.push({
                path: path,
                message: `string length must be <= ${schema.maxLength} (got: ${value.length})`
            });
        }

        if (schema.pattern) {
            const regex = new RegExp(schema.pattern);
            if (!regex.test(value)) {
                errors.push({
                    path: path,
                    message: `must match pattern ${schema.pattern} (got: ${JSON.stringify(value)})`
                });
            }
        }
    }

    _validateNumber(value, schema, path, errors) {
        if (schema.minimum !== undefined && value < schema.minimum) {
            errors.push({
                path: path,
                message: `must be >= ${schema.minimum} (got: ${value})`
            });
        }

        if (schema.maximum !== undefined && value > schema.maximum) {
            errors.push({
                path: path,
                message: `must be <= ${schema.maximum} (got: ${value})`
            });
        }

        if (schema.exclusiveMinimum !== undefined && value <= schema.exclusiveMinimum) {
            errors.push({
                path: path,
                message: `must be > ${schema.exclusiveMinimum} (got: ${value})`
            });
        }

        if (schema.exclusiveMaximum !== undefined && value >= schema.exclusiveMaximum) {
            errors.push({
                path: path,
                message: `must be < ${schema.exclusiveMaximum} (got: ${value})`
            });
        }
    }

    _validateArray(value, schema, path, errors, rootSchema) {
        if (schema.minItems !== undefined && value.length < schema.minItems) {
            errors.push({
                path: path,
                message: `array must have at least ${schema.minItems} items (got: ${value.length})`
            });
        }

        if (schema.maxItems !== undefined && value.length > schema.maxItems) {
            errors.push({
                path: path,
                message: `array must have at most ${schema.maxItems} items (got: ${value.length})`
            });
        }

        if (schema.items) {
            value.forEach((item, index) => {
                const itemPath = `${path}[${index}]`;
                this._validate(item, schema.items, itemPath, errors, rootSchema);
            });
        }
    }

    _validateObject(value, schema, path, errors, rootSchema) {
        // Required properties
        if (schema.required) {
            schema.required.forEach(requiredProp => {
                if (!(requiredProp in value)) {
                    errors.push({
                        path: path ? `${path}.${requiredProp}` : requiredProp,
                        message: 'is required but missing'
                    });
                }
            });
        }

        // minProperties
        if (schema.minProperties !== undefined) {
            const propCount = Object.keys(value).length;
            if (propCount < schema.minProperties) {
                errors.push({
                    path: path,
                    message: `object must have at least ${schema.minProperties} properties (got: ${propCount})`
                });
            }
        }

        // Properties validation
        if (schema.properties) {
            Object.keys(value).forEach(key => {
                if (schema.properties[key]) {
                    const propPath = path ? `${path}.${key}` : key;
                    this._validate(value[key], schema.properties[key], propPath, errors, rootSchema);
                }
            });
        }

        // Pattern properties validation
        if (schema.patternProperties) {
            Object.keys(value).forEach(key => {
                Object.keys(schema.patternProperties).forEach(pattern => {
                    const regex = new RegExp(pattern);
                    if (regex.test(key)) {
                        const propPath = path ? `${path}.${key}` : key;
                        this._validate(value[key], schema.patternProperties[pattern], propPath, errors, rootSchema);
                    }
                });
            });
        }

        // Additional properties validation
        if (schema.additionalProperties === false && schema.properties) {
            const allowedProps = new Set([
                ...Object.keys(schema.properties),
                ...(schema.required || [])
            ]);
            
            Object.keys(value).forEach(key => {
                if (!allowedProps.has(key)) {
                    errors.push({
                        path: path ? `${path}.${key}` : key,
                        message: 'is not allowed (additionalProperties: false)'
                    });
                }
            });
        }
    }

    _resolveRef(ref, rootSchema) {
        if (this.resolvedRefs.has(ref)) {
            return this.resolvedRefs.get(ref);
        }

        if (!ref.startsWith('#/')) {
            return null;
        }

        const path = ref.substring(2).split('/');
        let current = rootSchema;

        for (const segment of path) {
            if (current && typeof current === 'object' && segment in current) {
                current = current[segment];
            } else {
                return null;
            }
        }

        this.resolvedRefs.set(ref, current);
        return current;
    }

    _getType(value) {
        if (value === null) {
            return 'null';
        }
        if (Array.isArray(value)) {
            return 'array';
        }
        if (typeof value === 'number') {
            return Number.isInteger(value) ? 'integer' : 'number';
        }
        return typeof value;
    }
}

/**
 * Validates a file against a schema
 * @param {string} filePath - Path to file to validate
 * @param {string} schemaPath - Path to schema file
 * @param {string} fileType - Type of file for display (config/species)
 * @returns {Object} {valid: boolean, errors: Array}
 */
function validateFile(filePath, schemaPath, fileType) {
    try {
        // Load files
        const fileContent = fs.readFileSync(filePath, 'utf8');
        const schemaContent = fs.readFileSync(schemaPath, 'utf8');
        
        const fileObject = JSON.parse(fileContent);
        const schemaObject = JSON.parse(schemaContent);
        
        // Validate
        const validator = new ConfigValidator();
        const result = validator.validateConfig(fileObject, schemaObject);
        
        return {
            filePath,
            valid: result.valid,
            errors: result.errors,
            validator
        };
    } catch (error) {
        return {
            filePath,
            valid: false,
            errors: [{
                path: 'file',
                message: error.message
            }],
            validator: null
        };
    }
}

/**
 * Validates all species files in species/ directory
 * @returns {Array} Array of validation results
 */
function validateAllSpecies() {
    const speciesDir = path.join(__dirname, '..', 'species');
    const schemaPath = path.join(__dirname, '..', 'schemas', 'species.schema.json');
    
    try {
        const files = fs.readdirSync(speciesDir);
        const jsonFiles = files.filter(f => f.endsWith('.json'));
        
        return jsonFiles.map(file => {
            const filePath = path.join(speciesDir, file);
            return validateFile(filePath, schemaPath, 'species');
        });
    } catch (error) {
        console.error(`${colors.red}Error reading species directory:${colors.reset}`, error.message);
        return [];
    }
}

/**
 * Main execution
 */
function main() {
    console.log(`${colors.cyan}Land Shepherd Config Validation${colors.reset}\n`);
    
    let totalErrors = 0;
    let totalFiles = 0;
    
    // Validate config.json
    console.log(`Validating ${colors.gray}config.json${colors.reset}...`);
    const configPath = path.join(__dirname, '..', 'config.json');
    const configSchemaPath = path.join(__dirname, '..', 'schemas', 'config.schema.json');
    const configResult = validateFile(configPath, configSchemaPath, 'config');
    totalFiles++;
    
    if (configResult.valid) {
        console.log(`${colors.green}✓${colors.reset} config.json is valid\n`);
    } else {
        console.log(`${colors.red}✗${colors.reset} config.json has errors:`);
        console.log(configResult.validator.formatErrorMessage(configResult.errors));
        totalErrors++;
    }
    
    // Validate all species files
    const speciesResults = validateAllSpecies();
    totalFiles += speciesResults.length;
    
    speciesResults.forEach(result => {
        const fileName = path.basename(result.filePath);
        console.log(`Validating ${colors.gray}species/${fileName}${colors.reset}...`);
        
        if (result.valid) {
            console.log(`${colors.green}✓${colors.reset} species/${fileName} is valid\n`);
        } else {
            console.log(`${colors.red}✗${colors.reset} species/${fileName} has errors:`);
            if (result.validator) {
                console.log(result.validator.formatErrorMessage(result.errors));
            } else {
                result.errors.forEach(error => {
                    console.log(`  ${colors.red}- ${error.path}: ${error.message}${colors.reset}`);
                });
            }
            totalErrors++;
        }
    });
    
    // Summary
    console.log('='.repeat(50));
    if (totalErrors === 0) {
        console.log(`${colors.green}✓ All configuration files valid!${colors.reset}`);
        console.log(`${colors.gray}Validated ${totalFiles} file(s)${colors.reset}`);
        process.exit(0);
    } else {
        console.log(`${colors.red}✗ Validation failed with ${totalErrors} error(s)${colors.reset}`);
        console.log(`${colors.gray}Validated ${totalFiles} file(s)${colors.reset}`);
        process.exit(1);
    }
}

// Run main function
main();
