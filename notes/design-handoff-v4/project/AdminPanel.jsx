
// AdminPanel.jsx — Store admin panel

const MOCK_PECAS = [
  { id: '1', nome: 'Blusa de Linho Branca', preco: 8900, tamanho: 'P, M, G', status: 'disponivel', fotos: 3, destaque: true },
  { id: '2', nome: 'Calça Wide Leg Bege', preco: 14900, tamanho: '36, 38, 40', status: 'disponivel', fotos: 4, destaque: false },
  { id: '3', nome: 'Vestido Midi Floral', preco: 18900, tamanho: 'P, M', status: 'disponivel', fotos: 5, destaque: true },
  { id: '4', nome: 'Cardigan Tricô Caramelo', preco: 12900, tamanho: 'Único', status: 'vendida', fotos: 2, destaque: false },
  { id: '5', nome: 'Shorts Jeans Vintage', preco: 7900, tamanho: '36, 38', status: 'disponivel', fotos: 3, destaque: false },
  { id: '6', nome: 'Blusa Cropped Listrada', preco: 6900, tamanho: 'P, M, G', status: 'vendida', fotos: 2, destaque: false },
  { id: '7', nome: 'Saia Midi Plissada', preco: 11900, tamanho: '36, 38, 40, 42', status: 'disponivel', fotos: 4, destaque: false },
  { id: '8', nome: 'Blazer Oversized Bege', preco: 21900, tamanho: 'P, M', status: 'disponivel', fotos: 3, destaque: true },
];

function formatPrice(cents) {
  return 'R$ ' + (cents / 100).toFixed(2).replace('.', ',');
}

const PLACEHOLDERS = [
  'foto de blusa clara, linho, fundo claro',
  'foto de calça wide leg, tom bege',
  'foto de vestido floral midi',
  'foto de cardigan caramelo',
  'foto de shorts jeans',
  'foto de blusa cropped listrada',
  'foto de saia plissada',
  'foto de blazer oversized',
];

