import type { CSSProperties, ElementType, ReactNode } from 'react'
import { useTilt3D } from '../../hooks/useTilt3D'
import { cn } from './cn'

/**
 * Wraps any card in a subtle pointer-tracked 3D tilt with a soft light glare,
 * so the surface reads as a physical object you can turn toward the light.
 * Degrades to a flat card with no listeners under prefers-reduced-motion
 * (see useTilt3D) and on touch, where tilt has no meaning.
 */
export function Tilt3D({
  children,
  className,
  as: Tag = 'div',
  maxDeg = 8,
}: {
  children: ReactNode
  className?: string
  as?: ElementType
  maxDeg?: number
}) {
  const { ref, handlers } = useTilt3D(maxDeg)
  return (
    <Tag
      ref={ref}
      {...handlers}
      className={cn('tilt-3d', className)}
      style={{ '--tilt-x': '0deg', '--tilt-y': '0deg' } as CSSProperties}
    >
      <span aria-hidden className="tilt-3d-glare" />
      {children}
    </Tag>
  )
}
