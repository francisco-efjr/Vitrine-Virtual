import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// ─── Setup mocks BEFORE importing the module under test ──────────────────────
vi.mock('server-only', () => ({}))

let currentMock: ReturnType<typeof import('../../../../tests/helpers/supabase-mock').mockServiceClient>
vi.mock('@/lib/supabase/service', () => ({
  createServiceClient: () => currentMock,
}))

import { mockServiceClient } from '../../../../tests/helpers/supabase-mock'
import {
  computeQualityReport,
  computeThresholdSuggestions,
} from '../calibrate'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeRow(
  sharpness: number,
  luminance: number,
  faceArea: number,
  positive: boolean,
): { gate_signals: unknown; feedback_positivo: boolean } {
  return {
    gate_signals: {
      customer: {
        sharpness,
        meanLuminance: luminance,
        faceAreaFraction: faceArea,
        targetRegionUnoccluded: 0.8,
      },
    },
    feedback_positivo: positive,
  }
}

/** 30 rows with clear threshold: sharpness > 100 → positive, < 100 → negative */
function makeHighSeparationRows(): Array<{ gate_signals: unknown; feedback_positivo: boolean }> {
  const rows = []
  for (let i = 0; i < 15; i++) {
    rows.push(makeRow(50 + i * 2, 130, 0.15, false))  // sharpness 50–78, negative
    rows.push(makeRow(110 + i * 2, 130, 0.15, true))  // sharpness 110–138, positive
  }
  return rows
}

// ─── computeThresholdSuggestions ─────────────────────────────────────────────

describe('computeThresholdSuggestions', () => {
  it('retorna mensagem de dados insuficientes quando há menos de 20 amostras', () => {
    const rows = [makeRow(100, 130, 0.15, true), makeRow(50, 130, 0.15, false)]
    const suggestions = computeThresholdSuggestions(rows)
    expect(suggestions).toHaveLength(1)
    expect(suggestions[0]!.signal).toBe('todos os sinais')
    expect(suggestions[0]!.confidence).toBe('low')
    expect(suggestions[0]!.suggested).toBeNull()
    expect(suggestions[0]!.note).toMatch(/insuficiente/i)
  })

  it('retorna sugestões para cada sinal com alta separação (30+ amostras)', () => {
    const rows = makeHighSeparationRows()
    const suggestions = computeThresholdSuggestions(rows)
    const sharpnessReject = suggestions.find((s) => s.signal.includes('Nitidez — reject'))
    expect(sharpnessReject).toBeDefined()
    // Threshold sugerido deve estar entre os dois grupos (50–78 negativo, 110–138 positivo)
    expect(sharpnessReject!.suggested).not.toBeNull()
    expect(sharpnessReject!.suggested!).toBeGreaterThan(50)
    expect(sharpnessReject!.suggested!).toBeLessThan(138)
    expect(sharpnessReject!.sample_size).toBeGreaterThan(0)
  })

  it('retorna confidence=medium com 30 amostras e high com 100+', () => {
    const rows30 = makeHighSeparationRows() // 30 rows
    const s30 = computeThresholdSuggestions(rows30)
    const sharpness30 = s30.find((s) => s.signal.includes('Nitidez — reject'))
    expect(sharpness30?.confidence).toBe('medium')

    // 100+ rows
    const rows100 = Array.from({ length: 60 }, (_, i) => [
      makeRow(50 + i, 130, 0.15, false),
      makeRow(150 + i, 130, 0.15, true),
    ]).flat()
    const s100 = computeThresholdSuggestions(rows100)
    const sharpness100 = s100.find((s) => s.signal.includes('Nitidez — reject'))
    expect(sharpness100?.confidence).toBe('high')
  })

  it('trata graciosamente linhas com gate_signals nulo', () => {
    const rows = [
      { gate_signals: null, feedback_positivo: true },
      ...makeHighSeparationRows(),
    ]
    expect(() => computeThresholdSuggestions(rows)).not.toThrow()
  })

  it('trata graciosamente linhas com feedback_positivo nulo', () => {
    const rows = [
      { gate_signals: { customer: { sharpness: 100 } }, feedback_positivo: null },
      ...makeHighSeparationRows(),
    ]
    expect(() => computeThresholdSuggestions(rows)).not.toThrow()
  })

  it('threshold sugerido é arredondado para 3 casas decimais', () => {
    const rows = makeHighSeparationRows()
    const suggestions = computeThresholdSuggestions(rows)
    for (const s of suggestions) {
      if (s.suggested !== null) {
        const str = String(s.suggested)
        const decimals = str.includes('.') ? str.split('.')[1]!.length : 0
        expect(decimals).toBeLessThanOrEqual(3)
      }
    }
  })

  it('inclui sugestão para luminância mínima e máxima', () => {
    const rows = makeHighSeparationRows()
    const suggestions = computeThresholdSuggestions(rows)
    const hasLuminanceMin = suggestions.some((s) => s.signal.includes('mínima'))
    const hasLuminanceMax = suggestions.some((s) => s.signal.includes('máxima'))
    expect(hasLuminanceMin).toBe(true)
    expect(hasLuminanceMax).toBe(true)
  })
})

