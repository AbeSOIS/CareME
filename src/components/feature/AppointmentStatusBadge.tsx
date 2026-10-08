import { useTranslation } from 'react-i18next'
import type { AppointmentStatus } from '../../types'
import { Badge, type Tone } from '../ui'

const TONE: Record<AppointmentStatus, Tone> = {
  requested: 'warning',
  confirmed: 'success',
  rejected: 'neutral',
  cancelled: 'neutral',
  lateCancelled: 'danger',
  completed: 'brand',
  noShow: 'danger',
}

export function AppointmentStatusBadge({ status }: { status: AppointmentStatus }) {
  const { t } = useTranslation()
  return <Badge tone={TONE[status]}>{t(`appointments.status.${status}`)}</Badge>
}
