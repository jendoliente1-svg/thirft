/* SkyWorld Online Shop — customer-facing store (prototype) */
const LOGO = '../shared/logo.png';   // <- replace shared/logo.png with your own logo (or change this path)
const $ = s => document.querySelector(s);
const esc = SW.esc, peso = SW.peso;
let me = null;                              // logged-in customer email
let co = null;                              // checkout state
let sel = {};                               // options picked in the product modal
let pickCat = 'All', pickQ = '';
let sf = { q: '', st: 'all', sort: 'def' };
let ordTab = 'All', want = '';
const REASONS = ['I changed my mind', 'Wrong product / variation selected', 'I found a cheaper price', 'I want to change the address / payment method', 'Delivery takes too long', 'I ordered a duplicate', 'Other reason'];

/* ---------- helpers ---------- */
function toast(m, t = '') { const e = document.createElement('div'); e.className = 'toast ' + t; e.textContent = m; $('#toasts').append(e); setTimeout(() => e.remove(), 4500); }
function closeModals() { document.querySelectorAll('.overlay').forEach(e => e.remove()); }
function modal(html, cls = '') { const o = document.createElement('div'); o.className = 'overlay'; o.innerHTML = `<div class="modal ${cls}">${html}</div>`; o.addEventListener('mousedown', e => { if (e.target === o && !o.dataset.lock) o.remove(); }); document.body.append(o); return o; }
const user = d => d.customers[me];
const stallsOf = d => d.stalls;
const bClass = s => s === 'To Ship' ? 'To' : s;
const badge = p => { const s = SW.stockStatus(p); return `<span class="badge b-${s}">${SW.STATUS_LABEL[s]}</span>`; };
const pwOk = p => p.length >= 8 && /[A-Za-z]/.test(p) && /\d/.test(p);

