#!/usr/bin/env node
/**
 * Baixa os modelos ONNX usados pelos acceptance checks server-side.
 *
 * Modelos:
 *   - yolov8n.onnx (~12MB) — subject count (acceptance/subject-count.ts)
 *
 * Uso:
 *   pnpm models:download         # baixa todos
 *   pnpm models:download --force # força redownload mesmo se já existe
 *
 * Em produção: o `build` script chama isso automaticamente. Em dev: o
 * acceptance grácil degrada para `checked:false` quando o modelo está
 * ausente, então rodar uma vez é o suficiente.
 */
import { createWriteStream, existsSync, mkdirSync, statSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { pipeline } from 'node:stream/promises'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const REPO_ROOT = resolve(__dirname, '..')

const MODELS = [
  {
    name: 'yolov8n.onnx',
    path: resolve(REPO_ROOT, 'models', 'yolov8n.onnx'),
    // Mirror conhecido e estável (Xenova converte modelos populares para ONNX).
    // Override via env MODELS_YOLOV8N_URL quando a infra de rede da loja exigir.
    url:
      process.env.MODELS_YOLOV8N_URL ??
      'https://huggingface.co/Xenova/yolov8n/resolve/main/model.onnx',
    minBytes: 8 * 1024 * 1024, // sanidade: < 8MB é truncado/erro de mirror
  },
  {
    name: 'yolov8n-pose.onnx',
    path: resolve(REPO_ROOT, 'models', 'yolov8n-pose.onnx'),
    url:
      process.env.MODELS_YOLOV8N_POSE_URL ??
      'https://huggingface.co/Xenova/yolov8n-pose/resolve/main/model.onnx',
    minBytes: 8 * 1024 * 1024,
  },
  {
    name: 'arcface.onnx',
    path: resolve(REPO_ROOT, 'models', 'arcface.onnx'),
    // Default: MobileFaceNet treinado com ArcFace loss (~13MB). Embedding 512-d.
    // Override via MODELS_ARCFACE_URL pra ResNet50 (~166MB, mais preciso).
    url:
      process.env.MODELS_ARCFACE_URL ??
      'https://huggingface.co/onnx-community/arcface-mobilefacenet/resolve/main/model.onnx',
    minBytes: 4 * 1024 * 1024,
  },
]

const force = process.argv.includes('--force')

async function download(model) {
  const exists = existsSync(model.path)
  if (exists && !force) {
    const size = statSync(model.path).size
    if (size >= model.minBytes) {
      console.log(`✓ ${model.name} já existe (${(size / 1024 / 1024).toFixed(1)}MB)`)
      return
    }
    console.log(`⚠ ${model.name} truncado (${size} bytes), redownload`)
  }

  mkdirSync(dirname(model.path), { recursive: true })
  console.log(`↓ Baixando ${model.name} de ${model.url}`)

  const res = await fetch(model.url, { redirect: 'follow' })
  if (!res.ok || !res.body) {
    throw new Error(`Download ${model.name} falhou: HTTP ${res.status}`)
  }

  const tmpPath = `${model.path}.tmp`
  await pipeline(res.body, createWriteStream(tmpPath))

  const size = statSync(tmpPath).size
  if (size < model.minBytes) {
    throw new Error(
      `${model.name}: arquivo baixado tem ${size} bytes (esperado >= ${model.minBytes})`,
    )
  }

  // Atomic-ish replace
  const { renameSync, unlinkSync } = await import('node:fs')
  if (existsSync(model.path)) unlinkSync(model.path)
  renameSync(tmpPath, model.path)
  console.log(`✓ ${model.name} baixado (${(size / 1024 / 1024).toFixed(1)}MB)`)
}

async function main() {
  for (const m of MODELS) {
    try {
      await download(m)
    } catch (err) {
      console.error(`✗ ${m.name}: ${err instanceof Error ? err.message : err}`)
      // Não falha o processo todo; outros modelos seguem.
      process.exitCode = 1
    }
  }
}

main()
