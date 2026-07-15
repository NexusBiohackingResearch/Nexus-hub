// ============================================================
// NEXUS — Routes admin (gestion des commandes)
// Protégées par requireAdmin (voir index.js)
// ============================================================
import { query } from "./db.js";
import { sendPaymentConfirmed, sendShipped } from "./email.js";
import { updateOrderStatus } from "./sheets.js";

const SHEET_LABEL = {
  awaiting_payment: "En attente", payment_received: "Payé",
  shipped: "Expédiée", cancelled: "Annulée",
};
function frNow() {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris",
  }).format(new Date()).replace(",", "");
}

const VALID = ["awaiting_payment", "payment_received", "shipped", "cancelled"];

// GET /api/admin/orders?status=...
export async function listOrders(req, res) {
  const { status } = req.query;
  const params = [];
  let sql = "SELECT * FROM orders";
  if (status && VALID.includes(status)) {
    params.push(status);
    sql += " WHERE status=$1";
  }
  sql += " ORDER BY created_at DESC LIMIT 300";
  const r = await query(sql, params);
  const orders = r.rows;
  for (const o of orders) {
    const items = await query("SELECT * FROM order_items WHERE order_id=$1", [o.id]);
    o.items = items.rows;
  }
  res.json({ orders });
}

// GET /api/admin/stats
export async function stats(_req, res) {
  const r = await query(`
    SELECT
      COUNT(*) FILTER (WHERE status='awaiting_payment')  AS awaiting,
      COUNT(*) FILTER (WHERE status='payment_received')  AS paid,
      COUNT(*) FILTER (WHERE status='shipped')           AS shipped,
      COALESCE(SUM(total) FILTER (WHERE status IN ('payment_received','shipped')),0) AS revenue
    FROM orders
  `);
  res.json(r.rows[0]);
}

// POST /api/admin/orders/:id/status  { status, tracking? }
// Déclenche automatiquement l'email correspondant.
export async function updateStatus(req, res) {
  const { id } = req.params;
  const { status, tracking } = req.body || {};
  if (!VALID.includes(status))
    return res.status(400).json({ error: "Statut invalide." });

  const cur = await query("SELECT * FROM orders WHERE id=$1", [id]);
  const order = cur.rows[0];
  if (!order) return res.status(404).json({ error: "Commande introuvable." });

  const upd = await query(
    "UPDATE orders SET status=$1, tracking=COALESCE($2,tracking), updated_at=now() WHERE id=$3 RETURNING *",
    [status, tracking || null, id]
  );
  const updated = upd.rows[0];
  const items = await query("SELECT * FROM order_items WHERE order_id=$1", [id]);
  updated.items = items.rows;

  // Emails automatiques selon le nouveau statut (seulement si transition réelle)
  if (status === "payment_received" && order.status !== "payment_received") {
    sendPaymentConfirmed(updated).catch((e) => console.error("email paid:", e));
    updateOrderStatus(updated.reference, "Payé", frNow()).catch((e) => console.error("sheet:", e));
  } else if (status === "shipped" && order.status !== "shipped") {
    sendShipped(updated).catch((e) => console.error("email shipped:", e));
    updateOrderStatus(updated.reference, "Expédiée").catch((e) => console.error("sheet:", e));
  } else {
    updateOrderStatus(updated.reference, SHEET_LABEL[status] || status).catch(() => {});
  }

  res.json({ ok: true, order: updated });
}
