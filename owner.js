/* SkyWorld — Stall Owner Portal (prototype) */
const $ = s => document.querySelector(s);
const esc = SW.esc, peso = SW.peso;
let me = null;                       // logged-in stall number
let view = 'dashboard', tab = 'about', rep = 'week';
let inv = { q: '', st: 'all' };
let aud = { cat: 'all', q: '', dir: 'asc' };
let pendingImg = null;
let pendingPic;                     // profile picture being edited (undefined = unchanged)
let pendingAv;

/* ---------- helpers ---------- */
function toast(m, t = '') { const e = document.createElement('div'); e.className = 'toast ' + t; e.textContent = m; $('#toasts').append(e); setTimeout(() => e.remove(), 4500); }
function closeModals() { document.querySelectorAll('.overlay').forEach(e => e.remove()); }
function modal(html) { const o = document.createElement('div'); o.className = 'overlay'; o.innerHTML = `<div class="modal">${html}</div>`; o.addEventListener('mousedown', e => { if (e.target === o) o.remove(); }); document.body.append(o); return o; }
const stallOf = d => d.stalls[me - 1];
const myProducts = (d, arch = false) => d.products.filter(p => p.stall === me && !!p.archived === arch);
const myOrders = d => d.orders.filter(o => o.stall === me);
const sold = o => o.status !== 'Cancelled';
const bClass = s => s === 'To Ship' ? 'b-To' : 'b-' + s;
const startDay = ts => { const x = new Date(ts); x.setHours(0, 0, 0, 0); return x.getTime(); };

/* ---------- auth ---------- */
const LOGO = 'pic.png';   // <- replace shared/logo.png with your own logo (or change this path)
function authShell(inner) {
  $('#app').innerHTML = `<div class="auth"><div class="auth-l"><img class="logo" src="${LOGO}" alt="SkyWorld logo" onerror="this.onerror=null;this.src='../shared/logo.svg'"><h1>SkyWorld</h1><h2>Stall Owner Portal</h2><p>Manage your stall's inventory, online store, sales and reports in one place.</p></div><div class="auth-r"><div class="auth-box">${inner}</div></div></div>`;
}
function renderLogin() {
  const saved = localStorage.getItem('sw_owner_saved') || '';
  authShell(`<h2>Login</h2><p class="sub">Log in to your stall owner account.</p>
  <label>Email</label><input id="em" type="email" value="${esc(saved)}" placeholder="Email address" autocomplete="username">
  <label>Password</label><input id="pw" type="password" placeholder="Password" autocomplete="current-password">
  <div style="text-align:right;margin-top:6px"><a onclick="forgot()">Forgot password?</a></div>
  <label>Verify you're human</label><div class="captcha" id="cap"></div>
  <div class="err" id="err"></div>
  <button style="width:100%;margin-top:6px" onclick="doLogin()">Login</button>
  <div class="switch">Don't have an account yet? <a onclick="renderRegister()">Register</a></div>`);
  SW.captcha.render($('#cap'));
  $('#pw').addEventListener('keydown', e => e.key === 'Enter' && doLogin());
}
function doLogin() {
  const email = $('#em').value.trim().toLowerCase(), pw = $('#pw').value, err = $('#err');
  if (!email || !pw) return err.textContent = 'Enter your email and password.';
  const lock = SW.guard.locked('own_' + email);
  if (lock) return err.textContent = `Too many failed attempts. Try again in ${lock}s.`;
  if (!SW.captcha.ok($('#cap'))) { SW.captcha.render($('#cap')); return err.textContent = 'Incorrect code. Please try again.'; }
  const d = SW.load(); const s = d.stalls.find(x => x.owner && x.owner.email.toLowerCase() === email);
  if (!s || s.owner.pass !== SW.hash(pw)) {
    const left = SW.guard.fail('own_' + email); SW.captcha.render($('#cap'));
    return err.textContent = left > 0 ? `Incorrect email or password. ${left} attempt(s) left.` : 'Login locked for 30 seconds after too many failed attempts.';
  }
  SW.guard.clear('own_' + email); me = s.n; sessionStorage.setItem('sw_owner', me);
  SW.audit(d, me, s.owner.name, 'Login', 'Owner logged in'); SW.save(d); renderApp();
}
function renderRegister() {
  const d = SW.load();
  authShell(`<h2>Create account</h2><p class="sub">Register your stall owner account.</p>
  <label>Stall number</label><select id="rs" onchange="regInfo()"><option value="">Select stall number (1–105)</option>${d.stalls.map(s => `<option value="${s.n}">Stall ${s.n}</option>`).join('')}</select>
  <label>Full name</label><input id="rn" autocomplete="name">
  <label>Email</label><input id="re" type="email" autocomplete="email">
  <label>Contact number</label><input id="rp" placeholder="09xxxxxxxxx" inputmode="numeric" maxlength="11">
  <label>Store name</label><input id="rst">
  <label>Password</label><input id="r1" type="password" autocomplete="new-password">
  <label>Confirm password</label><input id="r2" type="password" autocomplete="new-password">
  <div class="hint">At least 8 characters, with letters and numbers.</div>
  <label>Verify you're human</label><div class="captcha" id="cap"></div>
  <label style="font-weight:400;display:flex;gap:8px;align-items:center"><input type="checkbox" id="rt" style="width:auto"> I agree to the Terms & Conditions</label>
  <div class="err" id="err"></div><button style="width:100%" onclick="doRegister()">Create account</button>
  <div class="switch">Already have an account? <a onclick="renderLogin()">Login</a></div>`);
  SW.captcha.render($('#cap'));
}
function regInfo() { /* nothing extra is shown under the stall number */ }
function doRegister() {
  const g = id => $('#' + id).value.trim(), err = $('#err'), d = SW.load();
  const n = +g('rs'), name = g('rn'), email = g('re').toLowerCase(), phone = g('rp'), p1 = $('#r1').value, p2 = $('#r2').value;
  if (!n) return err.textContent = 'Please select a stall number.';
  if (!name || !email || !phone || !g('rst')) return err.textContent = 'Please fill in all fields.';
  if (!/^\S+@\S+\.\S+$/.test(email)) return err.textContent = 'Invalid email address.';
  if (!/^09\d{9}$/.test(phone)) return err.textContent = 'Phone: 11 digits, starting with 09.';
  if (d.stalls.some(s => s.n !== n && s.owner && s.owner.email.toLowerCase() === email)) return err.textContent = 'This email is already in use.';
  if (p1.length < 8 || !/[A-Za-z]/.test(p1) || !/\d/.test(p1)) return err.textContent = 'Weak password (8+ characters, letters and numbers).';
  if (p1 !== p2) return err.textContent = 'Passwords do not match.';
  if (!$('#rt').checked) return err.textContent = 'You must agree to the Terms & Conditions.';
  if (!SW.captcha.ok($('#cap'))) { SW.captcha.render($('#cap')); return err.textContent = 'Incorrect code. Please try again.'; }
  const s = d.stalls[n - 1]; if (s.owner && !/^stall\d+@skyworld\.ph$/.test(s.owner.email)) return err.textContent = 'This stall number is already registered. Please choose another stall.';   // pre-loaded demo accounts can be replaced by a real registration
  s.owner = { name, email, phone, pass: SW.hash(p1), created: Date.now() }; s.name = g('rst');
  SW.audit(d, n, name, 'Register', 'Owner account created'); SW.save(d);
  me = n; sessionStorage.setItem('sw_owner', n); renderApp();
  const b = document.createElement('div'); b.className = 'savebar';
  b.innerHTML = `<span>💾 Save your account so logging in is easier next time?</span><button class="sm" onclick="localStorage.setItem('sw_owner_saved','${esc(email)}');this.parentNode.remove();toast('Account saved','ok')">Save account</button><button class="sm sec" onclick="this.parentNode.remove()">Not now</button>`;
  document.body.append(b);
}
function forgot() {
  modal(`<h2>Forgot password</h2><p class="hint">We'll send a verification code to your email.</p>
  <div id="fs1"><label>Email</label><input id="fe" type="email"><div class="mf"><button class="sec" onclick="closeModals()">Cancel</button><button onclick="forgotSend()">Send code</button></div></div>
  <div id="fs2" style="display:none"><label>Verification code</label><input id="fc" maxlength="6"><label>New password</label><input id="fp" type="password"><div class="err" id="ferr"></div><div class="mf"><button onclick="forgotReset()">Reset password</button></div></div>`);
}
let fCode = '', fEmail = '';
function forgotSend() {
  const e = $('#fe').value.trim().toLowerCase(), d = SW.load();
  if (!d.stalls.some(s => s.owner && s.owner.email.toLowerCase() === e)) return toast('No account found for that email.', 'er');
  fCode = String(Math.floor(100000 + Math.random() * 900000)); fEmail = e;
  $('#fs1').style.display = 'none'; $('#fs2').style.display = 'block';
  toast(`📧 (Demo email) Your verification code: ${fCode}`, 'ok');
}
function forgotReset() {
  const err = $('#ferr'), p = $('#fp').value;
  if ($('#fc').value.trim() !== fCode) return err.textContent = 'Incorrect code.';
  if (p.length < 8 || !/[A-Za-z]/.test(p) || !/\d/.test(p)) return err.textContent = 'Password: 8+ characters with letters and numbers.';
  const d = SW.load(), s = d.stalls.find(x => x.owner && x.owner.email.toLowerCase() === fEmail);
  s.owner.pass = SW.hash(p); SW.audit(d, s.n, s.owner.name, 'Password reset', 'Via email verification'); SW.save(d); SW.guard.clear('own_' + fEmail);
  closeModals(); toast('Password changed. You can log in now.', 'ok');
}
function logout() { const d = SW.load(); SW.audit(d, me, stallOf(d).owner.name, 'Logout', 'Owner logged out'); SW.save(d); sessionStorage.removeItem('sw_owner'); me = null; renderLogin(); }

