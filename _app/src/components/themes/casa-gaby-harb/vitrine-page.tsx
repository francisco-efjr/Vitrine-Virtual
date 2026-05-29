/**
 * Casa Gaby Harb — vitrine pública /v/{slug}.
 *
 * Composição editorial 100% feita sob medida pra @casagabyharb:
 *   1. Hero verde-musgo com nav, eyebrow "Curadoria de [mês]" e CTA dourado
 *   2. "A casa" — faixa institucional escura com endereço físico
 *   3. Curadoria — grade editorial 3 colunas (CGHPieceCard + Cabine)
 *   4. Footer — wordmark dourado, endereço, redes, assinatura
 *   5. FAB do WhatsApp "Falar com a Casa"
 *
 * Tudo dentro de um wrapper `cgh-root` que isola tipografia/cor do tema
 * default. Os átomos vivem em ./atoms; o grid + Cabine, em ./vitrine-grid.
 */
import { LojaMark } from '@/components/brand/vv-logo'
import { CGH } from './tokens'
import {
  Btn,
  Eyebrow,
  FF,
  GHMono,
  GoldRule,
  Icon,
  Nav,
  WhatsBtn,
  WhatsFab,
  Wordmark,
} from './atoms'
import { CGHVitrineGrid } from './vitrine-grid'
import { cghFontsClass } from './fonts'

interface Peca {
  peca_id: string
  nome: string
  tamanho: string | null
  preco_centavos: number | null
  foto_principal_url?: string | null
  categoria_id?: string | null
}

interface Loja {
  loja_id: string
  nome: string
  slug: string
  instagram: string | null
  tiktok: string | null
  whatsapp_e164: string | null
  exibir_preco_publico: boolean
  tagline: string | null
  logo_url: string | null
  cabine_backdrop_url: string | null
}

const MES = [
  'janeiro',
  'fevereiro',
  'março',
  'abril',
  'maio',
  'junho',
  'julho',
  'agosto',
  'setembro',
  'outubro',
  'novembro',
  'dezembro',
]

