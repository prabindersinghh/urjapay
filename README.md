# ⚡ UrjaPay: UPI for Energy

**Track:** Waste & Energy · AWS Bharat Builds: Environmental Hacks 2026

Rooftop solar homes sell surplus units to neighbours on the same transformer at a fair, regulated price. Every clean kWh is pooled into carbon value. Trading rules are written as **AWS Cedar** policies, so a state regulator can change them without changing the app.

## The problem
- PM Surya Ghar is putting rooftop solar on 1 crore homes, but surplus exported under net metering earns only about ₹3–4/unit.
- The neighbour next door pays ₹7–8+/unit at retail.
- A single household's green power is too small to count in carbon markets, which trade in 1 MWh / 1 tonne blocks.

## How UrjaPay works
1. **Smart meter**: RDSS smart meters record 15-minute export and import. Only meter-verified surplus can be sold.
2. **Virtual P2P**: power flows into the shared grid, as in net metering. Trades settle financially between homes on the **same distribution transformer**, so the power stays local.
3. **DISCOM settles**: like NPCI for UPI, the DISCOM debits the buyer's bill, credits the seller and keeps a wheeling fee.
4. **Rules as code (AWS Cedar)**: every trade is authorised against Cedar policies:
   - `verified-prosumer`: only KYC'd, net-metered homes can sell
   - `same-transformer`: buyer and seller share a distribution transformer
   - `meter-verified-surplus`: a seller can't sell more than the meter verified
   - `discom-trade-cap`: per-trade cap, adjustable by the regulator
   - `regulated-price-band`: tariff floor and ceiling
   - `no-self-trade`
5. **Carbon pooling**: each kWh avoids about 0.71 kg CO₂ (CEA grid factor). The colony pools kWh into 1 MWh REC blocks, and households earn Green Points to redeem against bills, EV charging or metro cards.
6. **Tamper-evident ledger**: settlements are SHA-256 hash-chained. There's no token and no crypto; money moves over UPI.

| | Today | With UrjaPay (₹5.50 + ₹0.50 wheeling) |
|---|---|---|
| Seller | ₹3.50/kWh feed-in | ₹5.50/kWh |
| Buyer | ₹8.00/kWh retail | ₹6.00/kWh |
| DISCOM | Pays for peak power, loses power in transmission | Earns wheeling fee, less local peak load |

## Why it's practical for India
- P2P solar trading has been piloted in **Delhi (Tata Power-DDL)** and **Lucknow (UPERC)**.
- The government is building an open **Unified Energy Interface** ("UPI for energy").
- Each state's rules differ, which is why they are written as Cedar policies.
- Households earn pooled Green Points rather than raw carbon credits, which keeps the model aligned with REC and Carbon Credit Trading Scheme norms.

## AWS
- **[Cedar](https://www.cedarpolicy.com/)** (`@cedar-policy/cedar-wasm`): AWS's open-source authorisation policy language, compiled to WebAssembly and running in the browser. Every trade decision comes from `isAuthorized()`. See [`src/cedar.js`](src/cedar.js).

## Run locally
```bash
npm install
npm run dev
```

## Stack
React + Vite, Cedar WASM, Web Crypto (SHA-256). Deployed on Vercel.

## AI tools used
Claude Code (Anthropic) helped with ideation, code and documentation.

*Tariffs and emission factors are indicative values for the demo.*