/* ---------- shell ---------- */
const NAV = [['dashboard', '📊', 'Dashboard'], ['inventory', '📦', 'Inventory'], ['store', '🛒', 'Online Store'], ['reports', '📈', 'Reports'], ['settings', '⚙️', 'Settings'], ['profile', '👤', 'Profile']];
function renderApp() {
  const d = SW.load(), s = stallOf(d);
  $('#app').innerHTML = `<div class="shell"><aside><div class="brand"><img class="blogo" src="${LOGO}" alt="" onerror="this.onerror=null;this.src='../shared/logo.svg'"> SkyWorld<small>Stall Owner Portal</small></div><nav>${NAV.map(n => `<button data-v="${n[0]}" onclick="go('${n[0]}')">${n[1]} ${n[2]}</button>`).join('')}</nav>
  <div class="me"><div class="who">${SW.avatar(s.owner, 42)}<div><b>${esc(s.name)}</b>Stall #${s.n} • ${SW.CATS[s.cat]} ${s.cat}<br>${esc(s.owner.name)}</div></div><button class="sm sec" style="margin-top:8px;width:100%" onclick="logout()">Logout</button></div></aside><main id="main"></main></div>`;
  go(view);
}
function go(v) {
  view = v; document.querySelectorAll('aside nav button').forEach(b => b.classList.toggle('on', b.dataset.v === v));
  seedNotifs();
  const d = SW.load(), s = stallOf(d), unread = d.notifs.filter(n => n.stall === me && !n.read).length;
  const titles = Object.fromEntries(NAV.map(n => [n[0], n[2]]));
  $('#main').innerHTML = `<div class="top"><h1>${titles[v]}</h1><div><span class="chip">Stall #${s.n} • ${SW.CATS[s.cat]} ${s.cat}</span> <button class="sec sm" onclick="tab='notifications';go('settings')">🔔 ${unread}</button></div></div><div id="content"></div>`;
  $('#content').className = v === 'settings' ? 'nofx' : '';
  ({ dashboard: vDash, inventory: vInv, store: vStore, reports: vReports, settings: vSettings, profile: vProfile })[v](d, s);
}

