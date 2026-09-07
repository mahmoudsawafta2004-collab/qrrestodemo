/* ===================== Admin Panel Logic ===================== */

if (!Store.isAdminLoggedIn()) {
  location.replace('/admin/login.html');
}

applyDocDir();

const SECTIONS = [
  { key: 'branches', icon: 'store' },
  { key: 'slider', icon: 'images' },
  { key: 'categories', icon: 'layout-grid' },
  { key: 'products', icon: 'utensils' },
  { key: 'delivery_zones', icon: 'truck' },
  { key: 'colors', icon: 'palette' },
  { key: 'general_settings', icon: 'settings' },
  { key: 'login_settings', icon: 'key-round' } // now just an info panel, see renderLogin()
];
const SECTION_ID = { branches: 'branches', slider: 'slider', categories: 'categories', products: 'products', delivery_zones: 'delivery', colors: 'colors', general_settings: 'general', login_settings: 'login' };

window.addEventListener('qrresto:sync-error', (e) => {
  if (e.detail === 'session_expired') {
    toast(t('session_expired'));
    Store.logout();
    setTimeout(() => location.href = '/admin/login.html', 1200);
  } else {
    toast(t('sync_error'));
  }
});

let activeSection = 'branches';
let adminLangTab = 'ar'; // for editing bilingual fields in forms

function db() { return Store.get(); }
function persist() {
  try {
    Store.save();
    return true;
  } catch (e) {
    console.error('Save failed', e);
    toast(t('storage_error'));
    return false;
  }
}

/* ---- Layout: nav, topbar ---- */
function renderNav() {
  applySecondaryColor();
  document.getElementById('sideTitle').textContent = t('admin_panel');
  const navHtml = SECTIONS.map(s => `
    <button class="admin-nav-item ${activeSection === s.key ? 'active' : ''}" data-key="${s.key}">
      <i data-lucide="${s.icon}"></i><span>${t(s.key)}</span>
    </button>
  `).join('');
  document.getElementById('sideNav').innerHTML = navHtml;
  document.getElementById('mobileNav').innerHTML = SECTIONS.map(s => `
    <button class="${activeSection === s.key ? 'active' : ''}" data-key="${s.key}">${t(s.key)}</button>
  `).join('');
  document.querySelectorAll('[data-key]').forEach(btn => {
    btn.addEventListener('click', () => {
      activeSection = btn.dataset.key;
      renderAll();
    });
  });
  document.getElementById('langBtnText').textContent = getLang() === 'ar' ? 'EN' : 'عربي';
  document.getElementById('viewSiteBtn').textContent = t('go_to_menu');
  document.getElementById('logoutBtn').textContent = t('logout');
  renderIcons();
}

document.getElementById('langToggle').addEventListener('click', () => {
  setLang(getLang() === 'ar' ? 'en' : 'ar');
  location.reload();
});
document.getElementById('logoutBtn').addEventListener('click', () => {
  Store.logout();
  location.href = '/admin/login.html';
});

function showSections() {
  Object.entries(SECTION_ID).forEach(([key, id]) => {
    document.getElementById('sec-' + id).classList.toggle('active', key === activeSection);
  });
}

function renderAll() {
  renderNav();
  showSections();
  renderBranches();
  renderSlider();
  renderCategories();
  renderProducts();
  renderDeliveryZones();
  renderColors();
  renderGeneral();
  renderLogin();
}

/* ===================== Branches ===================== */
let editingBranch = null;
function renderBranches() {
  const data = db();
  const el = document.getElementById('sec-branches');
  el.innerHTML = `
    <div class="admin-card">
      <div class="checkbox-row">
        <input type="checkbox" id="multiBranchToggle" ${data.settings.multiBranch ? 'checked' : ''}>
        <label for="multiBranchToggle">${t('enable_multi_branch')}</label>
      </div>
    </div>
    <div class="admin-card">
      <div class="admin-topbar"><h3>${t('branches')}</h3><button class="btn-add" id="addBranchBtn">+ ${t('add')}</button></div>
      <div id="branchList"></div>
    </div>
    <div class="admin-card hidden" id="branchFormCard"></div>
  `;
  document.getElementById('multiBranchToggle').addEventListener('change', (e) => {
    data.settings.multiBranch = e.target.checked;
    persist();
  });
  document.getElementById('addBranchBtn').addEventListener('click', () => openBranchForm(null));

  document.getElementById('branchList').innerHTML = data.branches.map(b => `
    <div class="admin-list-item">
      <img src="${b.image || PLACEHOLDER_IMG}">
      <div class="info"><strong>${tField(b.name)}</strong></div>
      <div class="actions">
        <button class="btn-sm btn-edit" data-edit="${b.id}">${t('edit')}</button>
        <button class="btn-sm btn-del" data-del="${b.id}">${t('delete')}</button>
      </div>
    </div>
  `).join('') || `<p class="mini-note">-</p>`;

  document.querySelectorAll('#branchList [data-edit]').forEach(b => b.addEventListener('click', () => openBranchForm(b.dataset.edit)));
  document.querySelectorAll('#branchList [data-del]').forEach(b => b.addEventListener('click', () => {
    if (!confirm(t('confirm_delete'))) return;
    data.branches = data.branches.filter(x => x.id !== b.dataset.del);
    persist(); renderBranches();
  }));
}

