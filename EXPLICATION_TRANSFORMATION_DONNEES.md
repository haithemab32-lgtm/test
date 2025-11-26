# 🔄 Explication : Transformation des Données de Cotes

## 📋 Flux de Données Complet

### 1️⃣ **Backend → Frontend (Premier Appel API)**

Le backend récupère les données brutes de l'API Football et les envoie au frontend :

```javascript
// Backend récupère depuis API Football
{
  odds: [
    {
      id: 1,
      name: "Fulltime Result", // ← Peut être "Match Winner", "Fulltime Result", "1x2"
      values: [
        { value: "1", odd: "2.50", suspended: false }, // ← Peut être "1" ou "Home"
        { value: "X", odd: "3.20", suspended: false }, // ← Peut être "X" ou "Draw"
        { value: "2", odd: "2.80", suspended: false }, // ← Peut être "2" ou "Away"
      ],
    },
  ];
}
```

---

### 2️⃣ **Frontend : Transformation pour l'Affichage**

Le frontend transforme ces données dans `matchTransformers.ts` pour un affichage uniforme :

```typescript
// extractOddsFromSimpleFormat() transforme :
{
  name: "Fulltime Result",  // ← Nom original de l'API
  values: [
    { value: "1", odd: "2.50" },  // ← Valeur originale
    { value: "X", odd: "3.20" },
    { value: "2", odd: "2.80" }
  ]
}

// En format interne pour l'affichage :
{
  _1x2: {
    _1: 2.50,  // ← Transformé depuis "1" ou "Home"
    X: 3.20,   // ← Transformé depuis "X" ou "Draw"
    _2: 2.80   // ← Transformé depuis "2" ou "Away"
  }
}
```

**Code de transformation** (`matchTransformers.ts:604-621`) :

```typescript
const _1Value = fulltimeResultMarket.values.find(
  (v) => v.value === "Home" || v.value === "1" // ← Accepte les deux formats
);
const _1 = _1Value?.suspended === true ? "locked" : validateOdd(_1Value?.odd);
```

---

### 3️⃣ **Frontend : Stockage des Données Brutes**

Les données brutes sont stockées dans `rawMarkets` pour référence :

```typescript
// Dans transformApiDataToMatch()
const rawMarketsForDisplay = marketsArray.map((market) => ({
  market: market.name || market.market || "", // ← Nom original
  values: (market.values || []).map((v) => ({
    label: v.label || v.value || "", // ← Label original
    value: v.value || v.label || "", // ← Valeur originale
    odd: validateOdd(v.odd),
    handicap: v.handicap,
    suspended: v.suspended,
  })),
}));
match.rawMarkets = rawMarketsForDisplay; // ← Stocké pour référence
```

---

### 4️⃣ **Frontend : Création d'un Bet**

Quand l'utilisateur clique sur une cote, le frontend crée un bet avec des valeurs **standardisées** :

```typescript
// Dans OddsMarket.tsx:createBet() ou MatchCard.tsx:createBetFromMarket()
const marketNameMapping: Record<string, string> = {
  _1x2: "Match Winner",  // ← Toujours "Match Winner" (standardisé)
  doubleChance: "Double Chance",
  // ...
};

const selectionMapping: Record<string, string> = {
  _1: "Home",   // ← Toujours "Home" (standardisé)
  X: "Draw",    // ← Toujours "Draw" (standardisé)
  _2: "Away",   // ← Toujours "Away" (standardisé)
  // ...
};

// Bet créé :
{
  fixtureId: 123456,
  market: "Match Winner",  // ← Standardisé
  selection: "Home",        // ← Standardisé
  odd: 2.50
}
```

---

### 5️⃣ **Backend : Validation du Bet**

Le backend reçoit le bet avec des valeurs standardisées et doit les comparer avec les données brutes de l'API :

```javascript
// Backend reçoit :
{
  market: "Match Winner",  // ← Standardisé par le frontend
  selection: "Home",       // ← Standardisé par le frontend
  odd: 2.50
}

// Backend récupère depuis API (données brutes) :
{
  name: "Fulltime Result",  // ← Peut être différent !
  values: [
    { value: "1", odd: "2.50" }  // ← Peut être "1" au lieu de "Home" !
  ]
}
```

**Problème** : Le backend cherche `name === "Match Winner"` et `value === "Home"`, mais l'API peut retourner `name === "Fulltime Result"` et `value === "1"`.

---

## ✅ Solution : Mapping dans le Backend

J'ai ajouté des mappings dans `BetSlipService.js` pour gérer ces différences :

