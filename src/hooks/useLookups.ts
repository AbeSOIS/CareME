import { useMemo } from 'react'
import { pick } from '../i18n'
import districts from '../data/districts.json'
import dsDivisions from '../data/dsDivisions.json'
import { useUi } from '../store/ui'
import type { SelectOption } from '../components/ui'

/** Localised names for districts and DS divisions. */
export function useLookups() {
  const lang = useUi((s) => s.language)
  return useMemo(() => {
    const districtName = (id?: string) => (id ? pick(districts.find((d) => d.id === id)?.name, lang) || id : '')
    const dsName = (id?: string) => (id ? pick(dsDivisions.find((d) => d.id === id)?.name, lang) || id : '')
    const districtOptions: SelectOption[] = districts
      .map((d) => ({ value: d.id, label: pick(d.name, lang) }))
      .sort((a, b) => a.label.localeCompare(b.label, lang))
    const dsOptions = (districtId?: string): SelectOption[] =>
      dsDivisions.filter((d) => !districtId || d.districtId === districtId).map((d) => ({ value: d.id, label: pick(d.name, lang) }))
    return { districtName, dsName, districtOptions, dsOptions, districts, provinceOf: (id?: string) => districts.find((d) => d.id === id)?.province ?? '' }
  }, [lang])
}
