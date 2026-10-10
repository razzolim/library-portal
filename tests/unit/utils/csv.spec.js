import { describe, it, expect } from 'vitest'
import { parseCsv, inspectBooksCsv, booksToCsv, IMPORT_TEMPLATE_CSV } from '../../../src/utils/csv.js'

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

describe('booksToCsv', () => {
  it('writes the import columns with quoting, empty cells and formula protection', () => {
    const csv = booksToCsv([
      { title: 'A, "B"', author: 'Au', status: 'available', year: 1999, isbn: null },
      { title: '=SUM(1)', author: 'Au', status: 'borrowed', summary: 'l1\nl2' }
    ])
    const lines = csv.split('\r\n')
    expect(lines[0]).toBe('title,author,status,genre,year,isbn,pdfUrl,summary,coverColor')
    expect(lines[1]).toBe('"A, ""B""",Au,available,,1999,,,,')
    expect(lines[2].startsWith("'=SUM(1),Au,borrowed")).toBe(true)
  })

  it('round-trips through the importer', () => {
    const result = inspectBooksCsv(booksToCsv([{ title: 'T', author: 'A', status: 'available' }]))
    expect(result.rowCount).toBe(1)
    expect(result.missing).toEqual([])
    expect(result.unknown).toEqual([])
  })
})
