
// SharedComponents.jsx — Design tokens + primitives for Vitrine Virtual

const C = {
  bg: '#faf7f3', surface: '#ffffff', surface2: '#f5f0ea', surface3: '#ede6dc',
  text: '#1e1a17', text2: '#6d6460', text3: '#b0a59d',
  accent: '#b8956a', accentDark: '#8b6840', accentLight: '#f2e8d8',
  border: '#e6dfd6', border2: '#d4cbc0',
  success: '#6b9b78', successLight: '#e8f3eb',
  danger: '#c47a7a', dangerLight: '#f7ebeb',
  warning: '#c49a5a', warningLight: '#faf0e0',
};

const F = {
  serif: "'Cormorant Garamond', Georgia, serif",
  sans: "'DM Sans', system-ui, sans-serif",
};

// Logo
function VVLogo({ size = 28, dark = true }) {
  const color = dark ? C.text : C.surface;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
        <rect width="32" height="32" rx="8" fill={dark ? C.text : C.surface} />
        <text x="16" y="22" fontFamily="Georgia, serif" fontSize="14" fontWeight="600"
          fill={dark ? C.surface : C.text} textAnchor="middle" letterSpacing="0.5">vv</text>
      </svg>
      <span style={{ fontFamily: F.serif, fontSize: size * 0.75, fontWeight: 600,
        color, letterSpacing: '0.04em', lineHeight: 1 }}>vitrine</span>
    </div>
  );
}

// Button
function Btn({ children, variant = 'primary', size = 'md', onClick, disabled, style = {}, icon }) {
  const [hov, setHov] = React.useState(false);
  const base = {
    display: 'inline-flex', alignItems: 'center', gap: 6, border: 'none', cursor: disabled ? 'not-allowed' : 'pointer',
    fontFamily: F.sans, fontWeight: 500, transition: 'all 0.18s', borderRadius: 8,
    opacity: disabled ? 0.5 : 1, whiteSpace: 'nowrap',
    fontSize: size === 'sm' ? 13 : size === 'lg' ? 16 : 14,
    padding: size === 'sm' ? '6px 12px' : size === 'lg' ? '13px 24px' : '9px 18px',
  };
  const variants = {
    primary: { background: hov ? C.accentDark : C.accent, color: '#fff' },
    dark: { background: hov ? '#2d2825' : C.text, color: '#fff' },
    ghost: { background: hov ? C.surface2 : 'transparent', color: C.text, border: `1px solid ${C.border}` },
    danger: { background: hov ? '#b56b6b' : C.danger, color: '#fff' },
    success: { background: hov ? '#5a8a67' : C.success, color: '#fff' },
    text: { background: 'transparent', color: hov ? C.accent : C.text2, padding: size === 'sm' ? '4px 6px' : '6px 8px' },
  };
  return (
    <button onClick={disabled ? undefined : onClick}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ ...base, ...variants[variant], ...style }}>
      {icon && <span style={{ display: 'flex' }}>{icon}</span>}
      {children}
    </button>
  );
}

// Badge
function Badge({ label, variant = 'neutral' }) {
  const variants = {
    disponivel: { bg: C.successLight, color: C.success, dot: C.success },
    vendida: { bg: C.dangerLight, color: C.danger, dot: C.danger },
    admin: { bg: C.accentLight, color: C.accentDark, dot: C.accent },
    neutral: { bg: C.surface2, color: C.text2, dot: C.text3 },
    warning: { bg: C.warningLight, color: C.warning, dot: C.warning },
  };
  const v = variants[variant] || variants.neutral;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 8px',
      borderRadius: 20, background: v.bg, color: v.color, fontSize: 12, fontFamily: F.sans, fontWeight: 500 }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: v.dot, flexShrink: 0 }} />
      {label}
    </span>
  );
}

// Input
function Input({ label, value, onChange, placeholder, type = 'text', prefix, suffix, error, helper, as: As = 'input', rows = 3, style = {} }) {
  const [focus, setFocus] = React.useState(false);
  const inputStyle = {
    width: '100%', padding: prefix ? '9px 12px 9px 36px' : '9px 12px',
    border: `1px solid ${error ? C.danger : focus ? C.accent : C.border}`,
    borderRadius: 8, fontFamily: F.sans, fontSize: 14, color: C.text,
    background: C.surface, outline: 'none', boxSizing: 'border-box',
    transition: 'border-color 0.15s', resize: As === 'textarea' ? 'vertical' : undefined,
  };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5, ...style }}>
      {label && <label style={{ fontFamily: F.sans, fontSize: 13, fontWeight: 500, color: C.text2 }}>{label}</label>}
      <div style={{ position: 'relative' }}>
        {prefix && <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
          color: C.text3, fontSize: 14, fontFamily: F.sans }}>{prefix}</span>}
        <As value={value} onChange={onChange} placeholder={placeholder} type={type}
          rows={rows} style={inputStyle} onFocus={() => setFocus(true)} onBlur={() => setFocus(false)} />
        {suffix && <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
          color: C.text3, fontSize: 13 }}>{suffix}</span>}
      </div>
      {(error || helper) && <span style={{ fontSize: 12, color: error ? C.danger : C.text3, fontFamily: F.sans }}>{error || helper}</span>}
    </div>
  );
}

