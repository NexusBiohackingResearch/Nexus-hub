// ============================================================
// NEXUS — Webhook BTCPay
// BTCPay appelle cette route quand une facture est payée/réglée.
// On vérifie la signature, on marque la commande payée, on envoie
// l'email de confirmation et on met à jour le Google Sheet.
// (Monté avec express.raw dans index.js pour vérifier la signature.)
// ============================================================
import { query } from "./db.js";
import { verifyWebhook, getInvoicePaymentInfo } from "./btcpay.js";
import { verifyIpn } from "./nowpayments.js";
import { sendPaymentConfirmed } from "./email.js";
import { updateOrderStatus } from "./sheets.js";
import { sendPurchase } from "./ga.js";
import { notifyPaid } from "./notify.js";

function frNow() {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris",
  }).format(new Date()).replace(",", "");
}

// ---------- IPN NOWPayments ----------
const NP_PAID = new Set(["finished"]);            // paiement complet + réglé
const NP_PARTIAL = new Set(["partially_paid"]);   // sous-payé (à surveiller)

export async function nowpaymentsIpn(req, res) {
  const raw = req.body; // Buffer (express.raw)
  const sig = req.get("x-nowpayments-sig");
  if (!verifyIpn(raw, sig)) {
    console.warn("[np-ipn] signature invalide");
    return res.status(400).send("bad signature");
  }
  let evt;
  try { evt = JSON.parse(raw.toString("utf8")); } catch { return res.status(400).send("bad json"); }

  res.status(200).send("ok"); // on répond vite à NOWPayments

  try {
    const status = evt.payment_status;
    const ref = evt.order_id;
    if (!ref) return;
    if (NP_PARTIAL.has(status)) { console.warn(`[np-ipn] ${ref} sous-payé`); return; }
    if (!NP_PAID.has(status)) return;

    const r = await query("SELECT * FROM orders WHERE reference=$1", [ref]);
    const order = r.rows[0];
    if (!order) { console.warn("[np-ipn] commande introuvable:", ref); return; }
    if (order.status === "payment_received" || order.status === "shipped") return; // déjà traité

    const upd = await query(
      `UPDATE orders SET status='payment_received', paid_at=now(),
        btc_amount=COALESCE($1,btc_amount)
       WHERE id=$2 RETURNING *`,
      [evt.pay_amount ? Number(evt.pay_amount) : null, order.id]
    );
    const updated = upd.rows[0];
    updated.items = (await query("SELECT * FROM order_items WHERE order_id=$1", [order.id])).rows;

    sendPaymentConfirmed(updated).catch((e) => console.error("email paid:", e));
    updateOrderStatus(ref, "Payé", frNow()).catch((e) => console.error("sheet:", e));
    sendPurchase(updated).catch((e) => console.error("ga purchase:", e));        // GA4 e-commerce
    notifyPaid(updated).catch((e) => console.error("notify paid:", e));          // Telegram
    console.log(`[np-ipn] commande ${ref} payée ✓ (${status})`);
  } catch (e) {
    console.error("[np-ipn] traitement:", e?.message || e);
  }
}

const PAID_EVENTS = new Set(["InvoiceSettled", "InvoicePaymentSettled", "InvoiceProcessing"]);

export async function btcpayWebhook(req, res) {
  const raw = req.body; // Buffer (express.raw)
  const sig = req.get("BTCPay-Sig");
  if (!verifyWebhook(raw, sig)) {
    console.warn("[webhook] signature invalide");
    return res.status(400).send("bad signature");
  }

  let evt;
  try { evt = JSON.parse(raw.toString("utf8")); } catch { return res.status(400).send("bad json"); }

  // On répond vite à BTCPay, le traitement peut continuer ensuite
  res.status(200).send("ok");

  try {
    if (!PAID_EVENTS.has(evt.type)) return;
    const invoiceId = evt.invoiceId;
    if (!invoiceId) return;

    const r = await query("SELECT * FROM orders WHERE btcpay_invoice_id=$1", [invoiceId]);
    const order = r.rows[0];
    if (!order) { console.warn("[webhook] commande introuvable pour", invoiceId); return; }
    if (order.status === "payment_received" || order.status === "shipped") return; // déjà traité

    // Récupère le montant crypto réel réglé
    const info = await getInvoicePaymentInfo(invoiceId);

    const upd = await query(
      `UPDATE orders SET status='payment_received', paid_at=now(),
        btc_amount=COALESCE($1,btc_amount), btc_rate=COALESCE($2,btc_rate)
       WHERE id=$3 RETURNING *`,
      [info?.btcAmount || null, info?.btcRate || null, order.id]
    );
    const updated = upd.rows[0];
    updated.items = (await query("SELECT * FROM order_items WHERE order_id=$1", [order.id])).rows;

    // Email de confirmation automatique
    sendPaymentConfirmed(updated).catch((e) => console.error("email paid:", e));

    // Google Sheet : statut "Payé" + date
    const paidDate = new Intl.DateTimeFormat("fr-FR", {
      day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris",
    }).format(new Date()).replace(",", "");
    updateOrderStatus(order.reference, "Payé", paidDate).catch((e) => console.error("sheet:", e));
    sendPurchase(updated).catch((e) => console.error("ga purchase:", e));        // GA4 e-commerce
    notifyPaid(updated).catch((e) => console.error("notify paid:", e));          // Telegram

    console.log(`[webhook] commande ${order.reference} payée ✓`);
  } catch (e) {
    console.error("[webhook] traitement:", e?.message || e);
  }
}
