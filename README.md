# NEXUS Hub V4

Version statique compatible GitHub Pages.

## 1. Configurer Telegram

Ouvrez `js/config.js` et remplacez :

```js
telegramUrl: "https://t.me/VOTRE_BOT_TELEGRAM"
```

par l'URL exacte du bot Nexus.

## 2. Ajouter la future cinématique

Déposez la vidéo dans :

```text
assets/video/nexus-intro.mp4
```

Format recommandé :
- MP4 H.264
- 1920 × 1080
- 24 fps
- version web muette
- idéalement moins de 12 Mo

Tant que la vidéo n'existe pas, le site utilise automatiquement l'image `cinematic-poster.png`.

## 3. Publier

Copiez le contenu de ce dossier directement à la racine du dépôt `Nexus-hub`, puis :

1. Commit to main
2. Push origin
3. Attendre la coche verte dans GitHub Actions / Pages
4. Recharger le site avec Cmd + Shift + R

## 4. Données produits

Le catalogue se trouve dans :

```text
data/products.json
```

Les prix et disponibilités sont issus du fichier Excel fourni lors de la création de cette version.

## Important

Les visuels produits actuels proviennent des planches fournies. Certains pourront encore nécessiter une régénération individuelle pour obtenir un cadrage produit parfaitement homogène.
