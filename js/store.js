/* ===================== Data Layer =====================
   Single source of truth for all menu data. No traditional database:
   the data lives as a plain JSON file (data.json) committed to the site's
   GitHub repo and served statically, so it's shared across every device.
   The admin panel's cart and "which branch did the visitor pick" state
   stay in localStorage, since those are naturally per-device/per-visitor.
========================================================= */

function uid(prefix) {
  return (prefix ? prefix + '_' : '') + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

const CURRENCIES = [
  { code: 'ILS', symbol: '₪', name: { ar: 'شيكل', en: 'Shekel' } },
  { code: 'JOD', symbol: 'د.أ', name: { ar: 'دينار أردني', en: 'Jordanian Dinar' } },
  { code: 'SAR', symbol: 'ر.س', name: { ar: 'ريال سعودي', en: 'Saudi Riyal' } },
  { code: 'AED', symbol: 'د.إ', name: { ar: 'درهم إماراتي', en: 'UAE Dirham' } },
  { code: 'EGP', symbol: 'ج.م', name: { ar: 'جنيه مصري', en: 'Egyptian Pound' } },
  { code: 'KWD', symbol: 'د.ك', name: { ar: 'دينار كويتي', en: 'Kuwaiti Dinar' } },
  { code: 'QAR', symbol: 'ر.ق', name: { ar: 'ريال قطري', en: 'Qatari Riyal' } },
  { code: 'BHD', symbol: 'د.ب', name: { ar: 'دينار بحريني', en: 'Bahraini Dinar' } },
  { code: 'OMR', symbol: 'ر.ع', name: { ar: 'ريال عماني', en: 'Omani Rial' } },
  { code: 'IQD', symbol: 'د.ع', name: { ar: 'دينار عراقي', en: 'Iraqi Dinar' } },
  { code: 'LYD', symbol: 'د.ل', name: { ar: 'دينار ليبي', en: 'Libyan Dinar' } },
  { code: 'DZD', symbol: 'د.ج', name: { ar: 'دينار جزائري', en: 'Algerian Dinar' } },
  { code: 'MAD', symbol: 'د.م', name: { ar: 'درهم مغربي', en: 'Moroccan Dirham' } },
  { code: 'TND', symbol: 'د.ت', name: { ar: 'دينار تونسي', en: 'Tunisian Dinar' } },
  { code: 'SDG', symbol: 'ج.س', name: { ar: 'جنيه سوداني', en: 'Sudanese Pound' } },
  { code: 'YER', symbol: 'ر.ي', name: { ar: 'ريال يمني', en: 'Yemeni Rial' } },
  { code: 'LBP', symbol: 'ل.ل', name: { ar: 'ليرة لبنانية', en: 'Lebanese Pound' } },
  { code: 'SYP', symbol: 'ل.س', name: { ar: 'ليرة سورية', en: 'Syrian Pound' } }
];

function getCurrency() {
  const code = Store.get().settings.currency || 'ILS';
  return CURRENCIES.find(c => c.code === code) || CURRENCIES[0];
}

function sortByOrder(list) {
  return [...list].sort((a, b) => (a.order || 0) - (b.order || 0));
}

/* A "single choice - different prices" group (e.g. Size) makes each option
   an absolute price rather than an add-on: when present, the first option
   (in its own order) IS the product's price, and the top-level price field
   is unused. rawBasePrice()/productBasePrice() resolve that for every
   place in the app that shows or calculates a product's price. */
function pricingGroup(product) {
  return (product.optionGroups || []).find(g => g.type === 'single_price' && g.options && g.options.length);
}

function rawBasePrice(product) {
  const pg = pricingGroup(product);
  if (pg) return Number(pg.options[0].priceDelta) || 0;
  return product.price;
}

/* "Single choice - different prices" options used to be add-ons layered on
   top of the product's price; they are now absolute prices in their own
   right (see pricingGroup()). This folds the old base price into each such
   option so already-configured products keep charging the same totals. */
function absorbPricingGroupBase(products) {
  products.forEach(p => {
    const pg = (p.optionGroups || []).find(g => g.type === 'single_price' && g.options && g.options.length);
    if (pg) {
      const base = Number(p.price) || 0;
      pg.options.forEach(o => { o.priceDelta = (Number(o.priceDelta) || 0) + base; });
    }
  });
}

function productBasePrice(product) {
  const base = rawBasePrice(product);
  if (product.discountPercent > 0) {
    return Math.floor(base * (1 - product.discountPercent / 100));
  }
  return base;
}

const PLACEHOLDER_IMG = 'data:image/svg+xml;utf8,' + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"><rect width="100%" height="100%" fill="#e9ecef"/><text x="50%" y="50%" font-size="20" fill="#adb5bd" text-anchor="middle" dominant-baseline="middle" font-family="sans-serif">No Image</text></svg>'
);