/* ---------- nav & routing ---------- */
function nav() {
  const d = SW.load(), u = d.customers[me]; if (!u) { $('#nav').innerHTML = ''; return; }
  const un = d.cnotifs.filter(n => n.email === me && !n.read).length;
  $('#nav').innerHTML = `<div class="logo" onclick="location.hash='#/pick'"><img class="blogo" src="${LOGO}" alt="" onerror="this.onerror=null;this.src='../shared/logo.svg'"> SkyWorld Shop</div><button onclick="location.hash='#/pick'">🏬 <span class="tx">Choose stall</span></button><div class="sp"></div>
  <button onclick="location.hash='#/cart'">🛒 <span class="tx">Cart</span><span class="bd">${u.cart.length}</span></button><button onclick="location.hash='#/orders'">📦 <span class="tx">My orders</span></button><button onclick="location.hash='#/inbox'">🔔 <span class="tx">Inbox</span><span class="bd">${un}</span></button><button class="acc" onclick="location.hash='#/account'">${SW.avatar(u, 24)} ${esc(u.name.split(' ')[0])}</button><button onclick="logout()"><span class="tx">Logout</span><span class="ic">⎋</span></button>`;
}
function logout() { sessionStorage.removeItem('sw_cust'); me = null; co = null; nav(); location.hash = '#/auth'; route(); }
function route() {
  closeModals();
  const p = location.hash.replace(/^#\/?/, '').split('/'), d = SW.load();
  if (me && !d.customers[me]) me = null;
  if (!me) { if (p[0] === 's') want = location.hash; $('#nav').innerHTML = ''; return vAuth(p[0] === 'register' ? 'register' : 'login'); }
  nav();
  const v = $('#view'); window.scrollTo(0, 0);
  if (p[0] === 's') return vStall(+p[1]);
  if (p[0] === 'cart') return vCart();
  if (p[0] === 'checkout') return vCheckout();
  if (p[0] === 'orders') return vOrders();
  if (p[0] === 'order') return vOrder(p[1]);
  if (p[0] === 'inbox') return vInbox();
  if (p[0] === 'account') return vAccount();
  return vPick();
}
window.addEventListener('hashchange', route);

/* ---------- auth ---------- */
function vAuth(mode) {
  const saved = localStorage.getItem('sw_cust_saved') || '';
  $('#view').innerHTML = `<div class="auth"><div class="abox">${mode === 'login' ? `<h2>Login</h2><p class="hint">Log in to shop at Skyworld stalls.</p>
  <label>Email</label><input id="em" type="email" value="${esc(saved)}"><label>Password</label><input id="pw" type="password">
  <div style="text-align:right;margin-top:6px"><a onclick="forgot()">Forgot password?</a></div>
  <label>Verify you're human</label><div class="captcha" id="cap"></div>
  <div class="err" id="err"></div><button style="width:100%" onclick="doLogin()">Login</button><div class="sw">New here? <a href="#/register">Register</a></div>`
      : `<h2>Create account</h2><p class="hint">Free and quick.</p><label>Full name</label><input id="rn"><label>Email</label><input id="em" type="email"><label>Phone</label><input id="rp" placeholder="09xxxxxxxxx">
  <div class="row2"><div><label>Password</label><input id="r1" type="password"></div><div><label>Confirm</label><input id="r2" type="password"></div></div><div class="hint">8+ characters, with letters and numbers</div>
  <label>Verify you're human</label><div class="captcha" id="cap"></div><label style="font-weight:400"><input type="checkbox" id="rt" style="width:auto"> I agree to the Terms & Privacy Policy</label>
  <div class="err" id="err"></div><button style="width:100%" onclick="doRegister()">Register</button><div class="sw">Already have an account? <a href="#/auth">Login</a></div>`}</div></div>`;
  SW.captcha.render($('#cap'));
  (document.getElementById('pw') || document.getElementById('r2')).addEventListener('keydown', e => e.key === 'Enter' && (mode === 'login' ? doLogin() : doRegister()));
}
function doLogin() {
  const email = $('#em').value.trim().toLowerCase(), pw = $('#pw').value, err = $('#err');
  if (!email || !pw) return err.textContent = 'Enter your email and password.';
  const lock = SW.guard.locked('cus_' + email); if (lock) return err.textContent = `Login is temporarily locked. Try again in ${lock}s.`;
  if (!SW.captcha.ok($('#cap'))) { SW.captcha.render($('#cap')); return err.textContent = 'Incorrect code. Please try again.'; }
  const d = SW.load(), u = d.customers[email];
  if (!u || u.pass !== SW.hash(pw)) { const left = SW.guard.fail('cus_' + email); SW.captcha.render($('#cap')); return err.textContent = left > 0 ? `Incorrect email or password. ${left} attempt(s) left.` : 'Login locked for 30 seconds.'; }
  SW.guard.clear('cus_' + email); me = email; sessionStorage.setItem('sw_cust', email); location.hash = want || '#/pick'; want = ''; route();
}
function doRegister() {
  const g = id => $('#' + id).value.trim(), err = $('#err'), email = g('em').toLowerCase(), d = SW.load();
  if (!g('rn') || !email || !g('rp')) return err.textContent = 'Please fill in all fields.';
  if (!/^\S+@\S+\.\S+$/.test(email)) return err.textContent = 'Invalid email address.';
  if (!/^09\d{9}$/.test(g('rp'))) return err.textContent = 'Phone: 11 digits starting with 09.';
  if (d.customers[email]) return err.textContent = 'An account with this email already exists.';
  if (!pwOk($('#r1').value)) return err.textContent = 'Weak password (8+ characters, letters and numbers).';
  if ($('#r1').value !== $('#r2').value) return err.textContent = 'Passwords do not match.';
  if (!$('#rt').checked) return err.textContent = 'Please agree to the Terms first.';
  if (!SW.captcha.ok($('#cap'))) { SW.captcha.render($('#cap')); return err.textContent = 'Incorrect code. Please try again.'; }
  d.customers[email] = { name: g('rn'), email, phone: g('rp'), pass: SW.hash($('#r1').value), addr: { name: g('rn'), phone: g('rp'), line: '', city: '' }, cart: [], created: Date.now() };
  SW.notifyCust(d, email, 'Welcome to SkyWorld Shop! Choose a stall to start shopping.'); SW.save(d);
  me = email; sessionStorage.setItem('sw_cust', email); location.hash = '#/pick'; route();
  const b = document.createElement('div'); b.className = 'savebar';
  b.innerHTML = `<span>💾 Save your account so logging in is easier next time?</span><button class="sm" onclick="localStorage.setItem('sw_cust_saved','${esc(email)}');this.parentNode.remove();toast('Account saved','ok')">Save account</button><button class="sm gr" onclick="this.parentNode.remove()">Not now</button>`;
  $('#savebar').append(b);
}
let fCode = '', fEmail = '';
function forgot() {
  modal(`<h2>Forgot password</h2><div id="f1"><label>Email</label><input id="fe" type="email"><div class="mf"><button class="gr" onclick="closeModals()">Cancel</button><button onclick="fSend()">Send code</button></div></div>
  <div id="f2" style="display:none"><p class="hint">We sent a 6-digit code to your email.</p><label>Code</label><input id="fc" maxlength="6"><label>New password</label><input id="fp" type="password"><div class="err" id="ferr"></div><div class="mf"><button onclick="fReset()">Reset password</button></div></div>`);
}
function fSend() {
  const e = $('#fe').value.trim().toLowerCase(), d = SW.load(); if (!d.customers[e]) return toast('No account found for that email.', 'er');
  fCode = String(Math.floor(100000 + Math.random() * 900000)); fEmail = e; $('#f1').style.display = 'none'; $('#f2').style.display = 'block'; toast(`📧 (Demo email) Verification code: ${fCode}`, 'ok');
}
function fReset() {
  if ($('#fc').value.trim() !== fCode) return $('#ferr').textContent = 'Incorrect code.';
  if (!pwOk($('#fp').value)) return $('#ferr').textContent = 'Password: 8+ characters, letters and numbers.';
  const d = SW.load(); d.customers[fEmail].pass = SW.hash($('#fp').value); SW.save(d); SW.guard.clear('cus_' + fEmail); closeModals(); toast('Password changed. You can log in now.', 'ok');
}

/* ---------- choose category + stall ---------- */
function vPick() {
  const d = SW.load(), cats = ['All', ...Object.keys(SW.CATS)];
  const list = d.stalls.filter(s => (pickCat === 'All' || s.cat === pickCat) && (!pickQ || String(s.n) === pickQ.trim() || s.name.toLowerCase().includes(pickQ.toLowerCase())));
  $('#view').innerHTML = `<div class="wrap"><div class="panel"><h2>👋 Hi ${esc(user(d).name.split(' ')[0])}! Choose a category and stall</h2><p class="hint">Every stall (1–105) has its own online store.</p>
  <div class="cats">${cats.map(c => `<button class="${pickCat === c ? 'on' : ''}" onclick="pickCat='${c}';vPick()">${SW.CATS[c] || '🏬'} ${c}</button>`).join('')}<button style="background:#222" onclick="surprise()">🎲 Random stall</button></div>
  <div class="tools"><input id="pq" placeholder="Stall number or name (1–105)" value="${esc(pickQ)}" oninput="pickQ=this.value;pickList()"></div></div><div class="stalls" id="sl"></div></div>`;
  pickList();
}
function pickList() {
  const d = SW.load(), list = d.stalls.filter(s => (pickCat === 'All' || s.cat === pickCat) && (!pickQ || String(s.n) === pickQ.trim() || s.name.toLowerCase().includes(pickQ.toLowerCase())));
  $('#sl').innerHTML = list.map(s => `<div class="stall ${s.open ? '' : 'closed'}" onclick="location.hash='#/s/${s.n}'"><div class="n">#${s.n}</div><div class="nm">${esc(s.name)}</div><div class="c">${SW.CATS[s.cat]} ${s.cat} ${s.open ? '' : '• Closed'}</div></div>`).join('') || '<div class="empty">No stalls found.</div>';
}
function surprise() { const d = SW.load(), l = d.stalls.filter(s => s.open && (pickCat === 'All' || s.cat === pickCat)); const s = l[Math.floor(Math.random() * l.length)]; location.hash = '#/s/' + s.n; }

/* ---------- stall store ---------- */
function vStall(n) {
  const d = SW.load(), s = d.stalls[n - 1]; if (!s) return location.hash = '#/pick';
  const [c1, c2] = SW.CAT_COLOR[s.cat];
  $('#view').innerHTML = `<div class="wrap"><div class="hero" style="background:linear-gradient(120deg,${c1},${c2})"><div><small>Stall #${s.n} • ${SW.CATS[s.cat]} ${s.cat}</small><h1>${esc(s.name)}</h1><small>📍 ${esc(s.address)}</small></div><div><span class="badge ${s.open ? 'b-in' : 'b-out'}">${s.open ? 'Store open' : 'Store closed'}</span></div></div>
  ${s.open ? '' : '<div class="panel" style="background:#fde0e2">This store is temporarily closed. You cannot place orders for now.</div>'}
  <div class="tools"><input placeholder="Search in this store..." value="${esc(sf.q)}" oninput="sf.q=this.value;stallList(${n})"><select onchange="sf.st=this.value;stallList(${n})">${[['all', 'All availability'], ['in', 'In Stock'], ['low', 'Low Stock'], ['out', 'Out of Stock']].map(o => `<option value="${o[0]}" ${sf.st === o[0] ? 'selected' : ''}>${o[1]}</option>`).join('')}</select>
  <select onchange="sf.sort=this.value;stallList(${n})">${[['def', 'Sort: Newest'], ['lo', 'Price: Low to High'], ['hi', 'Price: High to Low']].map(o => `<option value="${o[0]}" ${sf.sort === o[0] ? 'selected' : ''}>${o[1]}</option>`).join('')}</select></div><div class="pgrid" id="pg"></div></div>`;
  stallList(n);
}
function stallList(n) {
  const d = SW.load(), s = d.stalls[n - 1], q = sf.q.toLowerCase();
  let l = d.products.filter(p => p.stall === n && !p.archived && p.name.toLowerCase().includes(q) && (sf.st === 'all' || SW.stockStatus(p) === sf.st));
  if (sf.sort === 'lo') l.sort((a, b) => SW.finalPrice(a) - SW.finalPrice(b)); else if (sf.sort === 'hi') l.sort((a, b) => SW.finalPrice(b) - SW.finalPrice(a)); else l.sort((a, b) => b.created - a.created);
  $('#pg').innerHTML = l.map(p => {
    const st = SW.stockStatus(p), dis = st === 'out' || !s.open ? 'disabled' : '';
    return `<div class="pc"><img src="${SW.img(p)}" onclick="openProduct('${p.id}')"><div class="in"><div class="nm" onclick="openProduct('${p.id}')">${esc(p.name)}</div><div class="hint">${p.cat}</div>
    <div><span class="pr">${peso(SW.finalPrice(p))}</span>${p.discount ? `<s>${peso(p.price)}</s> <span class="off">-${p.discount}%</span>` : ''}</div>
    <div>${badge(p)} ${st === 'low' ? `<span class="hint">Only ${p.qty} left</span>` : ''}</div>
    <div class="bt"><button class="sec sm" ${dis} onclick="openProduct('${p.id}')">Add to cart</button><button class="sm" ${dis} onclick="openProduct('${p.id}')">Buy now</button></div></div></div>`;
  }).join('') || '<div class="empty" style="grid-column:1/-1">No matching products.</div>';
}

/* ---------- product modal ---------- */
function optsHtml(p) {
  return `${p.colors.length ? `<label>Color</label><div class="chips" id="oc">${p.colors.map(c => `<button class="${sel.color === c ? 'on' : ''}" onclick="setOpt('color','${c}',this)"><span class="sw2" style="background:${SW.COLOR_HEX[c] || '#ccc'}"></span>${c}</button>`).join('')}</div>` : ''}
  ${p.sizes.length ? `<label>Size</label><div class="chips" id="os">${p.sizes.map(c => `<button class="${sel.size === c ? 'on' : ''}" onclick="setOpt('size','${c}',this)">${c}</button>`).join('')}</div>` : ''}
  <label>Quantity <span class="hint">(${p.qty} available)</span></label><div class="qty"><button onclick="qAdj(-1,${p.qty})">−</button><input id="qv" value="${sel.qty}" oninput="qSet(${p.qty})"><button onclick="qAdj(1,${p.qty})">+</button></div>`;
}
function setOpt(k, v, el) { sel[k] = v; [...el.parentNode.children].forEach(b => b.classList.remove('on')); el.classList.add('on'); }
function qAdj(n, max) { sel.qty = Math.min(max, Math.max(1, (+$('#qv').value || 1) + n)); $('#qv').value = sel.qty; }
function qSet(max) { let v = Math.floor(+$('#qv').value) || 1; sel.qty = Math.min(max, Math.max(1, v)); }
function openProduct(pid) {
  const d = SW.load(), p = d.products.find(x => x.id === pid), s = d.stalls[p.stall - 1], st = SW.stockStatus(p);
  sel = { pid, color: '', size: '', qty: 1 };
  const dis = st === 'out' || !s.open;
  modal(`<div class="pd"><img src="${SW.img(p)}"><div><h2>${esc(p.name)}</h2><div class="hint">Stall #${s.n} • ${esc(s.name)} • Category: ${p.cat}</div>
  <div style="margin:10px 0"><span class="pr" style="font-size:24px;color:var(--p);font-weight:700">${peso(SW.finalPrice(p))}</span>${p.discount ? ` <s class="hint">${peso(p.price)}</s> <span class="off">-${p.discount}%</span>` : ''}</div>
  <div>${badge(p)} ${st === 'low' ? `<span class="hint">Only ${p.qty} left!</span>` : st === 'in' ? `<span class="hint">${p.qty} pieces available</span>` : ''}</div><p style="margin-top:10px;color:#444">${esc(p.desc)}</p>
  ${dis ? `<p class="err">${!s.open ? 'The store is closed.' : 'This product is out of stock.'}</p>` : optsHtml(p)}</div></div>
  <div class="mf"><button class="gr" onclick="closeModals()">Close</button><button class="sec" ${dis ? 'disabled' : ''} onclick="addToCart()">🛒 Add to basket</button><button ${dis ? 'disabled' : ''} onclick="buyNow()">Buy now</button></div>`, 'big');
}
function checkSel() {
  const d = SW.load(), p = d.products.find(x => x.id === sel.pid); qSet(p.qty);
  if (p.colors.length && !sel.color) { toast('Please choose a color', 'er'); return null; }
  if (p.sizes.length && !sel.size) { toast('Please choose a size', 'er'); return null; }
  if (p.qty < 1) { toast('Out of stock', 'er'); return null; }
  return { d, p };
}
function addToCart() {
  const r = checkSel(); if (!r) return; const { d, p } = r, u = user(d);
  const ex = u.cart.find(c => c.pid === p.id && c.color === sel.color && c.size === sel.size);
  if (ex) ex.qty = Math.min(p.qty, ex.qty + sel.qty); else u.cart.push({ id: SW.uid(), pid: p.id, stall: p.stall, qty: sel.qty, color: sel.color, size: sel.size });
  SW.save(d); closeModals(); nav(); toast('Added to basket 🛒', 'ok');
}
function buyNow() {
  const r = checkSel(); if (!r) return;
  co = { stall: r.p.stall, from: 'buy', items: [{ pid: r.p.id, qty: sel.qty, color: sel.color, size: sel.size }], voucher: '', addr: null };
  closeModals(); location.hash = '#/checkout';
}

/* ---------- cart ---------- */
function vCart() {
  const d = SW.load(), u = user(d), groups = {};
  u.cart.forEach(c => (groups[c.stall] = groups[c.stall] || []).push(c));
  const keys = Object.keys(groups);
  $('#view').innerHTML = `<div class="wrap"><div class="panel"><h2>🛒 My cart (${u.cart.length})</h2><p class="hint">Products you added to your basket. Edit the color/size/quantity or delete them.</p></div>${keys.map(k => {
    const s = d.stalls[k - 1], rows = groups[k]; let tot = 0, cnt = 0;
    return `<div class="panel"><h3>🏬 Stall #${s.n} — ${esc(s.name)}</h3>${rows.map(c => {
      const p = d.products.find(x => x.id === c.pid), ok = p && !p.archived && p.qty >= c.qty;
      if (ok) { tot += SW.finalPrice(p) * c.qty; cnt += c.qty; }
      return `<div class="crow"><img src="${SW.img(p)}"><div><b>${esc(p.name)}</b><div class="hint">${[c.color, c.size].filter(Boolean).join(' • ') || 'No variation'}</div>${ok ? badge(p) : '<span class="badge b-out">Not enough stock</span>'}</div><div>${peso(SW.finalPrice(p))}</div><div>Qty: <b>${c.qty}</b><div class="hint">${peso(SW.finalPrice(p) * c.qty)}</div></div><div><button class="sm sec" onclick="editCart('${c.id}')">Edit</button> <button class="sm gr" onclick="delCart('${c.id}')">Delete</button></div></div>`;
    }).join('')}<div class="mf" style="align-items:center"><span>Subtotal (${cnt} items): <b style="color:var(--p);font-size:18px">${peso(tot)}</b></span><button ${cnt ? '' : 'disabled'} onclick="cartCheckout(${k})">Checkout</button></div></div>`;
  }).join('') || '<div class="panel empty">Your cart is empty. <br><br><button onclick="location.hash=\'#/pick\'">Start shopping</button></div>'}</div>`;
}
function editCart(id) {
  const d = SW.load(), c = user(d).cart.find(x => x.id === id), p = d.products.find(x => x.id === c.pid);
  sel = { pid: p.id, color: c.color, size: c.size, qty: Math.min(c.qty, Math.max(1, p.qty)), cart: id };
  modal(`<h2>Edit item</h2><b>${esc(p.name)}</b><div class="hint">${badge(p)}</div>${optsHtml(p)}<div class="mf"><button class="gr" onclick="closeModals()">Cancel</button><button onclick="saveCart()">Save changes</button></div>`);
}
function saveCart() {
  const r = checkSel(); if (!r) return; const c = user(r.d).cart.find(x => x.id === sel.cart);
  c.color = sel.color; c.size = sel.size; c.qty = sel.qty; SW.save(r.d); closeModals(); toast('Item updated', 'ok'); vCart(); nav();
}
function delCart(id) { if (!confirm('Remove this item from your cart?')) return; const d = SW.load(); const u = user(d); u.cart = u.cart.filter(c => c.id !== id); SW.save(d); vCart(); nav(); }
function cartCheckout(stall) {
  const d = SW.load(), items = user(d).cart.filter(c => c.stall === stall).filter(c => { const p = d.products.find(x => x.id === c.pid); return p && !p.archived && p.qty >= c.qty; });
  if (!items.length) return toast('No available items.', 'er');
  co = { stall, from: 'cart', items: items.map(c => ({ cartId: c.id, pid: c.pid, qty: c.qty, color: c.color, size: c.size })), voucher: '', addr: null }; location.hash = '#/checkout';
}

