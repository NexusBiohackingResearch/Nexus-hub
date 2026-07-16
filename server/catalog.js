// ============================================================
// NEXUS — Catalogue & codes promo pilotés par Google Sheets
// Deux onglets dans le même classeur que "Commande NEXUS" :
//   - "Produits"    : ID | Nom | Dosage | Cat FR | Cat EN | Prix | Dispo | Image
//   - "Codes Promo" : Code | Influenceur | Réduction % | Actif | Notes
// Lecture en direct (cache 60 s). Repli sur data/*.json si non configuré.
// Les onglets se créent + se remplissent automatiquement au 1er démarrage.
// ============================================================
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { getClient, SPREADSHEET_ID, sheetsConfigured } from "./sheets.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PRODUCTS_JSON = path.join(__dirname, "..", "data", "products.json");
const PROMO_JSON = path.join(__dirname, "..", "data", "promo.json");

export const PRODUCTS_TAB = "Produits";
export const PROMO_TAB = "Codes Promo";
const TTL = 60 * 1000;

const isYes = (v) =>
  ["oui", "yes", "true", "1", "vrai", "disponible", "x", "actif"].includes(
    String(v ?? "").trim().toLowerCase()
  );

// ---------- Regroupement des catégories (10 anciennes -> 4 + supports) ----------
// La Google Sheet garde ses catégories fines ; le site les fusionne à l'affichage.
// Clé = ancienne catégorie (insensible casse/accents). Valeur = {fr, en} consolidés.
const CATEGORY_MAP = {
  "croissance & performance":    { fr: "Performance & Récupération",   en: "Performance & Recovery" },
  "régénération & réparation":   { fr: "Performance & Récupération",   en: "Performance & Recovery" },
  "métabolisme":                 { fr: "Métabolisme & Longévité",      en: "Metabolism & Longevity" },
  "longévité & anti-âge":        { fr: "Métabolisme & Longévité",      en: "Metabolism & Longevity" },
  "longévité & recherche cellulaire": { fr: "Métabolisme & Longévité", en: "Metabolism & Longevity" },
  "bioregulators":               { fr: "Métabolisme & Longévité",      en: "Metabolism & Longevity" },
  "cognition & neuroprotection": { fr: "Cognition & neuroprotection",  en: "Cognition & neuroprotection" },
  "cognition & longévité":       { fr: "Cognition & neuroprotection",  en: "Cognition & neuroprotection" },
  "santé reproductive":          { fr: "Reproductive & Hormonal",      en: "Reproductive & Hormonal" },
  "mélanocortines":              { fr: "Reproductive & Hormonal",      en: "Reproductive & Hormonal" },
  "compléments & supports":      { fr: "Supports & divers",            en: "Lab supports" },
};
const noAccent = (s) => String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").trim().toLowerCase();
const CATEGORY_MAP_NA = Object.fromEntries(Object.entries(CATEGORY_MAP).map(([k, v]) => [noAccent(k), v]));
function applyCategoryMap(list) {
  if (!Array.isArray(list)) return list;
  for (const p of list) {
    const m = CATEGORY_MAP_NA[noAccent(p.categoryFr)];
    if (m) { p.categoryFr = m.fr; p.categoryEn = m.en; }
  }
  return list;
}

// ---------- Repli fichiers ----------
async function fileProducts() {
  try { return JSON.parse(await readFile(PRODUCTS_JSON, "utf8")); } catch { return []; }
}
async function filePromos() {
  try {
    const arr = JSON.parse(await readFile(PROMO_JSON, "utf8"));
    const map = {};
    for (const p of arr) {
      if (p.actif === false) continue;
      map[String(p.code).trim().toUpperCase()] = { influenceur: p.influenceur || "", reduction: Number(p.reduction) || 0 };
    }
    return map;
  } catch { return {}; }
}

// ---------- Découpe "Nom 10mg" -> {nom, dosage} (pour l'amorçage) ----------
function splitName(name = "") {
  const m = name.match(/^(.*?)[\s]+([\d].*)$/);
  return m ? { nom: m[1].trim(), dosage: m[2].trim() } : { nom: name.trim(), dosage: "" };
}

