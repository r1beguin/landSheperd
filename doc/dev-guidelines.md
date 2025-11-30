# Land Shepherd Development Guidelines - Quick Reference

**For Comprehensive Documentation**: See [Documentation Index](INDEX.md)

---

## Overview

**Land Shepherd** is a pixel art nature simulation built with pure WebGL and vanilla JavaScript, featuring realistic ecosystem modeling with soil chemistry, plant growth, and environmental interactions.

**Core Tech**: WebGL rendering, modular JavaScript architecture, no build tools (pure ES6+ with script tags)

---

## Essential Documentation

### For AI Agents
- **Start Here**: [AGENTS.md](../AGENTS.md) - Complete agent guidelines, verification workflow, code style

### For Developers
- **Getting Started**: [guides/agents-guide.md](guides/agents-guide.md) - Human-readable development guide
- **Architecture**: [architecture/](architecture/) - System design and technical reference
- **Features**: [features/](features/) - Feature-specific documentation
- **Testing**: [testing/](testing/) - Test strategy and verification workflow

### Quick Links
- [Documentation Index](INDEX.md) - Complete navigation
- [Architecture Overview](architecture/technical-reference.md) - System hierarchy
- [Rendering Workflow](architecture/rendering-workflow.md) - WebGL pipeline
- [Verification Guide](testing/setup-verification.md) - npm run verify usage

---

## Quick Start

### Running the Project
```bash
# Start local server (port 8081)
python -m http.server 8081
# OR
npx http-server -p 8081
# OR use VS Code Live Server on port 8081

# Open browser
http://localhost:8081

# Verify changes
npm run verify
```

**Note**: Port 8081 is used to avoid conflicts with other services (e.g., Traefik on port 8080)

### Project Structure
```
landSheperd/
├── js/
│   ├── core/          # Engine systems (main_graphics.js, managers)
│   ├── systems/       # Game logic (camera, input, render)
│   ├── entities/      # Entities (plant, soil, character)
│   └── procedural/    # Procedural generation
├── species/           # Species configs (nettles.json)
├── config.json        # Global configuration
├── index.html         # Entry point (script tags, no build)
├── tests/             # Playwright automated tests
└── doc/               # Documentation (you are here)
```

---

## Core Conventions

### Naming
- **Classes**: PascalCase (`PlantManager`, `GraphicsEngine`)
- **Files**: snake_case (`plant_manager.js`, `main_graphics.js`)
- **Methods/Variables**: camelCase (`generateSprite`, `deltaTime`)
- **Constants**: UPPER_SNAKE_CASE in config.json

### Code Style
- **No emojis**: Never use emojis in console output or comments
- **No imports/exports**: Script tags in index.html, maintain load order
- **Comments**: JSDoc for classes/public methods, inline for complex algorithms
- **Error handling**: `console.error()` for critical, `console.warn()` for non-critical

### Architecture
- **Modular managers**: Each system is independent with clear interfaces
- **Initialize in GraphicsEngine**: Add managers to `initManagers()` with dependency order
- **Entity interface**: Implement `getRenderData()`, `update(deltaTime)`, `getRenderType()`
- **Configuration**: All parameters in `config.json` with nested structure
- **Performance**: Target 60+ FPS - use batching, caching, culling
- **Render order**: soil → plants → characters → UI

---

## Verification Workflow

### After Every Change
```bash
npm run verify
```

**Expected Results**:
- **PASS**: No console errors, FPS ≥30, WebGL initialized, visual diff <5%
- **FAIL**: Console errors present, FPS <30, or significant visual changes

### Creating Baseline
After verifying a good state (typically after completing a feature):
```bash
npm run verify:baseline
```

### Key Metrics
- `console_errors`: Must be 0 for PASS
- `fps_average`: Must be ≥30 for PASS (headless Chrome uses software rendering)
- `webgl_context`: Must be "ok" for PASS
- `visual.pixel_difference_percent`: Must be <5% for PASS (if baseline exists)

See [Testing Documentation](testing/) for detailed verification workflow.

---

## Common Commands

