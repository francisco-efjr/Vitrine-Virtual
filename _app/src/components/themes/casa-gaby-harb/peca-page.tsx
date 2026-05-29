/**
 * Casa Gaby Harb — página de detalhe da peça (DetalheScreen + MDetalhe).
 *
 * Desktop: layout 2 colunas — gallery rail + foto principal em arch-frame
 * à esquerda, painel info à direita (eyebrow + nome serif italic + preço +
 * descrição editorial + tamanhos + CTAs + accordion).
 *
 * Mobile: full-bleed photo no topo (com gallery dots), info empilhada
 * abaixo, sticky action bar no rodapé (provador primary + WhatsApp redondo).
 *
 * Reutiliza CGHTryOnModal pra Cabine — fluxo idêntico ao da vitrine.
 */
'use client'

import { useState } from 'react'
import Link from 'next/link'
import { formatPreco } from '@/lib/validators/peca'
import { formatSizes, parseSizes, sortSizes } from '@/lib/sizes'
import { LojaMark } from '@/components/brand/vv-logo'
import { CGH, GOLD_FOIL } from './tokens'
import { FF, Btn, Eyebrow, GHMono, GoldRule, Icon, Nav, WhatsBtn, WhatsFab, Wordmark } from './atoms'
import { CGHTryOnModal } from './try-on-modal'
import { cghFontsClass } from './fonts'

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

interface PecaFoto {
  id: string
  url: string
}

