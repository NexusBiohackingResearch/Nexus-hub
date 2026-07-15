# NEXUS — Mise en ligne sur Railway (guide pas à pas)

Ce guide te fait passer de « site vitrine » à « boutique complète » : panier, comptes, commandes crypto, emails automatiques et espace admin.

---

## 0. Ce que contient cette mise à jour

Nouveaux fichiers :

```
server/            → le "cerveau" (Node + Express + PostgreSQL)
  index.js, db.js, auth.js, orders.js, admin.js, email.js
css/store.css      → styles panier / comptes / checkout / admin
js/store.js        → panier + comptes côté navigateur
checkout.html      → tunnel de commande
compte.html        → espace client + historique
admin.html         → TON espace admin privé
package.json       → dépendances
.env.example       → modèle de configuration
.gitignore
```

Fichiers modifiés : `index.html`, `js/app.js` (ajout du bouton « Ajouter au panier »).

Tout le reste (logo, vidéo, fioles, descriptions) est **inchangé**.

---

## 1. Mettre à jour ton dépôt GitHub

1. Décompresse le ZIP **par-dessus** ton dossier `Nexus-hub` (accepte les remplacements).
2. Ne supprime pas ton dossier `.git` ni ton dossier `assets/`.
3. Dans GitHub Desktop : **Commit to main** → **Push origin**.

---

## 2. Créer le projet sur Railway

1. Va sur **railway.app** → connecte-toi avec GitHub.
2. **New Project** → **Deploy from GitHub repo** → choisis `Nexus-hub`.
3. Railway détecte Node tout seul et lance `npm start`. Laisse faire.

## 3. Ajouter la base de données

1. Dans ton projet Railway : **New** → **Database** → **Add PostgreSQL**.
2. C'est tout : Railway crée la variable `DATABASE_URL` et la relie au serveur automatiquement. Les tables se créent seules au premier démarrage.

## 4. Configurer les variables

Dans ton service (pas la base) → onglet **Variables** → ajoute :

| Variable | Valeur |
|---|---|
| `JWT_SECRET` | une longue chaîne aléatoire (ex. via `openssl rand -hex 32`) |
| `NODE_ENV` | `production` |
| `ADMIN_EMAIL` | `yazid.amri.31@gmail.com` (ton futur compte admin) |
| `CRYPTO_BTC` | ton adresse Bitcoin de réception |
| `CRYPTO_USDT` | ton adresse USDT (TRC20) — optionnel |
| `SITE_URL` | l'URL publique du site (voir étape 6) |
| `RESEND_API_KEY` | ta clé Resend (étape 5) |
| `EMAIL_FROM` | `NEXUS <commandes@ton-domaine>` |

> Sans `RESEND_API_KEY`, tout fonctionne mais les emails s'affichent seulement dans les logs (mode démo). Tu peux l'ajouter plus tard.

## 5. Activer les emails (Resend)

1. Crée un compte gratuit sur **resend.com**.
2. **Add Domain** → `nexus-biohacking.com` → ajoute les enregistrements DNS indiqués chez ton hébergeur de domaine (ça authentifie tes envois).
3. **API Keys** → **Create** → copie la clé (commence par `re_...`) dans `RESEND_API_KEY` sur Railway.
4. Tant que le domaine n'est pas vérifié, tu peux tester avec l'expéditeur par défaut `onboarding@resend.dev`.

## 6. Ton domaine

- Railway te donne une URL du type `nexus-hub-production.up.railway.app`.
- Onglet **Settings → Networking → Generate Domain** pour l'obtenir, ou **Custom Domain** pour brancher `nexus-biohacking.com`.
- Reporte cette URL dans la variable `SITE_URL`.

## 7. Te donner les droits admin

1. Une fois le site en ligne, va sur `TON-URL/index.html`.
2. Clique **Compte** → **Créer un compte** avec l'email exact de `ADMIN_EMAIL`.
3. Tu es automatiquement admin. Accède à ton tableau de bord sur `TON-URL/admin.html`.

---

## Le parcours, une fois en ligne

1. Le client remplit son panier → **Passer la commande**.
2. Il valide (compte ou invité) → **email auto « commande reçue »** + instructions crypto + sa référence `NX-XXXXXX`.
3. Toi, sur `admin.html`, tu vois la commande « En attente de paiement ».
4. Tu reçois la crypto → clic **« ✓ Paiement reçu »** → **email auto « paiement confirmé »** au client.
5. Tu envoies le colis → clic **« 📦 Marquer expédiée »** (+ n° de suivi) → **email auto « expédiée »**.

---

## Ajouter la carte / le virement plus tard

Le checkout est déjà prévu pour : l'option « Carte / Virement » est grisée. Le jour venu, on ajoute la méthode dans `checkout.html` (bouton) et une route de paiement côté serveur. Rien à refaire.

## Questions fréquentes

- **Les données sont-elles conservées ?** Oui, elles sont dans PostgreSQL (Railway), pas dans le code. Un redéploiement ne les efface pas.
- **Coût ?** Railway offre un crédit gratuit mensuel qui suffit largement pour démarrer ; au-delà, facturation à l'usage (quelques € /mois).
- **GitHub Pages ?** On ne l'utilise plus : un site avec panier/comptes a besoin d'un serveur, et c'est Railway qui l'héberge.
