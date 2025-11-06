
# Plant DNA System – Procedural Species Definition

This document describes the structure of the **DNA configuration file** (`species.json`) used to define plant species in the game.  
Each species file contains all genetic, visual, and environmental parameters required to procedurally generate unique plant individuals and simulate their growth, adaptation, and health.

---

## Overview

Each plant species is represented by a **JSON file** acting as its genetic blueprint.  
When the game instantiates a plant, it creates a **Genome** (with small mutations) from this base file.  
Environmental conditions and health states influence the **Phenotype** (the visual expression of the genome).  
Procedural generation modules use these data to produce the plant’s appearance for each growth stage.

```
species.json → Genome (individual variation)
Genome + Environment → Phenotype
Phenotype → Procedural Modules → Rendered Sprite
```

---

## File Structure

See the complete JSON schema example below (abridged here for clarity).  
Refer to the `species_template.json` file in `/Data/Plants` for the full version.

```jsonc
{
  "id": "brassica_oleracea",
  "commonName": "Cabbage",
  "category": "vegetable",
  "layer": "middle",                      // "low" | "middle" | "top"
  "growthType": "annual",                 // "annual" | "perennial" | "biennial"

  "environment": {
    "fertilityPref": 0.7,                // optimal fertility [0–1]
    "waterNeeds": 0.8,                   // water requirement [0–1]
    "pollutionTolerance": 0.4,           // resistance to soil pollution [0–1]
    "shadeTolerance": 0.3,               // low = prefers full sun
    "temperatureRange": [10, 30],        // min/max in °C
    "soilPhRange": [6.0, 7.5],
    "climateZone": ["temperate"]
  },

  "shapeDNA": {
    "leafShape": 0.6,                    // 0 = pointed, 1 = round
    "leafSize": 0.8,
    "leafDensity": 0.7,
    "stemHeight": 0.5,
    "stemThickness": 0.3,
    "branchingFactor": 0.4,
    "flowerDensity": 0.2,
    "rootDepth": 0.6
  },

  "appearance": {
    "colorPalette": {
      "leaf": ["#6da34d", "#4b8038", "#385c2b"],
      "stem": ["#705a3d", "#4b392a"],
      "flower": ["#ffd1e1", "#ffc2c2", "#ffb2a1"],
      "fruit": ["#ff9933", "#cc6600"]
    },
    "patternDNA": {
      "leafVeinContrast": 0.6,
      "barkRoughness": 0.4,
      "petalSymmetry": 0.9,
      "spotFrequency": 0.2,
      "translucency": 0.3
    }
  },

  "abilities": {
    "nitrogenFixation": false,
    "allelopathy": false,
    "pollinatorAttraction": 0.7,
    "pestResistance": 0.3,
    "symbioticPartners": ["trifolium_repens"]
  },

  "growth": {
    "speed": 1.0,                        // relative growth speed
    "yieldBase": 1.0,                    // base yield
    "lifespanDays": 90,
    "germinationTime": 5,
    "maturityTime": 40,
    "floweringTime": 20,
    "regrowthAbility": 0.3,              // chance of regrowth after withering
    "perennialCycle": 0.2
  },

  "growthStages": [
    {
      "name": "Seed",
      "duration": 5,
      "generator": "seedGeneration",
      "visibleOrgans": ["seed"]
    },
    {
      "name": "Sappling",
      "duration": 10,
      "generator": "sapplingGeneration",
      "visibleOrgans": ["stem"]
    },
    {
      "name": "Leaf",
      "duration": 20,
      "generator": "leafGeneration",
      "visibleOrgans": ["stem", "leaf"]
    },
    {
      "name": "Flowering",
      "duration": 15,
      "generator": "flowerGeneration",
      "visibleOrgans": ["stem", "leaf", "flower"]
    },
    {
      "name": "Withered",
      "duration": 5,
      "generator": "witherGeneration",
      "visibleOrgans": ["stem", "leaf"]
    }
  ],

  "proceduralModules": {
    "trunk": {
      "enabled": false,
      "branchCount": 0,
      "roughness": 0.5,
      "growthForm": "none"
    },
    "stem": {
      "segments": 5,
      "curveIntensity": 0.2,
      "colorVariation": 0.1,
      "baseWidth": 0.3
    },
    "leaf": {
      "shapeType": "oval",               // "oval" | "lanceolate" | "heart" | "palmate"
      "irregularity": 0.2,
      "venationPattern": "reticulate",   // "parallel", "reticulate", "palmate"
      "edgeVariation": 0.3
    },
    "flower": {
      "petalCount": 5,
      "petalVariation": 0.2,
      "centerSize": 0.3,
      "symmetry": 0.9
    },
    "fruit": {
      "enabled": true,
      "size": 0.4,
      "colorShift": [10, -10, 0],
      "texture": "smooth"
    },
    "root": {
      "depth": 0.6,
      "spread": 0.4,
      "nodules": 0.1
    }
  },

  "stressResponses": {
    "waterDeficit": {
      "leafDroop": 0.6,
      "colorFade": 0.4,
      "growthSlowdown": 0.7
    },
    "pollution": {
      "leafSpotting": 0.5,
      "stemDarkening": 0.3
    },
    "disease": {
      "patternDistortion": 0.8,
      "leafTransparency": 0.4
    },
    "goodHealth": {
      "colorSaturation": 1.2,
      "flowerDensityBoost": 0.3
    }
  },

  "encyclopedia": {
    "description": "Edible leafy vegetable cultivated worldwide.",
    "edibleParts": ["leaf"],
    "harvestTips": "Harvest before flowering for a milder flavor.",
    "companions": ["carrot", "onion"],
    "antagonists": ["strawberry"]
  }
}

```