function openBranchForm(id) {
  const data = db();
  const branch = id ? data.branches.find(x => x.id === id) : { id: null, name: { ar: '', en: '' }, image: '' };
  const card = document.getElementById('branchFormCard');
  card.classList.remove('hidden');
  card.innerHTML = `
    <h3>${id ? t('edit') : t('add')}</h3>
    <img src="${branch.image || PLACEHOLDER_IMG}" class="image-preview" id="branchImgPreview">
    <div class="form-group"><label>${t('image')}</label><input type="file" id="branchImgInput" accept="image/*"></div>
    <div class="form-row">
      <div class="form-group"><label>${t('name_ar')}</label><input type="text" id="branchNameAr" value="${branch.name.ar || ''}"></div>
      <div class="form-group"><label>${t('name_en')}</label><input type="text" id="branchNameEn" value="${branch.name.en || ''}"></div>
    </div>
    <div style="display:flex;gap:10px;">
      <button class="btn-primary" id="saveBranchBtn" style="width:auto;padding:10px 24px;">${t('save')}</button>
      <button class="btn-sm" id="cancelBranchBtn" style="background:var(--light-bg);">${t('cancel')}</button>
    </div>
  `;
  let newImage = branch.image;
  document.getElementById('branchImgInput').addEventListener('change', async (e) => {
    if (e.target.files[0]) { newImage = await fileToDataURL(e.target.files[0]); document.getElementById('branchImgPreview').src = newImage; }
  });
  document.getElementById('cancelBranchBtn').addEventListener('click', () => card.classList.add('hidden'));
  document.getElementById('saveBranchBtn').addEventListener('click', () => {
    const name = { ar: document.getElementById('branchNameAr').value.trim(), en: document.getElementById('branchNameEn').value.trim() };
    if (!name.ar && !name.en) { toast(t('required')); return; }
    if (id) {
      branch.name = name; branch.image = newImage;
    } else {
      data.branches.push({ id: uid('branch'), name, image: newImage });
    }
    persist();
    toast(t('saved_successfully'));
    card.classList.add('hidden');
    renderBranches();
  });
}

/* ===================== Slider ===================== */
function renderSlider() {
  const data = db();
  const el = document.getElementById('sec-slider');
  el.innerHTML = `
    <div class="admin-card">
      <h3>${t('slider_images')}</h3>
      <div style="display:flex;flex-wrap:wrap;gap:10px;" id="sliderImgs"></div>
      <div class="form-group" style="margin-top:12px;" id="sliderAddWrap">
        <label>${t('upload_image')}</label>
        <input type="file" id="sliderImgInput" accept="image/*">
      </div>
      <div class="form-group">
        <label>${t('slider_interval')}</label>
        <input type="number" min="1" id="sliderInterval" value="${data.settings.slider.intervalSeconds}" style="max-width:120px;">
      </div>
      <button class="btn-primary" id="saveSliderBtn" style="width:auto;padding:10px 24px;">${t('save')}</button>
    </div>
  `;
  const imgsWrap = document.getElementById('sliderImgs');
  imgsWrap.innerHTML = data.settings.slider.images.map((src, i) => `
    <div style="position:relative;">
      <img src="${src}" style="width:110px;height:70px;object-fit:cover;border-radius:8px;">
      <button data-i="${i}" class="btn-sm btn-del" style="position:absolute;top:2px;inset-inline-end:2px;">×</button>
    </div>
  `).join('');
  imgsWrap.querySelectorAll('[data-i]').forEach(btn => btn.addEventListener('click', () => {
    data.settings.slider.images.splice(Number(btn.dataset.i), 1);
    persist(); renderSlider();
  }));
  if (data.settings.slider.images.length >= 3) {
    document.getElementById('sliderAddWrap').classList.add('hidden');
  } else {
    document.getElementById('sliderImgInput').addEventListener('change', async (e) => {
      if (e.target.files[0]) {
        const url = await fileToDataURL(e.target.files[0]);
        data.settings.slider.images.push(url);
        if (!persist()) data.settings.slider.images.pop();
        renderSlider();
      }
    });
  }
  document.getElementById('saveSliderBtn').addEventListener('click', () => {
    data.settings.slider.intervalSeconds = Number(document.getElementById('sliderInterval').value) || 4;
    persist();
    toast(t('saved_successfully'));
  });
}

