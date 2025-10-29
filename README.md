# 🌿 Land Shepherd
**Simulation nature pixel art en WebGL**

## 📋 Vue d'ensemble

Land Shepherd est une simulation de nature en pixel art développée avec WebGL pur et JavaScript vanilla. Le projet utilise une architecture modulaire avec des systèmes découplés pour optimiser les performances et faciliter la maintenance.

## 🏗️ Architecture

### Structure des dossiers
```
landSheperd/
├── config.json              # Configuration globale (monde, debug, graphics)
├── index.html               # Point d'entrée HTML
├── css/
│   └── styles.css          # Styles CSS et interface debug
└── js/
    ├── core/               # Systèmes cœur du moteur
    │   ├── main_graphics.js        # Moteur principal GraphicsEngine
    │   ├── debug_manager.js        # Interface debug temps réel
    │   ├── shader_manager.js       # Gestion shaders WebGL
    │   ├── geometry_manager.js     # Cache géométries/buffers
    │   ├── procedural_generator.js # Génération procédurale de cartes
    │   ├── texture_generator.js    # Génération textures de sol
    │   ├── soil_manager.js         # Système de sol complet
    │   └── trees/              # Système d'arbres modulaire
    │       ├── tree_species_config.js    # Configuration des espèces
    │       ├── tree_texture_generator.js # Génération textures arbres
    │       └── tree_manager.js           # Gestion et rendu arbres
    ├── systems/            # Systèmes de jeu
    │   ├── render_system.js    # Système rendu optimisé
    │   ├── camera_manager.js   # Caméra et transformations
    │   └── input_manager.js    # Gestion entrées utilisateur
    └── entities/           # Entités de jeu
        ├── character.js        # Personnage joueur
        ├── soil.js            # Cellule de sol individuelle
        └── tree.js            # Entité arbre individuel
```

### Systèmes principaux

#### 🎮 **GraphicsEngine** (`main_graphics.js`)
- **Rôle** : Orchestrateur principal du moteur de rendu
- **Fonctionnalités** :
  - Initialisation WebGL et coordination des systèmes
  - Boucle de jeu avec deltaTime optimisé
  - Gestion du redimensionnement automatique
  - API unifiée pour le contrôle du jeu

#### 🌍 **SoilManager** (`soil_manager.js`)
- **Rôle** : Gestionnaire centralisé du système de sol
- **Fonctionnalités** :
  - Grille configurable de cellules de sol (50x50 par défaut)
  - Génération procédurale avec zones cohérentes
  - Optimisation par culling (rendu cellules visibles uniquement)
  - Interface pour interaction avec plantes/animaux

#### 🎨 **TextureGenerator** (`texture_generator.js`)
- **Rôle** : Génération procédurale de textures de sol
- **Fonctionnalités** :
  - Textures 20x20 générées dynamiquement
  - Cache intelligent (~72 textures pré-générées)
  - Système de calques toggleables (eau/pollution)
  - Niveaux d'intensité graduels configurables

#### 🗺️ **ProceduralGenerator** (`procedural_generator.js`)
- **Rôle** : Générateur de cartes avec cohérence spatiale
- **Fonctionnalités** :
  - Système de hotspots avec influence radiale
  - Dégradés exponentiels et lissage spatial
  - Configuration flexible par propriété
  - Algorithmes de bruit et variation locale

#### 🐛 **DebugManager** (`debug_manager.js`)
- **Rôle** : Interface de debug temps réel
- **Fonctionnalités** :
  - Affichage FPS avec colorisation selon performance
  - Métriques de rendu et sol en temps réel
  - Toggles interactifs pour calques visuels
  - Panel collapsible avec configuration JSON

#### 🎨 **RenderSystem** (`render_system.js`)
- **Rôle** : Rendu optimisé des entités
- **Fonctionnalités** :
  - Rendu par batch pour optimiser les performances
  - Support textures et couleurs unies
  - Système d'uniformes automatisé
  - Comptage des appels de rendu

#### 📷 **CameraManager** (`camera_manager.js`)
- **Rôle** : Gestion caméra virtuelle et transformations
- **Fonctionnalités** :
  - Zoom centré avec contraintes configurables
  - Conversion coordonnées monde ↔ écran
  - Suivi fluide d'entités avec interpolation
  - Calcul des bounds visibles

