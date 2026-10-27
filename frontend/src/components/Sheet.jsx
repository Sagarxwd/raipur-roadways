import { useLayoutEffect, useRef } from 'react'
import { sheetHTML } from '../lib/sheet'

// Shows the consignment note scaled precisely to fit the available container width.
export default function Sheet({ rec, cfg, label }) {
  const ref = useRef(null)
  const html = sheetHTML(rec, label || cfg.copy, cfg)

  useLayoutEffect(() => {
    const fit = () => {
      const container = ref.current
      if (!container) return
      const wrap = container.firstElementChild
      const sheet = wrap?.firstElementChild
      if (!wrap || !sheet) return

      // Measure the exact container width (accounting for borders and padding)
      const containerWidth = container.clientWidth
      if (!containerWidth) return

      // Sheet baseline is 1000px width
      const k = Math.min(1, Math.max(0.1, (containerWidth - 2) / 1000))
      sheet.style.transformOrigin = '0 0'
      sheet.style.transform = `scale(${k})`
      wrap.style.width = '100%'
      wrap.style.height = `${Math.ceil(sheet.offsetHeight * k)}px`
    }

    fit()
    const ro = new ResizeObserver(fit)
    if (ref.current) ro.observe(ref.current)
    window.addEventListener('resize', fit)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', fit)
    }
  }, [html])

  return <div ref={ref} style={{ width: '100%', overflow: 'hidden' }} dangerouslySetInnerHTML={{ __html: html }} />
}