/* ---------- dashboard ---------- */
function vDash(d, s) {
  const prods = myProducts(d), ords = myOrders(d), today = startDay(Date.now()), mo = new Date(); mo.setDate(1); mo.setHours(0, 0, 0, 0);
  const sum = f => ords.filter(o => sold(o) && f(o)).reduce((a, o) => a + o.total, 0);
  const cnt = k => prods.filter(p => SW.stockStatus(p) === k).length;
  const attention = prods.filter(p => SW.stockStatus(p) !== 'in').sort((a, b) => a.qty - b.qty);
  $('#content').innerHTML = `<div class="grid4"><div class="stat"><div class="l">Sales today</div><div class="v">${peso(sum(o => o.createdAt >= today))}</div></div>
  <div class="stat"><div class="l">Sales this month</div><div class="v">${peso(sum(o => o.createdAt >= mo.getTime()))}</div></div>
  <div class="stat"><div class="l">Total orders</div><div class="v">${ords.filter(sold).length}</div></div>
  <div class="stat"><div class="l">Pending (To Ship)</div><div class="v">${ords.filter(o => o.status === 'To Ship').length}</div></div></div>
  <div class="grid4"><div class="stat"><div class="l">Products</div><div class="v">${prods.length}</div></div><div class="stat"><div class="l">In stock</div><div class="v" style="color:var(--ok)">${cnt('in')}</div></div><div class="stat"><div class="l">Low stock</div><div class="v" style="color:var(--wa)">${cnt('low')}</div></div><div class="stat"><div class="l">Out of stock</div><div class="v" style="color:var(--er)">${cnt('out')}</div></div></div>
  <div class="two"><div class="card"><h3>Recent orders</h3><div class="tw"><table><tr><th>Order</th><th>Customer</th><th>Total</th><th>Status</th></tr>${ords.slice(0, 6).map(o => `<tr><td>${o.id}</td><td>${esc(o.custName)}</td><td>${peso(o.total)}</td><td><span class="badge ${bClass(o.status)}">${o.status}</span></td></tr>`).join('') || '<tr><td colspan=4>No orders yet</td></tr>'}</table></div></div>
  <div class="card"><h3>Needs restocking</h3><div class="tw"><table><tr><th>Product</th><th>Qty</th><th>Status</th></tr>${attention.map(p => `<tr><td>${esc(p.name)}</td><td>${p.qty}</td><td><span class="badge b-${SW.stockStatus(p)}">${SW.STATUS_LABEL[SW.stockStatus(p)]}</span></td></tr>`).join('') || '<tr><td colspan=3>All stock looks good 👍</td></tr>'}</table></div></div></div>`;
}

