// ============================================================
// NEXUS — Emails transactionnels (Resend)
// Si RESEND_API_KEY n'est pas configuré, les emails sont
// simplement écrits dans la console (mode démo, aucun crash).
// ============================================================
import { Resend } from "resend";

const KEY = process.env.RESEND_API_KEY;
const FROM = process.env.EMAIL_FROM || "NEXUS <onboarding@resend.dev>";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "";
const SITE = process.env.SITE_URL || "";

const resend = KEY ? new Resend(KEY) : null;

async function send({ to, subject, html }) {
  if (!resend) {
    console.log(`\n[email:DÉMO] → ${to}\n  Sujet : ${subject}\n  (Ajoute RESEND_API_KEY pour l'envoi réel)\n`);
    return { demo: true };
  }
  try {
    const r = await resend.emails.send({ from: FROM, to, subject, html });
    console.log(`[email] envoyé à ${to} (${subject})`);
    return r;
  } catch (e) {
    console.error("[email] échec:", e?.message || e);
    return { error: true };
  }
}

// ---------- Gabarit visuel commun ----------
function shell(title, bodyHtml) {
  return `<!doctype html><html><body style="margin:0;background:#05070a;font-family:Arial,Helvetica,sans-serif;color:#eaf2f8">
  <div style="max-width:560px;margin:0 auto;padding:32px 24px">
    <div style="text-align:center;margin-bottom:28px">
      <img src="${(process.env.SITE_URL || "https://www.nexus-research-shop.com").replace(/\/$/, "")}/assets/images/nexus-logo.png"
           alt="NEXUS Biohacking Research" width="160"
           style="max-width:160px;height:auto;display:inline-block;border:0;outline:none;text-decoration:none">
    </div>
    <div style="background:#0a0e16;border:1px solid rgba(255,255,255,.08);border-radius:16px;padding:28px">
      <h1 style="font-size:20px;margin:0 0 16px;color:#fff">${title}</h1>
      ${bodyHtml}
    </div>
    <p style="font-size:11px;color:#5a6472;text-align:center;line-height:1.6;margin-top:24px">
      Produits destinés exclusivement à la recherche en laboratoire. Ni pour consommation humaine ou animale, ni usage thérapeutique.<br>
      © 2026 NEXUS Biohacking Research
    </p>
  </div></body></html>`;
}

function itemsTable(order) {
  const rows = order.items
    .map(
      (i) =>
        `<tr><td style="padding:8px 0;border-bottom:1px solid rgba(255,255,255,.06)">${i.name} <span style="color:#8a97a6">× ${i.quantity}</span></td>
         <td style="padding:8px 0;border-bottom:1px solid rgba(255,255,255,.06);text-align:right">${(i.unit_price * i.quantity).toFixed(2)} €</td></tr>`
    )
    .join("");
  return `<table style="width:100%;border-collapse:collapse;font-size:14px;margin:16px 0">
    ${rows}
    <tr><td style="padding:12px 0 0;font-weight:700">Total</td>
    <td style="padding:12px 0 0;text-align:right;font-weight:700;font-size:18px">${Number(order.total).toFixed(2)} €</td></tr>
  </table>`;
}

const btn = (href, label) =>
  `<a href="${href}" style="display:inline-block;padding:12px 24px;border-radius:100px;background:linear-gradient(90deg,#37f5a9,#22e0ff,#3d7bff,#a67cff);color:#04120c;font-weight:700;text-decoration:none">${label}</a>`;

