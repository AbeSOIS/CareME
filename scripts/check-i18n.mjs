// Verifies that every literal t('key') used in src/ exists in en.json, that template
// keys like t(`case.tabs.${x}`) point at an existing object, and that si/ta match en.
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

const root = new URL('../src/', import.meta.url).pathname
const load = (l) => JSON.parse(readFileSync(join(root, 'i18n', `${l}.json`), 'utf8'))
const en = load('en')
const flatten = (o, p = '') => Object.entries(o).flatMap(([k, v]) => (v && typeof v === 'object' ? flatten(v, `${p}${k}.`) : [`${p}${k}`]))
const get = (o, path) => path.split('.').reduce((a, k) => (a && typeof a === 'object' ? a[k] : undefined), o)

const files = []
const walk = (d) => readdirSync(d).forEach((f) => (statSync(join(d, f)).isDirectory() ? walk(join(d, f)) : /\.(tsx?|ts)$/.test(f) && !f.endsWith('.test.ts') && files.push(join(d, f))))
walk(root)

let problems = 0
for (const file of files) {
  const src = readFileSync(file, 'utf8')
  for (const m of src.matchAll(/\bt\(\s*'([a-zA-Z0-9_.-]+)'/g)) {
    if (typeof get(en, m[1]) !== 'string') {
      console.log(`missing key ${m[1]}  (${file.replace(root, '')})`)
      problems++
    }
  }
  for (const m of src.matchAll(/\bt\(\s*`([a-zA-Z0-9_.]+)\.\$\{/g)) {
    const obj = get(en, m[1])
    if (!obj || typeof obj !== 'object') {
      console.log(`missing object ${m[1]}.*  (${file.replace(root, '')})`)
      problems++
    }
  }
}

const enKeys = new Set(flatten(en))
for (const l of ['si', 'ta']) {
  const keys = new Set(flatten(load(l)))
  const missing = [...enKeys].filter((k) => !keys.has(k))
  const extra = [...keys].filter((k) => !enKeys.has(k))
  if (missing.length || extra.length) {
    console.log(`${l}: missing ${missing.length} [${missing.slice(0, 20).join(', ')}] extra ${extra.length} [${extra.slice(0, 10).join(', ')}]`)
    problems += missing.length + extra.length
  }
}
console.log(problems ? `${problems} problem(s)` : `i18n OK — ${enKeys.size} keys, ${files.length} files scanned`)
process.exit(problems ? 1 : 0)
