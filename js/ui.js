/* ===================== Shared UI: header, footer, helpers ===================== */

/* The lucide <script> is loaded with `defer`, so on first page load it can still
   be pending when our own (non-deferred) scripts run. Fall back to DOMContentLoaded
   in that case; after initial load lucide is always available already. */
/* Removes the full-screen loading overlay (white background + logo) that's
   inlined at the top of every page's <body>. Called once the page's real
   content is fully built, so the swap from splash -> real page is instant
   with nothing wrongly-colored ever visible in between. Safe to call even
   if the overlay isn't present. */
function hideSplash() {
  const el = document.getElementById('appSplash');
  if (el) el.remove();
}

function renderIcons() {
  if (window.lucide) {
    lucide.createIcons();
  } else {
    window.addEventListener('DOMContentLoaded', () => { if (window.lucide) lucide.createIcons(); }, { once: true });
  }
}

function fmtPrice(n) {
  n = Number(n);
  return Number.isInteger(n) ? String(n) : n.toFixed(2);
}

function fmtMoney(n) {
  return `${fmtPrice(n)} ${getCurrency().symbol}`;
}

function applyPageColors(pageKey) {
  const colors = Store.get().settings.colors[pageKey];
  if (!colors) return;
  const el = document.body;
  if (colors.type === 'gradient') {
    el.style.setProperty('--page-bg', `linear-gradient(${colors.angle || 135}deg, ${colors.color1}, ${colors.color2})`);
  } else {
    el.style.setProperty('--page-bg', colors.color1);
  }
}

function applySecondaryColor() {
  const colors = Store.get().settings.colors.secondary;
  if (!colors) return;
  const value = colors.type === 'gradient'
    ? `linear-gradient(${colors.angle || 135}deg, ${colors.color1}, ${colors.color2})`
    : colors.color1;
  document.documentElement.style.setProperty('--secondary-bg', value);
}

function applyHeaderColor() {
  const colors = Store.get().settings.colors.header;
  if (!colors) return;
  const value = colors.type === 'gradient'
    ? `linear-gradient(${colors.angle || 135}deg, ${colors.color1}, ${colors.color2})`
    : colors.color1;
  document.documentElement.style.setProperty('--header-bg', value);
}

function renderHeader({ showBack = false, backHref = null } = {}) {
  const settings = Store.get().settings;
  const header = document.getElementById('site-header');
  if (!header) return;
  applySecondaryColor();
  applyHeaderColor();
  const lang = getLang();
  const otherLang = lang === 'ar' ? 'en' : 'ar';
  header.innerHTML = `
    <div class="header-inner">
      <div class="header-side header-start">
        ${showBack ? `<button id="backBtn" class="icon-btn back-btn" aria-label="${t('back')}"><i data-lucide="${lang === 'ar' ? 'chevron-right' : 'chevron-left'}"></i></button>` : ''}
        <button id="langBtn" class="lang-toggle" aria-label="language">
          <span>${otherLang === 'ar' ? 'عربي' : 'English'}</span>
        </button>
      </div>
      <div class="header-logo">
        <a href="index.html">
          ${settings.logo ? `<img src="${settings.logo}" alt="logo" onerror="this.onerror=null;this.style.display='none';this.nextElementSibling.style.display='inline';"><span class="logo-text" style="display:none">${tField(settings.restaurantName)}</span>` : `<span class="logo-text">${tField(settings.restaurantName)}</span>`}
        </a>
      </div>
      <div class="header-side header-end">
        <a href="cart.html" class="icon-btn cart-btn" aria-label="${t('cart')}">
          <i data-lucide="shopping-cart"></i>
          <span id="cartCount" class="cart-count">${Store.cartCount()}</span>
        </a>
      </div>
    </div>
  `;
  const langBtn = document.getElementById('langBtn');
  if (langBtn) langBtn.addEventListener('click', () => {
    setLang(otherLang);
    location.reload();
  });
  const backBtn = document.getElementById('backBtn');
  if (backBtn) backBtn.addEventListener('click', () => {
    if (backHref) location.href = backHref;
    else history.back();
  });
  renderIcons();
}

function renderFooter() {
  const footer = document.getElementById('site-footer');
  if (!footer) return;
  const settings = Store.get().settings;
  footer.innerHTML = `
    <button id="footerAdminBtn" class="footer-admin-btn">
      <span class="footer-name">${tField(settings.restaurantName)}</span>
    </button>
  `;
  document.getElementById('footerAdminBtn').addEventListener('click', () => {
    location.href = 'admin/login.html';
  });
}

function updateCartCount() {
  const el = document.getElementById('cartCount');
  if (el) el.textContent = Store.cartCount();
}

function toast(msg) {
  let el = document.getElementById('toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'toast';
    el.className = 'toast';
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(el._timer);
  el._timer = setTimeout(() => el.classList.remove('show'), 2200);
}

/* Downscales and re-compresses the image before it's stored, so raw phone
   photos (often several MB each) don't blow past the localStorage quota -
   which on some mobile browsers is as tight as ~5MB shared by everything
   the site stores - and get silently dropped. Re-encodes as JPEG (except
   formats likely to carry transparency, kept as PNG) and, if still too
   large, keeps shrinking quality/dimensions until it fits a safe budget,
   so five uploads reliably fit even on a constrained quota. */
function fileToDataURL(file, maxDim = 900, quality = 0.8) {
  const targetBytes = 220 * 1024; // ~220KB budget per image
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => resolve(reader.result);
      img.onload = () => {
        const preserveAlpha = file.type === 'image/png' || file.type === 'image/webp' || file.type === 'image/gif';

        function renderAt(dim, q) {
          const scale = Math.min(1, dim / Math.max(img.width, img.height));
          const width = Math.max(1, Math.round(img.width * scale));
          const height = Math.max(1, Math.round(img.height * scale));
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          canvas.getContext('2d').drawImage(img, 0, 0, width, height);
          return canvas.toDataURL(preserveAlpha ? 'image/png' : 'image/jpeg', q);
        }

        let dim = maxDim;
        let q = quality;
        let result = renderAt(dim, q);
        let attempts = 0;
        while (result.length * 0.75 > targetBytes && attempts < 8) {
          if (!preserveAlpha && q > 0.4) {
            q -= 0.15;
          } else {
            dim = Math.round(dim * 0.75);
          }
          result = renderAt(dim, q);
          attempts++;
        }
        resolve(result);
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}
