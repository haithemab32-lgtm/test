# 📸 Explication des Captures d'Écran - Validation BetSlip

**Date**: $(date)

---

## 🎯 Situation Globale

L'utilisateur a composé un **ticket de pari** avec plusieurs paris, puis a cliqué sur **"Valider les cotes"**. Le système a détecté que certains marchés ne sont plus disponibles, et affiche une **modal de confirmation** pour informer l'utilisateur.

---

## 📋 Détails du BetSlip (Barre Latérale Droite)

### Paris dans le BetSlip

#### Pari 1 : Match #1341302

- **Match**: "Kolkheti Poti vs Saburtalo"
- **Statut**: LIVE 88' (match en cours, 88ème minute)
- **Ligue**: Erovnuli Liga • Georgia
- **Pari**: "1x2 - 2" (Victoire de l'équipe extérieure)
- **Cote**: 1.17
- **Statut du pari**: ❌ **"Fermé"** (marqué en rouge avec une croix)

#### Pari 2 : Match #1487236

- **Match**: "Mes Kerman vs Sepahan FC"
- **Statut**: LIVE 45' (match en cours, 45ème minute)
- **Ligue**: Hazfi Cup • Iran
- **Pari**: "1x2 - X" (Match nul)
- **Cote**: 41.00
- **Statut du pari**: ✅ Actif (pas de marque "Fermé")

### Calculs du Ticket

- **Cote totale**: 49.72 (1.17 × 41.00)
- **Mise**: 5€
- **Gain potentiel**: 248.59€ (5€ × 49.72)

### Message d'Avertissement

```
2 marché(s) fermé(s) ou indisponible(s)

Match Winner - Away: Le marché "Match Winner" n'est plus disponible
Match Winner - Away: Le marché "Match Winner" n'est plus disponible
```

**Explication**: Le système a détecté que **2 marchés sont fermés** :

- Match #1341302 - Marché "Match Winner" - Sélection "Away" (2)
- Match #1341483 - Marché "Match Winner" - Sélection "Away" (2)

---

## 🔴 Modal de Validation ("Confirmation des cotes")

### En-tête de la Modal

- **Titre**: "Confirmation des cotes"
- **Icône d'avertissement**: ⚠️ Triangle jaune
- **Message principal**:

  > "2 marché(s) fermé(s) ou indisponible(s)"

  > "Certains paris de votre ticket ne sont plus disponibles. Vous pouvez les retirer ou confirmer avec les autres paris valides."

### Détails des Marchés Fermés

La modal affiche **2 boîtes rouges** avec les détails :

#### Marché Fermé 1

- **Match**: #1341302
- **Marché**: Match Winner - Away
- **Message**: "Le marché "Match Winner" n'est plus disponible"

#### Marché Fermé 2

- **Match**: #1341483
- **Marché**: Match Winner - Away
- **Message**: "Le marché "Match Winner" n'est plus disponible"

### Boutons d'Action

- **"Annuler"** (gris) - Ferme la modal sans action
- **"Fermer"** (vert) - Ferme la modal (les paris fermés restent dans le betslip)

---

## 🔍 Pourquoi Ces Marchés Sont Fermés ?

### Raisons Possibles

1. **Match en cours avancé (88ème minute)**

   - Le match #1341302 est à la **88ème minute**
   - À ce stade du match, certains marchés peuvent se fermer
   - Le marché "1x2" peut être fermé si le résultat est déjà déterminé ou si le bookmaker ne prend plus de paris

2. **Match terminé ou presque terminé**

   - Le match est à la **88ème minute** (presque terminé)
   - Les bookmakers ferment souvent les marchés "1x2" en fin de match
   - Le marché "Away" (victoire extérieure) peut être fermé si le résultat est déjà clair

3. **Suspension du marché**

   - Le marché peut être temporairement suspendu
   - Par exemple, après un événement critique (but, penalty, etc.)

4. **Politique du bookmaker**
   - Certains bookmakers ferment les marchés "1x2" après un certain temps de jeu
   - Particulièrement en fin de match (après 80-85 minutes)

---

## 📊 Ce Qui Se Passe Techniquement

### 1. Clic sur "Valider les cotes"

Quand l'utilisateur clique sur le bouton bleu **"Valider les cotes"** :

1. Le frontend envoie une requête POST à `/api/betslip/validate`
2. Le backend reçoit les paris à valider
3. Pour chaque match, le backend :
   - Récupère le statut du match (via API Football)
   - Récupère les cotes actuelles (via API Football)
   - Compare avec les cotes du betslip
   - Vérifie que les marchés sont ouverts

### 2. Détection des Marchés Fermés

Pour le match #1341302 :

- Le backend récupère les cotes actuelles
- Il cherche le marché "Match Winner"
- Il cherche la sélection "Away" (2)
- **Résultat**: Le marché ou la sélection n'existe plus OU est suspendu
- **Code retourné**: `REJECTED_MARKET_CLOSED`

### 3. Affichage dans la Modal

Le frontend reçoit la réponse avec :

```json
{
  "valid": false,
  "code": "REJECTED_MARKET_CLOSED",
  "closed": [
    {
      "fixtureId": 1341302,
      "market": "Match Winner",
      "selection": "Away",
      "message": "Le marché \"Match Winner\" n'est plus disponible",
      "code": "REJECTED_MARKET_CLOSED"
    },
    {
      "fixtureId": 1341483,
      "market": "Match Winner",
      "selection": "Away",
      "message": "Le marché \"Match Winner\" n'est plus disponible",
      "code": "REJECTED_MARKET_CLOSED"
    }
  ]
}
```

### 4. Affichage dans le BetSlip

Le betslip affiche également les paris fermés :

- Badge **"Fermé"** en rouge
- Message d'avertissement en bas
- Le pari reste visible mais est marqué comme fermé

---

## ✅ Actions Possibles pour l'Utilisateur

### Option 1 : Retirer les Paris Fermés

1. **Cliquer sur le "×"** à côté du pari fermé dans le betslip
2. Le pari est retiré
3. La cote totale est recalculée
4. Le message d'avertissement disparaît

### Option 2 : Fermer la Modal

1. **Cliquer sur "Fermer"** dans la modal
2. La modal se ferme
3. Les paris fermés **restent dans le betslip** (marqués comme fermés)
4. L'utilisateur peut les retirer manuellement plus tard

### Option 3 : Annuler

1. **Cliquer sur "Annuler"** dans la modal
2. La modal se ferme
3. Aucune action n'est effectuée

---

## 🎯 Pourquoi Ce Comportement ?

### Design Décision

Le système **ne retire PAS automatiquement** les paris fermés car :

1. **Transparence** - L'utilisateur voit clairement quels paris sont fermés
2. **Contrôle** - L'utilisateur décide s'il veut les retirer ou non
3. **Information** - L'utilisateur peut voir pourquoi le pari est fermé
4. **Flexibilité** - L'utilisateur peut garder le pari s'il pense qu'il sera réouvert

### Cas d'Usage

- **Match presque terminé** : Le marché peut se rouvrir si le match continue
- **Suspension temporaire** : Le marché peut se rouvrir après quelques secondes
- **Décision utilisateur** : L'utilisateur peut vouloir garder le pari pour référence

---

## 🔄 Flux Complet

```
1. Utilisateur compose son ticket
   ↓
2. Ajoute plusieurs paris (dont certains sur des matchs live)
   ↓
3. Clique sur "Valider les cotes"
   ↓
4. Backend vérifie chaque pari :
   - Statut du match ✅
   - Marché ouvert ❌ (2 marchés fermés détectés)
   - Cotes à jour ✅
   ↓
5. Backend retourne la réponse avec les marchés fermés
   ↓
6. Frontend affiche :
   - Modal avec les détails
   - Badge "Fermé" sur les paris concernés
   - Message d'avertissement
   ↓
7. Utilisateur choisit :
   - Retirer les paris fermés (clic sur ×)
   - Fermer la modal (les paris restent)
   - Annuler
```

---

## 💡 Recommandations pour l'Utilisateur

### Si Vous Voyez "Fermé"

1. **Vérifiez le statut du match**

   - Si le match est presque terminé (85+ minutes), c'est normal
   - Si le match vient de commencer, attendez quelques secondes

2. **Retirez le pari fermé**

   - Cliquez sur "×" à côté du pari
   - La cote totale sera recalculée
   - Vous pourrez valider à nouveau

3. **Réessayez la validation**
   - Parfois, les marchés se rouvrent
   - Cliquez à nouveau sur "Valider les cotes"

### Si Plusieurs Paris Sont Fermés

- **Retirez tous les paris fermés** avant de valider
- **Vérifiez que les matchs ne sont pas terminés**
- **Composez un nouveau ticket** si nécessaire

---

## 🎨 Indicateurs Visuels

### Dans le BetSlip

- **Badge "Fermé"** (rouge) = Pari non disponible
- **Bordure rouge** = Match en direct avec problème
- **Message d'avertissement** = Résumé des problèmes

### Dans la Modal

- **Triangle jaune** = Avertissement
- **Boîtes rouges** = Détails des marchés fermés
- **Bouton vert "Fermer"** = Action principale
- **Bouton gris "Annuler"** = Annulation

---

## 📝 Résumé

**Ce qui se passe** :

- ✅ 2 paris dans le betslip
- ❌ 2 marchés sont fermés (Match Winner - Away)
- ⚠️ Modal d'avertissement affichée
- 🔴 Badge "Fermé" sur les paris concernés

**Pourquoi** :

- Les matchs sont en cours (88ème et 45ème minute)
- Les marchés "1x2 - Away" sont fermés par le bookmaker
- Le système détecte et informe l'utilisateur

**Action requise** :

- L'utilisateur doit retirer manuellement les paris fermés
- Ou fermer la modal et les retirer plus tard

**C'est un comportement normal et attendu** pour garantir que seuls les paris valides sont acceptés ! ✅
