# 🚀 Guide Démarrage Rapide - Serveur Novardp

## 📋 Informations Requises

Tu as besoin de :

- ✅ **IP du serveur** (IPv4) : `147.124.195.110` (exemple)
- ✅ **Utilisateur** : `root` (ou celui fourni par Novardp)
- ✅ **Mot de passe** : (celui fourni par Novardp)
- ✅ **ID du serveur** : (pour référence)

---

## 🔌 Étape 1 : Se Connecter au Serveur

### Sur Linux/macOS :

```bash
ssh root@147.124.195.110
```

Quand on te demande le mot de passe, colle celui fourni par Novardp.

### Sur Windows :

1. **Option 1** : Utiliser **Windows Terminal** ou **PowerShell**

   ```powershell
   ssh root@147.124.195.110
   ```

2. **Option 2** : Utiliser **PuTTY** (télécharge depuis [putty.org](https://www.putty.org/))
   - Host Name : `147.124.195.110`
   - Port : `22`
   - Connection type : `SSH`
   - Clique sur "Open"
   - Login as : `root`
   - Mot de passe : (celui fourni)

---

## ✅ Étape 2 : Vérifier et Mettre à Jour le Système

Une fois connecté, exécute ces commandes :

```bash
# Vérifier la version du système
cat /etc/os-release

# Mettre à jour le système
apt update && apt upgrade -y

# Installer les outils essentiels
apt install -y curl wget git build-essential ufw
```

---

## 📦 Étape 3 : Installer Node.js

```bash
# Installer Node.js 20.x (LTS)
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# Vérifier l'installation
node --version  # Devrait afficher v20.x.x
npm --version
```

---

## 🗄️ Étape 4 : Installer MongoDB

### Option A : MongoDB Self-hosted (sur le serveur)

```bash
# Importer la clé GPG MongoDB
curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor

# Ajouter le repository MongoDB
echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | tee /etc/apt/sources.list.d/mongodb-org-7.0.list

# Installer MongoDB
apt update
apt install -y mongodb-org

# Démarrer MongoDB
systemctl start mongod
systemctl enable mongod

# Vérifier que MongoDB fonctionne
systemctl status mongod
```

### Option B : MongoDB Atlas (Cloud - Recommandé pour débuter)

Si tu préfères utiliser MongoDB Atlas (gratuit jusqu'à 512MB) :

1. Va sur [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)
2. Crée un compte gratuit
3. Crée un cluster (gratuit)
4. Récupère la **connection string** (ex: `mongodb+srv://user:password@cluster.mongodb.net/bet`)
5. Tu n'as pas besoin d'installer MongoDB sur le serveur dans ce cas

---

## 🔴 Étape 5 : Installer Redis

```bash
# Installer Redis
apt install -y redis-server

# Démarrer Redis
systemctl start redis-server
systemctl enable redis-server

# Vérifier que Redis fonctionne
redis-cli ping  # Devrait répondre "PONG"
```

---

## 🌐 Étape 6 : Installer Nginx

```bash
# Installer Nginx
apt install -y nginx

# Démarrer Nginx
systemctl start nginx
systemctl enable nginx

# Vérifier que Nginx fonctionne
systemctl status nginx
```

---

## ⚙️ Étape 7 : Installer PM2 (Gestionnaire de Processus)

```bash
# Installer PM2 globalement
npm install -g pm2

# Configurer PM2 pour démarrer au boot
pm2 startup
# Suis les instructions affichées (généralement : copier/coller la commande suggérée)

# Sauvegarder la configuration PM2
pm2 save
```

---

## 📥 Étape 8 : Cloner le Projet depuis GitHub

```bash
# Aller dans le dossier home
cd ~

# Cloner ton repository GitHub
git clone https://github.com/haithemab32-lgtm/test.git bet

# OU si le repo est privé, utilise un token GitHub :
# git clone https://TON_TOKEN@github.com/haithemab32-lgtm/test.git bet

# OU si tu as configuré SSH sur le serveur :
# git clone git@github.com:haithemab32-lgtm/test.git bet

# Aller dans le dossier du projet
cd bet

# Vérifier que tout est bien cloné
ls -la
```

### 🔐 Si le Repo est Privé

Si ton repo GitHub est privé, tu dois utiliser un **token GitHub** :

1. **Créer un token** : GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic) → Generate new token
2. **Permissions** : Coche `repo` (accès complet aux repositories)
3. **Cloner avec le token** :
   ```bash
   git clone https://TON_TOKEN@github.com/haithemab32-lgtm/test.git bet
   ```

### 🔄 Mettre à Jour le Code Plus Tard

Quand tu fais des modifications en local et que tu veux les déployer :

**Sur ton PC** :

```bash
cd ~/bet
git add .
git commit -m "Description des changements"
git push origin main
```

**Sur le serveur** :

```bash
cd ~/bet
git pull origin main
pm2 restart bet-backend  # Redémarrer le backend
cd bet7-frontend-v2 && npm run build && cd ..  # Rebuilder le frontend
systemctl reload nginx
```

---

## 🔧 Étape 9 : Configurer le Backend

```bash
# Aller dans le dossier backend
cd ~/bet/bet-backend-v3
# OU si tu as transféré directement :
# cd ~/bet-backend-v3

# Installer les dépendances
npm install

# Créer le fichier .env (si pas déjà présent)
nano .env
```

Dans le fichier `.env`, ajoute :

```env
# Port du serveur
PORT=3000

# MongoDB
MONGODB_URI=mongodb://localhost:27017/bet
# OU si tu utilises MongoDB Atlas :
# MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/bet

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# API Football
API_FOOTBALL_KEY=ton-api-key-ici

# JWT Secret (génère un secret aléatoire)
JWT_SECRET=ton-secret-jwt-aleatoire-ici

# CORS
CORS_ORIGIN=http://147.124.195.110
```

**Générer un JWT_SECRET aléatoire** :

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copie le résultat dans `JWT_SECRET`.

**Sauvegarder et quitter** : `Ctrl+X`, puis `Y`, puis `Enter`

---

## 🎨 Étape 10 : Configurer le Frontend

```bash
# Aller dans le dossier frontend
cd ~/bet/bet7-frontend-v2
# OU si tu as transféré directement :
# cd ~/bet7-frontend-v2

# Installer les dépendances
npm install

# Créer le fichier .env (si pas déjà présent)
nano .env
```

Dans le fichier `.env`, ajoute :

```env
VITE_API_URL=http://147.124.195.110:3000
VITE_SOCKET_URL=http://147.124.195.110:3000
```

**Sauvegarder et quitter** : `Ctrl+X`, puis `Y`, puis `Enter`

**Builder le frontend** :

```bash
npm run build
```

Cela créera un dossier `dist` avec les fichiers statiques.

---

## 🚀 Étape 11 : Démarrer le Backend avec PM2

```bash
# Aller dans le dossier backend
cd ~/bet/bet-backend-v3

# Démarrer avec PM2
pm2 start src/index.js --name "bet-backend"

# Vérifier que ça fonctionne
pm2 status
pm2 logs bet-backend

# Sauvegarder la configuration PM2
pm2 save
```

---

## 🌐 Étape 12 : Configurer Nginx pour le Frontend

```bash
# Créer la configuration Nginx
nano /etc/nginx/sites-available/bet
```

Colle cette configuration :

```nginx
server {
    listen 80;
    server_name 147.124.195.110;  # Remplace par ton domaine si tu en as un

    # Frontend (React)
    root /root/bet/bet7-frontend-v2/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # WebSocket pour Socket.io
    location /socket.io {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

**Sauvegarder et quitter** : `Ctrl+X`, puis `Y`, puis `Enter`

**Activer la configuration** :

```bash
# Créer un lien symbolique
ln -s /etc/nginx/sites-available/bet /etc/nginx/sites-enabled/

# Supprimer la config par défaut (optionnel)
rm /etc/nginx/sites-enabled/default

# Tester la configuration
nginx -t

# Recharger Nginx
systemctl reload nginx
```

---

## 🔥 Étape 13 : Configurer le Firewall (UFW)

```bash
# Autoriser SSH (important !)
ufw allow 22/tcp

# Autoriser HTTP
ufw allow 80/tcp

# Autoriser HTTPS (si tu installes SSL plus tard)
ufw allow 443/tcp

# Activer le firewall
ufw enable

# Vérifier les règles
ufw status
```

---

## ✅ Étape 14 : Vérifier que Tout Fonctionne

1. **Backend** : Vérifie les logs PM2

   ```bash
   pm2 logs bet-backend
   ```

2. **Frontend** : Ouvre ton navigateur et va sur `http://147.124.195.110`

3. **API** : Teste l'API directement
   ```bash
   curl http://localhost:3000/api/health
   # OU depuis l'extérieur :
   curl http://147.124.195.110/api/health
   ```

---

## 🔍 Commandes Utiles

### Voir les logs du backend

```bash
pm2 logs bet-backend
```

### Redémarrer le backend

```bash
pm2 restart bet-backend
```

### Arrêter le backend

```bash
pm2 stop bet-backend
```

### Voir le statut de tous les services

```bash
pm2 status
systemctl status nginx
systemctl status mongod
systemctl status redis-server
```

### Redémarrer Nginx

```bash
systemctl restart nginx
```

### Voir les logs Nginx

```bash
tail -f /var/log/nginx/error.log
tail -f /var/log/nginx/access.log
```

---

## 🐛 Problèmes Courants

### Le backend ne démarre pas

- Vérifie que MongoDB et Redis sont démarrés : `systemctl status mongod` et `systemctl status redis-server`
- Vérifie le fichier `.env` : `cat ~/bet/bet-backend-v3/.env`
- Vérifie les logs : `pm2 logs bet-backend`

### Le frontend ne s'affiche pas

- Vérifie que le build a réussi : `ls -la ~/bet/bet7-frontend-v2/dist`
- Vérifie la config Nginx : `nginx -t`
- Vérifie les logs Nginx : `tail -f /var/log/nginx/error.log`

### Impossible de se connecter au serveur

- Vérifie que le port 22 (SSH) est ouvert dans le firewall du serveur (panneau Novardp)
- Vérifie que UFW autorise SSH : `ufw status`

---

## 📝 Prochaines Étapes (Optionnel)

1. **Installer SSL/HTTPS** avec Let's Encrypt (gratuit)
2. **Configurer un domaine** (si tu en as un)
3. **Mettre en place des backups** automatiques
4. **Configurer un monitoring** (PM2 Plus, ou autre)

---

## 🆘 Besoin d'Aide ?

Si tu rencontres un problème, vérifie :

1. Les logs PM2 : `pm2 logs bet-backend`
2. Les logs Nginx : `tail -f /var/log/nginx/error.log`
3. Le statut des services : `systemctl status mongod redis-server nginx`
4. Les erreurs dans la console du navigateur (F12)

---

**Bon déploiement ! 🚀**
