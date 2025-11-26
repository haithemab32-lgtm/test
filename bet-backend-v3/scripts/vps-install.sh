#!/bin/bash

# Script d'installation automatique pour VPS
# Usage: bash vps-install.sh

set -e

echo "🚀 Installation de l'application Bet sur VPS"
echo "============================================"

# Couleurs pour les messages
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Fonction pour afficher les messages
info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Vérifier que le script est exécuté en root
if [ "$EUID" -ne 0 ]; then 
    error "Ce script doit être exécuté en tant que root (utilisez sudo)"
    exit 1
fi

info "Mise à jour du système..."
apt update && apt upgrade -y
apt install -y curl wget git build-essential

# Étape 1: Installer Node.js
info "Installation de Node.js 20.x..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

if command -v node &> /dev/null; then
    info "Node.js installé: $(node --version)"
    info "npm installé: $(npm --version)"
else
    error "Échec de l'installation de Node.js"
    exit 1
fi

# Étape 2: Installer MongoDB
read -p "Voulez-vous installer MongoDB localement? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    info "Installation de MongoDB..."
    curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor
    echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | tee /etc/apt/sources.list.d/mongodb-org-7.0.list
    apt update
    apt install -y mongodb-org
    systemctl start mongod
    systemctl enable mongod
    info "MongoDB installé et démarré"
    warn "N'oubliez pas de configurer l'authentification MongoDB!"
else
    info "MongoDB ignoré. Assurez-vous d'utiliser MongoDB Atlas ou un autre service."
fi

# Étape 3: Installer Redis
info "Installation de Redis..."
apt install -y redis-server
systemctl start redis-server
systemctl enable redis-server
info "Redis installé et démarré"
warn "N'oubliez pas de configurer un mot de passe Redis dans /etc/redis/redis.conf!"

# Étape 4: Installer Nginx
info "Installation de Nginx..."
apt install -y nginx
systemctl start nginx
systemctl enable nginx
info "Nginx installé et démarré"

# Étape 5: Installer PM2
info "Installation de PM2..."
npm install -g pm2
info "PM2 installé: $(pm2 --version)"

# Étape 6: Installer Certbot
info "Installation de Certbot..."
apt install -y certbot python3-certbot-nginx
info "Certbot installé"

# Étape 7: Installer UFW
info "Installation de UFW..."
apt install -y ufw
info "UFW installé"
warn "N'oubliez pas de configurer le firewall avec: ufw allow 22/tcp && ufw allow 80/tcp && ufw allow 443/tcp"

# Résumé
echo ""
echo "============================================"
info "Installation terminée!"
echo "============================================"
echo ""
echo "📋 Prochaines étapes:"
echo ""
echo "1. Cloner votre repository:"
echo "   cd /var/www"
echo "   git clone https://github.com/votre-username/bet.git"
echo ""
echo "2. Configurer MongoDB (si installé localement):"
echo "   mongosh"
echo "   use admin"
echo "   db.createUser({user: 'betadmin', pwd: 'mot-de-passe', roles: ['userAdminAnyDatabase', 'readWriteAnyDatabase']})"
echo ""
echo "3. Configurer Redis:"
echo "   nano /etc/redis/redis.conf"
echo "   Ajouter: requirepass votre-mot-de-passe"
echo "   systemctl restart redis-server"
echo ""
echo "4. Configurer le backend:"
echo "   cd /var/www/bet/bet-backend-v3"
echo "   cp .env.example .env"
echo "   nano .env  # Éditer avec vos configurations"
echo "   npm install --production"
echo "   pm2 start src/index.js --name bet-backend"
echo "   pm2 save"
echo ""
echo "5. Configurer Nginx (voir VPS_DEPLOYMENT_GUIDE.md)"
echo ""
echo "6. Configurer SSL:"
echo "   certbot --nginx -d votre-domaine.com"
echo ""
echo "7. Configurer le firewall:"
echo "   ufw allow 22/tcp"
echo "   ufw allow 80/tcp"
echo "   ufw allow 443/tcp"
echo "   ufw enable"
echo ""
echo "📚 Consultez VPS_DEPLOYMENT_GUIDE.md pour les détails complets"
echo ""

