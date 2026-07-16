// ============================================================
// NEXUS — Intégration NOWPayments (carte + crypto)
// - createInvoice : page de paiement hébergée (client choisit BTC/USDT/carte)
// - verifyIpn     : vérifie la signature HMAC-SHA512 de l'IPN
// Config via variables d'environnement (voir .env.example).
// ============================================================
import crypto from "node:crypto";

const API = (process.env.NOWPAYMENTS_API_URL || "https://api.nowpayments.io/v1").replace(/\/+$/, "");
const API_KEY = process.env.NOWPAYMENTS_API_KEY || "";
const IPN_SECRET = process.env.NOWPAYMENTS_IPN_SECRET || "";

export const nowpaymentsConfigured = () => Boolean(API_KEY);

// Crée une facture hébergée. Retourne { id, url } ou null si non configuré.
export async function createInvoice({ orderRef, amountEur, description, ipnUrl, successUrl, cancelUrl }) {
  if (!nowpaymentsConfigured()) return null;
  const res = await fetch(`${API}/invoice`, {
    method: "POST",
    headers: { "x-api-key": API_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({
      price_amount: Number(Number(amountEur).toFixed(2)),
      price_currency: "eur",
      order_id: orderRef,
      order_description: description || `Commande NEXUS ${orderRef}`,
      ipn_callback_url: ipnUrl,
      success_url: successUrl,
      cancel_url: cancelUrl,
      is_fee_paid_by_user: false,
    }),
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`NOWPayments ${res.status}: ${t.slice(0, 200)}`);
  }
  const inv = await res.json();
  return { id: inv.id, url: inv.invoice_url };
}

// Trie récursivement les clés d'un objet (requis pour la signature IPN).
function sortObject(obj) {
  if (Array.isArray(obj)) return obj.map(sortObject);
  if (obj && typeof obj === "object") {
    return Object.keys(obj).sort().reduce((acc, k) => {
      acc[k] = sortObject(obj[k]);
      return acc;
    }, {});
  }
  return obj;
}

// Vérifie la signature de l'IPN (header x-nowpayments-sig = HMAC-SHA512 du JSON trié).
export function verifyIpn(rawBody, signatureHeader) {
  if (!IPN_SECRET) return true; // dev : pas de secret configuré → on ne bloque pas
  if (!signatureHeader) return false;
  let parsed;
  try { parsed = JSON.parse(rawBody.toString("utf8")); } catch { return false; }
  const sorted = JSON.stringify(sortObject(parsed));
  const hmac = crypto.createHmac("sha512", IPN_SECRET).update(sorted).digest("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(hmac), Buffer.from(signatureHeader));
  } catch {
    return false;
  }
}