// ─── computeQualityReport ────────────────────────────────────────────────────

describe('computeQualityReport', () => {
  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
  })
  afterEach(() => vi.restoreAllMocks())

  it('retorna estrutura completa com dados vazios', async () => {
    currentMock = mockServiceClient({
      tables: {
        try_on_quality_summary: { select: { data: [], error: null } },
        try_on_feedback_reasons: { select: { data: [], error: null } },
        try_on_gate_effectiveness: { select: { data: [], error: null } },
        try_on_acceptance_vs_feedback: { select: { data: [], error: null } },
        try_on_generations: { select: { data: [], error: null } },
      },
    })

    const report = await computeQualityReport()

    expect(report).toMatchObject({
      period_days: 30,
      provider_stats: [],
      feedback_reasons: [],
      gate_effectiveness: [],
      acceptance_correlation: [],
    })
    expect(report.generated_at).toMatch(/^\d{4}-\d{2}-\d{2}/)
    expect(report.threshold_suggestions).toBeDefined()
    // Com dados vazios, retorna 1 item de "dados insuficientes"
    expect(report.threshold_suggestions[0]?.signal).toBe('todos os sinais')
  })

  it('repassa provider_stats da view corretamente', async () => {
    const mockStats = [
      {
        provider: 'google',
        model_resolved: 'gemini-2.5-flash',
        tier_effective: 'tier_c_gemini',
        total: 100,
        with_feedback: 40,
        positive: 32,
        negative: 8,
        approval_rate_pct: 80.0,
        avg_duration_s: 8.5,
        errors: 2,
        first_seen: '2026-05-01',
        last_seen: '2026-05-25',
      },
    ]
    currentMock = mockServiceClient({
      tables: {
        try_on_quality_summary: { select: { data: mockStats, error: null } },
        try_on_feedback_reasons: { select: { data: [], error: null } },
        try_on_gate_effectiveness: { select: { data: [], error: null } },
        try_on_acceptance_vs_feedback: { select: { data: [], error: null } },
        try_on_generations: { select: { data: [], error: null } },
      },
    })

    const report = await computeQualityReport()
    expect(report.provider_stats).toHaveLength(1)
    expect(report.provider_stats[0]?.approval_rate_pct).toBe(80.0)
    expect(report.provider_stats[0]?.provider).toBe('google')
  })

  it('aceita period_days customizado', async () => {
    currentMock = mockServiceClient({
      tables: {
        try_on_quality_summary: { select: { data: [], error: null } },
        try_on_feedback_reasons: { select: { data: [], error: null } },
        try_on_gate_effectiveness: { select: { data: [], error: null } },
        try_on_acceptance_vs_feedback: { select: { data: [], error: null } },
        try_on_generations: { select: { data: [], error: null } },
      },
    })

    const report = await computeQualityReport(7)
    expect(report.period_days).toBe(7)
  })

  it('não lança quando uma view retorna erro (dados parciais)', async () => {
    currentMock = mockServiceClient({
      tables: {
        // Só esta view retorna dados; as outras vão retornar [] via default do mock
        try_on_quality_summary: { select: { data: [], error: null } },
        try_on_feedback_reasons: { select: { data: [], error: null } },
        try_on_gate_effectiveness: { select: { data: [], error: null } },
        try_on_acceptance_vs_feedback: { select: { data: [], error: null } },
        try_on_generations: { select: { data: null, error: { message: 'db error' } } },
      },
    })

    await expect(computeQualityReport()).resolves.toBeDefined()
  })

  it('computa threshold_suggestions quando há signal rows suficientes', async () => {
    const signalRows = makeHighSeparationRows()

    currentMock = mockServiceClient({
      tables: {
        try_on_quality_summary: { select: { data: [], error: null } },
        try_on_feedback_reasons: { select: { data: [], error: null } },
        try_on_gate_effectiveness: { select: { data: [], error: null } },
        try_on_acceptance_vs_feedback: { select: { data: [], error: null } },
        try_on_generations: { select: { data: signalRows, error: null } },
      },
    })

    const report = await computeQualityReport()
    // Com 30 amostras com separação clara, deve ter sugestões reais
    const withSuggestions = report.threshold_suggestions.filter((s) => s.suggested !== null)
    expect(withSuggestions.length).toBeGreaterThan(0)
  })
})
