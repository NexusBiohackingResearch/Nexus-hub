// ============================================================
// NEXUS — Serveur principal (Express)
// Sert le site statique + API. Un seul service Railway.
// ============================================================
import "dotenv/config";
import express from "express";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { initSchema, query } from "./db.js";
import {
  attachUser, requireAuth, requireAdmin,
  register, login, logout, me,
} from "./auth.js";
import { createOrder, myOrders, trackOrder, quote } from "./orders.js";
import { listOrders, updateStatus, stats } from "./admin.js";
import { sendWelcome } from "./email.js";
import { btcpayWebhook } from "./webhook.js";
import { btcpayConfigured } from "./btcpay.js";
import { sheetsConfigured } from "./sheets.js";
import { FRAIS_PORT, SEUIL_GRATUIT } from "./promo.js";
import { getProducts, ensureCatalogTabs } from "./catalog.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const app = express();
app.set("trust proxy", 1);

// ---- Webhook BTCPay : corps BRUT (avant express.json) pour vérifier la signature ----
app.post("/api/btcpay/webhook", express.raw({ type: "*/*" }), btcpayWebhook);

// ---- Reste de l'API en JSON ----
app.use(express.json({ limit: "200kb" }));
app.use(cookieParser());
app.use(attachUser);

const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 40 });
const orderLimiter = rateLimit({ windowMs: 60 * 1000, max: 12 });

// ---- Auth ----
app.post("/api/auth/register", authLimiter, async (req, res, next) => {
  try {
    await register(req, res);
    if (req.body?.email)
      query("SELECT * FROM users WHERE email=$1", [req.body.email])
        .then((r) => r.rows[0] && sendWelcome(r.rows[0])).catch(() => {});
  } catch (e) { next(e); }
});
app.post("/api/auth/login", authLimiter, (req, res, next) => login(req, res).catch(next));
app.post("/api/auth/logout", logout);
app.get("/api/auth/me", (req, res, next) => me(req, res).catch(next));

// ---- Catalogue (lu depuis Google Sheets, cache 60s) ----
app.get("/api/products", async (_req, res, next) => {
  try { res.json({ products: await getProducts() }); } catch (e) { next(e); }
});

// ---- Commandes ----
app.post("/api/quote", (req, res, next) => quote(req, res).catch(next));
app.post("/api/orders", orderLimiter, (req, res, next) => createOrder(req, res).catch(next));
app.get("/api/orders/mine", requireAuth, (req, res, next) => myOrders(req, res).catch(next));
app.get("/api/orders/:reference", (req, res, next) => trackOrder(req, res).catch(next));

// ---- Admin ----
app.get("/api/admin/stats", requireAuth, requireAdmin, (req, res, next) => stats(req, res).catch(next));
app.get("/api/admin/orders", requireAuth, requireAdmin, (req, res, next) => listOrders(req, res).catch(next));
app.post("/api/admin/orders/:id/status", requireAuth, requireAdmin, (req, res, next) => updateStatus(req, res).catch(next));

// ---- Config publique ----
app.get("/api/config", (_req, res) => {
  res.json({
    currency: "EUR",
    fraisPort: FRAIS_PORT,
    seuilGratuit: SEUIL_GRATUIT,
    btcpay: btcpayConfigured(),
    sheets: sheetsConfigured(),
    telegramUrl: process.env.TELEGRAM_URL || "",
  });
});
app.get("/api/health", (_req, res) => res.json({ ok: true }));

// ---- Fichiers statiques (le site) ----
app.use(express.static(ROOT, { extensions: ["html"] }));
app.get(/^(?!\/api).*/, (_req, res) => res.sendFile(path.join(ROOT, "index.html")));

app.use((err, _req, res, _next) => {
  console.error("[erreur]", err);
  res.status(500).json({ error: "Erreur serveur." });
});

const PORT = process.env.PORT || 3000;
initSchema()
  .then(async () => {
    if (process.env.ADMIN_EMAIL)
      await query("UPDATE users SET is_admin=TRUE WHERE email=$1", [process.env.ADMIN_EMAIL]).catch(() => {});
    // Crée + remplit les onglets "Produits" et "Codes Promo" si absents
    await ensureCatalogTabs().catch((e) => console.error("catalog init:", e));
    app.listen(PORT, () => console.log(`[nexus] en ligne sur :${PORT}`));
  })
  .catch((e) => { console.error("Échec init DB:", e); process.exit(1); });
