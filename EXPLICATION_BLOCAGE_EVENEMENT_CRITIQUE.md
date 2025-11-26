# Explication du Blocage après Événement Critique

## Pourquoi un match est bloqué ?

Le blocage **n'est PAS** dû à l'API qui bloque les cotes. C'est une **mesure de sécurité** mise en place par votre backend pour protéger les utilisateurs et éviter les paris sur des cotes obsolètes.

## Comment ça fonctionne ?

### 1. **Détection des événements critiques**

Quand vous validez un pari, le backend :

1. Récupère les événements récents du match via l'API Football (`getFixtureEvents`)
2. Vérifie s'il y a eu un événement critique dans les **5 dernières secondes** :
   - **But (Goal)**
   - **Penalty**
   - **Carton rouge (Red Card)**

### 2. **Blocage temporaire**

Si un événement critique est détecté :

- Le backend bloque **tous les paris** sur ce match pendant **5 secondes**
- Un "lock" est créé dans Redis avec la clé `critical_event_lock:{fixtureId}`
- Le message affiché : `"Pari temporairement bloqué après un événement critique (Goal). Réessayez dans 5 seconde(s)"`

### 3. **Pourquoi ce blocage ?**

**Raison principale :** Après un événement critique (comme un but), les bookmakers mettent à jour les cotes très rapidement. Si un utilisateur parie pendant cette période de mise à jour, il pourrait :

- Parier sur des cotes qui ne sont plus valides
- Profiter d'un délai pour parier sur des cotes avant qu'elles ne changent
- Créer des incohérences dans le système

**Exemple concret :**

```
Minute 45' : But marqué → Score passe de 0-0 à 1-0
Minute 45' + 1 seconde : Les cotes commencent à changer
Minute 45' + 2 secondes : Un utilisateur essaie de parier sur "Home Win" avec l'ancienne cote
→ BLOCAGE pendant 5 secondes pour laisser le temps aux cotes de se stabiliser
```

## Configuration actuelle

```javascript
// Délai de lock après un événement critique (en secondes)
const CRITICAL_EVENT_LOCK_DURATION = 5; // 5 secondes
```

## Événements considérés comme critiques

1. **Goal** (But)
2. **Penalty** (Penalty)
3. **Card + Red Card** (Carton rouge)

## Où est-ce géré dans le code ?

- **Fichier :** `bet-backend-v3/src/services/BetSlipService.js`
- **Fonction :** `checkCriticalEvents(fixtureId)` (ligne 534)
- **Appel :** Dans `validateBet()` avant de valider chaque pari (ligne 277)

## Flux complet

```
1. Utilisateur clique sur "Valider les cotes"
2. Backend reçoit la requête de validation
3. Pour chaque pari :
   a. Vérifie si le match est terminé/annulé
   b. Vérifie si le marché est fermé
   c. ✅ Vérifie s'il y a un événement critique récent (checkCriticalEvents)
   d. Si événement critique → REJECTED_CRITICAL_EVENT
   e. Sinon, continue la validation (vérifie les cotes, etc.)
4. Retourne le résultat avec les paris bloqués
```

## Est-ce que l'API bloque les cotes ?

**Non**, l'API Football ne bloque pas les cotes. Le blocage est une **protection côté backend** pour :

- Éviter les paris sur des cotes obsolètes
- Donner le temps aux bookmakers de mettre à jour leurs cotes
- Protéger l'intégrité du système de paris

## Que faire si un pari est bloqué ?

1. **Attendre 5 secondes** (le temps indiqué dans le message)
2. **Réessayer** en cliquant à nouveau sur "Valider les cotes"
3. Le blocage se lève automatiquement après 5 secondes

## Améliorations possibles

Si vous voulez ajuster le comportement :

1. **Changer la durée du blocage :**

   ```javascript
   const CRITICAL_EVENT_LOCK_DURATION = 10; // 10 secondes au lieu de 5
   ```

2. **Ajouter d'autres événements critiques :**

   ```javascript
   const isCritical =
     event.type === "Goal" ||
     event.type === "Penalty" ||
     (event.type === "Card" && event.detail === "Red Card") ||
     event.type === "Var"; // Ajouter VAR par exemple
   ```

3. **Désactiver le blocage (non recommandé) :**
   - Commenter l'appel à `checkCriticalEvents()` dans `validateBet()`

## Conclusion

Le blocage après événement critique est une **fonctionnalité de sécurité** qui protège votre système et vos utilisateurs. Ce n'est **pas un bug**, mais une **feature** qui fonctionne comme prévu.
