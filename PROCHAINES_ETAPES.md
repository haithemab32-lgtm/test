# 📋 Prochaines Étapes - Déploiement sur Serveur Novardp

## ✅ Ce qui est déjà fait

- ✅ Serveur Novardp configuré (Ubuntu 22.04)
- ✅ Node.js installé
- ✅ MongoDB installé (ou prêt pour MongoDB Atlas)
- ✅ Redis installé
- ✅ Nginx installé et démarré
- ✅ PM2 installé et configuré
- ✅ Serveur nettoyé (fichiers scp supprimés)
- ✅ Code commité localement (2 commits prêts à être poussés)

---

## 🎯 Prochaines Étapes (dans l'ordre)

### Étape 1 : Pousser le Code vers GitHub ⚠️

**Problème actuel** : Le push échoue à cause du token fine-grained.

**Solution** :

1. **Créer un token GitHub classic** :

   - Va sur : https://github.com/settings/tokens
   - Clique sur "Generate new token (classic)"
   - Note : "bet-project-push"
   - Permissions : Coche **`repo`** (accès complet)
   - Génère et copie le token (commence par `ghp_`)

2. **Configurer Git avec le token** :
   ```bash
   cd ~/bet
   git remote set-url origin https://TON_TOKEN_CLASSIC@github.com/haithemab32-lgtm/test.git
   git push origin main
   ```

**Fichier d'aide** : Voir `CREER_TOKEN_GITHUB.md`

---

### Étape 2 : Cloner le Projet sur le Serveur

**Sur le serveur** (via SSH) :

```bash
ssh root@147.124.195.110

# Cloner depuis GitHub
cd ~
git clone https://github.com/haithemab32-lgtm/test.git bet

# OU si le repo est privé, utilise le token :
# git clone https://TON_TOKEN@github.com/haithemab32-lgtm/test.git bet

# Vérifier
cd bet
ls -la
```

---

### Étape 3 : Configurer le Backend

**Sur le serveur** :

```bash
cd ~/bet/bet-backend-v3

# Installer les dépendances
npm install

# Créer le fichier .env
nano .env
```

**Contenu du fichier `.env`** :

```env
# Port du serveur
PORT=3000

# MongoDB (local ou Atlas)
MONGODB_URI=mongodb://localhost:27017/bet
# OU si MongoDB Atlas :
# MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/bet

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# API Football
API_FOOTBALL_KEY=ton-api-key-ici

# JWT Secret (génère avec : node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
JWT_SECRET=ton-secret-jwt-aleatoire-ici

# CORS
CORS_ORIGIN=http://147.124.195.110
```

**Générer un JWT_SECRET** :

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

### Étape 4 : Configurer le Frontend

**Sur le serveur** :

```bash
cd ~/bet/bet7-frontend-v2

# Installer les dépendances
npm install

# Créer le fichier .env
nano .env
```

**Contenu du fichier `.env`** :

```env
VITE_API_URL=http://147.124.195.110:3000
VITE_SOCKET_URL=http://147.124.195.110:3000
```

**Builder le frontend** :

```bash
npm run build
```

Cela créera le dossier `dist/` avec les fichiers statiques.

---

### Étape 5 : Démarrer le Backend avec PM2

**Sur le serveur** :

```bash
cd ~/bet/bet-backend-v3

# Démarrer avec PM2
pm2 start src/index.js --name "bet-backend"

# Vérifier
pm2 status
pm2 logs bet-backend

# Sauvegarder
pm2 save
```

---

### Étape 6 : Configurer Nginx

**Sur le serveur** :

```bash
# Créer la configuration Nginx
nano /etc/nginx/sites-available/bet
```

**Contenu de la configuration** :

```nginx
server {
    listen 80;
    server_name 147.124.195.110;

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

**Activer la configuration** :

```bash
# Créer le lien symbolique
ln -s /etc/nginx/sites-available/bet /etc/nginx/sites-enabled/

# Supprimer la config par défaut (optionnel)
rm /etc/nginx/sites-enabled/default

# Tester la configuration
nginx -t

# Recharger Nginx
systemctl reload nginx
```

---

### Étape 7 : Configurer le Firewall (si pas déjà fait)

```bash
# Autoriser SSH
ufw allow 22/tcp

# Autoriser HTTP
ufw allow 80/tcp

# Autoriser HTTPS (si tu installes SSL plus tard)
ufw allow 443/tcp

# Activer le firewall
ufw enable
```

---

### Étape 8 : Vérifier que Tout Fonctionne

1. **Backend** : `pm2 logs bet-backend`
2. **Frontend** : Ouvre `http://147.124.195.110` dans ton navigateur
3. **API** : Teste `http://147.124.195.110/api/health` (si cette route existe)

---

## 📚 Guides de Référence

- **Guide complet** : `NOVARDP_QUICK_START.md`
- **Créer un token GitHub** : `CREER_TOKEN_GITHUB.md`
- **Nettoyer le serveur** : `NETTOYER_SERVEUR.md`

---

## 🚀 Commande Rapide pour Déployer les Mises à Jour

Quand tu fais des modifications en local :

**Sur ton PC** :

```bash
cd ~/bet
git add .
git commit -m "Description des changements"
git push origin main
```

**Sur le serveur** :

```bash
ssh root@147.124.195.110
cd ~/bet
git pull origin main

# Redémarrer le backend
pm2 restart bet-backend

# Rebuilder le frontend
cd bet7-frontend-v2
npm run build
cd ..

# Recharger Nginx
systemctl reload nginx
```

---

## ⚠️ Problèmes Courants

### Le backend ne démarre pas

- Vérifie MongoDB : `systemctl status mongod`
- Vérifie Redis : `systemctl status redis-server`
- Vérifie le `.env` : `cat ~/bet/bet-backend-v3/.env`
- Vérifie les logs : `pm2 logs bet-backend`

### Le frontend ne s'affiche pas

- Vérifie le build : `ls -la ~/bet/bet7-frontend-v2/dist`
- Vérifie Nginx : `nginx -t` et `systemctl status nginx`
- Vérifie les logs : `tail -f /var/log/nginx/error.log`

---

**Prochaine action immédiate** : Créer un token GitHub classic et pousser le code ! 🎯