/* ---------- inventory ---------- */
function vInv(d, s) {
  const all = myProducts(d), q = inv.q.toLowerCase();
  const list = all.filter(p => (inv.st === 'all' || SW.stockStatus(p) === inv.st) && p.name.toLowerCase().includes(q));
  const c = k => all.filter(p => SW.stockStatus(p) === k).length;
  $('#content').innerHTML = `<div class="grid4"><div class="stat"><div class="l">Total products</div><div class="v">${all.length}</div></div><div class="stat"><div class="l">In stock</div><div class="v" style="color:var(--ok)">${c('in')}</div></div><div class="stat"><div class="l">Low stock</div><div class="v" style="color:var(--wa)">${c('low')}</div></div><div class="stat"><div class="l">Out of stock</div><div class="v" style="color:var(--er)">${c('out')}</div></div></div>
  <div class="card"><div class="bar"><input id="iq" placeholder="Search product..." value="${esc(inv.q)}" oninput="inv.q=this.value;invList()"><select onchange="inv.st=this.value;invList()">${[['all', 'All status'], ['in', 'In Stock'], ['low', 'Low Stock'], ['out', 'Out of Stock']].map(o => `<option value="${o[0]}" ${inv.st === o[0] ? 'selected' : ''}>${o[1]}</option>`).join('')}</select><button style="margin-left:auto" onclick="prodForm()">+ Add product</button></div>
  <p class="hint" style="margin-bottom:10px">Status is automatic: <b>Out of Stock</b> = 0, <b>Low Stock</b> = 1–10, <b>In Stock</b> = 11 or more.</p><div class="tw" id="invt"></div></div>`;
  invList();
}
function invList() {
  const d = SW.load(), q = inv.q.toLowerCase();
  const list = myProducts(d).filter(p => (inv.st === 'all' || SW.stockStatus(p) === inv.st) && p.name.toLowerCase().includes(q));
  $('#invt').innerHTML = `<table><tr><th>Picture</th><th>Product</th><th>Category</th><th>Price</th><th>Quantity</th><th>Status</th><th>Actions</th></tr>${list.map(p => {
    const st = SW.stockStatus(p);
    return `<tr><td><img src="${SW.img(p)}"></td><td><b>${esc(p.name)}</b><div class="hint">${p.discount ? p.discount + '% off • ' : ''}${[...p.colors, ...p.sizes].slice(0, 6).join(', ')}</div></td><td>${p.cat}</td><td>${peso(SW.finalPrice(p))}${p.discount ? `<div class="hint"><s>${peso(p.price)}</s></div>` : ''}</td>
    <td><div class="qtybox"><button class="sm sec" onclick="adj('${p.id}',-1)">−</button><b>${p.qty}</b><button class="sm sec" onclick="adj('${p.id}',1)">+</button></div></td><td><span class="badge b-${st}">${SW.STATUS_LABEL[st]}</span></td>
    <td><button class="sm sec" onclick="prodForm('${p.id}')">Edit</button> <button class="sm dng" onclick="archiveProd('${p.id}')">Archive</button></td></tr>`;
  }).join('') || '<tr><td colspan=7>No products found.</td></tr>'}</table>`;
}
function adj(id, n) { const d = SW.load(), p = d.products.find(x => x.id === id); p.qty = Math.max(0, p.qty + n); SW.audit(d, me, stallOf(d).owner.name, 'Stock adjust', `${p.name}: ${n > 0 ? '+' : ''}${n} (now ${p.qty})`); SW.save(d); invList(); }
function archiveProd(id) {
  if (!confirm('Archive this product? It will be removed from the online store, but you can restore it in Settings → Archives.')) return;
  const d = SW.load(), p = d.products.find(x => x.id === id); p.archived = true; p.archivedAt = Date.now();
  SW.audit(d, me, stallOf(d).owner.name, 'Archive product', p.name); SW.save(d); toast('Product archived'); go('inventory');
}
function prodForm(id) {
  const d = SW.load(), s = stallOf(d), p = id ? d.products.find(x => x.id === id) : null; pendingImg = p ? p.img : null;
  const o = modal(`<h2>${p ? 'Edit' : 'Add'} product</h2><p class="hint">It will only appear in the online store of Stall #${s.n}.</p>
  <label>Product name *</label><input id="pn" value="${esc(p?.name)}">
  <div class="two" style="gap:10px"><div><label>Category</label><input value="${s.cat}" disabled></div><div><label>Price (₱) *</label><input id="pp" type="number" min="1" value="${p?.price ?? ''}"></div></div>
  <div class="two" style="gap:10px"><div><label>Quantity *</label><input id="pq" type="number" min="0" value="${p?.qty ?? ''}"><div class="hint">0 = Out of Stock • 1–10 = Low Stock • 11+ = In Stock</div></div><div><label>Discount %</label><input id="pd" type="number" min="0" max="90" value="${p?.discount ?? 0}"></div></div>
  <div class="two" style="gap:10px"><div><label>Colors (comma)</label><input id="pc" value="${esc((p?.colors || []).join(', '))}" placeholder="Black, White"></div><div><label>Sizes (comma)</label><input id="ps" value="${esc((p?.sizes || []).join(', '))}" placeholder="S, M, L, XL"></div></div>
  <label>Description</label><textarea id="pds" rows="3">${esc(p?.desc)}</textarea>
  <label>Product picture</label><input type="file" id="pf" accept="image/*" onchange="pickImg(this)"><img id="pv" class="preview" src="${p ? SW.img(p) : ''}" style="${p ? '' : 'display:none'}">
  <div class="err" id="perr"></div><div class="mf"><button class="sec" onclick="closeModals()">Cancel</button><button onclick="saveProd('${id || ''}')">Save product</button></div>`);
}
function pickImg(inp) {
  const f = inp.files[0]; if (!f) return; const r = new FileReader();
  r.onload = () => { const im = new Image(); im.onload = () => { const m = 480, k = Math.min(1, m / Math.max(im.width, im.height)), c = document.createElement('canvas'); c.width = im.width * k; c.height = im.height * k; c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); pendingImg = c.toDataURL('image/jpeg', .72); const pv = $('#pv'); pv.src = pendingImg; pv.style.display = 'block'; }; im.src = r.result; };
  r.readAsDataURL(f);
}
function saveProd(id) {
  const d = SW.load(), s = stallOf(d), err = $('#perr'), list = t => $(t).value.split(',').map(x => x.trim()).filter(Boolean);
  const name = $('#pn').value.trim(), price = +$('#pp').value, qty = $('#pq').value === '' ? NaN : +$('#pq').value, disc = +$('#pd').value || 0;
  if (!name) return err.textContent = 'Enter the product name.';
  if (!(price > 0)) return err.textContent = 'Price must be greater than 0.';
  if (!(qty >= 0)) return err.textContent = 'Enter the quantity (0 or more).';
  if (disc < 0 || disc > 90) return err.textContent = 'Discount must be between 0% and 90%.';
  const data = { name, price, qty: Math.floor(qty), discount: disc, colors: list('#pc'), sizes: list('#ps'), desc: $('#pds').value.trim() || name, img: pendingImg };
  if (id) {
    const pr = d.products.find(x => x.id === id), ch = [];
    if (pr.name !== data.name) ch.push(`name: ${pr.name} → ${data.name}`); if (pr.price !== data.price) ch.push(`price: ${peso(pr.price)} → ${peso(data.price)}`);
    if (pr.qty !== data.qty) ch.push(`qty: ${pr.qty} → ${data.qty}`); if (pr.discount !== data.discount) ch.push(`discount: ${pr.discount}% → ${data.discount}%`);
    Object.assign(pr, data); SW.audit(d, me, s.owner.name, 'Edit product', `${name}${ch.length ? ' — ' + ch.join(', ') : ' (no field changes)'}`);
  }
  else { d.products.unshift({ id: `P${me}-${SW.uid()}`, stall: me, cat: s.cat, emoji: SW.CATS[s.cat], archived: false, created: Date.now(), ...data }); SW.audit(d, me, s.owner.name, 'Add product', `${name} (qty ${data.qty})`); }
  SW.save(d); closeModals(); toast(id ? 'Product updated' : 'Product added to your store!', 'ok'); go('inventory');
}

