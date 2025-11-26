# 🔧 Correction : Gestion des Valeurs `value` et `label`

## 📋 Problème Identifié

Les matchs upcoming affichaient encore **"La sélection 'Home' n'est plus disponible"** même après les corrections précédentes.

### Cause

Pour les matchs upcoming, l'API Football peut retourner les valeurs des sélections dans **deux champs différents** :

- `v.value` : La valeur de la sélection
- `v.label` : Le label de la sélection

Le code ne vérifiait que `v.value`, donc si l'API utilisait `v.label`, la correspondance échouait.

---

## ✅ Corrections Apportées

### 1️⃣ **Normalisation des Valeurs lors de la Conversion**

Lors de la conversion de `bookmaker.bets` en format `markets`, on normalise maintenant les valeurs :

```javascript
// Avant
markets = processedOdds.bookmaker.bets.map((betMarket) => ({
  id: betMarket.id,
  name: betMarket.name,
  values: betMarket.values || [], // ❌ Utilise directement les values
  suspended: betMarket.suspended || false,
}));

// Après
markets = processedOdds.bookmaker.bets.map((betMarket) => ({
  id: betMarket.id,
  name: betMarket.name,
  // Normaliser les values : utiliser value si disponible, sinon label
  values: (betMarket.values || []).map((v) => ({
    value: v.value || v.label || "", // ✅ Utilise value ou label
    label: v.label || v.value || "", // ✅ Garde aussi le label
    odd: v.odd,
    handicap: v.handicap,
    suspended: v.suspended || false,
  })),
  suspended: betMarket.suspended || false,
}));
```

---

### 2️⃣ **Recherche dans `value` ET `label`**

Lors de la recherche de la sélection, on vérifie maintenant **les deux champs** :

```javascript
// Avant
selectedValue = market.values.find(
  (v) => possibleValues.includes(v.value) && v.suspended === false
);

// Après
selectedValue = market.values.find((v) => {
  // Vérifier à la fois v.value et v.label (l'API peut utiliser l'un ou l'autre)
  const valueMatch =
    possibleValues.includes(v.value) || possibleValues.includes(v.label);
  return valueMatch && v.suspended === false;
});
```

---

## 🎯 Résultat

Maintenant, le système :

1. ✅ **Normalise les valeurs** lors de la conversion des données upcoming
2. ✅ **Vérifie les deux champs** (`value` et `label`) lors de la recherche
3. ✅ **Trouve les sélections** même si l'API utilise `label` au lieu de `value`
4. ✅ **Valide correctement** les paris sur les matchs upcoming

---

## 📝 Exemple

### Scénario

**API retourne** (format upcoming avec `label` au lieu de `value`) :

```json
{
  "bookmaker": {
    "bets": [
      {
        "name": "Match Winner",
        "values": [
          { "label": "Home", "odd": "2.50" }, // ← Utilise "label"
          { "label": "Draw", "odd": "3.20" },
          { "label": "Away", "odd": "2.80" }
        ]
      }
    ]
  }
}
```

**Frontend envoie** :

```javascript
{
  market: "Match Winner",
  selection: "Home",  // ← Standardisé
  odd: 2.50
}
```

### Avant la correction ❌

- Le backend cherche `v.value === "Home"` → **Non trouvé** (l'API a `v.label`)
- Résultat : **"La sélection 'Home' n'est plus disponible"**

### Après la correction ✅

- Le backend normalise : `value: v.value || v.label` → `value: "Home"`
- Le backend cherche dans `v.value` ET `v.label` → **Trouvé** ✅
- Résultat : **Validation réussie** ✅

---

## 🔍 Fichiers Modifiés

- **`bet-backend-v3/src/services/BetSlipService.js`**
  - `validateBet()` : Normalisation des valeurs et recherche dans `value` et `label`

---

## 🧪 Test

Pour tester la correction :

1. Ajouter un pari sur un match **upcoming** (ex: "Al Jandal vs Al Baten")
2. Sélectionner **1x2 - Away** (ou Home)
3. Cliquer sur **"Valider les cotes"**
4. Le système devrait maintenant :
   - ✅ Valider les cotes si elles sont disponibles
   - ✅ Trouver les sélections même si l'API utilise `label` au lieu de `value`
   - ✅ Ne plus afficher "fermé" si les cotes sont disponibles

---

## 📌 Note

Cette correction s'ajoute aux corrections précédentes :

- ✅ Mapping des noms de marchés
- ✅ Mapping des valeurs de sélection
- ✅ Gestion des structures différentes (live vs upcoming)
- ✅ **Normalisation des valeurs `value`/`label`** (nouveau)

Toutes ces corrections ensemble permettent maintenant de gérer correctement tous les formats que l'API Football peut retourner.
