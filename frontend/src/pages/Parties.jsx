import { useEffect, useState } from 'react'
import { api } from '../api'
import Modal from '../components/Modal'
import { useApp } from '../ctx'

export default function Parties() {
  const { user, toast, confirm } = useApp(), admin = user.role === 'admin'
  const [q, setQ] = useState(''), [rows, setRows] = useState([]), [ed, setEd] = useState(null)
  const load = () => api.get('/parties').then(setRows).catch((e) => toast(e.message))
  useEffect(() => { load() }, [])
  const list = rows.filter((p) => (p.name + p.address + p.gstin).toLowerCase().includes(q.toLowerCase()))
  async function save() {
    const v = { name: ed.name.trim().toUpperCase(), address: ed.address.trim().toUpperCase(), gstin: ed.gstin.trim().toUpperCase() }
    if (!v.name) return toast('Party name is required')
    try { ed.id ? await api.put('/parties/' + ed.id, v) : await api.post('/parties', v); setEd(null); load() } catch (e) { toast(e.message) }
  }
  async function del(p) { if (await confirm({ title: 'Delete this party?', desc: 'Existing consignment notes are not affected.', ok: 'Delete', danger: true })) { await api.del('/parties/' + p.id); load() } }
  const F = (l, k) => <div className="fld"><label className="lab">{l}</label><input className="input" value={ed[k] || ''} onChange={(e) => setEd({ ...ed, [k]: e.target.value })} /></div>
  return (
    <main>
      <div className="ph"><div><h1>Party Master</h1><div className="sub">Maintain consignor and consignee details. Address and GSTIN fill in automatically on every consignment note.</div></div><button className="btn" onClick={() => setEd({ name: '', address: '', gstin: '' })}>+ Add party</button></div>
      <div className="tools"><input className="input" placeholder="Search parties" value={q} onChange={(e) => setQ(e.target.value)} /></div>
      <div className="tw"><table className="t"><thead><tr><th>Party name</th><th>Address</th><th>GSTIN</th><th className="r">Actions</th></tr></thead>
        <tbody>
          {list.map((p) => <tr key={p.id}><td><b>{p.name}</b></td><td>{p.address}</td><td>{p.gstin}</td><td className="r" style={{ whiteSpace: 'nowrap' }}><button className="btn out" onClick={() => setEd(p)}>Edit</button> {admin && <button className="btn dest" onClick={() => del(p)}>Delete</button>}</td></tr>)}
          {!list.length && <tr><td colSpan="4" className="empty">No parties found.</td></tr>}
        </tbody></table></div>
      {ed && <Modal title={ed.id ? 'Edit party' : 'Add party'} desc="Party details are used to auto-fill consignment notes." onClose={() => setEd(null)}
        footer={<><button className="btn out" onClick={() => setEd(null)}>Cancel</button><button className="btn" onClick={save}>Save</button></>}>{F('Party name', 'name')}{F('Address', 'address')}{F('GSTIN', 'gstin')}</Modal>}
    </main>
  )
}
