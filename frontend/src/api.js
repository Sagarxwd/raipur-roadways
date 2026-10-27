async function req(method, url, body, contentType) {
  const h = {}, t = localStorage.getItem('tk')
  if (t) h.Authorization = 'Bearer ' + t
  if (contentType) h['Content-Type'] = contentType
  else if (body) h['Content-Type'] = 'application/json'
  const r = await fetch('/api' + url, { method, headers: h, body: contentType ? body : body ? JSON.stringify(body) : undefined })
  if (r.status === 401 && !url.startsWith('/auth/login')) { localStorage.removeItem('tk'); location.href = '/login'; throw new Error('Please sign in again') }
  const d = (r.headers.get('content-type') || '').includes('json') ? await r.json() : await r.blob()
  if (!r.ok) throw new Error(d.error || 'Request failed')
  return d
}
export const api = { get: (u) => req('GET', u), post: (u, b) => req('POST', u, b), put: (u, b) => req('PUT', u, b), del: (u) => req('DELETE', u), putPdf: (u, b) => req('PUT', u, b, 'application/pdf') }
export const download = (blob, name) => { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000) }
