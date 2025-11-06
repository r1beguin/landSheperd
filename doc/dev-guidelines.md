# Claude Development Guidelines

## Project Overview

### Land Shepherd - Pixel Art Nature Simulation

**Land Shepherd** is a pixel art nature simulation built with pure WebGL and vanilla JavaScript. The project creates an interactive ecosystem where players can observe and interact with procedurally generated soil systems and plant life in a 2D top-down view.

#### Core Concept
- **Simulation Focus**: Realistic ecosystem modeling with soil chemistry, plant growth, and environmental interactions
- **Visual Style**: Pixel art aesthetics with procedurally generated textures and sprites
- **Technology**: WebGL-powered rendering with modular JavaScript architecture
- **Interactivity**: Click-to-move character, plant placement/removal, camera controls

#### Key Features
- **Advanced Soil System**: 50x50 grid with N-P-K chemistry, water retention, pollution modeling
- **Procedural Generation**: Coherent terrain zones using hotspot-based algorithms
- **Plant System**: Species-based procedural plant generation with JSON configuration
- **Performance Optimization**: Culling, batched rendering, texture caching (60+ FPS with 2500 cells)
- **Real-time Debug Interface**: Live metrics, layer toggles, configuration controls

---

## System Architecture

### Core Design Principles

1. **Modular Architecture**: Each system is independent with clear interfaces
2. **Entity-Component Pattern**: Entities have components for rendering, physics, behavior
3. **Manager-Based Systems**: Central managers coordinate related functionality
4. **Data-Driven Configuration**: JSON configs for species, world generation, debug settings
5. **WebGL Optimization**: Batched rendering, geometry caching, texture atlasing

### System Hierarchy

```
GraphicsEngine (main_graphics.js)
├── Core Managers
│   ├── ShaderManager - WebGL shader compilation/caching
│   ├── GeometryManager - Vertex buffer management/reuse
│   ├── DebugManager - Real-time metrics and controls
│   ├── TextureGenerator - Procedural soil texture generation
│   ├── SoilManager - Soil grid management and rendering
│   └── PlantManager - Plant placement and lifecycle
├── System Managers
│   ├── RenderSystem - Optimized entity batch rendering
│   ├── CameraManager - View transforms and camera controls
│   └── InputManager - Event handling and coordinate conversion
└── Entities
    ├── Character - Player avatar with movement
    ├── Plant - Individual plant instances
    └── Soil - Individual soil cells with properties
```

### Data Flow Architecture

1. **Input Layer**: InputManager captures events → converts coordinates
2. **Logic Layer**: Managers process game logic → update entity states
3. **Render Layer**: RenderSystem batches entities → optimized WebGL calls
4. **Debug Layer**: DebugManager monitors all systems → provides real-time feedback

---

## Architecture Rules for New Features

### 1. System Integration Guidelines

#### When Adding New Managers
- Create in appropriate directory (`core/` for engine systems, `systems/` for game logic)
- Initialize in `GraphicsEngine.initManagers()` with proper dependency order
- Implement standard lifecycle methods: `update(deltaTime)`, cleanup if needed
- Expose necessary APIs through GraphicsEngine getters

#### When Adding New Entities
- Place in `js/entities/` directory
- Implement required interface: `getRenderData()`, `update(deltaTime)`, `getRenderType()`
- Register with appropriate manager (e.g., PlantManager for plants)
- Follow entity naming convention: PascalCase classes

#### When Adding New Rendering Features
- Extend RenderSystem with new batch types if needed
- Create shaders in ShaderManager following existing patterns
- Use GeometryManager for reusable geometry (avoid duplicates)
- Maintain render order: soil → plants → characters → UI

### 2. Performance Requirements

#### Rendering Optimization
- **Target**: 60+ FPS with 2500+ visible cells
- **Batching**: Group similar entities into single draw calls
- **Culling**: Only render entities within camera bounds
- **Caching**: Reuse geometries, textures, and shaders