/* ===================== Categories ===================== */
function renderCategories() {
  const data = db();
  const el = document.getElementById('sec-categories');
  el.innerHTML = `
    <div class="admin-card">
      <div class="admin-topbar"><h3>${t('categories')}</h3><button class="btn-add" id="addCatBtn">+ ${t('add')}</button></div>
      <div id="catList"></div>
    </div>
    <div class="admin-card hidden" id="catFormCard"></div>
  `;
  document.getElementById('addCatBtn').addEventListener('click', () => openCatForm(null));
  document.getElementById('catList').innerHTML = sortByOrder(data.categories).map(c => `
    <div class="admin-list-item">
      <img src="${c.image || PLACEHOLDER_IMG}">
      <div class="info"><strong>${tField(c.name)}</strong><div class="mini-note">${t('sort_order')}: ${c.order || 0}</div></div>
      <div class="actions">
        <button class="btn-sm btn-edit" data-edit="${c.id}">${t('edit')}</button>
        <button class="btn-sm btn-del" data-del="${c.id}">${t('delete')}</button>
      </div>
    </div>
  `).join('') || `<p class="mini-note">-</p>`;
  document.querySelectorAll('#catList [data-edit]').forEach(b => b.addEventListener('click', () => openCatForm(b.dataset.edit)));
  document.querySelectorAll('#catList [data-del]').forEach(b => b.addEventListener('click', () => {
    if (!confirm(t('confirm_delete'))) return;
    data.categories = data.categories.filter(x => x.id !== b.dataset.del);
    persist(); renderCategories();
  }));
}

function branchCheckboxesHtml(name, selectedIds) {
  const data = db();
  if (data.branches.length <= 1) return '';
  return `
    <div class="form-group">
      <label>${t('branch_availability')}</label>
      <div class="branch-checkbox-list">
        ${data.branches.map(b => `
          <label><input type="checkbox" class="${name}-branch" value="${b.id}" ${selectedIds.includes(b.id) ? 'checked' : ''}> ${tField(b.name)}</label>
        `).join('')}
      </div>
      <p class="mini-note">${t('all_branches_note')}</p>
    </div>
  `;
}
function readCheckedBranches(name) {
  return Array.from(document.querySelectorAll(`.${name}-branch:checked`)).map(cb => cb.value);
}

