# NEXUS — Gérer produits & codes promo depuis Google Sheets (temps réel)

Tu peux désormais piloter ton catalogue **et** tes codes promo directement depuis Google Sheets, **sans toucher au code ni redéployer**. Le site relit la feuille en continu (mise à jour visible en **~1 minute**).

## Où ça se passe

Dans **ton classeur existant** (celui de « Commande NEXUS »), deux nouveaux onglets apparaissent **automatiquement au premier démarrage** du site une fois `GOOGLE_CREDENTIALS` configuré :

- **« Produits »**
- **« Codes Promo »**

Ils sont **pré-remplis** avec tes 38 produits actuels et tes codes promo. Tu n'as rien à créer.

## Onglet « Produits »

| Colonne | Rôle |
|---|---|
| **A — ID** | ⚠️ **Ne pas modifier.** Clé technique qui relie la fiche + l'image. |
| **B — Nom** | Nom affiché (ex. `Retatrutide`) |
| **C — Dosage** | Dosage (ex. `10mg`) |
| **D — Catégorie (FR)** | Catégorie affichée en français |
| **E — Catégorie (EN)** | Catégorie en anglais |
| **F — Prix (€)** | Prix unitaire |
| **G — Disponible** | `Oui` / `Non` (gère le badge et le bouton d'achat) |
| **H — Image** | Chemin de l'image (ex. `assets/images/products/05_RETATRUTIDE_10_MG.png`) |

**Exemples d'édition en temps réel :**
- Mettre un produit en rupture → colonne G : `Non`. Il apparaît « Indisponible » sur le site en ~1 min.
- Changer un prix → colonne F. Répercuté partout (catalogue, panier, total, commande).
- Ajouter un produit → nouvelle ligne : mets un **ID unique** (sans espace), le nom, le prix, `Oui`, et une image.

## Onglet « Codes Promo »

| Colonne | Rôle |
|---|---|
| **A — Code** | Le code à saisir par le client (ex. `NEXUS2026`) |
| **B — Influenceur / Description** | Pour ton suivi |
| **C — Réduction (%)** | Pourcentage de remise |
| **D — Actif (Oui/Non)** | `Oui` = utilisable, `Non` = désactivé |
| **E — Notes** | Libre |

Tes codes actuels sont déjà là : **NEXUS2026** (−20 %, actif), **INFLUENCER1** (−15 %, actif), **INFLUENCER2** (−10 %, désactivé).

Pour activer/désactiver un code : colonne D → `Oui` / `Non`. Pour en créer un : nouvelle ligne.

## Bon à savoir

- **Délai** : le site garde la feuille en cache 60 s pour rester rapide → compte ~1 min après ta modif.
- **Sécurité des prix** : le prix d'une commande est toujours **recalculé côté serveur** depuis la feuille — impossible pour un client de tricher.
- **Repli** : si Google Sheets est momentanément indisponible, le site bascule sur le fichier `data/products.json` / `data/promo.json` (rien ne casse).
- **Même compte de service** que ton bot : la feuille est déjà partagée avec lui, rien à reconfigurer.
- **L'ID est sacré** : ne change jamais un ID existant (sinon la fiche descriptive et l'image ne suivent plus). Tout le reste est librement modifiable.