/* ---------- checkout ---------- */
function calc(lines, code) {
  const orig = lines.reduce((a, l) => a + l.p.price * l.qty, 0), sub = lines.reduce((a, l) => a + SW.finalPrice(l.p) * l.qty, 0), n = lines.reduce((a, l) => a + l.qty, 0), c = (code || '').trim().toUpperCase();
  let v = 0, vm = '';
  if (c === 'SKY50') { if (sub >= 500) v = 50; else vm = 'Minimum spend of ₱500 for SKY50'; }
  else if (c === 'STALL10') { if (sub >= 300) v = Math.min(100, Math.round(sub * .1)); else vm = 'Minimum spend of ₱300 for STALL10'; }
  else if (c === 'WELCOME') { if (sub >= 200) v = 30; else vm = 'Minimum spend of ₱200 for WELCOME'; }
  else if (c) vm = 'Invalid voucher code';
  const ship = Math.min(49 + (n - 1) * 10, 150), sd = sub >= 1500 ? ship : sub >= 500 ? Math.min(30, ship) : 0;
  return { orig, pd: orig - sub, sub, v, vm, ship, sd, total: sub - v + ship - sd };
}
const shipRange = () => { const f = x => new Date(Date.now() + x * 864e5).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' }); return `${f(3)} – ${f(5)}`; };
function coLines(d) { return co.items.map(i => ({ ...i, p: d.products.find(x => x.id === i.pid) })); }
function vCheckout() {
  if (!co) return location.hash = '#/cart';
  const d = SW.load(), s = d.stalls[co.stall - 1], lines = coLines(d), u = user(d); co.addr = co.addr || { ...u.addr };
  $('#view').innerHTML = `<div class="wrap"><div class="panel"><h2>Checkout — Stall #${s.n} ${esc(s.name)}</h2></div>
  <div class="panel"><h3>📍 Delivery address</h3><div class="row2"><div><label>Full name</label><input id="a1" value="${esc(co.addr.name)}"></div><div><label>Phone</label><input id="a2" value="${esc(co.addr.phone)}" placeholder="09xxxxxxxxx"></div></div><label>Street / Barangay / House no.</label><input id="a3" value="${esc(co.addr.line)}"><label>City / Province</label><input id="a4" value="${esc(co.addr.city)}"></div>
  <div class="panel"><h3>🛍️ Products ordered</h3>${lines.map(l => `<div class="crow co"><img src="${SW.img(l.p)}"><div><b>${esc(l.p.name)}</b><div class="hint">${[l.color, l.size].filter(Boolean).join(' • ') || 'No variation'}</div></div><div>${peso(SW.finalPrice(l.p))}</div><div>×${l.qty}</div></div>`).join('')}<p style="margin-top:10px">🚚 <b>Estimated shipping:</b> ${shipRange()}</p></div>
  <div class="panel sum"><h3>🧾 Order summary</h3><div id="sm"></div></div>
  <div class="panel"><h3>💳 Payment method</h3>
  <label class="pm"><input type="radio" name="pay" value="Cash on Delivery" checked onchange="payUI()">💵 Cash on Delivery</label>
  <label class="pm"><input type="radio" name="pay" value="Credit/Debit Card" onchange="payUI()">💳 Credit / Debit Card</label>
  <div id="cardf" style="display:none;padding:6px 4px"><input id="cn" placeholder="Card number (16 digits)" maxlength="19"><div class="row2" style="margin-top:8px"><input id="ce" placeholder="MM/YY" maxlength="5"><input id="cc" placeholder="CVV" maxlength="3" type="password"></div></div>
  ${Object.keys(LINK).map(k => `<label class="pm"><input type="radio" name="pay" value="${k}" onchange="payUI()">${LINK[k].icon} ${LINK[k].label}</label><div class="lk" id="lk-${LINK[k].id}" style="display:none"></div>`).join('')}
  <div class="err" id="err"></div><div class="mf"><button class="gr" onclick="history.back()">Back</button><button onclick="placeOrder()">Place order</button></div></div></div>`;
  ['a1', 'a2', 'a3', 'a4'].forEach((id, i) => $('#' + id).addEventListener('input', e => co.addr[['name', 'phone', 'line', 'city'][i]] = e.target.value));
  sumHtml();
}
function sumHtml() {
  const d = SW.load(), c = calc(coLines(d), co.voucher), r = (a, b, st = '') => `<div class="r" style="${st}"><span>${a}</span><span>${b}</span></div>`;
  $('#sm').innerHTML = r('Original price', peso(c.orig)) + r('Product discount', '−' + peso(c.pd)) +
    `<div class="r"><span>Seller voucher</span><span><input id="vc" placeholder="SKY50 / STALL10 / WELCOME" value="${esc(co.voucher)}" style="width:210px;display:inline-block"> <button class="sm sec" onclick="co.voucher=$('#vc').value;sumHtml()">Apply</button></span></div>${c.vm ? `<div class="err">${c.vm}</div>` : ''}` +
    r('Voucher discount', '−' + peso(c.v)) + `<hr style="margin:8px 0;border:0;border-top:1px solid #eee">` + r('Shipping fee', peso(c.ship)) + r('Shipping discount', '−' + peso(c.sd)) + r('Total', peso(c.total), 'font-size:20px;font-weight:800;color:var(--p);border-top:1px solid #eee;margin-top:6px;padding-top:10px');
}
// e-wallets and banks: customer must link an account before paying
const LINK = {
  'GCash': { id: 'gcash', icon: '📱', label: 'GCash', field: 'GCash mobile number', ph: '09xxxxxxxxx', re: /^09\d{9}$/, err: 'Enter a valid 11-digit GCash number (09xxxxxxxxx).', mask: v => v.slice(0, 4) + '•••' + v.slice(-4) },
  'Maya': { id: 'maya', icon: '📱', label: 'Maya', field: 'Maya mobile number', ph: '09xxxxxxxxx', re: /^09\d{9}$/, err: 'Enter a valid 11-digit Maya number (09xxxxxxxxx).', mask: v => v.slice(0, 4) + '•••' + v.slice(-4) },
  'Bank Transfer - BDO': { id: 'bdo', icon: '🏦', label: 'Bank — BDO', field: 'BDO account number', ph: '10–12 digit account number', re: /^\d{10,12}$/, err: 'Enter a valid BDO account number (10–12 digits).', mask: v => '••••' + v.slice(-4), bank: true },
  'Bank Transfer - BPI': { id: 'bpi', icon: '🏦', label: 'Bank — BPI', field: 'BPI account number', ph: '10-digit account number', re: /^\d{10}$/, err: 'Enter a valid BPI account number (10 digits).', mask: v => '••••' + v.slice(-4), bank: true }
};
function payUI() {
  const v = document.querySelector('input[name=pay]:checked').value;
  $('#cardf').style.display = v === 'Credit/Debit Card' ? 'block' : 'none';
  Object.keys(LINK).forEach(k => { const el = $('#lk-' + LINK[k].id); el.style.display = k === v ? 'block' : 'none'; if (k === v) linkUI(k); });
}
function linkUI(k) {
  const L = LINK[k], u = user(SW.load()), cur = (u.linked || {})[k], el = $('#lk-' + L.id);
  el.innerHTML = cur
    ? `<div class="linked">✅ <b>${L.label}</b> account linked: ${esc(cur.masked)}${cur.holder ? ' (' + esc(cur.holder) + ')' : ''}<div class="hint">You will be charged through this account when you place the order.</div><div class="pf-actions"><button class="sm gr" onclick="unlink('${k}')">Change / unlink account</button></div></div>`
    : `<div class="linkbox"><b>Link your ${L.label} account to pay</b><div class="hint">${L.bank ? 'Enter the bank account you will pay from.' : 'Enter the mobile number registered to your ' + L.label + ' wallet.'}</div>${L.bank ? '<label>Account name</label><input id="lkn" placeholder="Name on the account">' : ''}<label>${L.field}</label><input id="lkv" placeholder="${L.ph}" inputmode="numeric"><div class="err" id="lke"></div><button class="sm" onclick="doLink('${k}')">🔗 Link account</button></div>`;
}
function doLink(k) {
  const L = LINK[k], v = $('#lkv').value.replace(/\s|-/g, ''), nm = L.bank ? $('#lkn').value.trim() : '';
  if (L.bank && !nm) return $('#lke').textContent = 'Enter the account name.';
  if (!L.re.test(v)) return $('#lke').textContent = L.err;
  const d = SW.load(), u = user(d); u.linked = u.linked || {}; u.linked[k] = { masked: L.mask(v), holder: nm, ts: Date.now() }; SW.save(d);
  toast(`${L.label} account linked`, 'ok'); linkUI(k);
}
function unlink(k) { const d = SW.load(), u = user(d); if (u.linked) delete u.linked[k]; SW.save(d); linkUI(k); }
function placeOrder() {
  const err = $('#err'), a = co.addr, pay = document.querySelector('input[name=pay]:checked').value;
  if (!a.name.trim() || !a.line.trim() || !a.city.trim()) return err.textContent = 'Please complete the delivery address.';
  if (!/^09\d{9}$/.test(a.phone.trim())) return err.textContent = 'Phone: 11 digits starting with 09.';
  if (pay === 'Credit/Debit Card') {
    if (!/^\d{16}$/.test($('#cn').value.replace(/\s/g, ''))) return err.textContent = 'Card number: 16 digits.';
    if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test($('#ce').value)) return err.textContent = 'Expiry format: MM/YY.';
    if (!/^\d{3}$/.test($('#cc').value)) return err.textContent = 'CVV: 3 digits.';
  }
  const d = SW.load(), s = d.stalls[co.stall - 1];
  if (LINK[pay] && !(user(d).linked || {})[pay]) return err.textContent = `Please link your ${LINK[pay].label} account first.`;
  if (!s.open) return err.textContent = 'The store is closed right now.';
  const lines = coLines(d);
  for (const l of lines) { const p = d.products.find(x => x.id === l.pid); if (!p || p.archived || p.qty < l.qty) return err.textContent = `Not enough stock for "${l.p.name}". Go back to your cart and edit it.`; }
  const c = calc(lines, co.voucher), id = `SW${String(co.stall).padStart(3, '0')}-${d.seq++}`;
  // AUTO-DEDUCT STOCK
  lines.forEach(l => {
    const p = d.products.find(x => x.id === l.pid), before = p.qty; p.qty -= l.qty; SW.audit(d, co.stall, 'System', 'Stock deducted', `${p.name}: ${before} → ${p.qty} (order ${id}, ×${l.qty})`);
    const st = SW.stockStatus(p);
    if (st === 'out') SW.notifyOwner(d, co.stall, `⚠️ ${p.name} is now OUT OF STOCK.`); else if (st === 'low') SW.notifyOwner(d, co.stall, `⚠️ Low stock: ${p.name} (only ${p.qty} left).`);
  });
  const u = user(d);
  d.orders.unshift({ id, stall: co.stall, custEmail: me, custName: a.name.trim(), items: lines.map(l => ({ pid: l.pid, name: l.p.name, qty: l.qty, unit: SW.finalPrice(l.p), orig: l.p.price, color: l.color, size: l.size })), addr: { name: a.name.trim(), phone: a.phone.trim(), line: a.line.trim(), city: a.city.trim() }, pay, orig: c.orig, prodDisc: c.pd, voucher: c.v, voucherCode: co.voucher.toUpperCase(), ship: c.ship, shipDisc: c.sd, total: c.total, payRef: LINK[pay] ? user(d).linked[pay].masked : '', status: 'To Ship', reason: '', createdAt: Date.now(), addrChangedAt: 0 });
  if (co.from === 'cart') { const ids = co.items.map(i => i.cartId); u.cart = u.cart.filter(x => !ids.includes(x.id)); }
  u.addr = { ...a };
  SW.notifyOwner(d, co.stall, `🛒 New order ${id} from ${a.name}: ${lines.map(l => `${l.p.name} ×${l.qty}`).join(', ')} — ${peso(c.total)} (${pay}${LINK[pay] ? ', account linked' : ''}). Please prepare it for shipping.`); SW.notifyCust(d, me, `Thanks for your order! Order ${id} has been placed (${peso(c.total)}).`, id);
  SW.audit(d, co.stall, a.name.trim(), 'Online order', `${id} • ${lines.map(l => `${l.p.name} ×${l.qty}`).join(', ')} • ${peso(c.total)} • ${pay}${LINK[pay] ? ' (' + user(d).linked[pay].masked + ')' : ''} • ${a.line.trim()}, ${a.city.trim()}`); SW.save(d); co = null; nav();
  const o = modal(`<div style="text-align:center"><div style="font-size:50px">✅</div><h2>Thanks for your order!</h2><p class="hint" style="margin:8px 0 4px">You'll receive updates in the notifications inbox.</p><p><b>${id}</b></p></div><div class="mf" style="justify-content:center"><button class="gr" onclick="closeModals();location.hash='#/s/${s.n}'">Continue shopping</button><button onclick="closeModals();location.hash='#/order/${id}'">View order</button></div>`); o.dataset.lock = 1;
}

