# 🖥️ Guide de Déploiement VPS - Application Bet

**Date**: $(date)  
**Version**: 3.0.0

## 📋 Architecture de l'Application

- **Backend**: Node.js/Express avec MongoDB, Redis, Socket.io
- **Frontend**: React/Vite (SPA)
- **Services**: WebSocket temps réel, cache Redis, base de données MongoDB

---

## 🎯 Recommandations de Serveurs VPS

### Option 1 : **Hetzner Cloud** ⭐ MEILLEUR RAPPORT QUALITÉ/PRIX

**Localisation**: Allemagne (Frankfurt, Nuremberg), Finlande (Helsinki)

#### Pour Démarrage (Petit trafic)

**CPX11** - **€4.15/mois** (~$4.50)

- 2 vCPU
- 4GB RAM
- 40GB SSD NVMe
- 20TB bande passante
- **Recommandé pour**: 0-1,000 utilisateurs/jour

#### Pour Production (Trafic moyen)

**CPX21** - **€8.30/mois** (~$9)

- 3 vCPU
- 8GB RAM
- 80GB SSD NVMe
- 20TB bande passante
- **Recommandé pour**: 1,000-10,000 utilisateurs/jour

#### Pour Production (Trafic élevé)

**CPX31** - **€16.60/mois** (~$18)

- 4 vCPU
- 16GB RAM
- 160GB SSD NVMe
- 20TB bande passante
- **Recommandé pour**: 10,000-50,000 utilisateurs/jour

**Avantages**:

- ✅ Excellent rapport qualité/prix
- ✅ SSD NVMe très rapide
- ✅ Bande passante généreuse
- ✅ Localisation Europe (bonne latence)
- ✅ Pas de frais cachés

