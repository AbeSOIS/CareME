import { describe, expect, it } from 'vitest'
import en from './en.json'
import si from './si.json'
import ta from './ta.json'

type Tree = { [k: string]: string | Tree }
const flatten = (o: Tree, p = ''): Array<[string, string]> =>
  Object.entries(o).flatMap(([k, v]) => (typeof v === 'string' ? [[`${p}${k}`, v] as [string, string]] : flatten(v, `${p}${k}.`)))
const placeholders = (s: string) => [...s.matchAll(/\{\{(\w+)\}\}/g)].map((m) => m[1]).sort().join(',')

describe('translations', () => {
  const base = new Map(flatten(en as Tree))
  for (const [name, dict] of [
    ['si', si],
    ['ta', ta],
  ] as const) {
    it(`${name} has exactly the English keys with the same placeholders`, () => {
      const other = new Map(flatten(dict as Tree))
      expect([...other.keys()].sort()).toEqual([...base.keys()].sort())
      for (const [k, v] of base) expect(placeholders(other.get(k)!), k).toBe(placeholders(v))
    })
  }
})
