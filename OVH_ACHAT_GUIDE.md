# 🛒 Guide d'Achat OVH - Étape par Étape

**Pour**: Application Bet (Frontend + Backend)  
**Capacité**: 1,000-10,000 utilisateurs/jour

---

## 📦 CE QUE VOUS DEVEZ ACHETER

### Option 1 : Pour 1,000-5,000 utilisateurs/jour (Recommandé pour démarrer)

**Serveur OVH**: **B2-15**

- **Prix**: **€9.99/mois**
- **CPU**: 2 vCPU
- **RAM**: 15GB
- **Storage**: 50GB SSD
- **Bande passante**: 250Mbps

### Option 2 : Pour 5,000-10,000 utilisateurs/jour

**Serveur OVH**: **B2-30**

- **Prix**: **€19.99/mois**
- **CPU**: 4 vCPU
- **RAM**: 30GB
- **Storage**: 100GB SSD
- **Bande passante**: 250Mbps

**Recommandation**: Commencez avec **B2-15** (€9.99/mois), vous pourrez upgrader facilement plus tard.

---

## 🚀 ÉTAPES D'ACHAT DÉTAILLÉES

### ÉTAPE 1 : Créer un Compte OVH

1. **Aller sur** [ovh.com](https://www.ovh.com)
2. **Cliquer** sur **"Mon compte"** (en haut à droite)
3. **Cliquer** sur **"Créer un compte"**
4. **Remplir le formulaire** :
   - Email
   - Mot de passe (fort)
   - Nom
   - Prénom
   - Téléphone
   - Adresse complète
5. **Valider** le formulaire
6. **Vérifier votre email** (cliquer sur le lien reçu)
7. **Vérifier votre téléphone** (code SMS)

✅ **Compte créé !**

---

### ÉTAPE 2 : Accéder au Manager OVH

1. **Se connecter** sur [ovh.com/manager](https://www.ovh.com/manager)
2. **Compléter votre profil** si demandé (informations de facturation)

---

### ÉTAPE 3 : Commander le Serveur VPS

1. Dans le **Manager OVH**, cliquer sur **"Cloud"** dans le menu de gauche
2. Cliquer sur **"Serveurs"** → **"VPS"**
3. Cliquer sur **"Commander un VPS"** (bouton bleu)

---

### ÉTAPE 4 : Choisir la Configuration

#### 4.1 Choisir la Gamme

**Sélectionner**: **VPS Value** ou **VPS Elite**

**Pour votre cas (1,000-10,000 utilisateurs)**:

- ✅ **VPS Value** suffit largement
- ✅ Meilleur rapport qualité/prix

#### 4.2 Choisir le Modèle

**Pour 1,000-5,000 utilisateurs**:

- ✅ **B2-15** - **€9.99/mois**
  - 2 vCPU
  - 15GB RAM
  - 50GB SSD
  - 250Mbps

**Pour 5,000-10,000 utilisateurs**:

- ✅ **B2-30** - **€19.99/mois**
  - 4 vCPU
  - 30GB RAM
  - 100GB SSD
  - 250Mbps

**Recommandation**: Choisir **B2-15** pour commencer.

#### 4.3 Choisir la Localisation

**Options disponibles**:

- 🇫🇷 **Gravelines** (France) - Recommandé si utilisateurs en Europe
- 🇫🇷 **Roubaix** (France)
- 🇩🇪 **Frankfurt** (Allemagne) - Recommandé pour l'Europe centrale

**Recommandation**: **Gravelines** ou **Frankfurt**

#### 4.4 Choisir l'OS

**Sélectionner**: **Ubuntu 22.04 LTS**

- ✅ Version LTS (Long Term Support)
- ✅ Support jusqu'en 2027
- ✅ Stable et bien documenté

#### 4.5 Durée d'Engagement

**Options**:

- **1 mois** (facturation mensuelle) - **Recommandé pour tester**
- **12 mois** (réduction possible)

**Recommandation**: Commencer avec **1 mois** pour tester.

#### 4.6 Options Supplémentaires

**Backup automatique**:

- ❌ **Non nécessaire** pour démarrer
- ✅ Vous pouvez l'ajouter plus tard si besoin

**IP Failover**:

- ❌ **Non nécessaire** pour démarrer

**Snapshots**:

- ❌ **Non nécessaire** pour démarrer

**Laisser toutes les options désactivées** pour économiser.

---

### ÉTAPE 5 : Vérifier et Commander

1. **Vérifier le récapitulatif** :

   - Modèle: B2-15 (ou B2-30)
   - Localisation: Gravelines (ou autre)
   - OS: Ubuntu 22.04
   - Prix: €9.99/mois (ou €19.99/mois)

2. **Accepter les conditions générales** (cocher la case)

3. **Cliquer** sur **"Commander"** ou **"Valider"**

---

### ÉTAPE 6 : Payer

1. **Choisir le mode de paiement** :

   - 💳 **Carte bancaire** (recommandé)
   - 💰 **PayPal**
   - 🏦 **Virement bancaire** (plus long)

2. **Remplir les informations de paiement**

3. **Valider le paiement**

4. **Attendre la confirmation** (quelques minutes)

---

### ÉTAPE 7 : Récupérer les Informations

Après la commande (5-15 minutes), vous recevrez :

#### Email de Confirmation OVH

L'email contiendra :

- ✅ **IP du serveur**: `xxx.xxx.xxx.xxx`
- ✅ **Mot de passe root**: (généré automatiquement)
- ✅ **Lien vers le Manager OVH**

**⚠️ IMPORTANT**:

- **Sauvegardez ces informations** dans un endroit sûr !
- Le mot de passe root est **unique** et ne sera plus affiché

#### Dans le Manager OVH

1. Aller dans **"Cloud"** → **"Serveurs"** → **"VPS"**
2. Cliquer sur votre serveur (nommé automatiquement)
3. Vous verrez :
   - **IP publique**: `xxx.xxx.xxx.xxx`
   - **Statut**: "Actif"
   - **OS**: Ubuntu 22.04
   - **Mot de passe root**: (cliquer sur "Afficher" pour le voir)

---

## 🔐 PREMIÈRE CONNEXION

### Se Connecter au Serveur

```bash
ssh root@votre-ip-ovh
```

**Exemple**:

```bash
ssh root@51.xxx.xxx.xxx
```

**Première connexion**:

1. Entrer le mot de passe root (reçu par email)
2. Vous devrez **changer le mot de passe** (sécurité)
3. Entrer le nouveau mot de passe (2 fois)

✅ **Vous êtes connecté !**

---

## 📋 RÉCAPITULATIF DE L'ACHAT

### Ce Que Vous Avez Acheté

| Élément            | Détails                     |
| ------------------ | --------------------------- |
| **Serveur**        | OVH VPS B2-15 (ou B2-30)    |
| **Prix**           | €9.99/mois (ou €19.99/mois) |
| **CPU**            | 2-4 vCPU                    |
| **RAM**            | 15-30GB                     |
| **Storage**        | 50-100GB SSD                |
| **Bande passante** | 250Mbps                     |
| **OS**             | Ubuntu 22.04 LTS            |
| **Localisation**   | Gravelines/Frankfurt        |

### Informations Importantes

- ✅ **IP du serveur**: `xxx.xxx.xxx.xxx`
- ✅ **Mot de passe root**: (sauvegardé)
- ✅ **Accès Manager**: [ovh.com/manager](https://www.ovh.com/manager)

---

## 🎯 PROCHAINES ÉTAPES

Maintenant que vous avez acheté le serveur :

1. ✅ **Suivre le guide de déploiement**: `OVH_DEPLOYMENT_GUIDE.md`
2. ✅ **Installer les dépendances** (Node.js, MongoDB, Redis, etc.)
3. ✅ **Déployer le backend**
4. ✅ **Déployer le frontend**
5. ✅ **Configurer SSL/HTTPS**

---

## 💡 CONSEILS

### Budget

- **Minimum**: €9.99/mois (B2-15)
- **Recommandé**: €9.99/mois (B2-15) pour démarrer
- **Comfortable**: €19.99/mois (B2-30) si trafic élevé

### Scaling

- Vous pouvez **upgrader** votre serveur à tout moment dans le Manager OVH
- Pas besoin de recréer le serveur
- Les données sont conservées

### Support OVH

- 📧 **Email**: support@ovh.com
- 💬 **Chat**: Disponible dans le Manager
- 📚 **Documentation**: [docs.ovh.com](https://docs.ovh.com)

---

## ❓ QUESTIONS FRÉQUENTES

### Puis-je changer de plan plus tard ?

✅ **Oui !** Vous pouvez upgrader ou downgrader à tout moment dans le Manager OVH.

### Puis-je annuler ?

✅ **Oui !** Vous pouvez résilier à tout moment. Facturation au prorata.

### Les données sont-elles sauvegardées ?

⚠️ **Non par défaut**. Configurez des backups (voir guide de déploiement).

### Puis-je avoir plusieurs IP ?

✅ **Oui !** Vous pouvez commander des IP Failover dans le Manager.

---

## ✅ CHECKLIST D'ACHAT

- [ ] Compte OVH créé
- [ ] Email vérifié
- [ ] Téléphone vérifié
- [ ] Serveur B2-15 (ou B2-30) commandé
- [ ] Paiement effectué
- [ ] Email de confirmation reçu
- [ ] IP du serveur notée
- [ ] Mot de passe root noté
- [ ] Première connexion réussie

---

## 🎉 FÉLICITATIONS !

Vous avez acheté votre serveur OVH ! 🚀

**Prochaine étape**: Suivre le guide `OVH_DEPLOYMENT_GUIDE.md` pour déployer votre application.

**Besoin d'aide ?** Consultez la documentation OVH ou le guide de déploiement complet.
