import 'server-only'
import sharp from 'sharp'
import { getServerEnv } from '@/lib/env'
import { logger } from '@/lib/logger'

/**
 * Ghost-mannequin preprocessing — request v6.
 *
 * Quando a foto da peça tem uma modelo (lojista fotografou o produto
 * vestido em alguém), pedimos ao Nano Banana pra recortar SÓ a roupa
 * antes da geração principal. Elimina a ambiguidade "duas pessoas no
 * input" que produz colagem.
 *
 * Por quê não usar background-removal (remove.bg, U²-Net)?
 *   - Background-removal tradicional recorta TUDO que não é fundo —
 *     incluindo a modelo. Mas isso deixa a roupa "deformada" no formato
 *     do corpo, o que o Gemini interpreta como "outro tipo de garment"
 *     em vez de "ghost mannequin neutro".
 *   - Gemini 2.5 Flash Image consegue fazer ghost-mannequin direto
 *     (entende "produto pendurado sem corpo, fundo branco").
 *
 * Custo: +1 call ao Gemini (~$0.039) + ~3-8s. Aplicado apenas quando
 * a peça TEM modelo (detectGarmentHasPerson==true). Flat-lay passa
 * direto sem custo extra.
 *
 * Trade-off discutido com usuário ("v6 — quero qualidade > performance").
 */

const PROMPT = `You are a fashion product photography retoucher. The input image shows a
clothing garment being worn or held by a person.

Generate a clean ghost-mannequin product photo of that garment ONLY:

GARMENT PRESERVATION (highest priority):
- Preserve the exact garment design, color, pattern, fabric texture, seams,
  hardware, prints, and proportions from the input.
- Preserve the garment's natural drape and three-dimensional shape as if it
  were still being worn (ghost mannequin look — invisible body inside).
- Show all sides of the garment that were visible in the input: front, sleeves,
  hem, neckline, closures.

PERSON REMOVAL (absolute):
- Remove the person entirely: face, hair, skin, hands, arms, legs, jewelry,
  accessories, shoes, makeup, tattoos.
- Do NOT show any human body parts. The garment should appear to float in
  ghost-mannequin form.
- Do NOT show a mannequin, hanger, or holding device — only the garment
  in mid-air ghost-mannequin pose.

BACKGROUND:
- Pure seamless white (#FFFFFF) studio background.
- Subtle soft floor shadow directly under the hem, no harsh shadows elsewhere.

OUTPUT:
- High-resolution ghost-mannequin product photo, ready for an e-commerce
  catalog. Single garment, centered, no text, no watermark, no logo overlay.`

const MODEL = 'gemini-2.5-flash-image'
const TIMEOUT_MS = 60_000

export interface GhostMannequinResult {
  /** True quando a chamada ao Gemini produziu uma imagem nova. */
  ok: boolean
  /** Buffer com a imagem ghost-mannequin gerada (PNG/JPEG). */
  buffer?: Buffer
  /** Mime da imagem gerada. */
  mimeType?: string
  /** Detalhe pra log. */
  detail?: string
}

/**
 * Gera um ghost-mannequin da peça via Gemini 2.5 Flash Image.
 *
 * Nunca lança — em caso de erro retorna `{ ok: false, detail }`. O caller
 * decide se usa o resultado ou cai pra peça original.
 */
export async function generateGhostMannequin(
  garmentBase64: string,
  garmentMimeType: string,
): Promise<GhostMannequinResult> {
  const env = getServerEnv()
  const apiKey = env.GOOGLE_AI_API_KEY
  if (!apiKey) {
    return { ok: false, detail: 'GOOGLE_AI_API_KEY ausente' }
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [
              { text: PROMPT },
              { inlineData: { mimeType: garmentMimeType, data: garmentBase64 } },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.3,
          responseModalities: ['IMAGE', 'TEXT'],
          imageConfig: { aspectRatio: '3:4' },
        },
      }),
      signal: controller.signal,
    })

    if (!res.ok) {
      const body = await res.text().catch(() => '')
      logger.warn('Ghost-mannequin: chamada Gemini falhou', {
        status: res.status,
        body: body.slice(0, 200),
      })
      return { ok: false, detail: `Gemini ${res.status}` }
    }

    const data = (await res.json()) as {
      candidates?: Array<{
        content?: {
          parts?: Array<{
            inlineData?: { mimeType?: string; data?: string }
          }>
        }
      }>
    }
    const parts = data.candidates?.[0]?.content?.parts ?? []
    const imagePart = parts.find((p) => p.inlineData?.mimeType?.startsWith('image/'))
    if (!imagePart?.inlineData?.data) {
      logger.warn('Ghost-mannequin: resposta sem imagem')
      return { ok: false, detail: 'Gemini retornou sem imagem' }
    }

    const rawBuf = Buffer.from(imagePart.inlineData.data, 'base64')
    // Normaliza pra JPEG (mesmo padrão do google-ai.ts).
    const jpeg = await sharp(rawBuf).jpeg({ quality: 92 }).toBuffer()

    logger.info('Ghost-mannequin: imagem gerada com sucesso', {
      bytesIn: garmentBase64.length,
      bytesOut: jpeg.byteLength,
    })

    return { ok: true, buffer: jpeg, mimeType: 'image/jpeg' }
  } catch (err) {
    logger.warn('Ghost-mannequin: exceção', {
      message: err instanceof Error ? err.message : String(err),
    })
    return { ok: false, detail: err instanceof Error ? err.message : String(err) }
  } finally {
    clearTimeout(timer)
  }
}