For detailed field descriptions, see the **Section Summary** in the previous chapter.

---

## Data Flow and Class Architecture

### Conceptual Pipeline

The system separates **genetic data**, **environmental conditions**, and **visual output** to allow flexibility, mutation, and simulation consistency.

```
 ┌───────────────────┐
 │ species.json      │  ← static DNA template
 └────────┬──────────┘
          │
          ▼
 ┌───────────────────┐
 │ Genome            │  ← instance with minor mutations
 └────────┬──────────┘
          │
          ▼
 ┌───────────────────┐
 │ EnvironmentData   │  ← soil, water, pollution, light
 └────────┬──────────┘
          │
          ▼
 ┌───────────────────┐
 │ Phenotype         │  ← expressed traits & health
 └────────┬──────────┘
          │
          ▼
 ┌───────────────────┐
 │ ProceduralModules │  ← mesh/sprite generators
 └────────┬──────────┘
          │
          ▼
 ┌───────────────────┐
 │ Rendered Entity   │  ← visible plant instance
 └───────────────────┘
```

---

### Core Classes

#### `SpeciesDNA`

Represents the static species definition loaded from JSON.

|Property|Type|Description|
|---|---|---|
|`id`|string|Unique identifier|
|`baseData`|object|Raw JSON data|
|`createGenome()`|function|Returns a new `Genome` instance with mutation noise applied|

Example:

```js
const cabbageDNA = loadSpecies("brassica_oleracea.json");
const genome = cabbageDNA.createGenome();
```

---

#### `Genome`

Holds mutable genetic data derived from the species DNA.  
Used for inheritance, hybridization, or procedural variety.

|Field|Description|
|---|---|
|`genes`|Deep copy of shapeDNA, appearance, etc.|
|`mutationRate`|Global factor for random variance|
|`mutate()`|Applies per-gene mutation within allowed ranges|

---

#### `EnvironmentData`

Represents local environmental parameters (soil fertility, water, temperature, pollution, etc.).  
Provided by the simulation layer or tile map.

|Property|Description|
|---|---|
|`fertility`|Current fertility level|
|`water`|Current soil moisture|
|`pollution`|Contaminant level|
|`light`|Light exposure (0–1)|
|`temperature`|Average daily temperature|

---

#### `Phenotype`

Computed from the **Genome + EnvironmentData**.  
Contains all visible attributes for the current growth stage.

|Field|Description|
|---|---|
|`effectiveTraits`|Derived and clamped genetic parameters|
|`stressModifiers`|Modifiers from environment/stress responses|
|`colorProfile`|Final RGB/HSV ranges for rendering|
|`geometryProfile`|Leaf/stem/flower shape parameters|
|`updateFromEnvironment()`|Updates health and visuals dynamically|

---

#### `ProceduralModules`

Each module generates a part of the plant from the Phenotype parameters.  
They can be independently extended or replaced for different plant morphologies.

|Module|Function|
|---|---|
|`trunkGeneration(phenotype)`|Generates trunk geometry (trees, top layer)|
|`stemGeneration(phenotype)`|Generates primary stem and branches|
|`leafGeneration(phenotype)`|Generates foliage arrangement and texture|
|`flowerGeneration(phenotype)`|Generates flower mesh and color distribution|
|`fruitGeneration(phenotype)`|Adds fruits or seeds if active|
|`rootGeneration(phenotype)`|Builds underground structure|
|`witherGeneration(phenotype)`|Applies withered variant textures|

Each function returns a **ProceduralNode**, **MeshData**, or **SpriteLayer**, depending on the rendering system.

---

### Example Workflow

```js
// 1. Load base DNA
const dna = loadSpecies("solanum_lycopersicum.json"); // Tomato

// 2. Instantiate genome with minor variation
const genome = dna.createGenome({ mutationRate: 0.05 });

// 3. Apply environment data
const environment = getEnvironmentAt(tilePosition);
const phenotype = genome.express(environment);

// 4. Generate procedural representation
const sprite = plantFactory.generate(phenotype, stage = "Flowering");

// 5. Render to scene
renderPlant(sprite, tilePosition);
```

---

### Integration in the Engine

- **Data location:** `/Data/Plants/*.json`
    
- **Core system scripts:** `/Scripts/World/PlantSystem/`
    
- **Procedural generators:** `/Scripts/Procedural/Plants/`
    
- **Runtime objects:** `PlantEntity`, `PlantPhenotype`, `PlantGenerator`
    

Each generator module should be fully deterministic for a given seed and environment, ensuring reproducible results across devices or networked simulations.



---

## Future Extensions

- **Hybridization system:** Cross two genomes to create mixed offspring.
    
- **Mutation over time:** Gradual adaptation to environment pressure.
    
- **Procedural damage:** Localized leaf or stem deformation on stress.
    
- **L-system support:** Optional grammar-based procedural branching.
    
