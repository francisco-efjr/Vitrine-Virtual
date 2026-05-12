
// TryOnModal.jsx — Virtual try-on flow (4 steps)

function TryOnModal({ open, onClose, peca }) {
  const [step, setStep] = React.useState(0); // 0=choose, 1=preview, 2=loading, 3=result
  const [progress, setProgress] = React.useState(0);
  const [agreed, setAgreed] = React.useState(false);

  React.useEffect(() => {
    if (!open) { setTimeout(() => { setStep(0); setProgress(0); setAgreed(false); }, 300); }
  }, [open]);

  React.useEffect(() => {
    if (step === 2) {
      setProgress(0);
      const messages = ['Verificando segurança...', 'Enviando para IA...', 'Processando peça...', 'Gerando resultado...'];
      let p = 0;
      const interval = setInterval(() => {
        p += Math.random() * 18 + 4;
        if (p >= 100) { p = 100; clearInterval(interval); setTimeout(() => setStep(3), 500); }
        setProgress(Math.min(p, 100));
      }, 300);
      return () => clearInterval(interval);
    }
  }, [step]);

  if (!open) return null;

  const steps = ['Escolher foto', 'Confirmar', 'Processando', 'Resultado'];

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 2000,
      background: 'rgba(20,16,14,0.7)', display: 'flex', alignItems: 'center',
      justifyContent: 'center', padding: 20, backdropFilter: 'blur(6px)' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: C.surface, borderRadius: 20,
        width: '100%', maxWidth: 480, boxShadow: '0 32px 80px rgba(0,0,0,0.25)',
        overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>

        {/* Header */}
        <div style={{ padding: '20px 24px 16px', borderBottom: `1px solid ${C.border}`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontFamily: F.serif, fontSize: 20, fontWeight: 600, color: C.text }}>
              Provador Virtual
            </div>
            {peca && <div style={{ fontFamily: F.sans, fontSize: 13, color: C.text3, marginTop: 2 }}>
              {peca.nome}
            </div>}
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer',
            color: C.text3, fontSize: 18, padding: 4 }}>✕</button>
        </div>

        {/* Step indicator */}
        <div style={{ display: 'flex', padding: '14px 24px', gap: 6, alignItems: 'center' }}>
          {steps.map((s, i) => (
            <React.Fragment key={i}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 22, height: 22, borderRadius: '50%', display: 'flex',
                  alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  background: i < step ? C.success : i === step ? C.accent : C.border,
                  transition: 'background 0.3s' }}>
                  {i < step
                    ? <span style={{ fontSize: 11, color: '#fff' }}>✓</span>
                    : <span style={{ fontSize: 11, color: i === step ? '#fff' : C.text3, fontFamily: F.sans, fontWeight: 600 }}>{i + 1}</span>}
                </div>
                <span style={{ fontFamily: F.sans, fontSize: 12, color: i === step ? C.text : C.text3,
                  fontWeight: i === step ? 600 : 400, display: window.innerWidth < 400 ? 'none' : 'block' }}>{s}</span>
              </div>
              {i < steps.length - 1 && <div style={{ flex: 1, height: 1, background: i < step ? C.success : C.border, transition: 'background 0.3s' }} />}
            </React.Fragment>
          ))}
        </div>

        {/* Step content */}
        <div style={{ padding: '8px 24px 24px', minHeight: 340 }}>

          {/* Step 0 — Choose photo */}
          {step === 0 && (
            <div>
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontFamily: F.sans, fontSize: 14, fontWeight: 500, color: C.text, marginBottom: 4 }}>
                  Como você quer enviar sua foto?
                </div>
                <div style={{ fontFamily: F.sans, fontSize: 13, color: C.text3 }}>
                  Sua foto não será armazenada. É usada apenas para gerar a simulação.
                </div>
              </div>
              <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
                {[
                  { icon: '📷', label: 'Tirar foto', sub: 'Use a câmera agora' },
                  { icon: '🖼', label: 'Galeria', sub: 'Escolha do celular' },
                ].map(opt => (
                  <div key={opt.label} onClick={() => agreed && setStep(1)}
                    style={{ flex: 1, border: `2px solid ${agreed ? C.border : C.border}`,
                      borderRadius: 12, padding: '20px 16px', textAlign: 'center',
                      cursor: agreed ? 'pointer' : 'not-allowed', opacity: agreed ? 1 : 0.5,
                      transition: 'all 0.15s', background: C.surface2 }}>
                    <div style={{ fontSize: 28, marginBottom: 8 }}>{opt.icon}</div>
                    <div style={{ fontFamily: F.sans, fontSize: 14, fontWeight: 600, color: C.text }}>{opt.label}</div>
                    <div style={{ fontFamily: F.sans, fontSize: 12, color: C.text3, marginTop: 4 }}>{opt.sub}</div>
                  </div>
                ))}
              </div>
              {/* Consent */}
              <div onClick={() => setAgreed(!agreed)}
                style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer',
                  padding: '12px 14px', background: C.accentLight, borderRadius: 10, marginBottom: 16 }}>
                <div style={{ width: 18, height: 18, border: `2px solid ${agreed ? C.accent : C.border2}`,
                  borderRadius: 4, background: agreed ? C.accent : '#fff', display: 'flex',
                  alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1, transition: 'all 0.15s' }}>
                  {agreed && <span style={{ color: '#fff', fontSize: 11, lineHeight: 1 }}>✓</span>}
                </div>
                <span style={{ fontFamily: F.sans, fontSize: 12, color: C.text2, lineHeight: 1.5 }}>
                  Concordo com o uso da minha foto para gerar a simulação. Ela não será armazenada após o processamento.
                </span>
              </div>
              <div style={{ fontFamily: F.sans, fontSize: 11, color: C.text3, textAlign: 'center' }}>
                Dúvidas? Leia nossa{' '}
                <span style={{ color: C.accent, textDecoration: 'underline', cursor: 'pointer' }}>
                  política de privacidade
                </span>
              </div>
            </div>
          )}

          {/* Step 1 — Photo preview + confirm */}
          {step === 1 && (
            <div>
              <div style={{ fontFamily: F.sans, fontSize: 14, color: C.text2, marginBottom: 16 }}>
                Foto selecionada:
              </div>
              <div style={{ display: 'flex', gap: 16, marginBottom: 20 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: F.sans, fontSize: 12, color: C.text3, marginBottom: 6 }}>Sua foto</div>
                  <ImgPlaceholder height={200} label="foto da cliente&#10;(simulação)" style={{ borderRadius: 12 }} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: F.sans, fontSize: 12, color: C.text3, marginBottom: 6 }}>Peça selecionada</div>
                  <ImgPlaceholder height={200} label={peca ? peca.nome : 'foto da peça'} style={{ borderRadius: 12 }} />
                </div>
              </div>
              <div style={{ background: C.surface2, borderRadius: 10, padding: '12px 16px', marginBottom: 20 }}>
                <div style={{ fontFamily: F.sans, fontSize: 12, color: C.text2, lineHeight: 1.6 }}>
                  ✓ Foto validada · ✓ Formato aceito · ✓ Tamanho adequado
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <Btn variant="ghost" onClick={() => setStep(0)}>Trocar foto</Btn>
                <Btn variant="dark" onClick={() => setStep(2)} style={{ flex: 1 }}>
                  Gerar simulação ✦
                </Btn>
              </div>
            </div>
          )}

          {/* Step 2 — Loading */}
          {step === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center',
              justifyContent: 'center', padding: '32px 0' }}>
              <div style={{ position: 'relative', width: 80, height: 80, marginBottom: 24 }}>
                <svg width="80" height="80" viewBox="0 0 80 80" style={{ animation: 'vv-spin 2s linear infinite' }}>
                  <circle cx="40" cy="40" r="34" fill="none" stroke={C.border} strokeWidth="4" />
                  <circle cx="40" cy="40" r="34" fill="none" stroke={C.accent} strokeWidth="4"
                    strokeDasharray={`${progress * 2.14} 214`} strokeLinecap="round"
                    style={{ transition: 'stroke-dasharray 0.3s' }} />
                </svg>
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center',
                  justifyContent: 'center', fontFamily: F.serif, fontSize: 18, fontWeight: 600, color: C.text }}>
                  {Math.round(progress)}%
                </div>
              </div>
              <div style={{ fontFamily: F.serif, fontSize: 20, fontWeight: 600, color: C.text, marginBottom: 8 }}>
                Gerando sua prova virtual
              </div>
              <div style={{ fontFamily: F.sans, fontSize: 13, color: C.text3, textAlign: 'center', lineHeight: 1.6 }}>
                Nossa IA está combinando sua foto<br />com a peça selecionada
              </div>
              <div style={{ marginTop: 24, display: 'flex', gap: 6 }}>
                {[0, 1, 2].map(i => (
                  <div key={i} style={{ width: 8, height: 8, borderRadius: '50%', background: C.accent,
                    animation: `vv-bounce 1.2s ease-in-out ${i * 0.2}s infinite` }} />
                ))}
              </div>
            </div>
          )}

          {/* Step 3 — Result */}
          {step === 3 && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <div style={{ width: 24, height: 24, borderRadius: '50%', background: C.successLight,
                  display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ color: C.success, fontSize: 13 }}>✓</span>
                </div>
                <span style={{ fontFamily: F.sans, fontSize: 14, fontWeight: 500, color: C.success }}>
                  Prova gerada com sucesso!
                </span>
              </div>
              <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: F.sans, fontSize: 11, color: C.text3, marginBottom: 6, textAlign: 'center' }}>Antes</div>
                  <ImgPlaceholder height={240} label="foto original&#10;da cliente" style={{ borderRadius: 12 }} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: F.sans, fontSize: 11, color: C.text3, marginBottom: 6, textAlign: 'center' }}>Com a peça</div>
                  <div style={{ position: 'relative', height: 240, borderRadius: 12, overflow: 'hidden',
                    background: '#f0ebe3', border: `2px solid ${C.accent}` }}>
                    <ImgPlaceholder height={240} label="resultado da&#10;prova virtual&#10;(IA FASHN)" style={{ borderRadius: 0 }} />
                    <div style={{ position: 'absolute', top: 8, right: 8 }}>
                      <Badge label="✦ IA" variant="admin" />
                    </div>
                  </div>
                </div>
              </div>
              {peca && (
                <div style={{ background: C.surface2, borderRadius: 10, padding: '14px 16px', marginBottom: 16,
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontFamily: F.sans, fontSize: 14, fontWeight: 500, color: C.text }}>{peca.nome}</div>
                    <div style={{ fontFamily: F.sans, fontSize: 12, color: C.text3 }}>{peca.tamanho}</div>
                  </div>
                  <div style={{ fontFamily: F.serif, fontSize: 18, fontWeight: 600, color: C.text }}>
                    {formatPrice(peca.preco)}
                  </div>
                </div>
              )}
              <div style={{ display: 'flex', gap: 10, flexDirection: 'column' }}>
                <Btn variant="success" size="lg" style={{ width: '100%', justifyContent: 'center' }}
                  icon={<span>📱</span>}
                  onClick={() => window.open(`https://wa.me/5511998765432?text=${encodeURIComponent(`Olá! Vi a peça "${peca?.nome}" na vitrine e adorei! Gostaria de mais informações.`)}`, '_blank')}>
                  Tenho interesse — falar no WhatsApp
                </Btn>
                <Btn variant="ghost" size="sm" onClick={() => setStep(0)}
                  style={{ textAlign: 'center', justifyContent: 'center' }}>
                  Provar outra peça
                </Btn>
              </div>
              <div style={{ fontFamily: F.sans, fontSize: 11, color: C.text3, textAlign: 'center', marginTop: 12 }}>
                A imagem não é armazenada e expirará em 24h.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { TryOnModal });
