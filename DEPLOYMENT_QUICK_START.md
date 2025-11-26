# 🚀 Guide de Déploiement Rapide

## Option Recommandée : Vercel (Frontend) + Railway (Backend)

### ⏱️ Temps estimé : 30-45 minutes

---

## 📋 Prérequis

- [ ] Compte GitHub (avec votre code pushé)
- [ ] Compte Vercel (gratuit)
- [ ] Compte Railway (gratuit avec $5 de crédit)
- [ ] Compte MongoDB Atlas (gratuit)
- [ ] Compte Upstash (gratuit pour Redis)

---

## 🔧 Étape 1 : Configurer MongoDB Atlas (5 min)

1. Aller sur [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)
2. Créer un compte gratuit
3. Créer un cluster (choisir **FREE M0**)
4. Créer un utilisateur de base de données :
   - Database Access → Add New Database User
   - Username/Password (noter les identifiants)
5. Whitelist votre IP :
   - Network Access → Add IP Address
   - Cliquer sur "Allow Access from Anywhere" (0.0.0.0/0) pour Railway
6. Récupérer la connection string :
   - Database → Connect → Connect your application
   - Copier la string (remplacer `<password>` par votre mot de passe)

---

## 🔧 Étape 2 : Configurer Redis (Upstash) (3 min)

1. Aller sur [upstash.com](https://upstash.com)
2. Créer un compte gratuit
3. Créer une base Redis :
   - Create Database → Redis
   - Choisir **Free tier**
   - Région : choisir la plus proche
4. Récupérer les credentials :
   - `REDIS_HOST` (ex: `your-redis.upstash.io`)
   - `REDIS_PORT` (généralement `6379`)
   - `REDIS_PASSWORD` (token généré)

---

## 🔧 Étape 3 : Déployer le Backend sur Railway (10 min)

1. Aller sur [railway.app](https://railway.app)
2. Se connecter avec GitHub
3. Cliquer sur **"New Project"**
4. Sélectionner **"Deploy from GitHub repo"**
5. Choisir votre repository et le dossier **`bet-backend-v3`**
6. Railway va automatiquement détecter Node.js et commencer le build

### Configurer les variables d'environnement :

1. Cliquer sur votre service déployé
2. Onglet **"Variables"**
3. Ajouter toutes ces variables :

```env
PORT=5000
NODE_ENV=production
SERVER_TIMEOUT=120000

# MongoDB (remplacer par votre connection string)
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/bet-backend?retryWrites=true&w=majority

# Redis (remplacer par vos credentials Upstash)
REDIS_HOST=votre-redis.upstash.io
REDIS_PORT=6379
REDIS_PASSWORD=votre-password-upstash

# API Football (votre clé API)
API_FOOTBALL_KEY=votre-cle-api-football
API_FOOTBALL_BASE_URL=https://v3.football.api-sports.io
API_FOOTBALL_RATE_LIMIT=10

# CORS (on mettra l'URL du frontend après)
CORS_ORIGIN=https://votre-site.vercel.app

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

4. Railway va redéployer automatiquement
5. **Noter l'URL générée** (ex: `https://bet-backend-production.up.railway.app`)

### Tester le backend :

```bash
curl https://votre-backend.railway.app/health
```

Vous devriez voir : `{"status":"ok",...}`

---

## 🔧 Étape 4 : Déployer le Frontend sur Vercel (10 min)

1. Aller sur [vercel.com](https://vercel.com)
2. Se connecter avec GitHub
3. Cliquer sur **"Add New Project"**
4. Importer votre repository
5. Configurer le projet :
   - **Framework Preset** : Vite
   - **Root Directory** : `bet7-frontend-v2`
   - **Build Command** : `npm run build` (auto-détecté)
   - **Output Directory** : `dist` (auto-détecté)

### Configurer les variables d'environnement :

1. Dans les settings du projet Vercel
2. Onglet **"Environment Variables"**
3. Ajouter :

```env
VITE_API_URL=https://votre-backend.railway.app
VITE_SOCKET_URL=https://votre-backend.railway.app
```

(Remplacez par l'URL de votre backend Railway)

4. Cliquer sur **"Deploy"**
5. **Noter l'URL générée** (ex: `https://bet-frontend.vercel.app`)

---

## 🔧 Étape 5 : Mettre à jour CORS (2 min)

1. Retourner sur Railway
2. Mettre à jour la variable `CORS_ORIGIN` avec l'URL de votre frontend Vercel :

```env
CORS_ORIGIN=https://bet-frontend.vercel.app
```

3. Railway va redéployer automatiquement

---

## ✅ Vérification Finale

1. **Tester le frontend** : Ouvrir `https://votre-site.vercel.app`
2. **Tester le backend** : `https://votre-backend.railway.app/health`
3. **Vérifier les logs** :
   - Railway : Onglet "Deployments" → Voir les logs
   - Vercel : Onglet "Deployments" → Voir les logs

---

## 🐛 Problèmes Courants

### Le frontend ne peut pas se connecter au backend

- ✅ Vérifier que `CORS_ORIGIN` dans Railway contient l'URL exacte du frontend
- ✅ Vérifier que `VITE_API_URL` dans Vercel contient l'URL exacte du backend
- ✅ Vérifier que les deux URLs utilisent HTTPS

### Erreur de connexion MongoDB

- ✅ Vérifier que l'IP `0.0.0.0/0` est whitelistée dans MongoDB Atlas
- ✅ Vérifier que le mot de passe dans `MONGODB_URI` est correct
- ✅ Vérifier que le cluster MongoDB est bien démarré

### Erreur de connexion Redis

- ✅ Vérifier que `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD` sont corrects
- ✅ Vérifier que la base Redis Upstash est active

### Le build échoue

- ✅ Vérifier les logs dans Railway/Vercel
- ✅ Vérifier que toutes les dépendances sont dans `package.json`
- ✅ Vérifier que Node.js version est compatible (20.x)

---

## 📊 Coûts

- **Vercel** : Gratuit (jusqu'à 100GB bande passante/mois)
- **Railway** : $5/mois (avec $5 de crédit gratuit au début)
- **MongoDB Atlas** : Gratuit (M0 - 512MB)
- **Upstash Redis** : Gratuit (10K commandes/jour)

**Total : ~$5/mois** (après les crédits gratuits)

---

## 🎉 C'est fait !

Votre application est maintenant en ligne ! 🚀

---

## 📚 Prochaines Étapes (Optionnel)

1. **Configurer un domaine personnalisé** :

   - Vercel : Settings → Domains
   - Railway : Settings → Custom Domain

2. **Activer le monitoring** :

   - Sentry pour les erreurs (gratuit)
   - UptimeRobot pour la disponibilité (gratuit)

3. **Optimiser les performances** :
   - Activer le cache CDN sur Vercel
   - Configurer les headers de cache

---

**Besoin d'aide ?** Consultez le guide complet dans `DEPLOYMENT_GUIDE.md`