// ---------- 1) Commande reçue (auto au checkout) ----------
export async function sendOrderReceived(order) {
  // Bloc de paiement adaptatif :
  //  1) passerelle active (lien de paiement) -> bouton "Payer maintenant"
  //  2) sinon, adresse crypto manuelle configurée -> instructions manuelles
  //  3) sinon -> message neutre (jamais de "adresse à configurer")
  const crypto = process.env.CRYPTO_BTC || "";
  const usdt = process.env.CRYPTO_USDT || "";
  let payBlock;
  if (order.btcpay_checkout_link) {
    payBlock = `
    <div style="background:rgba(34,224,255,.06);border:1px solid rgba(34,224,255,.2);border-radius:12px;padding:16px;margin:16px 0;text-align:center">
      <div style="font-size:12px;letter-spacing:2px;color:#22e0ff;margin-bottom:10px">PAIEMENT SÉCURISÉ</div>
      <div style="font-size:13px;color:#eaf2f8;line-height:1.7;margin-bottom:14px">
        Montant : <b>${Number(order.total).toFixed(2)} €</b>. Finalise ton règlement (carte ou crypto) sur la page sécurisée :
      </div>
      ${btn(order.btcpay_checkout_link, "Payer maintenant →")}
      <div style="font-size:12px;color:#8a97a6;margin-top:12px">Confirmation automatique dès réception du paiement.</div>
    </div>`;
  } else if (crypto) {
    payBlock = `
    <div style="background:rgba(34,224,255,.06);border:1px solid rgba(34,224,255,.2);border-radius:12px;padding:16px;margin:16px 0">
      <div style="font-size:12px;letter-spacing:2px;color:#22e0ff;margin-bottom:10px">INSTRUCTIONS DE PAIEMENT — CRYPTO</div>
      <div style="font-size:13px;color:#eaf2f8;line-height:1.7">
        Montant : <b>${Number(order.total).toFixed(2)} €</b> en équivalent crypto.<br>
        <b>Bitcoin (BTC)</b> :<br><code style="color:#37f5a9;word-break:break-all">${crypto}</code>
        ${usdt ? `<br><br><b>USDT (TRC20)</b> :<br><code style="color:#37f5a9;word-break:break-all">${usdt}</code>` : ""}
      </div>
      <div style="font-size:12px;color:#8a97a6;margin-top:12px">Indique bien ta référence <b style="color:#fff">${order.reference}</b> et réponds à cet email avec la preuve de transaction. Dès réception, tu recevras un email de confirmation.</div>
    </div>`;
  } else {
    payBlock = `
    <div style="background:rgba(34,224,255,.06);border:1px solid rgba(34,224,255,.2);border-radius:12px;padding:16px;margin:16px 0">
      <div style="font-size:12px;letter-spacing:2px;color:#22e0ff;margin-bottom:10px">PAIEMENT</div>
      <div style="font-size:13px;color:#eaf2f8;line-height:1.7">
        Montant : <b>${Number(order.total).toFixed(2)} €</b>. Les instructions de règlement te parviennent séparément — réponds à cet email si tu as la moindre question. Indique bien ta référence <b style="color:#fff">${order.reference}</b>.
      </div>
    </div>`;
  }
  const body = `
    <p style="color:#8a97a6;line-height:1.7">Bonjour${order.full_name ? " " + order.full_name : ""},<br>
    Ta commande <b style="color:#fff">${order.reference}</b> a bien été enregistrée. Voici le récapitulatif :</p>
    ${itemsTable(order)}
    ${payBlock}
    ${SITE ? `<p style="text-align:center;margin-top:8px">${btn(SITE + "/compte.html", "Suivre ma commande")}</p>` : ""}`;
  const out = await send({
    to: order.email,
    subject: `NEXUS — Commande ${order.reference} reçue`,
    html: shell("Merci pour ta commande 🧬", body),
  });
  // Notifie l'admin
  if (ADMIN_EMAIL) {
    await send({
      to: ADMIN_EMAIL,
      subject: `🔔 Nouvelle commande ${order.reference} — ${Number(order.total).toFixed(2)} €`,
      html: shell("Nouvelle commande", `<p style="color:#8a97a6">Client : ${order.email}</p>${itemsTable(order)}${SITE ? `<p>${btn(SITE + "/admin.html", "Ouvrir l'admin")}</p>` : ""}`),
    });
  }
  return out;
}

// ---------- 2) Paiement confirmé (déclenché par l'admin) ----------
export async function sendPaymentConfirmed(order) {
  const body = `
    <p style="color:#8a97a6;line-height:1.7">Bonjour${order.full_name ? " " + order.full_name : ""},<br>
    Nous confirmons la <b style="color:#37f5a9">bonne réception de ton paiement</b> pour la commande <b style="color:#fff">${order.reference}</b>. 🎉<br>
    Nous préparons ton envoi. Tu recevras un email dès l'expédition.</p>
    ${itemsTable(order)}`;
  return send({
    to: order.email,
    subject: `NEXUS — Paiement reçu ✓ (${order.reference})`,
    html: shell("Paiement confirmé ✓", body),
  });
}

