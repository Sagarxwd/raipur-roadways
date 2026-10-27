export default function Modal({ title, desc, wide, footer, onClose, children }) {
  return (
    <div className="ov" onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}>
      <div className="dlg" style={wide ? { maxWidth: 1060, maxHeight: '94vh', overflow: 'auto' } : undefined}>
        <h3>{title}</h3>{desc && <div className="sub" style={{ marginBottom: 10 }}>{desc}</div>}
        <div style={{ marginTop: 12 }}>{children}</div>
        <div className="ft">{footer}</div>
      </div>
    </div>
  )
}
