/* ===================== Checkout Page Logic ===================== */

(async function () {
  await Store.ready;

const splashLogo = Store.get().settings.logo;
if (splashLogo) {
  const splashImg = document.getElementById('splashLogo');
  if (splashImg) { splashImg.src = splashLogo; splashImg.style.display = 'block'; }
}

applyDocDir();
applyPageColors('checkout');

const dataCo = Store.get();
document.title = t('checkout');
renderHeader({ showBack: true, backHref: 'cart.html' });
renderFooter();

document.getElementById('pageTitle').textContent = t('checkout');
document.getElementById('pickupLabel').textContent = t('pickup');
document.getElementById('deliveryLabel').textContent = t('delivery');
document.getElementById('infoTitle').textContent = t('order_pickup_info');
document.getElementById('nameLabel').innerHTML = `<i data-lucide="user"></i> ${t('name')} <span class="req">*</span>`;
document.getElementById('locationLabel').innerHTML = `<i data-lucide="map-pin"></i> ${t('location')} <span class="req">*</span>`;
document.getElementById('phoneLabel').innerHTML = `<i data-lucide="phone"></i> ${t('phone')} <span class="req">*</span>`;
document.getElementById('zoneLabel').innerHTML = `<i data-lucide="truck"></i> ${t('delivery_zone')} <span class="req">*</span>`;
document.getElementById('notesLabel').innerHTML = `<i data-lucide="message-square"></i> ${t('notes')} (${t('optional')})`;
document.getElementById('summaryTitle').textContent = t('order_summary');
document.getElementById('totalLabel').textContent = t('total');
document.querySelector('#sendBtn span').textContent = t('send_order');

let orderType = 'pickup';
const pickupTab = document.getElementById('pickupTab');
const deliveryTab = document.getElementById('deliveryTab');
const locationGroup = document.getElementById('locationGroup');
const zoneGroup = document.getElementById('zoneGroup');
const zoneSelect = document.getElementById('custZone');
const deliveryZones = dataCo.settings.deliveryZones || [];

zoneSelect.innerHTML = `<option value="">${t('select_zone')}</option>` +
  deliveryZones.map(z => `<option value="${z.id}">${tField(z.name)} (+${fmtMoney(z.price)})</option>`).join('');

pickupTab.addEventListener('click', () => setOrderType('pickup'));
deliveryTab.addEventListener('click', () => setOrderType('delivery'));
zoneSelect.addEventListener('change', () => { currentTotal = renderSummary(); });

function setOrderType(type) {
  orderType = type;
  pickupTab.classList.toggle('active', type === 'pickup');
  deliveryTab.classList.toggle('active', type === 'delivery');
  locationGroup.style.display = type === 'delivery' ? 'block' : 'none';
  zoneGroup.style.display = type === 'delivery' ? 'block' : 'none';
  document.getElementById('custLocation').required = type === 'delivery';
  zoneSelect.required = type === 'delivery';
  document.getElementById('infoTitle').textContent = type === 'pickup' ? t('order_pickup_info') : t('order_delivery_info');
  currentTotal = renderSummary();
}

function getSelectedZone() {
  const id = zoneSelect.value;
  return deliveryZones.find(z => z.id === id) || null;
}

function summarizeItem(item) {
  const parts = [];
  (item.optionGroupsSnapshot || []).forEach(g => {
    const sel = item.selections[g.id];
    if (!sel) return;
    if (Array.isArray(sel)) {
      if (!sel.length) return;
      const names = sel.map(optId => {
        const o = g.options.find(x => x.id === optId);
        return o ? tField(o.name) : '';
      }).filter(Boolean);
      if (names.length) parts.push(`${tField(g.name)}: ${names.join(', ')}`);
    } else {
      const o = g.options.find(x => x.id === sel);
      if (o) parts.push(`${tField(g.name)}: ${tField(o.name)}`);
    }
  });
  if (item.notes) parts.push(`${t('notes')}: ${item.notes}`);
  return parts.join(' • ');
}

const cart = Store.getCart();
if (!cart.length) {
  location.replace('cart.html');
}

function renderSummary() {
  const box = document.getElementById('orderSummary');
  box.innerHTML = cart.map(item => `
    <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border);font-size:0.85rem;">
      <div>
        <strong>${item.qty}x ${tField(item.productName)}</strong>
        <div class="mini-note">${summarizeItem(item)}</div>
      </div>
      <span class="summary-line-price">${fmtMoney(item.unitPrice * item.qty)}</span>
    </div>
  `).join('');
  let total = cart.reduce((s, i) => s + i.unitPrice * i.qty, 0);
  const zone = orderType === 'delivery' ? getSelectedZone() : null;
  if (zone) total += Number(zone.price) || 0;
  document.getElementById('totalValue').textContent = fmtMoney(total);
  return total;
}
let currentTotal = renderSummary();

document.getElementById('checkoutForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const name = document.getElementById('custName').value.trim();
  const phone = document.getElementById('custPhone').value.trim();
  const loc = document.getElementById('custLocation').value.trim();
  const notes = document.getElementById('custNotes').value.trim();
  const zone = orderType === 'delivery' ? getSelectedZone() : null;

  if (!name || !phone || (orderType === 'delivery' && (!zone || !loc))) {
    toast(t('required'));
    return;
  }

  const branchId = Store.getSelectedBranch();
  const branch = dataCo.branches.find(b => b.id === branchId);

  let msg = `*${tField(dataCo.settings.restaurantName)}*\n`;
  msg += `${orderType === 'pickup' ? '📦 ' + t('pickup') : '🛵 ' + t('delivery')}\n`;
  if (branch) msg += `${t('branch_label')}: ${tField(branch.name)}\n`;
  msg += `\n${t('name')}: ${name}\n${t('phone')}: ${phone}\n`;
  if (orderType === 'delivery') {
    msg += `${t('delivery_zone')}: ${tField(zone.name)} (+${fmtMoney(zone.price)})\n`;
    msg += `${t('location')}: ${loc}\n`;
  }
  if (notes) msg += `${t('notes')}: ${notes}\n`;
  msg += `\n*${t('order_summary')}:*\n`;
  cart.forEach(item => {
    msg += `- ${item.qty}x ${tField(item.productName)} (${fmtMoney(item.unitPrice * item.qty)})\n`;
    const s = summarizeItem(item);
    if (s) msg += `   ${s}\n`;
  });
  msg += `\n*${t('total')}: ${fmtMoney(currentTotal)}*`;

  const phoneNumber = (dataCo.settings.whatsappNumber || '').replace(/[^0-9]/g, '');
  const url = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(msg)}`;

  Store.saveCart([]);
  updateCartCount();
  window.open(url, '_blank');
});

renderIcons();
hideSplash();
})();
