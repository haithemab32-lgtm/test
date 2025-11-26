# 🔧 Correction : Mapping des Valeurs et Noms de Marchés

## 📋 Problème Identifié

Les matchs upcoming affichaient **"La sélection 'Home' n'est plus disponible"** même quand les cotes étaient disponibles dans l'API.

### Cause

L'API Football peut retourner des **formats différents** pour les mêmes valeurs selon le bookmaker :

- **Sélections** : `"Home"` ou `"1"`, `"Draw"` ou `"X"`, `"Away"` ou `"2"`
- **Noms de marchés** : `"Match Winner"` ou `"Fulltime Result"` ou `"1x2"`

Le frontend envoie toujours le format standardisé (`"Home"`, `"Match Winner"`), mais le backend cherchait une correspondance **exacte**, ce qui échouait si l'API retournait un format différent.

---

## ✅ Corrections Apportées

### 1️⃣ **Mapping des Noms de Marchés**

Le backend accepte maintenant plusieurs noms pour le même marché :

```javascript
const marketNameMapping = {
  "Match Winner": ["Match Winner", "Fulltime Result", "1x2", "1X2"],
  "Double Chance": ["Double Chance", "Double Chance Result"],
  "Both Teams Score": ["Both Teams Score", "Both Teams To Score", "GG/NG"],
  "Odd/Even": ["Odd/Even", "Pair/Impaire"],
  "Goals Over/Under": ["Goals Over/Under", "Total Goals", "Over/Under Line"],
};
```

**Avant :**

```javascript
const market = markets.find(
  (m) => m.name === bet.market || m.id === parseInt(bet.market, 10)
);
```

**Après :**

```javascript
const possibleMarketNames = marketNameMapping[bet.market] || [bet.market];
const market = markets.find(
  (m) =>
    possibleMarketNames.includes(m.name) || m.id === parseInt(bet.market, 10)
);
```

---

### 2️⃣ **Mapping des Valeurs de Sélection**

Le backend accepte maintenant plusieurs formats pour les mêmes sélections :

```javascript
const selectionMapping = {
  // Match Winner (1x2)
  Home: ["Home", "1"],
  Draw: ["Draw", "X"],
  Away: ["Away", "2"],
  // Double Chance
  "Home or Draw": ["Home or Draw", "1X", "Home/Draw", "Home Draw"],
  "Home or Away": ["Home or Away", "12", "Home/Away", "Home Away"],
  "Draw or Away": ["Draw or Away", "X2", "Draw/Away", "Draw Away"],
  // Both Teams Score
  Yes: ["Yes", "GG"],
  No: ["No", "NG"],
  // Odd/Even
  Even: ["Even", "Pair"],
  Odd: ["Odd", "Impaire"],
  // Over/Under
  Over: ["Over"],
  Under: ["Under"],
};
```

**Avant :**

```javascript
selectedValue = market.values.find(
  (v) => v.value === bet.selection && v.suspended === false
);
```

**Après :**

```javascript
const possibleValues = selectionMapping[bet.selection] || [bet.selection];
selectedValue = market.values.find(
  (v) => possibleValues.includes(v.value) && v.suspended === false
);
```

---

## 🎯 Résultat

Maintenant, le système :

1. ✅ **Trouve le marché** même si l'API utilise un nom différent (`"Fulltime Result"` au lieu de `"Match Winner"`)
2. ✅ **Trouve la sélection** même si l'API utilise un format différent (`"1"` au lieu de `"Home"`)
3. ✅ **Valide correctement** les paris sur les matchs upcoming
4. ✅ **Affiche les marchés fermés** uniquement s'ils le sont vraiment

---

## 📝 Exemple

### Scénario

- **Frontend envoie** : `{ market: "Match Winner", selection: "Home" }`
- **API retourne** : `{ name: "Fulltime Result", values: [{ value: "1", odd: "2.50" }] }`

### Avant la correction ❌

- Le backend cherche `name === "Match Winner"` → **Non trouvé**
- Même si trouvé, cherche `value === "Home"` → **Non trouvé** (l'API a `"1"`)
- Résultat : **"Marché fermé"**

### Après la correction ✅

- Le backend cherche dans `["Match Winner", "Fulltime Result", "1x2"]` → **Trouvé** (`"Fulltime Result"`)
- Cherche dans `["Home", "1"]` → **Trouvé** (`"1"`)
- Résultat : **Validation réussie** ✅

---

## 🔍 Fichiers Modifiés

- **`bet-backend-v3/src/services/BetSlipService.js`**
  - `validateBet()` : Ajout des mappings pour les noms de marchés et les valeurs de sélection

---

## 🧪 Test

Pour tester la correction :

1. Ajouter un pari sur un match **upcoming** (ex: "Al Anwar vs Al Taee")
2. Sélectionner **1x2 - 1** (Home)
3. Cliquer sur **"Valider les cotes"**
4. Le système devrait maintenant :
   - ✅ Valider les cotes si elles sont disponibles
   - ✅ Détecter les changements de cotes
   - ✅ Ne plus afficher "fermé" si les cotes sont disponibles

---

## 📌 Note

Si vous voyez encore "marché fermé" pour certains matchs, cela peut signifier que :

1. **L'API ne retourne vraiment pas de cotes** pour ce match
2. **Aucun bookmaker prioritaire** (Bet365/1xBet) n'est disponible
3. **Le match n'a pas encore de cotes** disponibles (trop tôt)

Dans ce cas, c'est normal et le message est correct.