export function CGHPecaPage({
  loja,
  peca,
  fotos,
  categoriaLabel,
  garmentImageUrl,
  whatsappUrl,
}: {
  loja: Loja
  peca: {
    peca_id: string
    nome: string
    tamanho: string | null
    preco_centavos: number | null
  }
  fotos: PecaFoto[]
  categoriaLabel: string | null
  garmentImageUrl: string | null
  whatsappUrl: string | null
}) {
  const [photoIdx, setPhotoIdx] = useState(0)
  const [cabineOpen, setCabineOpen] = useState(false)
  const [openAccordion, setOpenAccordion] = useState<'cuidados' | 'medidas' | 'entrega' | null>(
    'cuidados',
  )

  const tamanhos = sortSizes(parseSizes(peca.tamanho))
  const photo = fotos[photoIdx] ?? null

  return (
    <div
      className={`cgh-root cgh-peca ${cghFontsClass}`}
      style={{
        fontFamily: FF.sans,
        color: CGH.musgo,
        background: CGH.cream,
        minHeight: '100vh',
      }}
    >
      <CGHPecaStyles />

      <section style={{ background: CGH.cream }}>
        <Nav theme="light" />

        {/* Breadcrumb / back link */}
        <div className="cgh-container" style={{ paddingTop: 18, paddingBottom: 4 }}>
          <Link
            href={`/v/${loja.slug}`}
            style={{
              fontFamily: FF.sans,
              fontSize: 11,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: 'rgba(31,58,42,0.55)',
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <Icon name="arrowL" size={14} />
            {categoriaLabel ? `A curadoria · ${categoriaLabel}` : 'Voltar à curadoria'}
            <span style={{ opacity: 0.5, margin: '0 6px' }}>·</span>
            <span style={{ color: CGH.musgo }}>{peca.nome}</span>
          </Link>
        </div>

        {/* Main layout */}
        <div className="cgh-peca-wrap cgh-container">
          {/* Gallery */}
          <div className="cgh-peca-gallery">
            <div className="cgh-peca-thumbs">
              {fotos.slice(0, 6).map((f, i) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setPhotoIdx(i)}
                  className="cgh-peca-thumb"
                  style={{
                    outline:
                      i === photoIdx
                        ? `1.5px solid ${CGH.gold}`
                        : '1px solid rgba(31,58,42,0.18)',
                    outlineOffset: i === photoIdx ? 2 : 0,
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={f.url} alt="" />
                </button>
              ))}
            </div>

            <div
              className="cgh-peca-main-img"
              style={{
                background: photo
                  ? `center / cover no-repeat url('${photo.url}'), ${CGH.musgoDeep}`
                  : CGH.cream3,
              }}
            >
              {fotos.length > 1 ? (
                <div className="cgh-peca-dots">
                  {fotos.slice(0, 6).map((_, i) => (
                    <span
                      key={i}
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: 3,
                        background:
                          i === photoIdx ? CGH.gold : 'rgba(245,239,230,0.55)',
                      }}
                    />
                  ))}
                </div>
              ) : null}
            </div>
          </div>

          {/* Info */}
          <div className="cgh-peca-info">
            <Eyebrow color={CGH.caramelo}>Peça única na curadoria</Eyebrow>
            <h1
              style={{
                fontFamily: FF.serif,
                fontStyle: 'italic',
                fontWeight: 500,
                fontSize: 'clamp(36px, 5vw, 60px)',
                color: CGH.musgo,
                lineHeight: 1,
                marginTop: 14,
                marginBottom: 0,
              }}
            >
              {peca.nome}
            </h1>

            {loja.exibir_preco_publico && peca.preco_centavos != null ? (
              <div
                style={{
                  fontFamily: FF.sans,
                  fontSize: 18,
                  fontWeight: 400,
                  color: 'rgba(31,58,42,0.78)',
                  marginTop: 14,
                  letterSpacing: '0.02em',
                }}
              >
                {formatPreco(peca.preco_centavos)}
              </div>
            ) : (
              <div
                style={{
                  fontFamily: FF.sans,
                  fontSize: 13,
                  color: 'rgba(31,58,42,0.6)',
                  marginTop: 14,
                }}
              >
                Consulte valores com a Casa
              </div>
            )}

            {/* Descrição editorial — usa tagline ou copy padrão CGH */}
            <p
              style={{
                fontFamily: FF.serif,
                fontStyle: 'italic',
                fontSize: 21,
                lineHeight: 1.55,
                color: CGH.musgo,
                marginTop: 26,
                maxWidth: 440,
              }}
            >
              Uma peça para quem entra na sala — e a sala se ajeita.
            </p>

            {/* Tamanhos */}
            {tamanhos.length > 0 ? (
              <div style={{ marginTop: 28 }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    marginBottom: 10,
                  }}
                >
                  <Icon name="ruler" size={16} color="rgba(31,58,42,0.5)" />
                  <span
                    style={{
                      fontFamily: FF.sans,
                      fontSize: 11,
                      fontWeight: 600,
                      letterSpacing: '0.14em',
                      textTransform: 'uppercase',
                      color: 'rgba(31,58,42,0.6)',
                    }}
                  >
                    Tamanhos disponíveis · {formatSizes(peca.tamanho, ' · ')}
                  </span>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 9 }}>
                  {tamanhos.map((t) => (
                    <span
                      key={t}
                      style={{
                        minWidth: 46,
                        height: 46,
                        padding: '0 12px',
                        borderRadius: 5,
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontFamily: FF.sans,
                        fontSize: 13,
                        fontWeight: 500,
                        border: '1px solid rgba(31,58,42,0.2)',
                        background: 'transparent',
                        color: CGH.musgo,
                      }}
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}

            {/* CTAs */}
            <div className="cgh-peca-ctas">
              {whatsappUrl ? <WhatsBtn size="lg" href={whatsappUrl} /> : null}
              <Btn
                variant="solidDark"
                size="lg"
                icon="sparkle"
                onClick={() => setCabineOpen(true)}
              >
                Provar no espelho virtual
              </Btn>
            </div>

            {/* Accordion */}
            <div style={{ marginTop: 32 }}>
              <PecaAccordion
                label="Composição & cuidados"
                open={openAccordion === 'cuidados'}
                onToggle={() =>
                  setOpenAccordion((v) => (v === 'cuidados' ? null : 'cuidados'))
                }
              >
                Lavar a seco. Guardar em cabide acolchoado, longe de luz direta.
                Cada peça da curadoria é tratada com cuidado de joia.
              </PecaAccordion>
              <PecaAccordion
                label="Medidas & caimento"
                open={openAccordion === 'medidas'}
                onToggle={() =>
                  setOpenAccordion((v) => (v === 'medidas' ? null : 'medidas'))
                }
              >
                Consulte a Casa pelo WhatsApp pra tabela completa e
                recomendação personalizada de caimento.
              </PecaAccordion>
              <PecaAccordion
                label="Entrega & retirada na Casa"
                open={openAccordion === 'entrega'}
                onToggle={() =>
                  setOpenAccordion((v) => (v === 'entrega' ? null : 'entrega'))
                }
              >
                Retirada em Manaus (Av. André Araújo, 2479 — Aleixo) ou envio
                pra todo o Brasil. Combine com a Casa.
              </PecaAccordion>
            </div>
          </div>
        </div>
      </section>

      {/* Footer reduzido pra peca page (preserva continuidade da marca) */}
      <footer
        style={{
          background: CGH.musgoDeep,
          padding: '40px 0',
          textAlign: 'center',
        }}
      >
        <div
          className="cgh-container"
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 14,
          }}
        >
          <GHMono size={42} />
          <Wordmark color={CGH.cream} size={10} />
          <div style={{ margin: '6px 0', width: '100%', display: 'flex', justifyContent: 'center' }}>
            <GoldRule floron width={200} opacity={0.4} />
          </div>
          <Link
            href={`/v/${loja.slug}`}
            style={{
              fontFamily: FF.sans,
              fontSize: 11,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: CGH.onDarkMut,
              textDecoration: 'none',
            }}
          >
            Voltar à curadoria
          </Link>
          <div style={{ opacity: 0.7, marginTop: 6 }}>
            <LojaMark
              loja={{ nome: loja.nome, logo_url: loja.logo_url }}
              size={32}
              radius={9}
            />
          </div>
        </div>
      </footer>

      {/* Sticky bottom CTAs — mobile only */}
      <div className="cgh-peca-sticky">
        {whatsappUrl ? (
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noreferrer"
            aria-label="Falar com a Casa"
            style={{
              flexShrink: 0,
              width: 54,
              height: 54,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: CGH.gold,
              borderRadius: 5,
              color: CGH.musgoDeep,
            }}
          >
            <Icon name="whatsapp" size={24} color={CGH.musgoDeep} />
          </a>
        ) : null}
        <button
          type="button"
          onClick={() => setCabineOpen(true)}
          style={{
            flex: 1,
            background: CGH.musgo,
            color: CGH.cream,
            border: '1px solid transparent',
            borderRadius: 5,
            padding: '16px 18px',
            fontFamily: FF.sans,
            fontSize: 13,
            fontWeight: 600,
            letterSpacing: '0.13em',
            textTransform: 'uppercase',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            cursor: 'pointer',
          }}
        >
          <Icon name="sparkle" size={16} />
          Provar no espelho
        </button>
      </div>

      <WhatsFab href={whatsappUrl} />

      <CGHTryOnModal
        open={cabineOpen}
        onClose={() => setCabineOpen(false)}
        pecaId={peca.peca_id}
        pecaNome={peca.nome}
        pecaTamanho={peca.tamanho}
        pecaPrecoCentavos={peca.preco_centavos}
        exibirPreco={loja.exibir_preco_publico}
        whatsappE164={loja.whatsapp_e164}
        garmentImageUrl={garmentImageUrl}
        garmentThumbUrl={fotos[0]?.url ?? null}
        cabineBackdropUrl={loja.cabine_backdrop_url}
      />
    </div>
  )
}

