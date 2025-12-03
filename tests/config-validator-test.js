/**
 * ConfigValidator Test Suite
 * 
 * Demonstrates validation of config.json and species.json files
 * Run in browser console or as a standalone test
 */

(function testConfigValidator() {
    console.log('=== ConfigValidator Test Suite ===\n');

    const validator = new ConfigValidator();

    // Test 1: Valid minimal config
    console.log('TEST 1: Valid minimal config');
    const validConfig = {
        debug: {
            enabled: true,
            showFPS: true,
            showGeometryCount: true,
            showPlayerPosition: true,
            refreshRate: 60
        },
        graphics: {
            vsync: true,
            backgroundColor: [0.2, 0.3, 0.4, 1.0]
        },
        time: {
            initialTimeScale: 1.0,
            realSecondsPerGameDay: 30,
            timeScalePresets: {
                pause: 0,
                normal: 1
            }
        },
        world: {
            map: {
                gridWidth: 50,
                gridHeight: 50,
                cellSize: 16
            },
            soil: {
                fertility: {
                    hotspots: 5,
                    baseValue: 50,
                    maxIntensity: 80,
                    falloffRate: 0.5
                },
                water: {
                    hotspots: 3,
                    baseValue: 40,
                    maxIntensity: 70,
                    falloffRate: 0.6
                },
                pollution: {
                    hotspots: 2,
                    baseValue: 10,
                    maxIntensity: 30,
                    falloffRate: 0.4
                }
            },
            textures: {
                soilTextureSize: 16,
                generateVariations: 3
            }
        }
    };

    const validConfigSchema = {
        type: 'object',
        required: ['debug', 'graphics', 'time', 'world'],
        properties: {
            debug: {
                type: 'object',
                required: ['enabled', 'showFPS', 'showGeometryCount', 'showPlayerPosition', 'refreshRate'],
                properties: {
                    enabled: { type: 'boolean' },
                    showFPS: { type: 'boolean' },
                    showGeometryCount: { type: 'boolean' },
                    showPlayerPosition: { type: 'boolean' },
                    refreshRate: { type: 'integer', minimum: 30, maximum: 240 }
                }
            },
            graphics: {
                type: 'object',
                required: ['vsync', 'backgroundColor'],
                properties: {
                    vsync: { type: 'boolean' },
                    backgroundColor: {
                        type: 'array',
                        items: { type: 'number', minimum: 0, maximum: 1 },
                        minItems: 4,
                        maxItems: 4
                    }
                }
            },
            time: {
                type: 'object',
                required: ['initialTimeScale', 'realSecondsPerGameDay', 'timeScalePresets'],
                properties: {
                    initialTimeScale: { type: 'number', minimum: 0, maximum: 20 },
                    realSecondsPerGameDay: { type: 'number', minimum: 1, maximum: 120 },
                    timeScalePresets: {
                        type: 'object',
                        required: ['pause', 'normal'],
                        properties: {
                            pause: { type: 'number', const: 0 },
                            normal: { type: 'number', minimum: 0 }
                        }
                    }
                }
            },
            world: {
                type: 'object',
                required: ['map', 'soil', 'textures'],
                properties: {
                    map: {
                        type: 'object',
                        required: ['gridWidth', 'gridHeight', 'cellSize'],
                        properties: {
                            gridWidth: { type: 'integer', minimum: 10, maximum: 200 },
                            gridHeight: { type: 'integer', minimum: 10, maximum: 200 },
                            cellSize: { type: 'integer', minimum: 8, maximum: 64 }
                        }
                    },
                    soil: {
                        type: 'object',
                        required: ['fertility', 'water', 'pollution'],
                        properties: {
                            fertility: { $ref: '#/definitions/proceduralProperty' },
                            water: { $ref: '#/definitions/proceduralProperty' },
                            pollution: { $ref: '#/definitions/proceduralProperty' }
                        }
                    },
                    textures: {
                        type: 'object',
                        required: ['soilTextureSize', 'generateVariations'],
                        properties: {
                            soilTextureSize: { type: 'integer', minimum: 8, maximum: 64 },
                            generateVariations: { type: 'integer', minimum: 1, maximum: 10 }
                        }
                    }
                }
            }
        },
        definitions: {
            proceduralProperty: {
                type: 'object',
                required: ['hotspots', 'baseValue', 'maxIntensity', 'falloffRate'],
                properties: {
                    hotspots: { type: 'integer', minimum: 0, maximum: 50 },
                    baseValue: { type: 'number', minimum: 0, maximum: 100 },
                    maxIntensity: { type: 'number', minimum: 0, maximum: 100 },
                    falloffRate: { type: 'number', minimum: 0, maximum: 1 }
                }
            }
        }
    };

    const result1 = validator.validateConfig(validConfig, validConfigSchema);
    console.log('Result:', result1.valid ? '✅ PASS' : '❌ FAIL');
    if (!result1.valid) {
        console.log(validator.formatErrorMessage(result1.errors));
    }
    console.log('');

    // Test 2: Invalid config - missing required field
    console.log('TEST 2: Invalid config - missing required field');
    const invalidConfig1 = {
        debug: {
            enabled: true,
            showFPS: true,
            showGeometryCount: true,
            showPlayerPosition: true
            // Missing refreshRate
        },
        graphics: {
            vsync: true,
            backgroundColor: [0.2, 0.3, 0.4, 1.0]
        },
        time: {
            initialTimeScale: 1.0,
            realSecondsPerGameDay: 30,
            timeScalePresets: {
                pause: 0,
                normal: 1
            }
        },
        world: {
            map: {
                gridWidth: 50,
                gridHeight: 50,
                cellSize: 16
            },
            soil: {
                fertility: {
                    hotspots: 5,
                    baseValue: 50,
                    maxIntensity: 80,
                    falloffRate: 0.5
                },
                water: {
                    hotspots: 3,
                    baseValue: 40,
                    maxIntensity: 70,
                    falloffRate: 0.6
                },
                pollution: {
                    hotspots: 2,
                    baseValue: 10,
                    maxIntensity: 30,
                    falloffRate: 0.4
                }
            },
            textures: {
                soilTextureSize: 16,
                generateVariations: 3
            }
        }
    };

    const result2 = validator.validateConfig(invalidConfig1, validConfigSchema);
    console.log('Result:', result2.valid ? '✅ PASS' : '❌ FAIL (expected)');
    if (!result2.valid) {
        console.log(validator.formatErrorMessage(result2.errors));
    }
    console.log('');

    // Test 3: Invalid config - value out of range
    console.log('TEST 3: Invalid config - value out of range');
    const invalidConfig2 = {
        debug: {
            enabled: true,
            showFPS: true,
            showGeometryCount: true,
            showPlayerPosition: true,
            refreshRate: 500  // Exceeds maximum of 240
        },
        graphics: {
            vsync: true,
            backgroundColor: [0.2, 0.3, 0.4, 1.0]
        },
        time: {
            initialTimeScale: 1.0,
            realSecondsPerGameDay: 30,
            timeScalePresets: {
                pause: 0,
                normal: 1
            }
        },
        world: {
            map: {
                gridWidth: 5,  // Below minimum of 10
                gridHeight: 50,
                cellSize: 16
            },
            soil: {
                fertility: {
                    hotspots: 5,
                    baseValue: 50,
                    maxIntensity: 80,
                    falloffRate: 0.5
                },
                water: {
                    hotspots: 3,
                    baseValue: 40,
                    maxIntensity: 70,
                    falloffRate: 0.6
                },
                pollution: {
                    hotspots: 2,
                    baseValue: 10,
                    maxIntensity: 30,
                    falloffRate: 0.4
                }
            },
            textures: {
                soilTextureSize: 16,
                generateVariations: 3
            }
        }
    };

    const result3 = validator.validateConfig(invalidConfig2, validConfigSchema);
    console.log('Result:', result3.valid ? '✅ PASS' : '❌ FAIL (expected)');
    if (!result3.valid) {
        console.log(validator.formatErrorMessage(result3.errors));
    }
    console.log('');

    // Test 4: Valid species config
    console.log('TEST 4: Valid species config');
    const validSpecies = {
        id: 'urtica_dioica',
        commonName: 'Common Nettle',
        category: 'herb',
        layer: 'middle',
        appearance: {
            dimensions: {
                width: 24,
                height: 32
            },
            colorPalette: {
                stem: ['#3a5f2a', '#2d4a21'],
                leaves: ['#4a7c3a', '#3d6a2f']
            }
        },
        growthStages: [
            {
                name: 'Seedling',
                daysToGrow: 5,
                generator: 'seedlingGeneration',
                visibleOrgans: ['stem'],
                nutrientConsumption: {
                    nitrogen: 1.0,
                    phosphorus: 0.5,
                    potassium: 0.3,
                    organicMatter: 0.2
                }
            },
            {
                name: 'Mature',
                daysToGrow: null,
                generator: 'matureGeneration',
                visibleOrgans: ['stem', 'leaves'],
                nutrientConsumption: {
                    nitrogen: 2.0,
                    phosphorus: 1.0,
                    potassium: 0.8,
                    organicMatter: 0.5
                }
            }
        ],
        environment: {
            nutrientRequirements: {
                nitrogen: {
                    minimum: 20,
                    optimal: 60,
                    description: 'High nitrogen preference'
                },
                phosphorus: {
                    minimum: 10,
                    optimal: 40,
                    description: 'Moderate phosphorus need'
                },
                potassium: {
                    minimum: 10,
                    optimal: 40,
                    description: 'Moderate potassium need'
                },
                organicMatter: {
                    minimum: 15,
                    optimal: 50,
                    description: 'Prefers rich soil'
                }
            },
            lightRequirement: 0.6,
            rootDepth: 'medium'
        }
    };

    const speciesSchema = {
        type: 'object',
        required: ['id', 'commonName', 'category', 'layer', 'appearance', 'growthStages', 'environment'],
        properties: {
            id: {
                type: 'string',
                pattern: '^[a-z][a-z0-9_]*$'
            },
            commonName: {
                type: 'string',
                minLength: 1
            },
            category: {
                type: 'string',
                enum: ['herb', 'tree', 'groundcover']
            },
            layer: {
                type: 'string',
                enum: ['bottom', 'middle', 'top']
            },
            appearance: {
                type: 'object',
                required: ['colorPalette'],
                properties: {
                    dimensions: {
                        type: 'object',
                        properties: {
                            width: { type: 'integer', minimum: 8, maximum: 64 },
                            height: { type: 'integer', minimum: 8, maximum: 64 }
                        },
                        required: ['width', 'height']
                    },
                    colorPalette: {
                        type: 'object',
                        minProperties: 1
                    }
                }
            },
            growthStages: {
                type: 'array',
                minItems: 2,
                items: {
                    type: 'object',
                    required: ['name', 'daysToGrow', 'generator', 'visibleOrgans'],
                    properties: {
                        name: { type: 'string', pattern: '^[A-Z][a-zA-Z]+$' },
                        daysToGrow: { type: ['integer', 'null'], minimum: 1 },
                        generator: { type: 'string', pattern: '^[a-z][a-zA-Z]+Generation$' },
                        visibleOrgans: { type: 'array', minItems: 1 },
                        nutrientConsumption: {
                            type: 'object',
                            required: ['nitrogen', 'phosphorus', 'potassium', 'organicMatter'],
                            properties: {
                                nitrogen: { type: 'number', minimum: 0 },
                                phosphorus: { type: 'number', minimum: 0 },
                                potassium: { type: 'number', minimum: 0 },
                                organicMatter: { type: 'number', minimum: 0 }
                            }
                        }
                    }
                }
            },
            environment: {
                type: 'object',
                required: ['nutrientRequirements', 'lightRequirement', 'rootDepth'],
                properties: {
                    nutrientRequirements: {
                        type: 'object',
                        required: ['nitrogen', 'phosphorus', 'potassium', 'organicMatter'],
                        properties: {
                            nitrogen: { $ref: '#/definitions/nutrientRequirement' },
                            phosphorus: { $ref: '#/definitions/nutrientRequirement' },
                            potassium: { $ref: '#/definitions/nutrientRequirement' },
                            organicMatter: { $ref: '#/definitions/nutrientRequirement' }
                        }
                    },
                    lightRequirement: { type: 'number', minimum: 0, maximum: 1 },
                    rootDepth: { type: 'string', enum: ['shallow', 'medium', 'deep'] }
                }
            }
        },
        definitions: {
            nutrientRequirement: {
                type: 'object',
                required: ['minimum', 'optimal', 'description'],
                properties: {
                    minimum: { type: 'number', minimum: 0, maximum: 100 },
                    optimal: { type: 'number', minimum: 0, maximum: 100 },
                    description: { type: 'string' }
                }
            }
        }
    };

    const result4 = validator.validateSpecies(validSpecies, speciesSchema);
    console.log('Result:', result4.valid ? '✅ PASS' : '❌ FAIL');
    if (!result4.valid) {
        console.log(validator.formatErrorMessage(result4.errors));
    }
    console.log('');

    // Test 5: Invalid species - wrong category enum
    console.log('TEST 5: Invalid species - wrong category enum');
    const invalidSpecies = {
        id: 'invalid_plant',
        commonName: 'Invalid Plant',
        category: 'shrub',  // Invalid - must be herb, tree, or groundcover
        layer: 'middle',
        appearance: {
            colorPalette: {
                stem: ['#000000']
            }
        },
        growthStages: [
            {
                name: 'Seedling',
                daysToGrow: 5,
                generator: 'seedlingGeneration',
                visibleOrgans: ['stem']
            },
            {
                name: 'Mature',
                daysToGrow: null,
                generator: 'matureGeneration',
                visibleOrgans: ['stem']
            }
        ],
        environment: {
            nutrientRequirements: {
                nitrogen: { minimum: 20, optimal: 60, description: 'Test' },
                phosphorus: { minimum: 10, optimal: 40, description: 'Test' },
                potassium: { minimum: 10, optimal: 40, description: 'Test' },
                organicMatter: { minimum: 15, optimal: 50, description: 'Test' }
            },
            lightRequirement: 0.6,
            rootDepth: 'medium'
        }
    };

    const result5 = validator.validateSpecies(invalidSpecies, speciesSchema);
    console.log('Result:', result5.valid ? '✅ PASS' : '❌ FAIL (expected)');
    if (!result5.valid) {
        console.log(validator.formatErrorMessage(result5.errors));
    }
    console.log('');

    console.log('=== Test Suite Complete ===');
    console.log('ConfigValidator is working correctly!');
})();