// Sidebar navigation
function AdminSidebar({ section, setSection, loja }) {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: '⊞' },
    { id: 'pecas', label: 'Peças disponíveis', icon: '◈' },
    { id: 'todas', label: 'Todas as peças', icon: '≡' },
    { id: 'config', label: 'Configurações', icon: '⚙' },
  ];
  return (
    <aside style={{ width: 220, background: C.surface, borderRight: `1px solid ${C.border}`,
      display: 'flex', flexDirection: 'column', flexShrink: 0, height: '100%' }}>
      <div style={{ padding: '24px 20px 16px' }}>
        <VVLogo size={24} />
        <div style={{ marginTop: 20, padding: '12px 14px', background: C.surface2,
          borderRadius: 10, cursor: 'pointer' }}>
          <div style={{ fontFamily: F.sans, fontSize: 13, fontWeight: 600, color: C.text,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {loja.nome}
          </div>
          <div style={{ fontFamily: F.sans, fontSize: 11, color: C.text3, marginTop: 2 }}>
            vitrine.app/v/{loja.slug}
          </div>
        </div>
      </div>
      <nav style={{ flex: 1, padding: '4px 12px' }}>
        {navItems.map(item => {
          const active = section === item.id;
          return (
            <div key={item.id} onClick={() => setSection(item.id)}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
                borderRadius: 8, cursor: 'pointer', marginBottom: 2,
                background: active ? C.accentLight : 'transparent',
                color: active ? C.accentDark : C.text2,
                fontFamily: F.sans, fontSize: 14, fontWeight: active ? 600 : 400,
                transition: 'all 0.15s' }}>
              <span style={{ fontSize: 15 }}>{item.icon}</span>
              {item.label}
            </div>
          );
        })}
      </nav>
      <div style={{ padding: '16px 20px', borderTop: `1px solid ${C.border}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Avatar name={loja.nome} size={32} />
          <div>
            <div style={{ fontFamily: F.sans, fontSize: 13, fontWeight: 500, color: C.text }}>Laila Moura</div>
            <div style={{ fontFamily: F.sans, fontSize: 11, color: C.text3 }}>lojista</div>
          </div>
        </div>
      </div>
    </aside>
  );
}

// Dashboard section
function Dashboard({ pecas, setSection }) {
  const disponiveis = pecas.filter(p => p.status === 'disponivel').length;
  const vendidas = pecas.filter(p => p.status === 'vendida').length;
  const total = pecas.length;
  const cotaUsada = 147;
  const cotaTotal = 200;

  return (
    <div style={{ padding: '32px 36px', maxWidth: 900 }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontFamily: F.serif, fontSize: 28, fontWeight: 600, color: C.text, margin: 0 }}>
          Bom dia, Laila 👋
        </h1>
        <p style={{ fontFamily: F.sans, fontSize: 14, color: C.text2, margin: '6px 0 0' }}>
          Sua vitrine está ativa · Atualizado agora
        </p>
      </div>
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 28 }}>
        <KpiCard label="Disponíveis" value={disponiveis} sub="peças na vitrine" icon="◈" />
        <KpiCard label="Vendidas" value={vendidas} sub="este mês" icon="✓" color={C.success} />
        <KpiCard label="Total de peças" value={total} sub="cadastradas" icon="≡" />
        <KpiCard label="Provador IA" value={`${cotaUsada}/${cotaTotal}`} sub="usos este mês" icon="✦" color={C.warning} />
      </div>
      {/* Cota bar */}
      <Card style={{ padding: '20px 24px', marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <span style={{ fontFamily: F.sans, fontSize: 14, fontWeight: 500, color: C.text }}>
            Cota do Provador Virtual
          </span>
          <Badge label={`${cotaUsada} de ${cotaTotal} usos`} variant="warning" />
        </div>
        <div style={{ height: 8, background: C.border, borderRadius: 4, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${(cotaUsada/cotaTotal)*100}%`,
            background: `linear-gradient(90deg, ${C.accent}, ${C.warning})`, borderRadius: 4, transition: 'width 0.4s' }} />
        </div>
        <p style={{ fontFamily: F.sans, fontSize: 12, color: C.text3, margin: '8px 0 0' }}>
          Cota renova em 01/06/2026. {cotaTotal - cotaUsada} usos restantes.
        </p>
      </Card>
      {/* Quick actions */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <Btn variant="dark" icon={<span>+</span>} onClick={() => setSection('pecas')}>
          Cadastrar peça
        </Btn>
        <Btn variant="ghost" onClick={() => window.open('#', '_blank')}>
          Ver vitrine pública ↗
        </Btn>
      </div>
      {/* Recent */}
      <div style={{ marginTop: 32 }}>
        <div style={{ fontFamily: F.sans, fontSize: 13, fontWeight: 600, color: C.text2,
          textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 14 }}>Peças recentes</div>
        <Card>
          {pecas.slice(0, 5).map((p, i) => (
            <React.Fragment key={p.id}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 20px' }}>
                <ImgPlaceholder width={44} height={44} style={{ borderRadius: 8, flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: F.sans, fontSize: 14, fontWeight: 500, color: C.text,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.nome}</div>
                  <div style={{ fontFamily: F.sans, fontSize: 12, color: C.text3, marginTop: 2 }}>{p.tamanho}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
                  <span style={{ fontFamily: F.sans, fontSize: 14, fontWeight: 500, color: C.text }}>
                    {formatPrice(p.preco)}
                  </span>
                  <Badge label={p.status === 'disponivel' ? 'disponível' : 'vendida'}
                    variant={p.status === 'disponivel' ? 'disponivel' : 'vendida'} />
                </div>
              </div>
              {i < 4 && <Divider />}
            </React.Fragment>
          ))}
        </Card>
      </div>
    </div>
  );
}

// Piece form modal
function PecaFormModal({ open, onClose, peca, onSave }) {
  const [nome, setNome] = React.useState(peca?.nome || '');
  const [preco, setPreco] = React.useState(peca ? (peca.preco / 100).toFixed(2) : '');
  const [tamanho, setTamanho] = React.useState(peca?.tamanho || '');
  const [status, setStatus] = React.useState(peca?.status || 'disponivel');
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setNome(peca?.nome || ''); setPreco(peca ? (peca.preco / 100).toFixed(2) : '');
      setTamanho(peca?.tamanho || ''); setStatus(peca?.status || 'disponivel');
    }
  }, [open, peca]);

  function handleSave() {
    setSaving(true);
    setTimeout(() => { setSaving(false); onSave({ nome, preco: Math.round(parseFloat(preco) * 100), tamanho, status }); }, 700);
  }

  return (
    <Modal open={open} onClose={onClose} title={peca ? 'Editar peça' : 'Nova peça'}
      footer={<>
        <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
        <Btn variant="dark" onClick={handleSave} disabled={!nome || !preco}>
          {saving ? <Spinner size={14} color="#fff" /> : null}{saving ? 'Salvando...' : 'Salvar peça'}
        </Btn>
      </>}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <Input label="Nome da peça" value={nome} onChange={e => setNome(e.target.value)}
          placeholder="Ex: Blusa de linho branca" helper={`${nome.length}/100 caracteres`} />
        <div style={{ display: 'flex', gap: 14 }}>
          <Input label="Preço" value={preco} onChange={e => setPreco(e.target.value)}
            prefix="R$" type="number" style={{ flex: 1 }} />
          <Input label="Tamanho(s)" value={tamanho} onChange={e => setTamanho(e.target.value)}
            placeholder="P, M, G" style={{ flex: 1 }} />
        </div>
        <Select label="Status" value={status} onChange={e => setStatus(e.target.value)}
          options={[{ value: 'disponivel', label: 'Disponível' }, { value: 'vendida', label: 'Vendida' }]} />
        <div>
          <label style={{ fontFamily: F.sans, fontSize: 13, fontWeight: 500, color: C.text2, display: 'block', marginBottom: 8 }}>
            Fotos da peça
          </label>
          <div style={{ border: `2px dashed ${C.border}`, borderRadius: 10, padding: '28px 20px',
            textAlign: 'center', background: C.surface2, cursor: 'pointer' }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>📷</div>
            <div style={{ fontFamily: F.sans, fontSize: 14, color: C.text2, marginBottom: 4 }}>
              Arraste fotos ou clique para selecionar
            </div>
            <div style={{ fontFamily: F.sans, fontSize: 12, color: C.text3 }}>
              JPEG, PNG ou WebP · Máx 5 MB · Até 8 fotos
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}

// Pecas list section
function PecasList({ pecas, setPecas, showAll }) {
  const [modalOpen, setModalOpen] = React.useState(false);
  const [editPeca, setEditPeca] = React.useState(null);
  const [deleteId, setDeleteId] = React.useState(null);
  const [search, setSearch] = React.useState('');
  const [view, setView] = React.useState('grid');

  const filtered = pecas.filter(p => {
    const matchSearch = p.nome.toLowerCase().includes(search.toLowerCase());
    const matchStatus = showAll ? true : p.status === 'disponivel';
    return matchSearch && matchStatus;
  });

  function handleSave(data) {
    if (editPeca) {
      setPecas(prev => prev.map(p => p.id === editPeca.id ? { ...p, ...data } : p));
    } else {
      setPecas(prev => [...prev, { id: String(Date.now()), ...data, fotos: 0, destaque: false }]);
    }
    setModalOpen(false); setEditPeca(null);
  }

  function handleMarkSold(id) {
    setPecas(prev => prev.map(p => p.id === id ? { ...p, status: 'vendida' } : p));
  }

  function handleDelete(id) {
    setPecas(prev => prev.filter(p => p.id !== id));
    setDeleteId(null);
  }

  return (
    <div style={{ padding: '32px 36px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontFamily: F.serif, fontSize: 26, fontWeight: 600, color: C.text, margin: 0 }}>
            {showAll ? 'Todas as peças' : 'Peças disponíveis'}
          </h1>
          <p style={{ fontFamily: F.sans, fontSize: 14, color: C.text2, margin: '4px 0 0' }}>
            {filtered.length} {filtered.length === 1 ? 'peça encontrada' : 'peças encontradas'}
          </p>
        </div>
        <Btn variant="dark" icon={<span style={{ fontSize: 16, fontWeight: 300 }}>+</span>}
          onClick={() => { setEditPeca(null); setModalOpen(true); }}>
          Nova peça
        </Btn>
      </div>
      <div style={{ display: 'flex', gap: 12, marginBottom: 24, alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: 360 }}>
          <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
            color: C.text3, fontSize: 15 }}>🔍</span>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar peça..."
            style={{ width: '100%', padding: '9px 12px 9px 36px', border: `1px solid ${C.border}`,
              borderRadius: 8, fontFamily: F.sans, fontSize: 14, color: C.text,
              background: C.surface, outline: 'none', boxSizing: 'border-box' }} />
        </div>
        <div style={{ display: 'flex', border: `1px solid ${C.border}`, borderRadius: 8, overflow: 'hidden' }}>
          {['grid', 'list'].map(v => (
            <button key={v} onClick={() => setView(v)}
              style={{ padding: '8px 14px', background: view === v ? C.text : C.surface,
                color: view === v ? '#fff' : C.text2, border: 'none', cursor: 'pointer',
                fontFamily: F.sans, fontSize: 13, fontWeight: 500 }}>
              {v === 'grid' ? '⊞' : '≡'}
            </button>
          ))}
        </div>
      </div>
      {view === 'grid' ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 }}>
          {filtered.map((p, i) => (
            <Card key={p.id} hover style={{ overflow: 'hidden' }}>
              <ImgPlaceholder height={200} label={PLACEHOLDERS[i % PLACEHOLDERS.length]} />
              <div style={{ padding: '14px 16px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 6, marginBottom: 6 }}>
                  <span style={{ fontFamily: F.sans, fontSize: 14, fontWeight: 500, color: C.text, lineHeight: 1.3 }}>{p.nome}</span>
                  <Badge label={p.status === 'disponivel' ? 'disponível' : 'vendida'}
                    variant={p.status === 'disponivel' ? 'disponivel' : 'vendida'} />
                </div>
                <div style={{ fontFamily: F.sans, fontSize: 12, color: C.text3, marginBottom: 4 }}>{p.tamanho}</div>
                <div style={{ fontFamily: F.serif, fontSize: 18, fontWeight: 600, color: C.text, marginBottom: 12 }}>
                  {formatPrice(p.preco)}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <Btn variant="ghost" size="sm" onClick={() => { setEditPeca(p); setModalOpen(true); }}>Editar</Btn>
                  {p.status === 'disponivel' && (
                    <Btn variant="success" size="sm" onClick={() => handleMarkSold(p.id)}>Vendida</Btn>
                  )}
                  <Btn variant="text" size="sm" onClick={() => setDeleteId(p.id)} style={{ color: C.danger }}>✕</Btn>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          {filtered.map((p, i) => (
            <React.Fragment key={p.id}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 20px' }}>
                <ImgPlaceholder width={52} height={52} style={{ borderRadius: 8, flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: F.sans, fontSize: 14, fontWeight: 500, color: C.text }}>{p.nome}</div>
                  <div style={{ fontFamily: F.sans, fontSize: 12, color: C.text3, marginTop: 2 }}>
                    {p.tamanho} · {p.fotos} foto{p.fotos !== 1 ? 's' : ''}
                  </div>
                </div>
                <div style={{ fontFamily: F.serif, fontSize: 17, fontWeight: 600, color: C.text, flexShrink: 0 }}>
                  {formatPrice(p.preco)}
                </div>
                <Badge label={p.status === 'disponivel' ? 'disponível' : 'vendida'}
                  variant={p.status === 'disponivel' ? 'disponivel' : 'vendida'} />
                <div style={{ display: 'flex', gap: 8 }}>
                  <Btn variant="ghost" size="sm" onClick={() => { setEditPeca(p); setModalOpen(true); }}>Editar</Btn>
                  {p.status === 'disponivel' && (
                    <Btn variant="success" size="sm" onClick={() => handleMarkSold(p.id)}>Vendida ✓</Btn>
                  )}
                </div>
              </div>
              {i < filtered.length - 1 && <Divider />}
            </React.Fragment>
          ))}
        </Card>
      )}
      <PecaFormModal open={modalOpen} onClose={() => { setModalOpen(false); setEditPeca(null); }}
        peca={editPeca} onSave={handleSave} />
      <Modal open={!!deleteId} onClose={() => setDeleteId(null)} title="Excluir peça" width={400}
        footer={<>
          <Btn variant="ghost" onClick={() => setDeleteId(null)}>Cancelar</Btn>
          <Btn variant="danger" onClick={() => handleDelete(deleteId)}>Excluir</Btn>
        </>}>
        <p style={{ fontFamily: F.sans, fontSize: 14, color: C.text2, margin: 0 }}>
          Esta ação é irreversível. A peça e todas as suas fotos serão removidas da vitrine.
        </p>
      </Modal>
    </div>
  );
}

// Config section
function ConfigSection({ loja, setLoja }) {
  const [saved, setSaved] = React.useState(false);
  function handleSave() {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }
  return (
    <div style={{ padding: '32px 36px', maxWidth: 600 }}>
      <h1 style={{ fontFamily: F.serif, fontSize: 26, fontWeight: 600, color: C.text, margin: '0 0 8px' }}>
        Configurações da loja
      </h1>
      <p style={{ fontFamily: F.sans, fontSize: 14, color: C.text2, margin: '0 0 28px' }}>
        Personalize como sua vitrine aparece para os clientes.
      </p>
      <Card style={{ padding: '24px', marginBottom: 20 }}>
        <div style={{ fontFamily: F.sans, fontSize: 13, fontWeight: 600, color: C.text2,
          textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 16 }}>Identidade</div>
        <div style={{ display: 'flex', gap: 16, flexDirection: 'column' }}>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            <ImgPlaceholder width={72} height={72} style={{ borderRadius: 12, flexShrink: 0 }} label="logo" />
            <div>
              <Btn variant="ghost" size="sm">Enviar logo</Btn>
              <div style={{ fontFamily: F.sans, fontSize: 12, color: C.text3, marginTop: 6 }}>PNG ou JPG · Mín 200×200 px</div>
            </div>
          </div>
          <Input label="Nome da loja" value={loja.nome} onChange={e => setLoja(p => ({ ...p, nome: e.target.value }))} />
          <Input label="Slug da vitrine" value={loja.slug} onChange={e => setLoja(p => ({ ...p, slug: e.target.value }))}
            prefix="vitrine.app/v/" helper="Apenas letras minúsculas, números e hífens." />
        </div>
      </Card>
      <Card style={{ padding: '24px', marginBottom: 20 }}>
        <div style={{ fontFamily: F.sans, fontSize: 13, fontWeight: 600, color: C.text2,
          textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 16 }}>Contato & redes</div>
        <div style={{ display: 'flex', gap: 16, flexDirection: 'column' }}>
          <Input label="WhatsApp" value={loja.whatsapp} onChange={e => setLoja(p => ({ ...p, whatsapp: e.target.value }))}
            prefix="+55" placeholder="11 99999-9999" />
          <Input label="Instagram" value={loja.instagram} onChange={e => setLoja(p => ({ ...p, instagram: e.target.value }))}
            prefix="@" placeholder="atelierlaila" />
          <Input label="TikTok" value={loja.tiktok} onChange={e => setLoja(p => ({ ...p, tiktok: e.target.value }))}
            prefix="@" placeholder="atelierlaila" />
        </div>
      </Card>
      <Card style={{ padding: '24px', marginBottom: 24 }}>
        <div style={{ fontFamily: F.sans, fontSize: 13, fontWeight: 600, color: C.text2,
          textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 16 }}>Exibição</div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontFamily: F.sans, fontSize: 14, fontWeight: 500, color: C.text }}>Mostrar preço na vitrine</div>
            <div style={{ fontFamily: F.sans, fontSize: 12, color: C.text3, marginTop: 2 }}>
              Clientes verão o preço das peças publicamente
            </div>
          </div>
          <Toggle checked={loja.exibirPreco} onChange={v => setLoja(p => ({ ...p, exibirPreco: v }))} />
        </div>
      </Card>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <Btn variant="dark" onClick={handleSave}>Salvar configurações</Btn>
        {saved && <span style={{ fontFamily: F.sans, fontSize: 13, color: C.success }}>✓ Salvo com sucesso</span>}
      </div>
    </div>
  );
}

// Main admin panel
function AdminPanel() {
  const [section, setSection] = React.useState('dashboard');
  const [pecas, setPecas] = React.useState(MOCK_PECAS);
  const [loja, setLoja] = React.useState({
    nome: 'Atelier Laila', slug: 'atelier-laila',
    whatsapp: '11 99876-5432', instagram: 'atelierlaila', tiktok: 'atelierlaila', exibirPreco: false,
  });

  return (
    <div style={{ display: 'flex', height: '100%', background: C.bg, overflow: 'hidden' }}>
      <AdminSidebar section={section} setSection={setSection} loja={loja} />
      <main style={{ flex: 1, overflowY: 'auto' }}>
        {section === 'dashboard' && <Dashboard pecas={pecas} setSection={setSection} />}
        {section === 'pecas' && <PecasList pecas={pecas} setPecas={setPecas} showAll={false} />}
        {section === 'todas' && <PecasList pecas={pecas} setPecas={setPecas} showAll={true} />}
        {section === 'config' && <ConfigSection loja={loja} setLoja={setLoja} />}
      </main>
    </div>
  );
}

Object.assign(window, { AdminPanel, MOCK_PECAS, formatPrice });
