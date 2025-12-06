# Land Shepherd
**Pixel art nature simulation in WebGL**

> **For AI Agents**: See [AGENTS.md](AGENTS.md) for development guidelines and workflow.
> **For Documentation**: See [doc/INDEX.md](doc/INDEX.md) for complete navigation.

## Overview

Land Shepherd is a pixel art nature simulation developed with pure WebGL and vanilla JavaScript. The project uses a modular architecture with decoupled systems to optimize performance and facilitate maintenance.

## Architecture

### Folder Structure
```
landSheperd/
├── config.json              # Global configuration (world, debug, graphics)
├── index.html               # HTML entry point
├── css/
│   └── styles.css          # CSS styles and debug interface
├── doc/                    # Documentation (see doc/INDEX.md)
│   ├── guides/             # Developer guides
│   ├── architecture/       # System architecture
│   ├── features/           # Feature documentation
│   ├── testing/            # Testing guides
│   ├── troubleshooting/    # Problem-solving
│   ├── devlogs/            # Development history
│   └── INDEX.md            # Documentation navigation hub
├── js/
│   ├── core/               # Core engine systems
│   │   ├── main_graphics.js        # Main GraphicsEngine
│   │   ├── debug_manager.js        # Real-time debug interface
│   │   ├── shader_manager.js       # WebGL shader management
│   │   ├── geometry_manager.js     # Geometry/buffer cache
│   │   ├── procedural_generator.js # Procedural map generation
│   │   ├── texture_generator.js    # Soil texture generation
│   │   ├── soil_manager.js         # Complete soil system
│   │   └── plant_manager.js        # Plant management system
│   ├── systems/            # Game systems
│   │   ├── render_system.js    # Optimized rendering system
│   │   ├── camera_manager.js   # Camera and transformations
│   │   └── input_manager.js    # User input management
│   ├── entities/           # Game entities
│   │   ├── character.js        # Player character
│   │   ├── soil.js            # Individual soil cell
│   │   └── plant.js           # Individual plant entity
│   └── procedural/         # Procedural generation modules
│       └── plant_generator.js  # Plant procedural generation
└── species/               # Species configurations
    └── nettles.json       # Stinging nettle configuration
```

### Main Systems

#### GraphicsEngine (`main_graphics.js`)
- **Role**: Main orchestrator of the rendering engine
- **Features**:
  - WebGL initialization and system coordination
  - Game loop with optimized deltaTime
  - Automatic resizing management
  - Unified API for game control

#### SoilManager (`soil_manager.js`)
- **Role**: Central manager of the soil system
- **Features**:
  - Configurable grid of soil cells (50x50 by default)
  - Procedural generation with coherent zones
  - Optimization by culling (rendering only visible cells)
  - Interface for interaction with plants

#### PlantManager (`plant_manager.js`)
- **Role**: Plant placement and lifecycle management
- **Features**:
  - Species-based plant generation
  - Right-click placement/removal system
  - Soil compatibility checking
  - Procedural texture generation

#### TextureGenerator (`texture_generator.js`)
- **Role**: Procedural generation of soil textures
- **Features**:
  - Dynamically generated 20x20 textures
  - Smart cache (~72 pre-generated textures)
  - Toggleable layers system (water/pollution)
  - Configurable gradual intensity levels

#### ProceduralGenerator (`procedural_generator.js`)
- **Role**: Map generator with spatial coherence
- **Features**:
  - Hotspot system with radial influence
  - Exponential gradients and spatial smoothing
  - Flexible configuration by property
  - Noise and local variation algorithms

#### DebugManager (`debug_manager.js`)
- **Role**: Real-time debug interface
- **Features**:
  - FPS display with colorization based on performance
  - Real-time rendering and soil metrics
  - Interactive toggles for visual layers
  - Collapsible panel with JSON configuration

#### RenderSystem (`render_system.js`)
- **Role**: Optimized rendering of entities
- **Features**:
  - Batch rendering to optimize performance
  - Support for textures and solid colors
  - Automated uniform system
  - Render call counting

#### CameraManager (`camera_manager.js`)
- **Role**: Virtual camera and transformation management
- **Features**:
  - Centered zoom with configurable constraints
  - World ↔ screen coordinate conversion
  - Smooth entity tracking with interpolation
  - Calculation of visible bounds

#### InputManager (`input_manager.js`)
- **Role**: Centralized input capture
- **Features**:
  - Decoupled event system
  - Mouse support (click, move, wheel)
  - Keyboard management with key state
  - Automatic coordinate conversion

