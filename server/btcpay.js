// ============================================================
// NEXUS — Intégration BTCPay Server (API Greenfield)
// - createInvoice : crée une facture crypto pour une commande
// - verifyWebhook : vérifie la signature HMAC du webhook BTCPay
// Config via variables d'environnement (voir .env.example).
// ============================================================
import crypto from "node:crypto";

const URL = (process.env.BTCPAY_URL || "").replace(/\/+$/, "");
const STORE_ID = process.env.BTCPAY_STORE_ID || "";
const API_KEY = process.env.BTCPAY_API_KEY || "";
const WEBHOOK_SECRET = process.env.BTCPAY_WEBHOOK_SECRET || "";

export const btcpayConfigured = () => Boolean(URL && STORE_ID && API_KEY);

// Crée une facture BTCPay. Retourne { id, checkoutLink } ou null si non configuré.
export async function createInvoice({ orderRef, amountEur, email, redirectUrl }) {
  if (!btcpayConfigured()) return null;
  const res = await fetch(`${URL}/api/v1/stores/${STORE_ID}/invoices`, {
    method: "POST",
    headers: {
      Authorization: `token ${API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amount: Number(amountEur).toFixed(2),
      currency: "EUR",
      metadata: { orderId: orderRef, buyerEmail: email, itemDesc: `Commande NEXUS ${orderRef}` },
      checkout: {
        redirectURL: redirectUrl,
        redirectAutomatically: true,
        expirationMinutes: 60,
      },
    }),
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`BTCPay ${res.status}: ${txt.slice(0, 200)}`);
  }
  const inv = await res.json();
  return { id: inv.id, checkoutLink: inv.checkoutLink, status: inv.status };
}

// Récupère le détail d'une facture (montant crypto, taux) après paiement.
export async function getInvoicePaymentInfo(invoiceId) {
  if (!btcpayConfigured() || !invoiceId) return null;
  try {
    const res = await fetch(
      `${URL}/api/v1/stores/${STORE_ID}/invoices/${invoiceId}/payment-methods`,
      { headers: { Authorization: `token ${API_KEY}` } }
    );
    if (!res.ok) return null;
    const methods = await res.json();
    const btc = methods.find((m) => (m.paymentMethod || m.cryptoCode || "").toUpperCase().includes("BTC")) || methods[0];
    if (!btc) return null;
    return {
      btcAmount: Number(btc.amount || btc.totalPaid || 0) || null,
      btcRate: Number(btc.rate || 0) || null,
    };
  } catch {
    return null;
  }
}

// Vérifie la signature du webhook. rawBody = corps brut (Buffer/string).
export function verifyWebhook(rawBody, signatureHeader) {
  if (!WEBHOOK_SECRET) return true; // si pas de secret configuré, on ne bloque pas (dev)
  if (!signatureHeader) return false;
  const expected =
    "sha256=" +
    crypto.createHmac("sha256", WEBHOOK_SECRET).update(rawBody).digest("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(signatureHeader), Buffer.from(expected));
  } catch {
    return false;
  }
}
