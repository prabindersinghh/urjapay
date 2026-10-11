// Regulation-as-code: every P2P energy trade is authorised by Cedar,
// AWS's open-source policy language, running in the browser via WASM.
import init, { isAuthorized, getCedarVersion } from '@cedar-policy/cedar-wasm/web'

let ready = null
export function loadCedar() {
  if (!ready) ready = init({ module_or_path: '/cedar_wasm_bg.wasm' }).then(() => getCedarVersion())
  return ready
}

// The state regulator (e.g. DERC) tunes these; the policies below regenerate from them.
export const DEFAULT_RULES = {
  maxTradeKwh: 10,
  priceFloor: 4.0,
  priceCeil: 7.0,
}

export function buildPolicies(r) {
  const cap = Math.round(r.maxTradeKwh * 1000)
  const floor = Math.round(r.priceFloor * 100)
  const ceil = Math.round(r.priceCeil * 100)
  return {
    'verified-prosumer': `// Only KYC-verified, net-metered prosumers may sell power
permit (principal, action == Action::"sellEnergy", resource)
when { principal.netMetered && principal.kycVerified };`,
    'same-transformer': `// Power stays local: buyer and seller must share a distribution transformer
forbid (principal, action == Action::"sellEnergy", resource)
unless { principal.transformer == resource.transformer };`,
    'meter-verified-surplus': `// Can't sell more than the smart meter has verified as surplus
forbid (principal, action == Action::"sellEnergy", resource)
when { context.energyWh > principal.surplusWh };`,
    'discom-trade-cap': `// DISCOM cap per trade: ${r.maxTradeKwh} kWh
forbid (principal, action == Action::"sellEnergy", resource)
when { context.energyWh > ${cap} };`,
    'regulated-price-band': `// Regulated tariff band: ₹${r.priceFloor.toFixed(2)} – ₹${r.priceCeil.toFixed(2)} per kWh
forbid (principal, action == Action::"sellEnergy", resource)
when { context.pricePaise < ${floor} || context.pricePaise > ${ceil} };`,
    'no-self-trade': `// No wash trades
forbid (principal, action == Action::"sellEnergy", resource)
when { principal == resource };`,
  }
}

export const POLICY_REASONS = {
  'verified-prosumer': 'Seller is not a verified net-metered prosumer',
  'same-transformer': 'Buyer is on a different distribution transformer',
  'meter-verified-surplus': 'Exceeds smart-meter verified surplus',
  'discom-trade-cap': 'Exceeds DISCOM per-trade cap',
  'regulated-price-band': 'Price outside regulated tariff band',
  'no-self-trade': 'Seller and buyer are the same home',
}

const homeEntity = (h) => ({
  uid: { type: 'Home', id: h.id },
  attrs: {
    netMetered: h.netMetered,
    kycVerified: h.kycVerified,
    transformer: h.transformer,
    surplusWh: Math.round(h.surplusKwh * 1000),
  },
  parents: [],
})

export function authorizeTrade({ seller, buyer, kwh, price, rules }) {
  const ans = isAuthorized({
    principal: { type: 'Home', id: seller.id },
    action: { type: 'Action', id: 'sellEnergy' },
    resource: { type: 'Home', id: buyer.id },
    context: { energyWh: Math.round(kwh * 1000), pricePaise: Math.round(price * 100) },
    policies: { staticPolicies: buildPolicies(rules) },
    entities: seller.id === buyer.id ? [homeEntity(seller)] : [homeEntity(seller), homeEntity(buyer)],
  })
  if (ans.type !== 'success') {
    return { allowed: false, reasons: ans.errors.map((e) => e.message), policies: [] }
  }
  const { decision, diagnostics } = ans.response
  if (decision === 'allow') return { allowed: true, reasons: [], policies: diagnostics.reason }
  // A deny with no matching forbid means the permit never matched.
  const ids = diagnostics.reason.length ? diagnostics.reason : ['verified-prosumer']
  return { allowed: false, policies: ids, reasons: ids.map((id) => POLICY_REASONS[id] ?? id) }
}
