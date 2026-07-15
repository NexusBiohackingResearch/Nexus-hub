
const CONFIG = window.NEXUS_CONFIG || { telegramUrl: "#" };

const translations = {
  fr: {
    navDomains:"Domaines",navCatalogue:"Catalogue",navCalc:"Calculateur",navQuality:"Qualité",navDelivery:"Livraison",navContact:"Contact",order:"Commander",
    heroEyebrow:"PEPTIDES DE RECHERCHE HAUTE PURETÉ",heroTitle:"Pureté. Précision.<br><span>Recherche sans compromis.</span>",
    heroLead:"Sélection rigoureuse, paiement sécurisé en cryptomonnaie et livraison rapide en France et en Europe.",
    exploreCatalogue:"Explorer le catalogue",fastOrder:"Commander sur Telegram",metricFrance:"jours en France",metricCrypto:"paiement sécurisé",metricEurope:"expédition suivie",
    signature:"Un portail pensé pour accéder rapidement aux références, disponibilités et informations de recherche.",
    ticker1:"Exclusivement pour la recherche",ticker2:"Livraison France 2–3 jours",ticker3:"Paiement Bitcoin",ticker4:"Expédition européenne",
    domainsEyebrow:"DOMAINES DE RECHERCHE",domainsTitle:"Explorez selon votre<br><span>axe de recherche</span>",domainsLead:"Choisissez un domaine pour filtrer instantanément le catalogue.",
    domainGrowth:"Croissance & performance",domainRecovery:"Régénération & réparation",domainLongevity:"Longévité & recherche cellulaire",domainCognition:"Cognition & neuroprotection",domainMetabolism:"Métabolisme",domainReproductive:"Recherche reproductive",
    catalogueEyebrow:"RESEARCH LIBRARY",catalogueTitle:"Le catalogue <span>Nexus</span>",catalogueLead:"Recherchez une référence, filtrez par domaine et consultez sa disponibilité actuelle.",
    allCategories:"Toutes les catégories",availableOnly:"Disponibles uniquement",resetFilters:"Réinitialiser",available:"Disponible",unavailable:"Indisponible",references:"références",viewDetails:"Voir la fiche",addToCart:"Ajouter au panier",addToCartShort:"+ Panier",
    qualityEyebrow:"NEXUS QUALITY STANDARD",qualityTitle:"L’exigence à chaque<br><span>étape du parcours</span>",qualityLead:"Informations claires, conservation maîtrisée et accès rapide aux références disponibles.",
    quality1Title:"Pureté & traçabilité",quality1Text:"Documentation de recherche et informations de lot selon disponibilité.",quality2Title:"Conservation maîtrisée",quality2Text:"Indications de stockage clairement présentées pour chaque référence.",quality3Title:"Commande simplifiée",quality3Text:"Sélection rapide puis transmission directe vers le bot Nexus.",
    deliveryEyebrow:"EXPÉDITION",deliveryTitle:"Rapide en France. Étendue à l’Europe.",deliveryLead:"Livraison généralement estimée entre 2 et 3 jours ouvrés en France métropolitaine. Les délais européens varient selon la destination.",
    contactEyebrow:"ORDER ACCESS",contactTitle:"Préparez votre commande en quelques instants.",contactLead:"Ouvrez le bot Nexus sur Telegram et transmettez votre sélection.",openTelegram:"Ouvrir Telegram",
    footerLegal:"Exclusivement destiné à la recherche scientifique. Non destiné à la consommation humaine ou animale.",
    orderProduct:"Commander ce produit",continueBrowsing:"Continuer à explorer",footerAbout:"Peptides de recherche premium destinés exclusivement à l’étude en laboratoire et in vitro. Fondés sur la pureté, la documentation et la traçabilité.",footerCatalogueTitle:"CATALOGUE",footerAllProducts:"Toutes les références",footerDomains:"Domaines",footerQuality:"Qualité",footerSupportTitle:"SUPPORT",footerTelegram:"Telegram",footerShipping:"Livraison",footerLegalTitle:"LÉGAL",footerCgvSoon:"CGV bientôt disponibles",footerPrivacySoon:"Confidentialité bientôt disponible",footerResearchPolicy:"Politique d’usage recherche",documentLoading:"Chargement de la fiche…",documentUnavailable:"Fiche détaillée bientôt disponible.",researchFields:"Domaines de recherche",technicalData:"Données techniques",coaTitle:"Certificate of Analysis",viewCoa:"Consulter le COA",footerWarningTitle:"AVERTISSEMENT :",footerWarningText:"Tous les produits présentés sur ce site sont destinés uniquement à la recherche et à l’usage en laboratoire. Ils ne sont pas destinés à la consommation humaine ou animale, ni à un usage diagnostique ou thérapeutique. Aucun élément de ce site ne constitue une allégation médicale."
  },
  en: {
    navDomains:"Fields",navCatalogue:"Library",navCalc:"Calculator",navQuality:"Quality",navDelivery:"Shipping",navContact:"Contact",order:"Order",
    heroEyebrow:"HIGH-PURITY RESEARCH PEPTIDES",heroTitle:"Purity. Precision.<br><span>Research without compromise.</span>",
    heroLead:"Rigorous selection, secure cryptocurrency payments and fast shipping across France and Europe.",
    exploreCatalogue:"Explore the catalogue",fastOrder:"Order via Telegram",metricFrance:"days in France",metricCrypto:"secure payment",metricEurope:"tracked shipping",
    signature:"A portal designed for fast access to compounds, availability and research information.",
    ticker1:"Research use only",ticker2:"France delivery in 2–3 days",ticker3:"Bitcoin payments",ticker4:"European shipping",
    domainsEyebrow:"RESEARCH FIELDS",domainsTitle:"Explore by your<br><span>research focus</span>",domainsLead:"Choose a field to filter the catalogue instantly.",
    domainGrowth:"Growth & performance",domainRecovery:"Recovery & tissue research",domainLongevity:"Longevity & cellular research",domainCognition:"Cognition & neuroprotection",domainMetabolism:"Metabolic research",domainReproductive:"Reproductive research",
    catalogueEyebrow:"RESEARCH LIBRARY",catalogueTitle:"The <span>Nexus</span> catalogue",catalogueLead:"Search a compound, filter by field and review its current availability.",
    allCategories:"All categories",availableOnly:"Available only",resetFilters:"Reset",available:"Available",unavailable:"Unavailable",references:"references",viewDetails:"View details",addToCart:"Add to cart",addToCartShort:"+ Cart",
    qualityEyebrow:"NEXUS QUALITY STANDARD",qualityTitle:"Standards at every<br><span>stage of the journey</span>",qualityLead:"Clear information, controlled storage guidance and fast access to available compounds.",
    quality1Title:"Purity & traceability",quality1Text:"Research documentation and batch information when available.",quality2Title:"Controlled storage",quality2Text:"Clear storage guidance for every compound.",quality3Title:"Simplified ordering",quality3Text:"Fast selection followed by direct transfer to the Nexus bot.",
    deliveryEyebrow:"SHIPPING",deliveryTitle:"Fast in France. Extended across Europe.",deliveryLead:"Delivery is generally estimated at 2 to 3 business days in metropolitan France. European transit times vary by destination.",
    contactEyebrow:"ORDER ACCESS",contactTitle:"Prepare your order in moments.",contactLead:"Open the Nexus bot on Telegram and send your selection.",openTelegram:"Open Telegram",
    footerLegal:"Strictly intended for scientific research. Not intended for human or animal consumption.",
    orderProduct:"Order this compound",continueBrowsing:"Continue exploring",footerAbout:"Premium research peptides intended exclusively for laboratory and in vitro study. Built around purity, documentation and traceability.",footerCatalogueTitle:"CATALOGUE",footerAllProducts:"All compounds",footerDomains:"Research fields",footerQuality:"Quality",footerSupportTitle:"SUPPORT",footerTelegram:"Telegram",footerShipping:"Shipping",footerLegalTitle:"LEGAL",footerCgvSoon:"Terms coming soon",footerPrivacySoon:"Privacy coming soon",footerResearchPolicy:"Research use policy",documentLoading:"Loading product information…",documentUnavailable:"Detailed information coming soon.",researchFields:"Research fields",technicalData:"Technical data",coaTitle:"Certificate of Analysis",viewCoa:"View COA",footerWarningTitle:"WARNING:",footerWarningText:"All products shown on this website are intended exclusively for research and laboratory use. They are not intended for human or animal consumption, diagnosis or therapeutic use. Nothing on this website constitutes a medical claim."
  }
};

