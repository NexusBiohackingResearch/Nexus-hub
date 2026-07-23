// ============================================================
// NEXUS — SEO : rendu serveur (SSR) pour le référencement naturel
//   - /robots.txt           : directives crawl + lien sitemap
//   - /sitemap.xml          : plan de site (accueil + pages produits + pages info)
//   - /produits             : index catalogue indexable (liens crawlables)
//   - /produits/:id         : fiche produit rendue côté serveur (contenu + JSON-LD)
// Objectif : donner à Google du contenu HTML réel (pas dépendant du JS)
// et des pages ciblées par produit pour se positionner sur les requêtes.
// ============================================================
import { Router } from "express";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getProducts } from "./catalog.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const DESC_DIR = path.join(ROOT, "content", "descriptions");
const ARTICLES_DIR = path.join(ROOT, "content", "articles");
const ARTICLE_IMG = (slug, n) => `/assets/images/articles/${slug}-${n}.png`;
const ARTICLE_COVER = (slug) => `/assets/images/articles/${slug}-cover.png`;

async function loadArticlesIndex() {
  try { return JSON.parse(await readFile(path.join(ARTICLES_DIR, "index.json"), "utf8")); }
  catch { return []; }
}

// Rendu markdown -> HTML pour les articles (titres, listes, tableaux, citations,
// gras/italique, et marqueurs [IMAGE n] -> figure image).
function articleMdToHtml(md, slug) {
  const inline = (s) =>
    escapeHtml(s)
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/(^|[^*])\*(?!\s)(.+?)\*/g, "$1<em>$2</em>")
      .replace(/`(.+?)`/g, "<code>$1</code>");
  const lines = md.split(/\r?\n/);
  let html = "", inList = false, inTable = false, inQuote = false;
  const closeList = () => { if (inList) { html += "</ul>"; inList = false; } };
  const closeTable = () => { if (inTable) { html += "</tbody></table></div>"; inTable = false; } };
  const closeQuote = () => { if (inQuote) { html += "</blockquote>"; inQuote = false; } };
  const closeAll = () => { closeList(); closeTable(); closeQuote(); };

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) { closeAll(); continue; }
    const imgm = line.match(/^\[IMAGE\s*(\d+)\]$/i);
    if (imgm) {
      closeAll();
      const n = imgm[1];
      html += `<figure class="art-fig"><img src="${ARTICLE_IMG(slug, n)}" alt="Illustration NEXUS — recherche peptides" loading="lazy" onerror="this.closest('figure').style.display='none'"></figure>`;
      continue;
    }
    if (line.startsWith("> ")) {
      closeList(); closeTable();
      if (!inQuote) { html += "<blockquote>"; inQuote = true; }
      html += inline(line.slice(2));
      continue;
    }
    if (line.startsWith("### ")) { closeAll(); html += `<h3>${inline(line.slice(4))}</h3>`; continue; }
    if (line.startsWith("## ")) { closeAll(); html += `<h2>${inline(line.slice(3))}</h2>`; continue; }
    if (line.startsWith("- ")) {
      closeTable(); closeQuote();
      if (!inList) { html += '<ul class="art-list">'; inList = true; }
      html += `<li>${inline(line.slice(2))}</li>`;
      continue;
    }
    if (line.startsWith("|")) {
      closeList(); closeQuote();
      const cells = line.split("|").slice(1, -1).map((c) => c.trim());
      if (cells.every((c) => /^:?-{2,}:?$/.test(c))) continue;
      if (!inTable) { html += '<div class="technical-table-wrap"><table class="technical-table"><tbody>'; inTable = true; }
      if (cells.length >= 2) html += `<tr><th>${inline(cells[0])}</th><td>${inline(cells.slice(1).join(" | "))}</td></tr>`;
      continue;
    }
    closeAll();
    html += `<p>${inline(line)}</p>`;
  }
  closeAll();
  return html;
}

// Domaine canonique du site (toujours le vrai domaine public, jamais l'URL interne Railway).
// On ignore volontairement toute variable d'env mal réglée : pour le SEO, le host
// canonique doit impérativement être le domaine public.
export const SITE_URL = "https://www.nexus-research-shop.com";
const BRAND = "NEXUS Biohacking Research";

