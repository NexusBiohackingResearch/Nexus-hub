// ============================================================
// NEXUS — Lien promo instantané
// Un lien du type  ...?promo=CODE  (ou ?code=CODE) mémorise le code et
// l'applique automatiquement au paiement. Affiche un bandeau discret.
// ============================================================
(function () {
  var params;
  try { params = new URLSearchParams(location.search); } catch (e) { return; }
  var code = (params.get("promo") || params.get("code") || "").trim().toUpperCase();
  if (!code) return;
  // On ne garde que des caractères de code plausibles
  if (!/^[A-Z0-9\-_]{2,32}$/.test(code)) return;

  try { localStorage.setItem("nexus_promo", code); } catch (e) {}

  function banner() {
    if (document.getElementById("nx-promo-bar")) return;
    var css = document.createElement("style");
    css.textContent =
      '#nx-promo-bar{position:fixed;left:50%;bottom:20px;transform:translateX(-50%);z-index:2147481000;' +
      'display:flex;align-items:center;gap:12px;max-width:92vw;padding:12px 16px;border-radius:14px;' +
      "font-family:'Inter',system-ui,sans-serif;font-size:13px;color:#eafcff;" +
      'background:linear-gradient(150deg,#0a1620,#070f16);border:1px solid rgba(24,215,232,.35);' +
      'box-shadow:0 18px 50px rgba(0,0,0,.5);animation:nxPromoUp .35s ease}' +
      '@keyframes nxPromoUp{from{opacity:0;transform:translate(-50%,14px)}to{opacity:1;transform:translate(-50%,0)}}' +
      '#nx-promo-bar b{color:#83ef68;letter-spacing:1px}' +
      '#nx-promo-bar button{background:none;border:0;color:#6f8a96;font-size:18px;cursor:pointer;line-height:1}';
    document.head.appendChild(css);
    var bar = document.createElement("div");
    bar.id = "nx-promo-bar";
    bar.innerHTML = '<span>🎁 Code <b>' + code.replace(/[<>&]/g, "") +
      '</b> activé — il sera appliqué au paiement.</span><button aria-label="Fermer">&times;</button>';
    bar.querySelector("button").addEventListener("click", function () { bar.remove(); });
    document.body.appendChild(bar);
    setTimeout(function () { if (bar.parentNode) bar.remove(); }, 8000);
  }
  if (document.body) banner();
  else document.addEventListener("DOMContentLoaded", banner);
})();
