
const CONFIG = window.NEXUS_CONFIG || { telegramUrl: "#" };

const translations = {
  fr: {
    navDomains:"Domaines",navCatalogue:"Catalogue",navQuality:"Qualité",navDelivery:"Livraison",navContact:"Contact",order:"Commander",
    heroEyebrow:"PEPTIDES DE RECHERCHE HAUTE PURETÉ",heroTitle:"Pureté. Précision.<br><span>Recherche sans compromis.</span>",
    heroLead:"Sélection rigoureuse, paiement sécurisé en cryptomonnaie et livraison rapide en France et en Europe.",
    exploreCatalogue:"Explorer le catalogue",fastOrder:"Commander sur Telegram",metricFrance:"jours en France",metricCrypto:"paiement sécurisé",metricEurope:"expédition suivie",
    signature:"Un portail pensé pour accéder rapidement aux références, disponibilités et informations de recherche.",
    ticker1:"Exclusivement pour la recherche",ticker2:"Livraison France 2–3 jours",ticker3:"Paiement Bitcoin",ticker4:"Expédition européenne",
    domainsEyebrow:"DOMAINES DE RECHERCHE",domainsTitle:"Explorez selon votre<br><span>axe de recherche</span>",domainsLead:"Choisissez un domaine pour filtrer instantanément le catalogue.",
    domainGrowth:"Croissance & performance",domainRecovery:"Régénération & réparation",domainLongevity:"Longévité & recherche cellulaire",domainCognition:"Cognition & neuroprotection",domainMetabolism:"Métabolisme",domainReproductive:"Recherche reproductive",
    catalogueEyebrow:"RESEARCH LIBRARY",catalogueTitle:"Le catalogue <span>Nexus</span>",catalogueLead:"Recherchez une référence, filtrez par domaine et consultez sa disponibilité actuelle.",
    allCategories:"Toutes les catégories",availableOnly:"Disponibles uniquement",resetFilters:"Réinitialiser",available:"Disponible",unavailable:"Indisponible",references:"références",viewDetails:"Voir la fiche",
    qualityEyebrow:"NEXUS QUALITY STANDARD",qualityTitle:"L’exigence à chaque<br><span>étape du parcours</span>",qualityLead:"Informations claires, conservation maîtrisée et accès rapide aux références disponibles.",
    quality1Title:"Pureté & traçabilité",quality1Text:"Documentation de recherche et informations de lot selon disponibilité.",quality2Title:"Conservation maîtrisée",quality2Text:"Indications de stockage clairement présentées pour chaque référence.",quality3Title:"Commande simplifiée",quality3Text:"Sélection rapide puis transmission directe vers le bot Nexus.",
    deliveryEyebrow:"EXPÉDITION",deliveryTitle:"Rapide en France. Étendue à l’Europe.",deliveryLead:"Livraison généralement estimée entre 2 et 3 jours ouvrés en France métropolitaine. Les délais européens varient selon la destination.",
    contactEyebrow:"ORDER ACCESS",contactTitle:"Préparez votre commande en quelques instants.",contactLead:"Ouvrez le bot Nexus sur Telegram et transmettez votre sélection.",openTelegram:"Ouvrir Telegram",
    footerLegal:"Exclusivement destiné à la recherche scientifique. Non destiné à la consommation humaine ou animale.",
    orderProduct:"Commander ce produit",continueBrowsing:"Continuer à explorer"
  },
  en: {
    navDomains:"Fields",navCatalogue:"Library",navQuality:"Quality",navDelivery:"Shipping",navContact:"Contact",order:"Order",
    heroEyebrow:"HIGH-PURITY RESEARCH PEPTIDES",heroTitle:"Purity. Precision.<br><span>Research without compromise.</span>",
    heroLead:"Rigorous selection, secure cryptocurrency payments and fast shipping across France and Europe.",
    exploreCatalogue:"Explore the catalogue",fastOrder:"Order via Telegram",metricFrance:"days in France",metricCrypto:"secure payment",metricEurope:"tracked shipping",
    signature:"A portal designed for fast access to compounds, availability and research information.",
    ticker1:"Research use only",ticker2:"France delivery in 2–3 days",ticker3:"Bitcoin payments",ticker4:"European shipping",
    domainsEyebrow:"RESEARCH FIELDS",domainsTitle:"Explore by your<br><span>research focus</span>",domainsLead:"Choose a field to filter the catalogue instantly.",
    domainGrowth:"Growth & performance",domainRecovery:"Recovery & tissue research",domainLongevity:"Longevity & cellular research",domainCognition:"Cognition & neuroprotection",domainMetabolism:"Metabolic research",domainReproductive:"Reproductive research",
    catalogueEyebrow:"RESEARCH LIBRARY",catalogueTitle:"The <span>Nexus</span> catalogue",catalogueLead:"Search a compound, filter by field and review its current availability.",
    allCategories:"All categories",availableOnly:"Available only",resetFilters:"Reset",available:"Available",unavailable:"Unavailable",references:"references",viewDetails:"View details",
    qualityEyebrow:"NEXUS QUALITY STANDARD",qualityTitle:"Standards at every<br><span>stage of the journey</span>",qualityLead:"Clear information, controlled storage guidance and fast access to available compounds.",
    quality1Title:"Purity & traceability",quality1Text:"Research documentation and batch information when available.",quality2Title:"Controlled storage",quality2Text:"Clear storage guidance for every compound.",quality3Title:"Simplified ordering",quality3Text:"Fast selection followed by direct transfer to the Nexus bot.",
    deliveryEyebrow:"SHIPPING",deliveryTitle:"Fast in France. Extended across Europe.",deliveryLead:"Delivery is generally estimated at 2 to 3 business days in metropolitan France. European transit times vary by destination.",
    contactEyebrow:"ORDER ACCESS",contactTitle:"Prepare your order in moments.",contactLead:"Open the Nexus bot on Telegram and send your selection.",openTelegram:"Open Telegram",
    footerLegal:"Strictly intended for scientific research. Not intended for human or animal consumption.",
    orderProduct:"Order this compound",continueBrowsing:"Continue exploring"
  }
};

