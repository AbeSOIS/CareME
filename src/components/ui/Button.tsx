import type { ButtonHTMLAttributes, ReactNode, Ref } from 'react'
import { Link, type LinkProps } from 'react-router-dom'
import { LoaderCircle } from 'lucide-react'
import { cn } from './cn'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'emergency' | 'onDark' | 'outlineOnDark'
export type ButtonSize = 'sm' | 'md' | 'lg'

const VARIANT: Record<ButtonVariant, string> = {
  primary: 'bg-brand-700 text-white hover:bg-brand-800 dark:bg-brand-500 dark:text-slate-950 dark:hover:bg-brand-400',
  secondary:
    'border border-slate-300 bg-white text-slate-800 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800',
  ghost: 'text-brand-800 hover:bg-brand-50 dark:text-brand-200 dark:hover:bg-slate-800',
  danger: 'bg-red-700 text-white hover:bg-red-800 dark:bg-red-600 dark:hover:bg-red-500',
  emergency: 'bg-red-600 text-white shadow-lg hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-500',
  // For use on the dark brand hero only.
  onDark: 'bg-white text-brand-900 hover:bg-brand-50',
  outlineOnDark: 'border-2 border-white/80 bg-transparent text-white hover:bg-white/10',
}

/*
 * Heights are the touch-target floor, not decoration: `sm` (40px) is for dense
 * staff tables only; `md` (44px) meets WCAG 2.2 target size; `lg` (52px) is for
 * primary public actions. All three use 16px text so buttons never shrink below
 * reading size, and wrap to two lines rather than truncate (Tamil words are long).
 */
const SIZE: Record<ButtonSize, string> = {
  sm: 'min-h-10 px-3.5 text-body gap-2',
  md: 'min-h-11 px-4 text-body gap-2',
  lg: 'min-h-13 px-5 text-body gap-2',
}

export function buttonClass(variant: ButtonVariant = 'primary', size: ButtonSize = 'md', extra?: string) {
  return cn(
    'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl font-semibold transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-60',
    VARIANT[variant],
    SIZE[size],
    extra,
  )
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  icon?: ReactNode
  ref?: Ref<HTMLButtonElement>
}

export function Button({ variant = 'primary', size = 'md', loading, icon, className, children, disabled, type = 'button', ...rest }: ButtonProps) {
  return (
    <button type={type} className={buttonClass(variant, size, className)} disabled={disabled || loading} aria-busy={loading || undefined} {...rest}>
      {loading ? <LoaderCircle aria-hidden className="size-5 animate-spin" /> : icon}
      {children}
    </button>
  )
}

interface ButtonLinkProps extends LinkProps {
  variant?: ButtonVariant
  size?: ButtonSize
  icon?: ReactNode
}

export function ButtonLink({ variant = 'primary', size = 'md', icon, className, children, ...rest }: ButtonLinkProps) {
  return (
    <Link className={buttonClass(variant, size, typeof className === 'string' ? className : undefined)} {...rest}>
      {icon}
      {children}
    </Link>
  )
}
