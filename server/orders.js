// ============================================================
// NEXUS — Routes commandes
// Flux : panier → promo/frais → facture BTCPay → Google Sheet → email
// ============================================================
import { query } from "./db.js";
import { findOrCreateGuest } from "./auth.js";
import { sendOrderReceived } from "./email.js";
import { computeTotals, MIN_ORDER, checkPromo, computeBogoDiscount } from "./promo.js";
import { sendLoyaltyCode } from "./email.js";
import { getBtcEurRate } from "./rate.js";
import { createInvoice as btcpayCreateInvoice, btcpayConfigured } from "./btcpay.js";
import { createInvoice as npCreateInvoice, nowpaymentsConfigured } from "./nowpayments.js";
import { appendOrderRow, sheetsConfigured, getOrdersTrackingMap, trackingUrl, updateOrderStatus } from "./sheets.js";
import { getProducts } from "./catalog.js";
import { notifyNewOrder, notifyCancelled } from "./notify.js";

function makeRef() {
  const s = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let r = "";
  for (let i = 0; i < 6; i++) r += s[Math.floor(Math.random() * s.length)];
  return "NX-" + r;
}
const emailOk = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e || "");
const LOYALTY_CODE = process.env.LOYALTY_PROMO_CODE || "MERCI10";

// Envoie le code fidélité si c'est la PREMIÈRE commande payée de ce client.
// Appelé depuis le webhook après passage en statut "payment_received".
export async function grantLoyaltyIfFirstOrder(order) {
  try {
    const r = await query(
      "SELECT COUNT(*)::int AS n FROM orders WHERE lower(email)=lower($1) AND status IN ('payment_received','shipped')",
      [order.email]
    );
    if ((r.rows[0]?.n || 0) !== 1) return; // pas la première commande payée
    let pct = 0;
    try { const p = await checkPromo(LOYALTY_CODE); if (p.valid) pct = p.reduction; } catch {}
    await sendLoyaltyCode(order, LOYALTY_CODE, pct);
    console.log(`[loyalty] code ${LOYALTY_CODE} envoyé à ${order.email} (1ère commande payée)`);
  } catch (e) {
    console.error("[loyalty]", e?.message || e);
  }
}

// POST /api/quote  { items:[{id,quantity}], promoCode }
// Renvoie sous-total, remise, frais, total, + estimation BTC (sans créer de commande).
export async function quote(req, res) {
  const b = req.body || {};
  const catalog = await getProducts();
  const byId = new Map(catalog.map((p) => [p.id, p]));
  let subtotal = 0;
  const lines = [];
  for (const line of b.items || []) {
    const p = byId.get(line.id);
    if (!p || p.available === false) continue;
    const qty = Math.max(1, Math.min(99, parseInt(line.quantity, 10) || 1));
    subtotal += Number(p.price) * qty;
    lines.push({ name: p.name, unit_price: Number(p.price), quantity: qty, bogo: p.bogo || null });
  }
  const bogo = computeBogoDiscount(lines);
  const totals = await computeTotals(subtotal, b.promoCode, bogo.discount);
  let btc = null, rate = null;
  try { rate = await getBtcEurRate(); btc = totals.total / rate; } catch {}
  res.json({ ...totals, bogoFreeCount: bogo.freeCount, btcRate: rate, btcAmount: btc, minOrder: MIN_ORDER, belowMin: subtotal < MIN_ORDER });
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
    items.push({ product_id: p.id, name: p.name, unit_price: unit, quantity: qty, bogo: p.bogo || null });
  }
  if (items.length === 0)
    return res.status(400).json({ error: "Aucun produit disponible dans le panier." });

  // Minimum de commande (sur la valeur produits, avant livraison)
  if (subtotal < MIN_ORDER)
    return res.status(400).json({
      error: `Commande minimum ${MIN_ORDER} €. Il manque ${(MIN_ORDER - subtotal).toFixed(2)} €.`,
      minOrder: MIN_ORDER,
    });

  // Totaux (BOGO + promo + frais de port), recalculés côté serveur
  const bogo = computeBogoDiscount(items);
  const totals = await computeTotals(subtotal, b.promoCode, bogo.discount);

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
       payment_method,subtotal,shipping,discount,promo_code,total,btc_amount,btc_rate,ga_client_id,status)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'crypto',$11,$12,$13,$14,$15,$16,$17,$18,'awaiting_payment')
     RETURNING *`,
    [
      reference, userId, email, b.fullName || null, b.address || null, b.city || null,
      b.zip || null, b.country || null, b.phone || null, b.note || null,
      totals.subtotal, totals.shipping, totals.discount, totals.promoCode,
      totals.total, btcAmount, btcRate, b.gaClientId || null,
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

  // --- Notification propriétaire (Telegram) : nouvelle commande ---
  notifyNewOrder(order).catch((e) => console.error("notify order:", e));

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

// POST /api/orders/:reference/cancel   (body/query: email pour les invités)
// Autorisé uniquement tant que la commande est en attente de paiement.
export async function cancelOrder(req, res) {
  const { reference } = req.params;
  const email = req.body?.email || req.query.email;
  const r = await query("SELECT * FROM orders WHERE reference=$1", [reference]);
  const order = r.rows[0];
  if (!order) return res.status(404).json({ error: "Commande introuvable." });

  // Contrôle d'accès : propriétaire connecté OU invité avec le bon email
  const owns = req.user && order.user_id === req.user.id;
  const guestOk = !req.user && email && email.toLowerCase() === order.email.toLowerCase();
  if (!owns && !guestOk)
    return res.status(403).json({ error: "Email requis pour annuler cette commande." });

  if (order.status === "cancelled")
    return res.json({ ok: true, status: "cancelled" }); // déjà annulée
  if (order.status !== "awaiting_payment")
    return res.status(400).json({ error: "Cette commande ne peut plus être annulée (paiement déjà en cours ou expédiée)." });

  const upd = await query(
    "UPDATE orders SET status='cancelled', updated_at=now() WHERE id=$1 RETURNING *",
    [order.id]
  );
  const updated = upd.rows[0];
  updated.items = (await query("SELECT * FROM order_items WHERE order_id=$1", [order.id])).rows;

  // Google Sheet : statut "Annulé" (colonne Statut)
  if (sheetsConfigured())
    updateOrderStatus(reference, "Annulé").catch((e) => console.error("[sheet] annulation:", e?.message || e));
  // Notification propriétaire
  notifyCancelled(updated).catch((e) => console.error("notify cancel:", e));

  res.json({ ok: true, status: "cancelled" });
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