#### ⌨️ **InputManager** (`input_manager.js`)
- **Rôle** : Capture centralisée des entrées
- **Fonctionnalités** :
  - Système d'événements découplé
  - Support souris (clic, déplacement, molette)
  - Gestion clavier avec état des touches
  - Conversion automatique des coordonnées

#### 🔺 **GeometryManager** (`geometry_manager.js`)
- **Rôle** : Cache intelligent des géométries
- **Fonctionnalités** :
  - Cache par clé unique (évite les doublons)
  - Primitives avec et sans coordonnées de texture
  - Gestion automatique des buffers WebGL
  - Binding optimisé des attributs

#### 🎯 **ShaderManager** (`shader_manager.js`)
- **Rôle** : Gestion centralisée des shaders
- **Fonctionnalités** :
  - Cache par hash du code source
  - Shaders couleur et texture
  - Auto-détection attributs/uniformes
  - Compilation et liaison automatisées

## 🚀 État actuel du développement

### ✅ Fonctionnalités implémentées

- **Moteur WebGL complet** avec architecture modulaire
- **Système de sol avancé** avec propriétés chimiques et physiques
  - Grille configurable (50x50 cellules de 20x20 pixels par défaut)
  - Propriétés N, P, K, matière organique (fertilité calculée automatiquement)
  - Rétention d'eau et pollution avec niveaux d'intensité graduels
  - Génération procédurale avec zones cohérentes et dégradés naturels
  - Optimisation par culling et textures procédurales (1 appel/cellule)
- **Textures procédurales ultra-optimisées**
  - 72 textures pré-générées avec variations
  - Calques toggleables eau/pollution en temps réel
  - Niveaux d'intensité configurables (3 seuils par défaut)
  - Régénération dynamique instantanée
- **Personnage joueur** déplaçable au clic avec animation
- **Système de caméra** avec zoom molette et suivi
- **Interface debug interactive** temps réel
  - Métriques performance et sol
  - Toggles visuels pour calques
  - Niveaux d'intensité en temps réel
- **Configuration centralisée** JSON pour tous les paramètres
- **Performance optimisée** : 60+ FPS avec 2500 cellules

### 🎛️ Contrôles interactifs

#### Jeu
- **Clic gauche** : Déplacer le personnage
- **Molette souris** : Zoom/dézoom centré
- **Redimensionnement** : Adaptation automatique

#### Interface debug
- **💧 Bouton Eau** : Active/désactive l'affichage des pixels d'eau
- **☢️ Bouton Pollution** : Active/désactive l'affichage de la pollution
- **× Collapse** : Réduire/étendre le panneau debug

### 📊 Métriques debug en temps réel

- **Performance** : FPS avec colorisation selon performance
- **Rendu** : Géométries en cache et appels de rendu par frame
- **Position** : Coordonnées joueur et niveau de zoom
- **Sol** : Cellules visibles/totales avec optimisation
- **Propriétés locales** : Fertilité, pollution sous le joueur
- **Niveaux d'intensité** : Eau (Niv.1-3/Sec) et pollution (Niv.1-3/Propre)

## 🛠️ Technologies utilisées

- **WebGL** : Rendu hardware-accelerated avec textures
- **JavaScript ES6+** : Architecture moderne modulaire
- **HTML5 Canvas** : Génération procédurale de textures
- **CSS3** : Interface utilisateur et debug

## 📦 Installation et lancement

1. **Cloner le projet** :
   ```bash
   git clone [url-du-repo]
   cd landSheperd
   ```

2. **Serveur local** (requis pour WebGL) :
   ```bash
   # Option 1: Python
   python -m http.server 8080
   
   # Option 2: Node.js
   npx http-server -p 8080
   
   # Option 3: Live Server (VS Code)
   # Utiliser l'extension Live Server
   ```

3. **Ouvrir dans le navigateur** :
   ```
   http://localhost:8080
   ```

## ⚙️ Configuration