function defaultData() {
  const burgerImg = 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"><rect width="100%" height="100%" fill="#f4a259"/><text x="50%" y="50%" font-size="60" text-anchor="middle" dominant-baseline="middle">🍔</text></svg>');
  const pizzaImg = 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"><rect width="100%" height="100%" fill="#e76f51"/><text x="50%" y="50%" font-size="60" text-anchor="middle" dominant-baseline="middle">🍕</text></svg>');
  const drinkImg = 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"><rect width="100%" height="100%" fill="#2a9d8f"/><text x="50%" y="50%" font-size="60" text-anchor="middle" dominant-baseline="middle">🥤</text></svg>');
  const dessertImg = 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"><rect width="100%" height="100%" fill="#e9c46a"/><text x="50%" y="50%" font-size="60" text-anchor="middle" dominant-baseline="middle">🍰</text></svg>');
  const branchImg = 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"><rect width="100%" height="100%" fill="#264653"/><text x="50%" y="50%" font-size="60" text-anchor="middle" dominant-baseline="middle">🏬</text></svg>');
  const sliderImg1 = 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="500"><rect width="100%" height="100%" fill="#e76f51"/><text x="50%" y="50%" font-size="40" fill="#fff" text-anchor="middle" dominant-baseline="middle" font-family="sans-serif">Welcome!</text></svg>');
  const sliderImg2 = 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="500"><rect width="100%" height="100%" fill="#2a9d8f"/><text x="50%" y="50%" font-size="40" fill="#fff" text-anchor="middle" dominant-baseline="middle" font-family="sans-serif">Fresh & Tasty</text></svg>');

  const catBurger = uid('cat'), catPizza = uid('cat'), catDrinks = uid('cat'), catDesserts = uid('cat');
  const branch1 = uid('branch'), branch2 = uid('branch');

  const sizeGroup = () => ({
    id: uid('grp'), type: 'single_price',
    name: { ar: 'الحجم', en: 'Size' },
    options: [
      { id: uid('opt'), name: { ar: 'صغير', en: 'Small' }, priceDelta: 0 },
      { id: uid('opt'), name: { ar: 'وسط', en: 'Medium' }, priceDelta: 2 },
      { id: uid('opt'), name: { ar: 'كبير', en: 'Large' }, priceDelta: 4 }
    ]
  });
  const extrasGroup = () => ({
    id: uid('grp'), type: 'multi_priced',
    name: { ar: 'إضافات', en: 'Extras' },
    options: [
      { id: uid('opt'), name: { ar: 'جبنة إضافية', en: 'Extra Cheese' }, priceDelta: 1.5 },
      { id: uid('opt'), name: { ar: 'مشروم', en: 'Mushroom' }, priceDelta: 1 }
    ]
  });
  const removeGroup = () => ({
    id: uid('grp'), type: 'multi_flat',
    name: { ar: 'بدون', en: 'Remove' },
    options: [
      { id: uid('opt'), name: { ar: 'بدون بصل', en: 'No Onion' }, priceDelta: 0 },
      { id: uid('opt'), name: { ar: 'بدون مخلل', en: 'No Pickles' }, priceDelta: 0 }
    ]
  });

  const products = [
    { id: uid('prod'), categoryId: catBurger, image: burgerImg, price: 5,
      name: { ar: 'برجر كلاسيك', en: 'Classic Burger' },
      description: { ar: 'برجر لحم مع خس وطماطم وجبنة', en: 'Beef burger with lettuce, tomato & cheese' },
      optionGroups: [sizeGroup(), extrasGroup(), removeGroup()] },
    { id: uid('prod'), categoryId: catBurger, image: burgerImg, price: 6,
      name: { ar: 'برجر دجاج', en: 'Chicken Burger' },
      description: { ar: 'برجر دجاج مقرمش', en: 'Crispy chicken burger' },
      optionGroups: [sizeGroup(), extrasGroup()] },
    { id: uid('prod'), categoryId: catBurger, image: burgerImg, price: 7,
      name: { ar: 'برجر دبل تشيز', en: 'Double Cheese Burger' },
      description: { ar: 'طبقتين لحم مع جبنة مضاعفة', en: 'Double beef patty with double cheese' },
      optionGroups: [extrasGroup(), removeGroup()] },

    { id: uid('prod'), categoryId: catPizza, image: pizzaImg, price: 8,
      name: { ar: 'بيتزا مارغريتا', en: 'Margherita Pizza' },
      description: { ar: 'صوص طماطم وجبنة موزاريلا', en: 'Tomato sauce & mozzarella' },
      optionGroups: [sizeGroup(), extrasGroup()] },
    { id: uid('prod'), categoryId: catPizza, image: pizzaImg, price: 9,
      name: { ar: 'بيتزا خضار', en: 'Veggie Pizza' },
      description: { ar: 'خضار طازجة مشكلة', en: 'Fresh mixed vegetables' },
      optionGroups: [sizeGroup(), extrasGroup()] },
    { id: uid('prod'), categoryId: catPizza, image: pizzaImg, price: 10,
      name: { ar: 'بيتزا بيبروني', en: 'Pepperoni Pizza' },
      description: { ar: 'بيبروني وجبنة موزاريلا', en: 'Pepperoni & mozzarella cheese' },
      optionGroups: [sizeGroup(), extrasGroup()] },
    { id: uid('prod'), categoryId: catPizza, image: pizzaImg, price: 9,
      name: { ar: 'بيتزا دجاج باربكيو', en: 'BBQ Chicken Pizza' },
      description: { ar: 'دجاج مع صوص باربكيو', en: 'Chicken with BBQ sauce' },
      optionGroups: [sizeGroup()] },
    { id: uid('prod'), categoryId: catPizza, image: pizzaImg, price: 11,
      name: { ar: 'بيتزا سوبريم', en: 'Supreme Pizza' },
      description: { ar: 'خليط من اللحوم والخضار', en: 'Mixed meat & vegetables' },
      optionGroups: [sizeGroup(), extrasGroup()] },

    { id: uid('prod'), categoryId: catDrinks, image: drinkImg, price: 1.5,
      name: { ar: 'كوكاكولا', en: 'Coca-Cola' },
      description: { ar: 'مشروب غازي بارد', en: 'Chilled soft drink' },
      optionGroups: [] },
    { id: uid('prod'), categoryId: catDrinks, image: drinkImg, price: 2,
      name: { ar: 'عصير برتقال', en: 'Orange Juice' },
      description: { ar: 'عصير طبيعي طازج', en: 'Fresh natural juice' },
      optionGroups: [] },
    { id: uid('prod'), categoryId: catDrinks, image: drinkImg, price: 2.5,
      name: { ar: 'ميلك شيك فانيلا', en: 'Vanilla Milkshake' },
      description: { ar: 'ميلك شيك بارد وكريمي', en: 'Cold & creamy milkshake' },
      optionGroups: [] },
    { id: uid('prod'), categoryId: catDrinks, image: drinkImg, price: 1,
      name: { ar: 'مياه معدنية', en: 'Mineral Water' },
      description: { ar: 'زجاجة مياه معدنية', en: 'Bottled mineral water' },
      optionGroups: [] },

    { id: uid('prod'), categoryId: catDesserts, image: dessertImg, price: 3,
      name: { ar: 'تشيز كيك', en: 'Cheesecake' },
      description: { ar: 'قطعة تشيز كيك كريمية', en: 'Creamy cheesecake slice' },
      optionGroups: [] },
    { id: uid('prod'), categoryId: catDesserts, image: dessertImg, price: 3.5,
      name: { ar: 'براوني شوكولاتة', en: 'Chocolate Brownie' },
      description: { ar: 'براوني ساخن بالشوكولاتة', en: 'Warm chocolate brownie' },
      optionGroups: [] }
  ];

  products.forEach((p, i) => { p.discountPercent = 0; p.branchIds = []; p.order = i; });
  absorbPricingGroupBase(products);

  return {
    schemaVersion: 2,
    settings: {
      lang: 'ar',
      restaurantName: { ar: 'مطعمي', en: 'My Restaurant' },
      logo: '',
      whatsappNumber: '970000000000',
      currency: 'ILS',
      multiBranch: true,
      deliveryZones: [
        { id: uid('zone'), name: { ar: 'داخل المدينة', en: 'In-city' }, price: 5 },
        { id: uid('zone'), name: { ar: 'خارج المدينة', en: 'Out of city' }, price: 10 }
      ],
      slider: { images: [sliderImg1, sliderImg2], intervalSeconds: 4 },
      colors: {
        branches: { type: 'gradient', color1: '#264653', color2: '#2a9d8f', angle: 135 },
        menu: { type: 'gradient', color1: '#e76f51', color2: '#e9c46a', angle: 135 },
        checkout: { type: 'gradient', color1: '#264653', color2: '#2a9d8f', angle: 135 },
        secondary: { type: 'solid', color1: '#37474f', color2: '#37474f', angle: 135 },
        header: { type: 'solid', color1: '#ffffff', color2: '#ffffff', angle: 135 }
      }
    },
    branches: [
      { id: branch1, name: { ar: 'الفرع الرئيسي', en: 'Main Branch' }, image: branchImg },
      { id: branch2, name: { ar: 'فرع الوسط', en: 'Downtown Branch' }, image: branchImg }
    ],
    categories: [
      { id: catBurger, name: { ar: 'برجر', en: 'Burgers' }, image: burgerImg, branchIds: [], order: 0 },
      { id: catPizza, name: { ar: 'بيتزا', en: 'Pizza' }, image: pizzaImg, branchIds: [], order: 1 },
      { id: catDrinks, name: { ar: 'مشروبات', en: 'Drinks' }, image: drinkImg, branchIds: [], order: 2 },
      { id: catDesserts, name: { ar: 'حلويات', en: 'Desserts' }, image: dessertImg, branchIds: [], order: 3 }
    ],
    products
  };
}

