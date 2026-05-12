
// PublicVitrine.jsx — Public storefront (mobile + desktop views)

const VITRINE_PECAS = [
  { id: '1', nome: 'Blusa de Linho Branca', preco: 8900, tamanho: 'P · M · G', status: 'disponivel', label: 'blusa clara, linho, estilo minimalista' },
  { id: '2', nome: 'Calça Wide Leg Bege', preco: 14900, tamanho: '36 · 38 · 40', status: 'disponivel', label: 'calça wide leg, cor bege neutro' },
  { id: '3', nome: 'Vestido Midi Floral', preco: 18900, tamanho: 'P · M', status: 'disponivel', label: 'vestido midi com estampa floral suave' },
  { id: '4', nome: 'Saia Midi Plissada', preco: 11900, tamanho: '36 · 38 · 40 · 42', status: 'disponivel', label: 'saia plissada, tom areia' },
  { id: '5', nome: 'Shorts Jeans Vintage', preco: 7900, tamanho: '36 · 38', status: 'disponivel', label: 'shorts jeans delavê, estilo vintage' },
  { id: '6', nome: 'Blazer Oversized Bege', preco: 21900, tamanho: 'P · M', status: 'disponivel', label: 'blazer oversized, tom palha' },
];

const LOJA = { nome: 'Atelier Laila', slug: 'atelier-laila', instagram: '@atelierlaila', whatsapp: '5511998765432' };

// Mobile phone frame
function PhoneFrame({ children }) {
  return (
    <div style={{ position: 'relative', width: 320, flexShrink: 0 }}>
      {/* Frame */}
      <div style={{ position: 'relative', background: '#1a1614', borderRadius: 48,
        padding: '10px', boxShadow: '0 24px 60px rgba(0,0,0,0.3), inset 0 0 0 1px #333' }}>
        {/* Screen */}
        <div style={{ borderRadius: 40, overflow: 'hidden', background: C.bg, position: 'relative' }}>
          {/* Status bar */}
          <div style={{ height: 44, background: C.surface, display: 'flex', alignItems: 'center',
            justifyContent: 'space-between', padding: '0 24px', flexShrink: 0 }}>
            <span style={{ fontFamily: F.sans, fontSize: 12, fontWeight: 600, color: C.text }}>9:41</span>
            <div style={{ width: 100, height: 28, background: '#1a1614', borderRadius: 20,
              position: 'absolute', left: '50%', transform: 'translateX(-50%)' }} />
            <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
              <span style={{ fontSize: 10 }}>●●●</span>
              <span style={{ fontSize: 12 }}>📶</span>
              <span style={{ fontSize: 12 }}>🔋</span>
            </div>
          </div>
          {/* Content */}
          <div style={{ height: 620, overflowY: 'auto' }}>
            {children}
          </div>
          {/* Home bar */}
          <div style={{ height: 30, background: C.surface, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: 100, height: 4, background: C.border2, borderRadius: 2 }} />
          </div>
        </div>
      </div>
      <div style={{ textAlign: 'center', marginTop: 16, fontFamily: F.sans, fontSize: 12,
        color: C.text3, letterSpacing: '0.04em' }}>MOBILE</div>
    </div>
  );
}

