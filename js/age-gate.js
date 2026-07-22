// ============================================================
// NEXUS — Barrière de vérification d'âge (18+)
// Overlay non destructif : le contenu HTML reste dans le DOM (crawler-safe,
// Google indexe la page normalement). Bloque uniquement l'affichage humain.
// - "Oui" : ferme la barrière (redemandée à chaque visite, aucune mémorisation).
// - "Non" : message puis redirection hors du site.
// Injecté tôt (dans <head>) pour couvrir la cinématique d'accueil sans flash.
// ============================================================
(function () {
  var REDIRECT_URL = "https://www.google.com/";
  var OK_KEY = "nx_age_ok";

  // Déjà confirmé pendant cette session de navigation ? → on n'affiche rien.
  // (Redemandé seulement à une nouvelle visite / réouverture du navigateur,
  //  mais PAS à chaque page : plus de re-demande en allant au panier/checkout.)
  try { if (sessionStorage.getItem(OK_KEY) === "1") return; } catch (e) {}

  // Contrôle de la cinématique d'accueil : on la met en pause tant que
  // l'âge n'est pas confirmé, puis on la lance après le "Oui".
  function introVideos() {
    return [document.getElementById("introVideo"), document.getElementById("introBlur")]
      .filter(Boolean);
  }
  function pauseIntro() { introVideos().forEach(function (v) { try { v.pause(); v.currentTime = 0; } catch (e) {} }); }
  function playIntro() { introVideos().forEach(function (v) { try { v.play(); } catch (e) {} }); }

  // --- Styles (injectés) ---
  var css =
    '#nx-age{position:fixed;inset:0;z-index:2147483000;display:flex;align-items:center;' +
    'justify-content:center;padding:24px;background:radial-gradient(120% 120% at 50% 0%,#0a141c 0%,#05070a 60%,#03050700 100%),#05070a;' +
    "font-family:'Inter',system-ui,-apple-system,Segoe UI,Roboto,sans-serif;-webkit-font-smoothing:antialiased}" +
    '#nx-age *{box-sizing:border-box}' +
    '#nx-age .nx-card{width:100%;max-width:460px;text-align:center;padding:40px 32px;border-radius:22px;' +
    'background:linear-gradient(165deg,#0a1620,#070f16);border:1px solid rgba(24,215,232,.22);' +
    'box-shadow:0 30px 80px rgba(0,0,0,.6);animation:nxUp .4s ease}' +
    '@keyframes nxUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}' +
    '#nx-age .nx-logo{height:44px;width:auto;margin:0 auto 22px;display:block}' +
    '#nx-age .nx-eyebrow{font-size:11px;font-weight:700;letter-spacing:.16em;text-transform:uppercase;' +
    'color:#18d7e8;margin:0 0 10px}' +
    "#nx-age h2{font-family:'Space Grotesk',sans-serif;font-size:24px;line-height:1.2;color:#eafcff;margin:0 0 6px}" +
    '#nx-age .nx-sub{font-size:14px;color:#9fb6c0;margin:0 0 26px;line-height:1.55}' +
    '#nx-age .nx-sub .en{display:block;font-size:12px;color:#6f8a96;margin-top:4px}' +
    '#nx-age .nx-actions{display:flex;flex-direction:column;gap:12px}' +
    '#nx-age button{font:inherit;font-weight:700;font-size:15px;padding:15px 20px;border-radius:14px;' +
    'border:0;cursor:pointer;transition:transform .15s,filter .15s;width:100%}' +
    '#nx-age button:hover{transform:translateY(-2px)}' +
    '#nx-age .nx-yes{color:#04120c;background:linear-gradient(90deg,#83ef68,#18d7e8)}' +
    '#nx-age .nx-yes:hover{filter:brightness(1.05)}' +
    '#nx-age .nx-no{color:#c4d7df;background:transparent;border:1px solid rgba(255,255,255,.18)}' +
    '#nx-age .nx-no:hover{border-color:rgba(255,255,255,.4);color:#eafcff}' +
    '#nx-age .nx-legal{font-size:11px;color:#63808c;margin:24px 0 0;line-height:1.5}' +
    '#nx-age .nx-denied{font-size:15px;color:#ff9d9d;line-height:1.6}';

  var style = document.createElement("style");
  style.id = "nx-age-style";
  style.textContent = css;
  (document.head || document.documentElement).appendChild(style);

  // --- Overlay ---
  var el = document.createElement("div");
  el.id = "nx-age";
  el.setAttribute("role", "dialog");
  el.setAttribute("aria-modal", "true");
  el.setAttribute("aria-label", "Vérification d'âge");
  el.innerHTML =
    '<div class="nx-card">' +
    '<img class="nx-logo" src="/assets/images/nexus-logo.png" alt="NEXUS" ' +
    'onerror="this.style.display=\'none\'">' +
    '<p class="nx-eyebrow">Vérification d\'âge</p>' +
    '<h2>Avez-vous 18 ans ou plus ?</h2>' +
    '<p class="nx-sub">Ce site est réservé aux personnes majeures.' +
    '<span class="en">This site is restricted to visitors aged 18 or over.</span></p>' +
    '<div class="nx-actions">' +
    '<button type="button" class="nx-yes">Oui, j\'ai 18 ans ou plus</button>' +
    '<button type="button" class="nx-no">Non, j\'ai moins de 18 ans</button>' +
    '</div>' +
    '<p class="nx-legal">Produits destinés exclusivement à la recherche en laboratoire. ' +
    'Research use only.</p>' +
    '</div>';

  function lockScroll(on) {
    var d = document.documentElement;
    if (on) { d.style.overflow = "hidden"; if (document.body) document.body.style.overflow = "hidden"; }
    else { d.style.overflow = ""; if (document.body) document.body.style.overflow = ""; }
  }

  function mount() {
    (document.body || document.documentElement).appendChild(el);
    lockScroll(true);
    pauseIntro(); // la cinématique attend la confirmation d'âge
    el.querySelector(".nx-yes").addEventListener("click", accept);
    el.querySelector(".nx-no").addEventListener("click", deny);
    var yes = el.querySelector(".nx-yes");
    if (yes && yes.focus) { try { yes.focus(); } catch (e) {} }
  }

  function accept() {
    try { sessionStorage.setItem(OK_KEY, "1"); } catch (e) {} // mémorise pour la session
    lockScroll(false);
    if (el && el.parentNode) el.parentNode.removeChild(el);
    var s = document.getElementById("nx-age-style");
    if (s && s.parentNode) s.parentNode.removeChild(s);
    playIntro(); // lance la cinématique maintenant seulement
  }

  function deny() {
    var card = el.querySelector(".nx-card");
    if (card) {
      card.innerHTML =
        '<p class="nx-eyebrow">Accès refusé</p>' +
        '<h2>Réservé aux 18 ans et plus</h2>' +
        '<p class="nx-denied">Vous devez avoir 18 ans ou plus pour accéder à ce site.<br>' +
        'Redirection en cours…</p>';
    }
    setTimeout(function () { window.location.replace(REDIRECT_URL); }, 1800);
  }

  if (document.body) mount();
  else document.addEventListener("DOMContentLoaded", mount);
})();