function migrateData(data) {
  const colors = data.settings.colors;
  if (!colors.secondary) {
    colors.secondary = { type: 'solid', color1: '#37474f', color2: '#37474f', angle: 135 };
  }
  if (!colors.header) {
    colors.header = { type: 'solid', color1: '#ffffff', color2: '#ffffff', angle: 135 };
  }
  if (!data.settings.currency) {
    data.settings.currency = 'ILS';
  }
  if (!Array.isArray(data.settings.deliveryZones)) {
    data.settings.deliveryZones = [];
  }
  data.categories.forEach((c, i) => {
    if (!Array.isArray(c.branchIds)) c.branchIds = [];
    if (typeof c.order !== 'number') c.order = i;
  });
  data.products.forEach((p, i) => {
    if (!Array.isArray(p.branchIds)) p.branchIds = [];
    if (typeof p.discountPercent !== 'number') p.discountPercent = 0;
    if (typeof p.order !== 'number') p.order = i;
  });
  return data;
}

function getDemoRestaurantId() {
  const match = window.location.pathname.match(/^\/(?:r\/)?([0-9]{3})(?:\/)?$/);
  return match ? match[1] : (localStorage.getItem('qrresto_demo_restaurant') || null);
}

function applyDemoBranding(data) {
  const id = getDemoRestaurantId();
  if (!id) return data;

  // Demo mode changes only the logo. The menu data, prices, products,
  // branches, colors, etc. stay exactly the same for every restaurant.
  const logoCandidates = [
    `/logos/${id}.png`,
    `/logos/${id}.jpg`,
    `/logos/${id}.jpeg`,
    `/logos/${id}.webp`,
    `/logos/${id}.svg`
  ];

  data.settings = { ...data.settings, logo: logoCandidates[0] };
  data._demoLogoCandidates = logoCandidates;
  data._demoRestaurantId = id;
  return data;
}

