'use client'

/**
 * Casa Gaby Harb — card editorial de peça da curadoria.
 *
 * Estética "Net-a-Porter": foto grande (3:4) com badge "peça única" em
 * dourado no topo-esquerda, monograma GH watermark sutil no canto, nome em
 * serifa itálica, preço discreto, micro-CTA "Provar no espelho" em
 * caramelo. Hover sobe levemente a foto (motion calmo, não brincalhão).
 */
import { formatPreco } from '@/lib/validators/peca'
import { CGH } from './tokens'
import { FF, GHMono, Icon } from './atoms'

interface Peca {
  peca_id: string
  nome: string
  preco_centavos: number | null
  foto_principal_url?: string | null
}

export function CGHPieceCard({
  peca,
  exibirPreco,
  onClick,
}: {
  peca: Peca
  exibirPreco: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: 'flex',
        flexDirection: 'column',
        textAlign: 'left',
        background: 'transparent',
        border: 0,
        padding: 0,
        cursor: 'pointer',
        fontFamily: FF.sans,
      }}
      className="cgh-card group"
    >
      <div
        style={{
          position: 'relative',
          width: '100%',
          aspectRatio: '3 / 4',
          background: CGH.musgoDeep,
          borderRadius: 6,
          overflow: 'hidden',
          boxShadow: '0 1px 0 rgba(31,58,42,0.04)',
        }}
      >
        {peca.foto_principal_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={peca.foto_principal_url}
            alt={peca.nome}
            className="cgh-card-img"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              objectPosition: 'center',
              transition: 'transform 600ms cubic-bezier(0.22,0.61,0.36,1)',
            }}
          />
        ) : (
          <div
            style={{
              width: '100%',
              height: '100%',
              background: `
                radial-gradient(120% 90% at 30% 18%, rgba(201,169,97,0.10) 0%, transparent 55%),
                radial-gradient(140% 120% at 85% 110%, rgba(0,0,0,0.32) 0%, transparent 60%),
                repeating-linear-gradient(135deg, rgba(201,169,97,0.07) 0 2px, transparent 2px 11px),
                ${CGH.musgoDeep}`,
            }}
          />
        )}
        <span
          style={{
            position: 'absolute',
            left: 14,
            top: 14,
            fontFamily: FF.mono,
            fontSize: 9.5,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: CGH.musgoDeep,
            background: CGH.gold,
            padding: '4px 9px',
            borderRadius: 3,
          }}
        >
          peça única
        </span>
        <span
          style={{
            position: 'absolute',
            top: 14,
            right: 14,
            width: 38,
            height: 38,
            borderRadius: 999,
            border: '1px solid rgba(245,239,230,0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(10,10,10,0.25)',
            backdropFilter: 'blur(3px)',
          }}
        >
          <Icon name="bookmark" size={17} color={CGH.cream} />
        </span>
        <span
          style={{
            position: 'absolute',
            right: 14,
            bottom: 12,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            opacity: 0.85,
          }}
        >
          <GHMono size={22} />
        </span>
      </div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          marginTop: 16,
          gap: 12,
        }}
      >
        <span
          className="cgh-card-name"
          style={{
            fontFamily: FF.serif,
            fontStyle: 'italic',
            fontSize: 23,
            color: CGH.musgo,
            lineHeight: 1.1,
          }}
        >
          {peca.nome}
        </span>
        {exibirPreco && peca.preco_centavos != null ? (
          <span
            className="cgh-card-price"
            style={{
              fontFamily: FF.sans,
              fontWeight: 400,
              fontSize: 12.5,
              letterSpacing: '0.04em',
              color: 'rgba(31,58,42,0.62)',
              whiteSpace: 'nowrap',
            }}
          >
            {formatPreco(peca.preco_centavos)}
          </span>
        ) : null}
      </div>
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          marginTop: 10,
          color: CGH.caramelo,
        }}
      >
        <span
          className="cgh-card-cta"
          style={{
            fontFamily: FF.sans,
            fontSize: 10.5,
            fontWeight: 500,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
          }}
        >
          Provar no espelho
        </span>
        <Icon name="arrowR" size={14} stroke={1.5} />
      </div>
    </button>
  )
}
