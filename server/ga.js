// ============================================================
// NEXUS — Google Analytics 4 côté serveur (Measurement Protocol)
// Envoie l'événement "purchase" quand un paiement est confirmé (webhook),
// pour que GA4 comptabilise le chiffre d'affaires même si le client ne
// revient jamais sur la page de remerciement (cas fréquent en crypto).
//
// Config (variables d'env Railway) :
//   GA_MEASUREMENT_ID  = G-SH4X50V40H
//   GA_API_SECRET      = (GA4 → Admin → Flux de données → Protocole de mesure)
// Sans ces variables : no-op silencieux (aucun crash).
// ============================================================
const MEASUREMENT_ID = process.env.GA_MEASUREMENT_ID || "";
const API_SECRET = process.env.GA_API_SECRET || "";

export function gaConfigured() {
  return Boolean(MEASUREMENT_ID && API_SECRET);
}

// Génère un client_id de repli (si la commande n'en a pas capturé un côté navigateur)
function fallbackClientId(order) {
  const seed = String(order?.id || order?.reference || "0");
  return `${Date.now()}.${seed}`.replace(/[^0-9.]/g, "");
}

// Envoie l'événement purchase à GA4
export async function sendPurchase(order) {
  if (!gaConfigured()) return;
  try {
    const items = (order.items || []).map((it) => ({
      item_id: it.product_id,
      item_name: it.name,
      price: Number(it.unit_price) || 0,
      quantity: Number(it.quantity) || 1,
    }));

    const body = {
      client_id: order.ga_client_id || fallbackClientId(order),
      // non_personalized_ads laissé par défaut
      events: [
        {
          name: "purchase",
          params: {
            transaction_id: order.reference,
            currency: order.currency || "EUR",
            value: Number(order.total) || 0,
            shipping: Number(order.shipping) || 0,
            coupon: order.promo_code || undefined,
            items,
          },
        },
      ],
    };

    const url =
      `https://www.google-analytics.com/mp/collect` +
      `?measurement_id=${encodeURIComponent(MEASUREMENT_ID)}` +
      `&api_secret=${encodeURIComponent(API_SECRET)}`;

    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    // GA renvoie 204 No Content en cas de succès
    if (!r.ok && r.status !== 204) {
      console.error("[ga] purchase HTTP", r.status);
    } else {
      console.log(`[ga] purchase envoyé pour ${order.reference} (${Number(order.total).toFixed(2)} €)`);
    }
  } catch (e) {
    console.error("[ga] purchase échec:", e?.message || e);
  }
}
