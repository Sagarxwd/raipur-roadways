import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'
// Renders the consignment note off-screen at its true size and captures it.
async function snap(html) {
  const w = document.createElement('div')
  w.style.cssText = 'position:fixed;left:0;top:0;z-index:-1;width:1000px;background:#fff;pointer-events:none'
  w.innerHTML = html; document.body.appendChild(w)
  const el = w.querySelector('.sheet'); el.style.transform = 'none'
  try {
    await document.fonts.ready
    await Promise.all([...w.querySelectorAll('img')].map((i) => (i.complete ? 1 : new Promise((r) => { i.onload = i.onerror = r }))))
    return await html2canvas(el, { scale: 2, backgroundColor: '#fff', useCORS: true })
  } finally { document.body.removeChild(w) }
}
async function makePdf(html) {
  const c = await snap(html), pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  const W = 281, H = 194; let w = W, h = (c.height * W) / c.width
  if (h > H) { h = H; w = (c.width * H) / c.height }
  pdf.addImage(c.toDataURL('image/jpeg', 0.95), 'JPEG', (297 - w) / 2, 8, w, h)
  return pdf
}
export const pdfBlob = async (html) => (await makePdf(html)).output('blob')
export const savePdf = async (html, name) => (await makePdf(html)).save(name)
export async function saveJpeg(html, name) { const c = await snap(html), a = document.createElement('a'); a.href = c.toDataURL('image/jpeg', 0.95); a.download = name; a.click() }
