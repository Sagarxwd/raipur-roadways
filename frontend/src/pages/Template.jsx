import { useState } from 'react'
import { api } from '../api'
import Sheet from '../components/Sheet'
import { useApp } from '../ctx'
import { DEF, FL } from '../lib/template'

const SAMPLE = { lrNo: 882, date: '2026-10-24', consignor: 'SAMPLE CONSIGNOR', consignorAddr: 'RAJSAMAND', consignorGstin: '08AAAAA0000A1Z5', consignee: 'SAMPLE CONSIGNEE', consigneeAddr: 'KANDIVALI', consigneeGstin: '27AAAAA1111B1Z2', from: 'RAJSAMAND', to: 'KANDIVALI', truck: 'RJ14GQ0899', goods: 'GRANITE & MARBLE', qty: '', actualWt: '25', chargedWt: '25', rate: '1400', gstBy: 'CONSIGNEE', border: '', others: '', gstAmt: '', eway: '', doc: '15', docDate: '2026-10-24', val: '237908', rem: '' }
const BIG = ['mob', 'bank', 'addr', 'note1', 'note2']

export default function Template() {
  const { cfg, setCfg, toast, confirm } = useApp(), [d, setD] = useState(cfg)
  const set = (k, v) => setD({ ...d, [k]: v })
  async function save() { try { await api.put('/settings', d); setCfg(d); toast('Template saved') } catch (e) { toast(e.message) } }
  async function restore() {
    if (!(await confirm({ title: 'Restore the default template?', desc: 'All text and headings return to the original template.', ok: 'Restore', danger: true }))) return
    await api.del('/settings'); setCfg(DEF); setD(DEF); toast('Default template restored')
  }
  return (
    <main>
      <div className="ph"><div><h1>Print Template</h1><div className="sub">Edit the fixed text, company details and headings printed on every consignment note. Changes apply to all new previews and PDFs. The logo is read from <b>/logo.png</b>.</div></div><button className="btn out" onClick={restore}>Restore default template</button></div>
      <div className="grid"><div className="card"><div className="cb">
        {Object.keys(DEF).map((k) => <div className="fld" key={k}><label className="lab">{FL[k]}</label>{BIG.includes(k) ? <textarea className="input" rows={k === 'bank' || k === 'mob' ? 4 : 2} value={d[k]} onChange={(e) => set(k, e.target.value)} /> : <input className="input" value={d[k]} onChange={(e) => set(k, e.target.value)} />}</div>)}
        <button className="btn" onClick={save}>Save template</button></div></div>
        <div><div className="pvbg"><div className="pvh"><b>Live preview</b></div><Sheet rec={SAMPLE} cfg={d} /></div></div></div>
    </main>
  )
}
