import dotenv from 'dotenv'
import crypto from 'crypto'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import bcrypt from 'bcryptjs'
import cors from 'cors'
import express from 'express'
import jwt from 'jsonwebtoken'
import mongoose from 'mongoose'
import { Bilty, FIELDS, Memory, Meta, Party, Pdf, Setting, User } from './models.js'

dotenv.config({ path: fileURLToPath(new URL('../.env', import.meta.url)) })

const PORT = process.env.PORT || 8000
const getSecret = () => process.env.JWT_SECRET || 'secret'
const getStartLR = () => process.env.START_LR || '1'

const app = express()

let isConnected = false
export const connectDB = async () => {
  if (isConnected && mongoose.connection.readyState === 1) return
  const uri = process.env.MONGODB_URI
  if (!uri) throw new Error('MONGODB_URI environment variable is missing')
  await mongoose.connect(uri)
  isConnected = true
}

app.use(cors(), express.json({ limit: '1mb' }))

// Ensure DB is connected before handling any API requests
app.use('/api', async (req, res, next) => {
  try {
    await connectDB()
    next()
  } catch (err) {
    res.status(500).json({ error: 'Database connection error: ' + err.message })
  }
})

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const auth = (req, res, next) => {
  try {
    req.user = jwt.verify((req.headers.authorization || '').slice(7), getSecret())
    next()
  } catch {
    res.status(401).json({ error: 'Please sign in again' })
  }
}
const adminOnly = (req, res, next) => (req.user.role === 'admin' ? next() : res.status(403).json({ error: 'Administrator access required' }))

// ---------- auth ----------
app.post('/api/auth/login', async (req, res) => {
  const u = await User.findOne({ username: String(req.body.username || '').trim().toLowerCase() })
  if (!u || !(await bcrypt.compare(String(req.body.password || ''), u.hash))) return res.status(401).json({ error: 'Invalid username or password.' })
  const user = { username: u.username, role: u.role }
  res.json({ token: jwt.sign(user, getSecret(), { expiresIn: '30d' }), user })
})
app.get('/api/auth/me', auth, (req, res) => res.json({ user: { username: req.user.username, role: req.user.role } }))

// ---------- consignment notes ----------
const nextNo = async () => {
  const [m, b] = await Promise.all([Meta.findById('lr'), Bilty.findOne().sort({ lrNo: -1 }).select('lrNo')])
  return Math.max(m?.last || 0, b?.lrNo || 0, (+getStartLR() || 1) - 1) + 1 // never reused, even after old notes are deleted
}

const clean = (b) => {
  const o = Object.fromEntries(FIELDS.map((k) => [k, k === 'lrNo' ? +b.lrNo || 0 : String(b[k] ?? '').trim()]))
  if (o.truck) o.truck = o.truck.toUpperCase()
  if (o.consignor) o.consignor = o.consignor.toUpperCase()
  if (o.consignee) o.consignee = o.consignee.toUpperCase()
  if (o.consignorGstin) o.consignorGstin = o.consignorGstin.toUpperCase()
  if (o.consigneeGstin) o.consigneeGstin = o.consigneeGstin.toUpperCase()
  return o
}

const hash = (b) => crypto.createHash('sha1').update(JSON.stringify(FIELDS.map((k) => String(b[k] ?? '')))).digest('hex')

async function remember(r) {
  const ops = [['goods', r.goods], ['truck', r.truck], ['place', r.from], ['place', r.to]].filter(([, v]) => v).map(([kind, value]) => ({ updateOne: { filter: { kind, value }, update: { $setOnInsert: { kind, value } }, upsert: true } }))
  if (ops.length) await Memory.bulkWrite(ops)
  for (const s of ['consignor', 'consignee']) {
    if (r[s]) {
      const name = r[s].trim().toUpperCase()
      await Party.updateOne({ name }, { $set: { name, ...(r[s + 'Addr'] && { address: r[s + 'Addr'].trim() }), ...(r[s + 'Gstin'] && { gstin: r[s + 'Gstin'].trim().toUpperCase() }) } }, { upsert: true })
    }
  }
}

