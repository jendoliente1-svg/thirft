/* SkyWorld shared data layer (prototype)
   - Shared by the owner portal and the customer store so inventory/orders stay in sync.
   - Uses localStorage as the "database". */
const SW = (() => {
  const KEY = 'skyworld_db_v1';
  const CATS = { Bags: '👜', Clothes: '👕', Jackets: '🧥', Shoes: '👟', Accessories: '⌚', Random: '🎁' };
  const CAT_COLOR = { Bags: ['#4169E1', '#2c4fb8'], Clothes: ['#6f9be8', '#3f62d0'], Jackets: ['#5a7bd8', '#27449e'], Shoes: ['#7fb2e5', '#4169E1'], Accessories: ['#8fc3de', '#3d62c6'], Random: ['#5f8bdc', '#34509f'] };
  const COLOR_HEX = { Black: '#222', White: '#f5f5f5', Navy: '#1f3a6e', Red: '#d32f2f', Beige: '#d9c3a0', Gray: '#8e8e8e', Pink: '#f48fb1', Brown: '#6d4c41', Green: '#388e3c', Blue: '#1976d2', Yellow: '#fbc02d', Silver: '#c0c0c0', Gold: '#d4af37', Khaki: '#a1887f', Maroon: '#7b1f2b', Purple: '#7b1fa2' };
  const POOL = ['Black', 'White', 'Navy', 'Red', 'Beige', 'Gray', 'Pink', 'Brown', 'Green'];
  const LET = ['S', 'M', 'L', 'XL'], SHO = ['38', '39', '40', '41', '42', '43'];

  // [name, base price, emoji, variant type (c=colors, cs=colors+size, sh=colors+shoe size, n=none), description]
  const T = {
    Bags: [
      ['Mini Sling Bag', 299, '👜', 'c', 'Compact sling bag with adjustable strap, fits phone, wallet and keys.'],
      ['Canvas Tote Bag', 249, '👜', 'c', 'Durable canvas tote with inner pocket, good for school or groceries.'],
      ['Leather Handbag', 899, '👜', 'c', 'PU leather handbag with zipper closure and detachable strap.'],
      ['Laptop Backpack 15"', 799, '🎒', 'c', 'Water-resistant backpack with padded laptop compartment.'],
      ['Crossbody Bag', 499, '👜', 'c', 'Everyday crossbody bag with two compartments.'],
      ['Waist Belt Bag', 259, '👝', 'c', 'Lightweight waist bag for travel and errands.'],
      ['Drawstring Gym Bag', 199, '🎒', 'c', 'Foldable drawstring bag for gym and sports.'],
      ['Korean Shoulder Bag', 549, '👜', 'c', 'Trendy shoulder bag with soft strap and magnetic clasp.'],
      ['Travel Duffel Bag', 950, '🧳', 'c', 'Large duffel bag with shoe compartment for overnight trips.'],
      ['Mini Backpack', 450, '🎒', 'c', 'Small backpack for daily essentials.'],
      ['Clutch Pouch', 220, '👛', 'c', 'Slim clutch pouch for events and nights out.'],
      ['Messenger Bag', 650, '💼', 'c', 'Classic messenger bag with flap cover and multiple pockets.']
    ],
    Clothes: [
      ['Plain Cotton T-Shirt', 199, '👕', 'cs', '100% cotton round-neck tee, soft and breathable.'],
      ['Oversized Graphic Tee', 299, '👕', 'cs', 'Loose-fit tee with printed graphic design.'],
      ['Polo Shirt', 349, '👕', 'cs', 'Piqué polo shirt with collar, good for casual or office.'],
      ['Denim Jeans', 599, '👖', 'cs', 'Straight-cut stretch denim jeans.'],
      ['Cargo Pants', 549, '👖', 'cs', 'Six-pocket cargo pants with adjustable hem.'],
      ['Jogger Pants', 399, '👖', 'cs', 'Comfortable jogger pants with elastic waistband.'],
      ['Floral Dress', 499, '👗', 'cs', 'Lightweight floral dress, knee length.'],
      ['Maong Shorts', 349, '🩳', 'cs', 'Casual denim shorts with frayed hem.'],
      ['Tank Top (Sando)', 149, '🎽', 'cs', 'Ribbed cotton tank top for hot weather.'],
      ['Puff Sleeve Blouse', 329, '👚', 'cs', 'Feminine blouse with puff sleeves and button front.'],
      ['Pajama Set', 450, '🩱', 'cs', 'Two-piece soft pajama set for sleeping.'],
      ['A-Line Skirt', 299, '👗', 'cs', 'High-waist A-line skirt, midi length.']
    ],
    Jackets: [
      ['Bomber Jacket', 899, '🧥', 'cs', 'Classic bomber with ribbed cuffs and zip front.'],
      ['Denim Jacket', 999, '🧥', 'cs', 'Button-up denim jacket with chest pockets.'],
      ['Windbreaker', 699, '🧥', 'cs', 'Lightweight windproof jacket for biking and running.'],
      ['Hooded Zip Jacket', 750, '🧥', 'cs', 'Fleece-lined hoodie with full zipper.'],
      ['Varsity Jacket', 1100, '🧥', 'cs', 'Letterman-style jacket with striped trim.'],
      ['Leather Biker Jacket', 1500, '🧥', 'cs', 'Faux leather biker jacket with asymmetric zipper.'],
      ['Knit Cardigan', 450, '🧶', 'cs', 'Soft knit cardigan for cool mornings.'],
      ['Fleece Jacket', 850, '🧥', 'cs', 'Warm fleece jacket with two zip pockets.'],
      ['Puffer Jacket', 1450, '🧥', 'cs', 'Insulated puffer jacket for cold weather.'],
      ['Rain Jacket', 399, '🌧️', 'cs', 'Waterproof rain jacket with hood.'],
      ['Casual Blazer', 1200, '🧥', 'cs', 'Slim-fit blazer for work and events.'],
      ['Coach Jacket', 799, '🧥', 'cs', 'Snap-button coach jacket, water repellent.']
    ],
    Shoes: [
      ['Canvas Sneakers', 799, '👟', 'sh', 'Low-cut canvas sneakers with rubber sole.'],
      ['Running Shoes', 1499, '👟', 'sh', 'Cushioned running shoes with breathable mesh.'],
      ['Rubber Slides', 249, '🩴', 'sh', 'Soft EVA slides, easy to wear and wash.'],
      ['Leather Loafers', 1100, '👞', 'sh', 'Slip-on loafers for formal and office wear.'],
      ['Basketball Shoes', 2200, '🏀', 'sh', 'High-top shoes with ankle support and grippy outsole.'],
      ['Strappy Sandals', 399, '👡', 'sh', 'Comfortable sandals with adjustable straps.'],
      ['Ballet Flats', 450, '🥿', 'sh', 'Slip-on flats with cushioned insole.'],
      ['Chelsea Boots', 1600, '🥾', 'sh', 'Ankle boots with elastic side panels.'],
      ['Platform Sneakers', 999, '👟', 'sh', 'Chunky platform sneakers, lace-up.'],
      ['Hiking Shoes', 1800, '🥾', 'sh', 'Trail shoes with anti-slip sole.'],
      ['Black School Shoes', 699, '👞', 'sh', 'Durable black school shoes with Velcro strap.'],
      ['Flip-Flops', 149, '🩴', 'sh', 'Everyday rubber flip-flops.']
    ],
    Accessories: [
      ['Stainless Steel Watch', 799, '⌚', 'c', 'Men\'s analog watch with stainless steel strap.'],
      ['Women\'s Analog Watch', 599, '⌚', 'c', 'Slim watch with mesh strap and minimalist dial.'],
      ['Silver Necklace', 350, '📿', 'n', '925-style silver chain necklace with pendant.'],
      ['Beaded Bracelet', 120, '📿', 'c', 'Handmade beaded bracelet, adjustable.'],
      ['Stud Earrings Set', 99, '💎', 'n', 'Set of 6 pairs of hypoallergenic stud earrings.'],
      ['Aviator Sunglasses', 299, '🕶️', 'c', 'UV400 aviator sunglasses with metal frame.'],
      ['Leather Belt', 249, '🪢', 'c', 'Genuine-look leather belt with pin buckle.'],
      ['Baseball Cap', 199, '🧢', 'c', 'Adjustable cotton cap with embroidered logo.'],
      ['Silk Scarf', 199, '🧣', 'c', 'Lightweight satin scarf for hair or neck.'],
      ['Hair Clip Set', 79, '🎀', 'n', 'Pack of 12 assorted hair clips.'],
      ['Ring Set', 149, '💍', 'n', 'Set of 8 stackable rings.'],
      ['Bifold Wallet', 349, '👛', 'c', 'Slim bifold wallet with card slots and coin pocket.']
    ],
    Random: [
      ['Wireless Earbuds', 599, '🎧', 'c', 'Bluetooth 5.3 earbuds with charging case.'],
      ['Phone Case', 149, '📱', 'c', 'Shockproof phone case with soft inner lining.'],
      ['Power Bank 10000mAh', 699, '🔋', 'c', 'Dual USB power bank with LED indicator.'],
      ['Foldable Umbrella', 249, '☂️', 'c', 'Compact auto-open umbrella, windproof.'],
      ['Water Tumbler 500ml', 399, '🥤', 'c', 'Insulated stainless tumbler, keeps drinks cold for 12 hours.'],
      ['Scented Candle', 199, '🕯️', 'n', 'Soy wax candle, lavender scent, 40-hour burn.'],
      ['LED Desk Lamp', 449, '💡', 'n', 'Rechargeable LED desk lamp with 3 brightness levels.'],
      ['Keychain Charm', 59, '🔑', 'n', 'Cute assorted keychain charm.'],
      ['Bluetooth Speaker', 799, '🔊', 'c', 'Portable waterproof Bluetooth speaker.'],
      ['Phone Tripod', 349, '📷', 'n', 'Flexible tripod with Bluetooth remote.'],
      ['Sticker Pack', 79, '🏷️', 'n', 'Pack of 50 waterproof vinyl stickers.'],
      ['Planner Notebook', 159, '📓', 'n', 'A5 undated planner with hard cover.']
    ]
  };

  const ADJ = ['Sunny', 'Lucky', 'Golden', 'Happy', 'Blue', 'Prime', 'Metro', 'Star', 'Bright', 'Cozy', 'Royal', 'Mango', 'Pinoy', 'Urban'];
  const NOUN = { Bags: ['Bag Haven', 'Bag Boutique', 'Bag Corner'], Clothes: ['Threads', 'Fashion Hub', 'Closet'], Jackets: ['Jacket Co.', 'Outerwear', 'Layers'], Shoes: ['Shoe Mart', 'Sole Store', 'Kicks'], Accessories: ['Accessories', 'Trinkets', 'Jewels'], Random: ['Finds', 'Gadgets & More', 'Variety Shop'] };
  const FIRST = ['Maria', 'Juan', 'Ana', 'Jose', 'Liza', 'Mark', 'Grace', 'Paolo', 'Carla', 'Ramon', 'Jenny', 'Rico', 'Nina', 'Carlo', 'Ella', 'Dennis', 'Joy', 'Miguel', 'Tess', 'Allan'];
  const LAST = ['Santos', 'Reyes', 'Cruz', 'Bautista', 'Garcia', 'Mendoza', 'Torres', 'Ramos', 'Flores', 'Villanueva', 'Castillo', 'Aquino', 'Navarro', 'Domingo', 'Salazar'];
  const CITIES = ['Baguio City', 'La Trinidad, Benguet', 'Quezon City', 'Manila', 'Cebu City', 'Davao City', 'Pasig City'];

  function rng(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  const hash = s => { let h = 5381; for (const c of String(s)) h = ((h << 5) + h + c.charCodeAt(0)) | 0; return 'h' + h; };
  const uid = () => Math.random().toString(36).slice(2, 9);
  const peso = n => '₱' + Number(n).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmt = ts => new Date(ts).toLocaleString('en-PH', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  const fmtD = ts => new Date(ts).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' });

  function seed() {
    const r = rng(2026);
    const pick = a => a[Math.floor(r() * a.length)];
    const cats = Object.keys(CATS);
    const d = { v: 1, stalls: [], products: [], orders: [], customers: {}, notifs: [], cnotifs: [], audit: [], seq: 1 };
    const kIdx = {};
    const now = Date.now();
    for (let n = 1; n <= 105; n++) {
      const cat = cats[(n - 1) % 6];
      const k = kIdx[cat] = (kIdx[cat] ?? -1) + 1;
      const name = `${ADJ[k % ADJ.length]} ${NOUN[cat][Math.floor(k / ADJ.length) % 3]}`;
      const fn = pick(FIRST), ln = pick(LAST);
      const claimed = n <= 100;
      d.stalls.push({
        n, cat, name, open: true,
        address: `Skyworld Mall, Stall ${n}, Baguio City`,
        owner: claimed ? { name: `${fn} ${ln}`, email: `stall${n}@skyworld.ph`, phone: '09' + String(Math.floor(r() * 1e9)).padStart(9, '0'), pass: hash('Owner@123'), created: now - 86400000 * 400 } : null
      });
      // 9 products per stall
      const tpl = [...T[cat]].sort(() => r() - 0.5).slice(0, 9);
      tpl.forEach(([pn, base, emoji, vt, desc]) => {
        const price = Math.max(29, Math.round(base * (0.9 + r() * 0.25) / 5) * 5 - (base < 100 ? 1 : 0));
        const x = r();
        const qty = x < 0.1 ? 0 : x < 0.3 ? 1 + Math.floor(r() * 10) : 11 + Math.floor(r() * 70);
        const colors = vt === 'n' ? [] : [...POOL].sort(() => r() - 0.5).slice(0, 2 + Math.floor(r() * 2));
        const sizes = vt === 'cs' ? LET : vt === 'sh' ? SHO : [];
        d.products.push({ id: `P${n}-${uid()}`, stall: n, name: pn, cat, emoji, price, discount: r() < 0.3 ? pick([10, 15, 20]) : 0, qty, desc, colors, sizes, img: null, archived: false, created: now - Math.floor(r() * 300) * 86400000 });
      });
      // seeded sales history (past year)
      const prods = d.products.filter(p => p.stall === n);
      for (let i = 0; i < 22; i++) {
        const x = r(); const days = x < 0.25 ? r() * 7 : x < 0.5 ? r() * 30 : r() * 365;
        const ts = now - days * 86400000;
        const items = [...prods].sort(() => r() - 0.5).slice(0, 1 + Math.floor(r() * 3)).map(p => {
          const unit = Math.round(p.price * (1 - p.discount / 100));
          return { pid: p.id, name: p.name, qty: 1 + Math.floor(r() * 3), unit, orig: p.price, color: p.colors[0] || '', size: p.sizes[1] || '' };
        });
        const sub = items.reduce((s, i) => s + i.unit * i.qty, 0);
        const ship = 49;
        const status = days < 1.5 ? 'To Ship' : days < 4 ? 'Shipped' : r() < 0.08 ? 'Cancelled' : 'Delivered';
        const cn = `${pick(FIRST)} ${pick(LAST)}`;
        d.orders.push({
          id: `SW${String(n).padStart(3, '0')}-${d.seq++}`, stall: n, custEmail: '', custName: cn, items,
          addr: { name: cn, phone: '09171234567', line: `${Math.floor(r() * 300)} Session Rd`, city: pick(CITIES) },
          pay: pick(['Cash on Delivery', 'GCash', 'Maya', 'Credit/Debit Card']), orig: items.reduce((s, i) => s + i.orig * i.qty, 0), prodDisc: items.reduce((s, i) => s + (i.orig - i.unit) * i.qty, 0), voucher: 0, ship, shipDisc: 0, total: sub + ship,
          status, reason: status === 'Cancelled' ? 'Changed my mind' : '', createdAt: ts, addrChangedAt: 0
        });
      }
      d.audit.push({ id: uid(), stall: n, user: 'System', action: 'Stall created', detail: `Stall ${n} (${cat}) added to Skyworld`, ts: now - 86400000 * 400 });
    }
    d.orders.sort((a, b) => b.createdAt - a.createdAt);
    return d;
  }

  let D = null;
  function load() {
    try { D = JSON.parse(localStorage.getItem(KEY)); } catch (e) { D = null; }
    if (!D || D.v !== 1) { D = seed(); save(D); }
    return D;
  }
  function save(d) { D = d || D; try { localStorage.setItem(KEY, JSON.stringify(D)); } catch (e) { alert('Storage is full: reset the demo data or use a smaller picture.'); } }
  function reset() { localStorage.removeItem(KEY); Object.keys(localStorage).filter(k => k.startsWith('sw_att_')).forEach(k => localStorage.removeItem(k)); return load(); }

  const finalPrice = p => Math.round(p.price * (1 - (p.discount || 0) / 100));
  // STOCK STATUS RULE: qty 0 -> Out of Stock; qty 1-10 -> Low Stock; qty 11 or more -> In Stock
  const stockStatus = p => p.qty <= 0 ? 'out' : p.qty <= 10 ? 'low' : 'in';
  const STATUS_LABEL = { in: 'In Stock', low: 'Low Stock', out: 'Out of Stock' };

  function img(p) {
    if (p.img) return p.img;
    const [c1, c2] = CAT_COLOR[p.cat] || ['#999', '#555'];
    const nm = esc(p.name.length > 22 ? p.name.slice(0, 21) + '…' : p.name);
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='400' height='400'><defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0' stop-color='${c1}'/><stop offset='1' stop-color='${c2}'/></linearGradient></defs><rect width='400' height='400' fill='url(#g)'/><text x='200' y='235' font-size='150' text-anchor='middle'>${p.emoji || CATS[p.cat]}</text><text x='200' y='350' font-size='24' text-anchor='middle' fill='white' font-family='sans-serif'>${nm}</text></svg>`;
    return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
  }

  const audit = (d, stall, user, action, detail) => d.audit.unshift({ id: uid(), stall, user, action, detail, ts: Date.now() });
  const notifyOwner = (d, stall, msg) => d.notifs.unshift({ id: uid(), stall, msg, ts: Date.now(), read: false });
  const notifyCust = (d, email, msg, orderId) => d.cnotifs.unshift({ id: uid(), email, msg, orderId, ts: Date.now(), read: false });

  // Login attempts guard: 5 wrong tries -> 30s lock
  const guard = {
    max: 5, lockMs: 30000,
    get(k) { try { return JSON.parse(localStorage.getItem('sw_att_' + k)) || { n: 0, until: 0 }; } catch (e) { return { n: 0, until: 0 }; } },
    locked(k) { const s = this.get(k); return s.until > Date.now() ? Math.ceil((s.until - Date.now()) / 1000) : 0; },
    fail(k) { const s = this.get(k); s.n++; let left = this.max - s.n; if (s.n >= this.max) { s.until = Date.now() + this.lockMs; s.n = 0; left = 0; } localStorage.setItem('sw_att_' + k, JSON.stringify(s)); return left; },
    clear(k) { localStorage.removeItem('sw_att_' + k); }
  };

  // Captcha: random jumbled letters and numbers the user types in
  const captcha = {
    render(el) {
      const ch = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; let c = '';
      for (let i = 0; i < 5; i++) c += ch[Math.floor(Math.random() * ch.length)];
      el.dataset.code = c;
      el.innerHTML = '<div class="cap-row"><div class="cap-code">' + [...c].map(x => `<span style="transform:rotate(${Math.floor(Math.random() * 40 - 20)}deg) translateY(${Math.floor(Math.random() * 10 - 5)}px);font-size:${20 + Math.floor(Math.random() * 8)}px">${x}</span>`).join('') + '</div><button type="button" class="cap-r" title="New code" aria-label="New code">⟳</button></div><input class="cap-in" placeholder="Type the code above" autocomplete="off" autocapitalize="characters" maxlength="5">';
      el.querySelector('.cap-r').onclick = () => captcha.render(el);
    },
    ok(el) { const v = el.querySelector('.cap-in'); return !!v && v.value.trim().toUpperCase() === el.dataset.code; }
  };

  // Profile pictures (shared by owner portal and customer store)
  const AVATARS = ['😀', '😎', '🦊', '🐼', '🐱', '🐶'];
  const avatar = (u, size = 70) => {
    const st = `width:${size}px;height:${size}px;font-size:${Math.round(size * .45)}px`;
    if (u.pic) return `<span class="avatar" style="${st}"><img src="${u.pic}" alt="Profile picture"></span>`;
    if (u.avatar) return `<span class="avatar" style="${st};font-size:${Math.round(size * .55)}px">${u.avatar}</span>`;
    return `<span class="avatar" style="${st}">${esc((u.name || '?')[0].toUpperCase())}</span>`;
  };
  function readPhoto(file, cb, max = 200) {
    const r = new FileReader();
    r.onload = () => { const im = new Image(); im.onload = () => { const k = Math.min(1, max / Math.min(im.width, im.height)), w = im.width * k, h = im.height * k, c = document.createElement('canvas'); c.width = c.height = Math.min(max, Math.min(w, h)); c.getContext('2d').drawImage(im, (c.width - w) / 2, (c.height - h) / 2, w, h); cb(c.toDataURL('image/jpeg', .8)); }; im.src = r.result; };
    r.readAsDataURL(file);
  }

  return { CATS, CAT_COLOR, COLOR_HEX, STATUS_LABEL, load, save, reset, hash, uid, peso, esc, fmt, fmtD, finalPrice, stockStatus, img, audit, notifyOwner, notifyCust, guard, captcha, AVATARS, avatar, readPhoto };
})();
