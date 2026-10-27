import { useEffect, useState } from 'react'
import { Navigate, Outlet, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { api } from './api'
import Modal from './components/Modal'
import { Ctx, useApp } from './ctx'
import { NI } from './lib/icons'
import { DEF } from './lib/template'
import Editor from './pages/Editor'
import Login from './pages/Login'
import Parties from './pages/Parties'
import Reports from './pages/Reports'
import Template from './pages/Template'

const ROLE = { admin: 'Administrator', operator: 'Operator' }
const sysTheme = () => (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')

function Shell() {
  const { user, setUser, cfg, theme, toggleTheme } = useApp(), nav = useNavigate(), loc = useLocation().pathname
  if (!user) return <Navigate to="/login" replace />
  const tabs = [['/', 'New Consignment', 'edit'], ['/reports', 'Reports', 'history'], ['/parties', 'Party Master', 'parties'], ...(user.role === 'admin' ? [['/template', 'Print Template', 'format']] : [])]
  const on = (p) => (p === '/' ? loc === '/' || loc.startsWith('/note') : loc.startsWith(p))
  return (
    <>
      <div className="top noprint"><div className="topin">
        <div className="logo"><i className="rr"><u>R</u><u>R</u></i><span>{cfg.name}</span></div>
        <div className="nav">{tabs.map(([p, l, i]) => <button key={p} className={on(p) ? 'on' : ''} onClick={() => nav(p)}><span dangerouslySetInnerHTML={{ __html: NI[i] }} />{l}</button>)}</div>
        <div className="who"><span className="av">{user.username[0].toUpperCase()}</span><span>{ROLE[user.role]}</span></div>
        <button className="ic" title="Switch light / dark mode" aria-label="Switch light or dark mode" onClick={toggleTheme} dangerouslySetInnerHTML={{ __html: theme === 'dark' ? NI.sun : NI.moon }} />
        <button className="btn out" onClick={() => { localStorage.removeItem('tk'); setUser(null); nav('/login') }}>Logout</button>
      </div></div>
      <Outlet />
    </>
  )
}

export default function App() {
  const [user, setUser] = useState(undefined), [cfg, setCfg] = useState(DEF), [toastMsg, setToast] = useState(''), [dlg, setDlg] = useState(null)
  const [theme, setTheme] = useState(() => localStorage.getItem('th') || sysTheme())
  useEffect(() => { document.documentElement.dataset.theme = theme; localStorage.setItem('th', theme) }, [theme])
  useEffect(() => { localStorage.getItem('tk') ? api.get('/auth/me').then((d) => setUser(d.user)).catch(() => setUser(null)) : setUser(null) }, [])
  useEffect(() => { if (user) api.get('/settings').then((s) => setCfg({ ...DEF, ...s })).catch(() => {}) }, [user])
  const toast = (m) => { setToast(m); setTimeout(() => setToast(''), 3200) }
  const confirm = (o) => new Promise((res) => setDlg({ ...o, res }))
  if (user === undefined) return null
  const close = (v) => { dlg.res(v); setDlg(null) }
  return (
    <Ctx.Provider value={{ user, setUser, cfg, setCfg, toast, confirm, theme, toggleTheme: () => setTheme(theme === 'dark' ? 'light' : 'dark') }}>
      <Routes>
        <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
        <Route element={<Shell />}>
          <Route index element={<Editor />} /><Route path="note/:id" element={<Editor />} /><Route path="reports" element={<Reports />} />
          <Route path="parties" element={<Parties />} />{user?.role === 'admin' && <Route path="template" element={<Template />} />}
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      {toastMsg && <div className="toast">{toastMsg}</div>}
      {dlg && <Modal title={dlg.title} desc={dlg.desc} onClose={() => close(false)} footer={<><button className="btn out" onClick={() => close(false)}>Cancel</button><button className={'btn ' + (dlg.danger ? 'dest' : '')} onClick={() => close(true)}>{dlg.ok}</button></>} />}
    </Ctx.Provider>
  )
}