### `config.json` - Configuration complète
```json
{
    "debug": {
        "enabled": true,          // Activer/désactiver le debug
        "showFPS": true,          // Afficher les FPS
        "showGeometryCount": true, // Compter les géométries
        "showPlayerPosition": true, // Position du joueur
        "refreshRate": 144        // Fréquence d'affichage cible
    },
    "graphics": {
        "vsync": true,            // Synchronisation verticale
        "backgroundColor": [0.5, 0.5, 0.5, 1.0] // Couleur de fond RGBA
    },
    "world": {
        "map": {
            "gridWidth": 50,      // Largeur de la grille (cellules)
            "gridHeight": 50,     // Hauteur de la grille (cellules)
            "cellSize": 20        // Taille d'une cellule (pixels)
        },
        "soil": {
            "fertility": {
                "hotspots": 8,        // Nombre de zones fertiles
                "baseValue": 30,      // Fertilité de base
                "maxIntensity": 85,   // Fertilité maximale des hotspots
                "falloffRate": 0.15,  // Vitesse de dégradé
                "noiseIntensity": 10, // Intensité du bruit local
                "radiusMin": 8,       // Rayon minimum des hotspots
                "radiusMax": 20,      // Rayon maximum des hotspots
                "nutrientVariation": {
                    "nitrogen": 10,     // Variation N autour de la fertilité
                    "phosphorus": 15,   // Variation P autour de la fertilité
                    "potassium": 12,    // Variation K autour de la fertilité
                    "organicMatter": 8  // Variation C autour de la fertilité
                }
            },
            "water": {
                "hotspots": 5,        // Zones humides (rivières, marécages)
                "baseValue": 20,      // Rétention d'eau de base
                "maxIntensity": 90,   // Rétention maximale
                "falloffRate": 0.12,  // Dégradé plus doux que fertilité
                "noiseIntensity": 8,
                "radiusMin": 6,
                "radiusMax": 18
            },
            "pollution": {
                "hotspots": 3,        // Quelques zones polluées
                "baseValue": 5,       // Pollution de base (faible)
                "maxIntensity": 80,   // Pollution maximale
                "falloffRate": 0.08,  // Propagation lente
                "noiseIntensity": 5,
                "radiusMin": 10,
                "radiusMax": 25
            }
        },
        "textures": {
            "soilTextureSize": 20,    // Taille des textures de sol
            "generateVariations": 2,  // Variations par combinaison
            "waterIntensityLevels": [
                { "threshold": 20, "coverage": 0.05, "color": [50, 120, 255] },  // Niveau 1
                { "threshold": 40, "coverage": 0.15, "color": [30, 100, 255] },  // Niveau 2
                { "threshold": 70, "coverage": 0.25, "color": [10, 80, 255] }    // Niveau 3
            ],
            "pollutionIntensityLevels": [
                { "threshold": 15, "coverage": 0.03, "color": [100, 255, 120] }, // Niveau 1
                { "threshold": 35, "coverage": 0.08, "color": [50, 255, 80] },   // Niveau 2
                { "threshold": 60, "coverage": 0.15, "color": [20, 255, 60] }    // Niveau 3
            ]
        },
        "trees": {
          "chene": {
            "requirements": {
              "nitrogen": { "min": 40, "optimal": 60 },
              "phosphorus": { "min": 30, "optimal": 50 },
              "potassium": { "min": 45, "optimal": 70 },
              "organicMatter": { "min": 50, "optimal": 75 },
              "pollutionTolerance": 25
            },
            "probability": 0.05
          },
          "pin": {
            "requirements": {
              "nitrogen": { "min": 25, "optimal": 40 },
              "phosphorus": { "min": 20, "optimal": 35 },
              "potassium": { "min": 30, "optimal": 45 },
              "organicMatter": { "min": 20, "optimal": 40 },
              "pollutionTolerance": 40
            },
            "probability": 0.05
          },
          "chataignier": {
            "requirements": {
              "nitrogen": { "min": 50, "optimal": 75 },
              "phosphorus": { "min": 40, "optimal": 60 },
              "potassium": { "min": 55, "optimal": 80 },
              "organicMatter": { "min": 60, "optimal": 85 },
              "pollutionTolerance": 15
            },
            "probability": 0.05
          }
        }
    }
}
```

