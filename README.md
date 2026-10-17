# SkyWorld Prototype

Two separate websites (HTML/CSS/JS):

- `owner/`  – Stall Owner Portal (inventory, online store orders, reports, settings, profile)
- `store/`  – Customer Online Shop (login/register → choose a category + stall 1–105 → that stall's store)
- `shared/` – shared "database" (`db.js`, localStorage) so inventory and orders stay in sync, plus `shared.css` (royal blue / powder blue / cream theme, captcha, animations)

## How to run
Don't double-click index.html. Use a local server so the sync works:

    cd skyworld
    python3 -m http.server 8000

Owner portal: http://localhost:8000/owner/   Customer store: http://localhost:8000/store/

## Accounts
- Owner: stall1@skyworld.ph … stall100@skyworld.ph, password `Owner@123`
- Customer: register in the store
- Vouchers: SKY50, STALL10, WELCOME
- Login: 5 wrong attempts = 30s lock. Forgot password: the code appears in a toast (demo email).
- Captcha: type the jumbled letters and numbers shown.
- Logo: replace `shared/logo.png` with your own image (same file name). It is used on the owner login, owner sidebar, store header and browser tab icon.

## Stock status
- Out of Stock: quantity = 0
- Low Stock: quantity 1–10
- In Stock: quantity 11 or more
Quantity goes down when an order is placed and is restored when it is cancelled.