/* ---------- online store ---------- */
function vStore(d, s) {
  const ords = myOrders(d), todayO = ords.filter(o => sold(o) && o.createdAt >= startDay(Date.now())), live = ords.filter(o => o.custEmail).slice(0, 8), url = `../store/index.html#/s/${s.n}`;
  $('#content').innerHTML = `<div class="card"><h3>Online store of Stall #${s.n} — ${esc(s.name)}</h3><p style="margin-bottom:12px">This is the website your customers see. Products in your Inventory (not archived) appear here automatically, and their quantity goes down whenever someone buys.</p>
  <div class="bar"><a href="${url}" target="_blank"><button>🔗 Open my store</button></a><button class="${s.open ? 'dng' : 'sec'}" onclick="toggleStore()">${s.open ? 'Close store temporarily' : 'Re-open store'}</button><span class="badge ${s.open ? 'b-in' : 'b-out'}">${s.open ? 'Store is OPEN' : 'Store is CLOSED'}</span></div><div class="hint">Link: ${url}</div></div>
  <div class="card"><h3>Sales from your online store</h3><div class="grid4" style="margin-bottom:0">${[['Orders today', todayO.length], ['Sales today', peso(todayO.reduce((a, o) => a + o.total, 0))], ['Awaiting shipment', ords.filter(o => o.status === 'To Ship').length], ['Total online sales', peso(ords.filter(sold).reduce((a, o) => a + o.total, 0))]].map(x => `<div class="stat"><div class="l">${x[0]}</div><div class="v">${x[1]}</div></div>`).join('')}</div></div>
  <div class="card"><h3>Latest purchases <span class="hint">(updates automatically when a customer buys)</span></h3>${live.map(o => `<div class="list-i ${o.status === 'To Ship' ? 'unread' : ''}"><span>🛒 <b>${esc(o.custName)}</b> bought ${o.items.map(i => `${esc(i.name)} ×${i.qty}`).join(', ')} — <b>${peso(o.total)}</b> <span class="hint">• ${o.pay}${o.payRef ? ' ' + esc(o.payRef) : ''} • ${o.id}</span></span><span class="hint" style="margin:0">${SW.fmt(o.createdAt)} ${o.status === 'To Ship' ? '<span class="badge b-To">NEW</span>' : ''}</span></div>`).join('') || '<p class="hint">No purchases from the online store yet.</p>'}</div>
  <div class="card"><h3>Online orders (${ords.length})</h3><div class="tw"><table><tr><th>Order</th><th>Date</th><th>Customer</th><th>Items</th><th>Payment</th><th>Total</th><th>Status</th><th>Action</th></tr>${ords.slice(0, 60).map(o => `<tr><td>${o.id}</td><td>${SW.fmtD(o.createdAt)}</td><td>${esc(o.custName)}<div class="hint">${esc(o.addr.line)}, ${esc(o.addr.city)}</div></td><td>${o.items.map(i => `${esc(i.name)} ×${i.qty}`).join('<br>')}</td><td>${o.pay}</td><td>${peso(o.total)}</td><td><span class="badge ${bClass(o.status)}">${o.status}</span></td>
  <td>${o.status === 'To Ship' ? `<button class="sm" onclick="setStatus('${o.id}','Shipped')">Mark shipped</button>` : o.status === 'Shipped' ? `<button class="sm" onclick="setStatus('${o.id}','Delivered')">Mark delivered</button>` : '—'}</td></tr>`).join('')}</table></div></div>`;
}
function toggleStore() { const d = SW.load(), s = stallOf(d); s.open = !s.open; SW.audit(d, me, s.owner.name, s.open ? 'Store opened' : 'Store closed', `Stall ${me}`); SW.save(d); go('store'); }
function setStatus(id, st) {
  const d = SW.load(), o = d.orders.find(x => x.id === id), prev = o.status; o.status = st; SW.audit(d, me, stallOf(d).owner.name, 'Order status', `${id} • ${o.custName} • ${prev} → ${st} • ${peso(o.total)}`);
  if (o.custEmail) SW.notifyCust(d, o.custEmail, `Your order ${id} is now ${st}.`, id); SW.save(d); toast('Order updated', 'ok'); go('store');
}

/* ---------- reports ---------- */
function vReports(d, s) {
  const ords = myOrders(d).filter(sold), now = new Date(); let buckets = [], from;
  if (rep === 'week') { for (let i = 6; i >= 0; i--) { const t = startDay(Date.now() - i * 864e5); buckets.push({ t, e: t + 864e5, l: new Date(t).toLocaleDateString('en-PH', { weekday: 'short' }), v: 0 }); } }
  else if (rep === 'month') { for (let i = 29; i >= 0; i--) { const t = startDay(Date.now() - i * 864e5); buckets.push({ t, e: t + 864e5, l: new Date(t).getDate() + '', v: 0 }); } }
  else { for (let i = 11; i >= 0; i--) { const a = new Date(now.getFullYear(), now.getMonth() - i, 1), b = new Date(now.getFullYear(), now.getMonth() - i + 1, 1); buckets.push({ t: a.getTime(), e: b.getTime(), l: a.toLocaleDateString('en-PH', { month: 'short' }), v: 0 }); } }
  from = buckets[0].t; const inR = ords.filter(o => o.createdAt >= from);
  inR.forEach(o => { const b = buckets.find(x => o.createdAt >= x.t && o.createdAt < x.e); if (b) b.v += o.total; });
  const rev = inR.reduce((a, o) => a + o.total, 0), items = inR.reduce((a, o) => a + o.items.reduce((x, i) => x + i.qty, 0), 0), max = Math.max(...buckets.map(b => b.v), 1);
  const top = {}; inR.forEach(o => o.items.forEach(i => { top[i.name] = (top[i.name] || 0) + i.qty; }));
  const topL = Object.entries(top).sort((a, b) => b[1] - a[1]).slice(0, 5), hist = myOrders(d).filter(o => o.createdAt >= from);
  $('#content').innerHTML = `<div class="tabs">${[['week', 'This week'], ['month', 'This month (30 days)'], ['year', 'This year (12 months)']].map(t => `<button class="${rep === t[0] ? 'on' : ''}" onclick="rep='${t[0]}';go('reports')">${t[1]}</button>`).join('')}<button class="sec" style="margin-left:auto" onclick="csv()">⬇ Export CSV</button></div>
  <div class="grid4"><div class="stat"><div class="l">Revenue</div><div class="v">${peso(rev)}</div></div><div class="stat"><div class="l">Orders</div><div class="v">${inR.length}</div></div><div class="stat"><div class="l">Items sold</div><div class="v">${items}</div></div><div class="stat"><div class="l">Avg. order</div><div class="v">${peso(inR.length ? rev / inR.length : 0)}</div></div></div>
  <div class="card"><h3>Sales trend</h3><div class="chart">${buckets.map(b => `<div class="col" title="${peso(b.v)}"><div class="b" style="height:${Math.round(b.v / max * 100)}%"></div></div>`).join('')}</div><div class="xl">${buckets.map(b => `<span>${b.l}</span>`).join('')}</div></div>
  <div class="two"><div class="card"><h3>Top products</h3><table>${topL.map(t => `<tr><td>${esc(t[0])}</td><td><b>${t[1]} pcs</b></td></tr>`).join('') || '<tr><td>No data yet</td></tr>'}</table></div>
  <div class="card"><h3>Sales history</h3><div class="tw" style="max-height:320px;overflow:auto"><table><tr><th>Date</th><th>Order</th><th>Status</th><th>Total</th></tr>${hist.map(o => `<tr><td>${SW.fmtD(o.createdAt)}</td><td>${o.id}</td><td><span class="badge ${bClass(o.status)}">${o.status}</span></td><td>${peso(o.total)}</td></tr>`).join('')}</table></div></div></div>`;
}
function csv() {
  const d = SW.load(), rows = [['Order', 'Date', 'Customer', 'Status', 'Payment', 'Total']].concat(myOrders(d).map(o => [o.id, new Date(o.createdAt).toISOString().slice(0, 10), o.custName, o.status, o.pay, o.total]));
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([rows.map(r => r.map(x => `"${x}"`).join(',')).join('\n')], { type: 'text/csv' })); a.download = `stall${me}-sales.csv`; a.click();
}

