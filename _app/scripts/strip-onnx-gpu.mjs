#!/usr/bin/env node
/**
 * Remove providers GPU do onnxruntime-node depois do install.
 *
 * Por quê:
 *   O postinstall do onnxruntime-node baixa o pacote GPU completo do NuGet
 *   (microsoft.ml.onnxruntime.gpu.linux.X.Y.Z.nupkg) e extrai 3 .so:
 *     - libonnxruntime_providers_cuda.so        (~150 MB)
 *     - libonnxruntime_providers_tensorrt.so    (~150 MB)
 *     - libonnxruntime_providers_shared.so      (~poucos KB, necessário)
 *
 *   No Vercel não temos GPU — o runtime cai pro provider CPU automaticamente.
 *   Os dois .so grandes são puro peso morto e estouram o limite de 250 MB
 *   uncompressed do lambda da Vercel (a função /api/try-on chegou a 419 MB
 *   no último deploy, 384 MB só de onnxruntime-node).
 *
 * O que faz:
 *   Procura os arquivos por todos os caminhos plausíveis (pnpm `.pnpm/`,
 *   npm flat, monorepo) e remove os providers que não vão ser usados.
 *
 * Não-fatal: se não achar nada, segue em frente. Idempotente: pode rodar
 * múltiplas vezes (segundo run só loga "já estava limpo").
 */
import { readdirSync, statSync, unlinkSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const REPO_ROOT = resolve(__filename, '..', '..')

const REMOVE = ['libonnxruntime_providers_cuda.so', 'libonnxruntime_providers_tensorrt.so']

// Busca recursiva (depth-limit pra não rastejar o universo inteiro do
// node_modules) por diretórios `bin/napi-vN/linux/x64` dentro de qualquer
// cópia de onnxruntime-node. Cobre layout pnpm (`.pnpm/onnxruntime-node@VER/
// node_modules/onnxruntime-node/`) e npm flat (`node_modules/onnxruntime-node/`).
function findTargets(root, depth = 0) {
  const found = []
  if (depth > 8) return found
  let entries
  try {
    entries = readdirSync(root, { withFileTypes: true })
  } catch {
    return found
  }
  for (const e of entries) {
    if (!e.isDirectory()) continue
    if (e.name === 'onnxruntime-node') {
      const napiBase = join(root, e.name, 'bin')
      try {
        for (const napi of readdirSync(napiBase, { withFileTypes: true })) {
          if (!napi.isDirectory() || !napi.name.startsWith('napi-')) continue
          const archDir = join(napiBase, napi.name, 'linux', 'x64')
          try {
            statSync(archDir)
            found.push(archDir)
          } catch {
            // sem linux/x64 nessa napi version — ignora
          }
        }
      } catch {
        // sem bin/ — não é a cópia que queremos
      }
      continue
    }
    // Continua descendo só em diretórios que podem conter onnxruntime-node:
    // node_modules e .pnpm. Evita perder tempo em src/, public/, etc.
    if (e.name === 'node_modules' || e.name === '.pnpm' || e.name.startsWith('onnxruntime-node@')) {
      found.push(...findTargets(join(root, e.name), depth + 1))
    }
  }
  return found
}

function fmtMB(bytes) {
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`
}

function main() {
  const targets = findTargets(join(REPO_ROOT, 'node_modules'))
  if (targets.length === 0) {
    console.log('strip-onnx-gpu: nenhuma cópia de onnxruntime-node encontrada — ok')
    return
  }

  let totalFreed = 0
  let removedCount = 0

  for (const dir of targets) {
    for (const name of REMOVE) {
      const path = join(dir, name)
      try {
        const stats = statSync(path)
        unlinkSync(path)
        totalFreed += stats.size
        removedCount++
        console.log(`✓ removido ${path} (${fmtMB(stats.size)})`)
      } catch (err) {
        if (err && err.code === 'ENOENT') continue
        console.warn(`⚠ ${path}: ${err?.message ?? err}`)
      }
    }
  }

  if (removedCount === 0) {
    console.log('strip-onnx-gpu: providers GPU já estavam limpos — ok')
  } else {
    console.log(
      `strip-onnx-gpu: ${removedCount} provider(s) GPU removido(s), ${fmtMB(totalFreed)} liberados`,
    )
  }
}

main()
