# 🗑️ Supprimer tous les fichiers .md du serveur

## Commande à exécuter sur le serveur

```bash
# Se connecter au serveur
ssh root@147.124.195.110

# Aller dans le dossier bet
cd ~/bet

# OPTION 1 : Voir d'abord ce qui sera supprimé (recommandé)
find . -name "*.md" -type f

# OPTION 2 : Supprimer tous les fichiers .md dans le dossier bet
find . -name "*.md" -type f -delete

# OU en une seule commande depuis n'importe où dans ~/bet
find ~/bet -name "*.md" -type f -delete
```

## Explication

- `find .` : Cherche dans le dossier actuel et ses sous-dossiers
- `-name "*.md"` : Filtre les fichiers qui finissent par `.md`
- `-type f` : Seulement les fichiers (pas les dossiers)
- `-delete` : Supprime les fichiers trouvés

## Alternative : Supprimer seulement dans le dossier racine (pas dans les sous-dossiers)

```bash
cd ~/bet
rm -f *.md
```

## ⚠️ Attention

Cette commande supprimera **TOUS** les fichiers `.md` dans le dossier `bet` et ses sous-dossiers, y compris :

- Les guides de déploiement
- Les documentations
- Les fichiers README.md s'il y en a

Assure-toi de vouloir vraiment supprimer ces fichiers avant d'exécuter la commande !