// --- Correspondance produit -> fichier de description (aligné sur js/app.js) ---
const DESCRIPTION_FILES = {
  "hgh-10u": "01-hgh-somatropine.md",
  "bac-water-10ml": "36-eau-bacteriostatique-bac-water.md",
  "hmg-76-iu": "02-hmg-menotropine.md",
  "hcg-5000-iu": "03-hcg-gonadotrophine-chorionique.md",
  "retatrutide-10mg": "16-retatrutide.md",
  "retatrutide-20mg": "16-retatrutide.md",
  "bpc157-5mg": "11-bpc-157.md",
  "bpc157-10mg": "11-bpc-157.md",
  "tb500-10mg": "12-tb-500-thymosine-4.md",
  "bpc-157-plus-tb-500-5mg-plus-5mg": "13-bpc-157-tb-500.md",
  "bpc-157-plus-tb-500-10mg-plus-10mg": "13-bpc-157-tb-500.md",
  "ghk-cu-50mg": "14-ghk-cu-cuivre-ghk.md",
  "glow-70-70mg": "18-glow-70-blend.md",
  "mgf-2mg": "04-mgf-mechano-growth-factor.md",
  "peg-mgf-2mg": "05-peg-mgf.md",
  "epithalon-10mg": "30-epithalon-epitalon.md",
  "tesamorelin-12mg-plus-ipamorelin-6mg": "10-tesamoreline-ipamorelin.md",
  "semax-10mg-plus-selank-10mg": "28-semax-selank.md",
  "cjc-1295-w-o-dac-plus-ipamorelin-5mg-plus-5mg": "09-cjc-1295-no-dac-ipamorelin.md",
  "nad-plus-1000mg": "22-nad.md",
  "ghrp-2-2mg": "07-ghrp-2.md",
  "ghrp-6-5mg": "08-ghrp-6.md",
  "igf-lr3-1mg": "06-igf-1-lr3.md",
  "mots-c-10mg": "20-mots-c.md",
  "dsip-10mg": "29-dsip.md",
  "oxytocin-5mg": "31-ocytocine.md",
  "aod-9604-5mg": "19-aod-9604.md",
  "pt141-10mg": "27-pt-141-bremelanotide.md",
  "mt-i-10mg": "24-melanotan-i-mt-i.md",
  "mt-ii-melanotan-2-acetate-10mg": "25-melanotan-ii-mt-ii.md",
  "kisspeptin-5mg": "32-kisspeptine-10.md",
  "ss-31-10mg": "23-ss-31-elamipretide.md",
  "kpv": "15-kpv.md",
  "glutathione": "26-glutathion-gsh.md",
  "5-amino-1mq-5mg": "21-5-amino-1mq.md",
  "bronchogen-20mg": "33-bronchogen.md",
  "livagen-20mg": "34-livagen.md",
  "pancragen-20mg": "35-pancragen.md",
  "selank-10mg": "37-selank.md",
};

// ---------------------- utilitaires ----------------------
const escapeHtml = (v = "") =>
  String(v)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");

const escapeXml = (v = "") =>
  String(v)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&apos;");

const inlineMd = (v = "") =>
  escapeHtml(v)
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/`(.*?)`/g, "<code>$1</code>");

function extractLanguageSection(markdown, lang = "fr") {
  const marker = lang === "fr" ? "## 🇫🇷 Description (FR)" : "## 🇬🇧 Description (EN)";
  const start = markdown.indexOf(marker);
  if (start === -1) return "";
  const remaining = markdown.slice(start + marker.length);
  const next = remaining.search(/\n## 🇫🇷 Description \(FR\)|\n## 🇬🇧 Description \(EN\)/);
  return (next === -1 ? remaining : remaining.slice(0, next)).trim();
}

// Rendu markdown -> HTML (aligné sur js/app.js, labels FR)
function mdToHtml(markdown) {
  if (!markdown) return "";
  const lines = markdown.split(/\r?\n/);
  let html = "", listOpen = false, tableOpen = false, headerSkipped = false;
  const closeList = () => { if (listOpen) { html += "</ul>"; listOpen = false; } };
  const closeTable = () => { if (tableOpen) { html += "</tbody></table></div>"; tableOpen = false; headerSkipped = false; } };

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) { closeList(); closeTable(); continue; }
    if (line.startsWith(">")) { closeList(); closeTable(); continue; }
    if (line.startsWith("**Domaines de recherche") || line.startsWith("**Research areas")) {
      closeList(); closeTable(); html += `<h2>Domaines de recherche étudiés</h2>`; continue;
    }
    if (line.startsWith("**Données techniques") || line.startsWith("**Technical data")) {
      closeList(); closeTable(); html += `<h2>Données techniques</h2>`; continue;
    }
    if (line.startsWith("- ")) {
      closeTable();
      if (!listOpen) { html += '<ul class="research-list">'; listOpen = true; }
      html += `<li>${inlineMd(line.slice(2))}</li>`; continue;
    }
    if (line.startsWith("|")) {
      closeList();
      const cells = line.split("|").slice(1, -1).map((c) => c.trim());
      if (cells.every((c) => /^:?-{3,}:?$/.test(c))) { headerSkipped = true; continue; }
      if (!tableOpen) { html += '<div class="technical-table-wrap"><table class="technical-table"><tbody>'; tableOpen = true; }
      if (cells.length >= 2) html += `<tr><th>${inlineMd(cells[0])}</th><td>${inlineMd(cells.slice(1).join(" | "))}</td></tr>`;
      continue;
    }
    closeList(); closeTable();
    if (line.startsWith("### ")) html += `<h2>${inlineMd(line.slice(4))}</h2>`;
    else if (line.startsWith("## ")) html += `<h2>${inlineMd(line.slice(3))}</h2>`;
    else if (!line.startsWith("#") && line !== "---") html += `<p>${inlineMd(line)}</p>`;
  }
  closeList(); closeTable();
  return html;
}