function openCatForm(id) {
  const data = db();
  const cat = id ? data.categories.find(x => x.id === id) : { id: null, name: { ar: '', en: '' }, image: '', branchIds: [], order: data.categories.length };
  const card = document.getElementById('catFormCard');
  card.classList.remove('hidden');
  card.innerHTML = `
    <h3>${id ? t('edit') : t('add')}</h3>
    <img src="${cat.image || PLACEHOLDER_IMG}" class="image-preview" id="catImgPreview">
    <div class="form-group"><label>${t('image')}</label><input type="file" id="catImgInput" accept="image/*"></div>
    <div class="form-row">
      <div class="form-group"><label>${t('name_ar')}</label><input type="text" id="catNameAr" value="${cat.name.ar || ''}"></div>
      <div class="form-group"><label>${t('name_en')}</label><input type="text" id="catNameEn" value="${cat.name.en || ''}"></div>
      <div class="form-group"><label>${t('sort_order')}</label><input type="number" step="1" id="catOrder" value="${cat.order || 0}"></div>
    </div>
    ${branchCheckboxesHtml('cat', cat.branchIds || [])}
    <div style="display:flex;gap:10px;">
      <button class="btn-primary" id="saveCatBtn" style="width:auto;padding:10px 24px;">${t('save')}</button>
      <button class="btn-sm" id="cancelCatBtn" style="background:var(--light-bg);">${t('cancel')}</button>
    </div>
  `;
  let newImage = cat.image;
  document.getElementById('catImgInput').addEventListener('change', async (e) => {
    if (e.target.files[0]) { newImage = await fileToDataURL(e.target.files[0]); document.getElementById('catImgPreview').src = newImage; }
  });
  document.getElementById('cancelCatBtn').addEventListener('click', () => card.classList.add('hidden'));
  document.getElementById('saveCatBtn').addEventListener('click', () => {
    const name = { ar: document.getElementById('catNameAr').value.trim(), en: document.getElementById('catNameEn').value.trim() };
    if (!name.ar && !name.en) { toast(t('required')); return; }
    const branchIds = readCheckedBranches('cat');
    const order = Number(document.getElementById('catOrder').value) || 0;
    if (id) { cat.name = name; cat.image = newImage; cat.branchIds = branchIds; cat.order = order; }
    else { data.categories.push({ id: uid('cat'), name, image: newImage, branchIds, order }); }
    persist();
    toast(t('saved_successfully'));
    card.classList.add('hidden');
    renderCategories();
  });
}

/* ===================== Products ===================== */
function renderProducts() {
  const data = db();
  const el = document.getElementById('sec-products');
  el.innerHTML = `
    <div class="admin-card">
      <div class="admin-topbar"><h3>${t('products')}</h3><button class="btn-add" id="addProdBtn">+ ${t('add')}</button></div>
      <div id="prodList"></div>
    </div>
    <div class="admin-card hidden" id="prodFormCard"></div>
  `;
  document.getElementById('addProdBtn').addEventListener('click', () => openProdForm(null));
  document.getElementById('prodList').innerHTML = sortByOrder(data.products).map(p => {
    const cat = data.categories.find(c => c.id === p.categoryId);
    const priceLabel = p.discountPercent > 0 ? `${fmtMoney(productBasePrice(p))} (${fmtMoney(rawBasePrice(p))})` : fmtMoney(rawBasePrice(p));
    return `
    <div class="admin-list-item">
      <img src="${p.image || PLACEHOLDER_IMG}">
      <div class="info"><strong>${tField(p.name)}</strong><div class="mini-note">${cat ? tField(cat.name) : ''} • ${priceLabel} • ${t('sort_order')}: ${p.order || 0}</div></div>
      <div class="actions">
        <button class="btn-sm btn-edit" data-edit="${p.id}">${t('edit')}</button>
        <button class="btn-sm btn-del" data-del="${p.id}">${t('delete')}</button>
      </div>
    </div>`;
  }).join('') || `<p class="mini-note">-</p>`;
  document.querySelectorAll('#prodList [data-edit]').forEach(b => b.addEventListener('click', () => openProdForm(b.dataset.edit)));
  document.querySelectorAll('#prodList [data-del]').forEach(b => b.addEventListener('click', () => {
    if (!confirm(t('confirm_delete'))) return;
    data.products = data.products.filter(x => x.id !== b.dataset.del);
    persist(); renderProducts();
  }));
}