/* ---------- orders ---------- */
function vOrders() {
  const d = SW.load(), all = d.orders.filter(o => o.custEmail === me), l = all.filter(o => ordTab === 'All' || o.status === ordTab);
  $('#view').innerHTML = `<div class="wrap"><div class="panel"><h2>📦 My orders</h2><div class="tabs">${['All', 'To Ship', 'Shipped', 'Delivered', 'Cancelled'].map(t => `<button class="${ordTab === t ? 'on' : ''}" onclick="ordTab='${t}';vOrders()">${t}</button>`).join('')}</div></div>
  ${l.map(o => `<div class="panel"><div class="li" style="border:0;padding:0"><b>Stall #${o.stall} — ${esc(d.stalls[o.stall - 1].name)}</b><span class="badge b-${bClass(o.status)}" style="background:#eee">${o.status}</span></div>${o.items.map(i => `<div class="li"><span>${esc(i.name)} <span class="hint">${[i.color, i.size].filter(Boolean).join(' • ')}</span> ×${i.qty}</span><span>${peso(i.unit * i.qty)}</span></div>`).join('')}<div class="li"><span class="hint">${o.id} • ${SW.fmt(o.createdAt)}</span><span><b>${peso(o.total)}</b> <button class="sm" onclick="location.hash='#/order/${o.id}'">View order</button></span></div></div>`).join('') || '<div class="panel empty">No orders yet.</div>'}</div>`;
}
const canChange = o => (o.status === 'To Ship' || o.status === 'Shipped') && Date.now() - o.createdAt <= 2 * 864e5;
function vOrder(id) {
  const d = SW.load(), o = d.orders.find(x => x.id === id && x.custEmail === me); if (!o) return location.hash = '#/orders';
  const steps = ['Order placed', 'To Ship', 'Shipped', 'Delivered'], at = o.status === 'Cancelled' ? -1 : steps.indexOf(o.status === 'To Ship' ? 'To Ship' : o.status);
  $('#view').innerHTML = `<div class="wrap"><div class="panel"><div class="li" style="border:0;padding:0"><h2>Order ${o.id}</h2><button class="sm gr" onclick="location.hash='#/orders'">← Back</button></div><p class="hint">Placed ${SW.fmt(o.createdAt)} • Stall #${o.stall} ${esc(d.stalls[o.stall - 1].name)}</p>
  ${o.status === 'Cancelled' ? `<div class="panel" style="background:#fde0e2;margin-top:12px">❌ Order cancelled. Reason: ${esc(o.reason)}</div>` : `<div class="stp">${steps.map((s, i) => `<div class="${i <= at ? 'on' : ''}">${s}</div>`).join('')}</div>`}</div>
  <div class="panel"><h3>Products</h3>${o.items.map(i => `<div class="li"><span><b>${esc(i.name)}</b> <span class="hint">${[i.color, i.size].filter(Boolean).join(' • ')}</span> ×${i.qty}</span><span>${peso(i.unit * i.qty)}</span></div>`).join('')}
  <div class="sum" style="margin-top:10px">${[['Original price', peso(o.orig)], ['Product discount', '−' + peso(o.prodDisc)], ['Seller voucher', '−' + peso(o.voucher)], ['Shipping fee', peso(o.ship)], ['Shipping discount', '−' + peso(o.shipDisc)]].map(r => `<div class="r"><span>${r[0]}</span><span>${r[1]}</span></div>`).join('')}<div class="r t"><span>Total</span><span>${peso(o.total)}</span></div><div class="r"><span>Payment</span><span>${o.pay}</span></div></div></div>
  <div class="panel"><h3>📍 Delivery address</h3><p>${esc(o.addr.name)} • ${esc(o.addr.phone)}<br>${esc(o.addr.line)}, ${esc(o.addr.city)}</p>
  <div class="mf" style="justify-content:flex-start"><button class="sec" ${canChange(o) ? '' : 'disabled'} onclick="chAddr('${o.id}')">Change address</button><button class="gr" ${o.status === 'To Ship' ? '' : 'disabled'} onclick="cancel1('${o.id}')">Cancel order</button></div>
  <p class="hint" style="margin-top:6px">You can change the address within 2 days of ordering. Orders can only be cancelled while they are "To Ship".</p></div></div>`;
}
function chAddr(id) {
  const d = SW.load(), o = d.orders.find(x => x.id === id);
  modal(`<h2>Change address</h2><label>Full name</label><input id="n1" value="${esc(o.addr.name)}"><label>Phone</label><input id="n2" value="${esc(o.addr.phone)}"><label>Street / Barangay</label><input id="n3" value="${esc(o.addr.line)}"><label>City / Province</label><input id="n4" value="${esc(o.addr.city)}"><div class="err" id="nerr"></div><div class="mf"><button class="gr" onclick="closeModals()">Cancel</button><button onclick="saveAddr('${id}')">Save address</button></div>`);
}
function saveAddr(id) {
  const d = SW.load(), o = d.orders.find(x => x.id === id), a = { name: $('#n1').value.trim(), phone: $('#n2').value.trim(), line: $('#n3').value.trim(), city: $('#n4').value.trim() };
  if (!a.name || !a.line || !a.city || !/^09\d{9}$/.test(a.phone)) return $('#nerr').textContent = 'Please complete the details (phone: 09xxxxxxxxx).';
  if (!canChange(o)) return $('#nerr').textContent = 'More than 2 days have passed or the order was already shipped.';
  o.addr = a; o.addrChangedAt = Date.now(); SW.notifyOwner(d, o.stall, `📍 Customer changed delivery address for ${o.id}.`); SW.notifyCust(d, me, `Address updated for order ${o.id}.`, o.id); SW.save(d); closeModals(); toast('Address updated', 'ok'); vOrder(id);
}
function cancel1(id) { modal(`<h2>Cancel this order?</h2><p class="hint" style="margin:8px 0">Once cancelled, this cannot be undone.</p><div class="mf"><button onclick="closeModals()">Keep order</button><button class="gr" onclick="closeModals();cancel2('${id}')">Cancel anyway</button></div>`); }
function cancel2(id) { modal(`<h2>Why are you cancelling?</h2>${REASONS.map(r => `<label class="pm"><input type="radio" name="rs" value="${r}" onchange="$('#cbtn').disabled=false">${r}</label>`).join('')}<div class="mf"><button class="gr" onclick="closeModals()">Back</button><button id="cbtn" disabled onclick="doCancel('${id}')">Cancel order</button></div>`); }
function doCancel(id) {
  const reason = document.querySelector('input[name=rs]:checked').value, d = SW.load(), o = d.orders.find(x => x.id === id);
  if (o.status !== 'To Ship') { closeModals(); return toast('This order can no longer be cancelled', 'er'); }
  o.status = 'Cancelled'; o.reason = reason;
  o.items.forEach(i => { const p = d.products.find(x => x.id === i.pid); if (p) { const b = p.qty; p.qty += i.qty; SW.audit(d, o.stall, 'System', 'Stock restored', `${p.name}: ${b} → ${p.qty} (order ${o.id} cancelled)`); } });   // restore the stock
  SW.notifyOwner(d, o.stall, `❌ Order ${o.id} was cancelled by the customer. Reason: ${reason}`); SW.notifyCust(d, me, `Order ${o.id} was cancelled.`, o.id); SW.audit(d, o.stall, o.custName, 'Order cancelled', `${o.id} — ${reason}`); SW.save(d); closeModals(); nav();
  const m = modal(`<div style="text-align:center"><div style="font-size:50px">🛑</div><h2>Order cancelled</h2><p class="hint">Order ${o.id} has been cancelled.</p></div><div class="mf" style="justify-content:center"><button onclick="closeModals();vOrder('${o.id}')">OK</button></div>`); m.dataset.lock = 1;
}