let lang = localStorage.getItem("nexusLanguage") || "fr";
let products = [];
let onlyAvailable = false;
let activeProduct = null;

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => document.querySelectorAll(selector);

function applyTelegramLinks() {
  $$("[data-telegram]").forEach(link => link.href = CONFIG.telegramUrl);
}

function translatePage() {
  document.documentElement.lang = lang;
  $$("[data-i18n]").forEach(el => {
    const key = el.dataset.i18n;
    if (translations[lang][key]) el.textContent = translations[lang][key];
  });
  $$("[data-i18n-html]").forEach(el => {
    const key = el.dataset.i18nHtml;
    if (translations[lang][key]) el.innerHTML = translations[lang][key];
  });
  $("#languageButton").textContent = lang === "fr" ? "EN" : "FR";
  $("#searchInput").placeholder = $("#searchInput").dataset[lang === "fr" ? "placeholderFr" : "placeholderEn"];
  renderCategories();
  renderProducts();
  if (activeProduct) fillModal(activeProduct);
}

function renderCategories() {
  if (!products.length) return;
  const select = $("#categorySelect");
  const current = select.value;
  const options = [...new Map(products.map(product => [
    lang === "fr" ? product.categoryFr : product.categoryEn,
    product.categoryFr
  ])).entries()].sort((a,b) => a[0].localeCompare(b[0]));

  select.innerHTML = `<option value="">${translations[lang].allCategories}</option>` +
    options.map(([label,value]) => `<option value="${value}">${label}</option>`).join("");
  select.value = current;
}

