# 🧹 Nettoyer le Serveur et Utiliser GitHub

## Étape 1 : Se Connecter au Serveur

```bash
ssh root@147.124.195.110
```

## Étape 2 : Supprimer les Fichiers Transférés

Une fois connecté au serveur, exécute ces commandes pour supprimer les dossiers transférés :

```bash
# Supprimer le dossier bet s'il existe
rm -rf ~/bet

# Supprimer les dossiers individuels s'ils ont été transférés séparément
rm -rf ~/bet-backend-v3
rm -rf ~/bet7-frontend-v2

# Vérifier que tout est supprimé
ls -la ~
```

## Étape 3 : Cloner depuis GitHub

```bash
# Aller dans le dossier home
cd ~

# Cloner le repository GitHub
git clone https://github.com/haithemab32-lgtm/test.git bet

# OU si le repo est privé, utilise un token :
# git clone https://TON_TOKEN@github.com/haithemab32-lgtm/test.git bet

# Vérifier que le clone a réussi
cd bet
ls -la
```

## Étape 4 : Vérifier la Structure

Tu devrais voir :

- `bet-backend-v3/`
- `bet7-frontend-v2/`
- Les autres fichiers du projet

## Étape 5 : Continuer avec le Déploiement

Maintenant tu peux continuer avec les étapes du guide `NOVARDP_QUICK_START.md` à partir de l'**Étape 9 : Configurer le Backend**.

---

## 🔄 Mettre à Jour le Code Plus Tard

Quand tu fais des modifications en local et que tu veux les déployer sur le serveur :

### Sur ton PC (local) :

```bash
cd ~/bet
git add .
git commit -m "Description des changements"
git push origin main
```

### Sur le serveur :

```bash
ssh root@147.124.195.110
cd ~/bet
git pull origin main

# Redémarrer le backend si nécessaire
pm2 restart bet-backend

# Rebuilder le frontend si nécessaire
cd ~/bet/bet7-frontend-v2
npm run build
systemctl reload nginx
```

---

## 🔐 Si le Repo est Privé

Si ton repo GitHub est privé, tu as 2 options :

### Option 1 : Utiliser un Token GitHub (Recommandé)

1. Va sur GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Crée un nouveau token avec les permissions `repo`
3. Sur le serveur, clone avec le token :

```bash
git clone https://TON_TOKEN@github.com/haithemab32-lgtm/test.git bet
```

### Option 2 : Configurer SSH sur le Serveur

```bash
# Générer une clé SSH sur le serveur
ssh-keygen -t ed25519 -C "serveur@bet"

# Afficher la clé publique
cat ~/.ssh/id_ed25519.pub

# Copie cette clé et ajoute-la sur GitHub :
# GitHub → Settings → SSH and GPG keys → New SSH key

# Puis clone avec SSH
git clone git@github.com:haithemab32-lgtm/test.git bet
```

---

## ✅ Vérification Finale

Après le clone, vérifie que tout est en place :

```bash
cd ~/bet
ls -la

# Vérifier les dossiers backend et frontend
ls -la bet-backend-v3/
ls -la bet7-frontend-v2/
```