/* ---------- inbox / account ---------- */
function vInbox() {
  const d = SW.load(), l = d.cnotifs.filter(n => n.email === me);
  $('#view').innerHTML = `<div class="wrap"><div class="panel"><h2>🔔 Notifications inbox</h2>${l.map(n => `<div class="li ${n.read ? '' : 'un'}"><span>${esc(n.msg)}</span><span class="hint">${SW.fmt(n.ts)} ${n.orderId ? `<a onclick="location.hash='#/order/${n.orderId}'">View</a>` : ''}</span></div>`).join('') || '<div class="empty">No notifications.</div>'}</div></div>`;
  l.forEach(n => n.read = true); SW.save(d); nav();
}
let pPic, pAv;
function vAccount() {
  const d = SW.load(), u = user(d); pPic = undefined; pAv = undefined;
  $('#view').innerHTML = `<div class="wrap" style="max-width:700px"><div class="panel"><h2>👤 My account</h2>
  <div class="pf-head"><div id="pfav">${SW.avatar(u, 96)}</div><div><div class="hint" style="margin:0 0 6px">Profile picture</div><div class="pf-actions"><label style="margin:0"><span class="btn-like">📷 Upload photo</span><input type="file" id="pfile" accept="image/*" hidden onchange="pickPic(this)"></label><button class="gr sm" onclick="pickAv('', true)">Remove photo</button></div></div></div>
  <label>Or choose an avatar</label><div class="av-pick" id="avp">${SW.AVATARS.map(a => `<button type="button" class="${!u.pic && u.avatar === a ? 'on' : ''}" onclick="pickAv('${a}')">${a}</button>`).join('')}</div>
  <label>Name</label><input id="u1" value="${esc(u.name)}"><label>Email</label><input value="${esc(u.email)}" disabled><label>Phone</label><input id="u2" value="${esc(u.phone)}"><div class="mf"><button onclick="saveAcc()">Save</button></div></div>
  <div class="panel"><h3>Change password</h3><label>Current</label><input id="p1" type="password"><label>New</label><input id="p2" type="password"><div class="mf"><button onclick="chPw()">Update password</button></div></div></div>`;
}
function prevPic() {
  const u = { ...user(SW.load()) }; if (pPic !== undefined) u.pic = pPic; if (pAv !== undefined) u.avatar = pAv;
  $('#pfav').innerHTML = SW.avatar(u, 96);
  document.querySelectorAll('#avp button').forEach(b => b.classList.toggle('on', !u.pic && b.textContent === u.avatar));
}
function pickPic(inp) { const f = inp.files[0]; if (!f) return; SW.readPhoto(f, url => { pPic = url; pAv = ''; prevPic(); }); }
function pickAv(a, removePhoto) { pAv = removePhoto ? '' : a; pPic = ''; prevPic(); }
function saveAcc() {
  const d = SW.load(), u = user(d); if (!$('#u1').value.trim() || !/^09\d{9}$/.test($('#u2').value.trim())) return toast('Check your name and phone', 'er');
  u.name = $('#u1').value.trim(); u.phone = $('#u2').value.trim();
  if (pPic !== undefined) u.pic = pPic || null; if (pAv !== undefined) u.avatar = pAv || null;
  SW.save(d); toast('Saved', 'ok'); nav(); vAccount();
}
function chPw() { const d = SW.load(), u = user(d); if (u.pass !== SW.hash($('#p1').value)) return toast('Current password is incorrect', 'er'); if (!pwOk($('#p2').value)) return toast('Password: 8+ characters, letters and numbers', 'er'); u.pass = SW.hash($('#p2').value); SW.save(d); toast('Password changed', 'ok'); vAccount(); }

/* ---------- boot ---------- */
SW.load();
me = sessionStorage.getItem('sw_cust');
if (!location.hash) location.hash = me ? '#/pick' : '#/auth';
route();
window.addEventListener('storage', e => { if (e.key === 'skyworld_db_v1' && me && !document.querySelector('.overlay') && /^#\/s\//.test(location.hash)) stallList(+location.hash.split('/')[2]); });
