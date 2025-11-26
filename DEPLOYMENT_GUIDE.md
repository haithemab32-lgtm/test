# Guide de Déploiement - Application Bet

**Date**: $(date)  
**Version**: 3.0.0

## 📋 Architecture de l'Application

- **Backend**: Node.js/Express avec MongoDB, Redis, Socket.io
- **Frontend**: React/Vite (SPA)
- **Services externes**: API Football, WebSocket temps réel

---

## 🎯 Options de Déploiement Cloud

### Option 1 : **Vercel (Frontend) + Railway/Render (Backend)** ⭐ RECOMMANDÉ

**Avantages**:

- ✅ Gratuit pour commencer
- ✅ Déploiement automatique depuis GitHub
- ✅ SSL/HTTPS inclus
- ✅ CDN global pour le frontend
- ✅ Facile à configurer

**Coûts estimés**:

- Frontend (Vercel): **Gratuit** (jusqu'à 100GB bande passante/mois)
- Backend (Railway): **~$5-20/mois** (selon usage)
- MongoDB Atlas: **Gratuit** (512MB) ou **~$9/mois** (2GB)
- Redis (Upstash): **Gratuit** (10K commandes/jour) ou **~$10/mois**

**Spécifications recommandées**:

- **Backend**: 1 CPU, 512MB-1GB RAM, 10GB storage
- **MongoDB**: M0 (Gratuit) ou M10 (2GB RAM, 10GB storage)
- **Redis**: Free tier ou 256MB-512MB

---

### Option 2 : **DigitalOcean App Platform** ⭐ SIMPLE

**Avantages**:

- ✅ Tout en un (Frontend + Backend)
- ✅ Gestion automatique des services
- ✅ Scaling automatique
- ✅ SSL inclus

**Coûts estimés**: **~$12-25/mois** (tout inclus)

**Spécifications recommandées**:

- **Backend**: Basic Plan (512MB RAM, 1 CPU)
- **Frontend**: Static Site (gratuit ou $5/mois)
- **MongoDB**: Managed Database ($15/mois pour 1GB RAM)
- **Redis**: Managed Database ($15/mois pour 1GB RAM)

---

### Option 3 : **AWS (EC2 + S3 + CloudFront)** 💼 PROFESSIONNEL

**Avantages**:

- ✅ Très scalable
- ✅ Beaucoup de services disponibles
- ✅ Bon pour la production à grande échelle

**Inconvénients**:

- ❌ Configuration plus complexe
- ❌ Coûts peuvent augmenter rapidement

**Coûts estimés**: **~$30-50/mois** (minimum)

**Spécifications recommandées**:

- **EC2**: t3.micro ou t3.small (1-2 vCPU, 1-2GB RAM)
- **S3 + CloudFront**: Pour le frontend statique
- **DocumentDB**: Alternative à MongoDB (~$200/mois)
- **ElastiCache**: Pour Redis (~$15/mois)

---

### Option 4 : **Hetzner Cloud** 💰 ÉCONOMIQUE

**Avantages**:

- ✅ Très bon rapport qualité/prix
- ✅ Serveurs dédiés performants
- ✅ Localisation en Europe

**Inconvénients**:

- ❌ Configuration manuelle nécessaire
- ❌ Pas de services managés (sauf bases de données)

**Coûts estimés**: **~$10-20/mois**

**Spécifications recommandées**:

- **Serveur**: CPX11 (2 vCPU, 4GB RAM, 40GB SSD) - **~€4.15/mois**
- **MongoDB**: Self-hosted ou Atlas
- **Redis**: Self-hosted

---

## 🏆 RECOMMANDATION FINALE

### Pour Démarrage (Budget limité) 💚

**Stack**: Vercel (Frontend) + Railway (Backend) + MongoDB Atlas (Free) + Upstash Redis (Free)

**Coût total**: **~$0-10/mois**

### Pour Production (Recommandé) ⭐

**Stack**: DigitalOcean App Platform ou Hetzner Cloud

**Coût total**: **~$15-30/mois**

---

## 📊 Spécifications Techniques Recommandées

### Backend (Node.js/Express)

**Minimum**:

- CPU: 1 vCPU
- RAM: 512MB
- Storage: 10GB
- Bandwidth: 1TB/mois

**Recommandé**:

- CPU: 2 vCPU
- RAM: 1-2GB
- Storage: 20GB
- Bandwidth: 2TB/mois

**Pour production à grande échelle**:

- CPU: 4 vCPU
- RAM: 4-8GB
- Storage: 50GB+
- Bandwidth: Illimité

### Frontend (React/Vite)

- **Type**: Site statique (SPA)
- **Storage**: 100MB-1GB (fichiers build)
- **CDN**: Recommandé (Vercel, Cloudflare, etc.)
- **Bandwidth**: 100GB-1TB/mois (selon trafic)

### MongoDB

**Minimum**:

- RAM: 512MB
- Storage: 2GB
- Connexions: 100

**Recommandé**:

- RAM: 2GB
- Storage: 10GB
- Connexions: 500

### Redis

**Minimum**:

- RAM: 256MB
- Commandes: 10K/jour

**Recommandé**:

- RAM: 512MB-1GB
- Commandes: 100K+/jour

---

## 🚀 Guide de Déploiement - Option Recommandée (Vercel + Railway)

### Étape 1 : Préparer le Backend

#### 1.1 Créer un fichier `.env.example` dans `bet-backend-v3/`

```env
# Server
PORT=5000
NODE_ENV=production
SERVER_TIMEOUT=120000

# MongoDB (MongoDB Atlas)
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/bet-backend?retryWrites=true&w=majority

# Redis (Upstash)
REDIS_HOST=your-redis-host.upstash.io
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password

# API Football
API_FOOTBALL_KEY=your-api-key
API_FOOTBALL_BASE_URL=https://v3.football.api-sports.io

# CORS (URL de votre frontend)
CORS_ORIGIN=https://votre-site.vercel.app

# Cache TTL (en secondes)
CACHE_TTL_LIVE_MATCHES=30
CACHE_TTL_UPCOMING_MATCHES=300
CACHE_TTL_DAILY_MATCHES=600

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100

# BetSlip
BETSLIP_CODE_LENGTH=6
BETSLIP_EXPIRATION_HOURS=24
```

#### 1.2 Créer un fichier `railway.json` (optionnel) dans `bet-backend-v3/`

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "npm start",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

#### 1.3 Créer un fichier `Procfile` dans `bet-backend-v3/`

```
web: node src/index.js
```

### Étape 2 : Déployer le Backend sur Railway

1. **Créer un compte** sur [railway.app](https://railway.app)
2. **Nouveau projet** → "Deploy from GitHub repo"
3. **Sélectionner** votre repo et le dossier `bet-backend-v3`
4. **Configurer les variables d'environnement** dans Railway:
   - Cliquer sur votre service
   - Onglet "Variables"
   - Ajouter toutes les variables du `.env.example`
5. **Déployer** → Railway va automatiquement détecter Node.js et déployer
6. **Noter l'URL** générée (ex: `https://bet-backend-production.up.railway.app`)

### Étape 3 : Configurer MongoDB Atlas

1. **Créer un compte** sur [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)
2. **Créer un cluster** (choisir Free tier M0)
3. **Créer un utilisateur** (Database Access)
4. **Whitelist votre IP** (Network Access) - ou `0.0.0.0/0` pour Railway
5. **Récupérer la connection string** (Connect → Connect your application)
6. **Mettre à jour** `MONGODB_URI` dans Railway avec votre connection string

### Étape 4 : Configurer Redis (Upstash)

1. **Créer un compte** sur [upstash.com](https://upstash.com)
2. **Créer une base Redis** (choisir Free tier)
3. **Récupérer** `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`
4. **Mettre à jour** les variables dans Railway

### Étape 5 : Préparer le Frontend

#### 5.1 Créer un fichier `vercel.json` dans `bet7-frontend-v2/`

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "devCommand": "npm run dev",
  "installCommand": "npm install",
  "framework": "vite",
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ],
  "headers": [
    {
      "source": "/assets/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    }
  ]
}
```

#### 5.2 Mettre à jour la configuration API dans `bet7-frontend-v2/src/config/api.ts`

```typescript
// Remplacer localhost par l'URL de votre backend Railway
export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  "https://bet-backend-production.up.railway.app";
```

#### 5.3 Créer un fichier `.env.production` dans `bet7-frontend-v2/`

```env
VITE_API_BASE_URL=https://bet-backend-production.up.railway.app
```

### Étape 6 : Déployer le Frontend sur Vercel

1. **Créer un compte** sur [vercel.com](https://vercel.com)
2. **Nouveau projet** → "Import Git Repository"
3. **Sélectionner** votre repo et le dossier `bet7-frontend-v2`
4. **Configurer**:
   - Framework Preset: Vite
   - Root Directory: `bet7-frontend-v2`
   - Build Command: `npm run build`
   - Output Directory: `dist`
5. **Variables d'environnement**:
   - `VITE_API_BASE_URL`: URL de votre backend Railway
6. **Déployer** → Vercel va automatiquement builder et déployer
7. **Noter l'URL** générée (ex: `https://bet-frontend.vercel.app`)

### Étape 7 : Mettre à jour CORS dans le Backend

Dans Railway, mettre à jour la variable d'environnement:

```
CORS_ORIGIN=https://bet-frontend.vercel.app
```

Redéployer le backend pour appliquer les changements.

---

## 🔧 Configuration Alternative : DigitalOcean App Platform

### Backend

1. **Créer une App** sur DigitalOcean
2. **Source**: GitHub repo → `bet-backend-v3`
3. **Type**: Web Service
4. **Build Command**: `npm install`
5. **Run Command**: `npm start`
6. **Plan**: Basic ($5/mois) ou Professional ($12/mois)
7. **Variables d'environnement**: Ajouter toutes les variables du `.env`

### Frontend

1. **Ajouter un composant** Static Site
2. **Source**: GitHub repo → `bet7-frontend-v2`
3. **Build Command**: `npm run build`
4. **Output Directory**: `dist`
5. **Plan**: Starter (gratuit) ou Basic ($5/mois)

### Bases de données

1. **MongoDB**: Créer une Managed Database (MongoDB) - $15/mois
2. **Redis**: Créer une Managed Database (Redis) - $15/mois

---

## 🔧 Configuration Alternative : Hetzner Cloud (Self-hosted)

### Étape 1 : Créer un serveur

1. **Créer un compte** sur [hetzner.com](https://www.hetzner.com)
2. **Créer un Cloud Server**:
   - Type: CPX11 (2 vCPU, 4GB RAM, 40GB SSD) - €4.15/mois
   - OS: Ubuntu 22.04
   - Localisation: Europe (Frankfurt ou Nuremberg)

### Étape 2 : Installer les dépendances

```bash
# Se connecter au serveur
ssh root@votre-ip

# Mettre à jour le système
apt update && apt upgrade -y

# Installer Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# Installer PM2 (process manager)
npm install -g pm2

# Installer Nginx
apt install -y nginx

# Installer MongoDB (optionnel, ou utiliser Atlas)
# apt install -y mongodb

# Installer Redis
apt install -y redis-server
```

### Étape 3 : Déployer le Backend

```bash
# Cloner le repo
cd /var/www
git clone https://github.com/votre-username/bet.git
cd bet/bet-backend-v3

# Installer les dépendances
npm install --production

# Créer le fichier .env
nano .env
# Copier toutes les variables d'environnement

# Démarrer avec PM2
pm2 start src/index.js --name bet-backend
pm2 save
pm2 startup
```

### Étape 4 : Configurer Nginx pour le Backend

```bash
nano /etc/nginx/sites-available/bet-backend
```

```nginx
server {
    listen 80;
    server_name api.votre-domaine.com;

    location / {
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
}
```

```bash
ln -s /etc/nginx/sites-available/bet-backend /etc/nginx/sites-enabled/
nginx -t
systemctl reload nginx
```

### Étape 5 : Déployer le Frontend

```bash
cd /var/www/bet/bet7-frontend-v2

# Installer les dépendances
npm install

# Builder
npm run build

# Configurer Nginx pour servir les fichiers statiques
nano /etc/nginx/sites-available/bet-frontend
```

```nginx
server {
    listen 80;
    server_name votre-domaine.com www.votre-domaine.com;
    root /var/www/bet/bet7-frontend-v2/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
ln -s /etc/nginx/sites-available/bet-frontend /etc/nginx/sites-enabled/
nginx -t
systemctl reload nginx
```

### Étape 6 : Configurer SSL avec Let's Encrypt

```bash
apt install -y certbot python3-certbot-nginx
certbot --nginx -d votre-domaine.com -d www.votre-domaine.com
certbot --nginx -d api.votre-domaine.com
```

---

## 📝 Checklist de Déploiement

### Avant le déploiement

- [ ] Tous les fichiers `.env` sont configurés
- [ ] Les variables d'environnement sont définies
- [ ] MongoDB Atlas est configuré et accessible
- [ ] Redis est configuré et accessible
- [ ] L'API Football key est valide
- [ ] Le frontend pointe vers la bonne URL backend
- [ ] CORS est configuré avec l'URL du frontend

### Après le déploiement

- [ ] Tester l'endpoint `/health` du backend
- [ ] Tester l'accès au frontend
- [ ] Vérifier la connexion MongoDB
- [ ] Vérifier la connexion Redis
- [ ] Tester les WebSockets (Socket.io)
- [ ] Vérifier les logs d'erreur
- [ ] Tester le rate limiting
- [ ] Vérifier que HTTPS fonctionne
- [ ] Tester sur mobile

---

## 🔍 Monitoring et Maintenance

### Outils recommandés

1. **Uptime Monitoring**: UptimeRobot (gratuit) ou Pingdom
2. **Error Tracking**: Sentry (gratuit jusqu'à 5K événements/mois)
3. **Logs**: Utiliser les logs intégrés de Railway/Vercel/DigitalOcean
4. **Analytics**: Google Analytics ou Plausible

### Commandes utiles (si self-hosted)

```bash
# Voir les logs du backend
pm2 logs bet-backend

# Redémarrer le backend
pm2 restart bet-backend

# Voir l'utilisation des ressources
pm2 monit

# Vérifier Nginx
nginx -t
systemctl status nginx

# Vérifier Redis
redis-cli ping

# Vérifier MongoDB
mongosh --eval "db.adminCommand('ping')"
```

---

## 💰 Estimation des Coûts Mensuels

### Option 1 : Vercel + Railway (Démarrage)

- Frontend (Vercel): **Gratuit**
- Backend (Railway): **$5-10**
- MongoDB Atlas (Free): **Gratuit**
- Redis (Upstash Free): **Gratuit**
- **Total**: **~$5-10/mois**

### Option 2 : DigitalOcean App Platform

- Backend: **$12**
- Frontend: **$5**
- MongoDB: **$15**
- Redis: **$15**
- **Total**: **~$47/mois**

### Option 3 : Hetzner Cloud (Self-hosted)

- Serveur: **€4.15 (~$4.50)**
- MongoDB Atlas: **Gratuit** ou **$9**
- Domaine: **~$10/an (~$0.83/mois)**
- **Total**: **~$5-15/mois**

---

## 🎯 Recommandation Finale

**Pour commencer rapidement**: Vercel + Railway + MongoDB Atlas (Free) + Upstash Redis (Free)

- **Coût**: ~$5-10/mois
- **Temps de setup**: 1-2 heures
- **Scalabilité**: Facile à upgrader

**Pour production sérieuse**: DigitalOcean App Platform ou Hetzner Cloud

- **Coût**: ~$15-50/mois
- **Temps de setup**: 2-4 heures
- **Scalabilité**: Excellente

---

## 📚 Ressources

- [Railway Documentation](https://docs.railway.app)
- [Vercel Documentation](https://vercel.com/docs)
- [DigitalOcean App Platform](https://www.digitalocean.com/products/app-platform)
- [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
- [Upstash Redis](https://upstash.com)
- [Hetzner Cloud](https://www.hetzner.com/cloud)

---

**Bon déploiement ! 🚀**
