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