async function loadDescriptionHtml(productId) {
  const file = DESCRIPTION_FILES[productId];
  if (!file) return "";
  try {
    const md = await readFile(path.join(DESC_DIR, file), "utf8");
    return mdToHtml(extractLanguageSection(md, "fr"));
  } catch { return ""; }
}

// Trim d'une meta description à ~155 caractères sur une frontière de mot
function metaDesc(text) {
  const t = String(text || "").replace(/\s+/g, " ").trim();
  if (t.length <= 155) return t;
  return t.slice(0, 152).replace(/\s+\S*$/, "") + "…";
}

const abs = (p) => SITE_URL.replace(/\/$/, "") + p;

// ---------------------- gabarit HTML commun ----------------------
function layout({ title, description, canonical, image, jsonld, bodyClass, main }) {
  const ogImg = image ? (image.startsWith("http") ? image : abs("/" + image.replace(/^\//, ""))) : abs("/assets/images/nexus-logo.png");
  return `<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
  <meta name="theme-color" content="#03070b">
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}">
  <link rel="canonical" href="${escapeHtml(canonical)}">
  <meta name="robots" content="index,follow,max-image-preview:large">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="${escapeHtml(BRAND)}">
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:url" content="${escapeHtml(canonical)}">
  <meta property="og:image" content="${escapeHtml(ogImg)}">
  <meta property="og:locale" content="fr_FR">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeHtml(title)}">
  <meta name="twitter:description" content="${escapeHtml(description)}">
  <meta name="twitter:image" content="${escapeHtml(ogImg)}">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Space+Grotesk:wght@500;600;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/css/main.css">
  <link rel="stylesheet" href="/css/store.css">
  <script src="/js/analytics.js"></script>
  <script src="/js/age-gate.js"></script>
  <script src="/js/newsletter.js"></script>
  <script src="/js/promo-link.js"></script>
  ${jsonld ? `<script type="application/ld+json">${jsonld}</script>` : ""}
  <style>
    .seo-wrap{max-width:1080px;margin:0 auto;padding:120px 24px 80px}
    .seo-breadcrumb{font-size:13px;letter-spacing:.02em;color:#8fb4c4;margin-bottom:22px}
    .seo-breadcrumb a{color:#8fb4c4;text-decoration:none}
    .seo-breadcrumb a:hover{color:#eafcff}
    .seo-prod-head{display:flex;flex-wrap:wrap;gap:36px;align-items:flex-start;margin-bottom:44px}
    .seo-prod-head img{width:280px;max-width:100%;border-radius:20px;background:#0a1620;border:1px solid rgba(24,215,232,.15)}
    .seo-prod-head .meta{flex:1;min-width:260px}
    .seo-prod-head h1{font-size:clamp(30px,4vw,44px);line-height:1.08;margin:6px 0 14px}
    .seo-eyebrow{font-size:12px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:#18d7e8}
    .seo-price{font-family:'Space Grotesk',sans-serif;font-size:28px;font-weight:700;color:#eafcff}
    .seo-badge{display:inline-block;margin-left:12px;padding:4px 12px;border-radius:999px;font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;vertical-align:middle}
    .seo-badge.in{background:rgba(131,239,104,.16);color:#a6f58f;border:1px solid rgba(131,239,104,.35)}
    .seo-badge.out{background:rgba(255,120,120,.12);color:#ff9d9d;border:1px solid rgba(255,120,120,.3)}
    .seo-bogo{display:inline-block;margin-left:8px;padding:4px 11px;border-radius:999px;font-size:11px;font-weight:700;letter-spacing:.04em;vertical-align:middle;color:#04120c;background:linear-gradient(90deg,#9b47ff,#18d7e8)}
    .seo-cta{margin-top:22px}
    .seo-body h2{font-size:20px;margin:34px 0 12px;color:#eafcff}
    .seo-body p{color:#c4d7df;line-height:1.7;margin:0 0 14px}
    .seo-body .research-list{color:#c4d7df;line-height:1.7;padding-left:20px}
    .seo-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:20px;margin-top:32px}
    .seo-card{display:block;padding:22px;border-radius:18px;text-decoration:none;background:linear-gradient(160deg,#08141c,#060d13);border:1px solid rgba(24,215,232,.14);transition:border-color .2s,transform .2s}
    .seo-card:hover{border-color:rgba(24,215,232,.4);transform:translateY(-3px)}
    .seo-card h2{font-size:17px;margin:0 0 6px;color:#eafcff}
    .seo-card .cat{font-size:12px;color:#8fb4c4}
    .seo-card .p{margin-top:12px;font-family:'Space Grotesk',sans-serif;font-weight:700;color:#18d7e8}
    .seo-disclaimer{margin-top:52px;padding:18px 20px;border-radius:14px;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.08);font-size:13px;color:#9fb6c0;line-height:1.6}
    .seo-lead{color:#c4d7df;line-height:1.7;max-width:720px}
    .art-hero{width:100%;height:clamp(200px,32vw,380px);border-radius:20px;background:#0a1620 center/cover no-repeat;border:1px solid rgba(24,215,232,.15)}
    .art-body{max-width:760px}
    .art-body h2{font-size:23px;color:#eafcff;margin:36px 0 12px}
    .art-body h3{font-size:18px;color:#eafcff;margin:26px 0 10px}
    .art-body p{color:#c4d7df;line-height:1.8;margin:0 0 16px}
    .art-body strong{color:#eafcff}
    .art-list{color:#c4d7df;line-height:1.8;padding-left:20px;margin:0 0 16px}
    .art-body blockquote{margin:22px 0;padding:14px 18px;border-left:3px solid #18d7e8;border-radius:8px;background:rgba(24,215,232,.06);color:#9fb6c0;font-size:14px;line-height:1.6}
    .art-fig{margin:26px 0}
    .art-fig img{width:100%;border-radius:16px;border:1px solid rgba(24,215,232,.15);display:block}
    .art-sources{max-width:760px;margin-top:40px;padding-top:20px;border-top:1px solid rgba(255,255,255,.08)}
    .art-sources h2{font-size:16px;color:#eafcff;margin:0 0 10px}
    .art-sources ul{padding-left:18px} .art-sources li{color:#8fb4c4;font-size:13px;line-height:1.7}
    .art-sources a{color:#18d7e8;text-decoration:none;word-break:break-word} .art-sources a:hover{color:#83ef68}
    .art-index-grid{grid-template-columns:repeat(3,1fr)}
    .art-index-card{padding:0;overflow:hidden}
    .art-index-thumb{height:150px;background:#0a1620 center/cover no-repeat;border-bottom:1px solid rgba(24,215,232,.12)}
    .art-index-card .cat,.art-index-card h2,.art-index-card p{padding-left:18px;padding-right:18px}
    .art-index-card .cat{display:block;margin-top:14px}
    .art-index-card h2{margin:6px 0 0}
    .art-index-card p{padding-bottom:18px}
    @media(max-width:900px){.art-index-grid{grid-template-columns:1fr}}
  </style>
</head>
<body class="${bodyClass || ""}">
  <header class="header" style="position:fixed">
    <a class="brand" href="/" aria-label="Nexus accueil">
      <span class="brand-mark"></span><span>NEXUS</span><small>Biohacking Research</small>
    </a>
    <nav class="nav">
      <a href="/produits">Catalogue</a>
      <a href="/articles">Articles</a>
      <a href="/calculateur.html">Calculateur</a>
      <a href="/comment-payer.html">Comment payer</a>
      <a href="/expedition.html">Livraison</a>
    </nav>
    <div class="header-actions">
      <a class="header-order" href="/#catalogue">Commander</a>
    </div>
  </header>
  <main class="seo-wrap">
${main}
  </main>
  <footer class="site-footer">
    <div class="footer-meta"><span>© 2026 ${escapeHtml(BRAND)}. Tous droits réservés.</span><span class="footer-email">nexus.corporate@nexus-research-shop.com</span></div>
    <p class="footer-warning"><strong>AVERTISSEMENT :</strong> Tous les produits présentés sur ce site sont destinés uniquement à la recherche et à l'usage en laboratoire. Ils ne sont pas destinés à la consommation humaine ou animale, ni à un usage diagnostique ou thérapeutique. Aucun élément de ce site ne constitue une allégation médicale.</p>
  </footer>
</body>
</html>`;
}

// ---------------------- routeur ----------------------
export const seoRouter = Router();

// robots.txt
seoRouter.get("/robots.txt", (_req, res) => {
  res.type("text/plain").send(
`User-agent: *
Allow: /
Disallow: /admin
Disallow: /admin.html
Disallow: /checkout
Disallow: /checkout.html
Disallow: /compte
Disallow: /compte.html
Disallow: /merci
Disallow: /merci.html
Disallow: /verify
Disallow: /api/

Sitemap: ${abs("/sitemap.xml")}
`);
});

// sitemap.xml
seoRouter.get("/sitemap.xml", async (_req, res) => {
  let products = [];
  try { products = await getProducts(); } catch { products = []; }
  const staticPages = [
    { loc: abs("/"), pr: "1.0", freq: "daily" },
    { loc: abs("/produits"), pr: "0.9", freq: "daily" },
    { loc: abs("/articles"), pr: "0.8", freq: "weekly" },
    { loc: abs("/calculateur.html"), pr: "0.6", freq: "monthly" },
    { loc: abs("/comment-payer.html"), pr: "0.6", freq: "monthly" },
    { loc: abs("/expedition.html"), pr: "0.5", freq: "monthly" },
    { loc: abs("/cgv.html"), pr: "0.3", freq: "yearly" },
    { loc: abs("/remboursement.html"), pr: "0.3", freq: "yearly" },
  ];
  const prodUrls = products
    .filter((p) => p && p.id)
    .map((p) => ({ loc: abs("/produits/" + encodeURIComponent(String(p.id))), pr: "0.8", freq: "weekly" }));
  let articleUrls = [];
  try {
    articleUrls = (await loadArticlesIndex())
      .filter((a) => a && a.slug)
      .map((a) => ({ loc: abs("/articles/" + encodeURIComponent(a.slug)), pr: "0.7", freq: "monthly" }));
  } catch {}
  const urls = [...staticPages, ...prodUrls, ...articleUrls]
    .map((u) => `  <url><loc>${escapeXml(u.loc)}</loc><changefreq>${u.freq}</changefreq><priority>${u.pr}</priority></url>`)
    .join("\n");
  res.type("application/xml").send(
`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`);
});

// /produits — index catalogue indexable
seoRouter.get("/produits", async (_req, res, next) => {
  try {
    const products = (await getProducts()).filter((p) => p && p.id);
    const cards = products.map((p) => {
      const cat = escapeHtml(p.categoryFr || p.category || "");
      const price = Number(p.price) ? `${Number(p.price).toFixed(2)} €` : "";
      return `<a class="seo-card" href="/produits/${encodeURIComponent(String(p.id))}">
        <span class="cat">${cat}</span>
        <h2>${escapeHtml(p.name)}</h2>
        ${price ? `<div class="p">${price}</div>` : ""}
      </a>`;
    }).join("\n");

    const jsonld = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      "name": "Catalogue des peptides de recherche NEXUS",
      "url": abs("/produits"),
      "isPartOf": { "@type": "WebSite", "name": BRAND, "url": SITE_URL },
      "about": "Peptides de recherche haute pureté destinés à l'usage en laboratoire.",
    });

    const main = `<nav class="seo-breadcrumb"><a href="/">Accueil</a> › Catalogue</nav>
    <p class="seo-eyebrow">Research library</p>
    <h1 style="font-size:clamp(30px,4vw,44px);margin:6px 0 16px">Catalogue des peptides de recherche</h1>
    <p class="seo-lead">Retrouvez l'ensemble des références NEXUS : peptides de recherche haute pureté (≥ 99 % HPLC), documentation par lot et expédition France &amp; Europe. Produits destinés exclusivement à la recherche en laboratoire.</p>
    <div class="seo-grid">${cards}</div>`;

    res.send(layout({
      title: "Catalogue peptides de recherche — NEXUS Biohacking Research",
      description: "Catalogue complet des peptides de recherche NEXUS : haute pureté 99%, documentation de lot, paiement crypto, expédition France & Europe. Usage laboratoire uniquement.",
      canonical: abs("/produits"),
      jsonld,
      main,
    }));
  } catch (e) { next(e); }
});

// /produits/:id — fiche produit SSR
seoRouter.get("/produits/:id", async (req, res, next) => {
  try {
    const id = String(req.params.id || "").trim().toLowerCase();
    const products = await getProducts();
    const p = products.find((x) => String(x.id).toLowerCase() === id);
    if (!p) return next(); // -> 404 handler

    const canonical = abs("/produits/" + encodeURIComponent(String(p.id)));
    const cat = p.categoryFr || p.category || "";
    const bodyHtml = await loadDescriptionHtml(p.id);
    const shortDesc = p.descriptionFr || p.descriptionEn || `${p.name} — peptide de recherche haute pureté NEXUS, destiné à l'usage en laboratoire.`;
    const price = Number(p.price) || 0;
    const available = p.available !== false;
    const imgPath = p.image || "assets/images/nexus-logo.png";
    const imgAbs = imgPath.startsWith("http") ? imgPath : abs("/" + imgPath.replace(/^\//, ""));

    const jsonld = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Product",
      "name": p.name,
      "image": [imgAbs],
      "description": metaDesc(shortDesc),
      "category": cat,
      "brand": { "@type": "Brand", "name": BRAND },
      "url": canonical,
      "offers": {
        "@type": "Offer",
        "priceCurrency": "EUR",
        "price": price ? price.toFixed(2) : "0.00",
        "availability": available ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
        "url": canonical,
      },
    });

    const main = `<nav class="seo-breadcrumb"><a href="/">Accueil</a> › <a href="/produits">Catalogue</a> › ${escapeHtml(p.name)}</nav>
    <div class="seo-prod-head">
      <img src="/${escapeHtml(imgPath.replace(/^\//, ""))}" alt="${escapeHtml(p.name)} — peptide de recherche NEXUS" width="280" height="280" loading="lazy">
      <div class="meta">
        <p class="seo-eyebrow">${escapeHtml(cat)}</p>
        <h1>${escapeHtml(p.name)}</h1>
        <div><span class="seo-price">${price ? price.toFixed(2) + " €" : "Sur demande"}</span>
        <span class="seo-badge ${available ? "in" : "out"}">${available ? "Disponible" : "Indisponible"}</span>
        ${p.bogo ? `<span class="seo-bogo">🎁 ${p.bogo === "b1g1" ? "1 acheté = 1 offert" : "2 achetés = 1 offert"}</span>` : ""}</div>
        <p style="color:#c4d7df;line-height:1.7;margin-top:16px">${escapeHtml(shortDesc)}</p>
        <div class="seo-cta"><a class="button button-primary" href="/#catalogue">Commander sur la boutique</a></div>
      </div>
    </div>
    <div class="seo-body">${bodyHtml || `<p>${escapeHtml(shortDesc)}</p>`}</div>
    <p class="seo-disclaimer"><strong>Réservé à la recherche en laboratoire.</strong> ${escapeHtml(p.name)} ne convient pas à la consommation humaine ou animale. Ni médicament, ni aliment, ni cosmétique. À manipuler par du personnel qualifié conformément à la réglementation applicable.</p>
    <script>window.gtag&&gtag("event","view_item",{currency:"EUR",value:${price || 0},items:[${JSON.stringify({ item_id: p.id, item_name: p.name, price: price || 0, item_category: cat })}]});</script>`;

    res.send(layout({
      title: `${p.name}${cat ? " — " + cat : ""} | NEXUS Biohacking Research`,
      description: metaDesc(`${p.name} — ${shortDesc}`),
      canonical,
      image: imgPath,
      jsonld,
      main,
    }));
  } catch (e) { next(e); }
});

// /articles — index des articles (recherche & culture scientifique)
seoRouter.get("/articles", async (_req, res, next) => {
  try {
    const arts = await loadArticlesIndex();
    const cards = arts.map((a) => `<a class="seo-card art-index-card" href="/articles/${encodeURIComponent(a.slug)}">
        <div class="art-index-thumb" style="background-image:url('${ARTICLE_COVER(a.slug)}')"></div>
        <span class="cat">${escapeHtml(a.date || "")}</span>
        <h2>${escapeHtml(a.title)}</h2>
        <p style="color:#9fb6c0;font-size:13px;line-height:1.55;margin:8px 0 0">${escapeHtml(a.excerpt || "")}</p>
      </a>`).join("\n");
    const jsonld = JSON.stringify({
      "@context": "https://schema.org", "@type": "Blog",
      "name": "Recherche & articles — NEXUS Biohacking Research", "url": abs("/articles"),
      "inLanguage": "fr-FR",
    });
    const main = `<nav class="seo-breadcrumb"><a href="/">Accueil</a> › Articles</nav>
    <p class="seo-eyebrow">Le laboratoire</p>
    <h1 style="font-size:clamp(30px,4vw,44px);margin:6px 0 16px">Recherche &amp; articles</h1>
    <p class="seo-lead">Nos publications originales sur les peptides de recherche : mécanismes étudiés, littérature scientifique, reconstitution et conservation. Contenu éducatif, cadre strictement « research use only ».</p>
    <div class="seo-grid art-index-grid">${cards}</div>`;
    res.send(layout({
      title: "Recherche & articles peptides — NEXUS Biohacking Research",
      description: "Articles scientifiques originaux sur les peptides de recherche (rétatrutide, BPC-157, TB-500, MOTS-c, KPV…) : mécanismes, littérature, cadre laboratoire.",
      canonical: abs("/articles"),
      jsonld, main,
    }));
  } catch (e) { next(e); }
});

// /articles/:slug — page article rendue côté serveur
seoRouter.get("/articles/:slug", async (req, res, next) => {
  try {
    const slug = String(req.params.slug || "").trim().toLowerCase();
    const arts = await loadArticlesIndex();
    const meta = arts.find((a) => a.slug === slug);
    if (!meta) return next();
    let md = "";
    try { md = await readFile(path.join(ARTICLES_DIR, slug + ".md"), "utf8"); } catch { return next(); }

    const canonical = abs("/articles/" + encodeURIComponent(slug));
    const cover = ARTICLE_COVER(slug);
    const bodyHtml = articleMdToHtml(md, slug);
    const sources = (meta.sources || []).map((s) => {
      const m = String(s).match(/(https?:\/\/\S+)/);
      const label = String(s).replace(/\s*—?\s*https?:\/\/\S+/, "").trim() || s;
      return m ? `<li><a href="${escapeHtml(m[1])}" target="_blank" rel="noopener nofollow">${escapeHtml(label)}</a></li>` : `<li>${escapeHtml(String(s))}</li>`;
    }).join("");

    const jsonld = JSON.stringify({
      "@context": "https://schema.org", "@type": "Article",
      "headline": meta.title,
      "description": meta.excerpt,
      "image": [abs(cover)],
      "inLanguage": "fr-FR",
      "author": { "@type": "Organization", "name": BRAND },
      "publisher": { "@type": "Organization", "name": BRAND, "logo": { "@type": "ImageObject", "url": abs("/assets/images/nexus-logo.png") } },
      "mainEntityOfPage": canonical,
    });

    const main = `<nav class="seo-breadcrumb"><a href="/">Accueil</a> › <a href="/articles">Articles</a> › ${escapeHtml(meta.title)}</nav>
    <div class="art-hero" style="background-image:url('${cover}')"></div>
    <p class="seo-eyebrow" style="margin-top:26px">${escapeHtml(meta.date || "")}</p>
    <h1 style="font-size:clamp(28px,4vw,42px);line-height:1.12;margin:6px 0 22px">${escapeHtml(meta.title)}</h1>
    <article class="art-body">${bodyHtml}</article>
    ${sources ? `<div class="art-sources"><h2>Sources</h2><ul>${sources}</ul></div>` : ""}
    <div class="seo-cta" style="margin-top:34px"><a class="button button-primary" href="/produits">Voir le catalogue</a></div>`;

    res.send(layout({
      title: `${meta.title} | NEXUS`,
      description: meta.excerpt,
      canonical, image: cover, jsonld, main,
    }));
  } catch (e) { next(e); }
});