#### Memory Management
- Use object pooling for frequently created/destroyed entities
- Cache procedural generation results where possible
- Implement cleanup methods for WebGL resources
- Monitor texture memory usage (canvas textures add up quickly)

#### Update Optimization
- Use spatial partitioning for collision detection if needed
- Limit expensive calculations to visible entities only
- Implement dirty flagging for expensive updates
- Use requestAnimationFrame properly (already implemented)

### 3. Configuration and Extensibility

#### JSON Configuration Pattern
- All configurable parameters must go in `config.json`
- Use nested objects for logical grouping
- Provide sensible defaults for all parameters
- Document configuration impact in comments

#### Species System Extension
- New species: Create JSON file in `species/` directory
- Follow existing schema: id, commonName, category, appearance, proceduralModules
- Implement procedural generation in PlantGenerator
- Support multiple growth stages for future expansion

#### Procedural Generation Rules
- Use seed-based randomization for reproducible results
- Implement coherent spatial algorithms (avoid pure noise)
- Support intensity levels and smooth gradients
- Make generation parameters configurable

### 4. Code Quality Standards

#### Naming Conventions
- Classes: PascalCase (e.g., `PlantManager`)
- Files: snake_case (e.g., `plant_manager.js`)
- Methods/Variables: camelCase (e.g., `generateSprite`)
- Constants: UPPER_SNAKE_CASE (e.g., `DEFAULT_CELL_SIZE`)

#### Documentation Requirements
- JSDoc comments for all public methods
- System purpose documentation at file headers
- Inline comments for complex algorithms
- Update claude.md feature log for all changes

#### Error Handling
- Graceful degradation for missing resources
- Console warnings for non-critical failures
- Proper error propagation for critical failures
- Debug information should not leak to production

### 5. Testing and Validation

#### Before Implementing Features
- Verify no performance regression with existing systems
- Test with multiple browsers (Chrome, Firefox, Safari)
- Validate WebGL compatibility across devices
- Check memory usage with long-running sessions

#### Integration Testing
- Test new entities with existing render batching
- Verify camera/input coordinate transformations work
- Ensure debug interface shows relevant metrics
- Test configuration reloading if applicable

---

## Development Workflow Guidelines

### 1. Feature Development Process
1. **Plan**: Design system integration and data flow
2. **Configure**: Add necessary config parameters to `config.json`
3. **Implement**: Code following architecture patterns
4. **Integrate**: Hook into GraphicsEngine and appropriate managers
5. **Test**: Performance, compatibility, edge cases
6. **Document**: Update claude.md and add code comments

### 2. Code Organization
- Keep files focused on single responsibility
- Group related functionality in same directory
- Maintain consistent import/export patterns
- Use descriptive file names that match class names

### 3. WebGL Best Practices
- Minimize state changes between draw calls
- Use uniform buffers for shared data when possible
- Implement proper resource cleanup
- Handle WebGL context loss gracefully

### 4. Debugging and Monitoring
- Use DebugManager for runtime metrics
- Add debug visualization for new systems
- Implement toggle controls for new visual layers
- Monitor render call count and geometry reuse

---

## Future Architecture Considerations

### Planned System Extensions
- **Growth System**: Time-based plant lifecycle with multiple stages
- **Ecosystem Interactions**: Plant-soil nutrient exchange, plant competition
- **Weather System**: Seasonal effects, precipitation, temperature
- **Animal System**: Fauna with plant/terrain preferences
- **Audio System**: Spatialized ambient sounds and feedback

### Scalability Preparations
- Consider WebWorkers for heavy procedural generation
- Plan for save/load system with serializable state
- Design for network multiplayer (separate logic from rendering)
- Prepare for mobile touch input (already resolution-independent)

### Technology Evolution
- WebGPU migration path (keeping current abstraction layer)
- Progressive Web App features (offline capability)
- Advanced shader effects (wind animations, seasonal changes)
- Spatial audio integration for immersive experience

---

## Documentation Rules

### Core Principle
**Every task and feature implemented must be documented immediately after completion.**

