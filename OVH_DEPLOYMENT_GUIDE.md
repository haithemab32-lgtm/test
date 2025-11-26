# 🚀 Guide Complet OVH - Achat et Déploiement

**Date**: $(date)  
**Version**: 3.0.0  
**Capacité**: 1,000-10,000 utilisateurs/jour

---

## 📦 Configuration Recommandée OVH

### Pour 1,000-10,000 utilisateurs/jour

**Serveur OVH**: **B2-15** ou **B2-30**

**Spécifications**:

- **CPU**: 2-4 vCPU
- **RAM**: 15-30GB
- **Storage**: 50-100GB SSD
- **Bande passante**: 250Mbps

**Prix**: **€9.99-19.99/mois**

---

## 🛒 ÉTAPE 1 : ACHETER LE SERVEUR OVH

### 1.1 Créer un Compte OVH

1. Aller sur [ovh.com](https://www.ovh.com)
2. Cliquer sur **"Mon compte"** → **"Créer un compte"**
3. Remplir le formulaire :
   - Email
   - Mot de passe
   - Nom, Prénom
   - Téléphone
   - Adresse
4. Vérifier votre email
5. Vérifier votre téléphone (SMS)

### 1.2 Accéder au Manager OVH

1. Se connecter sur [ovh.com/manager](https://www.ovh.com/manager)
2. Compléter votre profil si nécessaire

### 1.3 Commander un Serveur VPS

1. Dans le Manager OVH, aller dans **"Cloud"** → **"Serveurs"** → **"VPS"**
2. Cliquer sur **"Commander un VPS"**

#### Configuration du Serveur

**Choisir la gamme**: **VPS Value** ou **VPS Elite**

**Pour 1,000-5,000 utilisateurs/jour**:

- **Modèle**: **B2-15**
- **CPU**: 2 vCPU
- **RAM**: 15GB
- **Storage**: 50GB SSD
- **Bande passante**: 250Mbps
- **Prix**: **€9.99/mois**

**Pour 5,000-10,000 utilisateurs/jour**:

- **Modèle**: **B2-30**
- **CPU**: 4 vCPU
- **RAM**: 30GB
- **Storage**: 100GB SSD
- **Bande passante**: 250Mbps
- **Prix**: **€19.99/mois**

**Recommandation**: Commencer avec **B2-15** (€9.99/mois), vous pourrez upgrader plus tard.

#### Choisir la Localisation

- **Europe**: France (Gravelines, Roubaix), Allemagne (Frankfurt)
- **Recommandé**: **Gravelines** (France) ou **Frankfurt** (Allemagne)

#### Choisir l'OS

- **Ubuntu 22.04 LTS** (recommandé)
- Ou **Ubuntu 20.04 LTS**

#### Durée d'Engagement

- **1 mois** (facturation mensuelle)
- **12 mois** (réduction possible)

#### Options

- **Backup automatique**: Optionnel (€2-5/mois)
- **IP Failover**: Non nécessaire pour démarrer
- **Snapshots**: Optionnel

### 1.4 Finaliser la Commande

1. Vérifier le récapitulatif
2. Accepter les conditions générales
3. Choisir le mode de paiement (carte bancaire, PayPal)
4. Valider la commande
5. Payer

### 1.5 Récupérer les Informations

Après la commande (quelques minutes), vous recevrez un email avec :

- **IP du serveur**: `xxx.xxx.xxx.xxx`
- **Mot de passe root**: (généré automatiquement)
- **Accès au Manager OVH**

**IMPORTANT**: Sauvegardez ces informations !

### 1.6 Accéder au Serveur

Dans le Manager OVH :

1. Aller dans **"Cloud"** → **"Serveurs"** → **"VPS"**
2. Cliquer sur votre serveur
3. Vous verrez :
   - IP publique
   - Mot de passe root
   - Statut du serveur

---

## 🔧 ÉTAPE 2 : CONFIGURATION INITIALE DU SERVEUR

### 2.1 Se Connecter au Serveur

```bash
ssh root@votre-ip-ovh
```

Entrer le mot de passe root reçu par email.

**Première connexion**: Vous devrez changer le mot de passe.

### 2.2 Mettre à Jour le Système

```bash
apt update && apt upgrade -y
apt install -y curl wget git build-essential ufw
```

### 2.3 Créer un Utilisateur Non-Root (Sécurité)

```bash
# Créer un utilisateur
adduser deploy
usermod -aG sudo deploy

# Autoriser l'accès SSH
mkdir -p /home/deploy/.ssh
cp ~/.ssh/authorized_keys /home/deploy/.ssh/ 2>/dev/null || echo "Pas de clé SSH configurée"
chown -R deploy:deploy /home/deploy/.ssh
chmod 700 /home/deploy/.ssh
chmod 600 /home/deploy/.ssh/authorized_keys 2>/dev/null || true
```

---

## 📦 ÉTAPE 3 : INSTALLATION DES DÉPENDANCES

### 3.1 Installer Node.js 20.x

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# Vérifier
node --version  # Devrait afficher v20.x.x
npm --version
```

### 3.2 Installer MongoDB

```bash
# Importer la clé GPG
curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor

# Ajouter le repository
echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | tee /etc/apt/sources.list.d/mongodb-org-7.0.list

# Installer
apt update
apt install -y mongodb-org

# Démarrer MongoDB
systemctl start mongod
systemctl enable mongod

# Vérifier
systemctl status mongod
```

### 3.3 Configurer MongoDB (Sécurité)

```bash
# Se connecter à MongoDB
mongosh
```

Dans MongoDB shell :

```javascript
use admin
db.createUser({
  user: "betadmin",
  pwd: "VotreMotDePasseFort123!",
  roles: [ { role: "userAdminAnyDatabase", db: "admin" }, "readWriteAnyDatabase" ]
})
exit
```

**⚠️ IMPORTANT**: Remplacez `VotreMotDePasseFort123!` par un mot de passe fort !

Activer l'authentification :

```bash
nano /etc/mongod.conf
```

Modifier :

```yaml
security:
  authorization: enabled
```

Redémarrer :

```bash
systemctl restart mongod
```

Tester :

```bash
mongosh -u betadmin -p VotreMotDePasseFort123! --authenticationDatabase admin
```

### 3.4 Installer Redis

```bash
apt install -y redis-server

# Configurer Redis
nano /etc/redis/redis.conf
```

Modifier :

```
# Limiter la mémoire (selon votre RAM)
maxmemory 2gb
maxmemory-policy allkeys-lru

# Activer la persistance
save 900 1
save 300 10
save 60 10000

# Sécuriser avec un mot de passe
requirepass VotreMotDePasseRedisFort123!
```

**⚠️ IMPORTANT**: Remplacez `VotreMotDePasseRedisFort123!` par un mot de passe fort !

Redémarrer :

```bash
systemctl restart redis-server
systemctl enable redis-server

# Tester
redis-cli -a VotreMotDePasseRedisFort123! ping
# Devrait répondre: PONG
```

### 3.5 Installer Nginx

```bash
apt install -y nginx
systemctl start nginx
systemctl enable nginx

# Vérifier
systemctl status nginx
```

### 3.6 Installer PM2

```bash
npm install -g pm2

# Configurer PM2 pour démarrer au boot
pm2 startup
# Suivre les instructions affichées (copier-coller la commande suggérée)
```

### 3.7 Installer Certbot (SSL)

```bash
apt install -y certbot python3-certbot-nginx
```

---

## 🔒 ÉTAPE 4 : CONFIGURER LE FIREWALL

```bash
# Autoriser SSH (IMPORTANT - faire en premier !)
ufw allow 22/tcp

# Autoriser HTTP et HTTPS
ufw allow 80/tcp
ufw allow 443/tcp

# Activer le firewall
ufw enable

# Vérifier
ufw status
```

---

## 🚀 ÉTAPE 5 : DÉPLOYER LE BACKEND

### 5.1 Cloner le Repository

```bash
cd /var/www
git clone https://github.com/votre-username/bet.git
cd bet/bet-backend-v3
```

**Remplacez** `votre-username` par votre nom d'utilisateur GitHub.

### 5.2 Installer les Dépendances

```bash
npm install --production
```

### 5.3 Configurer les Variables d'Environnement

```bash
cp .env.example .env
nano .env
```

Contenu du fichier `.env` :

```env
# Server
PORT=5000
NODE_ENV=production
SERVER_TIMEOUT=120000

# MongoDB (self-hosted sur OVH)
MONGODB_URI=mongodb://betadmin:VotreMotDePasseFort123!@localhost:27017/bet-backend?authSource=admin

# Redis (self-hosted sur OVH)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=VotreMotDePasseRedisFort123!
REDIS_MAX_MEMORY=2gb
REDIS_COMPRESSION_THRESHOLD=10240

# API Football
API_FOOTBALL_KEY=votre-cle-api-football
API_FOOTBALL_BASE_URL=https://v3.football.api-sports.io
API_FOOTBALL_RATE_LIMIT=10

# CORS (remplacer par votre domaine)
CORS_ORIGIN=https://votre-domaine.com,https://www.votre-domaine.com

# Cache TTL (en secondes)
CACHE_TTL_LIVE_MATCHES=30
CACHE_TTL_UPCOMING_MATCHES=300
CACHE_TTL_DAILY_MATCHES=600
CACHE_TTL_LEAGUE_MATCHES=600
CACHE_TTL_LIVE_ODDS=10

# Refresh Intervals (en secondes)
LIVE_MATCHES_REFRESH_INTERVAL=5
LIVE_ODDS_REFRESH_INTERVAL=5

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100

# BetSlip
BETSLIP_CODE_LENGTH=6
BETSLIP_EXPIRATION_HOURS=24
```

**⚠️ IMPORTANT**:

- Remplacez les mots de passe MongoDB et Redis
- Remplacez `votre-cle-api-football` par votre vraie clé API
- Remplacez `votre-domaine.com` par votre domaine (ou l'IP du serveur pour tester)

### 5.4 Démarrer le Backend avec PM2

```bash
pm2 start src/index.js --name bet-backend
pm2 save

# Vérifier
pm2 status
pm2 logs bet-backend
```

Vous devriez voir :

```
✅ Server running on port 5000
✅ Redis connected successfully
✅ MongoDB connected
```

---

## 🌐 ÉTAPE 6 : CONFIGURER NGINX POUR LE BACKEND

### 6.1 Créer la Configuration Nginx

```bash
nano /etc/nginx/sites-available/bet-backend
```

Contenu :

```nginx
server {
    listen 80;
    server_name api.votre-domaine.com;

    # Augmenter les timeouts pour les requêtes longues
    proxy_read_timeout 120s;
    proxy_connect_timeout 120s;
    proxy_send_timeout 120s;

    # Taille maximale des uploads
    client_max_body_size 10M;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;

        # Headers pour WebSocket (Socket.io)
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';

        # Headers standards
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Cache bypass pour WebSocket
        proxy_cache_bypass $http_upgrade;

        # Désactiver le buffering pour les réponses en streaming
        proxy_buffering off;
    }

    # Logs
    access_log /var/log/nginx/bet-backend-access.log;
    error_log /var/log/nginx/bet-backend-error.log;
}
```

**Remplacez** `api.votre-domaine.com` par votre sous-domaine ou l'IP du serveur.

### 6.2 Activer la Configuration

```bash
ln -s /etc/nginx/sites-available/bet-backend /etc/nginx/sites-enabled/
nginx -t  # Vérifier la configuration
systemctl reload nginx
```

### 6.3 Tester le Backend

```bash
curl http://localhost:5000/health
```

Vous devriez voir :

```json
{ "status": "ok", "timestamp": "...", "cache": true }
```

---

## 🎨 ÉTAPE 7 : DÉPLOYER LE FRONTEND

### 7.1 Aller dans le Dossier Frontend

```bash
cd /var/www/bet/bet7-frontend-v2
```

### 7.2 Installer les Dépendances

```bash
npm install
```

### 7.3 Configurer les Variables d'Environnement

```bash
nano .env.production
```

Contenu :

```env
VITE_API_URL=http://api.votre-domaine.com
VITE_SOCKET_URL=http://api.votre-domaine.com
```

**Remplacez** par votre domaine ou l'IP du serveur.

### 7.4 Builder le Frontend

```bash
npm run build
```

Vérifier que le dossier `dist/` existe :

```bash
ls -la dist/
```

### 7.5 Configurer Nginx pour le Frontend

```bash
nano /etc/nginx/sites-available/bet-frontend
```

Contenu :

```nginx
server {
    listen 80;
    server_name votre-domaine.com www.votre-domaine.com;

    root /var/www/bet/bet7-frontend-v2/dist;
    index index.html;

    # Compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/json application/javascript;

    # Cache pour les assets statiques
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Proxy pour l'API
    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Proxy pour Socket.io
    location /socket.io {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 86400;
    }

    # SPA - Toutes les autres requêtes vers index.html
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Logs
    access_log /var/log/nginx/bet-frontend-access.log;
    error_log /var/log/nginx/bet-frontend-error.log;
}
```

**Remplacez** `votre-domaine.com` par votre domaine ou utilisez l'IP du serveur.

### 7.6 Activer la Configuration

```bash
ln -s /etc/nginx/sites-available/bet-frontend /etc/nginx/sites-enabled/
nginx -t
systemctl reload nginx
```

---

## 🔒 ÉTAPE 8 : CONFIGURER SSL (HTTPS)

### 8.1 Acheter un Domaine (si pas encore fait)

1. Aller sur [ovh.com/fr/domaines](https://www.ovh.com/fr/domaines)
2. Rechercher un domaine disponible
3. Ajouter au panier et payer
4. Dans la zone DNS, ajouter :
   - **Type A**: `@` → IP de votre serveur OVH
   - **Type A**: `www` → IP de votre serveur OVH
   - **Type A**: `api` → IP de votre serveur OVH

### 8.2 Obtenir les Certificats SSL

```bash
# Pour le frontend
certbot --nginx -d votre-domaine.com -d www.votre-domaine.com

# Pour le backend
certbot --nginx -d api.votre-domaine.com
```

Suivre les instructions :

- Entrer votre email
- Accepter les conditions
- Choisir de rediriger HTTP vers HTTPS

### 8.3 Vérifier le Renouvellement Automatique

```bash
certbot renew --dry-run
```

---

## 🔄 ÉTAPE 9 : MISE À JOUR DES CONFIGURATIONS

### 9.1 Mettre à Jour CORS dans le Backend

```bash
cd /var/www/bet/bet-backend-v3
nano .env
```

Mettre à jour :

```env
CORS_ORIGIN=https://votre-domaine.com,https://www.votre-domaine.com
```

Redémarrer :

```bash
pm2 restart bet-backend
```

### 9.2 Mettre à Jour les URLs du Frontend

```bash
cd /var/www/bet/bet7-frontend-v2
nano .env.production
```

Mettre à jour :

```env
VITE_API_URL=https://api.votre-domaine.com
VITE_SOCKET_URL=https://api.votre-domaine.com
```

Rebuilder :

```bash
npm run build
```

---

## ✅ ÉTAPE 10 : VÉRIFICATIONS FINALES

### 10.1 Tester le Backend

```bash
# Depuis le serveur
curl http://localhost:5000/health

# Depuis votre machine (remplacer par votre IP/domaine)
curl https://api.votre-domaine.com/health
```

### 10.2 Tester le Frontend

Ouvrir dans un navigateur :

- `https://votre-domaine.com`

### 10.3 Vérifier les Logs

```bash
# Logs backend
pm2 logs bet-backend

# Logs Nginx
tail -f /var/log/nginx/bet-backend-access.log
tail -f /var/log/nginx/bet-frontend-access.log
```

### 10.4 Vérifier les Services

```bash
# MongoDB
systemctl status mongod

# Redis
systemctl status redis-server

# Nginx
systemctl status nginx

# PM2
pm2 status
```

---

## 🔧 SCRIPTS D'AUTOMATISATION

### Script de Déploiement Backend

```bash
nano /usr/local/bin/deploy-backend.sh
```

Contenu :

```bash
#!/bin/bash

cd /var/www/bet/bet-backend-v3

echo "🔄 Mise à jour du code..."
git pull origin main

echo "📦 Installation des dépendances..."
npm install --production

echo "🔄 Redémarrage..."
pm2 restart bet-backend

echo "✅ Déploiement terminé!"
pm2 logs bet-backend --lines 20
```

Rendre exécutable :

```bash
chmod +x /usr/local/bin/deploy-backend.sh
```

### Script de Déploiement Frontend

```bash
nano /usr/local/bin/deploy-frontend.sh
```

Contenu :

```bash
#!/bin/bash

cd /var/www/bet/bet7-frontend-v2

echo "🔄 Mise à jour du code..."
git pull origin main

echo "📦 Installation des dépendances..."
npm install

echo "🏗️ Build..."
npm run build

echo "✅ Déploiement terminé!"
```

```bash
chmod +x /usr/local/bin/deploy-frontend.sh
```

---

## 📊 MONITORING

### Commandes Utiles

```bash
# Voir l'utilisation des ressources
htop

# Voir l'espace disque
df -h

# Voir l'utilisation mémoire
free -h

# Voir les logs en temps réel
pm2 logs bet-backend --lines 50

# Voir les processus
ps aux | grep node

# Voir les connexions réseau
netstat -tulpn
```

### PM2 Monitoring

```bash
# Interface de monitoring
pm2 monit

# Statistiques
pm2 list
pm2 info bet-backend
```

---

## 🔒 SÉCURITÉ

### Checklist de Sécurité

- [x] Firewall configuré (UFW)
- [x] MongoDB avec authentification
- [x] Redis avec mot de passe
- [x] SSL/HTTPS activé
- [x] Utilisateur non-root créé
- [ ] SSH avec clés (optionnel mais recommandé)
- [ ] Backups configurés

### Sécuriser SSH

```bash
nano /etc/ssh/sshd_config
```

Modifier :

```
PermitRootLogin no
PasswordAuthentication no
PubkeyAuthentication yes
```

Redémarrer :

```bash
systemctl restart sshd
```

---

## 💾 BACKUPS

### Script de Backup

```bash
nano /usr/local/bin/backup-bet.sh
```

Contenu :

```bash
#!/bin/bash

BACKUP_DIR="/var/backups/bet"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# Backup MongoDB
mongodump --uri="mongodb://betadmin:VotreMotDePasseFort123!@localhost:27017/bet-backend?authSource=admin" --out $BACKUP_DIR/mongodb_$DATE

# Backup Redis
redis-cli -a VotreMotDePasseRedisFort123! --rdb $BACKUP_DIR/redis_$DATE.rdb

# Backup des fichiers de configuration
tar -czf $BACKUP_DIR/config_$DATE.tar.gz /var/www/bet/*/.env /etc/nginx/sites-available/

# Supprimer les backups de plus de 7 jours
find $BACKUP_DIR -type d -mtime +7 -exec rm -rf {} \;
find $BACKUP_DIR -type f -mtime +7 -delete

echo "✅ Backup terminé: $DATE"
```

Cron job :

```bash
crontab -e
```

Ajouter :

```
0 2 * * * /usr/local/bin/backup-bet.sh
```

---

## 📋 CHECKLIST COMPLÈTE

### Achat OVH

- [ ] Compte OVH créé
- [ ] Serveur B2-15 ou B2-30 commandé
- [ ] IP du serveur notée
- [ ] Mot de passe root noté

### Installation

- [ ] Système mis à jour
- [ ] Node.js installé
- [ ] MongoDB installé et configuré
- [ ] Redis installé et configuré
- [ ] Nginx installé
- [ ] PM2 installé
- [ ] Certbot installé
- [ ] Firewall configuré

### Déploiement

- [ ] Backend cloné et configuré
- [ ] Variables d'environnement configurées
- [ ] Backend démarré avec PM2
- [ ] Nginx configuré pour le backend
- [ ] Frontend buildé
- [ ] Nginx configuré pour le frontend
- [ ] SSL configuré
- [ ] CORS mis à jour
- [ ] Tests effectués

---

## 🎉 C'EST FAIT !

Votre application est maintenant déployée sur OVH ! 🚀

**URLs**:

- Frontend: `https://votre-domaine.com`
- Backend API: `https://api.votre-domaine.com`
- Health Check: `https://api.votre-domaine.com/health`

---

## 📞 Support

- **OVH Support**: [support.ovh.com](https://support.ovh.com)
- **Documentation OVH**: [docs.ovh.com](https://docs.ovh.com)
- **Logs**: `pm2 logs bet-backend`

**Bon déploiement ! 🚀**
