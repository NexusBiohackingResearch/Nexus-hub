# Nexus Hub V1

Site statique prêt pour GitHub Pages ou Cloudflare Pages.

## Mise en ligne rapide avec GitHub Pages

1. Créez un nouveau dépôt GitHub, par exemple `nexus-hub`.
2. Ajoutez tous les fichiers de ce dossier à la racine.
3. Dans `app.js`, remplacez :
   - `https://t.me/VOTRE_BOT_TELEGRAM`
   - `cataloguePdfUrl`
   - `coaUrl`
4. Commit puis push.
5. Dans GitHub : Settings → Pages.
6. Source : Deploy from a branch.
7. Branche : `main`, dossier `/root`.
8. Enregistrez.

## Fichiers

- `index.html` : structure du Hub
- `styles.css` : design responsive
- `app.js` : liens, catalogue, animations
- `products.json` : catalogue dynamique
- `assets/nexus-logo.webp` : visuel Nexus

## Personnalisation

Les couleurs principales sont définies au début de `styles.css`.
Le catalogue se modifie dans `products.json`.