function PecaAccordion({
  label,
  open,
  onToggle,
  children,
}: {
  label: string
  open: boolean
  onToggle: () => void
  children: React.ReactNode
}) {
  return (
    <div style={{ borderBottom: '1px solid rgba(31,58,42,0.12)' }}>
      <button
        type="button"
        onClick={onToggle}
        style={{
          width: '100%',
          padding: '18px 0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'transparent',
          border: 0,
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        <span
          style={{
            fontFamily: FF.sans,
            fontSize: 12,
            fontWeight: 600,
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
            color: CGH.musgo,
          }}
        >
          {label}
        </span>
        <Icon
          name={open ? 'chevD' : 'chevR'}
          size={17}
          color="rgba(31,58,42,0.5)"
        />
      </button>
      {open ? (
        <p
          style={{
            fontFamily: FF.sans,
            fontSize: 13.5,
            lineHeight: 1.65,
            color: 'rgba(31,58,42,0.68)',
            padding: '0 0 18px',
            maxWidth: 440,
            margin: 0,
          }}
        >
          {children}
        </p>
      ) : null}
    </div>
  )
}

function CGHPecaStyles() {
  return (
    <style>{`
      .cgh-peca .cgh-container {
        max-width: 1280px;
        margin: 0 auto;
        padding: 0 22px;
      }
      @media (min-width: 768px) { .cgh-peca .cgh-container { padding: 0 48px; } }
      @media (min-width: 1280px) { .cgh-peca .cgh-container { padding: 0 72px; } }

      .cgh-peca-wrap {
        display: grid;
        grid-template-columns: 1fr;
        gap: 32px;
        padding-top: 22px;
        padding-bottom: 100px; /* room pro sticky bottom */
      }
      @media (min-width: 900px) {
        .cgh-peca-wrap {
          grid-template-columns: 1.05fr 0.95fr;
          gap: 56px;
          padding-top: 28px;
          padding-bottom: 72px;
        }
      }

      .cgh-peca-gallery {
        display: flex;
        gap: 14px;
        flex-direction: column;
      }
      @media (min-width: 900px) { .cgh-peca-gallery { flex-direction: row; } }

      .cgh-peca-thumbs {
        display: flex;
        gap: 10px;
        order: 2;
        overflow-x: auto;
      }
      @media (min-width: 900px) {
        .cgh-peca-thumbs {
          flex-direction: column;
          order: 1;
          overflow: visible;
        }
      }

      .cgh-peca-thumb {
        flex: 0 0 auto;
        width: 64px;
        height: 80px;
        border-radius: 4px;
        overflow: hidden;
        padding: 0;
        background: ${CGH.musgoDeep};
        border: 0;
        cursor: pointer;
      }
      .cgh-peca-thumb img { width: 100%; height: 100%; object-fit: cover; display: block; }

      .cgh-peca-main-img {
        position: relative;
        width: 100%;
        aspect-ratio: 4 / 5;
        border-radius: 6px;
        order: 1;
        box-shadow: inset 0 0 80px rgba(0,0,0,0.18);
      }
      @media (min-width: 900px) {
        .cgh-peca-main-img {
          order: 2;
          flex: 1;
          height: 680px;
          aspect-ratio: auto;
          border-radius: 248px 248px 6px 6px; /* arch */
        }
      }

      .cgh-peca-dots {
        position: absolute;
        bottom: 14px;
        left: 50%;
        transform: translateX(-50%);
        display: flex;
        gap: 6px;
      }
      @media (min-width: 900px) { .cgh-peca-dots { display: none; } }

      .cgh-peca-ctas {
        display: flex;
        flex-direction: column;
        gap: 12px;
        margin-top: 28px;
      }
      @media (min-width: 600px) {
        .cgh-peca-ctas { flex-direction: row; flex-wrap: wrap; }
      }
      /* Em mobile escondemos os CTAs aqui — o sticky bar resolve */
      @media (max-width: 599px) {
        .cgh-peca-ctas { display: none; }
      }

      .cgh-peca-sticky {
        position: fixed;
        left: 0;
        right: 0;
        bottom: 0;
        background: linear-gradient(to top, ${CGH.cream} 70%, transparent);
        padding: 14px 18px 22px;
        display: flex;
        gap: 10px;
        z-index: 30;
      }
      @media (min-width: 600px) { .cgh-peca-sticky { display: none; } }
    `}</style>
  )
}
