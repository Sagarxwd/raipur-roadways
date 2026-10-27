import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
// npm run import -- path/to/file.xlsx   (sheet "PARTY" with columns: PARTY NAME, ADDRESS, GSTIN)
import mongoose from 'mongoose'
import XLSX from 'xlsx'
import { Party } from '../src/models.js'
dotenv.config({ path: fileURLToPath(new URL('../.env', import.meta.url)) })
await mongoose.connect(process.env.MONGODB_URI)
const rows = XLSX.utils.sheet_to_json(XLSX.readFile(process.argv[2]).Sheets['PARTY']); let n = 0
for (const r of rows) {
  const name = String(r['PARTY NAME'] || '').trim(); if (!name) continue
  await Party.updateOne({ name }, { $set: { address: String(r.ADDRESS || '').trim(), gstin: String(r.GSTIN || '').trim() } }, { upsert: true }); n++
}
console.log(n, 'parties imported'); process.exit()
