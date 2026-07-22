// ============================================================
// NEXUS — Google Analytics 4 (chargement + init centralisés)
// Un seul include par page : <script src="/js/analytics.js"></script>
// L'identifiant de mesure n'est défini qu'ici.
// ============================================================
(function () {
  var GA_ID = "G-SH4X50V40H";

  // Charge la bibliothèque gtag.js de façon asynchrone
  var s = document.createElement("script");
  s.async = true;
  s.src = "https://www.googletagmanager.com/gtag/js?id=" + GA_ID;
  document.head.appendChild(s);

  // Initialise la couche de données GA4
  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }
  window.gtag = gtag;
  gtag("js", new Date());
  gtag("config", GA_ID);

  // Expose l'ID + un helper pour récupérer le client_id GA4 (avec repli si gtag
  // pas encore prêt) — utilisé au checkout pour rattacher l'achat côté serveur.
  window.NX_GA_ID = GA_ID;
  window.nxGaClientId = function (cb) {
    var done = false;
    function finish(id) { if (!done) { done = true; cb(id || ""); } }
    try { gtag("get", GA_ID, "client_id", finish); } catch (e) { finish(""); }
    setTimeout(function () { finish(""); }, 800); // ne bloque jamais le checkout
  };
})();