// ---------- Lecture Produits ----------
let pCache = { data: null, ts: 0 };
export async function getProducts() {
  const now = Date.now();
  if (pCache.data && now - pCache.ts < TTL) return pCache.data;

  const client = sheetsConfigured() ? getClient() : null;
  if (!client) { const f = applyCategoryMap(await fileProducts()); pCache = { data: f, ts: now }; return f; }

  try {
    const res = await client.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${PRODUCTS_TAB}!A3:H`,
    });
    const rows = res.data.values || [];
    const products = rows
      .filter((r) => (r[0] || "").trim()) // ID requis
      .map((r) => {
        const nom = (r[1] || "").trim();
        const dosage = (r[2] || "").trim();
        return {
          id: (r[0] || "").trim(),
          name: [nom, dosage].filter(Boolean).join(" "),
          dosage,
          categoryFr: (r[3] || "").trim(),
          categoryEn: (r[4] || r[3] || "").trim(),
          price: Number(String(r[5] || "0").replace(",", ".")) || 0,
          available: isYes(r[6]),
          image: (r[7] || "").trim(),
          fallbackImage: "assets/images/nexus-logo.webp",
        };
      });
    if (products.length) { applyCategoryMap(products); pCache = { data: products, ts: now }; return products; }
  } catch (e) {
    console.error("[catalog] lecture Produits:", e?.message || e);
  }
  const f = applyCategoryMap(await fileProducts());
  pCache = { data: f, ts: now };
  return f;
}

// ---------- Lecture Codes Promo ----------
let cCache = { data: null, ts: 0 };
export async function getPromos() {
  const now = Date.now();
  if (cCache.data && now - cCache.ts < TTL) return cCache.data;

  const client = sheetsConfigured() ? getClient() : null;
  if (!client) { const f = await filePromos(); cCache = { data: f, ts: now }; return f; }

  try {
    const res = await client.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${PROMO_TAB}!A3:E`,
    });
    const rows = res.data.values || [];
    const map = {};
    for (const r of rows) {
      const code = (r[0] || "").trim().toUpperCase();
      if (!code) continue;
      if (!isYes(r[3])) continue; // Actif ?
      map[code] = { influenceur: (r[1] || "").trim(), reduction: Number(String(r[2] || "0").replace(",", ".")) || 0 };
    }
    cCache = { data: map, ts: now };
    return map;
  } catch (e) {
    console.error("[catalog] lecture Codes Promo:", e?.message || e);
  }
  const f = await filePromos();
  cCache = { data: f, ts: now };
  return f;
}

export function invalidateCache() { pCache = { data: null, ts: 0 }; cCache = { data: null, ts: 0 }; }

// ---------- Amorçage automatique des onglets ----------
async function tabExists(client, title) {
  const meta = await client.spreadsheets.get({
    spreadsheetId: SPREADSHEET_ID,
    fields: "sheets.properties.title",
  });
  return (meta.data.sheets || []).some((s) => s.properties.title === title);
}
async function addTab(client, title) {
  await client.spreadsheets.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    requestBody: { requests: [{ addSheet: { properties: { title } } }] },
  });
}
async function writeValues(client, range, values) {
  await client.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range,
    valueInputOption: "USER_ENTERED",
    requestBody: { values },
  });
}

export async function ensureCatalogTabs() {
  if (!sheetsConfigured()) return;
  const client = getClient();
  if (!client) return;
  try {
    // Onglet Produits
    if (!(await tabExists(client, PRODUCTS_TAB))) {
      await addTab(client, PRODUCTS_TAB);
      const prods = await fileProducts();
      const header1 = ["📦 PRODUITS — NEXUS (modifiable en temps réel · NE PAS changer la colonne ID)"];
      const header2 = ["ID", "Nom", "Dosage", "Catégorie (FR)", "Catégorie (EN)", "Prix (€)", "Disponible (Oui/Non)", "Image"];
      const data = prods.map((p) => {
        const { nom, dosage } = splitName(p.name || "");
        return [p.id, nom, dosage, p.categoryFr || "", p.categoryEn || "", p.price ?? 0, p.available ? "Oui" : "Non", p.image || ""];
      });
      await writeValues(client, `${PRODUCTS_TAB}!A1`, [header1, header2, ...data]);
      console.log(`[catalog] onglet "${PRODUCTS_TAB}" créé et rempli (${data.length} produits)`);
    }
    // Onglet Codes Promo
    if (!(await tabExists(client, PROMO_TAB))) {
      await addTab(client, PROMO_TAB);
      let arr = [];
      try { arr = JSON.parse(await readFile(PROMO_JSON, "utf8")); } catch {}
      const header1 = ["🎁 CODES PROMO — NEXUS (modifiable en temps réel)"];
      const header2 = ["Code", "Influenceur / Description", "Réduction (%)", "Actif (Oui/Non)", "Notes"];
      const data = arr.map((p) => [p.code, p.influenceur || "", p.reduction ?? 0, p.actif === false ? "Non" : "Oui", ""]);
      await writeValues(client, `${PROMO_TAB}!A1`, [header1, header2, ...data]);
      console.log(`[catalog] onglet "${PROMO_TAB}" créé et rempli (${data.length} codes)`);
    }
  } catch (e) {
    console.error("[catalog] amorçage onglets:", e?.message || e);
  }
}
