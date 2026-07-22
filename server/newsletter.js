// ============================================================
// NEXUS — Inscription newsletter (pop-up)
// Stocke l'e-mail en base (newsletter_subscribers) et renvoie/e-maile
// le code de bienvenue (code FIXE, à créer + activer dans le Sheet Codes Promo).
// ============================================================
import { query } from "./db.js";
import { checkPromo } from "./promo.js";
import { sendNewsletterCode } from "./email.js";

const emailOk = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e || "");
const NEWSLETTER_CODE = process.env.NEWSLETTER_PROMO_CODE || "BIENVENUE10";

// POST /api/newsletter  { email }
export async function subscribe(req, res) {
  const email = String(req.body?.email || "").trim().toLowerCase();
  if (!emailOk(email)) return res.status(400).json({ error: "Email invalide." });

  // Enregistre (ignore si déjà inscrit)
  await query(
    `INSERT INTO newsletter_subscribers (email, promo_code, source)
     VALUES ($1,$2,'popup') ON CONFLICT (email) DO NOTHING`,
    [email, NEWSLETTER_CODE]
  );

  // % de réduction lu depuis le Sheet (si le code est actif)
  let pct = 0;
  try { const p = await checkPromo(NEWSLETTER_CODE); if (p.valid) pct = p.reduction; } catch {}

  // E-mail du code (non bloquant)
  sendNewsletterCode(email, NEWSLETTER_CODE, pct).catch((e) => console.error("news email:", e?.message || e));

  res.json({ ok: true, code: NEWSLETTER_CODE, reductionPct: pct });
}
