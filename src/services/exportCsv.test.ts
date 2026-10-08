import { describe, expect, it } from 'vitest'
import { toCsv } from './exportCsv'

describe('toCsv', () => {
  it('quotes values containing separators and keeps Unicode', () => {
    const csv = toCsv(
      [
        { key: 'a', label: 'Division' },
        { key: 'b', label: 'Note' },
      ],
      [{ a: 'හොරණ', b: 'x, "y"' }, { a: 'Horana', b: null }],
    )
    expect(csv).toBe('Division,Note\r\nහොරණ,"x, ""y"""\r\nHorana,')
  })
})
