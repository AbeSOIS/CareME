import { useId, useRef, type KeyboardEvent, type ReactNode } from 'react'
import { cn } from './cn'

export interface TabItem {
  id: string
  label: ReactNode
  badge?: ReactNode
}

interface TabsProps {
  tabs: TabItem[]
  active: string
  onChange: (id: string) => void
  label: string
  children: ReactNode
}

/** WAI-ARIA tabs: arrow keys / Home / End move between tabs, panel is labelled by the active tab. */
export function Tabs({ tabs, active, onChange, label, children }: TabsProps) {
  const base = useId()
  const refs = useRef<Array<HTMLButtonElement | null>>([])

  const onKey = (e: KeyboardEvent, index: number) => {
    let next = index
    if (e.key === 'ArrowRight') next = (index + 1) % tabs.length
    else if (e.key === 'ArrowLeft') next = (index - 1 + tabs.length) % tabs.length
    else if (e.key === 'Home') next = 0
    else if (e.key === 'End') next = tabs.length - 1
    else return
    e.preventDefault()
    onChange(tabs[next].id)
    refs.current[next]?.focus()
  }

  return (
    <div>
      <div role="tablist" aria-label={label} className="-mx-1 flex gap-1 relative overflow-x-auto border-b border-slate-200 px-1 dark:border-slate-700">
        {tabs.map((tab, i) => {
          const selected = tab.id === active
          return (
            <button
              key={tab.id}
              ref={(el) => {
                refs.current[i] = el
              }}
              role="tab"
              type="button"
              id={`${base}-tab-${tab.id}`}
              aria-selected={selected}
              aria-controls={`${base}-panel`}
              tabIndex={selected ? 0 : -1}
              onClick={() => onChange(tab.id)}
              onKeyDown={(e) => onKey(e, i)}
              className={cn(
                '-mb-px inline-flex min-h-11 shrink-0 items-center gap-2 border-b-2 px-3 text-sm font-semibold whitespace-nowrap transition-colors',
                selected
                  ? 'border-brand-700 text-brand-800 dark:border-brand-300 dark:text-brand-200'
                  : 'border-transparent text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100',
              )}
            >
              {tab.label}
              {tab.badge}
            </button>
          )
        })}
      </div>
      <div role="tabpanel" id={`${base}-panel`} aria-labelledby={`${base}-tab-${active}`} tabIndex={0} className="pt-5 focus-visible:outline-offset-4">
        {children}
      </div>
    </div>
  )
}
