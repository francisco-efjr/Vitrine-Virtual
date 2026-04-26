/**
 * Geração de CSV server-side.
 * Padrão RFC 4180 + BOM UTF-8 para Excel exibir acentos corretamente.
 */

const SEPARATOR = ','
const QUOTE = '"'
const NEWLINE = '\r\n'
const BOM = '﻿'

function escapeField(value: unknown): string {
  if (value == null) return ''
  const str = String(value)
  // Se contém separador, aspas ou quebra de linha, envolve em aspas e duplica aspas internas.
  if (str.includes(SEPARATOR) || str.includes(QUOTE) || /\r|\n/.test(str)) {
    return QUOTE + str.replace(/"/g, '""') + QUOTE
  }
  return str
}

export function toCsv<T extends Record<string, unknown>>(
  rows: T[],
  columns: { key: keyof T; label: string }[],
): string {
  const header = columns.map((c) => escapeField(c.label)).join(SEPARATOR)
  const body = rows
    .map((row) => columns.map((c) => escapeField(row[c.key])).join(SEPARATOR))
    .join(NEWLINE)
  return BOM + header + NEWLINE + body + NEWLINE
}
