// ============================================================
// NEXUS — Vérification d'authenticité (QR)
// Route publique /verify/:id  -> page verify.html (non liée depuis le site)
// API /api/verify/:id -> { found, product:{ id, name, description, available } }
// Données : data/products.json (id + name + descriptionFr).
// ============================================================
import { Router } from "express";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const PRODUCTS_JSON = path.join(ROOT, "data", "products.json");

async function loadProducts() {
  try { return JSON.parse(await readFile(PRODUCTS_JSON, "utf8")); } catch { return []; }
}

export const verifyRouter = Router();

verifyRouter.get("/api/verify/:id", async (req, res) => {
  const id = String(req.params.id || "").trim().toLowerCase();
  const p = (await loadProducts()).find((x) => String(x.id).toLowerCase() === id);
  if (!p) return res.json({ found: false });
  res.json({
    found: true,
    product: {
      id: p.id,
      name: p.name,
      description: p.descriptionFr || p.descriptionEn || "",
      image: p.image || "",
      available: p.available !== false,
    },
  });
});

// Sert la page (le JS de la page lit l'id dans l'URL et appelle l'API ci-dessus)
verifyRouter.get(["/verify", "/verify/:id"], (_req, res) =>
  res.sendFile(path.join(ROOT, "verify.html"))
);
