# Land Shepherd Documentation Index

**Last updated:** 2025-12-06 (Root Depth & Nutrient Cycling System Complete)

Welcome to the Land Shepherd documentation. This index helps you find the information you need quickly.

## Quick Links

- **For AI Agents**: See [Agent System Guide](guides/agents-guide.md) or check `.opencode/agent/` for agent definitions
- **For Developers**: Start with [Getting Started](../README.md#installation-and-launch)
- **For Testing**: See [Verification Workflow](testing/interactive-testing.md) or run `npm run verify`

## Agent System

Land Shepherd uses 5 specialized AI agents for development:

- **shepherd-architect** (`.opencode/agent/shepherd-architect.md`) - Feature planning, system design, orchestration
- **shepherd-core** (`.opencode/agent/shepherd-core.md`) - WebGL rendering, shaders, performance
- **shepherd-feature** (`.opencode/agent/shepherd-feature.md`) - Managers, entities, gameplay systems
- **shepherd-verify** (`.opencode/agent/shepherd-verify.md`) - Testing, validation, quality gates
- **shepherd-docs** (`.opencode/agent/shepherd-docs.md`) - Documentation maintenance

See [Agent System Guide](guides/agents-guide.md) for detailed explanations.

---

## Documentation Categories

### Guides
Developer workflows, conventions, and best practices.

- [dev-guidelines.md](dev-guidelines.md) - Quick reference and routing document
- [agents-guide.md](guides/agents-guide.md) - Agent system explained for humans

### Architecture
System design, technical details, and rendering pipeline.

- [rendering-workflow.md](architecture/rendering-workflow.md) - WebGL rendering pipeline
- [technical-reference.md](architecture/technical-reference.md) - Core technical reference

### Features
Feature-specific documentation with implementation details.

- [config-validation-system.md](features/config-validation-system.md) - JSON schema validation for configs
- [root-depth-nutrient-cycling.md](features/root-depth-nutrient-cycling.md) - 2-layer soil with nutrient cycling (NEW)
- [starvation-visualization-system.md](features/starvation-visualization-system.md) - Multi-stage nutrient deficiency visualization
- [oak-genetics-system.md](features/oak-genetics-system.md) - Oak genetics, reproduction, and inheritance
- [plant-generation-system.md](features/plant-generation-system.md) - Procedural plant generation
- [reproduction-system.md](features/reproduction-system.md) - Plant reproduction mechanics
- [fertility-system.md](features/fertility-system.md) - Soil fertility system
- [nutrient-system.md](features/nutrient-system.md) - Multi-nutrient system (N, P, K, OM)
- [terrain-generation-system.md](features/terrain-generation-system.md) - Procedural rivers, lakes, and fertility zones
- [context-menu-system.md](features/context-menu-system.md) - Context menu implementation
- [visual-feedback-system.md](features/visual-feedback-system.md) - Visual feedback mechanics
- [weather-system.md](features/weather-system.md) - Weather state management and effects
- [lighting-system.md](features/lighting-system.md) - Day/night cycle with weather integration

### Testing
Testing strategy, verification workflows, and test framework documentation.

- [interactive-testing.md](testing/interactive-testing.md) - Interactive testing framework API
- [setup-verification.md](testing/setup-verification.md) - Initial verification setup

### Troubleshooting
Common issues, debugging guides, and fix documentation.

- [reproduction-issues.md](troubleshooting/reproduction-issues.md) - Reproduction system issues
- [context-menu-fixes.md](troubleshooting/context-menu-fixes.md) - Context menu fixes

### Devlogs
Development history, feature implementation logs, and architectural decisions.

- [devlogs/](devlogs/) - Chronological development logs organized by year-month

#### December 2025
- [2025-12-05: Milestone 3 - Starvation Visualization](devlogs/2025-12/2025-12-05-milestone3-starvation-visualization.md) - Multi-stage nutrient deficiency visuals (NEW)
- [2025-12-03: Config Validation System](devlogs/2025-12/2025-12-03-config-validation-system.md) - JSON Schema validation for all configs
- [2025-12-03: PlantGenerator Modular Refactor](devlogs/2025-12/2025-12-03-generator-refactor.md) - Refactored to plugin architecture
- [2025-12-03: Nettles Category Bugfix](devlogs/2025-12/2025-12-03-nettles-category-fix.md) - Fixed invalid category causing green rectangle rendering
- [2025-12-02: Oak Genetics System (Complete)](devlogs/2025-12/2025-12-02-oak-genetics-complete.md) - Full genetics with proximity reproduction
- [2025-12-01: Multi-Layer Planting System](devlogs/2025-12/2025-12-01-multi-layer-planting-complete.md) - Multiple plants per cell

---

## Quick Reference

### Testing Commands
```bash
npm run verify                # Standard verification
npm run verify:interactive    # Full interactive mode with screenshots
npm run verify:baseline       # Create new baseline
npm run verify:screenshot-only # Screenshots only
npm run verify:log-only       # Log analysis only
```

### Project Structure
```
landSheperd/
├── .opencode/agent/     # AI agent definitions
├── doc/                 # Documentation (you are here)
├── js/
│   ├── core/           # Core engine systems
│   ├── systems/        # Game systems
│   ├── entities/       # Game entities
│   └── procedural/     # Procedural generation
├── tests/              # Playwright tests
│   ├── html/          # Manual HTML tests
│   └── manual/        # Manual test utilities
├── species/            # Species JSON configs
└── config.json         # Global configuration
```

### Key Files
- `README.md` - Project overview and setup
- `AGENTS.md` - Agent routing guide
- `config.json` - All configuration parameters
- `package.json` - npm scripts and dependencies

---

## Finding Documentation

**By Topic:**
- WebGL/Rendering → [Architecture](#architecture)
- Gameplay Features → [Features](#features)
- Testing/Verification → [Testing](#testing)
- Bugs/Issues → [Troubleshooting](#troubleshooting)
- Project History → [Devlogs](#devlogs)

**By Role:**
- AI Agent → [Agent System Guide](guides/agents-guide.md)
- New Developer → [README.md](../README.md) + [dev-guidelines.md](dev-guidelines.md)
- Feature Developer → [dev-guidelines.md](dev-guidelines.md) + [Features](#features)
- Bug Fixer → [Troubleshooting](#troubleshooting)

---

## Contributing to Documentation

When adding/updating documentation:

1. **After implementing feature**: Update `dev-guidelines.md` with implementation details
2. **For major features**: Create detailed doc in appropriate category
3. **For visual changes**: Update baseline with `npm run verify:baseline`
4. **For breaking changes**: Update `CHANGELOG.md`
5. **Always**: Update "Last updated" date in modified files

See [shepherd-docs agent](.opencode/agent/shepherd-docs.md) for full documentation workflow.

---

**Need Help?** Check the appropriate category above or search for keywords in this index.
