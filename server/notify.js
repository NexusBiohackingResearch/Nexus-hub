// ============================================================
// NEXUS — Notifications propriétaire (Telegram)
// Envoie un message instantané sur le téléphone du propriétaire :
//   - 🛒 nouvelle commande passée (en attente de paiement)
//   - ✅ paiement reçu (argent encaissé)
//
// Config (variables d'env Railway) :
//   TELEGRAM_BOT_TOKEN      = jeton du bot (créé via @BotFather)
//   TELEGRAM_ADMIN_CHAT_ID  = ton chat id (via @userinfobot)
// Sans ces variables : no-op silencieux (aucun crash).
// ============================================================
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "";
const CHAT_ID = process.env.TELEGRAM_ADMIN_CHAT_ID || "";

export function notifyConfigured() {
  return Boolean(BOT_TOKEN && CHAT_ID);
}

const esc = (s = "") =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function itemsLines(order) {
  return (order.items || [])
    .map((i) => `• ${esc(i.name)} × ${i.quantity} — ${(Number(i.unit_price) * i.quantity).toFixed(2)} €`)
    .join("\n");
}

async function sendTelegram(text) {
  if (!notifyConfigured()) {
    console.log("[notify:DÉMO] (Telegram non configuré)\n" + text.replace(/<[^>]+>/g, ""));
    return;
  }
  try {
    const r = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: CHAT_ID,
        text,
        parse_mode: "HTML",
        disable_web_page_preview: true,
      }),
    });
    if (!r.ok) console.error("[notify] Telegram HTTP", r.status, await r.text().catch(() => ""));
  } catch (e) {
    console.error("[notify] Telegram échec:", e?.message || e);
  }
}

// 🛒 Nouvelle commande (au checkout, avant paiement)
export async function notifyNewOrder(order) {
  const lignes = itemsLines(order);
  const lieu = [order.city, order.country].filter(Boolean).join(", ");
  const text =
    `🛒 <b>Nouvelle commande</b> ${esc(order.reference)}\n` +
    `<b>${Number(order.total).toFixed(2)} €</b> — en attente de paiement\n\n` +
    `${lignes}\n\n` +
    `👤 ${esc(order.full_name || "—")} (${esc(order.email)})` +
    (lieu ? `\n📍 ${esc(lieu)}` : "") +
    (order.promo_code ? `\n🏷️ Code promo : ${esc(order.promo_code)}` : "");
  return sendTelegram(text);
}

// ❌ Commande annulée par le client
export async function notifyCancelled(order) {
  const text =
    `❌ <b>Commande annulée</b> ${esc(order.reference)}\n` +
    `<b>${Number(order.total).toFixed(2)} €</b> — annulée par le client\n\n` +
    `👤 ${esc(order.full_name || "—")} (${esc(order.email)})`;
  return sendTelegram(text);
}

// ✅ Paiement reçu (webhook confirmé)
export async function notifyPaid(order) {
  const lignes = itemsLines(order);
  const text =
    `✅ <b>Paiement reçu</b> ${esc(order.reference)}\n` +
    `<b>${Number(order.total).toFixed(2)} €</b> encaissés 🎉\n\n` +
    `${lignes}\n\n` +
    `👤 ${esc(order.full_name || "—")} (${esc(order.email)})\n` +
    `➡️ À préparer / expédier.`;
  return sendTelegram(text);
}