**Site**: [hetzner.com/cloud](https://www.hetzner.com/cloud)

---

### Option 2 : **DigitalOcean** ⭐ SIMPLE ET FIABLE

**Localisation**: Multiple (Amsterdam, Frankfurt, New York, etc.)

#### Pour Démarrage

**Basic Droplet** - **$6/mois**

- 1 vCPU
- 1GB RAM
- 25GB SSD
- 1TB bande passante
- **Recommandé pour**: 0-500 utilisateurs/jour

#### Pour Production

**Basic Droplet** - **$12/mois**

- 2 vCPU
- 2GB RAM
- 50GB SSD
- 2TB bande passante
- **Recommandé pour**: 500-5,000 utilisateurs/jour

#### Pour Production (Trafic élevé)

**Basic Droplet** - **$24/mois**

- 4 vCPU
- 8GB RAM
- 160GB SSD
- 5TB bande passante
- **Recommandé pour**: 5,000-20,000 utilisateurs/jour

**Avantages**:

- ✅ Interface très simple
- ✅ Documentation excellente
- ✅ Support réactif
- ✅ Scaling facile

**Site**: [digitalocean.com](https://www.digitalocean.com)

---

### Option 3 : **Contabo** 💰 TRÈS ÉCONOMIQUE

**Localisation**: Allemagne, USA, Singapour

#### Pour Démarrage

**VPS S** - **€3.99/mois** (~$4.30)

- 2 vCPU
- 4GB RAM
- 50GB SSD
- Bande passante illimitée
- **Recommandé pour**: 0-1,000 utilisateurs/jour

#### Pour Production

**VPS M** - **€6.99/mois** (~$7.50)

- 4 vCPU
- 8GB RAM
- 100GB SSD
- Bande passante illimitée
- **Recommandé pour**: 1,000-10,000 utilisateurs/jour

**Avantages**:

- ✅ Prix très compétitifs
- ✅ Bande passante illimitée
- ✅ Bonnes performances

**Inconvénients**:

- ⚠️ Support moins réactif
- ⚠️ Interface moins moderne

**Site**: [contabo.com](https://www.contabo.com)

---

### Option 4 : **OVH Cloud** 🇫🇷 FRANÇAIS

**Localisation**: France, Canada, Allemagne, etc.

#### Pour Démarrage

**B2-7** - **€4.99/mois** (~$5.40)

- 2 vCPU
- 7GB RAM
- 20GB SSD
- 250Mbps bande passante
- **Recommandé pour**: 0-1,000 utilisateurs/jour

#### Pour Production

**B2-15** - **€9.99/mois** (~$11)

- 2 vCPU
- 15GB RAM
- 50GB SSD
- 250Mbps bande passante
- **Recommandé pour**: 1,000-10,000 utilisateurs/jour

**Avantages**:

- ✅ Support en français
- ✅ Localisation France
- ✅ Bonne réputation

**Site**: [ovh.com](https://www.ovh.com)

---

### Option 5 : **Linode (Akamai)** ⚡ PERFORMANT

**Localisation**: Multiple (11 datacenters)

#### Pour Démarrage

**Shared CPU - Nanode** - **$5/mois**

- 1 vCPU
- 1GB RAM
- 25GB SSD
- 1TB bande passante
- **Recommandé pour**: 0-500 utilisateurs/jour

#### Pour Production

**Shared CPU - Linode 4GB** - **$12/mois**

- 2 vCPU
- 4GB RAM
- 80GB SSD
- 4TB bande passante
- **Recommandé pour**: 500-5,000 utilisateurs/jour

**Avantages**:

- ✅ Très performant
- ✅ Bande passante généreuse
- ✅ Bon support

**Site**: [linode.com](https://www.linode.com)

---

## 🏆 RECOMMANDATION FINALE

### Pour Démarrage (Budget serré) 💚

**Hetzner CPX11** - **€4.15/mois**

- Meilleur rapport qualité/prix
- Suffisant pour démarrer
- Facile à upgrader

### Pour Production (Recommandé) ⭐

**Hetzner CPX21** - **€8.30/mois** ou **DigitalOcean $12/mois**

- Bon équilibre performance/prix
- Supporte un trafic moyen
- Marge de manœuvre confortable

### Pour Production (Trafic élevé) 🚀

**Hetzner CPX31** - **€16.60/mois** ou **DigitalOcean $24/mois**

- Supporte un trafic important
- Excellentes performances
- Scalable

---

## 📊 Spécifications Détaillées par Trafic

### Trafic Faible (0-1,000 utilisateurs/jour)

**Serveur Minimum**:

- **CPU**: 2 vCPU
- **RAM**: 4GB (2GB pour Node.js, 1GB pour MongoDB, 512MB pour Redis, 512MB système)
- **Storage**: 40GB SSD
- **Bandwidth**: 1TB/mois minimum

**Recommandation**: Hetzner CPX11 (€4.15/mois)

---

### Trafic Moyen (1,000-10,000 utilisateurs/jour)

**Serveur Recommandé**:

- **CPU**: 3-4 vCPU
- **RAM**: 8GB (4GB pour Node.js, 2GB pour MongoDB, 1GB pour Redis, 1GB système)
- **Storage**: 80GB SSD
- **Bandwidth**: 2TB/mois minimum

**Recommandation**: Hetzner CPX21 (€8.30/mois) ou DigitalOcean $12/mois

---

### Trafic Élevé (10,000-50,000 utilisateurs/jour)

**Serveur Production**:

- **CPU**: 4-8 vCPU
- **RAM**: 16GB (8GB pour Node.js, 4GB pour MongoDB, 2GB pour Redis, 2GB système)
- **Storage**: 160GB+ SSD
- **Bandwidth**: 5TB+/mois

**Recommandation**: Hetzner CPX31 (€16.60/mois) ou DigitalOcean $24/mois

---

### Trafic Très Élevé (50,000+ utilisateurs/jour)

**Architecture Multi-Serveurs**:

- **Backend**: 2+ serveurs (load balancing)
- **MongoDB**: Serveur dédié ou MongoDB Atlas
- **Redis**: Serveur dédié ou Redis Cloud
- **Frontend**: CDN (Cloudflare, Vercel)

**Recommandation**: Architecture distribuée avec plusieurs serveurs

---

## 🚀 Guide d'Installation Complète

### Étape 1 : Créer et Configurer le Serveur VPS

#### 1.1 Créer le serveur

1. Choisir un fournisseur (Hetzner recommandé)
2. Créer un nouveau serveur :
   - **OS**: Ubuntu 22.04 LTS (recommandé)
   - **Type**: VPS Cloud
   - **Localisation**: Choisir la plus proche de vos utilisateurs
   - **Spécifications**: Selon votre trafic (voir recommandations ci-dessus)

#### 1.2 Se connecter au serveur

```bash
ssh root@votre-ip-serveur
```

Ou avec une clé SSH :

```bash
ssh -i ~/.ssh/votre-cle root@votre-ip-serveur
```

#### 1.3 Mettre à jour le système

```bash
apt update && apt upgrade -y
apt install -y curl wget git build-essential
```

---

### Étape 2 : Installer Node.js

```bash
# Installer Node.js 20.x (LTS)
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# Vérifier l'installation
node --version  # Devrait afficher v20.x.x
npm --version
```

---

### Étape 3 : Installer MongoDB

#### Option A : MongoDB Self-hosted (Recommandé pour VPS)

```bash
# Importer la clé GPG MongoDB
curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor

# Ajouter le repository
echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | tee /etc/apt/sources.list.d/mongodb-org-7.0.list

# Installer MongoDB
apt update
apt install -y mongodb-org

# Démarrer MongoDB
systemctl start mongod
systemctl enable mongod

# Vérifier le statut
systemctl status mongod

# Sécuriser MongoDB (optionnel mais recommandé)
mongosh
```

Dans MongoDB shell :

```javascript
use admin
db.createUser({
  user: "betadmin",
  pwd: "votre-mot-de-passe-fort",
  roles: [ { role: "userAdminAnyDatabase", db: "admin" }, "readWriteAnyDatabase" ]
})
exit
```

Éditer `/etc/mongod.conf` :

```yaml
security:
  authorization: enabled
```

Redémarrer MongoDB :

```bash
systemctl restart mongod
```

#### Option B : MongoDB Atlas (Cloud - Plus simple)

1. Créer un compte sur [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)
2. Créer un cluster gratuit (M0)
3. Récupérer la connection string
4. Utiliser cette connection string dans votre `.env`

---

### Étape 4 : Installer Redis

```bash
# Installer Redis
apt install -y redis-server

# Configurer Redis
nano /etc/redis/redis.conf
```

Modifier les lignes suivantes :

```
# Limiter la mémoire (selon votre RAM disponible)
maxmemory 512mb
maxmemory-policy allkeys-lru

# Activer la persistance (optionnel)
save 900 1
save 300 10
save 60 10000

# Sécuriser avec un mot de passe (recommandé)
requirepass votre-mot-de-passe-redis-fort
```

Redémarrer Redis :

```bash
systemctl restart redis-server
systemctl enable redis-server

# Vérifier
redis-cli ping
# Devrait répondre: PONG
```

Tester avec le mot de passe :

```bash
redis-cli -a votre-mot-de-passe-redis-fort ping
```

---

### Étape 5 : Installer Nginx

```bash
# Installer Nginx
apt install -y nginx

# Démarrer Nginx
systemctl start nginx
systemctl enable nginx

# Vérifier
systemctl status nginx
```

---

### Étape 6 : Installer PM2 (Process Manager)

```bash
# Installer PM2 globalement
npm install -g pm2

# Configurer PM2 pour démarrer au boot
pm2 startup
# Suivre les instructions affichées
```

---

### Étape 7 : Déployer le Backend

```bash
# Créer le répertoire de l'application
mkdir -p /var/www
cd /var/www

# Cloner votre repository (remplacer par votre URL)
git clone https://github.com/votre-username/bet.git
cd bet/bet-backend-v3

# Installer les dépendances
npm install --production

# Créer le fichier .env
nano .env
```

Copier le contenu suivant dans `.env` :

```env
# Server
PORT=5000
NODE_ENV=production
SERVER_TIMEOUT=120000

# MongoDB (si self-hosted)
MONGODB_URI=mongodb://betadmin:votre-mot-de-passe@localhost:27017/bet-backend?authSource=admin

# Ou MongoDB Atlas
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/bet-backend?retryWrites=true&w=majority

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=votre-mot-de-passe-redis-fort
REDIS_MAX_MEMORY=512mb
REDIS_COMPRESSION_THRESHOLD=10240

# API Football
API_FOOTBALL_KEY=votre-cle-api-football
API_FOOTBALL_BASE_URL=https://v3.football.api-sports.io
API_FOOTBALL_RATE_LIMIT=10

# CORS (remplacer par votre domaine)
CORS_ORIGIN=https://votre-domaine.com

# Cache TTL
CACHE_TTL_LIVE_MATCHES=30
CACHE_TTL_UPCOMING_MATCHES=300
CACHE_TTL_DAILY_MATCHES=600
CACHE_TTL_LEAGUE_MATCHES=600
CACHE_TTL_LIVE_ODDS=10

# Refresh
LIVE_MATCHES_REFRESH_INTERVAL=5
LIVE_ODDS_REFRESH_INTERVAL=5

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100

# BetSlip
BETSLIP_CODE_LENGTH=6
BETSLIP_EXPIRATION_HOURS=24
```

Démarrer avec PM2 :

```bash
# Démarrer l'application
pm2 start src/index.js --name bet-backend

# Sauvegarder la configuration PM2
pm2 save

# Vérifier le statut
pm2 status
pm2 logs bet-backend
```

---

### Étape 8 : Configurer Nginx pour le Backend

```bash
# Créer la configuration Nginx
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

Activer la configuration :

```bash
ln -s /etc/nginx/sites-available/bet-backend /etc/nginx/sites-enabled/
nginx -t  # Vérifier la configuration
systemctl reload nginx
```

---

### Étape 9 : Déployer le Frontend

```bash
cd /var/www/bet/bet7-frontend-v2

# Installer les dépendances
npm install

# Builder l'application
npm run build

# Vérifier que le dossier dist existe
ls -la dist/
```

Configurer Nginx pour servir le frontend :

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

Activer :

```bash
ln -s /etc/nginx/sites-available/bet-frontend /etc/nginx/sites-enabled/
nginx -t
systemctl reload nginx
```

---

### Étape 10 : Configurer SSL avec Let's Encrypt

```bash
# Installer Certbot
apt install -y certbot python3-certbot-nginx

# Obtenir les certificats SSL
certbot --nginx -d votre-domaine.com -d www.votre-domaine.com
certbot --nginx -d api.votre-domaine.com

# Vérifier le renouvellement automatique
certbot renew --dry-run
```

---

### Étape 11 : Configurer le Firewall

```bash
# Installer UFW (Uncomplicated Firewall)
apt install -y ufw

# Autoriser SSH (IMPORTANT - faire avant d'activer le firewall)
ufw allow 22/tcp

# Autoriser HTTP et HTTPS
ufw allow 80/tcp
ufw allow 443/tcp

# Activer le firewall
ufw enable

# Vérifier le statut
ufw status
```

---

### Étape 12 : Configuration Finale

#### Mettre à jour le fichier .env du frontend

Si vous utilisez des variables d'environnement dans le frontend, créer un fichier `.env.production` :

```bash
cd /var/www/bet/bet7-frontend-v2
nano .env.production
```

```env
VITE_API_URL=https://api.votre-domaine.com
VITE_SOCKET_URL=https://api.votre-domaine.com
```

Rebuilder :

```bash
npm run build
```

#### Mettre à jour CORS dans le backend

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

---

## 🔧 Scripts d'Automatisation

### Script de Déploiement Automatique

Créer un script pour faciliter les mises à jour :

```bash
nano /usr/local/bin/deploy-bet-backend.sh
```

Contenu :

```bash
#!/bin/bash

cd /var/www/bet/bet-backend-v3

echo "🔄 Mise à jour du code..."
git pull origin main

echo "📦 Installation des dépendances..."
npm install --production

echo "🔄 Redémarrage de l'application..."
pm2 restart bet-backend

echo "✅ Déploiement terminé!"
pm2 logs bet-backend --lines 20
```

Rendre exécutable :

```bash
chmod +x /usr/local/bin/deploy-bet-backend.sh
```

Utilisation :

```bash
deploy-bet-backend.sh
```

### Script pour le Frontend

```bash
nano /usr/local/bin/deploy-bet-frontend.sh
```

```bash
#!/bin/bash

cd /var/www/bet/bet7-frontend-v2

echo "🔄 Mise à jour du code..."
git pull origin main

echo "📦 Installation des dépendances..."
npm install

echo "🏗️ Build de l'application..."
npm run build

echo "✅ Déploiement terminé!"
```

```bash
chmod +x /usr/local/bin/deploy-bet-frontend.sh
```

---

## 📊 Monitoring et Maintenance

### Commandes Utiles

```bash
# Voir les logs du backend
pm2 logs bet-backend

# Voir les logs en temps réel
pm2 logs bet-backend --lines 50

# Voir l'utilisation des ressources
pm2 monit

# Redémarrer l'application
pm2 restart bet-backend

# Voir le statut
pm2 status

# Voir les logs Nginx
tail -f /var/log/nginx/bet-backend-access.log
tail -f /var/log/nginx/bet-backend-error.log

# Vérifier MongoDB
systemctl status mongod
mongosh --eval "db.adminCommand('ping')"

# Vérifier Redis
redis-cli -a votre-mot-de-passe ping
redis-cli -a votre-mot-de-passe info memory

# Vérifier l'espace disque
df -h

# Vérifier l'utilisation mémoire
free -h

# Vérifier les processus
htop
```

### Monitoring avec PM2

```bash
# Installer PM2 Plus (optionnel - payant)
pm2 plus

# Ou utiliser PM2 gratuit avec monitoring local
pm2 install pm2-server-monit
```

---

## 🔒 Sécurité

### Checklist de Sécurité

- [ ] Firewall configuré (UFW)
- [ ] MongoDB sécurisé avec authentification
- [ ] Redis sécurisé avec mot de passe
- [ ] SSL/HTTPS activé (Let's Encrypt)
- [ ] Mots de passe forts pour tous les services
- [ ] SSH avec clés (désactiver l'authentification par mot de passe)
- [ ] Mises à jour système régulières
- [ ] Logs surveillés
- [ ] Backups réguliers

### Sécuriser SSH

```bash
# Éditer la configuration SSH
nano /etc/ssh/sshd_config
```

Modifier :

```
PermitRootLogin no
PasswordAuthentication no
PubkeyAuthentication yes
```

Créer un utilisateur non-root :

```bash
adduser deploy
usermod -aG sudo deploy
mkdir -p /home/deploy/.ssh
cp ~/.ssh/authorized_keys /home/deploy/.ssh/
chown -R deploy:deploy /home/deploy/.ssh
chmod 700 /home/deploy/.ssh
chmod 600 /home/deploy/.ssh/authorized_keys
```

Redémarrer SSH :

```bash
systemctl restart sshd
```

---

## 💾 Backups

### Script de Backup Automatique

```bash
nano /usr/local/bin/backup-bet.sh
```

```bash
#!/bin/bash

BACKUP_DIR="/var/backups/bet"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# Backup MongoDB
mongodump --out $BACKUP_DIR/mongodb_$DATE

# Backup Redis (optionnel)
redis-cli -a votre-mot-de-passe --rdb $BACKUP_DIR/redis_$DATE.rdb

# Backup des fichiers de configuration
tar -czf $BACKUP_DIR/config_$DATE.tar.gz /var/www/bet/*/.env /etc/nginx/sites-available/

# Supprimer les backups de plus de 7 jours
find $BACKUP_DIR -type d -mtime +7 -exec rm -rf {} \;
find $BACKUP_DIR -type f -mtime +7 -delete

echo "✅ Backup terminé: $DATE"
```

Créer un cron job :

```bash
crontab -e
```

Ajouter :

```
0 2 * * * /usr/local/bin/backup-bet.sh
```

---

## 📈 Scaling

### Quand Upgrader le Serveur

**Signes que vous devez upgrader**:

- CPU usage > 80% en moyenne
- RAM usage > 85% en moyenne
- Disque > 80% utilisé
- Temps de réponse > 1 seconde
- Erreurs 503 fréquentes

### Options de Scaling

1. **Vertical Scaling** (Upgrade du serveur)

   - Augmenter RAM/CPU du serveur actuel
   - Plus simple, mais limite physique

2. **Horizontal Scaling** (Plusieurs serveurs)
   - Load balancer (Nginx, HAProxy)
   - Plusieurs instances backend
   - MongoDB replica set
   - Redis cluster

---

## 💰 Estimation des Coûts

### Option 1 : Hetzner CPX11 (Démarrage)

- Serveur: **€4.15/mois** (~$4.50)
- Domaine: **~$10/an** (~$0.83/mois)
- **Total**: **~$5.33/mois**

### Option 2 : Hetzner CPX21 (Production)

- Serveur: **€8.30/mois** (~$9)
- Domaine: **~$0.83/mois**
- **Total**: **~$9.83/mois**

### Option 3 : DigitalOcean $12 (Production)

- Serveur: **$12/mois**
- Domaine: **~$0.83/mois**
- **Total**: **~$12.83/mois**

---

## ✅ Checklist de Déploiement

### Avant le déploiement

- [ ] Serveur VPS créé
- [ ] OS Ubuntu 22.04 installé
- [ ] Accès SSH configuré
- [ ] Domaine pointé vers l'IP du serveur

### Installation

- [ ] Node.js installé
- [ ] MongoDB installé et configuré
- [ ] Redis installé et configuré
- [ ] Nginx installé
- [ ] PM2 installé
- [ ] Backend déployé et fonctionnel
- [ ] Frontend buildé et servi
- [ ] SSL configuré
- [ ] Firewall configuré
- [ ] Backups configurés

### Après le déploiement

- [ ] Tester l'endpoint `/health`
- [ ] Tester le frontend
- [ ] Vérifier WebSocket (Socket.io)
- [ ] Vérifier les logs
- [ ] Tester sur mobile
- [ ] Monitoring configuré

---

## 🎉 C'est Fait !

Votre application est maintenant déployée sur un VPS ! 🚀

---

## 📚 Ressources

- [Hetzner Cloud](https://www.hetzner.com/cloud)
- [DigitalOcean](https://www.digitalocean.com)
- [PM2 Documentation](https://pm2.keymetrics.io)
- [Nginx Documentation](https://nginx.org/en/docs/)
- [Let's Encrypt](https://letsencrypt.org)

**Bon déploiement ! 🚀**
