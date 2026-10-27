import mongoose from 'mongoose'
mongoose.set('toJSON', { transform: (_, r) => { r.id = String(r._id); delete r._id; delete r.__v; return r } })
const { Schema, model } = mongoose

// Fields that make up a consignment note. Two saves with identical values are treated as ONE record.
export const FIELDS = ['lrNo', 'date', 'consignor', 'consignorAddr', 'consignorGstin', 'consignee', 'consigneeAddr', 'consigneeGstin', 'from', 'to', 'truck', 'goods', 'qty', 'actualWt', 'chargedWt', 'rate', 'gstBy', 'border', 'others', 'gstAmt', 'eway', 'doc', 'docDate', 'val', 'rem', 'trp']

export const Bilty = model('Bilty', new Schema({
  ...Object.fromEntries(FIELDS.map((k) => [k, k === 'lrNo' ? { type: Number, unique: true } : { type: String, default: '' }])),
  key: { type: String, unique: true }, saves: { type: Number, default: 1 }, hasPdf: { type: Boolean, default: false }, by: String,
}, { timestamps: true }))
export const Pdf = model('Pdf', new Schema({ data: Buffer }))
export const User = model('User', new Schema({ username: { type: String, unique: true }, hash: String, role: { type: String, enum: ['admin', 'operator'] } }))
export const Party = model('Party', new Schema({ name: { type: String, unique: true }, address: { type: String, default: '' }, gstin: { type: String, default: '' } }))
export const Memory = model('Memory', new Schema({ kind: String, value: String }).index({ kind: 1, value: 1 }, { unique: true }))
export const Meta = model('Meta', new Schema({ _id: String, last: Number }))
export const Setting = model('Setting', new Schema({ _id: String, data: Object }))
