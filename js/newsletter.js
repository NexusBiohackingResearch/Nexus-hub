// ============================================================
// NEXUS — Pop-up newsletter (code de bienvenue)
// S'affiche ~3 min après l'ouverture, une seule fois (mémorisé),
// et seulement après la confirmation d'âge. Capture l'e-mail -> code promo.
// ============================================================
(function () {
  var DELAY = 180000;            // 3 minutes
  var DONE_KEY = "nx_news_done"; // ne pas re-proposer une fois inscrit/fermé

  try { if (localStorage.getItem(DONE_KEY) === "1") return; } catch (e) {}

  var css =
    '#nx-news{position:fixed;inset:0;z-index:2147482000;display:flex;align-items:flex-end;justify-content:center;' +
    'padding:0 0 24px;background:rgba(3,5,7,.55);opacity:0;transition:opacity .3s}' +
    '#nx-news.show{opacity:1}' +
    "#nx-news *{box-sizing:border-box;font-family:'Inter',system-ui,sans-serif}" +
    '#nx-news .nw-card{position:relative;width:100%;max-width:440px;margin:0 16px;padding:30px 26px;border-radius:20px;text-align:center;' +
    'background:linear-gradient(165deg,#0a1620,#070f16);border:1px solid rgba(24,215,232,.25);box-shadow:0 24px 70px rgba(0,0,0,.6);' +
    'transform:translateY(20px);transition:transform .3s}' +
    '#nx-news.show .nw-card{transform:none}' +
    '#nx-news .nw-x{position:absolute;top:12px;right:14px;background:none;border:0;color:#6f8a96;font-size:22px;cursor:pointer;line-height:1}' +
    '#nx-news .nw-eyebrow{font-size:11px;font-weight:700;letter-spacing:.16em;text-transform:uppercase;color:#18d7e8;margin:0 0 8px}' +
    "#nx-news h2{font-family:'Space Grotesk',sans-serif;font-size:23px;color:#eafcff;margin:0 0 8px;line-height:1.2}" +
    '#nx-news p{color:#9fb6c0;font-size:14px;line-height:1.55;margin:0 0 18px}' +
    '#nx-news .nw-form{display:flex;gap:8px;flex-wrap:wrap}' +
    '#nx-news input{flex:1;min-width:180px;padding:13px 15px;border-radius:12px;border:1px solid rgba(255,255,255,.15);' +
    'background:rgba(255,255,255,.04);color:#eafcff;font-size:15px}' +
    '#nx-news input:focus{outline:none;border-color:rgba(24,215,232,.6)}' +
    '#nx-news button.nw-go{padding:13px 20px;border-radius:12px;border:0;cursor:pointer;font-weight:700;font-size:15px;color:#04120c;' +
    'background:linear-gradient(90deg,#83ef68,#18d7e8)}' +
    '#nx-news button.nw-go:disabled{opacity:.6;cursor:default}' +
    '#nx-news .nw-legal{font-size:11px;color:#63808c;margin:14px 0 0}' +
    '#nx-news .nw-code{display:inline-block;margin:6px 0 4px;padding:12px 24px;border:1px dashed #18d7e8;border-radius:12px;' +
    "font-family:'Space Grotesk',monospace;font-size:22px;font-weight:700;color:#83ef68;letter-spacing:3px}" +
    '#nx-news .nw-msg{font-size:13px;color:#ed8585;margin:10px 0 0;min-height:16px}';

  function emailOk(e) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e); }
  function done() { try { localStorage.setItem(DONE_KEY, "1"); } catch (e) {} }

  function build() {
    var style = document.createElement("style");
    style.textContent = css;
    document.head.appendChild(style);

    var el = document.createElement("div");
    el.id = "nx-news";
    el.setAttribute("role", "dialog");
    el.setAttribute("aria-label", "Newsletter NEXUS");
    el.innerHTML =
      '<div class="nw-card">' +
      '<button class="nw-x" aria-label="Fermer">&times;</button>' +
      '<p class="nw-eyebrow">Offre de bienvenue</p>' +
      '<h2>-10% sur ta première commande</h2>' +
      '<p>Rejoins la newsletter NEXUS et reçois ton code promo par e-mail. Nouveautés, lots et infos recherche.</p>' +
      '<div class="nw-body">' +
      '<div class="nw-form">' +
      '<input type="email" class="nw-email" placeholder="ton@email.com" autocomplete="email">' +
      '<button class="nw-go" type="button">Recevoir mon code</button>' +
      '</div>' +
      '<p class="nw-msg"></p>' +
      '<p class="nw-legal">En t\'inscrivant, tu acceptes de recevoir nos e-mails. Désinscription à tout moment. Produits research use only.</p>' +
      '</div>' +
      '</div>';
    document.body.appendChild(el);
    requestAnimationFrame(function () { el.classList.add("show"); });

    function close() {
      done();
      el.classList.remove("show");
      setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 320);
    }
    el.querySelector(".nw-x").addEventListener("click", close);
    el.addEventListener("click", function (e) { if (e.target === el) close(); });

    var input = el.querySelector(".nw-email");
    var go = el.querySelector(".nw-go");
    var msg = el.querySelector(".nw-msg");

    go.addEventListener("click", async function () {
      var email = (input.value || "").trim();
      msg.style.color = "#ed8585";
      if (!emailOk(email)) { msg.textContent = "Entre une adresse e-mail valide."; return; }
      go.disabled = true; go.textContent = "…";
      try {
        var r = await fetch("/api/newsletter", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: email }),
        });
        var data = await r.json().catch(function () { return {}; });
        if (!r.ok) throw new Error(data.error || "Erreur");
        done();
        if (window.gtag) { try { window.gtag("event", "sign_up", { method: "newsletter" }); } catch (e) {} }
        var pct = data.reductionPct ? (data.reductionPct + "% • ") : "";
        el.querySelector(".nw-body").innerHTML =
          '<p style="color:#eafcff;margin-bottom:6px">Merci ! Voici ton code' + (data.reductionPct ? " (-" + data.reductionPct + "%)" : "") + ' :</p>' +
          '<div class="nw-code">' + (data.code || "") + '</div>' +
          '<p style="color:#9fb6c0;font-size:13px;margin-top:10px">Il t\'a aussi été envoyé par e-mail. À saisir au paiement.</p>';
      } catch (e) {
        go.disabled = false; go.textContent = "Recevoir mon code";
        msg.textContent = e.message || "Une erreur est survenue.";
      }
    });
    input.addEventListener("keydown", function (e) { if (e.key === "Enter") go.click(); });
  }

  function schedule() {
    setTimeout(function () {
      // seulement si l'âge est confirmé et si pas déjà traité entre-temps
      var ageOk = true;
      try { ageOk = sessionStorage.getItem("nx_age_ok") === "1"; } catch (e) {}
      var already = false;
      try { already = localStorage.getItem(DONE_KEY) === "1"; } catch (e) {}
      if (ageOk && !already && document.body) build();
    }, DELAY);
  }

  if (document.body) schedule();
  else document.addEventListener("DOMContentLoaded", schedule);
})();