export function CGHVitrinePage({
  loja,
  pecas,
  whatsappUrl,
}: {
  loja: Loja
  pecas: Peca[]
  whatsappUrl: string | null
}) {
  const heroPiece = pecas[0] ?? null
  const curadoriaMes = `Curadoria de ${MES[new Date().getMonth()]}`

  return (
    <div
      className={`cgh-root ${cghFontsClass}`}
      style={{
        fontFamily: FF.sans,
        color: CGH.musgo,
        background: CGH.cream,
        minHeight: '100vh',
      }}
    >
      <CGHStyles />

      {/* ── HERO ────────────────────────────────────────────────────── */}
      <section
        style={{
          background: CGH.musgo,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div
          aria-hidden
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'radial-gradient(70% 80% at 82% 12%, rgba(201,169,97,0.10) 0%, transparent 55%), radial-gradient(80% 80% at 0% 100%, rgba(0,0,0,0.32) 0%, transparent 60%)',
          }}
        />
        <div style={{ position: 'relative' }}>
          <Nav theme="dark" />
          <div className="cgh-hero">
            {/* texto */}
            <div className="cgh-hero-text">
              <Eyebrow color={CGH.gold}>{curadoriaMes}</Eyebrow>
              <h1
                style={{
                  fontFamily: FF.serif,
                  fontStyle: 'italic',
                  fontWeight: 500,
                  fontSize: 'clamp(56px, 8vw, 92px)',
                  lineHeight: 0.98,
                  color: CGH.cream,
                  letterSpacing: '-0.015em',
                  marginTop: 22,
                  marginBottom: 0,
                  textWrap: 'balance',
                }}
              >
                {loja.tagline ? (
                  loja.tagline
                ) : (
                  <>
                    Para mulheres
                    <br />
                    de <span style={{ color: CGH.gold }}>presença.</span>
                  </>
                )}
              </h1>
              <p
                style={{
                  fontFamily: FF.serif,
                  fontSize: 22,
                  fontStyle: 'italic',
                  lineHeight: 1.5,
                  color: CGH.onDarkMut,
                  marginTop: 28,
                  maxWidth: 440,
                }}
              >
                Curadoria assinada por Gaby Harb. Peças escolhidas a dedo, para você que inspira
                pelo estilo.
              </p>
              <div className="cgh-hero-ctas">
                <Btn variant="gold" size="lg" href="#curadoria">
                  Conhecer a curadoria
                </Btn>
                <Btn variant="ghostDark" size="lg" icon="sparkle" href="#curadoria">
                  Experimentar no provador
                </Btn>
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 16,
                  marginTop: 48,
                }}
              >
                <div style={{ width: 40, height: 1, background: 'rgba(201,169,97,0.4)' }} />
                <span
                  style={{
                    fontFamily: FF.mono,
                    fontSize: 10.5,
                    letterSpacing: '0.12em',
                    color: CGH.onDarkMut,
                    textTransform: 'uppercase',
                  }}
                >
                  {pecas.length} {pecas.length === 1 ? 'peça' : 'peças'} · curadoria viva
                </span>
              </div>
            </div>

            {/* arch-framed editorial */}
            <div className="cgh-hero-figure">
              <div style={{ position: 'relative', width: '100%', maxWidth: 488 }}>
                <div
                  className="cgh-arch"
                  style={{
                    width: '100%',
                    aspectRatio: '4 / 5',
                    background: heroPiece?.foto_principal_url
                      ? `center / cover no-repeat url('${heroPiece.foto_principal_url}'), ${CGH.musgoDeep}`
                      : `
                        radial-gradient(120% 90% at 30% 18%, rgba(201,169,97,0.10) 0%, transparent 55%),
                        radial-gradient(140% 120% at 85% 110%, rgba(0,0,0,0.32) 0%, transparent 60%),
                        repeating-linear-gradient(135deg, rgba(201,169,97,0.07) 0 2px, transparent 2px 11px),
                        ${CGH.musgoDeep}`,
                    borderRadius: '48% 48% 6px 6px',
                    boxShadow: 'inset 0 0 80px rgba(0,0,0,0.45)',
                    position: 'relative',
                  }}
                />
                <div
                  aria-hidden
                  style={{
                    position: 'absolute',
                    inset: -10,
                    border: `1px solid ${CGH.gold}`,
                    opacity: 0.55,
                    borderRadius: '50% 50% 14px 14px',
                    pointerEvents: 'none',
                  }}
                />
                {heroPiece ? (
                  <div
                    style={{
                      position: 'absolute',
                      bottom: 22,
                      left: '50%',
                      transform: 'translateX(-50%)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      background: 'rgba(10,10,10,0.42)',
                      backdropFilter: 'blur(3px)',
                      padding: '8px 16px',
                      borderRadius: 999,
                      maxWidth: '88%',
                    }}
                  >
                    <GHMono size={22} />
                    <span
                      style={{
                        fontFamily: FF.serif,
                        fontStyle: 'italic',
                        fontSize: 16,
                        color: CGH.cream,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {heroPiece.nome}
                    </span>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── A CASA ─────────────────────────────────────────────────── */}
      <section
        id="a-casa"
        style={{
          background: CGH.musgoDeep,
          position: 'relative',
          overflow: 'hidden',
          padding: '88px 0',
        }}
      >
        <div
          aria-hidden
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'radial-gradient(70% 70% at 100% 0%, rgba(201,169,97,0.10) 0%, transparent 55%), repeating-linear-gradient(135deg, rgba(201,169,97,0.05) 0 2px, transparent 2px 14px)',
          }}
        />
        <div className="cgh-container" style={{ position: 'relative' }}>
          <div style={{ maxWidth: 560 }}>
            <Eyebrow>A casa</Eyebrow>
            <h2
              style={{
                fontFamily: FF.serif,
                fontStyle: 'italic',
                fontWeight: 500,
                fontSize: 'clamp(40px, 5.5vw, 60px)',
                lineHeight: 1.04,
                color: CGH.cream,
                marginTop: 18,
                marginBottom: 0,
                textWrap: 'balance',
              }}
            >
              Mais do que uma loja,
              <br />
              uma <span style={{ color: CGH.gold }}>casa</span>.
            </h2>
            <p
              style={{
                fontFamily: FF.serif,
                fontSize: 21,
                fontStyle: 'italic',
                lineHeight: 1.6,
                color: CGH.onDarkMut,
                marginTop: 22,
                maxWidth: 460,
              }}
            >
              Aqui a cliente é recebida. Há ritual, há cuidado, há a sensação de entrar num lugar
              pensado para você — agora, também online.
            </p>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 13,
                marginTop: 32,
                color: CGH.gold,
              }}
            >
              <Icon name="pin" size={20} />
              <span
                style={{
                  fontFamily: FF.sans,
                  fontSize: 14,
                  letterSpacing: '0.06em',
                  color: CGH.cream,
                }}
              >
                Av. André Araújo, 2479 — Aleixo, Manaus
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ── A CURADORIA ─────────────────────────────────────────────── */}
      <section id="curadoria" style={{ background: CGH.cream, padding: '72px 0 88px' }}>
        <div className="cgh-container">
          <div className="cgh-curadoria-head">
            <div>
              <Eyebrow color={CGH.caramelo}>A curadoria</Eyebrow>
              <h2
                style={{
                  fontFamily: FF.serif,
                  fontStyle: 'italic',
                  fontWeight: 500,
                  fontSize: 'clamp(40px, 5vw, 56px)',
                  color: CGH.musgo,
                  lineHeight: 1.02,
                  marginTop: 16,
                  marginBottom: 0,
                }}
              >
                {curadoriaMes}
              </h2>
              <p
                style={{
                  fontFamily: FF.serif,
                  fontSize: 19,
                  fontStyle: 'italic',
                  color: 'rgba(31,58,42,0.62)',
                  marginTop: 12,
                  maxWidth: 520,
                }}
              >
                Peças escolhidas a dedo. Mostramos poucas por vez — cada uma merece sua página.
              </p>
            </div>
          </div>

          <GoldRule margin="28px 0 40px" opacity={0.3} />

          <CGHVitrineGrid
            pecas={pecas}
            exibirPreco={loja.exibir_preco_publico}
            whatsappE164={loja.whatsapp_e164}
            cabineBackdropUrl={loja.cabine_backdrop_url}
          />
        </div>
      </section>

      {/* ── FOOTER ─────────────────────────────────────────────────── */}
      <footer
        style={{
          background: CGH.musgoDeep,
          padding: '64px 0 56px',
          textAlign: 'center',
        }}
      >
        <div className="cgh-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 22 }}>
          <GHMono size={56} />
          <Wordmark color={CGH.cream} size={11} />
          <p
            style={{
              fontFamily: FF.serif,
              fontSize: 17,
              fontStyle: 'italic',
              color: CGH.onDarkMut,
              maxWidth: 420,
              margin: 0,
            }}
          >
            Curadoria assinada · Manaus, AM
          </p>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 18,
              color: CGH.gold,
              marginTop: 4,
            }}
          >
            {loja.instagram ? (
              <a
                href={`https://instagram.com/${loja.instagram}`}
                target="_blank"
                rel="noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  color: CGH.cream,
                  textDecoration: 'none',
                  fontFamily: FF.sans,
                  fontSize: 12,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                }}
              >
                <Icon name="instagram" size={18} color={CGH.gold} />@{loja.instagram}
              </a>
            ) : null}
            {whatsappUrl ? <WhatsBtn size="sm" href={whatsappUrl} /> : null}
          </div>
          <div style={{ marginTop: 18, opacity: 0.8 }}>
            <LojaMark
              loja={{ nome: loja.nome, logo_url: loja.logo_url }}
              size={38}
              radius={10}
            />
          </div>
          <div
            style={{
              fontFamily: FF.mono,
              fontSize: 10,
              letterSpacing: '0.18em',
              color: CGH.onDarkFaint,
              textTransform: 'uppercase',
              marginTop: 6,
            }}
          >
            vitrine virtual · /v/{loja.slug}
          </div>
        </div>
      </footer>

      <WhatsFab href={whatsappUrl} />
    </div>
  )
}

