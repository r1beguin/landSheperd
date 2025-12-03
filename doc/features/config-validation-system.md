# Config Validation System

**Last updated:** 2025-12-03
**Author:** shepherd-docs
**Status:** Complete

## Overview

The config validation system provides automated validation of all configuration files against JSON Schema definitions. It validates config.json and all species/*.json files on startup and provides a CLI tool for manual validation during development. This prevents configuration errors, catches typos, and ensures all required fields are present with correct types and values.

## Architecture

### Components

#### ConfigValidator (js/utils/config_validator.js)
**Purpose:** Pure vanilla JavaScript JSON Schema Draft 7 validator with no external dependencies

**Key Features:**
- Validates types (string, number, integer, boolean, array, object, null)
- Validates enums and const values
- Validates ranges (minimum, maximum, exclusiveMinimum, exclusiveMaximum)
- Validates string patterns (regex)
- Validates array constraints (minItems, maxItems)
- Validates object constraints (required, minProperties, additionalProperties)
- Supports $ref definitions for schema reuse
- Provides clear error messages with property paths

**Key Methods:**
```javascript
validateConfig(configObject, schemaObject)
// Returns: {valid: boolean, errors: Array}

validateSpecies(speciesObject, schemaObject)
// Alias for validateConfig - same validation logic

formatErrorMessage(errors)
// Returns: Human-readable error string
```

#### SchemaLoader (js/utils/schema_loader.js)
**Purpose:** Centralized schema loading with caching to avoid redundant fetches

**Key Methods:**
```javascript
async loadSchema(path)
// Loads and caches JSON schema from path
// Returns: Promise<Object> - Parsed schema object

clearCache()
// Clears cached schemas (useful for testing)
```

### Schema Files

#### schemas/config.schema.json
Validates the main config.json file with 900+ lines of validation rules.

**Major Sections:**
- `debug` - Debug interface configuration
- `graphics` - Rendering settings
- `time` - Time system and presets
- `world` - All world configuration
  - `terrain` - Terrain generation (rivers, lakes, fertility zones)
  - `map` - Grid dimensions and cell size
  - `plants` - Plant behavior (reproduction, decomposition, genetics, layers)
  - `soil` - Soil properties and decomposition
  - `textures` - Texture generation parameters
  - `weather` - Weather states and effects
  - `lighting` - Day/night cycle configuration

**Reusable Definitions:**
- `proceduralProperty` - Hotspot-based procedural generation
- `intensityLevel` - Texture intensity thresholds
- `riverConfig` - River generation parameters
- `lakeConfig` - Lake generation parameters
- `fertilityBoostConfig` - Water-based fertility zones
- `geneticsConfig` - Genetics system configuration
- `layerConfig` - Multi-layer plant system
- `decompositionConfig` - Decomposition parameters
- `weatherConfig` - Weather system configuration
- `weatherState` - Individual weather state definition
- `lightingConfig` - Lighting system configuration

#### schemas/species.schema.json
Validates species configuration files (species/*.json).

**Required Fields:**
- `id` - Unique species identifier (snake_case pattern)
- `commonName` - Human-readable name
- `category` - Must be "herb", "tree", or "groundcover"
- `layer` - Render layer: "bottom", "middle", or "top"
- `appearance` - Color palettes and dimensions
- `growthStages` - Array of growth stages (minimum 2)
- `environment` - Nutrient requirements, light needs, root depth

**Optional Fields:**
- `displayName` - Display name override
- `reproduction` - Reproduction strategies (rhizomeCloning, proximityReproduction, seedProduction)
- `genetics` - Genetic variation toggle
- `proceduralModules` - Custom generation parameters

### Integration Points

#### GraphicsEngine Startup (js/core/main_graphics.js)
```javascript
async validateConfig() {
    const schemaLoader = new SchemaLoader();
    const configSchema = await schemaLoader.loadSchema('schemas/config.schema.json');
    
    const validator = new ConfigValidator();
    const configResult = validator.validateConfig(this.config, configSchema);
    
    if (!configResult.valid) {
        console.error('Config validation failed:');
        console.error(validator.formatErrorMessage(configResult.errors));
        throw new Error('Invalid configuration');
    }
}
```

#### PlantManager Species Loading (js/core/plant_manager.js)
```javascript
async loadSpecies(speciesId) {
    const schemaLoader = new SchemaLoader();
    const speciesSchema = await schemaLoader.loadSchema('schemas/species.schema.json');
    
    const validator = new ConfigValidator();
    const speciesResult = validator.validateSpecies(species, speciesSchema);
    
    if (!speciesResult.valid) {
        console.error(`Species '${speciesId}' validation failed:`);
        console.error(validator.formatErrorMessage(speciesResult.errors));
        throw new Error(`Invalid species configuration: ${speciesId}`);
    }
}
```

#### Script Loading Order (index.html)
```html
<!-- Utilities loaded first -->
<script src="js/utils/config_validator.js"></script>
<script src="js/utils/schema_loader.js"></script>

<!-- Core systems load after utilities -->
<script src="js/core/main_graphics.js"></script>
```

## Usage

### Automatic Validation

Configuration validation runs automatically when the application starts:

1. **GraphicsEngine initialization** - Validates config.json before initializing managers
2. **Species loading** - Validates each species file when loaded by PlantManager

If validation fails, the application will not start and errors are logged to the console.

### Manual Validation

Use the CLI tool to validate configurations during development:

```bash
npm run validate:config
```

**Output:**
```
Land Shepherd Config Validation

Validating config.json...
✓ config.json is valid

Validating species/nettles.json...
✓ species/nettles.json is valid

Validating species/oak.json...
✓ species/oak.json is valid

Validating species/clover.json...
✓ species/clover.json is valid

==================================================
✓ All configuration files valid!
Validated 4 file(s)
```

**Exit Codes:**
- `0` - All files valid (CI-friendly)
- `1` - One or more files invalid

### Adding New Config Fields

When adding new configuration parameters:

1. **Update config.json** with the new field:
```json
{
  "world": {
    "newFeature": {
      "enabled": true,
      "parameter": 42
    }
  }
}
```

2. **Update schemas/config.schema.json** with validation rules:
```json
{
  "properties": {
    "world": {
      "properties": {
        "newFeature": {
          "type": "object",
          "properties": {
            "enabled": {
              "type": "boolean",
              "description": "Enable new feature"
            },
            "parameter": {
              "type": "integer",
              "minimum": 0,
              "maximum": 100,
              "description": "Feature parameter (0-100)"
            }
          }
        }
      }
    }
  }
}
```

3. **Validate** to ensure schema is correct:
```bash
npm run validate:config
```

4. **Document** the new field in dev-guidelines.md

### Adding New Species

When creating a new species file:

1. **Create species/new_species.json** following the template:
```json
{
  "id": "new_species",
  "commonName": "New Species",
  "category": "herb",
  "layer": "middle",
  "appearance": {
    "colorPalette": {
      "stem": ["#00FF00"],
      "leaves": ["#00AA00"]
    }
  },
  "growthStages": [
    {
      "name": "Seedling",
      "daysToGrow": 3,
      "generator": "seedlingGeneration",
      "visibleOrgans": ["stem", "leaves"]
    },
    {
      "name": "Mature",
      "daysToGrow": null,
      "generator": "matureGeneration",
      "visibleOrgans": ["stem", "leaves"]
    }
  ],
  "environment": {
    "nutrientRequirements": {
      "nitrogen": {"minimum": 20, "optimal": 60, "description": "Nitrogen needs"},
      "phosphorus": {"minimum": 10, "optimal": 40, "description": "Phosphorus needs"},
      "potassium": {"minimum": 10, "optimal": 40, "description": "Potassium needs"},
      "organicMatter": {"minimum": 5, "optimal": 30, "description": "OM needs"}
    },
    "lightRequirement": 0.7,
    "rootDepth": "medium"
  }
}
```

2. **Validate** the new species file:
```bash
npm run validate:config
```

3. **Fix any validation errors** reported by the tool

## Schema Reference

### Common Validation Rules

#### Type Validation
```json
{
  "type": "string",          // string, number, integer, boolean, array, object, null
  "type": ["integer", "null"] // Multiple types allowed
}
```

#### Enum Validation
```json
{
  "type": "string",
  "enum": ["herb", "tree", "groundcover"],
  "errorMessage": "Invalid category. Must be one of: herb, tree, groundcover"
}
```

#### Range Validation
```json
{
  "type": "integer",
  "minimum": 0,              // Inclusive minimum
  "maximum": 100,            // Inclusive maximum
  "exclusiveMinimum": 0,     // Exclusive minimum (value must be > 0)
  "exclusiveMaximum": 100    // Exclusive maximum (value must be < 100)
}
```

#### Pattern Validation (Regex)
```json
{
  "type": "string",
  "pattern": "^[a-z][a-z0-9_]*$",  // Must match regex
  "minLength": 1,                   // Minimum string length
  "maxLength": 50                   // Maximum string length
}
```

#### Array Validation
```json
{
  "type": "array",
  "items": {
    "type": "number",
    "minimum": 0,
    "maximum": 1
  },
  "minItems": 4,  // Minimum array length
  "maxItems": 4   // Maximum array length
}
```

#### Object Validation
```json
{
  "type": "object",
  "required": ["field1", "field2"],           // Required fields
  "minProperties": 1,                          // Minimum number of properties
  "properties": {
    "field1": {"type": "string"},
    "field2": {"type": "integer"}
  },
  "additionalProperties": false                // Disallow undefined properties
}
```

#### Const Validation
```json
{
  "type": "number",
  "const": 0  // Must be exactly 0
}
```

#### Reference ($ref) Validation
```json
{
  "$ref": "#/definitions/proceduralProperty"  // Reference reusable definition
}
```

### Config Schema Highlights

#### Debug Configuration
```json
{
  "debug": {
    "enabled": true,              // boolean - Enable debug interface
    "showFPS": true,              // boolean
    "showGeometryCount": true,    // boolean
    "showPlayerPosition": true,   // boolean
    "refreshRate": 60             // integer (30-240) - Target FPS
  }
}
```

#### Graphics Configuration
```json
{
  "graphics": {
    "vsync": true,                                  // boolean
    "backgroundColor": [0.53, 0.81, 0.92, 1.0]     // array[4] - RGBA (0-1)
  }
}
```

#### Map Configuration
```json
{
  "world": {
    "map": {
      "gridWidth": 50,      // integer (10-200)
      "gridHeight": 50,     // integer (10-200)
      "cellSize": 16        // integer (8-64)
    }
  }
}
```

#### Category Validation (Critical)
```json
{
  "category": {
    "type": "string",
    "enum": ["herb", "tree", "groundcover"],
    "errorMessage": "Invalid category. Must be one of: herb, tree, groundcover"
  }
}
```

This validation prevented the "green rectangle bug" where invalid category values caused rendering failures.

## Common Errors and Solutions

### Invalid Category

**Error:**
```
- category: Invalid category. Must be one of: herb, tree, groundcover (got: "herbaceous")
```

**Cause:** Species file has invalid category value

**Solution:**
```json
{
  "category": "herb"  // Change "herbaceous" to "herb"
}
```

### Missing Required Field

**Error:**
```
- environment.nutrientRequirements.nitrogen: is required but missing
```

**Cause:** Required field not present in configuration

**Solution:**
```json
{
  "environment": {
    "nutrientRequirements": {
      "nitrogen": {
        "minimum": 20,
        "optimal": 60,
        "description": "Nitrogen requirement"
      }
      // Add missing nitrogen field
    }
  }
}
```

### Out of Range Value

**Error:**
```
- world.map.gridWidth: must be >= 10 (got: 5)
```

**Cause:** Value outside allowed range

**Solution:**
```json
{
  "world": {
    "map": {
      "gridWidth": 10  // Change from 5 to at least 10
    }
  }
}
```

### Type Mismatch

**Error:**
```
- debug.refreshRate: must be of type integer (got: string)
```

**Cause:** Wrong data type for field

**Solution:**
```json
{
  "debug": {
    "refreshRate": 60  // Change from "60" (string) to 60 (number)
  }
}
```

### Pattern Mismatch

**Error:**
```
- id: must match pattern ^[a-z][a-z0-9_]*$ (got: "Invalid-Species")
```

**Cause:** String doesn't match required pattern (regex)

**Solution:**
```json
{
  "id": "invalid_species"  // Change from "Invalid-Species" to snake_case
}
```

### Array Length Mismatch

**Error:**
```
- graphics.backgroundColor: array must have at least 4 items (got: 3)
```

**Cause:** Array too short or too long

**Solution:**
```json
{
  "graphics": {
    "backgroundColor": [0.53, 0.81, 0.92, 1.0]  // Add 4th element (alpha)
  }
}
```

### Const Value Mismatch

**Error:**
```
- time.timeScalePresets.pause: must equal 0 (got: 0.001)
```

**Cause:** Value must be exactly the specified constant

**Solution:**
```json
{
  "time": {
    "timeScalePresets": {
      "pause": 0  // Change from 0.001 to exactly 0
    }
  }
}
```

### Invalid $ref

**Error:**
```
- fertility: Unable to resolve $ref: #/definitions/unknownType
```

**Cause:** $ref points to non-existent definition

**Solution:** Check schema for correct definition name or add missing definition to schema

## Testing

### Validation Tests

**File:** tests/config-validator.spec.js

The validation system has comprehensive Playwright tests covering:

- ConfigValidator module loading
- Required field validation
- Type validation (string, number, integer, boolean, array, object, null)
- Enum validation
- Range validation (minimum, maximum)
- Array constraints (minItems, maxItems)
- String patterns (regex)
- $ref definitions
- Nested object validation
- Const values
- Error message formatting
- Real config.json validation
- Real species file validation

**Run tests:**
```bash
npm run test:config-validator
```

### CLI Tool Testing

**Manual validation:**
```bash
npm run validate:config
```

**Testing invalid config (should fail):**
```bash
node scripts/validate-config.js
# Creates test-invalid.json with known errors
# Expected: Exit code 1 with error messages
```

### Integration Testing

Validation is tested automatically by:
1. **npm run verify** - Full verification includes config validation
2. **Application startup** - Fails if config invalid
3. **Species loading** - Fails if species file invalid

## Implementation Details

### Validator Architecture

The ConfigValidator uses recursive validation with path tracking:

```javascript
_validate(value, schema, path, errors, rootSchema) {
    // 1. Handle $ref resolution
    // 2. Validate const values
    // 3. Validate types
    // 4. Validate enums
    // 5. Type-specific validations (string, number, array, object)
}
```

**Key Design Decisions:**

1. **Pure vanilla JS** - No external dependencies, works in browser and Node.js
2. **Path tracking** - Errors include full property path (e.g., "world.map.gridWidth")
3. **Early exit** - Stops validating property if type is wrong
4. **$ref caching** - Caches resolved references for performance
5. **Custom error messages** - Supports errorMessage field for user-friendly errors

### Schema Design Patterns

#### Reusable Definitions

Used for repeated structures:

```json
{
  "definitions": {
    "proceduralProperty": {
      "type": "object",
      "required": ["hotspots", "baseValue"],
      "properties": {
        "hotspots": {"type": "integer"},
        "baseValue": {"type": "number"}
      }
    }
  },
  "properties": {
    "fertility": {"$ref": "#/definitions/proceduralProperty"},
    "water": {"$ref": "#/definitions/proceduralProperty"}
  }
}
```

#### Pattern Properties

Used for dynamic property names:

```json
{
  "patternProperties": {
    "^[a-z]+[A-Za-z]*$": {
      "type": "array",
      "items": {"type": "string"}
    }
  }
}
```

This allows colorPalette to have any camelCase property name (stem, leaves, flowers, etc.).

#### Type Arrays

Used for nullable fields:

```json
{
  "type": ["integer", "null"],
  "description": "Seed value or null for random"
}
```

### Performance Considerations

- **Schema caching** - SchemaLoader caches loaded schemas to avoid repeated fetches
- **$ref caching** - ConfigValidator caches resolved references
- **Early validation exit** - Stops validating property if type validation fails
- **Startup overhead** - Validation adds ~50ms to startup time (negligible)
- **Development benefit** - Catches errors immediately vs runtime failures

### Browser vs Node.js

The same ConfigValidator code runs in both environments:

**Browser (main_graphics.js):**
```javascript
const validator = new window.ConfigValidator();
```

**Node.js (scripts/validate-config.js):**
```javascript
const validator = new ConfigValidator();
```

The CLI tool includes a copy of ConfigValidator adapted for Node.js (requires fs module).

## Benefits

### Prevents Configuration Errors

- **Type safety** - Ensures all values have correct types
- **Range validation** - Prevents out-of-range values that cause crashes
- **Required fields** - Catches missing required configuration
- **Enum validation** - Prevents typos in category, layer, etc.

### Improves Developer Experience

- **Clear error messages** - Errors include property path and expected values
- **Fast feedback** - Validation runs before application starts
- **CI integration** - Exit codes allow use in continuous integration
- **Documentation** - Schema serves as documentation for config structure

### Real-World Impact

The validation system caught and prevented:

1. **Nettles category bug** (2025-12-03) - Invalid "herbaceous" category caused green rectangle rendering
2. **Type mismatches** - Strings used where integers required
3. **Missing required fields** - Incomplete species configurations
4. **Out-of-range values** - Invalid grid dimensions, percentages, etc.

## Future Improvements

Potential enhancements:

1. **Schema versioning** - Support for schema version migration
2. **Warnings vs errors** - Non-critical validation issues as warnings
3. **Auto-fix suggestions** - Suggest fixes for common errors
4. **IDE integration** - JSON Schema support in VS Code
5. **Custom validators** - Plugin system for domain-specific validation
6. **Performance profiling** - Measure validation overhead on large configs

## Related Documentation

- [dev-guidelines.md](../dev-guidelines.md#config-validation) - Quick reference
- [Config Schema](../../schemas/config.schema.json) - Full config validation rules
- [Species Schema](../../schemas/species.schema.json) - Full species validation rules
- [DevLog 2025-12-03](../devlogs/2025-12/2025-12-03-config-validation-system.md) - Implementation history

## Changelog

### 2025-12-03 - System Complete
- ConfigValidator module implemented (js/utils/config_validator.js)
- SchemaLoader utility implemented (js/utils/schema_loader.js)
- config.schema.json created with 900+ lines of validation rules
- species.schema.json created for species file validation
- CLI validation tool created (scripts/validate-config.js)
- Integration with GraphicsEngine and PlantManager
- Comprehensive Playwright tests (tests/config-validator.spec.js)
- Caught and fixed nettles category bug
- Documentation completed
