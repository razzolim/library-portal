import { describe, it, expect } from 'vitest'
import { parseCsv, inspectBooksCsv, IMPORT_TEMPLATE_CSV } from '../../../src/utils/csv.js'

describe('parseCsv', () => {
  it('handles quotes, commas, embedded line breaks, BOM and blank lines', () => {
    const { rows, unterminated } = parseCsv('﻿a,b\r\n\r\n"x, ""y""","l1\nl2"\nz,\n')
    expect(unterminated).toBe(false)
    expect(rows.map((r) => r.cells)).toEqual([['a', 'b'], ['x, "y"', 'l1\nl2'], ['z', '']])
    expect(rows.map((r) => r.line)).toEqual([1, 3, 5])
  })

  it('flags an unterminated quote', () => {
    expect(parseCsv('a,b\n"x,y').unterminated).toBe(true)
  })
})

describe('inspectBooksCsv', () => {
  it('accepts the template', () => {
    const result = inspectBooksCsv(IMPORT_TEMPLATE_CSV)
    expect(result.rowCount).toBe(3)
    expect(result.missing).toEqual([])
    expect(result.unknown).toEqual([])
    expect(result.duplicated).toEqual([])
  })

  it('reports missing, unknown and duplicated columns', () => {
    const result = inspectBooksCsv('title,title,foo\nx,y,z')
    expect(result.missing).toEqual(['author', 'status'])
    expect(result.unknown).toEqual(['foo'])
    expect(result.duplicated).toEqual(['title'])
  })
})
