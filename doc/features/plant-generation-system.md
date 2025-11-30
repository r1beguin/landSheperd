# Plant Generation System Documentation

## Overview

This document describes the plant generation system implemented in Land Shepherd. The system provides procedural plant sprite generation, interactive plant placement, and a modular architecture for future expansion with additional plant species and growth stages.

## Architecture

### Core Components

The plant system consists of four main components:

1. **Species Configuration System** - JSON-based plant definitions
2. **Plant Entity System** - Individual plant instances with lifecycle management
3. **Procedural Generation System** - Canvas-based sprite generation
4. **Plant Management System** - Placement, removal, and world integration

### File Structure

```
species/
├── nettles.json              # Nettle species configuration

js/entities/
├── plant.js                  # Plant entity class

js/procedural/
├── plant_generator.js        # Procedural sprite generation

js/core/
├── plant_manager.js          # Plant world management
└── main_graphics.js          # Integration with graphics engine

js/systems/
└── render_system.js          # Extended for plant rendering
```

## Species Configuration

### Format

Species are defined in JSON files with the following structure:

```json
{
  "id": "species_identifier",
  "commonName": "Display Name",
  "category": "plant_category",
  "layer": "rendering_layer",
  
  "appearance": {
    "colorPalette": {
      "leaf": ["#color1", "#color2"],
      "stem": ["#color1", "#color2"]
    }
  },
  
  "growthStages": [
    {
      "name": "StageName",
      "generator": "generatorFunction",
      "visibleOrgans": ["organ1", "organ2"]
    }
  ],
  
  "proceduralModules": {
    "stem": {
      "segments": 3,
      "curveIntensity": 0.1,
      "colorVariation": 0.15,
      "baseWidth": 0.4
    },
    "leaf": {
      "shapeType": "serrated",
      "irregularity": 0.3,
      "pairCount": 2,
      "edgeVariation": 0.8
    }
  }
}
```

### Current Species

#### Stinging Nettle (Urtica dioica)

- **Category**: Wild herb
- **Growth Stage**: Seedling only
- **Leaf Configuration**: 2 serrated leaves with alternating placement
- **Visual Characteristics**: Green stem with attached leaves and connecting petioles

## Plant Entity System

### Plant Class

Each plant instance is represented by a Plant entity with the following properties:

- **Position**: World coordinates (x, y)
- **Species Configuration**: Reference to species data
- **Growth Stage**: Current stage of development
- **Age**: Time since creation
- **Health**: Plant vitality (0.0 to 1.0)
- **Sprite Data**: Generated texture and WebGL cache

### Lifecycle Management

Plants have a basic update cycle that tracks age and can be extended for:
- Growth stage transitions
- Health degradation
- Environmental responses
- Seasonal changes

## Procedural Generation

### Sprite Generation Pipeline

The PlantGenerator creates plant sprites using HTML5 Canvas with the following process:

1. **Canvas Creation**: 20x20 pixel canvas for each plant
2. **Stem Generation**: Base stem structure with color variation
3. **Leaf Attachment**: Leaves positioned at specific stem coordinates
4. **Detail Addition**: Serration marks and connecting petioles

### Stem Generation

Stems are generated with:
- Configurable base width and height
- Color variation for texture
- Attachment points for leaf positioning

### Leaf Generation

Leaves feature:
- Species-specific shape (oval for nettles)
- Alternating side placement (left/right pattern)
- Attachment to specific stem coordinates
- Serrated edge details for nettle species
- Connecting petioles (stems) to main plant stem

### Attachment System

Leaves attach to predefined points on the stem:
- Upper position (right side)
- Middle position (left side)
- Lower position (right side) - if pairCount allows

This creates a natural alternating leaf pattern common in many plant species.

## Plant Management

### PlantManager Class

The PlantManager handles:
- Species configuration loading
- Plant placement and removal
- Grid coordinate management
- Plant lifecycle updates
- Visibility culling for performance

### Placement System

Plants can be placed via right-click interaction with the following constraints:
- Must be on valid soil cells
- Soil must be currently visible/rendered
- Only one plant per grid cell
- Existing plants are removed when placing in occupied cells

### Coordinate System

The system uses a grid-based coordinate system:
- Grid coordinates for placement logic
- World coordinates for rendering
- Automatic conversion between systems
- Integration with soil manager cell size

## Rendering Integration

### WebGL Rendering

Plants are rendered using the texture rendering pipeline:
- Canvas-generated sprites converted to WebGL textures
- Cached textures for performance
- Batch rendering with other textured entities
- Transparency support for plant sprites

### Render Pipeline Integration

Plants are rendered in the middle layer between soil and character:
1. Soil (background)
2. Plants (middle layer)
3. Character and UI (foreground)

### Performance Optimizations

- Texture caching to avoid regeneration
- Visibility culling based on camera bounds
- Batch rendering for multiple plants
- Efficient grid-based lookups

## Debug Integration

### Debug Panel

