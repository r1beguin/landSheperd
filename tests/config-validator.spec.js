/**
 * ConfigValidator Validation Test
 * 
 * Validates that the ConfigValidator module:
 * - Loads correctly in the browser
 * - Validates required fields
 * - Validates types (string, number, boolean, array, object)
 * - Validates enums
 * - Validates ranges (minimum, maximum)
 * - Validates patterns (regex)
 * - Supports $ref definitions
 * - Produces clear error messages with property paths
 */

import { test, expect } from '@playwright/test';

test.describe('ConfigValidator Module', () => {
    test('ConfigValidator loads and is accessible', async ({ page }) => {
        await page.goto('/');
        
        // Wait for page load
        await page.waitForLoadState('networkidle');
        
        // Check that ConfigValidator is available
        const isAvailable = await page.evaluate(() => {
            return typeof window.ConfigValidator !== 'undefined';
        });
        
        expect(isAvailable).toBe(true);
    });

    test('Validates required fields', async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');
        
        const result = await page.evaluate(() => {
            const validator = new window.ConfigValidator();
            
            const schema = {
                type: 'object',
                required: ['name', 'age'],
                properties: {
                    name: { type: 'string' },
                    age: { type: 'integer' }
                }
            };
            
            // Missing 'age' field
            const invalidConfig = {
                name: 'Test'
            };
            
            return validator.validateConfig(invalidConfig, schema);
        });
        
        expect(result.valid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
        expect(result.errors[0].path).toBe('age');
        expect(result.errors[0].message).toContain('required');
    });

    test('Validates types correctly', async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');
        
        const result = await page.evaluate(() => {
            const validator = new window.ConfigValidator();
            
            const schema = {
                type: 'object',
                properties: {
                    name: { type: 'string' },
                    age: { type: 'integer' },
                    active: { type: 'boolean' },
                    tags: { type: 'array' },
                    settings: { type: 'object' }
                }
            };
            
            // Invalid types
            const invalidConfig = {
                name: 123,  // Should be string
                age: 'twenty',  // Should be integer
                active: 'yes',  // Should be boolean
                tags: 'tag1,tag2',  // Should be array
                settings: []  // Should be object
            };
            
            return validator.validateConfig(invalidConfig, schema);
        });
        
        expect(result.valid).toBe(false);
        expect(result.errors.length).toBe(5);
    });

    test('Validates enum values', async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');
        
        const result = await page.evaluate(() => {
            const validator = new window.ConfigValidator();
            
            const schema = {
                type: 'object',
                properties: {
                    category: {
                        type: 'string',
                        enum: ['herb', 'tree', 'groundcover']
                    }
                }
            };
            
            const invalidConfig = {
                category: 'shrub'  // Not in enum
            };
            
            return validator.validateConfig(invalidConfig, schema);
        });
        
        expect(result.valid).toBe(false);
        expect(result.errors[0].path).toBe('category');
        expect(result.errors[0].message).toContain('herb, tree, groundcover');
    });

    test('Validates number ranges', async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');
        
        const result = await page.evaluate(() => {
            const validator = new window.ConfigValidator();
            
            const schema = {
                type: 'object',
                properties: {
                    width: {
                        type: 'integer',
                        minimum: 10,
                        maximum: 200
                    },
                    opacity: {
                        type: 'number',
                        minimum: 0,
                        maximum: 1
                    }
                }
            };
            
            const invalidConfig = {
                width: 5,  // Below minimum
                opacity: 1.5  // Above maximum
            };
            
            return validator.validateConfig(invalidConfig, schema);
        });
        
        expect(result.valid).toBe(false);
        expect(result.errors.length).toBe(2);
        expect(result.errors[0].message).toContain('>=');
        expect(result.errors[1].message).toContain('<=');
    });

    test('Validates array constraints', async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');
        
        const result = await page.evaluate(() => {
            const validator = new window.ConfigValidator();
            
            const schema = {
                type: 'object',
                properties: {
                    color: {
                        type: 'array',
                        items: {
                            type: 'number',
                            minimum: 0,
                            maximum: 1
                        },
                        minItems: 4,
                        maxItems: 4
                    }
                }
            };
            
            const invalidConfig = {
                color: [0.5, 0.5, 0.5]  // Too few items
            };
            
            return validator.validateConfig(invalidConfig, schema);
        });
        
        expect(result.valid).toBe(false);
        expect(result.errors[0].message).toContain('at least 4 items');
    });

    test('Validates string patterns', async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');
        
        const result = await page.evaluate(() => {
            const validator = new window.ConfigValidator();
            
            const schema = {
                type: 'object',
                properties: {
                    id: {
                        type: 'string',
                        pattern: '^[a-z][a-z0-9_]*$'
                    }
                }
            };
            
            const invalidConfig = {
                id: 'Invalid-ID-123'  // Contains invalid characters
            };
            
            return validator.validateConfig(invalidConfig, schema);
        });
        
        expect(result.valid).toBe(false);
        expect(result.errors[0].message).toContain('pattern');
    });

    test('Supports $ref definitions', async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');
        
        const result = await page.evaluate(() => {
            const validator = new window.ConfigValidator();
            
            const schema = {
                type: 'object',
                properties: {
                    fertility: {
                        $ref: '#/definitions/proceduralProperty'
                    },
                    water: {
                        $ref: '#/definitions/proceduralProperty'
                    }
                },
                definitions: {
                    proceduralProperty: {
                        type: 'object',
                        required: ['hotspots', 'baseValue'],
                        properties: {
                            hotspots: { type: 'integer', minimum: 0, maximum: 50 },
                            baseValue: { type: 'number', minimum: 0, maximum: 100 }
                        }
                    }
                }
            };
            
            // Valid config using $ref
            const validConfig = {
                fertility: {
                    hotspots: 5,
                    baseValue: 50
                },
                water: {
                    hotspots: 3,
                    baseValue: 40
                }
            };
            
            const result1 = validator.validateConfig(validConfig, schema);
            
            // Invalid config - missing required field in $ref
            const invalidConfig = {
                fertility: {
                    hotspots: 5
                    // Missing baseValue
                },
                water: {
                    hotspots: 3,
                    baseValue: 40
                }
            };
            
            const result2 = validator.validateConfig(invalidConfig, schema);
            
            return {
                valid: result1.valid,
                validErrors: result1.errors,
                invalid: result2.valid,
                errors: result2.errors
            };
        });
        
        console.log('$ref test results:', JSON.stringify(result, null, 2));
        
        expect(result.valid).toBe(true);
        expect(result.invalid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
    });

    test('Validates nested objects', async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');
        
        const result = await page.evaluate(() => {
            const validator = new window.ConfigValidator();
            
            const schema = {
                type: 'object',
                properties: {
                    world: {
                        type: 'object',
                        properties: {
                            map: {
                                type: 'object',
                                required: ['gridWidth', 'gridHeight'],
                                properties: {
                                    gridWidth: { type: 'integer', minimum: 10, maximum: 200 },
                                    gridHeight: { type: 'integer', minimum: 10, maximum: 200 }
                                }
                            }
                        }
                    }
                }
            };
            
            const invalidConfig = {
                world: {
                    map: {
                        gridWidth: 5  // Below minimum
                        // Missing gridHeight
                    }
                }
            };
            
            return validator.validateConfig(invalidConfig, schema);
        });
        
        expect(result.valid).toBe(false);
        expect(result.errors.length).toBe(2);
        
        // Check error paths
        const paths = result.errors.map(e => e.path);
        expect(paths).toContain('world.map.gridWidth');
        expect(paths).toContain('world.map.gridHeight');
    });

    test('Formats error messages correctly', async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');
        
        const formattedMessage = await page.evaluate(() => {
            const validator = new window.ConfigValidator();
            
            const schema = {
                type: 'object',
                required: ['name', 'age'],
                properties: {
                    name: { type: 'string' },
                    age: { type: 'integer', minimum: 0, maximum: 150 }
                }
            };
            
            const invalidConfig = {
                name: 123,
                age: 200
            };
            
            const result = validator.validateConfig(invalidConfig, schema);
            return validator.formatErrorMessage(result.errors);
        });
        
        expect(formattedMessage).toContain('Config validation failed:');
        expect(formattedMessage).toContain('name:');
        expect(formattedMessage).toContain('age:');
        expect(formattedMessage).toContain('<=');
    });

    test('Validates const values', async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');
        
        const result = await page.evaluate(() => {
            const validator = new window.ConfigValidator();
            
            const schema = {
                type: 'object',
                properties: {
                    pause: {
                        type: 'number',
                        const: 0
                    }
                }
            };
            
            const invalidConfig = {
                pause: 1  // Must be exactly 0
            };
            
            return validator.validateConfig(invalidConfig, schema);
        });
        
        expect(result.valid).toBe(false);
        expect(result.errors[0].message).toContain('must equal 0');
    });

    test('Handles null types', async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');
        
        const result = await page.evaluate(() => {
            const validator = new window.ConfigValidator();
            
            const schema = {
                type: 'object',
                properties: {
                    seed: {
                        type: ['integer', 'null']
                    }
                }
            };
            
            const validConfig1 = { seed: 12345 };
            const validConfig2 = { seed: null };
            const invalidConfig = { seed: 'random' };
            
            return {
                result1: validator.validateConfig(validConfig1, schema),
                result2: validator.validateConfig(validConfig2, schema),
                result3: validator.validateConfig(invalidConfig, schema)
            };
        });
        
        expect(result.result1.valid).toBe(true);
        expect(result.result2.valid).toBe(true);
        expect(result.result3.valid).toBe(false);
    });

    test('Real config.json validation example', async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');
        
        const result = await page.evaluate(async () => {
            const validator = new window.ConfigValidator();
            
            // Load actual schemas and config in browser context
            const configSchemaResp = await fetch('/schemas/config.schema.json');
            const configSchema = await configSchemaResp.json();
            
            const configResp = await fetch('/config.json');
            const config = await configResp.json();
            
            return validator.validateConfig(config, configSchema);
        });
        
        // Our actual config.json should be valid
        if (!result.valid) {
            console.log('Config validation errors:', result.errors);
        }
        expect(result.valid).toBe(true);
    });

    test('Real species validation example', async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');
        
        const result = await page.evaluate(async () => {
            const validator = new window.ConfigValidator();
            
            // Load species schema in browser context
            const speciesSchemaResp = await fetch('/schemas/species.schema.json');
            const speciesSchema = await speciesSchemaResp.json();
            
            // Load a species file (e.g., nettles.json)
            const speciesResp = await fetch('/species/nettles.json');
            const species = await speciesResp.json();
            
            return validator.validateSpecies(species, speciesSchema);
        });
        
        // Our actual species files should be valid
        if (!result.valid) {
            console.log('Species validation errors:', result.errors);
        }
        expect(result.valid).toBe(true);
    });
});

test.describe('ConfigValidator Console Test', () => {
    test('Runs test suite without errors', async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');
        
        // Inject and run the test suite
        const testScript = await require('fs').promises.readFile(
            'tests/config-validator-test.js', 
            'utf-8'
        );
        
        const consoleMessages = [];
        page.on('console', msg => {
            consoleMessages.push(msg.text());
        });
        
        await page.evaluate(testScript);
        
        // Wait a bit for console output
        await page.waitForTimeout(500);
        
        // Check that test suite ran
        const output = consoleMessages.join('\n');
        expect(output).toContain('ConfigValidator Test Suite');
        expect(output).toContain('Test Suite Complete');
        expect(output).toContain('ConfigValidator is working correctly');
    });
});
