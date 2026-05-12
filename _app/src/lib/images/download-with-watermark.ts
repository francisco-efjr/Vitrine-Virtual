'use client'

/**
 * Baixa o resultado da Cabine como JPEG 1080×1920 (Instagram 9:16) com marca
 * d'água minimalista no rodapé — monograma "vv" itálico + wordmark "vitrine".
 *
 * Conforme handoff v4 (notes/design-handoff-v4): toda imagem baixada pelo
 * cliente passa por este canvas para carimbar a identidade da Vitrine
 * Virtual no rodapé, mantendo o aspecto canônico 9:16.
 */
export async function downloadSimulacaoComMarca({
  imageUrl,
  pecaNome,
  filenameSeed,
}: {
  imageUrl: string
  pecaNome?: string | null
  filenameSeed?: string | null
}): Promise<void> {
  const W = 1080
  const H = 1920

  const image = await loadImageFromUrl(imageUrl)
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    throw new Error('Canvas 2D não disponível neste navegador.')
  }

  // Fundo branco — garante leitura quando a simulação tem fundo claro
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, W, H)

  // object-fit:contain ⇒ a imagem inteira aparece, sem cortes
  drawImageContain(ctx, image, 0, 0, W, H)

  // Gradiente sutil no rodapé para legibilidade da marca
  const gradient = ctx.createLinearGradient(0, H - 280, 0, H)
  gradient.addColorStop(0, 'rgba(14,12,10,0)')
  gradient.addColorStop(1, 'rgba(14,12,10,0.55)')
  ctx.fillStyle = gradient
  ctx.fillRect(0, H - 280, W, 280)

  // Marca d'água centralizada — monograma VV + wordmark "vitrine"
  const monoSize = 58
  const gap = 14
  ctx.font = 'italic 500 44px "Bodoni Moda", "Didot", Georgia, serif'
  const wordW = ctx.measureText('vitrine').width
  const totalW = monoSize + gap + wordW
  const baseX = Math.round((W - totalW) / 2)
  const baseY = H - monoSize - 58
  drawVVMonogram(ctx, baseX, baseY, monoSize)
  ctx.fillStyle = 'rgba(255,255,255,0.96)'
  ctx.textBaseline = 'middle'
  ctx.textAlign = 'start'
  ctx.fillText('vitrine', baseX + monoSize + gap, baseY + monoSize / 2 + 2)

  // Nome da peça acima da marca — discreto
  if (pecaNome) {
    ctx.fillStyle = 'rgba(255,255,255,0.78)'
    ctx.font = '400 26px Manrope, system-ui, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(pecaNome, W / 2, baseY - 30)
    ctx.textAlign = 'start'
  }

  await new Promise<void>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Não foi possível compor o JPEG de download.'))
          return
        }
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `vitrine-${slugify(filenameSeed ?? pecaNome ?? 'simulacao')}.jpg`
        document.body.appendChild(a)
        a.click()
        a.remove()
        setTimeout(() => URL.revokeObjectURL(url), 1000)
        resolve()
      },
      'image/jpeg',
      0.92,
    )
  })
}

function loadImageFromUrl(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Falha ao carregar a imagem para download.'))
    img.src = url
  })
}

function drawImageContain(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  width: number,
  height: number,
) {
  const imgW = img.naturalWidth || img.width
  const imgH = img.naturalHeight || img.height
  if (!imgW || !imgH) return
  const ratio = Math.min(width / imgW, height / imgH)
  const drawW = imgW * ratio
  const drawH = imgH * ratio
  const dx = x + (width - drawW) / 2
  const dy = y + (height - drawH) / 2
  ctx.drawImage(img, dx, dy, drawW, drawH)
}

function drawVVMonogram(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
) {
  const r = Math.round(size * 0.235)
  ctx.fillStyle = '#0e0c0a'
  drawRoundRect(ctx, x, y, size, size, r)
  ctx.fill()
  ctx.fillStyle = '#ffffff'
  ctx.font = `italic 600 ${Math.round(size * 0.62)}px "Bodoni Moda", "Didot", Georgia, serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('vv', x + size / 2, y + size / 2 + 1)
  ctx.textAlign = 'start'
}

function drawRoundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

function slugify(input: string): string {
  return (
    input
      .normalize('NFKD')
      .replace(/[^\w\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .toLowerCase()
      .slice(0, 60) || 'simulacao'
  )
}