/* ── Styles globais escopadas no .cgh-root (responsivo + hover) ──── */
function CGHStyles() {
  return (
    <style>{`
      .cgh-root { scrollbar-gutter: stable; }
      .cgh-root :focus-visible {
        outline: 2px solid ${CGH.gold};
        outline-offset: 3px;
        border-radius: 6px;
      }
      .cgh-container {
        max-width: 1280px;
        margin: 0 auto;
        padding: 0 24px;
      }
      @media (min-width: 768px) {
        .cgh-container { padding: 0 48px; }
      }
      @media (min-width: 1280px) {
        .cgh-container { padding: 0 72px; }
      }
      .cgh-hero {
        display: grid;
        grid-template-columns: 1fr;
        gap: 48px;
        padding: 56px 24px 72px;
        max-width: 1280px;
        margin: 0 auto;
        align-items: center;
      }
      @media (min-width: 900px) {
        .cgh-hero {
          grid-template-columns: 1fr 0.92fr;
          gap: 64px;
          padding: 72px 48px 88px;
        }
      }
      @media (min-width: 1280px) {
        .cgh-hero { padding: 78px 72px 96px; }
      }
      .cgh-hero-figure { display: flex; justify-content: center; }
      .cgh-hero-ctas {
        display: flex;
        flex-wrap: wrap;
        gap: 14px;
        margin-top: 38px;
      }
      .cgh-nav-links { display: none; }
      .cgh-nav-sep { display: none; }
      @media (min-width: 900px) {
        .cgh-nav-links { display: flex; }
        .cgh-nav-sep { display: block; }
        .cgh-nav { padding: 0 48px !important; }
      }
      @media (min-width: 1280px) {
        .cgh-nav { padding: 0 56px !important; }
      }
      .cgh-curadoria-head {
        display: flex;
        flex-wrap: wrap;
        align-items: flex-end;
        justify-content: space-between;
        gap: 24px;
      }
      .cgh-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 28px 16px;
      }
      @media (min-width: 768px) {
        .cgh-grid {
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 48px 28px;
        }
      }
      .cgh-card:hover .cgh-card-img,
      .cgh-card:focus-visible .cgh-card-img {
        transform: scale(1.035);
      }
    `}</style>
  )
}