let lang = localStorage.getItem("nexusLanguage") || "fr";
let products = [];
let onlyAvailable = false;
let activeProduct = null;

const DESCRIPTION_FILES = {"hgh-10u": "01-hgh-somatropine.md", "bac-water-10ml": "36-eau-bacteriostatique-bac-water.md", "hmg-76-iu": "02-hmg-menotropine.md", "hcg-5000-iu": "03-hcg-gonadotrophine-chorionique.md", "retatrutide-10mg": "16-retatrutide.md", "retatrutide-20mg": "16-retatrutide.md", "bpc157-5mg": "11-bpc-157.md", "bpc157-10mg": "11-bpc-157.md", "tb500-10mg": "12-tb-500-thymosine-4.md", "bpc-157-plus-tb-500-5mg-plus-5mg": "13-bpc-157-tb-500.md", "bpc-157-plus-tb-500-10mg-plus-10mg": "13-bpc-157-tb-500.md", "ghk-cu-50mg": "14-ghk-cu-cuivre-ghk.md", "glow-70-70mg": "18-glow-70-blend.md", "mgf-2mg": "04-mgf-mechano-growth-factor.md", "peg-mgf-2mg": "05-peg-mgf.md", "epithalon-10mg": "30-epithalon-epitalon.md", "tesamorelin-12mg-plus-ipamorelin-6mg": "10-tesamoreline-ipamorelin.md", "semax-10mg-plus-selank-10mg": "28-semax-selank.md", "cjc-1295-w-o-dac-plus-ipamorelin-5mg-plus-5mg": "09-cjc-1295-no-dac-ipamorelin.md", "nad-plus-1000mg": "22-nad.md", "ghrp-2-2mg": "07-ghrp-2.md", "ghrp-6-5mg": "08-ghrp-6.md", "igf-lr3-1mg": "06-igf-1-lr3.md", "mots-c-10mg": "20-mots-c.md", "dsip-10mg": "29-dsip.md", "oxytocin-5mg": "31-ocytocine.md", "aod-9604-5mg": "19-aod-9604.md", "pt141-10mg": "27-pt-141-bremelanotide.md", "mt-i-10mg": "24-melanotan-i-mt-i.md", "mt-ii-melanotan-2-acetate-10mg": "25-melanotan-ii-mt-ii.md", "kisspeptin-5mg": "32-kisspeptine-10.md", "ss-31-10mg": "23-ss-31-elamipretide.md", "kpv": "15-kpv.md", "glutathione": "26-glutathion-gsh.md", "5-amino-1mq-5mg": "21-5-amino-1mq.md", "bronchogen-20mg": "33-bronchogen.md", "livagen-20mg": "34-livagen.md", "pancragen-20mg": "35-pancragen.md"};


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
    <article class="product-card" data-id="${product.id}" data-available="${product.available}" style="animation-delay:${Math.min(index,12)*35}ms">
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
        ${product.available ? `<button class="add-cart" data-add data-id="${product.id}" data-name="${product.name.replace(/"/g,'&quot;')}" data-price="${product.price}" data-image="${product.image}" data-cat="${lang === "fr" ? product.categoryFr : product.categoryEn}">${translations[lang].addToCart}</button>` : `<button class="add-cart" disabled>${translations[lang].unavailable}</button>`}
      </div>
    </article>
  `).join("");

  $$(".product-card").forEach(card => {
    card.addEventListener("click", () => openModal(products.find(p => p.id === card.dataset.id)));
  });
}


function escapeHtml(value = ""){
  return value.replace(/[&<>"']/g, char => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  })[char]);
}

function inlineMarkdown(value = ""){
  return escapeHtml(value)
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/`(.*?)`/g, "<code>$1</code>");
}

function extractLanguageSection(markdown, language){
  const marker = language === "fr" ? "## 🇫🇷 Description (FR)" : "## 🇬🇧 Description (EN)";
  const start = markdown.indexOf(marker);
  if(start === -1) return "";

  const remaining = markdown.slice(start + marker.length);
  const nextLanguage = remaining.search(/\n## 🇫🇷 Description \(FR\)|\n## 🇬🇧 Description \(EN\)/);
  return (nextLanguage === -1 ? remaining : remaining.slice(0, nextLanguage)).trim();
}

function markdownSectionToHtml(markdown, language){
  if(!markdown) return "";

  const lines = markdown.split(/\r?\n/);
  let html = "";
  let listOpen = false;
  let tableOpen = false;
  let tableHeaderSkipped = false;

  const closeList = () => {
    if(listOpen){ html += "</ul>"; listOpen = false; }
  };
  const closeTable = () => {
    if(tableOpen){ html += "</tbody></table></div>"; tableOpen = false; tableHeaderSkipped = false; }
  };

  for(const rawLine of lines){
    const line = rawLine.trim();

    if(!line){
      closeList();
      closeTable();
      continue;
    }

    if(line.startsWith(">")){
      closeList(); closeTable();
      continue;
    }

    if(line.startsWith("**Domaines de recherche") || line.startsWith("**Research areas")){
      closeList(); closeTable();
      html += `<h3>${translations[language].researchFields}</h3>`;
      continue;
    }

    if(line.startsWith("**Données techniques") || line.startsWith("**Technical data")){
      closeList(); closeTable();
      html += `<h3>${translations[language].technicalData}</h3>`;
      continue;
    }

    if(line.startsWith("- ")){
      closeTable();
      if(!listOpen){ html += '<ul class="research-list">'; listOpen = true; }
      html += `<li>${inlineMarkdown(line.slice(2))}</li>`;
      continue;
    }

    if(line.startsWith("|")){
      closeList();
      const cells = line.split("|").slice(1,-1).map(cell => cell.trim());
      if(cells.every(cell => /^:?-{3,}:?$/.test(cell))){
        tableHeaderSkipped = true;
        continue
      }
      if(!tableOpen){
        html += '<div class="technical-table-wrap"><table class="technical-table"><tbody>';
        tableOpen = true;
      }
      if(cells.length >= 2){
        html += `<tr><th>${inlineMarkdown(cells[0])}</th><td>${inlineMarkdown(cells.slice(1).join(" | "))}</td></tr>`;
      }
      continue;
    }

    closeList(); closeTable();

    if(line.startsWith("### ")){
      html += `<h3>${inlineMarkdown(line.slice(4))}</h3>`;
    }else if(line.startsWith("## ")){
      html += `<h3>${inlineMarkdown(line.slice(3))}</h3>`;
    }else if(!line.startsWith("#") && line !== "---"){
      html += `<p>${inlineMarkdown(line)}</p>`;
    }
  }

  closeList();
  closeTable();
  return html;
}

async function loadProductDocument(product){
  const container = $("#modalDocument");
  container.innerHTML = `<p class="document-loading">${translations[lang].documentLoading}</p>`;

  const filename = DESCRIPTION_FILES[product.id];
  if(!filename){
    container.innerHTML = `<p>${translations[lang].documentUnavailable}</p>`;
    return;
  }

  try{
    const response = await fetch(`content/descriptions/${filename}`);
    if(!response.ok) throw new Error(`HTTP ${response.status}`);
    const markdown = await response.text();
    const section = extractLanguageSection(markdown, lang);
    const html = markdownSectionToHtml(section, lang);
    container.innerHTML = html || `<p>${translations[lang].documentUnavailable}</p>`;
  }catch(error){
    console.warn("Description indisponible :", filename, error);
    container.innerHTML = `<p>${translations[lang].documentUnavailable}</p>`;
  }
}

async function updateCoa(product){
  const section = $("#coaSection");
  const link = $("#modalCoa");
  section.hidden = true;

  const coaUrl = `assets/coa/${product.id}.pdf`;

  try{
    const response = await fetch(coaUrl, {method:"HEAD", cache:"no-store"});
    const isPdf = response.ok && (response.headers.get("content-type") || "").includes("pdf");
    if(isPdf){
      link.href = coaUrl;
      section.hidden = false;
    }
  }catch(error){
    section.hidden = true;
  }
}

function fillModal(product) {
  $("#modalImage").src = product.image;
  $("#modalImage").alt = product.name;
  $("#modalCategory").textContent = lang === "fr" ? product.categoryFr : product.categoryEn;
  $("#modalName").textContent = product.name;
  $("#modalPrice").textContent = `${Number(product.price).toFixed(2)} €`;

  const availability = $("#modalAvailability");
  availability.textContent = product.available ? translations[lang].available : translations[lang].unavailable;
  availability.className = `availability ${product.available ? "available" : "unavailable"}`;

  // Bouton "Ajouter au panier" (géré par store.js via data-add)
  const orderBtn = $("#modalOrder");
  orderBtn.href = "#";
  if (product.available) {
    orderBtn.setAttribute("data-add", "");
    orderBtn.dataset.id = product.id;
    orderBtn.dataset.name = product.name;
    orderBtn.dataset.price = product.price;
    orderBtn.dataset.image = product.image;
    orderBtn.dataset.cat = lang === "fr" ? product.categoryFr : product.categoryEn;
    orderBtn.textContent = translations[lang].addToCart;
    orderBtn.style.opacity = "1";
    orderBtn.style.pointerEvents = "auto";
  } else {
    orderBtn.removeAttribute("data-add");
    orderBtn.textContent = translations[lang].unavailable;
    orderBtn.style.opacity = ".45";
    orderBtn.style.pointerEvents = "none";
  }

  loadProductDocument(product);
  updateCoa(product);
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
  // 1) On tente l'API (catalogue piloté par Google Sheets, temps réel)
  try {
    const response = await fetch("/api/products");
    if (response.ok) {
      const data = await response.json();
      if (Array.isArray(data.products) && data.products.length) {
        products = data.products;
        renderCategories();
        renderProducts();
        return;
      }
    }
  } catch (error) {
    console.warn("API catalogue indisponible, repli sur le fichier local.", error);
  }
  // 2) Repli : fichier statique (ex. ouverture en local sans serveur)
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