### Paramètres facilement ajustables

#### Taille du monde
- **Carte plus grande** : `"gridWidth": 100, "gridHeight": 100` (10 000 cellules)
- **Cellules plus grandes** : `"cellSize": 40` (textures 40x40)

#### Génération procédurale
- **Plus de zones fertiles** : `"hotspots": 12`
- **Dégradés plus doux** : `"falloffRate": 0.08`
- **Plus de variation** : `"noiseIntensity": 20`

#### Niveaux visuels
- **Ajouter un 4ème niveau d'eau** :
  ```json
  { "threshold": 85, "coverage": 0.35, "color": [5, 60, 255] }
  ```
- **Modifier les seuils** : Ajuster les valeurs `threshold`
- **Changer les couleurs** : Modifier les valeurs RGB `color`

## 🔧 Développement

### Architecture modulaire
Chaque système est indépendant et communique via des interfaces claires. Cela permet :
- **Facilité de maintenance** et debug
- **Réutilisabilité** des composants
- **Performance optimisée** par spécialisation
- **Extension facile** pour nouvelles fonctionnalités

### Guide d'extension

#### Ajout d'une nouvelle entité
1. Créer la classe dans `js/entities/`
2. Implémenter `getRenderData()` et `update(deltaTime)`
3. Ajouter le support dans `RenderSystem.renderEntityBatch()`

#### Ajout d'un nouveau système
1. Créer le module dans `js/systems/` ou `js/core/`
2. L'intégrer dans `GraphicsEngine.initManagers()`
3. Configurer les interactions avec les autres systèmes

#### Modification du système de sol
1. **Nouvelles propriétés** : Étendre la classe `Soil` et le `ProceduralGenerator`
2. **Nouveaux calques visuels** : Ajouter dans `TextureGenerator` et `DebugManager`
3. **Algorithmes de génération** : Modifier le `ProceduralGenerator`

### Prochaines étapes suggérées
- 🌱 **Système de végétation** avec interaction sol/plantes
- 🐾 **Animaux** avec préférences de terrain
- 🌤️ **Système météo** et cycles jour/nuit
- 🔄 **Évolution du sol** dans le temps
- 💾 **Sauvegarde/chargement** des simulations
- 🎵 **Audio spatializé** et ambiances

## 🌳 Système d'arbres

### ✅ Fonctionnalités implémentées

- **3 espèces d'arbres distinctes** avec exigences de sol réalistes :
  - **🌳 Chêne** : Exigeant en matière organique et potassium, faible tolérance pollution
  - **🌲 Pin** : Peu exigeant en nutriments, tolérance moyenne à la pollution  
  - **🌰 Châtaignier** : Très exigeant en tous nutriments, très sensible à la pollution

- **Système de compatibilité sol/espèces** :
  - Vérification automatique des seuils N, P, K, matière organique
  - Tolérance variable à la pollution selon l'espèce
  - Génération conditionnelle basée sur l'optimalité du sol

- **Génération procédurale intelligente** :
  - Placement automatique selon les conditions de sol
  - Probabilité de 1/20 par cellule compatible (configurable)
  - Sélection pondérée si plusieurs espèces viables

- **Textures procédurales par espèce** :
  - **Chêne** : Forme arrondie, feuillage dense vert foncé
  - **Pin** : Forme conique, texture d'aiguilles vert sombre
  - **Châtaignier** : Forme ovale, feuillage moyennement dense vert clair
  - Variations de bruit pour le réalisme

- **Optimisation de rendu** :
  - Culling intelligent (arbres visibles uniquement)
  - Cache de textures WebGL par arbre
  - Rendu par batch optimisé

### 📊 Métriques debug en temps réel

- **Arbres** : Nombre visible/total avec colorisation charge
- **Espèces** : Répartition par type avec indicateur de diversité
- **Arbre sous joueur** : Espèce, maturité et santé
- **Performance** : Rendu optimisé avec 1 appel par arbre visible

### ⚙️ Configuration des espèces