### Documentation Requirements

1. **Feature Documentation**: Document all new features with:
   - Purpose and rationale
   - Implementation details
   - Files modified
   - Usage examples
   - Impact on existing systems

2. **Code Changes**: For every modification:
   - Document what was changed
   - Explain why it was changed
   - Note any dependencies or side effects
   - Include before/after behavior descriptions

3. **System Architecture**: Maintain documentation of:
   - How components interact
   - Data flow between systems
   - Key design decisions and trade-offs

### Documentation Locations

- **claude.md**: Development guidelines and high-level feature log
- **doc/**: Detailed technical documentation
- **README.md**: Project overview and setup instructions
- **Code comments**: Inline documentation for complex logic

### Documentation Standards

- Use clear, concise language
- Include code examples where helpful
- Date all entries
- Reference specific files and line numbers when relevant
- Explain the "why" not just the "what"

---

## Feature Implementation Log

### Nettle Flowering and Withered Stages (November 6, 2025)

**Purpose**: Complete the nettle species lifecycle with flowering and withered stages for realistic plant development and visual variety.

**Changes Made**:

1. **Species Configuration Enhancement**
   - **File**: `species/nettles.json`
   - **Implementation**: Added complete 4-stage lifecycle
   - **Details**:
     - Added purple flower color palette (`#8B4F9F`, `#7A4A8A`, `#6B3E7B`)
     - Added brown withered color palettes for leaves and stems
     - Added flower procedural module configuration
     - Complete lifecycle: Seedling → Vegetative → Flowering → Withered

2. **Plant Generator Expansion**
   - **File**: `js/procedural/plant_generator.js`
   - **Methods Added**: `generateFloweringSprite()`, `generateWitheredSprite()`
   - **Implementation**: New generation methods for flowering and withered stages
   - **Details**:
     - **Flowering Stage**: Same as vegetative but with purple flower cluster on top
     - **Withered Stage**: Brown colors with drooping leaves and curved petioles
     - Updated main router to handle new stage generators

3. **Specialized Drawing Methods**
   - **File**: `js/procedural/plant_generator.js`
   - **Methods Added**: `generateWitheredStem()`, `generateWitheredLeaves()`, `generateFlower()`, `drawWitheredLeaf()`
   - **Implementation**: Stage-specific rendering logic
   - **Details**:
     - **Flower Generation**: Small purple circles clustered at stem top with color variation
     - **Withered Stem**: Same structure as vegetative but with brown colors
     - **Withered Leaves**: Elongated, drooping leaves positioned lower with curved connections
     - **Visual Effects**: Proper drooping animation through quadratic curve petioles

**Visual Features**:
- **Flowering Stage**: Purple flower clusters at stem apex with size and color variation
- **Withered Stage**: Realistic drooping leaves with elongated shapes and brown coloration
- **Color Progression**: Green → Green + Purple → Brown transition through lifecycle
- **Botanical Accuracy**: Nettle-like serrated leaves maintained throughout all stages

**Impact**:
- Complete realistic plant lifecycle with 4 distinct visual stages
- Enhanced ecosystem realism with natural plant progression
- Foundation for future seasonal and environmental effects
- Improved visual variety in plant populations

**Usage**: Right-click plants to advance through all stages: Seedling → Vegetative → Flowering → Withered → Remove

**Technical Notes**:
- Maintains existing procedural generation patterns
- Fully compatible with current growth advancement system
- Uses established color palette and module configuration architecture
- No breaking changes to existing plant management system

### Plant Spawning Randomization (November 6, 2025)

**Purpose**: Make plant placement more organic and natural-looking by adding randomization to both position and appearance.

**Changes Made**:

1. **Random Plant Positioning Within Cells**
   - **File**: `js/core/plant_manager.js`
   - **Method**: `addPlant()`
   - **Implementation**: Added random offset calculation within cell bounds
   - **Details**: 
     - Plants now spawn anywhere within clicked cell instead of bottom-center
     - 2-pixel margin from cell edges to prevent border placement
     - Uses `Math.random()` for X and Y offsets within cell size

2. **Random Leaf Attachment Points**
   - **File**: `js/procedural/plant_generator.js`
   - **Method**: `generateSeedlingLeaves()`
   - **Implementation**: Random selection of attachment points instead of sequential
   - **Details**:
     - Randomly selects 2 of 3 available stem attachment points
     - Maintains existing left/right side logic
     - Prevents duplicate attachment point selection

**Impact**:
- Greatly improved visual diversity in nettle patches
- More natural, organic appearance
- No breaking changes to existing plant system
- Compatible with all existing species configurations

**Usage**: Simply click on soil cells to place plants - randomization happens automatically

**Technical Notes**:
- Randomization occurs at plant creation time, not render time
- Each plant instance maintains its randomized position/appearance
- Uses JavaScript's built-in `Math.random()` for consistency

### Plant Growth Stages System (November 6, 2025)

**Purpose**: Implement proper multi-stage plant growth with visual progression from seedling to mature plant.

**Changes Made**:

1. **Species Configuration Enhancement**
   - **File**: `species/nettles.json`
   - **Implementation**: Added dual growth stages (Seedling → Vegetative)
   - **Details**:
     - Seedling: 50% smaller stem, 2 leaves at top only
     - Vegetative: Full-size stem, leaves distributed along stem
     - Stage-specific procedural parameters

2. **Multi-Stage Plant Generator**
   - **File**: `js/procedural/plant_generator.js`
   - **Method**: `generatePlantSprite()` with stage routing
   - **Implementation**: Dynamic sprite generation based on growth stage
   - **Details**:
     - Stage-specific stem heights and leaf counts
     - Proper texture cache clearing for visual updates
     - Backward-compatible with existing plant system

3. **Plant Entity Growth Progression**
   - **File**: `js/entities/plant.js`
   - **Method**: `advanceGrowthStage()`
   - **Implementation**: Automatic progression through configured stages
   - **Details**:
     - Returns true/false for successful advancement
     - Regenerates sprite when advancing stages
     - Clears WebGL texture cache for immediate visual update

4. **Right-Click Plant Management**
   - **File**: `js/core/main_graphics.js`
   - **Implementation**: Three-stage right-click cycle
   - **Details**:
     - First click: Spawn seedling at exact click position
     - Second click: Advance to next growth stage
     - Third click: Remove plant (when at final stage)

**Impact**:
- Realistic plant development lifecycle
- Intuitive plant management interface
- Visual feedback for plant interactions
- Foundation for future ecosystem features

**Usage**: Right-click on soil cells to cycle through: spawn → grow → remove

### Coordinate System Fix (November 6, 2025)

**Purpose**: Resolve visual offset between click position and plant placement for intuitive user interaction.

**Problem Identified**: Plants were rendering with top-left corner at click position while click markers were centered, creating visual misalignment.

**Changes Made**:

1. **Plant Rendering Centering**
   - **File**: `js/entities/plant.js`
   - **Method**: `getRenderData()`
   - **Fix**: Center plant sprite on stored coordinates
   - **Details**: Subtract half width/height from render position

2. **Debug Visualization System**
   - **File**: `js/core/main_graphics.js`
   - **Implementation**: Red crosshair markers show exact click positions
   - **Details**:
     - Temporary visual markers (3-second duration)
     - Centered positioning matching plant placement
     - Proper entity lifecycle management

3. **Character Entity Interface**
   - **File**: `js/entities/character.js`
   - **Fix**: Added missing `getRenderType()` method
   - **Details**: Prevents rendering system TypeError

**Impact**:
- Perfect alignment between click position and plant placement
- Intuitive user interaction matching visual expectations
- Robust entity rendering system
- Foundation for precise plant placement mechanics

**Technical Notes**:
- All entities now require `getRenderType()` method
- Coordinate system uses centered positioning consistently
- Debug markers automatically clean up to prevent memory leaks