// Desktop browser frame
function DesktopFrame({ children }) {
  return (
    <div style={{ flex: 1, minWidth: 560 }}>
      <div style={{ background: '#e8e2db', borderRadius: 12, overflow: 'hidden',
        boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}>
        {/* Browser chrome */}
        <div style={{ background: '#f0ebe4', padding: '10px 16px', display: 'flex',
          alignItems: 'center', gap: 10 }}>
          <div style={{ display: 'flex', gap: 6 }}>
            {['#ff5f57','#febc2e','#28c840'].map(c => (
              <div key={c} style={{ width: 12, height: 12, borderRadius: '50%', background: c }} />
            ))}
          </div>
          <div style={{ flex: 1, background: '#fff', borderRadius: 6, padding: '5px 12px',
            fontFamily: F.sans, fontSize: 12, color: C.text3 }}>
            vitrine.app/v/atelier-laila
          </div>
        </div>
        {/* Content */}
        <div style={{ height: 600, overflowY: 'auto', background: C.bg }}>
          {children}
        </div>
      </div>
      <div style={{ textAlign: 'center', marginTop: 16, fontFamily: F.sans, fontSize: 12,
        color: C.text3, letterSpacing: '0.04em' }}>DESKTOP</div>
    </div>
  );
}

// Product card — mobile version
function MobilePecaCard({ peca, onTryOn, showPrice }) {
  const [hov, setHov] = React.useState(false);
  return (
    <div onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ background: C.surface, borderRadius: 12, overflow: 'hidden',
        boxShadow: hov ? '0 6px 20px rgba(0,0,0,0.1)' : '0 1px 6px rgba(0,0,0,0.05)',
        transition: 'box-shadow 0.2s' }}>
      <ImgPlaceholder height={160} label={peca.label} />
      <div style={{ padding: '10px 12px 12px' }}>
        <div style={{ fontFamily: F.sans, fontSize: 13, fontWeight: 500, color: C.text,
          marginBottom: 2, lineHeight: 1.3 }}>{peca.nome}</div>
        <div style={{ fontFamily: F.sans, fontSize: 11, color: C.text3, marginBottom: 6 }}>{peca.tamanho}</div>
        {showPrice && (
          <div style={{ fontFamily: F.serif, fontSize: 15, fontWeight: 600, color: C.text, marginBottom: 8 }}>
            {formatPrice(peca.preco)}
          </div>
        )}
        <button onClick={() => onTryOn(peca)}
          style={{ width: '100%', padding: '8px', background: C.text, color: '#fff',
            border: 'none', borderRadius: 8, fontFamily: F.sans, fontSize: 12, fontWeight: 500,
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
          <span>✦</span> Provar virtualmente
        </button>
      </div>
    </div>
  );
}

// Product card — desktop version
function DesktopPecaCard({ peca, onTryOn, showPrice }) {
  const [hov, setHov] = React.useState(false);
  return (
    <div onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ background: C.surface, borderRadius: 14, overflow: 'hidden', cursor: 'pointer',
        boxShadow: hov ? '0 8px 30px rgba(0,0,0,0.1)' : '0 2px 8px rgba(0,0,0,0.05)',
        transform: hov ? 'translateY(-2px)' : 'none', transition: 'all 0.22s' }}>
      <div style={{ position: 'relative' }}>
        <ImgPlaceholder height={260} label={peca.label} />
        {hov && (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(30,26,23,0.35)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'opacity 0.2s' }}>
            <button onClick={() => onTryOn(peca)}
              style={{ background: C.surface, color: C.text, border: 'none', borderRadius: 24,
                padding: '10px 20px', fontFamily: F.sans, fontSize: 14, fontWeight: 600,
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span>✦</span> Provar
            </button>
          </div>
        )}
      </div>
      <div style={{ padding: '14px 16px 18px' }}>
        <div style={{ fontFamily: F.sans, fontSize: 15, fontWeight: 500, color: C.text, marginBottom: 4 }}>{peca.nome}</div>
        <div style={{ fontFamily: F.sans, fontSize: 12, color: C.text3, marginBottom: 8 }}>{peca.tamanho}</div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {showPrice
            ? <span style={{ fontFamily: F.serif, fontSize: 20, fontWeight: 600, color: C.text }}>{formatPrice(peca.preco)}</span>
            : <span style={{ fontFamily: F.sans, fontSize: 12, color: C.text3 }}>Consulte o preço</span>}
          <button onClick={() => onTryOn(peca)}
            style={{ background: C.accentLight, color: C.accentDark, border: 'none',
              borderRadius: 8, padding: '6px 12px', fontFamily: F.sans, fontSize: 12,
              fontWeight: 600, cursor: 'pointer' }}>
            ✦ Provar
          </button>
        </div>
      </div>
    </div>
  );
}

