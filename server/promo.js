// ============================================================
// NEXUS — Codes promo + frais de port (logique reprise du bot)
// Codes lus depuis data/promo.json (éditable à la main).
// ============================================================
import { getPromos } from "./catalog.js";

export const FRAIS_PORT = Number(process.env.FRAIS_PORT || 12);
export const SEUIL_GRATUIT = Number(process.env.SEUIL_GRATUIT || 150);
export const MIN_ORDER = Number(process.env.MIN_ORDER || 30);

// Valide un code et renvoie { valid, reduction, influenceur, code } | { valid:false }
export async function checkPromo(code) {
  if (!code) return { valid: false };
  const map = await getPromos();
  const key = String(code).trim().toUpperCase();
  if (map[key]) return { valid: true, code: key, ...map[key] };
  return { valid: false };
}

// Remise "1 acheté = 1 offert" (b1g1) / "2 achetés = 1 offert" (b2g1) par produit.
// lines: [{ unit_price, quantity, bogo }]. On offre les unités du MÊME produit.
export function computeBogoDiscount(lines) {
  let discount = 0, freeCount = 0;
  const details = [];
  for (const l of lines || []) {
    const qty = Math.max(0, parseInt(l.quantity, 10) || 0);
    const price = Number(l.unit_price) || 0;
    let free = 0;
    if (l.bogo === "b1g1") free = Math.floor(qty / 2);
    else if (l.bogo === "b2g1") free = Math.floor(qty / 3);
    if (free > 0) {
      discount += free * price;
      freeCount += free;
      details.push({ name: l.name, free, bogo: l.bogo });
    }
  }
  return { discount: +discount.toFixed(2), freeCount, details };
}

// Calcule le total : sous-total, remise (BOGO + code %), frais de port, total.
// bogoDiscount = montant offert par les offres produit (calculé en amont depuis le panier).
export async function computeTotals(subtotal, promoCode, bogoDiscount = 0) {
  const promo = await checkPromo(promoCode);
  const bogo = +(Number(bogoDiscount) || 0).toFixed(2);
  const promoBase = Math.max(0, subtotal - bogo);                 // le % ne s'applique pas sur l'offert
  const promoDiscount = promo.valid ? +(promoBase * (promo.reduction / 100)).toFixed(2) : 0;
  const discount = +(bogo + promoDiscount).toFixed(2);
  const afterDiscount = +(subtotal - discount).toFixed(2);
  const shipping = afterDiscount >= SEUIL_GRATUIT ? 0 : FRAIS_PORT;
  const total = +(afterDiscount + shipping).toFixed(2);
  return {
    subtotal: +subtotal.toFixed(2),
    discount,
    bogoDiscount: bogo,
    promoDiscount,
    shipping,
    total,
    promoValid: promo.valid,
    promoCode: promo.valid ? promo.code : null,
    influenceur: promo.valid ? promo.influenceur : null,
    reductionPct: promo.valid ? promo.reduction : 0,
  };
}
