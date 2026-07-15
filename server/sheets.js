// ============================================================
// NEXUS — Google Sheets (mêmes feuille & colonnes que le bot)
// Écrit chaque commande du site dans "Commande NEXUS" (A→S),
// puis met à jour le statut + la date de paiement au règlement.
// Réutilise le compte de service du bot (GOOGLE_CREDENTIALS).
// ============================================================
import { google } from "googleapis";

export const SPREADSHEET_ID = process.env.SPREADSHEET_ID || "1pGnRnnQEmpnuwJiB6mkbFHaEmhh4wPFhCd4wtehAmKc";
const SHEET_NAME = process.env.SHEET_NAME || "Commande NEXUS";

let sheetsClient = null;

// Client Google Sheets partagé (réutilisé par catalog.js)
export function getClient() {
  if (sheetsClient) return sheetsClient;
  const raw = process.env.GOOGLE_CREDENTIALS;
  if (!raw) return null;
  let creds;
  try { creds = JSON.parse(raw); } catch { console.error("[sheets] GOOGLE_CREDENTIALS invalide"); return null; }
  const auth = new google.auth.JWT({
    email: creds.client_email,
    key: creds.private_key,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  sheetsClient = google.sheets({ version: "v4", auth });
  return sheetsClient;
}

export const sheetsConfigured = () => Boolean(process.env.GOOGLE_CREDENTIALS);

function frDate(d = new Date()) {
  // format JJ/MM/AAAA HH:MM (Europe/Paris)
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris",
  }).format(d).replace(",", "");
}

// Ajoute une ligne (colonnes A→S identiques au bot).
export async function appendOrderRow(order) {
  const client = getClient();
  if (!client) { console.log("[sheets] non configuré — commande non exportée"); return; }

  const produits = (order.items || [])
    .map((i) => (i.quantity > 1 ? `${i.quantity}x ${i.name.toUpperCase()}` : i.name.toUpperCase()))
    .join(", ");

  const row = [
    order.reference,                                   // A - ID Commande
    frDate(new Date(order.created_at || Date.now())),  // B - Date/Heure
    produits,                                          // C - Produits
    order.full_name || "",                             // D - Nom & Prénom
    order.shipping_address || "",                      // E - Adresse
    order.zip || "",                                   // F - Code Postal
    order.city || "",                                  // G - Ville
    order.country || "",                               // H - Pays
    order.phone || "",                                 // I - Téléphone
    order.email || "",                                 // J - Email
    order.btc_rate ? Number(order.btc_rate).toFixed(2) : "",   // K - Cours BTC/EUR
    order.btc_amount ? Number(order.btc_amount).toFixed(8) : "",// L - Montant BTC
    Number(order.subtotal).toFixed(2),                 // M - Sous-total
    order.promo_code || "",                            // N - Code Promo
    order.discount > 0 ? Number(order.discount).toFixed(2) : "", // O - Réduction
    Number(order.total).toFixed(2),                    // P - Total Final
    "En attente",                                      // Q - Statut
    order.btcpay_checkout_link || "",                  // R - Lien de paiement
    "",                                                // S - Date de paiement
  ];

  try {
    await client.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!A:S`,
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [row] },
    });
    console.log(`[sheets] commande ${order.reference} ajoutée`);
  } catch (e) {
    console.error("[sheets] échec append:", e?.message || e);
  }
}

// Met à jour le statut (colonne Q) et la date de paiement (colonne S)
// en repérant la ligne par l'ID de commande (colonne A).
export async function updateOrderStatus(reference, statusLabel, paidDate) {
  const client = getClient();
  if (!client) return;
  try {
    const res = await client.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!A:A`,
    });
    const rows = res.data.values || [];
    let rowIndex = -1;
    for (let i = 0; i < rows.length; i++) {
      if ((rows[i][0] || "").trim() === reference) { rowIndex = i + 1; break; }
    }
    if (rowIndex === -1) { console.warn(`[sheets] ${reference} introuvable`); return; }

    const updates = [{ range: `${SHEET_NAME}!Q${rowIndex}`, values: [[statusLabel]] }];
    if (paidDate !== undefined) updates.push({ range: `${SHEET_NAME}!S${rowIndex}`, values: [[paidDate]] });

    await client.spreadsheets.values.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      requestBody: { valueInputOption: "USER_ENTERED", data: updates },
    });
    console.log(`[sheets] ${reference} → ${statusLabel}`);
  } catch (e) {
    console.error("[sheets] échec update:", e?.message || e);
  }
}
