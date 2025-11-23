# Console Message Standards for Land Shepherd

**Last Updated:** November 23, 2025

## Overview

All console output in the Land Shepherd project must follow strict guidelines to maintain code quality and compliance with AGENTS.md standards.

## Core Requirements

### 1. No Emojis
- ❌ NEVER use emoji symbols in console messages
- ❌ No visual decorators (🔧, 🎨, ✅, ⚡, 📍, 🗺️, etc.)
- ✅ Use text-only category prefixes instead

### 2. English Only
- ❌ No French text (activé, désactivé, initialisé, généré, etc.)
- ❌ No multilingual messages
- ✅ All messages in clear, professional English

### 3. Category Prefix System
- ✅ All messages use [CATEGORY] prefix format
- ✅ Consistent categorization across the codebase
- ✅ Immediate visual identification of message type

## Standard Categories

| Category | Purpose | Example Usage |
|----------|---------|---------------|
| [INIT] | System initialization and startup | System ready, manager created |
| [CONFIG] | Configuration loading and updates | Settings loaded, parameters changed |
| [DEBUG] | Debug-specific information | Layer toggled, state synchronized |
| [TEXTURE] | Texture generation and management | Textures created, cache operations |
| [GENERATION] | Procedural generation processes | Maps generated, hotspots created |
| [SHADER] | Shader compilation and linking | Shader compiled, program linked |
| [TIME] | Time management operations | Time scaled, paused, resumed |
| [CAMERA] | Camera positioning and updates | Position set, zoom changed |
| [ERROR] | Critical error conditions | Fatal failures, exceptions |
| [PLANT] | Plant system operations | Plants added, growth advanced |

## Message Format Examples

### Good Examples ✅



### Bad Examples ❌



## Verbosity Control

### Debug-Only Messages

Wrap verbose initialization logs in debug checks:



### Error Severity Levels



## Recent Cleanup Summary (Nov 23, 2025)

All console messages were cleaned to comply with these standards:

### Files Modified
1. **js/core/debug_manager.js** - 4 messages cleaned
2. **js/core/procedural_generator.js** - 5 messages cleaned (emojis + French)
3. **js/core/texture_generator.js** - 6 messages cleaned (emojis + French)
4. **js/core/shader_manager.js** - 2 messages cleaned (French)
5. **js/core/main_graphics.js** - 8 messages cleaned/categorized
6. **js/core/soil_manager.js** - 5 messages cleaned/categorized
7. **js/core/time_manager.js** - 8 messages cleaned/categorized

### Verification Results
- ✅ Zero emojis found in console output
- ✅ Zero French text in console messages
- ✅ All messages use proper [CATEGORY] prefixes
- ✅ Consistent English formatting throughout

## Implementation Checklist

When adding new console messages:

- [ ] Message is in English only
- [ ] No emoji or special unicode characters used
- [ ] Proper [CATEGORY] prefix applied
- [ ] Appropriate severity level (log/warn/error)
- [ ] Verbose messages wrapped in debug checks if applicable
- [ ] Message provides useful, actionable information

## Future Enhancements

Consider implementing:
1. Centralized LogManager class for consistent formatting
2. Log level filtering (INFO, WARN, ERROR, DEBUG)
3. Log message categorization and search functionality
4. Optional log output to file for debugging

## References

- See  for detailed cleanup documentation
- See  for overall project coding standards
- See  for general development guidelines