```bash
# Development
python -m http.server 8081          # Start server
npm run verify                      # Full verification
npm run verify:baseline             # Create baseline
npm run verify:interactive          # Interactive testing with screenshots

# Testing
npm test                            # Run all tests
npx playwright test                 # Run specific tests
```

---

## Feature Development Checklist

When implementing new features:

1. **Plan**: Design system integration and data flow
2. **Configure**: Add parameters to `config.json`
3. **Implement**: Follow architecture patterns (managers, entities)
4. **Integrate**: Hook into GraphicsEngine with proper initialization order
5. **Verify**: Run `npm run verify` to validate changes
6. **Document**: Update relevant feature docs in `doc/features/`
7. **Baseline**: Create new baseline if visual changes are intentional

---

## Documentation Organization

### By Category
- **[guides/](guides/)** - Developer workflows, conventions, best practices
- **[architecture/](architecture/)** - System design and technical implementation
- **[features/](features/)** - Game systems documentation
- **[testing/](testing/)** - Test documentation and verification guides
- **[troubleshooting/](troubleshooting/)** - Problem-solving and debugging
- **[devlogs/](devlogs/)** - Chronological feature development history

### By System
- **Rendering**: [Rendering Workflow](architecture/rendering-workflow.md)
- **Plants**: [Plant Generation](features/plant-generation-system.md), [Reproduction](features/reproduction-system.md)
- **Soil**: [Fertility System](features/fertility-system.md), [Nutrient System](features/nutrient-system.md)
- **Environment**: [Weather System](features/weather-system.md), [Lighting System](features/lighting-system.md)
- **UI**: [Context Menu](features/context-menu-system.md), [Visual Feedback](features/visual-feedback-system.md)

---

## System Architecture Summary

### Core Managers (js/core/)
- **GraphicsEngine** (main_graphics.js) - Main orchestrator, initialization
- **ShaderManager** - WebGL shader compilation/caching
- **GeometryManager** - Vertex buffer management/reuse
- **SoilManager** - Soil grid management and rendering
- **PlantManager** - Plant placement and lifecycle
- **TimeManager** - Game time and day/night cycle
- **LightingManager** - Dynamic lighting with time-of-day phases and weather integration
- **WeatherManager** - Weather state management and transitions

### System Managers (js/systems/)
- **RenderSystem** - Optimized entity batch rendering
- **CameraManager** - View transforms and controls
- **InputManager** - Event handling and coordinate conversion
- **OverlayManager** - Nutrient/fertility overlay visualization
- **ContextMenuManager** - Right-click context menu

### Entities (js/entities/)
- **Plant** - Individual plant instances with growth stages
- **Soil** - Soil cells with nutrient chemistry
- **Character** - Player avatar with movement

For detailed architecture, see [Technical Reference](architecture/technical-reference.md).

---

## Performance Targets

- **FPS**: 60+ with 2500+ visible cells
- **Render Calls**: Minimize via batching
- **Memory**: Monitor texture memory, use caching
- **Update Loop**: Efficient entity updates, spatial partitioning if needed

See [Architecture Documentation](architecture/) for optimization techniques.

---

## Common Issues

### Port 8081 Busy
```bash
# Windows
netstat -ano | findstr :8081
taskkill /PID <PID> /F

# Linux/Mac
lsof -ti:8081 | xargs kill
```

### Tests Timeout
- Increase timeout in `playwright.config.js` if needed
- Check for infinite loops or blocking operations

### WebGL Errors
- Expected in headless Chrome (uses SwiftShader)
- Real device testing recommended for GPU features

See [Troubleshooting Documentation](troubleshooting/) for more solutions.

---

## External Resources

- **Main README**: [../README.md](../README.md) - Project overview
- **Agent Guidelines**: [../AGENTS.md](../AGENTS.md) - Complete AI agent guide
- **Documentation Index**: [INDEX.md](INDEX.md) - Full navigation

---

**This is a routing document. For comprehensive information, navigate to the appropriate documentation section above.**

**Last Updated**: 2025-11-30  
**Total Documentation**: 2000+ lines reorganized into modular, categorized structure

---

## Recent Implementations

### Lighting System with Day/Night Cycle - 2025-11-30