The system integrates with the debug panel to show:
- Plant count in real-time
- Color-coded population indicators:
  - Gray: No plants (0)
  - Yellow: Few plants (1-9)
  - Green: Many plants (10+)

### Console Logging

Debug logging can be enabled to track:
- Species loading status
- Plant placement attempts
- Soil visibility checks
- Sprite generation success/failure

## Input System

### Right-Click Interaction

Right-click functionality provides:
- Plant placement on valid soil
- Plant removal from occupied cells
- Coordinate conversion from screen to grid
- Validation of placement constraints

### Input Processing

The input system processes right-clicks through:
1. Screen coordinate capture
2. World coordinate conversion
3. Grid coordinate calculation
4. Soil existence and visibility validation
5. Plant placement or removal execution

## Future Expansion

### Planned Features

The architecture supports future expansion with:
- Additional growth stages (vegetative, flowering, fruiting)
- Multiple plant species
- Genetic variation within species
- Environmental responses
- Seasonal lifecycle changes
- Plant interactions and competition

### Modular Design

The system is designed for easy extension:
- New species can be added via JSON files
- Growth stages can be configured per species
- Procedural modules can be expanded
- Rendering pipeline supports complex sprites

### Performance Scalability

The system is optimized for larger plant populations:
- Grid-based spatial indexing
- Visibility culling
- Efficient batch rendering
- Texture caching

## Technical Specifications

### Dependencies

- HTML5 Canvas for sprite generation
- WebGL for rendering
- Existing soil and camera systems
- Input management system

### Performance Characteristics

- Sprite generation: ~1-2ms per plant
- Memory usage: ~4KB per plant texture
- Rendering: Batched with other textured entities
- Grid lookups: O(1) for placement operations

### Browser Compatibility

- Modern browsers with Canvas support
- WebGL 1.0 or 2.0 required
- ES6+ JavaScript features

## Usage Examples

### Adding a New Species

1. Create species JSON file in `/species/` directory
2. Define appearance and procedural modules
3. Add species loading to PlantManager
4. Test with right-click placement

### Extending Growth Stages

1. Add new stage to species growthStages array
2. Create corresponding generator function
3. Implement stage transition logic in Plant class
4. Update rendering for new visual elements

### Custom Procedural Modules

1. Define module parameters in species JSON
2. Extend PlantGenerator with new generation methods
3. Integrate with sprite composition pipeline
4. Test visual output and performance

This documentation provides a comprehensive overview of the current plant generation system and guidelines for future development and expansion.

---

## Plant Positioning System (Updated November 16, 2025)

### Positioning Architecture

Plants use a grid-based positioning system with two distinct placement methods:

#### 1. Manual Placement (User Click)

**Method**: `PlantManager.addPlantAtPosition(gridX, gridY, exactWorldX, exactWorldY)`

**Behavior**:
- Plant spawns at **exact click coordinates**
- Precise visual position matching cursor
- Used for intentional, user-controlled placement

#### 2. Automatic Placement (Reproduction)

**Method**: `PlantManager.addPlant(gridX, gridY, speciesId, currentDay)`

**Behavior**:
- Plant spawns at **random position within cell**
- 2-pixel margin from cell edges
- Creates natural variation in colonies
- Prevents monotonous grid alignment

### Randomization Implementation

```javascript
// Calculate cell boundaries
const cellLeft = gridX * this.soilManager.cellSize;
const cellTop = gridY * this.soilManager.cellSize;

// Add random offset within cell (2px margin)
const margin = 2;
const randomOffsetX = margin + Math.random() * (cellSize - 2 * margin);
const randomOffsetY = margin + Math.random() * (cellSize - 2 * margin);

// Final world position
const worldX = cellLeft + randomOffsetX;
const worldY = cellTop + randomOffsetY;
```

### Visual Comparison

**Without Randomization** (before):
```
┌───┬───┬───┐
│ • │ • │ • │  Monotonous grid pattern
├───┼───┼───┤
│ • │ • │ • │  All plants at cell centers
├───┼───┼───┤
│ • │ • │ • │  Unnatural appearance
└───┴───┴───┘
```

**With Randomization** (after):
```
┌───┬───┬───┐
│•  │ •│  •│  Natural variation
├───┼───┼───┤
│ • │• │ • │  Organic appearance
├───┼───┼───┤
│  •│ •│•  │  Colony-like clusters
└───┴───┴───┘
```

### Benefits

- **Visual Variety**: Each reproduced plant appears unique
- **Natural Appearance**: Mimics real-world colony growth
- **Organic Spread**: Reduces obvious grid patterns
- **Consistent Experience**: Same randomization for all automatic spawning

### Edge Margin Purpose

**2-pixel margin prevents**:
- Plants touching cell borders
- Visual clipping with grid lines
- Overlap with adjacent cells
- Rendering artifacts

**Calculation**:
- Cell size: 20px
- Margin: 2px each side
- Usable area: 16px
- 8% margin on each side