/* ---------- settings ---------- */
function vSettings(d, s) {
  const T = [['about', 'About', 'ℹ️'], ['terms', 'Terms & Conditions', '📜'], ['notifications', 'Notifications', '🔔'], ['security', 'Security', '🔒'], ['archives', 'Archives', '🗄️'], ['audit', 'Audit Trail', '🧾'], ['help', 'Help & Support', '💬']];
  const body = {
    about: () => `<h3>About</h3><div class="pre"><b>SkyWorld Stall Owner Portal</b>\n\nThe SkyWorld Stall Owner Portal is a web system for the stall owners of Skyworld Mall (Stalls 1–105). Here you can manage your inventory (with quantity and stock status), your online store, sales, reports and settings.\n\nVersion: 1.0 (case study prototype)\nData: saved in your browser's localStorage.</div>`,
    terms: () => `<h3>Terms & Conditions</h3><div class="pre"><b>SkyWorld Stall Owner Terms & Conditions</b>\n\n1. The owner is responsible for the accuracy of each product's information, price and quantity.\n2. Selling illegal, counterfeit or prohibited products is not allowed.\n3. Orders must be shipped within the set timeframe and the store's cancellation policy must be respected.\n4. SkyWorld reserves the right to suspend any stall that violates these rules.\n5. Customers' personal data may only be used to process their orders.\n6. All transactions are recorded in the Audit Trail for security and traceability.</div>`,
    archives: () => { const ap = myProducts(d, true), ao = myOrders(d); return `<h3>Archived products</h3><div class="tw"><table><tr><th>Product</th><th>Qty</th><th>Archived</th><th></th></tr>${ap.map(p => `<tr><td>${esc(p.name)}</td><td>${p.qty}</td><td>${p.archivedAt ? SW.fmt(p.archivedAt) : '—'}</td><td><button class="sm" onclick="restoreProd('${p.id}')">Restore</button></td></tr>`).join('') || '<tr><td colspan=4>No archived products.</td></tr>'}</table></div><h3 style="margin-top:20px">Transaction history (all orders from your online store)</h3><div class="tw" style="max-height:340px;overflow:auto"><table><tr><th>Order</th><th>Date</th><th>Customer</th><th>Items</th><th>Status</th><th>Total</th></tr>${ao.map(o => `<tr><td>${o.id}</td><td>${SW.fmt(o.createdAt)}</td><td>${esc(o.custName)}</td><td>${o.items.map(i => `${esc(i.name)} ×${i.qty}`).join('<br>')}</td><td><span class="badge ${bClass(o.status)}">${o.status}</span></td><td>${peso(o.total)}</td></tr>`).join('')}</table></div>`; },
    audit: () => auditView(d),
    help: () => `<h3>Help & Support</h3><div class="faq"><b>How do I add a product?</b>Inventory → + Add product → add a picture, price and quantity.<b>How is the stock status determined?</b>Out of Stock = 0 quantity; Low Stock = 1 to 10; In Stock = 11 or more.<b>Is the stock reduced when someone buys?</b>Yes, automatically. It is restored if the order is cancelled.<b>How do I see my sales history?</b>Reports → week / month / year.</div><label>Send a message to support</label><textarea id="hm" rows="3"></textarea><div class="mf"><button onclick="if(!$('#hm').value.trim())return toast('Please enter a message','er');const d=SW.load();SW.audit(d,me,stallOf(d).owner.name,'Support ticket',$('#hm').value.slice(0,80));SW.save(d);$('#hm').value='';toast('Sent to support: support@skyworld.ph','ok')">Send</button></div>`,
    notifications: () => notifView(d),
    security: () => `<h3>Security</h3><label>Current password</label><input id="o1" type="password"><label>New password</label><input id="o2" type="password"><div class="mf"><button onclick="chgPw()">Change password</button></div>`
  };
  if (!body[tab]) tab = 'about';
  if (tab === 'audit') setTimeout(audList, 0);
  $('#content').innerHTML = `<div class="set-top">${SW.avatar(s.owner, 52)}<div><b>${esc(s.owner.name)}</b><div class="hint" style="margin:0">${esc(s.name)} • Stall #${s.n}</div></div><button class="sec sm" style="margin-left:auto" onclick="go('profile')">Edit profile</button></div>
  <div class="set"><div class="slist">${T.map((t, i) => `${i === 2 || i === 4 ? '<hr>' : ''}<button class="${tab === t[0] ? 'on' : ''}" onclick="tab='${t[0]}';go('settings')"><span class="ic">${t[2]}</span>${t[1]}<span class="ch">›</span></button>`).join('')}</div><div class="card">${body[tab]()}</div></div>`;
}
/* ---- audit trail: detailed chronological record of everything that happened in this stall ---- */
const AUD_CAT = a => /login|logout|register|password|profile|stall created/i.test(a) ? 'Account' : /product|stock/i.test(a) ? 'Inventory' : /order/i.test(a) ? 'Orders' : /store/i.test(a) ? 'Store' : /support/i.test(a) ? 'Support' : 'System';
function auditEvents(d) {
  const mine = d.audit.filter(a => a.stall === me), ev = mine.map(a => ({ ts: a.ts, user: a.user, action: a.action, detail: a.detail }));
  d.orders.filter(o => o.stall === me && !o.custEmail).forEach(o => ev.push({ ts: o.createdAt, user: o.custName, action: 'Order placed', detail: `${o.id} • ${o.items.map(i => `${i.name} ×${i.qty}`).join(', ')} • ${peso(o.total)} • ${o.pay} • current status: ${o.status}${o.reason ? ' (' + o.reason + ')' : ''}` }));
  d.products.filter(p => p.stall === me && !mine.some(a => a.action === 'Add product' && a.detail.startsWith(p.name + ' '))).forEach(p => ev.push({ ts: p.created, user: 'System', action: 'Product listed', detail: `${p.name} • ${peso(p.price)} • qty ${p.qty}` }));
  return ev.map(e => ({ ...e, cat: AUD_CAT(e.action) })).sort((a, b) => a.ts - b.ts);
}
function auditView(d) {
  const all = auditEvents(d).map((e, i) => ({ ...e, no: i + 1 })), q = aud.q.toLowerCase();
  let l = all.filter(e => (aud.cat === 'all' || e.cat === aud.cat) && (`${e.user} ${e.action} ${e.detail}`).toLowerCase().includes(q));
  if (aud.dir === 'desc') l = [...l].reverse();
  return `<h3>Audit Trail</h3><p class="hint" style="margin-bottom:12px">A detailed, chronological record of every event in this stall — account activity, inventory changes, orders and store actions — from the very first entry to the latest.</p>
  <div class="bar"><input placeholder="Search user, action or details..." value="${esc(aud.q)}" oninput="aud.q=this.value;audList()"><select onchange="aud.cat=this.value;audList()">${['all', 'Account', 'Inventory', 'Orders', 'Store', 'Support', 'System'].map(c => `<option value="${c}" ${aud.cat === c ? 'selected' : ''}>${c === 'all' ? 'All categories' : c}</option>`).join('')}</select><select onchange="aud.dir=this.value;audList()"><option value="asc" ${aud.dir === 'asc' ? 'selected' : ''}>Oldest first</option><option value="desc" ${aud.dir === 'desc' ? 'selected' : ''}>Newest first</option></select><button class="sec" onclick="auditCsv()">⬇ Export CSV</button></div>
  <div class="hint" id="audn"></div><div class="tw" id="audt" style="max-height:540px;overflow:auto"></div>`;
}
function audList() {
  const d = SW.load(), all = auditEvents(d).map((e, i) => ({ ...e, no: i + 1 })), q = aud.q.toLowerCase();
  let l = all.filter(e => (aud.cat === 'all' || e.cat === aud.cat) && (`${e.user} ${e.action} ${e.detail}`).toLowerCase().includes(q)); if (aud.dir === 'desc') l = [...l].reverse();
  $('#audn').textContent = `Showing ${l.length} of ${all.length} entries`;
  $('#audt').innerHTML = `<table><tr><th>#</th><th>Date & time</th><th>Category</th><th>User</th><th>Action</th><th>Details</th></tr>${l.map(e => `<tr><td>${e.no}</td><td style="white-space:nowrap">${SW.fmt(e.ts)}</td><td><span class="badge b-To">${e.cat}</span></td><td>${esc(e.user)}</td><td><b>${esc(e.action)}</b></td><td>${esc(e.detail)}</td></tr>`).join('') || '<tr><td colspan=6>No entries found.</td></tr>'}</table>`;
}
function auditCsv() {
  const rows = [['#', 'Date & time', 'Category', 'User', 'Action', 'Details']].concat(auditEvents(SW.load()).map((e, i) => [i + 1, new Date(e.ts).toISOString(), e.cat, e.user, e.action, e.detail]));
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([rows.map(r => r.map(x => `"${String(x).replace(/"/g, '""')}"`).join(',')).join('\n')], { type: 'text/csv' })); a.download = `stall${me}-audit-trail.csv`; a.click();
}

