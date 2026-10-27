import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api } from '../api'
import Combo from '../components/Combo'
import Modal from '../components/Modal'
import Sheet from '../components/Sheet'
import { useApp } from '../ctx'
import { pdfBlob, saveJpeg, savePdf } from '../lib/pdf'
import { calc, inr, sheetHTML } from '../lib/sheet'

const blank = (lrNo) => ({
  lrNo,
  date: new Date().toISOString().slice(0, 10),
  consignor: '',
  consignorAddr: '',
  consignorGstin: '',
  consignee: '',
  consigneeAddr: '',
  consigneeGstin: '',
  from: '',
  to: '',
  truck: '',
  goods: '',
  qty: '',
  actualWt: '',
  chargedWt: '',
  rate: '',
  gstBy: 'CONSIGNEE',
  border: '',
  others: '',
  gstAmt: '',
  eway: '',
  doc: '',
  docDate: '',
  val: '',
  rem: '',
  trp: '',
})

const GST_BY = [
  { v: 'CONSIGNEE', s: 'Consignee pays the GST' },
  { v: 'CONSIGNOR', s: 'Consignor pays the GST' },
]

export default function Editor() {
  const { id } = useParams()
  const nav = useNavigate()
  const { user, cfg, toast, confirm } = useApp()
  const admin = user?.role === 'admin'

  const [f, setF] = useState(null)
  const [parties, setParties] = useState([])
  const [mem, setMem] = useState({ goods: [], truck: [], place: [] })
  const [busy, setBusy] = useState(false)
  const [pv, setPv] = useState(null)

  const refresh = () => {
    api.get('/parties').then(setParties)
    api.get('/memory').then(setMem)
  }

  useEffect(refresh, [])

  useEffect(() => {
    setF(null)
    ;(id ? api.get('/bilties/' + id) : api.get('/bilties/next').then((d) => blank(d.lrNo)))
      .then(setF)
      .catch((e) => toast(e.message))
  }, [id])

  if (!f) return <main><div className="sub">Loading consignment note…</div></main>

  const set = (k, v) => setF((x) => ({ ...x, [k]: v }))
  const setUpper = (k, v) => setF((x) => ({ ...x, [k]: (v || '').toUpperCase() }))

  const T = (l, k, type = 'text', x = {}) => (
    <div className="fld">
      <label className="lab">{l}</label>
      <input
        className="input"
        type={type}
        value={f[k] ?? ''}
        onChange={(e) => set(k, e.target.value)}
        {...x}
      />
    </div>
  )

  const TU = (l, k, x = {}) => (
    <div className="fld">
      <label className="lab">{l}</label>
      <input
        className="input"
        type="text"
        value={f[k] ?? ''}
        onChange={(e) => setUpper(k, e.target.value)}
        {...x}
      />
    </div>
  )

  const pItems = parties.map((p) => ({
    v: p.name,
    s: (p.address || '') + (p.gstin ? ' · ' + p.gstin : ''),
  }))
  const mi = (a) => (a || []).map((v) => ({ v }))

  const pick = (side) => (o) => {
    const p = parties.find((x) => x.name === o.v)
    setF((x) => ({
      ...x,
      [side]: o.v.toUpperCase(),
      ...(p ? { [side + 'Addr']: p.address, [side + 'Gstin']: (p.gstin || '').toUpperCase(), [side === 'consignor' ? 'from' : 'to']: p.address } : {}),
    }))
  }

  const blurMatch = (side) => (v) => {
    const p = parties.find((x) => x.name.toLowerCase() === (v || '').trim().toLowerCase())
    if (p && !f[side + 'Addr']) pick(side)({ v: p.name })
  }

  const { t } = calc(f)
  const ok = () => (f.consignor && f.consignee ? true : (toast('Consignor and consignee are required'), false))

  async function save() {
    if (!ok()) return null
    setBusy(true)
    try {
      const { record, duplicate } = await api.post('/bilties', f)
      if (duplicate) {
        toast(`Already saved. This consignment note has been saved ${record.saves} times; one record is kept.`)
      } else {
        toast('Saved to Reports. Note no. ' + record.lrNo)
        try {
          await api.putPdf(`/bilties/${record.id}/pdf`, await pdfBlob(sheetHTML(record, cfg.copy, cfg)))
        } catch {
          /* PDF is regenerated on demand */
        }
        refresh()
      }
      setF(record)
      if (record.id !== id) nav('/note/' + record.id, { replace: true })
      return record
    } catch (e) {
      toast(e.message)
      return null
    } finally {
      setBusy(false)
    }
  }

  async function run(kind) {
    if (!admin) return
    const r = await save()
    if (!r) return
    const html = sheetHTML(r, cfg.copy, cfg), name = 'Consignment-Note-' + r.lrNo
    try {
      kind === 'pdf' ? await savePdf(html, name + '.pdf') : await saveJpeg(html, name + '.jpg')
    } catch (e) {
      toast('Download failed: ' + e.message)
    }
  }

  const act = (kind) => {
    if (ok() && admin) run(kind)
  }

  function directPrint() {
    if (!ok()) return
    window.print()
  }

  function shareWhatsApp() {
    if (!ok()) return
    const { t } = calc(f)
    const text = [
      `*${cfg.name || 'RAIPUR ROADWAYS'}*`,
      `*CONSIGNMENT NOTE #${f.lrNo}*`,
      `━━━━━━━━━━━━━━━━━━━━`,
      `📅 *Date:* ${f.date}`,
      `🚛 *Vehicle No:* ${f.truck || 'N/A'}`,
      `📦 *Consignor:* ${f.consignor}`,
      `🏢 *Consignee:* ${f.consignee}`,
      `📍 *Route:* ${f.from || 'Origin'} ➔ ${f.to || 'Destination'}`,
      f.goods ? `📋 *Material:* ${f.goods}` : null,
      f.chargedWt ? `⚖️ *Weight:* ${f.chargedWt} MT` : null,
      f.rate ? `💰 *Rate:* ₹${f.rate} / MT` : null,
      t ? `💵 *Total Freight:* ₹${t.toLocaleString('en-IN')} /-` : null,
      f.eway ? `📑 *E-Way Bill:* ${f.eway}` : null,
      `━━━━━━━━━━━━━━━━━━━━`,
      `_Goods to be delivered under this note._`,
    ]
      .filter(Boolean)
      .join('\n')

    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank')
  }

  async function clear() {
    if (!(await confirm({
      title: 'Clear the form?',
      desc: 'All entered details are removed. The print template stays unchanged.',
      ok: 'Clear',
      danger: true,
    }))) return
    const d = await api.get('/bilties/next')
    setF(blank(d.lrNo))
    if (id) nav('/')
  }

  return (
    <main>
      <div className="ph noprint">
        <div>
          <h1>{id ? `Consignment Note #${f.lrNo}` : 'New Consignment Note'}</h1>
          <div className="sub">Select the parties, enter the goods and freight details, then save to Reports.</div>
        </div>
      </div>

      {/* Hidden printable sheet for direct 1-click A4 landscape printing */}
      <div className="printable-sheet">
        <Sheet rec={f} cfg={cfg} />
      </div>

      <div className={'grid ' + (admin ? '' : 'one')}>
        <div className="card noprint">
          <div className="ch">
            <h2>Consignment details</h2>
            <p>Fill in the party, vehicle, and freight details to generate the note.</p>
          </div>
          <div className="cb">
            {/* Note Number and Date */}
            <div className="fld-row fld-row-2">
              {T('Consignment note no.', 'lrNo', 'number')}
              {T('Date', 'date', 'date')}
            </div>
            <div className="sub" style={{ margin: '-4px 0 16px', fontSize: 12 }}>
              The note number follows the previous one automatically and can be edited.
            </div>

            <div className="sep" />

            {/* 1. Parties */}
            <div className="sec">
              <span className="sec-num">1</span>Parties &amp; Addresses
            </div>

            <Combo
              label="Consignor (Sender)"
              value={f.consignor}
              items={pItems}
              onChange={(v) => setUpper('consignor', v)}
              onPick={pick('consignor')}
              onBlurValue={blurMatch('consignor')}
              placeholder="Search party master or type new"
              addHint="New party, added to Party Master on save"
            />
            <div className="fld-row fld-row-addr">
              {T('Consignor Address', 'consignorAddr')}
              {TU('Consignor GSTIN', 'consignorGstin', { placeholder: 'e.g. 08AAAAA0000A1Z5' })}
            </div>

            <div style={{ height: 6 }} />

            <Combo
              label="Consignee (Receiver)"
              value={f.consignee}
              items={pItems}
              onChange={(v) => setUpper('consignee', v)}
              onPick={pick('consignee')}
              onBlurValue={blurMatch('consignee')}
              placeholder="Search party master or type new"
              addHint="New party, added to Party Master on save"
            />
            <div className="fld-row fld-row-addr">
              {T('Consignee Address', 'consigneeAddr')}
              {TU('Consignee GSTIN', 'consigneeGstin', { placeholder: 'e.g. 27AAAAA1111B1Z2' })}
            </div>

            <div className="sep" />

            {/* 2. Vehicle & Route */}
            <div className="sec">
              <span className="sec-num">2</span>Vehicle &amp; Route
            </div>
            <Combo
              label="Truck / Vehicle no."
              value={f.truck}
              items={mi(mem.truck)}
              onChange={(v) => setUpper('truck', v)}
              placeholder="e.g. RJ14GQ0899"
              addHint="New entry, remembered for next time"
            />
            <div className="fld-row fld-row-2">
              <Combo
                label="From (Origin)"
                value={f.from}
                items={mi(mem.place)}
                onChange={(v) => set('from', v)}
                placeholder="Select or type"
                addHint="New entry, remembered for next time"
              />
              <Combo
                label="To (Destination)"
                value={f.to}
                items={mi(mem.place)}
                onChange={(v) => set('to', v)}
                placeholder="Select or type"
                addHint="New entry, remembered for next time"
              />
            </div>

            <div className="sep" />

            {/* 3. Goods & Freight */}
            <div className="sec">
              <span className="sec-num">3</span>Goods &amp; Freight Calculation
            </div>
            <Combo
              label="Description of goods"
              value={f.goods}
              items={mi(mem.goods)}
              onChange={(v) => set('goods', v)}
              placeholder="e.g. GRANITE & MARBLE, TILES, ETC."
              addHint="New entry, remembered for next time"
            />
            <div className="fld-row fld-row-2">
              {T('Quantity', 'qty')}
              {T('Actual weight (MT)', 'actualWt', 'number', {
                inputMode: 'decimal',
                onChange: (e) =>
                  setF((x) => ({
                    ...x,
                    actualWt: e.target.value,
                    chargedWt: !x.chargedWt || x.chargedWt === x.actualWt ? e.target.value : x.chargedWt,
                  })),
              })}
            </div>
            <div className="fld-row fld-row-2">
              {T('Weight charged (MT)', 'chargedWt', 'number', { inputMode: 'decimal' })}
              {T('Rate per MT (₹)', 'rate', 'number', { inputMode: 'decimal' })}
            </div>
            <div className="sub" style={{ margin: '-4px 0 16px', fontSize: 12 }}>
              Freight is calculated automatically (weight charged × rate).
            </div>

            <div className="sep" />

            {/* 4. Charges & Tax */}
            <div className="sec">
              <span className="sec-num">4</span>Charges &amp; Tax (GST)
            </div>
            <div className="fld-row fld-row-2">
              <Combo
                label="GST paid by"
                value={f.gstBy}
                items={GST_BY}
                onChange={() => {}}
                onPick={(o) => set('gstBy', o.v)}
                readOnly
              />
              {TU('E-way bill no.', 'eway', { placeholder: '12-digit e-way bill' })}
            </div>
            <div className="fld-row fld-row-3">
              {T('Border charges (₹)', 'border', 'number', { inputMode: 'decimal' })}
              {T('Other charges (₹)', 'others', 'number', { inputMode: 'decimal' })}
              {T('GST amount (optional)', 'gstAmt', 'number', { inputMode: 'decimal' })}
            </div>

            <div className="sep" />

            {/* 5. Documents & Internal */}
            <div className="sec">
              <span className="sec-num">5</span>Documents &amp; Internal Reference
            </div>
            <div className="fld-row fld-row-3">
              {T('Document no.', 'doc')}
              {T('Document date', 'docDate', 'date')}
              {T('Document value (₹)', 'val')}
            </div>
            <div className="fld-row fld-row-2">
              {T('Remarks', 'rem')}
              {T('TRP (internal use)', 'trp')}
            </div>
          </div>
        </div>

        {admin && (
          <div>
            <div className="pvbg">
              <div className="pvh">
                <b>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 4, verticalAlign: 'middle' }}>
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                  Live Stationary Preview
                </b>
                <span className="badge">Auto-fits A4</span>
              </div>
              <Sheet rec={f} cfg={cfg} />
            </div>
          </div>
        )}
      </div>

      <div className="abar noprint">
        <button className="btn" disabled={busy} onClick={save}>
          Save to Reports
        </button>
        <button className="btn out" onClick={directPrint}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 6 2 18 2 18 9" />
            <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
            <rect x="6" y="14" width="12" height="8" />
          </svg>
          Print Note
        </button>
        <button
          className="btn out"
          style={{ borderColor: 'rgba(37, 211, 102, 0.4)', color: '#25D366' }}
          onClick={shareWhatsApp}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
            <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
          </svg>
          Share on WhatsApp
        </button>

        {/* Download buttons restricted to Admin only */}
        {admin && (
          <>
            <button className="btn out" disabled={busy} onClick={() => act('pdf')}>
              Download PDF
            </button>
            <button className="btn out" disabled={busy} onClick={() => act('jpg')}>
              Download JPEG
            </button>
          </>
        )}

        <button className="btn dest" onClick={clear}>
          Clear Form
        </button>
        <div className="tot">
          <b>{inr(t)}</b>
          <span>{t ? 'Total freight' : 'Enter weight and rate'}</span>
        </div>
      </div>

      {pv && (
        <Modal
          wide
          title="Preview Consignment Note"
          desc="Please review the consignment note before downloading."
          onClose={() => setPv(null)}
          footer={
            <>
              <button className="btn out" onClick={() => setPv(null)}>
                Close
              </button>
              <button
                className="btn"
                onClick={() => {
                  const k = pv
                  setPv(null)
                  run(k)
                }}
              >
                {pv === 'pdf' ? 'Download PDF' : 'Download JPEG'}
              </button>
            </>
          }
        >
          <Sheet rec={f} cfg={cfg} />
        </Modal>
      )}
    </main>
  )
}