const Store = {
  _cache: null,

  /* Data now lives in a shared /data.json file (committed to GitHub, served
     statically by Vercel) instead of localStorage, so every device/browser
     sees the same menu. Every page must `await Store.ready` before calling
     Store.get() for the first time. */
  load() {
    return this._cache || (this._cache = defaultData());
  },

  save() {
    // Optimistic: keep working on the in-memory cache immediately, and
    // push the update to the server in the background.
    this._syncToServer();
  },

  _syncToServer() {
    const secret = this.getAdminSecret();
    fetch('/api/menu', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-secret': secret },
      body: JSON.stringify(this._cache)
    }).then(res => {
      if (!res.ok) {
        window.dispatchEvent(new CustomEvent('qrresto:sync-error', {
          detail: res.status === 401 ? 'session_expired' : 'sync_failed'
        }));
      }
    }).catch(() => {
      window.dispatchEvent(new CustomEvent('qrresto:sync-error', { detail: 'sync_failed' }));
    });
  },

  get() {
    return this.load();
  },

  reset() {
    this._cache = defaultData();
    this.save();
    return this._cache;
  },

  // ---- Cart (kept separate for simplicity, scoped per branch so switching
  //      branches never mixes carts together) ----
  _cartKey() {
    return 'qrresto_cart_' + (this.getSelectedBranch() || 'default');
  },
  getCart() {
    try {
      return JSON.parse(localStorage.getItem(this._cartKey()) || '[]');
    } catch (e) { return []; }
  },
  saveCart(cart) {
    localStorage.setItem(this._cartKey(), JSON.stringify(cart));
  },
  cartCount() {
    return this.getCart().reduce((sum, item) => sum + item.qty, 0);
  },

  // ---- Selected branch ----
  getSelectedBranch() {
    return localStorage.getItem('qrresto_branch') || null;
  },
  setSelectedBranch(id) {
    localStorage.setItem('qrresto_branch', id);
  },

  // ---- Admin session ----
  // A single secret (set on the server as the ADMIN_SECRET env var) replaces
  // the old username/password pair, which used to be stored inside the
  // public data file — that would have exposed the login to anyone who
  // opened /data.json directly.
  isAdminLoggedIn() {
    return !!sessionStorage.getItem('qrresto_admin_secret');
  },
  getAdminSecret() {
    return sessionStorage.getItem('qrresto_admin_secret') || '';
  },
  setAdminSecret(secret) {
    sessionStorage.setItem('qrresto_admin_secret', secret);
  },
  logout() {
    sessionStorage.removeItem('qrresto_admin_secret');
  }
};

/* Fetch the shared menu data once per page load. Every page's script must
   `await Store.ready` before the first Store.get() call. */
Store.ready = (async () => {
  try {
    const res = await fetch('/data.json', { cache: 'no-store' });
    if (!res.ok) throw new Error('data.json fetch failed: ' + res.status);
    Store._cache = applyDemoBranding(migrateData(await res.json()));
  } catch (e) {
    console.error('Falling back to built-in default data:', e);
    Store._cache = defaultData();
  }
})();