/* ---- notifications ---- */
function seedNotifs() {          // first time this stall is opened: turn current activity into notifications
  const d = SW.load(); d.nseed = d.nseed || {}; if (d.nseed[me]) return; d.nseed[me] = 1;
  const out = [];
  d.orders.filter(o => o.stall === me && o.status === 'To Ship').slice(0, 5).forEach(o => out.push({ id: SW.uid(), stall: me, msg: `🛒 New order ${o.id} from ${o.custName} — ${peso(o.total)} (${o.pay}). Please prepare it for shipping.`, ts: o.createdAt, read: false }));
  d.products.filter(p => p.stall === me && !p.archived && SW.stockStatus(p) !== 'in').slice(0, 6).forEach((p, i) => out.push({ id: SW.uid(), stall: me, msg: SW.stockStatus(p) === 'out' ? `⚠️ ${p.name} is OUT OF STOCK. Restock it so customers can order again.` : `⚠️ Low stock: ${p.name} (only ${p.qty} left).`, ts: Date.now() - (i + 1) * 60000, read: false }));
  out.push({ id: SW.uid(), stall: me, msg: '👋 Welcome to your SkyWorld stall dashboard. You will be notified here about new orders, cancellations, address changes and low stock.', ts: Date.now() - 86400000 * 2, read: true });
  d.notifs.push(...out); SW.save(d);
}
const nIcon = m => /^🛒/.test(m) ? ['🛒', 'New order'] : /^❌/.test(m) ? ['❌', 'Cancelled'] : /^📍/.test(m) ? ['📍', 'Address change'] : /^⚠️/.test(m) ? ['⚠️', 'Stock alert'] : ['🔔', 'Info'];
function notifView(d) {
  const n = d.notifs.filter(x => x.stall === me).sort((a, b) => b.ts - a.ts), un = n.filter(x => !x.read).length;
  return `<h3>Notifications</h3><div class="bar"><span class="hint" style="margin:0">${un} unread • new orders, cancellations, address changes and stock alerts appear here</span><button class="sec sm" style="margin-left:auto" ${un ? '' : 'disabled'} onclick="readAllN()">Mark all as read</button></div>` +
    (n.map(x => { const ic = nIcon(x.msg); return `<div class="list-i ${x.read ? '' : 'unread'}" style="cursor:pointer;align-items:center" onclick="readN('${x.id}')"><span style="display:flex;gap:10px;align-items:center"><span class="ic" style="font-size:1.3rem">${ic[0]}</span><span><span class="badge b-To" style="margin-right:6px">${ic[1]}</span>${esc(x.msg.replace(/^\S+\s/, ''))}</span></span><span class="hint" style="margin:0">${SW.fmt(x.ts)}</span></div>`; }).join('') || '<p class="hint">No notifications yet.</p>');
}
function readN(id) { const d = SW.load(), x = d.notifs.find(n => n.id === id); if (x && !x.read) { x.read = true; SW.save(d); go('settings'); } }
function readAllN() { const d = SW.load(); d.notifs.forEach(x => { if (x.stall === me) x.read = true; }); SW.save(d); go('settings'); }
function restoreProd(id) { const d = SW.load(), p = d.products.find(x => x.id === id); p.archived = false; SW.audit(d, me, stallOf(d).owner.name, 'Restore product', p.name); SW.save(d); toast('Restored', 'ok'); go('settings'); }
function chgPw() {
  const d = SW.load(), s = stallOf(d), n = $('#o2').value;
  if (s.owner.pass !== SW.hash($('#o1').value)) return toast('Current password is incorrect', 'er');
  if (n.length < 8 || !/[A-Za-z]/.test(n) || !/\d/.test(n)) return toast('Password: 8+ characters, letters and numbers', 'er');
  s.owner.pass = SW.hash(n); SW.audit(d, me, s.owner.name, 'Change password', ''); SW.save(d); toast('Password changed', 'ok'); go('settings');
}

