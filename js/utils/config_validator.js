/**
 * ConfigValidator - Pure vanilla JS JSON Schema Draft 7 validator
 * 
 * Validates configuration objects against JSON Schema definitions.
 * Supports: required, type, enum, minimum, maximum, minItems, maxItems, 
 * pattern, const, $ref, definitions, properties, patternProperties, 
 * additionalProperties, minProperties, minLength
 * 
 * Usage:
 *   const validator = new ConfigValidator();
 *   const result = validator.validateConfig(configObject, schemaObject);
 *   if (!result.valid) {
 *     console.error(validator.formatErrorMessage(result.errors));
 *   }
 */

class ConfigValidator {
    constructor() {
        this.resolvedRefs = new Map(); // Cache for resolved $ref definitions
    }

    /**
     * Validates a config object against a schema
     * @param {Object} configObject - The configuration to validate
     * @param {Object} schemaObject - The JSON Schema to validate against
     * @returns {Object} {valid: boolean, errors: Array}
     */
    validateConfig(configObject, schemaObject) {
        this.resolvedRefs.clear(); // Reset cache
        const errors = [];
        this._validate(configObject, schemaObject, '', errors);
        return {
            valid: errors.length === 0,
            errors: errors
        };
    }

    /**
     * Validates a species object against the species schema
     * @param {Object} speciesObject - The species configuration to validate
     * @param {Object} schemaObject - The species JSON Schema
     * @returns {Object} {valid: boolean, errors: Array}
     */
    validateSpecies(speciesObject, schemaObject) {
        return this.validateConfig(speciesObject, schemaObject);
    }

    /**
     * Formats validation errors into a human-readable string
     * @param {Array} errors - Array of error objects from validation
     * @returns {string} Formatted error message
     */
    formatErrorMessage(errors) {
        if (!errors || errors.length === 0) {
            return 'No errors';
        }

        let message = 'Config validation failed:\n';
        errors.forEach(error => {
            message += `- ${error.path || 'root'}: ${error.message}\n`;
        });
        return message;
    }

    /**
     * Internal validation method - recursively validates object structure
     * @private
     */
    _validate(value, schema, path, errors, rootSchema) {
        // Use rootSchema for $ref resolution, default to schema if not provided
        if (!rootSchema) {
            rootSchema = schema;
        }

        // Handle $ref first - resolve and validate against referenced schema
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

        // Const validation (check before type to handle integer vs number edge case)
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
                return; // Stop validation if type is wrong
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

    /**
     * Validates type matching
     * @private
     */
    _validateType(value, schemaType, path, errors) {
        const actualType = this._getType(value);
        const types = Array.isArray(schemaType) ? schemaType : [schemaType];

        // Handle null as a special type
        if (types.includes('null') && value === null) {
            return true;
        }

        // Check if actual type matches any allowed type
        const typeMatch = types.some(t => {
            if (t === 'integer') {
                return Number.isInteger(value);
            }
            if (t === 'number') {
                // Number type accepts both integers and non-integers
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

    /**
     * Validates string constraints
     * @private
     */
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

    /**
     * Validates number constraints
     * @private
     */
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

    /**
     * Validates array constraints
     * @private
     */
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

        // Validate array items
        if (schema.items) {
            value.forEach((item, index) => {
                const itemPath = `${path}[${index}]`;
                this._validate(item, schema.items, itemPath, errors, rootSchema);
            });
        }
    }

    /**
     * Validates object constraints
     * @private
     */
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

    /**
     * Resolves $ref references to their definitions
     * @private
     */
    _resolveRef(ref, rootSchema) {
        // Check cache first
        if (this.resolvedRefs.has(ref)) {
            return this.resolvedRefs.get(ref);
        }

        // Only handle internal references starting with #/
        if (!ref.startsWith('#/')) {
            return null;
        }

        // Parse the reference path
        const path = ref.substring(2).split('/'); // Remove '#/' and split
        let current = rootSchema;

        // Navigate to the definition
        for (const segment of path) {
            if (current && typeof current === 'object' && segment in current) {
                current = current[segment];
            } else {
                return null;
            }
        }

        // Cache the resolved reference
        this.resolvedRefs.set(ref, current);
        return current;
    }

    /**
     * Gets the JSON Schema type of a value
     * @private
     */
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

// Make ConfigValidator available globally
if (typeof window !== 'undefined') {
    window.ConfigValidator = ConfigValidator;
}
