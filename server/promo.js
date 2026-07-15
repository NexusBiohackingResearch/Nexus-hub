// ============================================================
// NEXUS — Codes promo + frais de port (logique reprise du bot)
// Codes lus depuis data/promo.json (éditable à la main).
// ============================================================
import { getPromos } from "./catalog.js";

export const FRAIS_PORT = Number(process.env.FRAIS_PORT || 12);
export const SEUIL_GRATUIT = Number(process.env.SEUIL_GRATUIT || 150);

// Valide un code et renvoie { valid, reduction, influenceur, code } | { valid:false }
export async function checkPromo(code) {
  if (!code) return { valid: false };
  const map = await getPromos();
  const key = String(code).trim().toUpperCase();
  if (map[key]) return { valid: true, code: key, ...map[key] };
  return { valid: false };
}

// Calcule le total : sous-total, remise, frais de port, total final.
export async function computeTotals(subtotal, promoCode) {
  const promo = await checkPromo(promoCode);
  const discount = promo.valid ? +(subtotal * (promo.reduction / 100)).toFixed(2) : 0;
  const afterDiscount = subtotal - discount;
  const shipping = afterDiscount >= SEUIL_GRATUIT ? 0 : FRAIS_PORT;
  const total = +(afterDiscount + shipping).toFixed(2);
  return {
    subtotal: +subtotal.toFixed(2),
    discount,
    shipping,
    total,
    promoValid: promo.valid,
    promoCode: promo.valid ? promo.code : null,
    influenceur: promo.valid ? promo.influenceur : null,
    reductionPct: promo.valid ? promo.reduction : 0,
  };
}