function openProdForm(id) {
  const data = db();
  const product = id
    ? JSON.parse(JSON.stringify(data.products.find(x => x.id === id)))
    : { id: null, categoryId: data.categories[0] ? data.categories[0].id : '', image: '', price: 0, discountPercent: 0, branchIds: [], order: data.products.length, name: { ar: '', en: '' }, description: { ar: '', en: '' }, optionGroups: [] };
  const card = document.getElementById('prodFormCard');
  card.classList.remove('hidden');

  function optionTypeLabel(type) {
    return { single_price: t('type_single_price'), single_flat: t('type_single_flat'), multi_priced: t('type_multi_priced'), multi_flat: t('type_multi_flat') }[type];
  }

  function renderForm() {
    card.innerHTML = `
      <h3>${id ? t('edit') : t('add')}</h3>
      <img src="${product.image || PLACEHOLDER_IMG}" class="image-preview" id="prodImgPreview">
      <div class="form-group"><label>${t('image')}</label><input type="file" id="prodImgInput" accept="image/*"></div>
      <div class="form-row">
        <div class="form-group"><label>${t('name_ar')}</label><input type="text" id="prodNameAr" value="${product.name.ar || ''}"></div>
        <div class="form-group"><label>${t('name_en')}</label><input type="text" id="prodNameEn" value="${product.name.en || ''}"></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>${t('desc_ar')}</label><input type="text" id="prodDescAr" value="${product.description.ar || ''}"></div>
        <div class="form-group"><label>${t('desc_en')}</label><input type="text" id="prodDescEn" value="${product.description.en || ''}"></div>
      </div>
      <div class="form-row">
        <div class="form-group" id="priceFieldWrap">
          <label>${t('price')}</label>
          <input type="number" step="0.01" min="0" id="prodPrice" value="${product.price}">
          <p class="mini-note hidden" id="priceFromGroupNote"></p>
        </div>
        <div class="form-group"><label>${t('category')}</label>
          <select id="prodCategory">
            ${data.categories.map(c => `<option value="${c.id}" ${c.id === product.categoryId ? 'selected' : ''}>${tField(c.name)}</option>`).join('')}
          </select>
        </div>
        <div class="form-group"><label>${t('discount_percent')}</label><input type="number" step="1" min="0" max="100" id="prodDiscount" value="${product.discountPercent || 0}"></div>
        <div class="form-group"><label>${t('sort_order')}</label><input type="number" step="1" id="prodOrder" value="${product.order || 0}"></div>
      </div>
      ${branchCheckboxesHtml('prod', product.branchIds || [])}

      <h4>${t('option_groups')}</h4>
      <div id="optionGroupsWrap"></div>
      <button type="button" class="btn-sm btn-edit" id="addGroupBtn" style="margin-bottom:14px;">+ ${t('add_option_group')}</button>

      <div style="display:flex;gap:10px;">
        <button class="btn-primary" id="saveProdBtn" style="width:auto;padding:10px 24px;">${t('save')}</button>
        <button class="btn-sm" id="cancelProdBtn" style="background:var(--light-bg);">${t('cancel')}</button>
      </div>
    `;
    renderGroups();
    updatePriceFieldState();

    document.getElementById('prodImgInput').addEventListener('change', async (e) => {
      if (e.target.files[0]) { product.image = await fileToDataURL(e.target.files[0]); document.getElementById('prodImgPreview').src = product.image; }
    });
    document.getElementById('addGroupBtn').addEventListener('click', () => {
      product.optionGroups.push({ id: uid('grp'), type: 'single_price', name: { ar: '', en: '' }, options: [] });
      renderGroups();
    });
    document.getElementById('cancelProdBtn').addEventListener('click', () => card.classList.add('hidden'));
    document.getElementById('saveProdBtn').addEventListener('click', saveProduct);
  }

  function updatePriceFieldState() {
    const pg = pricingGroup(product);
    const priceInput = document.getElementById('prodPrice');
    const note = document.getElementById('priceFromGroupNote');
    if (pg) {
      priceInput.disabled = true;
      priceInput.value = pg.options[0].priceDelta || 0;
      note.textContent = t('price_from_group_note');
      note.classList.remove('hidden');
    } else {
      priceInput.disabled = false;
      note.classList.add('hidden');
    }
  }

  function renderGroups() {
    const wrap = document.getElementById('optionGroupsWrap');
    wrap.innerHTML = product.optionGroups.map((g, gi) => `
      <div class="option-group-card" data-gi="${gi}">
        <div class="form-row">
          <div class="form-group"><label>${t('name_ar')}</label><input type="text" class="grp-name-ar" value="${g.name.ar || ''}"></div>
          <div class="form-group"><label>${t('name_en')}</label><input type="text" class="grp-name-en" value="${g.name.en || ''}"></div>
        </div>
        <div class="form-group">
          <label>${t('group_type')}</label>
          <select class="grp-type">
            <option value="single_price" ${g.type === 'single_price' ? 'selected' : ''}>${t('type_single_price')}</option>
            <option value="single_flat" ${g.type === 'single_flat' ? 'selected' : ''}>${t('type_single_flat')}</option>
            <option value="multi_priced" ${g.type === 'multi_priced' ? 'selected' : ''}>${t('type_multi_priced')}</option>
            <option value="multi_flat" ${g.type === 'multi_flat' ? 'selected' : ''}>${t('type_multi_flat')}</option>
          </select>
        </div>
        <label class="mini-note">${t('options')}</label>
        <div class="opt-list">
          ${g.options.map((o, oi) => `
            <div class="option-line" data-oi="${oi}">
              <input type="text" class="opt-name-ar" placeholder="${t('name_ar')}" value="${o.name.ar || ''}">
              <input type="text" class="opt-name-en" placeholder="${t('name_en')}" value="${o.name.en || ''}">
              ${g.type === 'single_price' || g.type === 'multi_priced' ? `<input type="number" step="0.01" class="opt-delta" placeholder="${t('price_delta')}" value="${o.priceDelta}" style="max-width:90px;">` : ''}
              <button type="button" class="btn-sm btn-del opt-del">×</button>
            </div>
          `).join('')}
        </div>
        <button type="button" class="btn-sm btn-edit add-opt-btn">+ ${t('add_option')}</button>
        <button type="button" class="btn-sm btn-del del-grp-btn" style="float:inline-end;">${t('delete')} ${t('option_groups')}</button>
        <div style="clear:both;"></div>
      </div>
    `).join('');

    wrap.querySelectorAll('.option-group-card').forEach(gcard => {
      const gi = Number(gcard.dataset.gi);
      const g = product.optionGroups[gi];
      gcard.querySelector('.grp-name-ar').addEventListener('input', e => g.name.ar = e.target.value);
      gcard.querySelector('.grp-name-en').addEventListener('input', e => g.name.en = e.target.value);
      gcard.querySelector('.grp-type').addEventListener('change', e => { g.type = e.target.value; renderGroups(); });
      gcard.querySelector('.add-opt-btn').addEventListener('click', () => {
        g.options.push({ id: uid('opt'), name: { ar: '', en: '' }, priceDelta: 0 });
        renderGroups();
      });
      gcard.querySelector('.del-grp-btn').addEventListener('click', () => {
        product.optionGroups.splice(gi, 1);
        renderGroups();
      });
      gcard.querySelectorAll('.option-line').forEach(line => {
        const oi = Number(line.dataset.oi);
        const o = g.options[oi];
        line.querySelector('.opt-name-ar').addEventListener('input', e => o.name.ar = e.target.value);
        line.querySelector('.opt-name-en').addEventListener('input', e => o.name.en = e.target.value);
        const deltaInput = line.querySelector('.opt-delta');
        if (deltaInput) deltaInput.addEventListener('input', e => { o.priceDelta = Number(e.target.value) || 0; updatePriceFieldState(); });
        line.querySelector('.opt-del').addEventListener('click', () => { g.options.splice(oi, 1); renderGroups(); });
      });
    });
    updatePriceFieldState();
  }

  function saveProduct() {
    product.name = { ar: document.getElementById('prodNameAr').value.trim(), en: document.getElementById('prodNameEn').value.trim() };
    product.description = { ar: document.getElementById('prodDescAr').value.trim(), en: document.getElementById('prodDescEn').value.trim() };
    product.price = Number(document.getElementById('prodPrice').value) || 0;
    product.categoryId = document.getElementById('prodCategory').value;
    product.discountPercent = Math.min(100, Math.max(0, Number(document.getElementById('prodDiscount').value) || 0));
    product.branchIds = readCheckedBranches('prod');
    product.order = Number(document.getElementById('prodOrder').value) || 0;
    if (!product.name.ar && !product.name.en) { toast(t('required')); return; }
    if (id) {
      const idx = data.products.findIndex(x => x.id === id);
      data.products[idx] = product;
    } else {
      product.id = uid('prod');
      data.products.push(product);
    }
    persist();
    toast(t('saved_successfully'));
    card.classList.add('hidden');
    renderProducts();
  }

  renderForm();
}

