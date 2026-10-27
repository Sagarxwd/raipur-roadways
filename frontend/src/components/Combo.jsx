import { useRef, useState } from 'react'

// Searchable dropdown with accessible keyboard navigation and animated SVG chevron
export default function Combo({ label, value, onChange, onPick, onBlurValue, items = [], placeholder, readOnly, addHint }) {
  const [open, setOpen] = useState(false), [hi, setHi] = useState(-1)
  const inputRef = useRef(null)
  const q = readOnly ? '' : (value || '').trim().toLowerCase()
  const list = items.filter((o) => !q || (o.v + ' ' + (o.s || '')).toLowerCase().includes(q)).slice(0, 10)
  const add = !readOnly && q && !list.some((o) => o.v.toLowerCase() === q)
  const pick = (o) => {
    setOpen(false)
    setHi(-1)
    onPick ? onPick(o) : onChange(o.v)
  }
  const key = (e) => {
    if (e.key === 'ArrowDown') {
      setHi((prev) => Math.min(prev + 1, list.length - 1))
      setOpen(true)
      e.preventDefault()
    } else if (e.key === 'ArrowUp') {
      setHi((prev) => Math.max(prev - 1, 0))
      e.preventDefault()
    } else if (e.key === 'Enter' && hi >= 0 && list[hi]) {
      pick(list[hi])
      e.preventDefault()
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  const toggleDropdown = (e) => {
    e.stopPropagation()
    if (open) {
      setOpen(false)
    } else {
      setHi(-1)
      setOpen(true)
      inputRef.current?.focus()
    }
  }

  return (
    <div className="fld">
      {label && <label className="lab">{label}</label>}
      <div className="combo-box">
        <input
          ref={inputRef}
          className="input combo-input"
          value={value ?? ''}
          readOnly={readOnly}
          placeholder={placeholder}
          autoComplete="off"
          onKeyDown={key}
          onFocus={() => { setHi(-1); setOpen(true) }}
          onClick={() => { setOpen(true) }}
          onChange={(e) => { onChange(e.target.value); setHi(-1); setOpen(true) }}
          onBlur={() => {
            setOpen(false)
            onBlurValue?.(value)
          }}
        />
        <button
          type="button"
          tabIndex={-1}
          className={'combo-arrow' + (open ? ' open' : '')}
          onMouseDown={(e) => e.preventDefault()}
          onClick={toggleDropdown}
          aria-label="Toggle dropdown"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
        {open && (
          <div className="pop" onMouseDown={(e) => e.preventDefault()}>
            {list.map((o, n) => (
              <div
                key={o.v}
                className={'opt' + (n === hi ? ' on' : '')}
                onClick={() => pick(o)}
              >
                <b>{o.v}</b>
                {o.s && <small>{o.s}</small>}
              </div>
            ))}
            {add && (
              <div className="opt opt-add" data-add="1" onClick={() => setOpen(false)}>
                <b>Use “{(value || '').trim()}”</b>
                <small>{addHint}</small>
              </div>
            )}
            {!list.length && !add && (
              <div className="opt opt-empty">
                <small>No matches found</small>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
