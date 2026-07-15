# NEXUS — Mise à jour BTCPay + Google Sheets + Codes promo

Cette mise à jour branche le **paiement Bitcoin automatique (BTCPay)**, l'**export des commandes dans ton Google Sheet** (le même que le bot) et reprend tes **codes promo + frais de port**.

## Nouveaux fichiers

```
server/btcpay.js     → création de facture + vérification du webhook
server/sheets.js     → écriture dans "Commande NEXUS" (colonnes A→S)
server/promo.js      → codes promo + frais de port (12€ / gratuit dès 150€)
server/rate.js       → cours BTC/EUR en direct (CoinGecko)
server/webhook.js    → reçoit le "payé" de BTCPay → email + Sheet auto
merci.html           → page de retour après paiement
data/promo.json      → TES codes promo (à remplir)
```

Fichiers mis à jour : `server/db.js`, `server/orders.js`, `server/index.js`, `server/admin.js`, `checkout.html`, `package.json`.

## 1. Variables à ajouter sur Railway

Dans ton service → onglet **Variables** :

| Variable | Valeur |
|---|---|
| `BTCPAY_URL` | l'URL de ton BTCPay (ex. `https://btcpay.mondomaine.com`) |
| `BTCPAY_STORE_ID` | l'ID du Store BTCPay |
| `BTCPAY_API_KEY` | une clé API Greenfield (droits *create invoice* + *view invoices*) |
| `BTCPAY_WEBHOOK_SECRET` | le secret affiché à la création du webhook (étape 3) |
| `GOOGLE_CREDENTIALS` | le **même JSON** de compte de service que dans ton bot |
| `SPREADSHEET_ID` | `1pGnRnnQEmpnuwJiB6mkbFHaEmhh4wPFhCd4wtehAmKc` |
| `SHEET_NAME` | `Commande NEXUS` |
| `FRAIS_PORT` | `12` |
| `SEUIL_GRATUIT` | `150` |
| `SITE_URL` | l'URL publique du site (pour le retour de paiement) |

## 2. BTCPay — créer la clé API

Dans ton BTCPay : **Account → Manage Account → API Keys → Generate Key**.
Coche au minimum :
- `btcpay.store.cancreateinvoice`
- `btcpay.store.canviewinvoices`

Colle la clé dans `BTCPAY_API_KEY`. L'ID du store se trouve dans **Store Settings** (dans l'URL : `/stores/XXXXXXXX/…`).

## 3. BTCPay — créer le webhook

Dans ton Store BTCPay : **Settings → Webhooks → Create Webhook**.
- **Payload URL** : `https://TON-SITE/api/btcpay/webhook`
- **Events** : « An invoice is settled » (et « processing » si tu veux confirmer dès réception, avant confirmations réseau).
- Enregistre, puis copie le **secret** affiché → variable `BTCPAY_WEBHOOK_SECRET`.

C'est ce webhook qui fait passer la commande en « payé » automatiquement (email au client + Sheet mis à jour), **sans clic de ta part**.

## 4. Google Sheets

Rien de neuf à créer : on réutilise ton compte de service existant.
1. Copie la valeur `GOOGLE_CREDENTIALS` de ton bot (le JSON) dans les variables du site.
2. Vérifie que la feuille « Commande NEXUS » est bien partagée avec l'email du compte de service (`…@…iam.gserviceaccount.com`) — c'est déjà le cas pour le bot.

Résultat : **bot et site écrivent dans la même feuille, mêmes colonnes A→S.** Le statut passe à « Payé » + la date se remplit automatiquement au paiement.

## 5. Codes promo

Ouvre `data/promo.json` et remplis tes codes :

```json
[
  { "code": "VIP20", "influenceur": "Nom", "reduction": 20, "actif": true },
  { "code": "PROMO10", "influenceur": "Autre", "reduction": 10, "actif": true }
]
```

- `reduction` = pourcentage. `actif: false` désactive un code sans le supprimer.
- Modifiable à tout moment (commit + push, Railway redéploie tout seul).

## Le parcours final

1. Le client remplit son panier + un éventuel code promo → **Payer en Bitcoin**.
2. Une **facture BTCPay** est créée → il est redirigé vers la page de paiement (adresse + QR, montant BTC exact au cours du moment).
3. La commande apparaît **dans ton Google Sheet** (statut « En attente ») + email « commande reçue » au client.
4. Il paie → BTCPay prévient le site → statut **« Payé »** automatique : email de confirmation au client + Sheet mis à jour. **Aucune action de ta part.**
5. Tu envoies le colis → depuis `admin.html`, clic **« Expédiée »** (+ suivi) → email + Sheet.

> Si BTCPay n'est pas encore configuré, le site bascule automatiquement sur une page de remerciement classique (paiement à confirmer à la main via l'admin). Rien ne casse.

## `npm install`

`package.json` a une nouvelle dépendance (`googleapis`). Railway relance `npm install` tout seul au déploiement — rien à faire.
