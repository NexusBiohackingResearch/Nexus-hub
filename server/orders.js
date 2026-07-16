// ============================================================
// NEXUS — Routes commandes
// Flux : panier → promo/frais → facture BTCPay → Google Sheet → email
// ============================================================
import { query } from "./db.js";
import { findOrCreateGuest } from "./auth.js";
import { sendOrderReceived } from "./email.js";
import { computeTotals, MIN_ORDER } from "./promo.js";
import { getBtcEurRate } from "./rate.js";
import { createInvoice as btcpayCreateInvoice, btcpayConfigured } from "./btcpay.js";
import { createInvoice as npCreateInvoice, nowpaymentsConfigured } from "./nowpayments.js";
import { appendOrderRow, sheetsConfigured, getOrdersTrackingMap, trackingUrl } from "./sheets.js";
import { getProducts } from "./catalog.js";

function makeRef() {
  const s = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let r = "";
  for (let i = 0; i < 6; i++) r += s[Math.floor(Math.random() * s.length)];
  return "NX-" + r;
}
const emailOk = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e || "");

// POST /api/quote  { items:[{id,quantity}], promoCode }
// Renvoie sous-total, remise, frais, total, + estimation BTC (sans créer de commande).
export async function quote(req, res) {
  const b = req.body || {};
  const catalog = await getProducts();
  const byId = new Map(catalog.map((p) => [p.id, p]));
  let subtotal = 0;
  for (const line of b.items || []) {
    const p = byId.get(line.id);
    if (!p || p.available === false) continue;
    const qty = Math.max(1, Math.min(99, parseInt(line.quantity, 10) || 1));
    subtotal += Number(p.price) * qty;
  }
  const totals = await computeTotals(subtotal, b.promoCode);
  let btc = null, rate = null;
  try { rate = await getBtcEurRate(); btc = totals.total / rate; } catch {}
  res.json({ ...totals, btcRate: rate, btcAmount: btc, minOrder: MIN_ORDER, belowMin: subtotal < MIN_ORDER });
}