### Mapping des Noms de Marchés

```javascript
const marketNameMapping = {
  "Match Winner": ["Match Winner", "Fulltime Result", "1x2", "1X2"],
  "Double Chance": ["Double Chance", "Double Chance Result"],
  "Both Teams Score": ["Both Teams Score", "Both Teams To Score", "GG/NG"],
  "Odd/Even": ["Odd/Even", "Pair/Impaire"],
  "Goals Over/Under": ["Goals Over/Under", "Total Goals", "Over/Under Line"],
};

// Le backend accepte maintenant tous ces noms
const possibleMarketNames = marketNameMapping[bet.market] || [bet.market];
const market = markets.find(
  (m) => possibleMarketNames.includes(m.name) || ...
);
```

### Mapping des Valeurs de Sélection

```javascript
const selectionMapping = {
  Home: ["Home", "1"],           // ← Accepte "Home" ou "1"
  Draw: ["Draw", "X"],            // ← Accepte "Draw" ou "X"
  Away: ["Away", "2"],            // ← Accepte "Away" ou "2"
  "Home or Draw": ["Home or Draw", "1X", "Home/Draw", "Home Draw"],
  // ...
};

// Le backend accepte maintenant tous ces formats
const possibleValues = selectionMapping[bet.selection] || [bet.selection];
selectedValue = market.values.find(
  (v) => possibleValues.includes(v.value) && ...
);
```

---

## 🔍 Pourquoi cette Transformation ?

### Raisons

1. **Uniformité d'affichage** : Le frontend veut afficher toujours les mêmes labels (`1`, `X`, `2`) même si l'API retourne des formats différents.

2. **Simplicité** : Le frontend standardise les valeurs pour simplifier l'affichage et la logique.

3. **Compatibilité** : L'API Football peut retourner des formats différents selon le bookmaker ou le type de match.

### Conséquence

Le backend doit gérer cette différence entre :

- **Valeurs standardisées** envoyées par le frontend (`"Match Winner"`, `"Home"`)
- **Valeurs brutes** retournées par l'API (`"Fulltime Result"`, `"1"`)

---

## 📊 Exemple Complet

### Scénario

1. **API retourne** :

   ```json
   {
     "name": "Fulltime Result",
     "values": [
       { "value": "1", "odd": "2.50" },
       { "value": "X", "odd": "3.20" },
       { "value": "2", "odd": "2.80" }
     ]
   }
   ```

2. **Frontend transforme pour affichage** :

   ```typescript
   {
     _1x2: {
       _1: 2.50,  // ← Affiché comme "1"
       X: 3.20,   // ← Affiché comme "X"
       _2: 2.80   // ← Affiché comme "2"
     }
   }
   ```

3. **Utilisateur clique sur "1"** → Frontend crée :

   ```javascript
   {
     market: "Match Winner",  // ← Standardisé
     selection: "Home",       // ← Standardisé (mappé depuis "_1")
     odd: 2.50
   }
   ```

4. **Backend reçoit le bet** et doit le comparer avec les données brutes :

   ```javascript
   // Backend cherche :
   market.name === "Match Winner"; // ❌ L'API a "Fulltime Result"
   value ===
     "Home"[ // ❌ L'API a "1"
       // Avec les mappings :
       ("Match Winner", "Fulltime Result", "1x2")
     ]
       .includes("Fulltime Result") // ✅
       [("Home", "1")].includes("1"); // ✅
   ```

---

## 🎯 Résultat

Maintenant, le système :

1. ✅ **Accepte les formats variés** de l'API
2. ✅ **Standardise les valeurs** côté frontend pour l'affichage
3. ✅ **Compare correctement** les bets avec les données brutes via les mappings
4. ✅ **Valide les paris** même si les formats diffèrent

---

## 📝 Fichiers Concernés

- **Frontend** :

  - `bet7-frontend-v2/src/utils/matchTransformers.ts` : Transformation des données
  - `bet7-frontend-v2/src/components/matchCard/OddsMarket.tsx` : Création des bets
  - `bet7-frontend-v2/src/components/matchCard/MatchCard.tsx` : Création des bets

- **Backend** :
  - `bet-backend-v3/src/services/BetSlipService.js` : Validation avec mappings

---

## 🔧 Correction Appliquée

Les mappings dans le backend permettent maintenant de :

- ✅ Trouver le marché même si l'API utilise un nom différent
- ✅ Trouver la sélection même si l'API utilise un format différent
- ✅ Valider correctement les paris sur tous les types de matchs (live et upcoming)
