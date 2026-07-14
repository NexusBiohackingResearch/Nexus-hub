
const CONFIG = {
  telegramUrl: "https://t.me/VOTRE_BOT_TELEGRAM",
  cataloguePdfUrl: "#",
  coaUrl: "#"
};

document.querySelectorAll("[data-telegram]").forEach(link => link.href = CONFIG.telegramUrl);
document.querySelectorAll("[data-catalog-pdf]").forEach(link => link.href = CONFIG.cataloguePdfUrl);
document.querySelectorAll("[data-coa]").forEach(link => link.href = CONFIG.coaUrl);

const menuToggle = document.getElementById("menuToggle");
const mainNav = document.getElementById("mainNav");
menuToggle?.addEventListener("click", () => mainNav.classList.toggle("open"));
mainNav?.querySelectorAll("a").forEach(a => a.addEventListener("click", () => mainNav.classList.remove("open")));

const revealObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add("visible");
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: .12 });
document.querySelectorAll(".reveal").forEach(el => revealObserver.observe(el));

let products = [];
const productGrid = document.getElementById("productGrid");
const productCount = document.getElementById("productCount");
const searchInput = document.getElementById("searchInput");
const categoryFilter = document.getElementById("categoryFilter");
const clearFilters = document.getElementById("clearFilters");

fetch("products.json")
  .then(r => r.json())
  .then(data => {
    products = data;
    const categories = [...new Set(products.map(p => p.category))].sort();
    categories.forEach(category => {
      const option = document.createElement("option");
      option.value = category;
      option.textContent = category;
      categoryFilter.appendChild(option);
    });
    renderProducts();
  })
  .catch(() => {
    productCount.textContent = "Catalogue indisponible";
  });

function renderProducts() {
  const q = searchInput.value.trim().toLowerCase();
  const category = categoryFilter.value;
  const filtered = products.filter(product => {
    const matchesText = !q || `${product.name} ${product.category}`.toLowerCase().includes(q);
    const matchesCategory = !category || product.category === category;
    return matchesText && matchesCategory;
  });

  productCount.textContent = `${filtered.length} référence${filtered.length > 1 ? "s" : ""}`;
  productGrid.innerHTML = filtered.map(product => `
    <article class="product-card">
      <div class="product-top">
        <span class="product-tag">${product.tag}</span>
        <span class="product-category">${product.category}</span>
      </div>
      <h3>${product.name}</h3>
      <div class="product-footer">
        <div>
          <div class="product-category">Prix indicatif</div>
          <div class="price">${Number(product.price).toFixed(2)} €</div>
        </div>
        <button class="add-button" data-product="${product.name}">Commander</button>
      </div>
    </article>
  `).join("");

  productGrid.querySelectorAll(".add-button").forEach(button => {
    button.addEventListener("click", () => {
      const product = encodeURIComponent(button.dataset.product);
      const message = encodeURIComponent(`Bonjour, je souhaite commander : ${button.dataset.product}`);
      const deepLink = `${CONFIG.telegramUrl}?text=${message}`;
      window.open(deepLink, "_blank", "noopener");
    });
  });
}

searchInput.addEventListener("input", renderProducts);
categoryFilter.addEventListener("change", renderProducts);
clearFilters.addEventListener("click", () => {
  searchInput.value = "";
  categoryFilter.value = "";
  renderProducts();
});

// Animated biotechnology background: DNA ribbon + molecules + particles.
const canvas = document.getElementById("bioCanvas");
const ctx = canvas.getContext("2d");
let width = 0;
let height = 0;
let dpr = Math.min(window.devicePixelRatio || 1, 2);
let time = 0;
let mouseX = 0;
let mouseY = 0;

const particles = Array.from({ length: 56 }, () => ({
  x: Math.random(),
  y: Math.random(),
  z: .25 + Math.random() * .75,
  r: .5 + Math.random() * 1.6,
  speed: .00008 + Math.random() * .00016
}));

const molecules = Array.from({ length: 8 }, () => ({
  x: Math.random(),
  y: Math.random(),
  size: 22 + Math.random() * 38,
  phase: Math.random() * Math.PI * 2,
  speed: .00012 + Math.random() * .0002
}));

function resize() {
  width = window.innerWidth;
  height = window.innerHeight;
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
window.addEventListener("resize", resize);
window.addEventListener("pointermove", e => {
  mouseX = (e.clientX / width - .5) * 18;
  mouseY = (e.clientY / height - .5) * 12;
});
resize();

function drawDNA(t) {
  const centerX = width * .5 + mouseX;
  const startY = -80;
  const spacing = 24;
  const amplitude = Math.min(110, width * .13);
  const turns = Math.ceil((height + 160) / spacing);
  ctx.lineWidth = 1;

  for (let i = 0; i < turns; i++) {
    const y = startY + i * spacing;
    const phase = i * .42 + t * .00045;
    const x1 = centerX + Math.sin(phase) * amplitude;
    const x2 = centerX + Math.sin(phase + Math.PI) * amplitude;
    const depth = (Math.cos(phase) + 1) / 2;
    const alpha = .05 + depth * .12;

    ctx.beginPath();
    ctx.strokeStyle = `rgba(23,217,232,${alpha})`;
    ctx.moveTo(x1, y);
    ctx.lineTo(x2, y);
    ctx.stroke();

    ctx.beginPath();
    ctx.fillStyle = `rgba(118,239,101,${.06 + depth * .16})`;
    ctx.arc(x1, y, 2.2 + depth * 1.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.fillStyle = `rgba(155,71,255,${.05 + (1-depth) * .15})`;
    ctx.arc(x2, y, 2.2 + (1-depth) * 1.5, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawParticles(t) {
  particles.forEach(p => {
    p.y -= p.speed * 16;
    if (p.y < -.02) { p.y = 1.02; p.x = Math.random(); }
    const x = p.x * width + mouseX * p.z;
    const y = p.y * height + mouseY * p.z;
    ctx.beginPath();
    ctx.fillStyle = `rgba(164,228,255,${.05 + p.z * .12})`;
    ctx.arc(x, y, p.r * p.z, 0, Math.PI * 2);
    ctx.fill();
  });
}

function drawMolecules(t) {
  molecules.forEach(m => {
    const x = m.x * width + Math.sin(t * m.speed + m.phase) * 24 + mouseX * .25;
    const y = m.y * height + Math.cos(t * m.speed * .8 + m.phase) * 18 + mouseY * .25;
    const s = m.size;
    ctx.strokeStyle = "rgba(125,207,235,.065)";
    ctx.fillStyle = "rgba(125,207,235,.08)";
    ctx.lineWidth = 1;

    const pts = [
      [x, y],
      [x + s*.7, y - s*.28],
      [x + s*.9, y + s*.42],
      [x + s*.2, y + s*.72]
    ];
    ctx.beginPath();
    pts.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]));
    ctx.closePath();
    ctx.stroke();
    pts.forEach((p, i) => {
      ctx.beginPath();
      ctx.arc(p[0], p[1], i === 0 ? 3.2 : 2.2, 0, Math.PI * 2);
      ctx.fill();
    });
  });
}

function animate(t) {
  time = t;
  ctx.clearRect(0, 0, width, height);
  drawParticles(t);
  drawMolecules(t);
  drawDNA(t);
  requestAnimationFrame(animate);
}
if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
  requestAnimationFrame(animate);
}
