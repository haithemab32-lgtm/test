# Vérification du Statut `suspended` des Cotes

## ✅ Oui, le statut `suspended` est bien pris en compte !

Le backend vérifie le statut `suspended` à **plusieurs niveaux** lors de la validation des paris.

## Niveaux de vérification

### 1. **Vérification du marché (Market)**

**Ligne 789 de `BetSlipService.js` :**

```javascript
// Vérifier si le marché est suspendu
if (market.suspended === true) {
  result.valid = false;
  result.closed = true;
  result.code = VALIDATION_CODES.REJECTED_MARKET_SUSPENDED;
  result.message = `Le marché "${bet.market}" est temporairement suspendu`;
  return result;
}
```

**Résultat :** Si un marché entier est suspendu (ex: "Match Winner"), tous les paris sur ce marché sont rejetés.

### 2. **Filtrage des valeurs suspendues lors de la recherche**

**Lignes 831 et 840 :**

```javascript
// Pour les cotes avec handicap
selectedValue = market.values.find((v) => {
  const valueMatch =
    possibleValues.includes(v.value) || possibleValues.includes(v.label);
  return valueMatch && v.handicap === bet.handicap && v.suspended === false; // ✅ Filtre les suspendues
});

// Pour les cotes sans handicap
selectedValue = market.values.find((v) => {
  const valueMatch =
    possibleValues.includes(v.value) || possibleValues.includes(v.label);
  return valueMatch && v.suspended === false; // ✅ Filtre les suspendues
});
```

**Résultat :** Les valeurs avec `suspended: true` sont automatiquement exclues lors de la recherche de la sélection correspondante.

### 3. **Vérification finale de la sélection trouvée**

**Ligne 853 :**

```javascript
// Vérifier si la sélection est suspendue
if (selectedValue.suspended === true) {
  result.valid = false;
  result.closed = true;
  result.code = VALIDATION_CODES.REJECTED_MARKET_SUSPENDED;
  result.message = `La sélection "${bet.selection}" est temporairement suspendue`;
  return result;
}
```

**Résultat :** Même si une sélection est trouvée, si elle est suspendue, le pari est rejeté.

## Normalisation pour les matchs Live et Upcoming

### Matchs Live

```javascript
// Normalisation pour s'assurer que suspended est toujours présent
markets = (processedOdds.odds || []).map((market) => ({
  ...market,
  suspended: market.suspended || false, // ✅ Par défaut false si absent
  values: (market.values || []).map((v) => ({
    ...v,
    suspended: v.suspended || false, // ✅ Par défaut false si absent
  })),
}));
```

### Matchs Upcoming

```javascript
markets = processedOdds.bookmaker.bets.map((betMarket) => ({
  id: betMarket.id,
  name: betMarket.name,
  values: (betMarket.values || []).map((v) => ({
    value: v.value || v.label || "",
    label: v.label || v.value || "",
    odd: v.odd,
    handicap: v.handicap,
    suspended: v.suspended || false, // ✅ Par défaut false si absent
  })),
  suspended: betMarket.suspended || false, // ✅ Par défaut false si absent
}));
```

## Codes de réponse

Le code `REJECTED_MARKET_SUSPENDED` est défini dans `VALIDATION_CODES` :

```javascript
REJECTED_MARKET_SUSPENDED: "REJECTED_MARKET_SUSPENDED";
```

## Exemples de scénarios

### Scénario 1 : Marché suspendu

```
API retourne : { name: "Match Winner", suspended: true, values: [...] }
→ Pari rejeté avec message : "Le marché 'Match Winner' est temporairement suspendu"
```

### Scénario 2 : Sélection suspendue

```
API retourne : { name: "Match Winner", suspended: false, values: [
  { value: "Home", odd: 2.5, suspended: false },
  { value: "Draw", odd: 3.0, suspended: true },  // ✅ Suspendue
  { value: "Away", odd: 2.8, suspended: false }
]}
→ Pari sur "Draw" rejeté avec message : "La sélection 'Draw' est temporairement suspendue"
```

### Scénario 3 : Sélection non suspendue

```
API retourne : { name: "Match Winner", suspended: false, values: [
  { value: "Home", odd: 2.5, suspended: false },
  { value: "Draw", odd: 3.0, suspended: false },
  { value: "Away", odd: 2.8, suspended: false }
]}
→ Pari accepté si les cotes correspondent
```

## Amélioration récente

Une amélioration a été ajoutée pour **normaliser le champ `suspended`** pour les matchs live, garantissant que :

- Si l'API ne retourne pas `suspended`, il est traité comme `false` par défaut
- Toutes les valeurs sont normalisées pour avoir un champ `suspended` explicite

## Conclusion

✅ **Le statut `suspended` est bien pris en compte** à tous les niveaux :

1. Au niveau du marché
2. Au niveau de la sélection (filtrage et vérification)
3. Pour les matchs live et upcoming

Le système rejette automatiquement les paris sur des marchés ou sélections suspendus, protégeant ainsi l'intégrité du système de paris.