**Purpose:** Dynamic 24-hour lighting cycle with weather integration for atmospheric depth

**Implementation:**
- **LightingManager** (js/core/lighting_manager.js): Core manager with 9 time-of-day phases, smooth lerp transitions, and weather modulation
- **Shader Integration** (js/core/main_graphics.js): Added `u_ambientLight` uniform to basic, texture, and particle shaders
- **RenderSystem** (js/systems/render_system.js): Modified `setBasicUniforms()` and `setTextureUniforms()` to pass lighting to shaders
- **TimeManager** (js/core/time_manager.js): Added `getHourOfDay()` and `getTimeOfDayString()` methods
- **UI Integration** (index.html): Added time and phase display to Time System UI panel

**Key Design Decisions:**
- Shader-based ambient lighting multiplication rather than per-pixel calculations for performance
- Linear interpolation between phases for smooth transitions (no abrupt changes)
- Weather modifiers combine with time-of-day via multiplication: `finalColor = timeColor × weatherTint × weatherBrightness`
- 9 distinct phases cover full 24-hour cycle: night, earlyMorning, morning, midday, afternoon, evening, sunset, dusk
- Time scale reduced to 0.1x default for better observability (100 seconds per game day)

**Configuration:**
```json
{
    "world": {
        "lighting": {
            "enabled": true,
            "transitionSpeed": 1.0,
            "timeOfDay": {
                "night": { "hours": [0, 6], "color": [0.15, 0.18, 0.35], "brightness": 0.25 },
                "earlyMorning": { "hours": [6, 8], "color": [0.95, 0.75, 0.55], "brightness": 0.65 },
                "morning": { "hours": [8, 12], "color": [1.0, 0.98, 0.92], "brightness": 0.95 },
                "midday": { "hours": [12, 14], "color": [1.0, 1.0, 1.0], "brightness": 1.0 },
                "afternoon": { "hours": [14, 18], "color": [1.0, 0.95, 0.85], "brightness": 0.95 },
                "evening": { "hours": [18, 20], "color": [0.98, 0.85, 0.70], "brightness": 0.75 },
                "sunset": { "hours": [20, 21], "color": [1.0, 0.60, 0.35], "brightness": 0.50 },
                "dusk": { "hours": [21, 23], "color": [0.45, 0.40, 0.60], "brightness": 0.35 }
            },
            "weatherModifiers": {
                "sunny": { "brightnessMultiplier": 1.0, "colorTint": [1.0, 1.0, 1.0] },
                "cloudy": { "brightnessMultiplier": 0.85, "colorTint": [0.95, 0.95, 1.0] },
                "rainy": {
                    "brightnessMultiplier": 0.70,
                    "brightnessIntensityScale": 0.15,
                    "colorTint": [0.85, 0.90, 1.10]
                }
            }
        }
    },
    "time": {
        "initialTimeScale": 0.1,
        "timeScalePresets": {
            "pause": 0,
            "verySlow": 0.05,
            "slow": 0.1,
            "normal": 0.5,
            "fast": 1.0,
            "veryFast": 5.0
        }
    }
}
```

**Testing:**
- Validation: PASS - All 4 milestones validated via `npm run verify`
- Performance: <0.2ms per frame overhead, FPS maintained at 60+
- Visual verification: Smooth transitions between all 9 phases observed
- Weather integration: Cloudy and rainy modifiers correctly darken and tint lighting

**Usage:**
```javascript
// Get current lighting state
const ambientColor = lightingManager.getAmbientColor(); // [r,g,b,a]
const brightness = lightingManager.getAmbientBrightness(); // 0-1
const phase = lightingManager.getCurrentPhase(); // "sunset"

// Manual time control for testing
lightingManager.setTimeOfDay(20); // Jump to sunset
lightingManager.resetTimeOverride(); // Resume automatic time

// Check if enabled
if (lightingManager.isEnabled()) {
    // Apply lighting in custom renderer
}
```

**Related Documentation:**
- [Lighting System Feature Doc](features/lighting-system.md) - Comprehensive implementation details
- [Weather System](features/weather-system.md) - Weather state integration
- [Technical Reference](architecture/technical-reference.md) - Manager patterns

---