// ---------- 3) Commande expédiée (optionnel) ----------
export async function sendShipped(order) {
  const track = order.tracking
    ? `<p style="color:#8a97a6">Numéro de suivi : <b style="color:#fff">${order.tracking}</b></p>`
    : "";
  const body = `
    <p style="color:#8a97a6;line-height:1.7">Bonjour${order.full_name ? " " + order.full_name : ""},<br>
    Ta commande <b style="color:#fff">${order.reference}</b> a été <b style="color:#37f5a9">expédiée</b>.</p>
    ${track}
    <p style="color:#8a97a6">Livraison estimée : 2–3 jours en France, variable en Europe.</p>`;
  return send({
    to: order.email,
    subject: `NEXUS — Commande expédiée 📦 (${order.reference})`,
    html: shell("Commande expédiée 📦", body),
  });
}

// ---------- Validation d'e-mail (à l'inscription) ----------
export async function sendVerify(user, link) {
  const body = `
    <p style="color:#8a97a6;line-height:1.7">Bonjour${user.full_name ? " " + user.full_name : ""},<br>
    Bienvenue chez NEXUS. Confirme ton adresse e-mail pour activer ton compte :</p>
    <p style="text-align:center;margin:24px 0">${btn(link, "Valider mon adresse e-mail")}</p>
    <p style="font-size:12px;color:#5a6472;line-height:1.6">Si le bouton ne fonctionne pas, copie ce lien dans ton navigateur :<br>
    <span style="color:#37f5a9;word-break:break-all">${link}</span></p>`;
  return send({ to: user.email, subject: "NEXUS — Confirme ton adresse e-mail", html: shell("Active ton compte 🧬", body) });
}

// ---------- Code de bienvenue newsletter ----------
export async function sendNewsletterCode(email, code, pct) {
  const pctTxt = pct ? ` (${pct}% de réduction)` : "";
  const body = `
    <p style="color:#8a97a6;line-height:1.7">Merci de ton inscription à la newsletter NEXUS ! 🧬<br>
    Voici ton code de bienvenue${pctTxt} :</p>
    <div style="text-align:center;margin:22px 0">
      <div style="display:inline-block;padding:14px 28px;border:1px dashed #22e0ff;border-radius:12px;font-family:'Space Grotesk',monospace;font-size:22px;font-weight:700;color:#37f5a9;letter-spacing:3px">${code}</div>
    </div>
    <p style="color:#8a97a6;text-align:center;font-size:13px">À saisir au moment du paiement.</p>
    ${SITE ? `<p style="text-align:center;margin-top:8px">${btn(SITE + "/produits", "Explorer le catalogue")}</p>` : ""}`;
  return send({ to: email, subject: `NEXUS — Ton code de bienvenue ${code}`, html: shell("Bienvenue dans le labo 🧬", body) });
}

// ---------- Code fidélité (après la 1ère commande payée) ----------
export async function sendLoyaltyCode(order, code, pct) {
  const pctTxt = pct ? ` (${pct}%)` : "";
  const body = `
    <p style="color:#8a97a6;line-height:1.7">Bonjour${order.full_name ? " " + order.full_name : ""},<br>
    Merci pour ta première commande chez NEXUS ! 🎉 Pour te remercier, voici un code${pctTxt} pour ta prochaine commande :</p>
    <div style="text-align:center;margin:22px 0">
      <div style="display:inline-block;padding:14px 28px;border:1px dashed #22e0ff;border-radius:12px;font-family:'Space Grotesk',monospace;font-size:22px;font-weight:700;color:#37f5a9;letter-spacing:3px">${code}</div>
    </div>
    <p style="color:#8a97a6;text-align:center;font-size:13px">À saisir au paiement de ta prochaine commande.</p>`;
  return send({ to: order.email, subject: "NEXUS — Un cadeau pour ta prochaine commande 🎁", html: shell("Merci pour ta commande 🎁", body) });
}

// ---------- Bienvenue (à l'inscription) ----------
export async function sendWelcome(user) {
  const body = `<p style="color:#8a97a6;line-height:1.7">Bonjour${user.full_name ? " " + user.full_name : ""},<br>
    Ton compte NEXUS est créé. Tu peux suivre tes commandes et retrouver ton historique à tout moment.</p>
    ${SITE ? `<p style="text-align:center">${btn(SITE, "Explorer le catalogue")}</p>` : ""}`;
  return send({ to: user.email, subject: "Bienvenue chez NEXUS", html: shell("Bienvenue 🧬", body) });
}