```json
"trees": {
  "chene": {
    "requirements": {
      "nitrogen": { "min": 40, "optimal": 60 },
      "phosphorus": { "min": 30, "optimal": 50 },
      "potassium": { "min": 45, "optimal": 70 },
      "organicMatter": { "min": 50, "optimal": 75 },
      "pollutionTolerance": 25
    },
    "probability": 0.05
  },
  "pin": {
    "requirements": {
      "nitrogen": { "min": 25, "optimal": 40 },
      "phosphorus": { "min": 20, "optimal": 35 },
      "potassium": { "min": 30, "optimal": 45 },
      "organicMatter": { "min": 20, "optimal": 40 },
      "pollutionTolerance": 40
    },
    "probability": 0.05
  },
  "chataignier": {
    "requirements": {
      "nitrogen": { "min": 50, "optimal": 75 },
      "phosphorus": { "min": 40, "optimal": 60 },
      "potassium": { "min": 55, "optimal": 80 },
      "organicMatter": { "min": 60, "optimal": 85 },
      "pollutionTolerance": 15
    },
    "probability": 0.05
  }
}
```

### 🎯 Logique de placement

1. **Vérification des seuils minimums** : Chaque nutriment doit atteindre le minimum requis
2. **Test de tolérance pollution** : La pollution ne doit pas dépasser le seuil de tolérance
3. **Calcul d'optimalité** : Score 0-1 basé sur la proximité aux valeurs optimales
4. **Probabilité pondérée** : `probabilité_base × score_optimalité`
5. **Sélection competitive** : Si plusieurs espèces viables, choix selon probabilités

### 🔧 Extension du système d'arbres

#### Ajouter une nouvelle espèce
1. Étendre la configuration dans `TreeSpeciesConfig.getSpeciesConfig()` avec :
   - Exigences de sol (nitrogen, phosphorus, potassium, organicMatter, pollutionTolerance)
   - Propriétés visuelles (trunkColor, foliageColor, shape, density, size, etc.)
   - Probabilité de spawn
2. Ajouter une méthode `generate[Espèce]TreePixel()` dans `TreeTextureGenerator`
3. La détection automatique des espèces fonctionne via `TreeSpeciesConfig.getAllSpeciesNames()`

#### Modifier les exigences
- Ajuster les seuils `min`/`optimal` dans `TreeSpeciesConfig`
- Modifier `pollutionTolerance` selon l'espèce
- Changer `probability` pour rareté relative
- Personnaliser les propriétés visuelles pour chaque espèce

#### Fonctionnalités avancées disponibles
- **Positionnement flexible** : Arbres avec offset aléatoire dans les cellules pour réalisme
- **Textures 32x32** : Débordement sur cellules adjacentes pour effet naturel
- **Variations par espèce** : 3 variations par espèce pour diversité visuelle
- **Cache de textures** : Optimisation mémoire avec cache WebGL intelligent
- **Méthodes utilitaires** : 
  - `getTreesInRadius()` : Recherche d'arbres dans un rayon
  - `addTreeManually()` : Ajout manuel pour tests
  - `regenerateTreeAt()` : Régénération d'arbre spécifique
  - `clearAllTrees()` / `regenerateAllTrees()` : Gestion globale
- **Système de probabilité pondérée** : Sélection d'espèce basée sur l'optimalité du sol
- **Croissance dynamique** : Propriétés `age`, `maturity`, `health` évolutives
- **Interface debug étendue** : Informations détaillées sur chaque arbre via `getInfo()`

#### Architecture modulaire du système d'arbres
- **`TreeSpeciesConfig`** : Configuration centralisée des espèces
- **`TreeTextureGenerator`** : Génération procédurale avancée de textures
- **`TreeManager`** : Gestion placement, rendu et interactions
- **`Tree`** : Entité arbre avec logique métier

### Prochaines étapes suggérées
- 🌱 **Système de croissance** : Évolution visuelle selon l'âge et la santé
- 🍂 **Cycles saisonniers** : Changement de couleurs selon la saison
- 🌿 **Interaction avec faune** : Arbres comme habitat pour animaux
- ⚡ **Événements naturels** : Maladies, parasites, sécheresse
- 🔄 **Reproduction naturelle** : Dissémination de graines selon le vent
- 💡 **Éclairage dynamique** : Ombres portées et éclairage selon l'heure