function renderProducts() {
  if (!products.length) return;
  const query = $("#searchInput").value.trim().toLowerCase();
  const category = $("#categorySelect").value;

  const filtered = products.filter(product => {
    const searchable = `${product.name} ${product.categoryFr} ${product.categoryEn}`.toLowerCase();
    return (!query || searchable.includes(query)) &&
      (!category || product.categoryFr === category) &&
      (!onlyAvailable || product.available);
  });

  $("#productCount").textContent = `${filtered.length} ${translations[lang].references}`;
  $("#productGrid").innerHTML = filtered.map((product,index) => `
    <article class="product-card" data-id="${product.id}" style="animation-delay:${Math.min(index,12)*35}ms">
      <div class="product-image">
        <span class="availability ${product.available ? "available" : "unavailable"}">
          ${product.available ? translations[lang].available : translations[lang].unavailable}
        </span>
        <img src="${product.image}" alt="${product.name}" loading="lazy" onerror="this.onerror=null;this.src='${product.fallbackImage || "assets/images/nexus-logo.webp"}';">
      </div>
      <div class="product-info">
        <small>${lang === "fr" ? product.categoryFr : product.categoryEn}</small>
        <h3>${product.name}</h3>
        <div class="product-footer">
          <span class="price">${Number(product.price).toFixed(2)} €</span>
          <span class="details">${translations[lang].viewDetails} ↗</span>
        </div>
      </div>
    </article>
  `).join("");

  $$(".product-card").forEach(card => {
    card.addEventListener("click", () => openModal(products.find(p => p.id === card.dataset.id)));
  });
}

function fillModal(product) {
  $("#modalImage").src = product.image;
  $("#modalImage").alt = product.name;
  $("#modalCategory").textContent = lang === "fr" ? product.categoryFr : product.categoryEn;
  $("#modalName").textContent = product.name;
  $("#modalPrice").textContent = `${Number(product.price).toFixed(2)} €`;
  $("#modalDescription").textContent = lang === "fr" ? product.descriptionFr : product.descriptionEn;

  const availability = $("#modalAvailability");
  availability.textContent = product.available ? translations[lang].available : translations[lang].unavailable;
  availability.className = `availability ${product.available ? "available" : "unavailable"}`;

  const text = lang === "fr"
    ? `Bonjour, je souhaite commander : ${product.name}`
    : `Hello, I would like to order: ${product.name}`;
  $("#modalOrder").href = `${CONFIG.telegramUrl}?text=${encodeURIComponent(text)}`;
  $("#modalOrder").style.opacity = product.available ? "1" : ".45";
  $("#modalOrder").style.pointerEvents = product.available ? "auto" : "none";
}

function openModal(product) {
  activeProduct = product;
  fillModal(product);
  $("#productModal").classList.add("open");
  $("#productModal").setAttribute("aria-hidden","false");
  document.body.style.overflow = "hidden";
}

function closeModal() {
  activeProduct = null;
  $("#productModal").classList.remove("open");
  $("#productModal").setAttribute("aria-hidden","true");
  document.body.style.overflow = "";
}

async function loadProducts() {
  try {
    const response = await fetch("data/products.json");
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    products = await response.json();
    renderCategories();
    renderProducts();
  } catch (error) {
    $("#productCount").textContent = "Catalogue indisponible";
    console.error("Product catalogue error:", error);
  }
}

$("#languageButton").addEventListener("click", () => {
  lang = lang === "fr" ? "en" : "fr";
  localStorage.setItem("nexusLanguage", lang);
  translatePage();
});

$("#menuButton").addEventListener("click", () => $("#nav").classList.toggle("open"));
$$(".nav a").forEach(link => link.addEventListener("click", () => $("#nav").classList.remove("open")));

$("#searchInput").addEventListener("input", renderProducts);
$("#categorySelect").addEventListener("change", renderProducts);
$("#availableButton").addEventListener("click", () => {
  onlyAvailable = !onlyAvailable;
  $("#availableButton").classList.toggle("active", onlyAvailable);
  renderProducts();
});
$("#resetButton").addEventListener("click", () => {
  $("#searchInput").value = "";
  $("#categorySelect").value = "";
  onlyAvailable = false;
  $("#availableButton").classList.remove("active");
  renderProducts();
});

$$(".domain-card").forEach(card => {
  card.addEventListener("click", () => {
    $("#categorySelect").value = card.dataset.category;
    renderProducts();
    $("#catalogue").scrollIntoView({behavior:"smooth"});
  });
});

