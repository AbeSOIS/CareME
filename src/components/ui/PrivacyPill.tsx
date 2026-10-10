import { EyeOff } from 'lucide-react'
import { cn } from './cn'

/**
 * The "Anonymous · not saved" privacy reassurance pill.
 *
 * It must ALWAYS be a single line, in every language and at every width. It hugs its
 * content (`w-fit`), never wraps (`whitespace-nowrap`), and its text size is fluid via a
 * container query: full caption size when the card is roomy, shrinking smoothly toward a
 * 12px floor in narrow cards. The clamp is self-safe — with no `@container` ancestor `cqi`
 * resolves large and clamps to the max, so the pill never explodes.
 *
 * `shortLabel` is a last resort: if the card is extremely narrow the message swaps to the
 * short form rather than truncating, because the privacy wording must stay fully readable.
 *
 * Requires an ancestor with `@container` (the card) for the responsive behaviour.
 */
export function PrivacyPill({ label, shortLabel, className }: { label: string; shortLabel?: string; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex w-fit max-w-full items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 font-semibold ring-1 ring-inset',
        'bg-green-50 text-green-800 ring-green-200 dark:bg-green-950 dark:text-green-200 dark:ring-green-800',
        'text-[clamp(0.75rem,4.2cqi,0.875rem)] @max-[16rem]:px-2',
        className,
      )}
    >
      <EyeOff aria-hidden className="size-4 shrink-0" />
      {shortLabel ? (
        <>
          <span className="@max-[13rem]:hidden">{label}</span>
          <span className="hidden @max-[13rem]:inline">{shortLabel}</span>
        </>
      ) : (
        label
      )}
    </span>
  )
}
