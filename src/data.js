// Illustrative colony in Rohini, Delhi. Tariffs are indicative, not official.
export const TARIFF = {
  feedIn: 3.5, // what a DISCOM typically pays for net-metered export (₹/kWh)
  retail: 8.0, // upper-slab retail tariff (₹/kWh)
  wheeling: 0.5, // grid-usage fee retained by the DISCOM (₹/kWh)
}

export const GRID_EF = 0.71 // kg CO₂ per kWh, CEA grid emission factor (approx.)
export const REC_BLOCK_KWH = 1000 // 1 REC = 1 MWh

export const HOMES = [
  { id: 'sharma', name: 'Sharma House', vpa: 'sharma@urja', transformer: 'DT-14', solarKw: 5, surplusKwh: 6.4, netMetered: true, kycVerified: true },
  { id: 'gupta', name: 'Gupta House', vpa: 'gupta@urja', transformer: 'DT-14', solarKw: 0, surplusKwh: 0, netMetered: false, kycVerified: true },
  { id: 'khan', name: 'Khan House', vpa: 'khan@urja', transformer: 'DT-14', solarKw: 3, surplusKwh: 3.1, netMetered: true, kycVerified: true },
  { id: 'verma', name: 'Verma House', vpa: 'verma@urja', transformer: 'DT-14', solarKw: 2, surplusKwh: 2.2, netMetered: false, kycVerified: true },
  { id: 'iyer', name: 'Iyer House', vpa: 'iyer@urja', transformer: 'DT-22', solarKw: 4, surplusKwh: 5.2, netMetered: true, kycVerified: true },
  { id: 'singh', name: 'Singh House', vpa: 'singh@urja', transformer: 'DT-22', solarKw: 0, surplusKwh: 0, netMetered: false, kycVerified: true },
]

// Colony-wide clean kWh already pooled toward the next 1 MWh REC block.
export const POOLED_START_KWH = 997.2
