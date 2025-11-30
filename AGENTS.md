# Agent Guidelines for Land Shepherd

## Documentation Structure

**This project uses organized, modular documentation. For comprehensive information, see:**

- **[doc/INDEX.md](doc/INDEX.md)** - Complete documentation navigation hub
- **[doc/dev-guidelines.md](doc/dev-guidelines.md)** - Quick reference and routing guide
- **[doc/guides/](doc/guides/)** - Developer guides and workflows
- **[doc/architecture/](doc/architecture/)** - System architecture and technical reference
- **[doc/features/](doc/features/)** - Feature-specific documentation
- **[doc/testing/](doc/testing/)** - Testing documentation and verification guides
- **[doc/troubleshooting/](doc/troubleshooting/)** - Problem-solving guides
- **[doc/devlogs/](doc/devlogs/)** - Development history by date

## Running the Project
- **No build step required** - Pure vanilla JS with direct script loading
- **Local server**: `python -m http.server 8081` or `npx http-server -p 8081` or use VS Code Live Server (port 8081)
- **Browser**: Open `http://localhost:8081` (requires WebGL support)
- **Note**: Port 8081 is used to avoid conflicts with other local services (e.g., Traefik on port 8080)
- **Automated testing**: Use `npm run verify` to validate changes with screenshot and console capture

## Code Style & Conventions
- **Classes**: PascalCase (`PlantManager`, `GraphicsEngine`) in snake_case files (`plant_manager.js`)
- **Methods/Variables**: camelCase (`generateSprite`, `deltaTime`)
- **Constants**: UPPER_SNAKE_CASE in config.json
- **No emojis**: Never use emojis in console output, comments, or documentation
- **No imports/exports**: Script tags in index.html - maintain load order (core → procedural → systems → entities → main)
- **Comments**: JSDoc for classes/public methods, inline for complex algorithms
- **Error handling**: `console.error()` for critical failures, `console.warn()` for non-critical, graceful degradation for missing resources

## Architecture Rules
- **Modular managers**: Each system is independent with clear interfaces
- **Initialize in GraphicsEngine**: Add managers to `initManagers()` with proper dependency order
- **Entity interface**: Must implement `getRenderData()`, `update(deltaTime)`, `getRenderType()`
- **Configuration**: All parameters go in `config.json` with nested structure
- **Performance**: Target 60+ FPS - use batching, caching (GeometryManager), culling
- **Render order**: soil → plants → characters → UI

## Verifying Your Changes
After making changes, **agents MUST verify their work** before considering a task complete.

### Quick Verification
```bash
npm run verify
```

### Interactive Testing
For advanced testing with screenshots and log analysis:
```bash
npm run verify:interactive          # Full interactive mode
npm run verify:screenshot-only      # Screenshots only
npm run verify:log-only             # Log analysis only
```
See [doc/testing/interactive-testing.md](doc/testing/interactive-testing.md) for detailed usage and API reference.

This automated test will:
1. Start local server on port 8081
2. Launch headless browser with WebGL support
3. Capture screenshot and console output
4. Measure FPS and load time
5. Compare against baseline (if exists)
6. Generate agent-parseable report in `test-results/latest/`
7. Return exit code 0 (pass) or 1 (fail)

### Expected Results
- **PASS**: No console errors, FPS ≥30, WebGL initialized, visual diff <5%
- **FAIL**: Console errors present, FPS <30, or significant visual changes

### Creating Baseline
After verifying a good state (typically after completing a feature):
```bash
npm run verify:baseline
```
This saves the current state as the reference for future comparisons.

### Reading Results
Agents should parse `test-results/latest/report.json` for structured data:
```json
{
  "status": "PASS",
  "metrics": {
    "console_errors": 0,
    "console_warnings": 2,
    "fps_average": 62,
    "load_time_ms": 850,
    "webgl_context": "ok"
  },
  "recommendations": [
    "✓ No console errors detected",
    "✓ FPS 62 meets target (60+)",
    "⚠ 2 warnings found - review texture loading"
  ]
}
```

### Key Metrics
- `status`: "PASS" or "FAIL" - Overall result
- `metrics.console_errors`: Must be 0 for PASS
- `metrics.fps_average`: Must be ≥30 for PASS (headless Chrome uses software rendering)
- `metrics.webgl_context`: Must be "ok" for PASS
- `visual.pixel_difference_percent`: Must be <5% for PASS (if baseline exists)
- `recommendations`: Human-readable list of issues/suggestions

### First Run Setup
```bash
npm install
npm run verify:baseline
```
This installs dependencies and creates initial baseline.

### Troubleshooting
- **Port 8081 busy**: Kill existing process or change port in `playwright.config.js`
- **WebGL errors in headless**: Expected - Chrome uses software rendering (SwiftShader)
- **No baseline found**: First verification run will skip visual comparison
- **Tests timeout**: Increase timeout in `playwright.config.js` if needed

### Agent Workflow
1. Make code changes
2. Run `npm run verify`
3. If FAIL: Read recommendations, fix issues, repeat
4. If PASS: Update `doc/dev-guidelines.md` with changes
5. Consider creating new baseline if visual changes are intentional

## Documentation
- **Update feature docs** after every feature in `doc/features/` with implementation details
- **Create devlogs** for significant features in `doc/devlogs/YYYY-MM/`
- **Update guides** if workflows change in `doc/guides/`
- **Architecture docs**: Place system design docs in `doc/architecture/`
- **Code comments**: Document "why" not "what"
- **See**: [doc/INDEX.md](doc/INDEX.md) for complete documentation structure