#### GeometryManager (`geometry_manager.js`)
- **Role**: Smart geometry cache
- **Features**:
  - Cache by unique key (avoids duplicates)
  - Primitives with and without texture coordinates
  - Automatic management of WebGL buffers
  - Optimized attribute binding

#### ShaderManager (`shader_manager.js`)
- **Role**: Centralized shader management
- **Features**:
  - Cache by source code hash
  - Color and texture shaders
  - Auto-detection of attributes/uniforms
  - Automated compilation and linking

## Current Development Status

### Implemented Features

- **Complete WebGL engine** with modular architecture
- **Advanced soil system** with chemical and physical properties
  - Configurable grid (50x50 cells of 20x20 pixels by default)
  - N, P, K, organic matter properties (fertility calculated automatically)
  - **2-layer nutrient system** (surface 0-20cm, deep 20-100cm) with root depth-based access
  - **Nutrient cycling**: Leaf litter, rain leaching, root lift, mycorrhizal networks
  - Water retention and pollution with gradual intensity levels
  - Procedural generation with coherent zones and natural gradients
  - Optimization by culling and procedural textures (1 call/cell)
- **Terrain generation system** with deterministic seed-based world creation
  - Procedural rivers with natural meandering (dual sine wave algorithm)
  - Irregular lakes with multi-frequency noise perturbation
  - Fertility zones around water bodies (+20 nitrogen, +30 water retention)
  - Animated water shader with triple sine wave ripples
  - Seed UI with clipboard copy, manual input, and localStorage persistence
  - URL parameter support for sharing worlds (`?seed=12345678`)
- **Ultra-optimized procedural textures**
  - 72 pre-generated textures with variations
  - Toggleable water/pollution layers in real-time
  - Configurable intensity levels (3 thresholds by default)
  - Instant dynamic regeneration
- **Plant system** with species management and time-based growth
  - JSON-based species configuration
  - Procedural generation with modular components
  - **Automatic growth progression** through multiple life stages
  - **Time-based lifecycle** (Seedling → Vegetative → Flowering → Withered)
  - **Multi-layer plant placement**: Plant multiple species on same cell (clover + nettle + oak for full ecosystem stacking)
  - **Root depth system**: Deep-rooted trees access nutrients unavailable to herbs
  - **Forest ecosystems**: Sustainable oak groves with nutrient cycling (leaf litter, root lift, mycorrhizal networks)
  - Right-click placement and removal with layer-aware context menu
  - **Species**: Stinging Nettle (middle layer), Oak Tree (top layer), Clover (bottom layer - ground cover)
  - Currently includes 3 species demonstrating full vertical stratification
- **Player character** movable on click with animation
- **Time system** with adjustable speed controls
  - Configurable time scale (pause to 20x speed)
  - Real-time to game-time conversion (10s = 1 game day at 1x)
  - Keyboard controls for time manipulation
  - Visual UI displaying current day and speed
- **Camera system** with wheel zoom and tracking
- **Interactive real-time debug interface**
  - Performance and soil metrics
  - Visual toggles for layers
  - Real-time intensity levels
- **Centralized JSON configuration** for all parameters
- **Optimized performance**: 60+ FPS with 2500 cells (39 FPS with animated water)

### Interactive Controls

#### Game
- **Left click**: Move the character
- **Right click**: Place/remove plants on soil
- **Mouse wheel**: Centered zoom in/out
- **Resizing**: Automatic adaptation

#### Time Controls
- **Space**: Pause/Resume time
- **+ or =**: Increase time speed
- **- or _**: Decrease time speed
- **0**: Pause time
- **1**: Normal speed (1x)
- **2**: Fast speed (5x)
- **3**: Very fast speed (20x)

**Plant Growth**: Plants automatically grow through multiple stages over time. At normal speed (1x), Stinging Nettles take:
- Seedling → Vegetative: 3 game days (30 real seconds)
- Vegetative → Flowering: 7 game days (70 real seconds)
- Flowering → Withered: 10 game days (100 real seconds)

Use time controls to speed up or slow down the simulation!

#### Debug Interface
- **Water Button**: Toggles the display of water pixels
- **Pollution Button**: Toggles the display of pollution
- **× Collapse**: Collapse/expand the debug panel

### Real-time Debug Metrics