app.get('/api/bilties/next', auth, async (req, res) => res.json({ lrNo: await nextNo() }))
app.get('/api/bilties', auth, async (req, res) => {
  const { search = '', from, to } = req.query, f = {}
  if (from || to) f.date = { ...(from && { $gte: from }), ...(to && { $lte: to }) }
  if (search.trim()) f.$or = ['consignor', 'consignee', 'truck', 'goods', 'from', 'to', 'eway'].map((k) => ({ [k]: new RegExp(esc(search.trim()), 'i') })).concat(+search ? [{ lrNo: +search }] : [])
  res.json(await Bilty.find(f).sort({ lrNo: -1 }).limit(2000))
})
app.get('/api/bilties/:id', auth, async (req, res) => { const b = await Bilty.findById(req.params.id); b ? res.json(b) : res.status(404).json({ error: 'Not found' }) })
app.post('/api/bilties', auth, async (req, res) => {
  const b = clean(req.body)
  if (!b.consignor || !b.consignee) return res.status(400).json({ error: 'Consignor and consignee are required' })
  const bump = async (key) => Bilty.findOneAndUpdate({ key }, { $inc: { saves: 1 } }, { new: true })
  let key = hash(b), ex = await bump(key) // identical note saved again: keep one record, count the saves
  if (ex) return res.json({ record: ex, duplicate: true })

  // Concurrency-safe retry loop for LR assignment
  for (let attempt = 0; attempt < 5; attempt++) {
    if (!b.lrNo || (await Bilty.exists({ lrNo: b.lrNo }))) {
      b.lrNo = await nextNo()
      key = hash(b)
    }
    if ((ex = await bump(key))) return res.json({ record: ex, duplicate: true })
    try {
      const record = await Bilty.create({ ...b, key, by: req.user.username })
      await Meta.updateOne({ _id: 'lr' }, { $max: { last: record.lrNo } }, { upsert: true })
      await remember(b)
      return res.json({ record, duplicate: false })
    } catch (e) {
      if (e.code === 11000) {
        if ((ex = await bump(key))) return res.json({ record: ex, duplicate: true })
        b.lrNo = 0
        continue
      }
      throw e
    }
  }
  res.status(500).json({ error: 'Could not generate unique consignment note number, please try again.' })
})
app.put('/api/bilties/:id/pdf', auth, express.raw({ type: 'application/pdf', limit: '8mb' }), async (req, res) => {
  await Pdf.findByIdAndUpdate(req.params.id, { data: req.body }, { upsert: true }); await Bilty.findByIdAndUpdate(req.params.id, { hasPdf: true }); res.json({ ok: 1 })
})
app.get('/api/bilties/:id/pdf', auth, adminOnly, async (req, res) => { const p = await Pdf.findById(req.params.id); p ? res.type('application/pdf').send(p.data) : res.status(404).json({ error: 'PDF not found' }) })
app.delete('/api/bilties/:id', auth, adminOnly, async (req, res) => { await Pdf.findByIdAndDelete(req.params.id); await Bilty.findByIdAndDelete(req.params.id); res.json({ ok: 1 }) })
app.delete('/api/bilties', auth, adminOnly, async (req, res) => { // admin clean-up: ?olderThanDays=180
  const cutoff = new Date(Date.now() - (+req.query.olderThanDays || 180) * 864e5).toISOString().slice(0, 10)
  const ids = (await Bilty.find({ date: { $lt: cutoff } }).select('_id')).map((x) => x._id)
  await Pdf.deleteMany({ _id: { $in: ids } }); await Bilty.deleteMany({ _id: { $in: ids } }); res.json({ deleted: ids.length })
})

// ---------- party master, suggestions, print template ----------
app.get('/api/parties', auth, async (req, res) => res.json(await Party.find(req.query.search ? { name: new RegExp(esc(req.query.search), 'i') } : {}).sort({ name: 1 }).limit(5000)))
app.post('/api/parties', auth, async (req, res) => { try { res.json(await Party.create({ name: req.body.name, address: req.body.address, gstin: req.body.gstin })) } catch { res.status(400).json({ error: 'A party with this name already exists' }) } })
app.put('/api/parties/:id', auth, async (req, res) => res.json(await Party.findByIdAndUpdate(req.params.id, { name: req.body.name, address: req.body.address, gstin: req.body.gstin }, { new: true })))
app.delete('/api/parties/:id', auth, adminOnly, async (req, res) => { await Party.findByIdAndDelete(req.params.id); res.json({ ok: 1 }) })
app.get('/api/memory', auth, async (req, res) => { const m = await Memory.find().sort({ value: 1 }), o = { goods: [], truck: [], place: [] }; m.forEach((x) => o[x.kind]?.push(x.value)); res.json(o) })
app.get('/api/settings', auth, async (req, res) => res.json((await Setting.findById('template'))?.data || {}))
app.put('/api/settings', auth, adminOnly, async (req, res) => { await Setting.findByIdAndUpdate('template', { data: req.body }, { upsert: true }); res.json({ ok: 1 }) })
app.delete('/api/settings', auth, adminOnly, async (req, res) => { await Setting.findByIdAndDelete('template'); res.json({ ok: 1 }) })

// ---------- serve the built React app (standalone Node mode) ----------
const dist = path.join(path.dirname(fileURLToPath(import.meta.url)), '../../frontend/dist')
if (fs.existsSync(dist)) {
  app.use(express.static(dist))
  app.use((req, res, next) => (req.method === 'GET' && !req.path.startsWith('/api') ? res.sendFile(path.join(dist, 'index.html')) : next()))
}

app.use((e, req, res, next) => { console.error(e); res.status(500).json({ error: e.message || 'Server error' }) })

export default app

// If not on Vercel serverless, run as standalone Express server
if (!process.env.VERCEL) {
  connectDB().then(async () => {
    await Bilty.init().catch(() => {})
    app.listen(PORT, () => console.log('Server running on http://localhost:' + PORT))
  }).catch((err) => {
    console.error('Initial DB connection failed:', err.message)
  })
}