// POST /api/orders
export async function createOrder(req, res) {
  const b = req.body || {};
  const email = req.user?.email || b.email;
  if (!emailOk(email)) return res.status(400).json({ error: "Email requis." });
  if (!Array.isArray(b.items) || b.items.length === 0)
    return res.status(400).json({ error: "Panier vide." });

  const catalog = await getProducts();
  const byId = new Map(catalog.map((p) => [p.id, p]));

  const items = [];
  let subtotal = 0;
  for (const line of b.items) {
    const p = byId.get(line.id);
    const qty = Math.max(1, Math.min(99, parseInt(line.quantity, 10) || 1));
    if (!p || p.available === false) continue;
    const unit = Number(p.price);
    subtotal += unit * qty;
    items.push({ product_id: p.id, name: p.name, unit_price: unit, quantity: qty });
  }
  if (items.length === 0)
    return res.status(400).json({ error: "Aucun produit disponible dans le panier." });

  // Minimum de commande (sur la valeur produits, avant livraison)
  if (subtotal < MIN_ORDER)
    return res.status(400).json({
      error: `Commande minimum ${MIN_ORDER} €. Il manque ${(MIN_ORDER - subtotal).toFixed(2)} €.`,
      minOrder: MIN_ORDER,
    });

  // Totaux (promo + frais de port), recalculés côté serveur
  const totals = await computeTotals(subtotal, b.promoCode);

  // Cours BTC indicatif (le montant exact sera fixé par la facture BTCPay)
  let btcRate = null, btcAmount = null;
  try { btcRate = await getBtcEurRate(); btcAmount = +(totals.total / btcRate).toFixed(8); } catch {}

  // Utilisateur (connecté ou invité)
  let userId = req.user?.id || null;
  if (!userId) userId = (await findOrCreateGuest(email, b.fullName)).id;

  const reference = makeRef();
  const ins = await query(
    `INSERT INTO orders
      (reference,user_id,email,full_name,shipping_address,city,zip,country,phone,note,
       payment_method,subtotal,shipping,discount,promo_code,total,btc_amount,btc_rate,status)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'crypto',$11,$12,$13,$14,$15,$16,$17,'awaiting_payment')
     RETURNING *`,
    [
      reference, userId, email, b.fullName || null, b.address || null, b.city || null,
      b.zip || null, b.country || null, b.phone || null, b.note || null,
      totals.subtotal, totals.shipping, totals.discount, totals.promoCode,
      totals.total, btcAmount, btcRate,
    ]
  );
  const order = ins.rows[0];
  for (const it of items) {
    await query(
      "INSERT INTO order_items (order_id,product_id,name,unit_price,quantity) VALUES ($1,$2,$3,$4,$5)",
      [order.id, it.product_id, it.name, it.unit_price, it.quantity]
    );
  }
  order.items = items;

  // --- Facture de paiement (NOWPayments en priorité, sinon BTCPay) ---
  let checkoutLink = null;
  const site = process.env.SITE_URL || `${req.protocol}://${req.get("host")}`;
  try {
    let invoice = null;
    if (nowpaymentsConfigured()) {
      const inv = await npCreateInvoice({
        orderRef: reference,
        amountEur: totals.total,
        description: `Commande NEXUS ${reference}`,
        ipnUrl: `${site}/api/nowpayments/ipn`,
        successUrl: `${site}/merci.html?ref=${reference}`,
        cancelUrl: `${site}/checkout.html`,
      });
      if (inv) invoice = { id: inv.id, link: inv.url };
    } else if (btcpayConfigured()) {
      const inv = await btcpayCreateInvoice({
        orderRef: reference,
        amountEur: totals.total,
        email,
        redirectUrl: `${site}/merci.html?ref=${reference}`,
      });
      if (inv) invoice = { id: inv.id, link: inv.checkoutLink };
    }
    if (invoice) {
      checkoutLink = invoice.link;
      await query(
        "UPDATE orders SET btcpay_invoice_id=$1, btcpay_checkout_link=$2 WHERE id=$3",
        [invoice.id, invoice.link, order.id]
      );
      order.btcpay_checkout_link = invoice.link;
    }
  } catch (e) {
    console.error("[paiement] création facture:", e?.message || e);
  }

  // --- Google Sheet (même feuille que le bot) ---
  if (sheetsConfigured()) appendOrderRow(order).catch((e) => console.error("sheet:", e));

  // --- Email de confirmation ---
  sendOrderReceived(order).catch((e) => console.error("email order:", e));

  res.json({
    ok: true,
    reference,
    total: Number(totals.total),
    discount: totals.discount,
    shipping: totals.shipping,
    btcAmount,
    checkoutLink, // le front redirige vers BTCPay si présent
  });
}

// Enrichit les commandes avec le suivi lu en direct dans la Google Sheet
// (Statut, Transporteur, N° de suivi → lien de suivi cliquable).
async function enrichTracking(orders) {
  if (!sheetsConfigured() || !orders.length) return;
  try {
    const map = await getOrdersTrackingMap();
    for (const o of orders) {
      const t = map.get(o.reference);
      if (!t) continue;
      if (t.statusLabel) o.statusLabel = t.statusLabel;
      if (t.carrier) o.carrier = t.carrier;
      if (t.tracking) {
        o.tracking = t.tracking;
        o.trackingUrl = trackingUrl(t.carrier, t.tracking, o.zip);
      }
    }
  } catch (e) {
    console.error("[orders] enrichissement suivi:", e?.message || e);
  }
}

// GET /api/orders/mine
export async function myOrders(req, res) {
  const r = await query("SELECT * FROM orders WHERE user_id=$1 ORDER BY created_at DESC", [req.user.id]);
  const orders = r.rows;
  for (const o of orders) {
    o.items = (await query("SELECT * FROM order_items WHERE order_id=$1", [o.id])).rows;
  }
  await enrichTracking(orders);
  res.json({ orders });
}

// GET /api/orders/:reference?email=...
export async function trackOrder(req, res) {
  const { reference } = req.params;
  const { email } = req.query;
  const r = await query("SELECT * FROM orders WHERE reference=$1", [reference]);
  const order = r.rows[0];
  if (!order) return res.status(404).json({ error: "Commande introuvable." });
  if (!req.user && (!email || email.toLowerCase() !== order.email.toLowerCase()))
    return res.status(403).json({ error: "Email requis pour consulter cette commande." });
  order.items = (await query("SELECT * FROM order_items WHERE order_id=$1", [order.id])).rows;
  await enrichTracking([order]);
  res.json({ order });
}
