
// SuperAdmin.jsx — Super-admin panel (Francisco's view)

const MOCK_LOJAS = [
  { id: '1', nome: 'Atelier Laila', slug: 'atelier-laila', email: 'laila@atelierlaila.com', pecas: 8, vendidas: 2, tryOns: 147, cota: 200, ativa: true, criada: '10/03/2026' },
  { id: '2', nome: 'Closet da Bê', slug: 'closet-da-be', email: 'beatriz@closetdabe.com.br', pecas: 14, vendidas: 5, tryOns: 88, cota: 200, ativa: true, criada: '18/03/2026' },
  { id: '3', nome: 'Studio Manu', slug: 'studio-manu', email: 'manu@studiomanu.com', pecas: 22, vendidas: 11, tryOns: 193, cota: 200, ativa: true, criada: '01/04/2026' },
  { id: '4', nome: 'Arara da Carol', slug: 'arara-da-carol', email: 'carol@araradacarol.com', pecas: 6, vendidas: 0, tryOns: 12, cota: 100, ativa: false, criada: '20/04/2026' },
];

function SuperAdminHeader() {
  return (
    <div style={{ background: C.surface, borderBottom: `1px solid ${C.border}`,
      padding: '0 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      height: 60, flexShrink: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <VVLogo size={24} />
        <div style={{ width: 1, height: 20, background: C.border }} />
        <div>
          <span style={{ fontFamily: F.sans, fontSize: 13, fontWeight: 600, color: C.text }}>Super-Admin</span>
          <Badge label="Francisco" variant="admin" style={{ marginLeft: 8 }} />
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Avatar name="Francisco" size={32} />
        <div style={{ fontFamily: F.sans, fontSize: 13, color: C.text2 }}>francisco.efjr@gmail.com</div>
      </div>
    </div>
  );
}

function CreateLojaModal({ open, onClose, onCreate }) {
  const [nome, setNome] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [slug, setSlug] = React.useState('');
  const [cota, setCota] = React.useState('200');
  const [saving, setSaving] = React.useState(false);
  const [done, setDone] = React.useState(false);

  React.useEffect(() => {
    if (open) { setNome(''); setEmail(''); setSlug(''); setCota('200'); setDone(false); }
  }, [open]);

  React.useEffect(() => {
    setSlug(nome.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''));
  }, [nome]);

  function handleCreate() {
    setSaving(true);
    setTimeout(() => {
      setSaving(false); setDone(true);
      onCreate({ id: String(Date.now()), nome, slug, email, pecas: 0, vendidas: 0, tryOns: 0, cota: parseInt(cota), ativa: true, criada: new Date().toLocaleDateString('pt-BR') });
      setTimeout(onClose, 1500);
    }, 800);
  }

  return (
    <Modal open={open} onClose={onClose} title="Nova loja" width={500}
      footer={!done && <>
        <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
        <Btn variant="dark" onClick={handleCreate} disabled={!nome || !email}>
          {saving ? <><Spinner size={14} color="#fff" /> Criando...</> : 'Criar loja + enviar convite'}
        </Btn>
      </>}>
      {done ? (
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>✉️</div>
          <div style={{ fontFamily: F.serif, fontSize: 20, fontWeight: 600, color: C.text, marginBottom: 8 }}>
            Loja criada com sucesso!
          </div>
          <div style={{ fontFamily: F.sans, fontSize: 14, color: C.text2 }}>
            Convite enviado para <strong>{email}</strong>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Input label="Nome da loja" value={nome} onChange={e => setNome(e.target.value)} placeholder="Ex: Studio Manu" />
          <Input label="E-mail da lojista" value={email} onChange={e => setEmail(e.target.value)}
            placeholder="lojista@email.com" type="email"
            helper="Um convite com magic link será enviado automaticamente." />
          <Input label="Slug da vitrine" value={slug} onChange={e => setSlug(e.target.value)}
            prefix="vitrine.app/v/" helper="Gerado automaticamente, editável." />
          <Input label="Cota mensal de try-ons" value={cota} onChange={e => setCota(e.target.value)}
            type="number" suffix="usos/mês" />
        </div>
      )}
    </Modal>
  );
}

function LojaRow({ loja, onToggle }) {
  const cotaPct = Math.round((loja.tryOns / loja.cota) * 100);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '16px 24px' }}>
      <Avatar name={loja.nome} size={40} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
          <span style={{ fontFamily: F.sans, fontSize: 14, fontWeight: 600, color: C.text }}>{loja.nome}</span>
          <Badge label={loja.ativa ? 'ativa' : 'inativa'} variant={loja.ativa ? 'disponivel' : 'vendida'} />
        </div>
        <div style={{ fontFamily: F.sans, fontSize: 12, color: C.text3 }}>
          {loja.email} · criada em {loja.criada}
        </div>
      </div>
      {/* Stats */}
      <div style={{ textAlign: 'center', minWidth: 60 }}>
        <div style={{ fontFamily: F.serif, fontSize: 20, fontWeight: 600, color: C.text }}>{loja.pecas}</div>
        <div style={{ fontFamily: F.sans, fontSize: 11, color: C.text3 }}>peças</div>
      </div>
      <div style={{ textAlign: 'center', minWidth: 60 }}>
        <div style={{ fontFamily: F.serif, fontSize: 20, fontWeight: 600, color: C.success }}>{loja.vendidas}</div>
        <div style={{ fontFamily: F.sans, fontSize: 11, color: C.text3 }}>vendidas</div>
      </div>
      {/* Cota bar */}
      <div style={{ minWidth: 120 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
          <span style={{ fontFamily: F.sans, fontSize: 11, color: C.text3 }}>Provador IA</span>
          <span style={{ fontFamily: F.sans, fontSize: 11, color: cotaPct > 80 ? C.danger : C.text3 }}>
            {loja.tryOns}/{loja.cota}
          </span>
        </div>
        <div style={{ height: 5, background: C.border, borderRadius: 3, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${Math.min(cotaPct, 100)}%`,
            background: cotaPct > 80 ? C.danger : C.accent, borderRadius: 3, transition: 'width 0.4s' }} />
        </div>
      </div>
      {/* Actions */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
        <Btn variant="ghost" size="sm">Editar</Btn>
        <Toggle checked={loja.ativa} onChange={v => onToggle(loja.id, v)} />
      </div>
    </div>
  );
}

function SystemSettings() {
  const [tryOnEnabled, setTryOnEnabled] = React.useState(true);
  const [budget, setBudget] = React.useState('100');
  const [saved, setSaved] = React.useState(false);

  function handleSave() {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <Card style={{ padding: '24px', marginTop: 24 }}>
      <div style={{ fontFamily: F.sans, fontSize: 13, fontWeight: 600, color: C.text2,
        textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 20 }}>
        Configurações globais do sistema
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px', background: tryOnEnabled ? C.successLight : C.dangerLight, borderRadius: 10 }}>
          <div>
            <div style={{ fontFamily: F.sans, fontSize: 15, fontWeight: 600, color: C.text }}>
              Kill switch global — Provador IA
            </div>
            <div style={{ fontFamily: F.sans, fontSize: 12, color: C.text2, marginTop: 4 }}>
              Desligar desativa o provador em <strong>todas</strong> as lojas imediatamente
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Badge label={tryOnEnabled ? 'ON' : 'OFF'} variant={tryOnEnabled ? 'disponivel' : 'vendida'} />
            <Toggle checked={tryOnEnabled} onChange={setTryOnEnabled} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 16, alignItems: 'flex-end' }}>
          <Input label="Orçamento mensal total de IA (US$)" value={budget}
            onChange={e => setBudget(e.target.value)} type="number" prefix="US$"
            helper="Ao atingir o limite, o kill switch é ativado automaticamente."
            style={{ flex: 1 }} />
          <Btn variant="dark" onClick={handleSave} style={{ marginBottom: 2 }}>
            {saved ? '✓ Salvo' : 'Salvar'}
          </Btn>
        </div>
      </div>
    </Card>
  );
}

function SuperAdmin() {
  const [lojas, setLojas] = React.useState(MOCK_LOJAS);
  const [createOpen, setCreateOpen] = React.useState(false);

  const totalPecas = lojas.reduce((a, l) => a + l.pecas, 0);
  const totalVendidas = lojas.reduce((a, l) => a + l.vendidas, 0);
  const totalTryOns = lojas.reduce((a, l) => a + l.tryOns, 0);
  const estimatedCost = (totalTryOns * 0.06).toFixed(2);

  function handleToggle(id, v) {
    setLojas(prev => prev.map(l => l.id === id ? { ...l, ativa: v } : l));
  }

  function handleCreate(loja) {
    setLojas(prev => [...prev, loja]);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: C.bg, overflow: 'hidden' }}>
      <SuperAdminHeader />
      <div style={{ flex: 1, overflowY: 'auto', padding: '32px 36px' }}>
        {/* KPIs */}
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontFamily: F.serif, fontSize: 26, fontWeight: 600, color: C.text, margin: '0 0 16px' }}>
            Visão geral da plataforma
          </h1>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <KpiCard label="Lojas ativas" value={lojas.filter(l => l.ativa).length} sub={`de ${lojas.length} cadastradas`} icon="🏪" />
            <KpiCard label="Peças na plataforma" value={totalPecas} sub="em todas as vitrines" icon="◈" />
            <KpiCard label="Peças vendidas" value={totalVendidas} sub="este mês" icon="✓" color={C.success} />
            <KpiCard label="Try-ons este mês" value={totalTryOns} sub={`≈ US$ ${estimatedCost} estimado`} icon="✦" color={C.warning} />
          </div>
        </div>
        {/* Lojas */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ fontFamily: F.sans, fontSize: 13, fontWeight: 600, color: C.text2,
            textTransform: 'uppercase', letterSpacing: '0.06em' }}>Lojas cadastradas</div>
          <Btn variant="dark" icon={<span>+</span>} onClick={() => setCreateOpen(true)}>
            Nova loja + convite
          </Btn>
        </div>
        <Card>
          {lojas.map((loja, i) => (
            <React.Fragment key={loja.id}>
              <LojaRow loja={loja} onToggle={handleToggle} />
              {i < lojas.length - 1 && <Divider />}
            </React.Fragment>
          ))}
        </Card>
        <SystemSettings />
      </div>
      <CreateLojaModal open={createOpen} onClose={() => setCreateOpen(false)} onCreate={handleCreate} />
    </div>
  );
}

Object.assign(window, { SuperAdmin });