/* ===================== Delivery Zones ===================== */
function renderDeliveryZones() {
  const data = db();
  const el = document.getElementById('sec-delivery');
  el.innerHTML = `
    <div class="admin-card">
      <div class="admin-topbar"><h3>${t('delivery_zones')}</h3><button class="btn-add" id="addZoneBtn">+ ${t('add')}</button></div>
      <p class="mini-note">${t('delivery_zones_info')}</p>
      <div id="zoneList"></div>
    </div>
    <div class="admin-card hidden" id="zoneFormCard"></div>
  `;
  document.getElementById('addZoneBtn').addEventListener('click', () => openZoneForm(null));

  document.getElementById('zoneList').innerHTML = data.settings.deliveryZones.map(z => `
    <div class="admin-list-item">
      <div class="info"><strong>${tField(z.name)}</strong><div class="mini-note">${fmtMoney(z.price)}</div></div>
      <div class="actions">
        <button class="btn-sm btn-edit" data-edit="${z.id}">${t('edit')}</button>
        <button class="btn-sm btn-del" data-del="${z.id}">${t('delete')}</button>
      </div>
    </div>
  `).join('') || `<p class="mini-note">-</p>`;

  document.querySelectorAll('#zoneList [data-edit]').forEach(b => b.addEventListener('click', () => openZoneForm(b.dataset.edit)));
  document.querySelectorAll('#zoneList [data-del]').forEach(b => b.addEventListener('click', () => {
    if (!confirm(t('confirm_delete'))) return;
    data.settings.deliveryZones = data.settings.deliveryZones.filter(x => x.id !== b.dataset.del);
    persist(); renderDeliveryZones();
  }));
}