- **Performance**: FPS with colorization based on performance
- **Rendering**: Cached geometries and render calls per frame
- **Position**: Player coordinates and zoom level
- **Soil**: Visible/total cells with optimization
- **Plants**: Population counts and placement statistics
- **Local Properties**: Fertility, pollution under the player
- **Intensity Levels**: Water (Lvl.1-3/Dry) and pollution (Lvl.1-3/Clean)

## Technologies Used

- **WebGL**: Hardware-accelerated rendering with textures
- **JavaScript ES6+**: Modern modular architecture
- **HTML5 Canvas**: Procedural texture generation
- **CSS3**: User and debug interface

## Installation and Launch

1. **Clone the project**:
   ```bash
   git clone [repo-url]
   cd landSheperd
   ```

2. **Local server** (required for WebGL):
   ```bash
   # Option 1: Python
   python -m http.server 8081
   
   # Option 2: Node.js
   npx http-server -p 8081
   
   # Option 3: Live Server (VS Code)
   # Use the Live Server extension (configure to port 8081)
   ```

3. **Open in browser**:
   ```
   http://localhost:8081
   ```
   
   **Note**: Port 8081 is used to avoid conflicts with other local services (e.g., Traefik on port 8080).

## Testing

```bash
npm install                  # First time: install dependencies
npm run verify               # Run full verification suite
npm run verify:baseline      # Create new baseline for comparison
npm run verify:verbose       # Run with detailed output
npm run verify:interactive   # Interactive testing with screenshots & logs
npm run verify:screenshot-only # Capture screenshots only
npm run verify:log-only      # Analyze logs only
```

### Interactive Testing Framework

The project includes a comprehensive interactive testing framework with:
- **Automated screenshot capture** at key points during execution
- **Console log reading and analysis** with structured data parsing
- **Real-time performance metrics** (FPS, load time, manager status)
- **Visual diff generation** for regression testing
- **Modular test modes** for focused testing scenarios

See [Interactive Testing Guide](doc/testing/interactive-testing.md) for detailed usage and API reference.

Test results are saved in `test-results/`:
- `baseline/` - Reference screenshots and reports
- `latest/` - Most recent test run
- `interactive/` - Interactive mode results with timestamped screenshots and logs

## Configuration

### `config.json` - Complete Configuration
```json
{
    "debug": {
        "enabled": true,          // Enable/disable debug
        "showFPS": true,          // Show FPS
        "showGeometryCount": true, // Count geometries
        "showPlayerPosition": true, // Player position
        "refreshRate": 144        // Target display frequency
    },
    "graphics": {
        "vsync": true,            // Vertical synchronization
        "backgroundColor": [0.5, 0.5, 0.5, 1.0] // RGBA background color
    },
    "time": {
        "initialTimeScale": 1.0,  // Starting time speed
        "realSecondsPerGameDay": 10, // Real seconds per game day
        "timeScalePresets": {
            "pause": 0,
            "slow": 0.5,
            "normal": 1.0,
            "fast": 5.0,
            "veryFast": 20.0
        }
    },
    "world": {
        "map": {
            "gridWidth": 50,      // Grid width (cells)
            "gridHeight": 50,     // Grid height (cells)
            "cellSize": 20        // Cell size (pixels)
        },
        "soil": {
            "fertility": {
                "hotspots": 8,        // Number of fertile zones
                "baseValue": 30,      // Base fertility
                "maxIntensity": 85,   // Maximum hotspot fertility
                "falloffRate": 0.15,  // Gradient speed
                "noiseIntensity": 10, // Local noise intensity
                "radiusMin": 8,       // Minimum hotspot radius
                "radiusMax": 20,      // Maximum hotspot radius
                "nutrientVariation": {
                    "nitrogen": 10,     // N variation around fertility
                    "phosphorus": 15,   // P variation around fertility
                    "potassium": 12,    // K variation around fertility
                    "organicMatter": 8  // C variation around fertility
                }
            },
            "water": {
                "hotspots": 5,        // Wet zones (rivers, swamps)
                "baseValue": 20,      // Base water retention
                "maxIntensity": 90,   // Maximum retention
                "falloffRate": 0.12,  // Softer gradient than fertility
                "noiseIntensity": 8,
                "radiusMin": 6,
                "radiusMax": 18
            },
            "pollution": {
                "hotspots": 3,        // A few polluted zones
                "baseValue": 5,       // Base pollution (low)
                "maxIntensity": 80,   // Maximum pollution
                "falloffRate": 0.08,  // Slow propagation
                "noiseIntensity": 5,
                "radiusMin": 10,
                "radiusMax": 25
            }
        },
        "textures": {
            "soilTextureSize": 20,    // Soil texture size
            "generateVariations": 2,  // Variations per combination
            "waterIntensityLevels": [
                { "threshold": 20, "coverage": 0.05, "color": [50, 120, 255] },  // Level 1
                { "threshold": 40, "coverage": 0.15, "color": [30, 100, 255] },  // Level 2
                { "threshold": 70, "coverage": 0.25, "color": [10, 80, 255] }    // Level 3
            ],
            "pollutionIntensityLevels": [
                { "threshold": 15, "coverage": 0.03, "color": [100, 255, 120] }, // Level 1
                { "threshold": 35, "coverage": 0.08, "color": [50, 255, 80] },   // Level 2
                { "threshold": 60, "coverage": 0.15, "color": [20, 255, 60] }    // Level 3
            ]
        }
    }
}
```

