# NEXUS Hub V6

Cette version devient la base définitive du site.

## Structure obligatoire

```text
Nexus-hub/
├── index.html
├── README.md
├── PRODUCT_IMAGE_NAMES.txt
├── CLEANUP_CHECKLIST.txt
├── css/
│   └── main.css
├── js/
│   ├── app.js
│   └── config.js
├── data/
│   └── products.json
└── assets/
    ├── images/
    │   ├── nexus-logo.webp
    │   ├── cinematic-poster.png
    │   └── products/
    │       └── *.webp
    └── video/
        └── nexus-intro.mp4
```

## Telegram

Modifier uniquement :

```text
js/config.js
```

Exemple :

```js
window.NEXUS_CONFIG = {
  telegramUrl: "https://t.me/NOM_EXACT_DU_BOT",
  cataloguePdfUrl: "#",
  certificatesUrl: "#"
};
```

## Vidéo

La vidéo doit être nommée exactement :

```text
assets/video/nexus-intro.mp4
```

## Images produit

Toutes les images restent en WebP.

Elles doivent être placées dans :

```text
assets/images/products/
```

Le nom exact attendu de chaque fichier est indiqué dans :

```text
PRODUCT_IMAGE_NAMES.txt
```

## Nettoyage avant publication

Supprimer les anciens fichiers V1 placés directement à la racine :

```text
app.js
styles.css
products.json
```

Ne pas supprimer les fichiers situés dans `js/`, `css/` et `data/`.

## Publication

1. Copier le contenu du ZIP à la racine du dépôt.
2. Accepter tous les remplacements.
3. Vérifier `js/config.js`.
4. Conserver `assets/video/nexus-intro.mp4`.
5. Commit to main.
6. Push origin.
7. Attendre GitHub Pages.
8. Recharger avec Cmd + Shift + R.
