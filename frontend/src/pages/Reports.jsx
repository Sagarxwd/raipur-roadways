import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, download } from '../api'
import Sheet from '../components/Sheet'
import { useApp } from '../ctx'
import { pdfBlob } from '../lib/pdf'
import { calc, fmtX, inr, sheetHTML } from '../lib/sheet'

export default function Reports() {
  const { user, cfg, toast, confirm } = useApp()
  const admin = user?.role === 'admin'
  const nav = useNavigate()
  const [q, setQ] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [rows, setRows] = useState([])
  const [printRec, setPrintRec] = useState(null)

  const load = () =>
    api
      .get(`/bilties?search=${encodeURIComponent(q)}&from=${from}&to=${to}`)
      .then(setRows)
      .catch((e) => toast(e.message))

  useEffect(() => {
    const t = setTimeout(load, 250)
    return () => clearTimeout(t)
  }, [q, from, to])

  const baseTotal = rows.reduce((s, x) => s + calc(x).fr, 0)
  const grandTotal = rows.reduce((s, x) => s + calc(x).t, 0)
  const repeats = rows.reduce((n, x) => n + (x.saves - 1), 0)

  async function pdf(x) {
    if (!admin) return
    try {
      download(x.hasPdf ? await api.get(`/bilties/${x.id}/pdf`) : await pdfBlob(sheetHTML(x, cfg.copy, cfg)), `Consignment-Note-${x.lrNo}.pdf`)
    } catch (e) {
      toast(e.message)
    }
  }

  function printBilty(x) {
    setPrintRec(x)
    setTimeout(() => {
      window.print()
      setTimeout(() => setPrintRec(null), 1000)
    }, 150)
  }

  async function del(x) {
    if (!admin) return
    if (await confirm({ title: 'Delete this consignment note?', desc: 'The record and its saved PDF will be removed permanently.', ok: 'Delete', danger: true })) {
      await api.del('/bilties/' + x.id)
      load()
    }
  }

  async function purge() {
    if (!admin) return
    const c = new Date(Date.now() - 180 * 864e5).toISOString().slice(0, 10)
    if (await confirm({ title: 'Delete records older than 6 months?', desc: 'Notes dated before ' + fmtX(c) + ' and their PDFs will be removed permanently to free database space. Note numbers continue without reuse.', ok: 'Delete', danger: true })) {
      const d = await api.del('/bilties?olderThanDays=180')
      toast(d.deleted + ' record(s) deleted')
      load()
    }
  }

  return (
    <main style={{ maxWidth: 'none' }}>
      {printRec && (
        <div className="printable-sheet">
          <Sheet rec={printRec} cfg={cfg} />
        </div>
      )}

      <div className="ph noprint">
        <div>
          <h1>Consignment Reports</h1>
          <div className="sub">All saved consignment notes. {admin && 'Administrator can download PDFs and delete records.'}</div>
        </div>
        {admin && (
          <button className="btn dest" onClick={purge}>
            Delete records older than 6 months
          </button>
        )}
        <button className="btn" onClick={() => nav('/')}>
          + New Consignment Note
        </button>
      </div>

      <div className="stats noprint">
        <div className="stat"><span>Consignment notes</span><b>{rows.length}</b></div>
        <div className="stat"><span>Base Freight</span><b>{inr(baseTotal)}</b></div>
        <div className="stat"><span>Grand Total (with charges)</span><b>{inr(grandTotal)}</b></div>
        <div className="stat"><span>Repeat saves</span><b>{repeats}</b></div>
      </div>

      <div className="tools noprint">
        <input className="input" placeholder="Search party, vehicle, material or GR no." value={q} onChange={(e) => setQ(e.target.value)} />
        <label className="dt">From<input className="input" type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></label>
        <label className="dt">To<input className="input" type="date" value={to} onChange={(e) => setTo(e.target.value)} /></label>
        <button className="btn out" onClick={() => { setQ(''); setFrom(''); setTo('') }}>Reset</button>
      </div>

      <div className="tw noprint">
        <table className="t xl">
          <thead>
            <tr>
              {['GR. No.', 'Date', 'Vehicle no.', 'Material / Block no.', 'Consignor', 'Consignee', 'From', 'To', 'E-way bill no.'].map((h) => <th key={h}>{h}</th>)}
              <th className="r">Weight</th>
              <th className="r">Rate</th>
              <th className="r">Base Freight</th>
              <th className="r">Total Amount</th>
              <th>TRP</th>
              <th>Status</th>
              <th className="r">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((x) => {
              const { fr, t } = calc(x)
              return (
                <tr key={x.id} onClick={() => nav('/note/' + x.id)}>
                  <td><b>{x.lrNo}</b></td>
                  <td>{fmtX(x.date)}</td>
                  <td>{x.truck}</td>
                  <td>{x.goods}</td>
                  <td>{x.consignor}</td>
                  <td>{x.consignee}</td>
                  <td>{x.from}</td>
                  <td>{x.to}</td>
                  <td>{x.eway}</td>
                  <td className="r">{x.chargedWt}</td>
                  <td className="r">{x.rate}</td>
                  <td className="r">{fr}</td>
                  <td className="r"><b>{t}</b></td>
                  <td>{x.trp}</td>
                  <td>{x.saves > 1 ? <span className="badge s">Saved ×{x.saves}</span> : <span className="badge">Saved</span>}</td>
                  <td className="r" style={{ whiteSpace: 'nowrap' }} onClick={(e) => e.stopPropagation()}>
                    <button className="btn out sm" onClick={() => printBilty(x)}>
                      Print
                    </button>
                    {admin && (
                      <>
                        {' '}
                        <button className="btn out sm" onClick={() => pdf(x)}>
                          PDF
                        </button>
                        {' '}
                        <button className="btn dest sm" onClick={() => del(x)}>
                          Delete
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              )
            })}
            {!rows.length && <tr><td colSpan="16" className="empty">No consignment notes found.</td></tr>}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan="11">Showing {rows.length} consignment note(s)</td>
              <td className="r">{inr(baseTotal)}</td>
              <td className="r"><b>{inr(grandTotal)}</b></td>
              <td colSpan="3" />
            </tr>
          </tfoot>
        </table>
      </div>
    </main>
  )
}
