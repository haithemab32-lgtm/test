# 🔍 D'où vient l'information "Marchés Fermés" ?

## 📊 Flux de Données

L'information que les marchés sont fermés vient **directement de l'API Football** via plusieurs vérifications dans le code.

---

## 🔄 Processus de Validation

### 1️⃣ **Récupération des Cotes depuis l'API Football**

Quand vous validez un betslip, le backend :

```javascript
// Dans BetSlipService.getOddsWithCache()
const oddsResponse = await apiFootballService.getOddsByFixture(
  fixtureId,
  isLive,
  false
);
```

**Endpoint utilisé :**

- **Matchs Live** : `/odds/live?fixture={fixtureId}`
- **Matchs Upcoming** : `/odds?fixture={fixtureId}`

---

### 2️⃣ **Structure des Données Retournées par l'API**

L'API Football retourne une structure comme ceci :

```json
{
  "response": [
    {
      "fixture": { "id": 123456 },
      "odds": [
        {
          "id": 1,
          "name": "Match Winner",
          "suspended": false, // ← Flag du marché
          "values": [
            {
              "value": "Home",
              "odd": "1.85",
              "suspended": false // ← Flag de la sélection
            },
            {
              "value": "Draw",
              "odd": "3.50",
              "suspended": true // ← Cette sélection est suspendue
            },
            {
              "value": "Away",
              "odd": "2.10",
              "suspended": false
            }
          ]
        }
      ]
    }
  ]
}
```

---

### 3️⃣ **Vérifications dans `validateBet()`**

Le code vérifie **4 conditions** pour déterminer si un marché est fermé :

#### ✅ **Vérification 1 : Le marché existe-t-il ?**

```javascript
// Ligne 710-719 dans BetSlipService.js
const market = processedOdds.odds.find(
  (m) => m.name === bet.market || m.id === parseInt(bet.market, 10)
);

if (!market || !market.values || market.values.length === 0) {
  result.closed = true;
  result.code = VALIDATION_CODES.REJECTED_MARKET_CLOSED;
  result.message = `Le marché "${bet.market}" n'est plus disponible`;
  return result;
}
```

**Si le marché n'existe pas dans la réponse de l'API → FERMÉ**

---

#### ✅ **Vérification 2 : Le marché est-il suspendu ?**

```javascript
// Ligne 722-729 dans BetSlipService.js
if (market.suspended === true) {
  result.closed = true;
  result.code = VALIDATION_CODES.REJECTED_MARKET_SUSPENDED;
  result.message = `Le marché "${bet.market}" est temporairement suspendu`;
  return result;
}
```

**Si `market.suspended === true` → FERMÉ**

---

#### ✅ **Vérification 3 : La sélection existe-t-elle ?**

```javascript
// Ligne 731-755 dans BetSlipService.js
let selectedValue = null;

if (bet.handicap) {
  selectedValue = market.values.find(
    (v) =>
      v.value === bet.selection &&
      v.handicap === bet.handicap &&
      v.suspended === false
  );
} else {
  selectedValue = market.values.find(
    (v) => v.value === bet.selection && v.suspended === false
  );
}

if (!selectedValue) {
  result.closed = true;
  result.code = VALIDATION_CODES.REJECTED_MARKET_CLOSED;
  result.message = `La sélection "${bet.selection}" n'est plus disponible`;
  return result;
}
```

**Si la sélection n'existe pas dans le marché → FERMÉ**

---

#### ✅ **Vérification 4 : La sélection est-elle suspendue ?**

```javascript
// Ligne 757-764 dans BetSlipService.js
if (selectedValue.suspended === true) {
  result.closed = true;
  result.code = VALIDATION_CODES.REJECTED_MARKET_SUSPENDED;
  result.message = `La sélection "${bet.selection}" est temporairement suspendue`;
  return result;
}
```

**Si `selectedValue.suspended === true` → FERMÉ**

---

## 🎯 Résumé

| Condition                          | Source                                      | Code                        |
| ---------------------------------- | ------------------------------------------- | --------------------------- |
| Marché n'existe pas                | API Football ne retourne pas le marché      | `REJECTED_MARKET_CLOSED`    |
| `market.suspended === true`        | Flag dans la réponse API                    | `REJECTED_MARKET_SUSPENDED` |
| Sélection n'existe pas             | La sélection n'est pas dans `market.values` | `REJECTED_MARKET_CLOSED`    |
| `selectedValue.suspended === true` | Flag dans la réponse API                    | `REJECTED_MARKET_SUSPENDED` |

---

## 📡 Source Réelle des Données

**L'information vient de l'API Football** (`api-football.com`) :

1. Le backend appelle l'endpoint `/odds/live` ou `/odds`
2. L'API retourne les cotes **actuelles** avec les flags `suspended`
3. Le backend compare ces données avec les paris du betslip
4. Si un marché ou une sélection a `suspended: true` ou n'existe plus → **FERMÉ**

---

## 🔍 Pourquoi un Marché Peut Être Fermé ?

L'API Football marque un marché comme fermé (`suspended: true`) quand :

- ⚽ **Événement critique** : But, penalty, carton rouge
- ⏸️ **Suspension temporaire** : Le bookmaker suspend les paris
- 🏁 **Match terminé** : Le match est fini
- ❌ **Marché fermé** : Le bookmaker a fermé ce marché spécifique
- 🔄 **Mise à jour en cours** : Les cotes sont en cours de mise à jour

---

## 💡 Cache et Actualisation

Le backend met en cache les cotes pour éviter trop d'appels API :

- **Matchs Live** : Cache de **10 secondes**
- **Matchs Upcoming** : Cache de **60 secondes**

Quand vous validez un betslip, le backend :

1. Vérifie le cache
2. Si pas en cache ou expiré → Appel API Football
3. Compare les cotes actuelles avec celles du betslip
4. Retourne le résultat (fermé, changé, ou valide)

---

## 📝 Fichiers Concernés

- **`bet-backend-v3/src/services/BetSlipService.js`** : Logique de validation
- **`bet-backend-v3/src/services/ApiFootballService.js`** : Appels à l'API Football
- **`bet-backend-v3/src/services/OddsOptimizer.js`** : Traitement des cotes

---

## ✅ Conclusion

**L'information "marchés fermés" vient directement de l'API Football** via les flags `suspended` et la présence/absence des marchés et sélections dans la réponse API. Le backend ne fait que **vérifier et comparer** ces données avec les paris du betslip.