/* ---------- profile ---------- */
function vProfile(d, s) {
  pendingPic = undefined; pendingAv = undefined;
  $('#content').innerHTML = `<div class="card" style="max-width:700px"><div class="pf-head"><div id="pfav">${SW.avatar(s.owner, 96)}</div><div><h3 style="margin:0">${esc(s.owner.name)}</h3><span class="chip">Stall #${s.n}</span> <span class="chip">${SW.CATS[s.cat]} ${s.cat}</span>
  <div class="pf-actions"><label class="sm" style="margin:0"><span class="btn-like">📷 Upload photo</span><input type="file" id="pfile" accept="image/*" hidden onchange="pickPic(this)"></label><button class="dng sm" onclick="pickAv('', true)">Remove photo</button></div></div></div>
  <label>Or choose an avatar</label><div class="av-pick" id="avp">${SW.AVATARS.map(a => `<button type="button" class="${!s.owner.pic && s.owner.avatar === a ? 'on' : ''}" onclick="pickAv('${a}')">${a}</button>`).join('')}</div>
  <label>Owner name</label><input id="fn" value="${esc(s.owner.name)}"><label>Email (login)</label><input value="${esc(s.owner.email)}" disabled><label>Phone</label><input id="fp2" value="${esc(s.owner.phone)}">
  <label>Store name</label><input id="fs" value="${esc(s.name)}"><label>Stall category (fixed per stall number)</label><input value="${s.cat}" disabled><label>Address</label><input id="fa" value="${esc(s.address)}">
  <div class="mf"><button onclick="saveProfile()">Save profile</button></div></div>`;
}
function previewPic() {
  const d = SW.load(), o = { ...stallOf(d).owner }; if (pendingPic !== undefined) o.pic = pendingPic; if (pendingAv !== undefined) o.avatar = pendingAv;
  $('#pfav').innerHTML = SW.avatar(o, 96);
  document.querySelectorAll('#avp button').forEach(b => b.classList.toggle('on', !o.pic && b.textContent === o.avatar));
}
function pickPic(inp) { const f = inp.files[0]; if (!f) return; SW.readPhoto(f, url => { pendingPic = url; pendingAv = ''; previewPic(); }); }
function pickAv(a, removePhoto) { pendingAv = a; pendingPic = ''; if (removePhoto) pendingAv = ''; previewPic(); }
function saveProfile() {
  const d = SW.load(), s = stallOf(d), n = $('#fn').value.trim(), p = $('#fp2').value.trim(), st = $('#fs').value.trim();
  if (!n || !st || !/^09\d{9}$/.test(p)) return toast('Check the name, store name and phone (09xxxxxxxxx)', 'er');
  if (pendingPic !== undefined) s.owner.pic = pendingPic || null;
  if (pendingAv !== undefined) s.owner.avatar = pendingAv || null;
  s.owner.name = n; s.owner.phone = p; s.name = st; s.address = $('#fa').value.trim(); SW.audit(d, me, n, 'Update profile', ''); SW.save(d); toast('Profile saved', 'ok'); renderApp();
}

/* ---------- boot ---------- */
SW.load();
const sess = sessionStorage.getItem('sw_owner');
if (sess) { me = +sess; renderApp(); } else renderLogin();
// LIVE SYNC with the customer store: the owner portal and the store share one database.
// When a customer buys (even in another tab), every page of this portal refreshes by itself
// and a toast pops up. A 2-second check is used as a backup in case the browser skips the event.
let lastRaw = localStorage.getItem('skyworld_db_v1'), seenNotif = null;
function syncNow() {
  if (!me) return;
  const raw = localStorage.getItem('skyworld_db_v1'); if (raw === lastRaw) return; lastRaw = raw;
  const d = SW.load(), mine = d.notifs.filter(n => n.stall === me && !n.read);
  const top = mine.sort((a, b) => b.ts - a.ts)[0];
  if (top && top.id !== seenNotif && Date.now() - top.ts < 15000) { toast(top.msg, 'ok'); }
  if (top) seenNotif = top.id;
  if (document.querySelector('.overlay') || view === 'profile') return;
  if (view === 'settings' && ['security', 'help'].includes(tab)) return;     // don't wipe what the owner is typing
  if (view === 'settings' && tab === 'audit' && aud.q) { audList(); return; }
  go(view);
}
window.addEventListener('storage', e => { if (e.key === 'skyworld_db_v1') syncNow(); });
setInterval(syncNow, 2000);