// Select
function Select({ label, value, onChange, options = [], style = {} }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5, ...style }}>
      {label && <label style={{ fontFamily: F.sans, fontSize: 13, fontWeight: 500, color: C.text2 }}>{label}</label>}
      <select value={value} onChange={onChange} style={{
        padding: '9px 12px', border: `1px solid ${C.border}`, borderRadius: 8,
        fontFamily: F.sans, fontSize: 14, color: C.text, background: C.surface, outline: 'none', cursor: 'pointer' }}>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

// Modal
function Modal({ open, onClose, title, children, width = 520, footer }) {
  if (!open) return null;
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(30,26,23,0.55)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20,
      backdropFilter: 'blur(3px)' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: C.surface, borderRadius: 16,
        width: '100%', maxWidth: width, maxHeight: '90vh', display: 'flex', flexDirection: 'column',
        boxShadow: '0 20px 60px rgba(0,0,0,0.18)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '20px 24px 16px', borderBottom: `1px solid ${C.border}` }}>
          <span style={{ fontFamily: F.serif, fontSize: 22, fontWeight: 600, color: C.text }}>{title}</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer',
            color: C.text3, fontSize: 20, lineHeight: 1, padding: 4 }}>✕</button>
        </div>
        <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>{children}</div>
        {footer && <div style={{ padding: '16px 24px', borderTop: `1px solid ${C.border}`,
          display: 'flex', justifyContent: 'flex-end', gap: 10 }}>{footer}</div>}
      </div>
    </div>
  );
}

// Card
function Card({ children, style = {}, onClick, hover = false }) {
  const [hov, setHov] = React.useState(false);
  return (
    <div onClick={onClick} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ background: C.surface, borderRadius: 12, border: `1px solid ${C.border}`,
        boxShadow: hov && hover ? '0 4px 20px rgba(0,0,0,0.08)' : '0 1px 4px rgba(0,0,0,0.04)',
        transition: 'all 0.2s', cursor: onClick ? 'pointer' : 'default',
        transform: hov && hover ? 'translateY(-1px)' : 'none', ...style }}>
      {children}
    </div>
  );
}

// KPI Card
function KpiCard({ label, value, sub, icon, color = C.accent }) {
  return (
    <Card style={{ padding: '20px 24px', flex: 1, minWidth: 140 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontFamily: F.sans, fontSize: 12, color: C.text3, fontWeight: 500,
            textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>{label}</div>
          <div style={{ fontFamily: F.serif, fontSize: 32, fontWeight: 600, color: C.text, lineHeight: 1 }}>{value}</div>
          {sub && <div style={{ fontFamily: F.sans, fontSize: 12, color: C.text3, marginTop: 6 }}>{sub}</div>}
        </div>
        <div style={{ width: 40, height: 40, borderRadius: 10, background: C.accentLight,
          display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.accent, fontSize: 18 }}>
          {icon}
        </div>
      </div>
    </Card>
  );
}

// Divider
function Divider({ style = {} }) {
  return <div style={{ height: 1, background: C.border, ...style }} />;
}

// Spinner
function Spinner({ size = 20, color = C.accent }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{ animation: 'vv-spin 0.8s linear infinite' }}>
      <circle cx="12" cy="12" r="10" fill="none" stroke={color} strokeWidth="2.5" strokeDasharray="31 31" strokeLinecap="round" />
    </svg>
  );
}

// Striped image placeholder
function ImgPlaceholder({ width = '100%', height = 200, label = '', style = {} }) {
  const id = React.useId ? React.useId() : Math.random().toString(36).slice(2);
  return (
    <div style={{ width, height, borderRadius: 8, overflow: 'hidden', position: 'relative',
      background: '#f0ebe3', display: 'flex', alignItems: 'center', justifyContent: 'center', ...style }}>
      <svg width="100%" height="100%" style={{ position: 'absolute', inset: 0 }}>
        <defs>
          <pattern id={`stripe-${id}`} width="12" height="12" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="12" height="12" fill="#f0ebe3" />
            <rect width="6" height="12" fill="#e6dfd6" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#stripe-${id})`} />
      </svg>
      {label && <span style={{ position: 'relative', fontFamily: 'monospace', fontSize: 11,
        color: C.text3, textAlign: 'center', padding: '0 16px', lineHeight: 1.5 }}>{label}</span>}
    </div>
  );
}

// Toggle
function Toggle({ checked, onChange }) {
  return (
    <div onClick={() => onChange(!checked)} style={{ width: 40, height: 22, borderRadius: 11,
      background: checked ? C.accent : C.border, cursor: 'pointer', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}>
      <div style={{ position: 'absolute', top: 3, left: checked ? 21 : 3,
        width: 16, height: 16, borderRadius: '50%', background: '#fff',
        transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
    </div>
  );
}

// Avatar
function Avatar({ name = '', size = 34, src }) {
  const initials = name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: C.accentLight,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: F.sans, fontSize: size * 0.35, fontWeight: 600, color: C.accentDark, flexShrink: 0 }}>
      {initials || '?'}
    </div>
  );
}

Object.assign(window, { C, F, VVLogo, Btn, Badge, Input, Select, Modal, Card, KpiCard, Divider, Spinner, ImgPlaceholder, Toggle, Avatar });
