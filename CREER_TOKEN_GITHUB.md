# 🔑 Créer un Token GitHub Classic (Recommandé)

## Problème avec les Tokens Fine-Grained

Les tokens fine-grained (`github_pat_...`) peuvent avoir des problèmes de permissions. Il est plus simple d'utiliser un **token classic** pour le push Git.

## Étapes pour Créer un Token Classic

1. **Va sur GitHub** : https://github.com/settings/tokens

2. **Clique sur "Generate new token"** → **"Generate new token (classic)"**

3. **Configure le token** :

   - **Note** : Donne un nom (ex: "bet-project-push")
   - **Expiration** : Choisis une durée (90 jours, 1 an, ou "No expiration")
   - **Permissions** : Coche **`repo`** (accès complet aux repositories)
     - Cela inclut automatiquement toutes les sous-permissions nécessaires

4. **Clique sur "Generate token"** en bas de la page

5. **Copie le token** (il commence par `ghp_` et tu ne pourras plus le voir après !)

## Utiliser le Token

Une fois que tu as le token classic (`ghp_...`), exécute :

```bash
cd ~/bet

# Remplace TON_TOKEN_CLASSIC par ton token (commence par ghp_)
git remote set-url origin https://TON_TOKEN_CLASSIC@github.com/haithemab32-lgtm/test.git

# Pousser
git push origin main
```

## Alternative : Vérifier les Permissions du Token Fine-Grained

Si tu veux garder ton token fine-grained, vérifie qu'il a ces permissions :

1. Va sur : https://github.com/settings/tokens?type=beta
2. Trouve ton token et clique dessus
3. Vérifie que **"Repository access"** est sur **"All repositories"** ou inclut `haithemab32-lgtm/test`
4. Vérifie que **"Repository permissions"** → **"Contents"** est sur **"Read and write"**
5. Vérifie que **"Metadata"** est sur **"Read-only"** (minimum)

Si les permissions sont correctes mais que ça ne fonctionne toujours pas, utilise un token classic.