function openZoneForm(id) {
  const data = db();
  const zone = id ? data.settings.deliveryZones.find(x => x.id === id) : { id: null, name: { ar: '', en: '' }, price: 0 };
  const card = document.getElementById('zoneFormCard');
  card.classList.remove('hidden');
  card.innerHTML = `
    <h3>${id ? t('edit') : t('add')}</h3>
    <div class="form-row">
      <div class="form-group"><label>${t('name_ar')}</label><input type="text" id="zoneNameAr" value="${zone.name.ar || ''}"></div>
      <div class="form-group"><label>${t('name_en')}</label><input type="text" id="zoneNameEn" value="${zone.name.en || ''}"></div>
    </div>
    <div class="form-group"><label>${t('zone_price')}</label><input type="number" step="0.01" min="0" id="zonePrice" value="${zone.price || 0}"></div>
    <div style="display:flex;gap:10px;">
      <button class="btn-primary" id="saveZoneBtn" style="width:auto;padding:10px 24px;">${t('save')}</button>
      <button class="btn-sm" id="cancelZoneBtn" style="background:var(--light-bg);">${t('cancel')}</button>
    </div>
  `;
  document.getElementById('cancelZoneBtn').addEventListener('click', () => card.classList.add('hidden'));
  document.getElementById('saveZoneBtn').addEventListener('click', () => {
    const name = { ar: document.getElementById('zoneNameAr').value.trim(), en: document.getElementById('zoneNameEn').value.trim() };
    const price = Number(document.getElementById('zonePrice').value) || 0;
    if (!name.ar && !name.en) { toast(t('required')); return; }
    if (id) {
      zone.name = name; zone.price = price;
    } else {
      data.settings.deliveryZones.push({ id: uid('zone'), name, price });
    }
    persist();
    toast(t('saved_successfully'));
    card.classList.add('hidden');
    renderDeliveryZones();
  });
}

/* ===================== Colors ===================== */
function renderColorBlock(pageKey, titleKey) {
  const c = db().settings.colors[pageKey];
  return `
    <div class="admin-card" data-page="${pageKey}">
      <h3>${t(titleKey)}</h3>
      <div class="form-group">
        <label>${t('color_type')}</label>
        <select class="color-type">
          <option value="solid" ${c.type === 'solid' ? 'selected' : ''}>${t('solid')}</option>
          <option value="gradient" ${c.type === 'gradient' ? 'selected' : ''}>${t('gradient')}</option>
        </select>
      </div>
      <div class="form-row">
        <div class="form-group"><label>${t('color1')}</label><input type="color" class="color1" value="${c.color1}"></div>
        <div class="form-group gradient-only ${c.type === 'gradient' ? '' : 'hidden'}"><label>${t('color2')}</label><input type="color" class="color2" value="${c.color2}"></div>
        <div class="form-group gradient-only ${c.type === 'gradient' ? '' : 'hidden'}"><label>${t('angle')}</label><input type="number" class="angle" value="${c.angle || 135}" style="max-width:100px;"></div>
      </div>
      <div class="color-preview" data-preview></div>
      <button class="btn-primary save-color-btn" style="width:auto;padding:10px 24px;">${t('save')}</button>
    </div>
  `;
}

