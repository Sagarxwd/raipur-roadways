import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'
import { useApp } from '../ctx'
import { NI } from '../lib/icons'
export default function Login() {
  const { setUser, cfg, theme, toggleTheme } = useApp(), nav = useNavigate()
  const [f, setF] = useState({ username: '', password: '' }), [err, setErr] = useState(''), [busy, setBusy] = useState(false)
  async function submit(e) {
    e.preventDefault(); setBusy(true); setErr('')
    try { const d = await api.post('/auth/login', f); localStorage.setItem('tk', d.token); setUser(d.user); nav('/', { replace: true }) }
    catch (x) { setErr(x.message) } finally { setBusy(false) }
  }
  return (
    <div className="login">
      <button className="ic lt" title="Switch light / dark mode" onClick={toggleTheme} dangerouslySetInnerHTML={{ __html: theme === 'dark' ? NI.sun : NI.moon }} />
      <div className="hero"><div className="rrbig"><u>R</u><u>R</u></div><h2>{cfg.name}</h2><p>Consignment note management for your transport business.</p>
        <ul><li>Parties fill in automatically</li><li>Serial note numbers, never duplicated</li><li>Clean PDF in your own format</li></ul></div>
      <form className="card" onSubmit={submit}>
        <div className="ch"><h2>Sign in</h2><p>Enter your credentials to manage consignment notes.</p></div>
        <div className="cb">
          <div className="fld"><label className="lab">Username</label><input className="input" autoComplete="username" value={f.username} onChange={(e) => setF({ ...f, username: e.target.value })} autoFocus /></div>
          <div className="fld"><label className="lab">Password</label><input className="input" type="password" autoComplete="current-password" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} /></div>
          <div style={{ color: 'var(--dest)', minHeight: 20, marginBottom: 6 }}>{err}</div>
          <button className="btn w lg" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
        </div>
      </form>
    </div>
  )
}
