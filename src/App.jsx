import { useEffect, useMemo, useState } from 'react'
import { loadCedar, authorizeTrade, buildPolicies, DEFAULT_RULES } from './cedar'
import { appendEntry, verifyChain } from './ledger'
import { HOMES, TARIFF, GRID_EF, REC_BLOCK_KWH, POOLED_START_KWH } from './data'
import './App.css'

const inr = (n) => '₹' + n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const short = (h) => h.slice(0, 10) + '…' + h.slice(-6)

export default function App() {
  const [cedarVersion, setCedarVersion] = useState(null)
  const [homes, setHomes] = useState(HOMES)
  const [sellerId, setSellerId] = useState('sharma')
  const [buyerId, setBuyerId] = useState('gupta')
  const [kwh, setKwh] = useState(4)
  const [price, setPrice] = useState(5.5)
  const [rules, setRules] = useState(DEFAULT_RULES)
  const [ledger, setLedger] = useState([])
  const [chain, setChain] = useState(null) // null | -1 | brokenIndex
  const [pooled, setPooled] = useState(POOLED_START_KWH)
  const [recs, setRecs] = useState(0)
  const [points, setPoints] = useState({})
  const [modal, setModal] = useState(null) // {stage, pin, result}
  const [lastDecision, setLastDecision] = useState(null)
  const [recFlash, setRecFlash] = useState(false)

  useEffect(() => {
    loadCedar().then(setCedarVersion)
    ;(async () => {
      let l = []
      l = await appendEntry(l, { ts: '2026-10-11 07:42', from: 'khan@urja', to: 'gupta@urja', kwh: 2.5, price: 5.25 })
      l = await appendEntry(l, { ts: '2026-10-11 09:15', from: 'iyer@urja', to: 'singh@urja', kwh: 3.0, price: 5.5 })
      setLedger(l)
    })()
  }, [])

  const seller = homes.find((h) => h.id === sellerId)
  const buyer = homes.find((h) => h.id === buyerId)
  const policies = useMemo(() => buildPolicies(rules), [rules])

  const sellerEarns = kwh * price
  const sellerOld = kwh * TARIFF.feedIn
  const buyerPays = kwh * (price + TARIFF.wheeling)
  const buyerOld = kwh * TARIFF.retail
  const co2 = kwh * GRID_EF

  function startPay() {
    setModal({ stage: 'pin', pin: '' })
  }

  async function pressPin(d) {
    const pin = (modal.pin + d).slice(0, 4)
    if (pin.length < 4) return setModal({ ...modal, pin })
    setModal({ stage: 'checking', pin })
    await new Promise((r) => setTimeout(r, 700))
    const result = authorizeTrade({ seller, buyer, kwh, price, rules })
    setLastDecision(result)
    if (!result.allowed) return setModal({ stage: 'denied', result })

    const ts = new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Kolkata' }).slice(0, 16)
    setLedger(await appendEntry(ledger, { ts, from: seller.vpa, to: buyer.vpa, kwh, price }))
    setChain(null)
    setHomes((hs) => hs.map((h) => (h.id === seller.id ? { ...h, surplusKwh: +(h.surplusKwh - kwh).toFixed(2) } : h)))
    setPoints((p) => ({ ...p, [seller.id]: (p[seller.id] ?? 0) + Math.round(co2 * 10) }))
    let next = pooled + kwh
    if (next >= REC_BLOCK_KWH) {
      next -= REC_BLOCK_KWH
      setRecs((r) => r + 1)
      setRecFlash(true)
      setTimeout(() => setRecFlash(false), 4000)
    }
    setPooled(+next.toFixed(2))
    setModal({ stage: 'success', result })
  }

  function preset(s, b, k, p = 5.5) {
    setSellerId(s)
    setBuyerId(b)
    setKwh(k)
    setPrice(p)
    setLastDecision(null)
  }

  function tamper() {
    if (ledger.length < 2) return
    setLedger(ledger.map((e, i) => (i === 1 ? { ...e, kwh: e.kwh * 10 } : e)))
    setChain(null)
  }

  const firedSet = new Set(lastDecision?.policies ?? [])

  return (
    <div className="app">
      <header className="top">
        <div className="brand">
          <div className="logo">⚡</div>
          <div>
            <h1>UrjaPay</h1>
            <p>UPI for Energy · sell your rooftop solar to your neighbour</p>
          </div>
        </div>
        <div className="badges">
          <span className="badge cedar">{cedarVersion ? `Cedar ${cedarVersion} · policies live` : 'Loading Cedar…'}</span>
          <span className="badge">Rohini, Delhi · Waste &amp; Energy</span>
        </div>
      </header>

      <section className="grid">
        {/* Colony */}
        <div className="card colony">
          <h2>Colony grid <small>tap to pick seller / buyer</small></h2>
          {['DT-14', 'DT-22'].map((dt) => (
            <div key={dt} className="dt">
              <div className="dt-label">🔌 Transformer {dt}</div>
              <div className="homes">
                {homes.filter((h) => h.transformer === dt).map((h) => (
                  <div key={h.id} className={'home' + (h.id === sellerId ? ' sel-seller' : '') + (h.id === buyerId ? ' sel-buyer' : '')}>
                    <div className="home-top">
                      <span className="home-icon">{h.solarKw ? '☀️' : '🏠'}</span>
                      <div>
                        <b>{h.name}</b>
                        <div className="vpa">{h.vpa}</div>
                      </div>
                    </div>
                    <div className="meta">
                      {h.solarKw ? <>{h.solarKw} kW solar · <b>{h.surplusKwh} kWh</b> surplus</> : 'No solar · buyer'}
                    </div>
                    <div className="tags">
                      {h.netMetered ? <span className="tag ok">Net-metered</span> : h.solarKw ? <span className="tag warn">Not net-metered</span> : null}
                      {points[h.id] ? <span className="tag pts">🌱 {points[h.id]} pts</span> : null}
                    </div>
                    <div className="pick">
                      <button onClick={() => setSellerId(h.id)} className={h.id === sellerId ? 'on' : ''}>Sell from</button>
                      <button onClick={() => setBuyerId(h.id)} className={h.id === buyerId ? 'on b' : ''}>Buy to</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Trade */}
        <div className="card trade">
          <h2>Send energy</h2>
          <div className="parties">
            <div className="party"><small>From</small><b>{seller.vpa}</b></div>
            <div className="arrow">→</div>
            <div className="party"><small>To</small><b>{buyer.vpa}</b></div>
          </div>

          <label>Energy <b>{kwh} kWh</b></label>
          <input type="range" min="0.5" max="15" step="0.5" value={kwh} onChange={(e) => setKwh(+e.target.value)} />
          <label>Price <b>{inr(price)}/kWh</b></label>
          <input type="range" min="2" max="9" step="0.25" value={price} onChange={(e) => setPrice(+e.target.value)} />

          <div className="compare">
            <div>
              <small>Seller earns</small>
              <b className="g">{inr(sellerEarns)}</b>
              <span>vs {inr(sellerOld)} DISCOM feed-in</span>
            </div>
            <div>
              <small>Buyer pays (incl. ₹{TARIFF.wheeling} wheeling)</small>
              <b className="g">{inr(buyerPays)}</b>
              <span>vs {inr(buyerOld)} retail tariff</span>
            </div>
            <div>
              <small>CO₂ avoided</small>
              <b>{co2.toFixed(2)} kg</b>
              <span>+{Math.round(co2 * 10)} Green Points</span>
            </div>
          </div>

          <button className="pay" onClick={startPay} disabled={!cedarVersion}>Pay with UrjaPay</button>

          <div className="presets">
            <small>Try a scenario:</small>
            <button onClick={() => preset('sharma', 'gupta', 4)}>✅ Neighbour trade</button>
            <button onClick={() => preset('sharma', 'singh', 2)}>🚫 Other transformer</button>
            <button onClick={() => preset('verma', 'gupta', 2)}>🚫 Not net-metered</button>
            <button onClick={() => preset('khan', 'gupta', 12)}>🚫 Over cap & surplus</button>
            <button onClick={() => preset('iyer', 'singh', 3, 9)}>🚫 Price gouging</button>
          </div>
        </div>

        {/* Regulator + Cedar */}
        <div className="card cedar-card">
          <h2>Regulator console <small>rules as code · AWS Cedar</small></h2>
          <div className="reg">
            <label>DISCOM per-trade cap <b>{rules.maxTradeKwh} kWh</b></label>
            <input type="range" min="1" max="20" step="1" value={rules.maxTradeKwh} onChange={(e) => setRules({ ...rules, maxTradeKwh: +e.target.value })} />
            <label>Tariff band <b>{inr(rules.priceFloor)} – {inr(rules.priceCeil)}</b></label>
            <div className="two">
              <input type="range" min="2" max="6" step="0.25" value={rules.priceFloor} onChange={(e) => setRules({ ...rules, priceFloor: +e.target.value })} />
              <input type="range" min="5" max="10" step="0.25" value={rules.priceCeil} onChange={(e) => setRules({ ...rules, priceCeil: +e.target.value })} />
            </div>
          </div>
          <div className="policies">
            {Object.entries(policies).map(([id, text]) => (
              <div key={id} className={'policy' + (firedSet.has(id) ? (lastDecision.allowed ? ' permit' : ' fired') : '')}>
                <div className="pid">{id}</div>
                <pre>{text}</pre>
              </div>
            ))}
          </div>
        </div>

        {/* Carbon */}
        <div className="card carbon">
          <h2>Colony carbon pool</h2>
          <p className="muted">Single homes are too small for carbon markets. UrjaPay pools clean kWh into 1 MWh blocks (1 REC) and shares proceeds as Green Points.</p>
          <div className="bar"><div style={{ width: `${(pooled / REC_BLOCK_KWH) * 100}%` }} /></div>
          <div className="pool-nums">
            <b>{pooled.toFixed(1)} / {REC_BLOCK_KWH} kWh</b>
            <span>RECs minted: <b>{recs}</b></span>
          </div>
          {recFlash && <div className="rec-flash">🎉 1 MWh block complete: REC #{recs} queued for IEX listing</div>}
          <div className="redeem">
            <small>Redeem Green Points for</small>
            <div><span>⚡ Bill discount</span><span>🚗 EV charging</span><span>🚇 Metro card</span></div>
          </div>
        </div>

        {/* Ledger */}
        <div className="card ledger">
          <h2>Settlement ledger <small>SHA-256 hash-chained</small></h2>
          <div className="ledger-actions">
            <button onClick={async () => setChain(await verifyChain(ledger))}>🔍 Verify chain</button>
            <button className="ghost" onClick={tamper}>😈 Tamper entry #1</button>
            {chain === -1 && <span className="ok-text">✔ Chain intact ({ledger.length} entries)</span>}
            {chain !== null && chain >= 0 && <span className="bad-text">✖ Tampering detected at entry #{chain}</span>}
          </div>
          <table>
            <thead><tr><th>#</th><th>Time</th><th>From → To</th><th>kWh</th><th>₹/kWh</th><th>Hash</th></tr></thead>
            <tbody>
              {[...ledger].reverse().map((e) => (
                <tr key={e.index} className={chain !== null && chain >= 0 && e.index >= chain ? 'broken' : ''}>
                  <td>{e.index}</td><td>{e.ts}</td><td>{e.from} → {e.to}</td><td>{e.kwh}</td><td>{e.price.toFixed(2)}</td>
                  <td className="mono">{short(e.hash)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="how">
        <h2>How it works in India</h2>
        <div className="steps">
          <div><b>1. Smart meter</b><p>RDSS smart meters record 15-minute export &amp; import. Only meter-verified surplus can be sold.</p></div>
          <div><b>2. Virtual P2P</b><p>Power flows into the shared grid as in net metering. Trades settle financially between neighbours on the same transformer.</p></div>
          <div><b>3. DISCOM settles</b><p>Like NPCI for UPI, the DISCOM debits the buyer's bill, credits the seller and keeps a wheeling fee.</p></div>
          <div><b>4. Rules as code</b><p>Each state regulator's rules are Cedar policies. Change a cap and every trade obeys it instantly.</p></div>
          <div><b>5. Carbon pooling</b><p>Clean kWh aggregate into 1 MWh REC blocks. Households earn Green Points, not raw credits.</p></div>
        </div>
        <p className="muted foot">Tariffs and emission factor are indicative for demo. Built for AWS Bharat Builds · Environmental Hacks 2026.</p>
      </section>

      {modal && (
        <div className="modal-bg" onClick={() => modal.stage !== 'pin' && modal.stage !== 'checking' && setModal(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            {modal.stage === 'pin' && (
              <>
                <small>Paying {buyer.vpa} ← {seller.vpa}</small>
                <h3>{kwh} kWh · {inr(buyerPays)}</h3>
                <p>Enter UrjaPay PIN</p>
                <div className="dots">{[0, 1, 2, 3].map((i) => <span key={i} className={i < modal.pin.length ? 'f' : ''} />)}</div>
                <div className="keypad">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, '', 0, ''].map((d, i) => (
                    d === '' ? <span key={i} /> : <button key={i} onClick={() => pressPin(String(d))}>{d}</button>
                  ))}
                </div>
              </>
            )}
            {modal.stage === 'checking' && (
              <div className="checking"><div className="spinner" /><p>Authorising with Cedar policies…</p></div>
            )}
            {modal.stage === 'success' && (
              <div className="result ok">
                <div className="big">✓</div>
                <h3>{kwh} kWh sent</h3>
                <p>{seller.vpa} → {buyer.vpa}</p>
                <p className="muted">Cedar: ALLOW · permitted by <code>verified-prosumer</code></p>
                <p>🌱 +{Math.round(co2 * 10)} Green Points · {co2.toFixed(2)} kg CO₂ avoided</p>
                <button onClick={() => setModal(null)}>Done</button>
              </div>
            )}
            {modal.stage === 'denied' && (
              <div className="result bad">
                <div className="big">✕</div>
                <h3>Trade blocked</h3>
                <p className="muted">Cedar: DENY</p>
                <ul>{modal.result.reasons.map((r, i) => <li key={i}><code>{modal.result.policies[i]}</code> {r}</li>)}</ul>
                <button onClick={() => setModal(null)}>Close</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
