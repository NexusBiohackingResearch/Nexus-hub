// ============================================================
// NEXUS — Cours BTC/EUR (CoinGecko), avec cache 5 min
// (Même source que le bot Telegram.)
// ============================================================
let cache = { rate: null, ts: 0 };
const TTL = 5 * 60 * 1000;

export async function getBtcEurRate() {
  const now = Date.now();
  if (cache.rate && now - cache.ts < TTL) return cache.rate;
  const url = "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=eur";
  const r = await fetch(url);
  if (!r.ok) throw new Error("Cours BTC indisponible");
  const data = await r.json();
  const rate = Number(data?.bitcoin?.eur);
  if (!rate) throw new Error("Cours BTC invalide");
  cache = { rate, ts: now };
  return rate;
}
