// Tamper-evident settlement ledger: each entry is SHA-256 hash-linked to the
// previous one. No token, no crypto-currency — money settles over UPI.
const enc = new TextEncoder()

async function sha256(text) {
  const buf = await crypto.subtle.digest('SHA-256', enc.encode(text))
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

const payload = (e) => JSON.stringify([e.index, e.ts, e.from, e.to, e.kwh, e.price, e.prevHash])

export async function appendEntry(ledger, tx) {
  const prev = ledger[ledger.length - 1]
  const entry = {
    index: ledger.length,
    ts: tx.ts,
    from: tx.from,
    to: tx.to,
    kwh: tx.kwh,
    price: tx.price,
    prevHash: prev ? prev.hash : '0'.repeat(64),
  }
  entry.hash = await sha256(payload(entry))
  return [...ledger, entry]
}

// Returns the index of the first broken entry, or -1 if the chain is intact.
export async function verifyChain(ledger) {
  for (let i = 0; i < ledger.length; i++) {
    const e = ledger[i]
    const expectedPrev = i === 0 ? '0'.repeat(64) : ledger[i - 1].hash
    if (e.prevHash !== expectedPrev) return i
    if ((await sha256(payload(e))) !== e.hash) return i
  }
  return -1
}