$("#modalClose").addEventListener("click", closeModal);
$("#modalContinue").addEventListener("click", closeModal);
$("#productModal").addEventListener("click", event => {
  if (event.target === $("#productModal")) closeModal();
});
document.addEventListener("keydown", event => {
  if (event.key === "Escape") closeModal();
});

const observer = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add("visible");
      observer.unobserve(entry.target);
    }
  });
},{threshold:.12});
$$(".reveal").forEach(element => observer.observe(element));



// Ambient background
const canvas = $("#ambientCanvas");
const context = canvas.getContext("2d");
let width = 0, height = 0, dpr = Math.min(devicePixelRatio || 1, 2);
const particles = Array.from({length:60}, () => ({
  x:Math.random(), y:Math.random(), depth:.2+Math.random()*.8,
  radius:.4+Math.random()*1.6, speed:.00004+Math.random()*.0001
}));
function resizeCanvas(){
  width=innerWidth;height=innerHeight;
  canvas.width=width*dpr;canvas.height=height*dpr;
  canvas.style.width=`${width}px`;canvas.style.height=`${height}px`;
  context.setTransform(dpr,0,0,dpr,0,0);
}
function animate(){
  context.clearRect(0,0,width,height);
  particles.forEach(particle=>{
    particle.y-=particle.speed;
    if(particle.y<-.02){particle.y=1.02;particle.x=Math.random()}
    context.fillStyle=`rgba(160,225,245,${.025+particle.depth*.1})`;
    context.beginPath();
    context.arc(particle.x*width,particle.y*height,particle.radius*particle.depth,0,Math.PI*2);
    context.fill();
  });
  requestAnimationFrame(animate);
}
resizeCanvas();
addEventListener("resize",resizeCanvas);
if(!matchMedia("(prefers-reduced-motion: reduce)").matches) requestAnimationFrame(animate);




// Cinematic intro
const videoIntro = document.querySelector("#videoIntro");
const introVideo = document.querySelector("#introVideo");
const introBlur = document.querySelector("#introBlur");
const introStart = document.querySelector("#introStart");
const introSound = document.querySelector("#introSound");
const introSkip = document.querySelector("#introSkip");
let introClosed = false;

function syncIntroVideos(){
  if(!introVideo || !introBlur) return;
  if(Math.abs(introBlur.currentTime - introVideo.currentTime) > 0.12){
    introBlur.currentTime = introVideo.currentTime;
  }
}

function closeVideoIntro(){
  if(!videoIntro || introClosed) return;
  introClosed = true;
  videoIntro.classList.add("is-finished");
  window.setTimeout(() => {
    introVideo?.pause();
    introBlur?.pause();
    videoIntro.remove();
  }, 900);
}

async function startIntro(){
  if(!introVideo || introClosed) return;
  videoIntro?.classList.remove("needs-interaction");
  introVideo.muted = true;
  introBlur.muted = true;
  try{
    if(introVideo.currentTime >= introVideo.duration - .2) introVideo.currentTime = 0;
    if(introBlur.currentTime >= introBlur.duration - .2) introBlur.currentTime = 0;
    await Promise.all([introVideo.play(), introBlur.play()]);
  }catch(error){
    videoIntro?.classList.add("needs-interaction");
    console.warn("Lecture automatique bloquée :", error);
  }
}

if(introVideo){
  introVideo.addEventListener("timeupdate", syncIntroVideos);
  introVideo.addEventListener("ended", closeVideoIntro);
  introVideo.addEventListener("error", closeVideoIntro);
  introVideo.addEventListener("canplay", startIntro, {once:true});
  window.setTimeout(() => {
    if(!introClosed && introVideo.paused) startIntro();
  }, 500);
}

introStart?.addEventListener("click", startIntro);

introSound?.addEventListener("click", async () => {
  if(!introVideo) return;
  introVideo.muted = !introVideo.muted;
  introSound.textContent = introVideo.muted ? "Activer le son" : "Couper le son";
  if(introVideo.paused){
    try{ await introVideo.play(); }catch(error){ console.warn(error); }
  }
});

introSkip?.addEventListener("click", closeVideoIntro);

applyTelegramLinks();
translatePage();
loadProducts();
