'use client'

/**
 * Casa Gaby Harb — grid editorial (3 colunas em desktop, 2 em mobile).
 *
 * Reaproveita o TryOnModal padrão da Vitrine Virtual — a estética da
 * Cabine continua sendo a do produto (ela é o motor de IA, transversal).
 * Aqui só envelopamos a grade com o look CGH.
 */
import { useState } from 'react'
import { TryOnModal } from '@/components/public/try-on-modal'
import { CGHPieceCard } from './piece-card'

interface Peca {
  peca_id: string
  nome: string
  tamanho: string | null
  preco_centavos: number | null
  foto_principal_url?: string | null
  categoria_id?: string | null
}

export function CGHVitrineGrid({
  pecas,
  exibirPreco,
  whatsappE164,
  cabineBackdropUrl,
}: {
  pecas: Peca[]
  exibirPreco: boolean
  whatsappE164: string | null
  cabineBackdropUrl: string | null
}) {
  const [cabinePeca, setCabinePeca] = useState<Peca | null>(null)

  if (pecas.length === 0) {
    return (
      <div
        style={{
          padding: '64px 24px',
          textAlign: 'center',
          fontFamily: 'var(--font-cgh-serif), Georgia, serif',
          fontStyle: 'italic',
          fontSize: 19,
          color: 'rgba(31,58,42,0.6)',
        }}
      >
        A curadoria deste mês está sendo preparada.
      </div>
    )
  }

  return (
    <>
      <div className="cgh-grid">
        {pecas.map((p) => (
          <CGHPieceCard
            key={p.peca_id}
            peca={p}
            exibirPreco={exibirPreco}
            onClick={() => setCabinePeca(p)}
          />
        ))}
      </div>

      {cabinePeca ? (
        <TryOnModal
          open={!!cabinePeca}
          onClose={() => setCabinePeca(null)}
          pecaId={cabinePeca.peca_id}
          pecaNome={cabinePeca.nome}
          pecaTamanho={cabinePeca.tamanho}
          pecaPrecoCentavos={cabinePeca.preco_centavos}
          exibirPreco={exibirPreco}
          whatsappE164={whatsappE164}
          garmentImageUrl={null}
          garmentThumbUrl={cabinePeca.foto_principal_url ?? null}
          cabineBackdropUrl={cabineBackdropUrl}
        />
      ) : null}
    </>
  )
}
