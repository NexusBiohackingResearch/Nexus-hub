// ============================================================
// NEXUS — Boutique côté client
// Panier (localStorage) + comptes + injection UI (drawer, auth)
// Chargé sur toutes les pages. Expose window.NEXUS.
// ============================================================
(function () {
  const CART_KEY = "nexus_cart_v1";
  const T = (fr, en) => (localStorage.getItem("nexusLanguage") === "en" ? en : fr);

  const state = {
    cart: load(),
    user: null,
    config: { cryptoBtc: "", cryptoUsdt: "", telegramUrl: "" },
  };

  function load() {
    try { return JSON.parse(localStorage.getItem(CART_KEY)) || {}; }
    catch { return {}; }
  }
  function save() {
    localStorage.setItem(CART_KEY, JSON.stringify(state.cart));
    refreshBadges();
    if (document.getElementById("cartDrawer")?.classList.contains("show")) renderCart();
    document.dispatchEvent(new CustomEvent("nexus:cart"));
  }

  const count = () => Object.values(state.cart).reduce((a, i) => a + i.qty, 0);
  const total = () => Object.values(state.cart).reduce((a, i) => a + i.price * i.qty, 0);

  function add(id, name, price, image, cat) {
    if (!id) return;
    if (state.cart[id]) state.cart[id].qty += 1;
    else state.cart[id] = { id, name, price: Number(price) || 0, image: image || "", cat: cat || "", qty: 1 };
    save();
    bump();
    openCart();
  }
  function setQty(id, q) {
    if (!state.cart[id]) return;
    state.cart[id].qty = q;
    if (state.cart[id].qty <= 0) delete state.cart[id];
    save();
  }
  function remove(id) { delete state.cart[id]; save(); }
  function clear() { state.cart = {}; save(); }

  // ---------- API ----------
  async function api(path, opts = {}) {
    const r = await fetch(path, {
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      ...opts,
      body: opts.body ? JSON.stringify(opts.body) : undefined,
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(data.error || "Erreur");
    return data;
  }
  async function loadUser() {
    try { state.user = (await api("/api/auth/me")).user; }
    catch { state.user = null; }
    refreshAccountBtn();
    return state.user;
  }
  async function loadConfig() {
    try { state.config = await api("/api/config"); } catch {}
  }

  // ---------- UI : injection ----------
  function injectUI() {
    // Boutons header
    const actions = document.querySelector(".header-actions");
    if (actions && !document.getElementById("headerCart")) {
      const acc = document.createElement("button");
      acc.className = "header-account";
      acc.id = "headerAccount";
      acc.innerHTML = iconUser() + `<span id="accountLabel">${T("Compte", "Account")}</span>`;
      acc.addEventListener("click", onAccountClick);

      const cart = document.createElement("button");
      cart.className = "header-cart";
      cart.id = "headerCart";
      cart.innerHTML = iconCart() + `<span>${T("Panier", "Cart")}</span><span class="cart-badge" id="cartBadge">0</span>`;
      cart.addEventListener("click", openCart);

      // On retire l'ancien bouton "Commander" Telegram s'il existe
      const oldOrder = actions.querySelector(".header-order");
      if (oldOrder) oldOrder.remove();
      actions.appendChild(acc);
      actions.appendChild(cart);
    }

    if (!document.getElementById("nxOverlay")) {
      const ov = document.createElement("div");
      ov.className = "nx-overlay";
      ov.id = "nxOverlay";
      ov.addEventListener("click", closeAll);
      document.body.appendChild(ov);
    }

    if (!document.getElementById("cartDrawer")) {
      const d = document.createElement("aside");
      d.className = "cart-drawer";
      d.id = "cartDrawer";
      d.innerHTML = `
        <div class="cart-head"><h3>${T("Votre panier", "Your cart")}</h3><button class="nx-x" id="cartClose">✕</button></div>
        <div class="cart-body" id="cartBody"></div>
        <div class="cart-foot" id="cartFoot" style="display:none">
          <div class="row"><span>${T("Sous-total", "Subtotal")}</span><span id="cartSub">0 €</span></div>
          <div class="row total"><span>Total</span><span id="cartTotal">0 €</span></div>
          <p id="cartMinMsg" style="display:none;font-size:12px;color:#ffb454;margin:0 0 10px;text-align:center"></p>
          <a class="button button-primary" id="cartCheckout" href="checkout.html">${T("Passer la commande", "Checkout")} →</a>
          <p class="cart-note">${T("Paiement carte ou crypto — confirmation automatique après paiement.", "Card or crypto payment — automatic confirmation after payment.")}</p>
        </div>`;
      document.body.appendChild(d);
      d.querySelector("#cartClose").addEventListener("click", closeAll);
    }

    if (!document.getElementById("authModal")) {
      const m = document.createElement("div");
      m.className = "nx-overlay";
      m.id = "authModal";
      m.innerHTML = authCardHtml();
      m.addEventListener("click", (e) => { if (e.target === m) closeAll(); });
      document.body.appendChild(m);
      wireAuth(m);
    }
    refreshBadges();
  }

  // ---------- Cart drawer render ----------
  function renderCart() {
    const body = document.getElementById("cartBody");
    const foot = document.getElementById("cartFoot");
    const items = Object.values(state.cart);
    if (!items.length) {
      body.innerHTML = `<div class="cart-empty">${iconCart(46)}<p>${T("Votre panier est vide.", "Your cart is empty.")}</p></div>`;
      foot.style.display = "none";
      return;
    }
    body.innerHTML = items.map((i) => `
      <div class="cart-line">
        <img src="${i.image}" alt="" onerror="this.style.visibility='hidden'">
        <div class="cl-info">
          <h4>${esc(i.name)}</h4>
          <div class="cl-cat">${esc(i.cat)}</div>
          <div class="qtybox">
            <button data-q="-1" data-id="${i.id}">−</button>
            <span>${i.qty}</span>
            <button data-q="1" data-id="${i.id}">+</button>
          </div>
        </div>
        <div class="cl-right">
          <div class="cl-price">${(i.price * i.qty).toFixed(2)} €</div>
          <button class="cl-remove" data-rm="${i.id}">${T("Retirer", "Remove")}</button>
        </div>
      </div>`).join("");
    foot.style.display = "block";
    document.getElementById("cartSub").textContent = total().toFixed(2) + " €";
    document.getElementById("cartTotal").textContent = total().toFixed(2) + " €";

    // Minimum de commande
    const minOrder = Number(state.config.minOrder || 0);
    const below = minOrder > 0 && total() < minOrder;
    const co = document.getElementById("cartCheckout");
    const mm = document.getElementById("cartMinMsg");
    if (co && mm) {
      if (below) {
        mm.style.display = "block";
        mm.textContent = T(
          `Commande minimum ${minOrder} € — il manque ${(minOrder - total()).toFixed(2)} €.`,
          `Minimum order ${minOrder} € — add ${(minOrder - total()).toFixed(2)} € more.`
        );
        co.style.opacity = ".5"; co.style.pointerEvents = "none";
      } else {
        mm.style.display = "none";
        co.style.opacity = ""; co.style.pointerEvents = "";
      }
    }

    body.querySelectorAll("[data-q]").forEach((b) =>
      b.addEventListener("click", () => setQty(b.dataset.id, state.cart[b.dataset.id].qty + Number(b.dataset.q))));
    body.querySelectorAll("[data-rm]").forEach((b) =>
      b.addEventListener("click", () => remove(b.dataset.rm)));
  }

  function refreshBadges() {
    const b = document.getElementById("cartBadge");
    if (b) { b.textContent = count(); b.classList.toggle("show", count() > 0); }
  }
  function bump() {
    const b = document.getElementById("cartBadge");
    if (!b) return;
    b.style.transform = "scale(1.4)";
    setTimeout(() => (b.style.transform = ""), 180);
  }

  function openCart() { renderCart(); show("cartDrawer"); show("nxOverlay"); }
  function show(id) { document.getElementById(id)?.classList.add("show"); }
  function closeAll() {
    ["cartDrawer", "nxOverlay", "authModal"].forEach((id) => document.getElementById(id)?.classList.remove("show"));
  }

  // ---------- Auth UI ----------
  function onAccountClick() {
    if (state.user) window.location.href = "compte.html";
    else openAuth();
  }
  function openAuth() { document.getElementById("authModal").classList.add("show"); show("nxOverlay"); }
  function refreshAccountBtn() {
    const lbl = document.getElementById("accountLabel");
    if (lbl) lbl.textContent = state.user ? (state.user.fullName || T("Mon compte", "Account")) : T("Compte", "Account");
  }

  function authCardHtml() {
    return `<div class="auth-card" id="authCard">
      <div class="auth-tabs">
        <button data-tab="login" class="active">${T("Connexion", "Log in")}</button>
        <button data-tab="register">${T("Créer un compte", "Sign up")}</button>
      </div>
      <div id="authLogin">
        <h3>${T("Bon retour", "Welcome back")}</h3>
        <p class="sub">${T("Accède à ton historique de commandes.", "Access your order history.")}</p>
        <div class="field"><label>Email</label><input type="email" id="li_email"></div>
        <div class="field"><label>${T("Mot de passe", "Password")}</label><input type="password" id="li_pass"></div>
        <p class="form-msg" id="li_msg"></p>
        <button class="button button-primary" style="width:100%" id="li_btn">${T("Se connecter", "Log in")}</button>
      </div>
      <div id="authRegister" style="display:none">
        <h3>${T("Créer un compte", "Create account")}</h3>
        <p class="sub">${T("Suis tes commandes et reçois les confirmations.", "Track orders and get confirmations.")}</p>
        <div class="field"><label>${T("Nom complet", "Full name")}</label><input id="rg_name"></div>
        <div class="field"><label>Email</label><input type="email" id="rg_email"></div>
        <div class="field"><label>${T("Mot de passe (8+ car.)", "Password (8+ chars)")}</label><input type="password" id="rg_pass"></div>
        <p class="form-msg" id="rg_msg"></p>
        <button class="button button-primary" style="width:100%" id="rg_btn">${T("Créer mon compte", "Create account")}</button>
      </div>
      <p class="mini">${T("En continuant, tu confirmes utiliser ces produits à des fins de recherche uniquement.", "By continuing you confirm research-only use of these products.")}</p>
    </div>`;
  }

  function wireAuth(root) {
    root.querySelectorAll(".auth-tabs button").forEach((b) =>
      b.addEventListener("click", () => {
        root.querySelectorAll(".auth-tabs button").forEach((x) => x.classList.remove("active"));
        b.classList.add("active");
        root.querySelector("#authLogin").style.display = b.dataset.tab === "login" ? "" : "none";
        root.querySelector("#authRegister").style.display = b.dataset.tab === "register" ? "" : "none";
      }));

    root.querySelector("#li_btn").addEventListener("click", async () => {
      const msg = root.querySelector("#li_msg"); msg.textContent = "";
      try {
        await api("/api/auth/login", { method: "POST", body: { email: val("li_email"), password: val("li_pass") } });
        await loadUser(); closeAll();
        if (window.__afterAuth) window.__afterAuth();
      } catch (e) { msg.className = "form-msg err"; msg.textContent = e.message; }
    });

    root.querySelector("#rg_btn").addEventListener("click", async () => {
      const msg = root.querySelector("#rg_msg"); msg.textContent = "";
      try {
        await api("/api/auth/register", { method: "POST", body: { fullName: val("rg_name"), email: val("rg_email"), password: val("rg_pass") } });
        await loadUser(); closeAll();
        if (window.__afterAuth) window.__afterAuth();
      } catch (e) { msg.className = "form-msg err"; msg.textContent = e.message; }
    });
  }

  const val = (id) => document.getElementById(id)?.value.trim() || "";
  const esc = (s = "") => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[c]));

  // ---------- Icônes ----------
  function iconCart(s = 15) { return `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>`; }
  function iconUser(s = 15) { return `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`; }

  // ---------- Délégation "ajouter au panier" ----------
  document.addEventListener("click", (e) => {
    const el = e.target.closest("[data-add]");
    if (!el) return;
    e.preventDefault();
    e.stopPropagation();
    add(el.dataset.id, el.dataset.name, el.dataset.price, el.dataset.image, el.dataset.cat);
    el.classList.add("added");
    const old = el.textContent;
    el.textContent = T("Ajouté ✓", "Added ✓");
    setTimeout(() => { el.classList.remove("added"); el.textContent = old; }, 1000);
  }, true);

  document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeAll(); });

  // ---------- Expose ----------
  window.NEXUS = { add, remove, setQty, clear, count, total, get cart() { return state.cart; }, get user() { return state.user; }, get config() { return state.config; }, api, loadUser, openAuth, openCart, closeAll };

  // ---------- Init ----------
  document.addEventListener("DOMContentLoaded", async () => {
    injectUI();
    await Promise.all([loadUser(), loadConfig()]);
  });
})();