function renderColors() {
  const el = document.getElementById('sec-colors');
  el.innerHTML =
    renderColorBlock('header', 'header_color') +
    renderColorBlock('branches', 'branches_page_colors') +
    renderColorBlock('menu', 'menu_page_colors') +
    renderColorBlock('checkout', 'checkout_page_colors') +
    renderColorBlock('secondary', 'secondary_color');

  el.querySelectorAll('[data-page]').forEach(card => {
    const pageKey = card.dataset.page;
    const typeSel = card.querySelector('.color-type');
    const color1Input = card.querySelector('.color1');
    const color2Input = card.querySelector('.color2');
    const angleInput = card.querySelector('.angle');
    const preview = card.querySelector('[data-preview]');

    function updatePreview() {
      preview.style.background = typeSel.value === 'gradient'
        ? `linear-gradient(${Number(angleInput.value) || 135}deg, ${color1Input.value}, ${color2Input.value})`
        : color1Input.value;
    }
    [typeSel, color1Input, color2Input, angleInput].forEach(input => {
      input.addEventListener('input', updatePreview);
      input.addEventListener('change', updatePreview);
    });
    typeSel.addEventListener('change', () => {
      card.querySelectorAll('.gradient-only').forEach(g => g.classList.toggle('hidden', typeSel.value !== 'gradient'));
    });
    updatePreview();

    card.querySelector('.save-color-btn').addEventListener('click', () => {
      const data = db();
      data.settings.colors[pageKey] = {
        type: typeSel.value,
        color1: color1Input.value,
        color2: color2Input.value,
        angle: Number(angleInput.value) || 135
      };
      persist();
      toast(t('saved_successfully'));
      if (pageKey === 'secondary') applySecondaryColor();
    });
  });
}

/* ===================== General Settings ===================== */
function renderGeneral() {
  const data = db();
  const el = document.getElementById('sec-general');
  el.innerHTML = `
    <div class="admin-card">
      <h3>${t('general_settings')}</h3>
      <img src="${data.settings.logo || PLACEHOLDER_IMG}" class="image-preview" id="logoPreview">
      <div class="form-group"><label>${t('logo')}</label><input type="file" id="logoInput" accept="image/*"></div>
      <div class="form-row">
        <div class="form-group"><label>${t('restaurant_name')} (${t('ar_label')})</label><input type="text" id="restNameAr" value="${data.settings.restaurantName.ar || ''}"></div>
        <div class="form-group"><label>${t('restaurant_name')} (${t('en_label')})</label><input type="text" id="restNameEn" value="${data.settings.restaurantName.en || ''}"></div>
      </div>
      <div class="form-group"><label>${t('whatsapp_number')}</label><input type="text" id="waNumber" value="${data.settings.whatsappNumber || ''}" placeholder="9705xxxxxxxx"></div>
      <div class="form-group"><label>${t('currency')}</label>
        <select id="currencySelect">
          ${CURRENCIES.map(c => `<option value="${c.code}" ${c.code === (data.settings.currency || 'ILS') ? 'selected' : ''}>${tField(c.name)} (${c.symbol})</option>`).join('')}
        </select>
      </div>
      <button class="btn-primary" id="saveGeneralBtn" style="width:auto;padding:10px 24px;">${t('save')}</button>
    </div>
  `;
  let newLogo = data.settings.logo;
  document.getElementById('logoInput').addEventListener('change', async (e) => {
    if (e.target.files[0]) { newLogo = await fileToDataURL(e.target.files[0]); document.getElementById('logoPreview').src = newLogo; }
  });
  document.getElementById('saveGeneralBtn').addEventListener('click', () => {
    data.settings.logo = newLogo;
    data.settings.restaurantName = { ar: document.getElementById('restNameAr').value.trim(), en: document.getElementById('restNameEn').value.trim() };
    data.settings.whatsappNumber = document.getElementById('waNumber').value.trim();
    data.settings.currency = document.getElementById('currencySelect').value;
    persist();
    toast(t('saved_successfully'));
    renderNav();
  });
}

/* ===================== Login Settings ===================== */
/* The admin password used to live inside the shared data file, but that file
   is now public (served as data.json), so keeping a password there would
   leak it to anyone. The password is now a single secret set outside the
   app, as the ADMIN_SECRET environment variable on the hosting project. */
function renderLogin() {
  const el = document.getElementById('sec-login');
  el.innerHTML = `
    <div class="admin-card">
      <h3>${t('login_settings')}</h3>
      <p class="mini-note">${t('login_settings_info')}</p>
    </div>
  `;
}

(async function initAdmin() {
  await Store.ready;
  renderAll();
})();
