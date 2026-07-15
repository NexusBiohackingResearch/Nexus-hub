// ============================================================
// NEXUS — Routes commandes (création côté client, historique)
// ============================================================
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { query } from "./db.js";
import { findOrCreateGuest } from "./auth.js";
import { sendOrderReceived } from "./email.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PRODUCTS_PATH = path.join(__dirname, "..", "data", "products.json");

let productCache = null;
async function getProducts() {
  if (!productCache) {
    productCache = JSON.parse(await readFile(PRODUCTS_PATH, "utf8"));
  }
  return productCache;
}

function makeRef() {
  const s = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let r = "";
  for (let i = 0; i < 6; i++) r += s[Math.floor(Math.random() * s.length)];
  return "NX-" + r;
}

const emailOk = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e || "");

// POST /api/orders  { email, fullName, address, country, phone, note, paymentMethod, items:[{id,quantity}] }
export async function createOrder(req, res) {
  const b = req.body || {};
  const email = req.user?.email || b.email;
  if (!emailOk(email)) return res.status(400).json({ error: "Email requis." });
  if (!Array.isArray(b.items) || b.items.length === 0)
    return res.status(400).json({ error: "Panier vide." });

  const catalog = await getProducts();
  const byId = new Map(catalog.map((p) => [p.id, p]));

  // On recalcule les prix côté serveur (jamais confiance au client)
  const items = [];
  let subtotal = 0;
  for (const line of b.items) {
    const p = byId.get(line.id);
    const qty = Math.max(1, Math.min(99, parseInt(line.quantity, 10) || 1));
    if (!p) continue;
    if (p.available === false) continue; // on ignore les indisponibles
    const unit = Number(p.price);
    subtotal += unit * qty;
    items.push({ product_id: p.id, name: p.name, unit_price: unit, quantity: qty });
  }
  if (items.length === 0)
    return res.status(400).json({ error: "Aucun produit disponible dans le panier." });

  const shipping = 0; // calculé/ajusté plus tard si besoin
  const total = subtotal + shipping;

  // utilisateur (connecté ou invité)
  let userId = req.user?.id || null;
  if (!userId) {
    const guest = await findOrCreateGuest(email, b.fullName);
    userId = guest.id;
  }

  const reference = makeRef();
  const orderRes = await query(
    `INSERT INTO orders
      (reference,user_id,email,full_name,shipping_address,country,phone,note,payment_method,subtotal,shipping,total,status)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'awaiting_payment')
     RETURNING *`,
    [
      reference, userId, email, b.fullName || null, b.address || null,
      b.country || null, b.phone || null, b.note || null,
      b.paymentMethod || "crypto", subtotal, shipping, total,
    ]
  );
  const order = orderRes.rows[0];

  for (const it of items) {
    await query(
      "INSERT INTO order_items (order_id,product_id,name,unit_price,quantity) VALUES ($1,$2,$3,$4,$5)",
      [order.id, it.product_id, it.name, it.unit_price, it.quantity]
    );
  }
  order.items = items;

  // Email de confirmation (ne bloque pas la réponse si l'email échoue)
  sendOrderReceived(order).catch((e) => console.error("email order:", e));

  res.json({
    ok: true,
    reference: order.reference,
    total: Number(order.total),
    status: order.status,
  });
}

// GET /api/orders/mine  (commandes de l'utilisateur connecté)
export async function myOrders(req, res) {
  const r = await query(
    "SELECT * FROM orders WHERE user_id=$1 ORDER BY created_at DESC",
    [req.user.id]
  );
  const orders = r.rows;
  for (const o of orders) {
    const items = await query("SELECT * FROM order_items WHERE order_id=$1", [o.id]);
    o.items = items.rows;
  }
  res.json({ orders });
}

// GET /api/orders/:reference  (suivi public par référence + email)
export async function trackOrder(req, res) {
  const { reference } = req.params;
  const { email } = req.query;
  const r = await query("SELECT * FROM orders WHERE reference=$1", [reference]);
  const order = r.rows[0];
  if (!order) return res.status(404).json({ error: "Commande introuvable." });
  // sécurité minimale : il faut l'email de la commande pour la consulter
  if (!req.user && (!email || email.toLowerCase() !== order.email.toLowerCase()))
    return res.status(403).json({ error: "Email requis pour consulter cette commande." });
  const items = await query("SELECT * FROM order_items WHERE order_id=$1", [order.id]);
  order.items = items.rows;
  res.json({ order });
}