### Easily Adjustable Parameters

#### World Size
- **Larger map**: `"gridWidth": 100, "gridHeight": 100` (10,000 cells)
- **Larger cells**: `"cellSize": 40` (40x40 textures)

#### Procedural Generation
- **More fertile zones**: `"hotspots": 12`
- **Softer gradients**: `"falloffRate": 0.08`
- **More variation**: `"noiseIntensity": 20`

#### Visual Levels
- **Add a 4th water level**:
  ```json
  { "threshold": 85, "coverage": 0.35, "color": [5, 60, 255] }
  ```
- **Modify thresholds**: Adjust `threshold` values
- **Change colors**: Modify `color` RGB values

## Plant System

### Current Implementation

- **Species-based plant management** with JSON configuration
- **Procedural generation** using modular components
- **Interactive placement system** with right-click controls
- **Soil compatibility** checking before placement

### Available Species

- **Stinging Nettle (Urtica dioica)** - Middle layer herb
  - Serrated leaf generation with procedural modules
  - Multi-segment stem system with natural curves
  - Color variation and edge irregularity
  - Growth stages: Seedling → Vegetative → Flowering → Withered

- **Oak Tree (Quercus robur)** - Top layer canopy tree
  - Progressive canopy development across growth stages
  - Larger sprite (40x50px) for tall tree appearance
  - Growth stages: Sapling → YoungTree → MatureTree → Withered

- **Clover (Trifolium repens)** - Bottom layer ground cover
  - Characteristic 3-leaf pattern
  - White/pink flower clusters in Flowering stage
  - Smaller sprite (16x16px) for ground cover appearance
  - Growth stages: Sprout → Spreading → Flowering → Withered

### Species Configuration Format

Species are defined in JSON files in the `species/` directory:

```json
{
  "id": "urtica_dioica",
  "commonName": "Stinging Nettle",
  "category": "wild_herb",
  "layer": "middle",
  "appearance": {
    "colorPalette": {
      "leaf": ["#4a7c59", "#3d6b4a", "#2f5a3b"],
      "stem": ["#6b8e23", "#556b2f", "#4a5f2a"]
    }
  },
  "growthStages": [
    {
      "name": "Seedling",
      "generator": "seedlingGeneration",
      "visibleOrgans": ["stem", "leaf"]
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

## Development

### Modular Architecture
Each system is independent and communicates through clear interfaces. This allows for:
- **Easy maintenance** and debugging
- **Component reusability**
- **Optimized performance** through specialization
- **Easy extension** for new features

### Extension Guide

#### Adding a new plant species
1. Create a JSON file in `species/` directory
2. Define appearance, growth stages, and procedural modules
3. The system will automatically load and make it available for placement

#### Adding a new entity
1. Create the class in `js/entities/`
2. Implement `getRenderData()` and `update(deltaTime)`
3. Add support in `RenderSystem.renderEntityBatch()`

#### Adding a new system
1. Create the module in `js/systems/` or `js/core/`
2. Integrate it into `GraphicsEngine.initManagers()`
3. Configure interactions with other systems

#### Modifying the soil system
1. **New properties**: Extend the `Soil` class and the `ProceduralGenerator`
2. **New visual layers**: Add in `TextureGenerator` and `DebugManager`
3. **Generation algorithms**: Modify the `ProceduralGenerator`

### Suggested Next Steps
- **Additional plant species** with diverse growth patterns
- **Plant-soil interaction** (nutrient consumption, soil modification)
- **Seasonal effects** on plant appearance and behavior
- **Animals** with terrain and plant preferences
- **Weather system** and day/night cycles
- **Soil evolution** over time
- **Saving/loading** simulations
- **Spatialized audio** and ambiances