import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
// npm run seed  ->  creates or updates the administrator and operator logins from .env
import bcrypt from 'bcryptjs'
import mongoose from 'mongoose'
import { User } from '../src/models.js'
dotenv.config({ path: fileURLToPath(new URL('../.env', import.meta.url)) })
await mongoose.connect(process.env.MONGODB_URI)
for (const [u, p, role] of [[process.env.ADMIN_USER || 'admin', process.env.ADMIN_PASSWORD, 'admin'], [process.env.OPERATOR_USER || 'operator', process.env.OPERATOR_PASSWORD, 'operator']]) {
  if (!p) { console.log('Skipped', role, '(password missing in .env)'); continue }
  await User.updateOne({ username: u.toLowerCase() }, { hash: await bcrypt.hash(p, 10), role }, { upsert: true }); console.log('Ready:', u, `(${role})`)
}
process.exit()