// Mobile vitrine content
function MobileVitrineContent({ onTryOn, showPrice }) {
  return (
    <div style={{ background: C.bg }}>
      {/* Header */}
      <div style={{ background: C.surface, padding: '16px 16px 14px',
        borderBottom: `1px solid ${C.border}`, position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ textAlign: 'center', marginBottom: 10 }}>
          <div style={{ fontFamily: F.serif, fontSize: 22, fontWeight: 600, color: C.text, letterSpacing: '0.02em' }}>
            {LOJA.nome}
          </div>
          <div style={{ fontFamily: F.sans, fontSize: 11, color: C.text3, marginTop: 2 }}>
            {LOJA.instagram}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
          <a href="#" style={{ fontFamily: F.sans, fontSize: 11, color: C.text2, textDecoration: 'none',
            padding: '5px 10px', background: C.surface2, borderRadius: 20 }}>Instagram</a>
          <a href="#" style={{ fontFamily: F.sans, fontSize: 11, color: C.text2, textDecoration: 'none',
            padding: '5px 10px', background: C.surface2, borderRadius: 20 }}>TikTok</a>
          <a href={`https://wa.me/${LOJA.whatsapp}`} target="_blank"
            style={{ fontFamily: F.sans, fontSize: 11, color: '#fff', textDecoration: 'none',
              padding: '5px 10px', background: '#25d366', borderRadius: 20 }}>WhatsApp</a>
        </div>
      </div>
      {/* Grid */}
      <div style={{ padding: '14px 12px' }}>
        <div style={{ fontFamily: F.sans, fontSize: 11, color: C.text3, marginBottom: 10, textAlign: 'center' }}>
          {VITRINE_PECAS.length} peças disponíveis
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {VITRINE_PECAS.map(p => (
            <MobilePecaCard key={p.id} peca={p} onTryOn={onTryOn} showPrice={showPrice} />
          ))}
        </div>
        {/* WhatsApp sticky */}
        <div style={{ marginTop: 20, padding: '14px', background: '#25d366', borderRadius: 12,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer' }}>
          <span style={{ fontSize: 18 }}>📱</span>
          <span style={{ fontFamily: F.sans, fontSize: 13, fontWeight: 600, color: '#fff' }}>
            Falar com a loja
          </span>
        </div>
        <div style={{ marginTop: 20, textAlign: 'center', fontFamily: F.sans, fontSize: 10, color: C.text3 }}>
          Vitrine criada com <span style={{ color: C.accent }}>vitrine.app</span>
        </div>
      </div>
    </div>
  );
}

// Desktop vitrine content
function DesktopVitrineContent({ onTryOn, showPrice }) {
  return (
    <div style={{ background: C.bg, minHeight: '100%' }}>
      {/* Header */}
      <div style={{ background: C.surface, borderBottom: `1px solid ${C.border}`, padding: '0 48px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          height: 64 }}>
          <div>
            <span style={{ fontFamily: F.serif, fontSize: 26, fontWeight: 600, color: C.text, letterSpacing: '0.02em' }}>
              {LOJA.nome}
            </span>
          </div>
          <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
            <a href="#" style={{ fontFamily: F.sans, fontSize: 13, color: C.text2, textDecoration: 'none' }}>Instagram</a>
            <a href="#" style={{ fontFamily: F.sans, fontSize: 13, color: C.text2, textDecoration: 'none' }}>TikTok</a>
            <a href={`https://wa.me/${LOJA.whatsapp}`} target="_blank"
              style={{ fontFamily: F.sans, fontSize: 13, fontWeight: 600, color: '#fff', textDecoration: 'none',
                background: '#25d366', padding: '8px 18px', borderRadius: 24 }}>
              📱 WhatsApp
            </a>
          </div>
        </div>
      </div>
      {/* Hero strip */}
      <div style={{ background: C.accentLight, padding: '20px 48px', display: 'flex',
        alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontFamily: F.serif, fontSize: 16, fontWeight: 500, color: C.accentDark }}>
            ✦ Provador virtual com IA — experimente antes de comprar
          </div>
        </div>
        <div style={{ fontFamily: F.sans, fontSize: 12, color: C.accentDark }}>
          Passe o mouse sobre qualquer peça para provar
        </div>
      </div>
      {/* Grid */}
      <div style={{ padding: '32px 48px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ fontFamily: F.serif, fontSize: 22, fontWeight: 500, color: C.text }}>
            Peças disponíveis
          </div>
          <div style={{ fontFamily: F.sans, fontSize: 13, color: C.text3 }}>
            {VITRINE_PECAS.length} itens
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
          {VITRINE_PECAS.map(p => (
            <DesktopPecaCard key={p.id} peca={p} onTryOn={onTryOn} showPrice={showPrice} />
          ))}
        </div>
        <div style={{ marginTop: 32, textAlign: 'center', fontFamily: F.sans, fontSize: 12, color: C.text3 }}>
          Vitrine criada com <span style={{ color: C.accent, fontWeight: 500 }}>vitrine.app</span> · Moda feminina casual
        </div>
      </div>
    </div>
  );
}

// Main public vitrine section with side-by-side views
function PublicVitrine({ onTryOn: onTryOnProp }) {
  const [tryOnPeca, setTryOnPeca] = React.useState(null);
  const [showPrice, setShowPrice] = React.useState(false);

  function handleTryOn(peca) {
    setTryOnPeca(peca);
    if (onTryOnProp) onTryOnProp(peca);
  }

  return (
    <div style={{ background: C.surface3, minHeight: '100%' }}>
      {/* View controls */}
      <div style={{ background: C.surface, borderBottom: `1px solid ${C.border}`,
        padding: '12px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontFamily: F.sans, fontSize: 13, color: C.text2, fontWeight: 500 }}>
          Preview da Vitrine Pública
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Toggle checked={showPrice} onChange={setShowPrice} />
            <span style={{ fontFamily: F.sans, fontSize: 13, color: C.text2 }}>Mostrar preços</span>
          </div>
          <a href="#" style={{ fontFamily: F.sans, fontSize: 12, color: C.accent,
            textDecoration: 'none', fontWeight: 500 }}>Abrir em nova aba ↗</a>
        </div>
      </div>
      {/* Side-by-side */}
      <div style={{ padding: '40px 32px', display: 'flex', gap: 40, alignItems: 'flex-start',
        overflowX: 'auto', minWidth: 0 }}>
        <PhoneFrame>
          <MobileVitrineContent onTryOn={handleTryOn} showPrice={showPrice} />
        </PhoneFrame>
        <DesktopFrame>
          <DesktopVitrineContent onTryOn={handleTryOn} showPrice={showPrice} />
        </DesktopFrame>
      </div>
      {/* Try-on modal */}
      <TryOnModal open={!!tryOnPeca} onClose={() => setTryOnPeca(null)} peca={tryOnPeca} />
    </div>
  );
}

Object.assign(window, { PublicVitrine, VITRINE_PECAS, LOJA });
