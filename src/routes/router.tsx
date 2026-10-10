import { lazy, Suspense, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom'
import {
  Bell,
  CalendarClock,
  CalendarDays,
  ClipboardList,
  FileText,
  FolderHeart,
  LayoutDashboard,
  ListChecks,
  PhoneCall,
  ScrollText,
  Settings2,
  ShieldCheck,
  Share2,
  Siren,
  UserCog,
  Users,
  UsersRound,
} from 'lucide-react'
import { AppShell } from '../components/layout/AppShell'
import { AppEffects } from '../components/layout/AppEffects'
import { IdleGuard } from '../components/layout/IdleGuard'
import { PortalLayout, type SidebarItem } from '../components/layout/PortalLayout'
import { Spinner, Toaster } from '../components/ui'
import { useAuth } from '../store/auth'
import { RequireRole } from './RequireRole'
import { HomePage } from '../pages/public/HomePage'
import { SelfAssessmentIndex } from '../pages/public/SelfAssessmentIndex'
import { SelfAssessmentPage } from '../pages/public/SelfAssessmentPage'
import { ResourcesPage } from '../pages/public/ResourcesPage'
import { ResourceDetailPage } from '../pages/public/ResourceDetailPage'
import { CounsellorSearchPage } from '../pages/public/CounsellorSearchPage'
import { BookingPage } from '../pages/public/BookingPage'
import { EmergencyPage } from '../pages/public/EmergencyPage'
import { LoginPage } from '../pages/public/LoginPage'
import { RegisterPage } from '../pages/public/RegisterPage'
import { RecoverPage } from '../pages/public/RecoverPage'
import { NotFoundPage } from '../pages/public/NotFoundPage'
import { SecurityPage } from '../pages/public/SecurityPage'
import { SessionRoomPage } from '../pages/public/SessionRoomPage'
import { ProfilePage } from '../pages/beneficiary/ProfilePage'
import { MyAppointmentsPage } from '../pages/beneficiary/MyAppointmentsPage'
import { SettingsPage } from '../pages/beneficiary/SettingsPage'

// Portals are split into their own chunks; the public site stays light on slow connections.
const CounsellorHome = lazy(() => import('../pages/counsellor/CounsellorHome'))
const CounsellorAppointments = lazy(() => import('../pages/counsellor/CounsellorAppointments'))
const AvailabilityPage = lazy(() => import('../pages/counsellor/AvailabilityPage'))
const CasesPage = lazy(() => import('../pages/counsellor/CasesPage'))
const CasePage = lazy(() => import('../pages/counsellor/CasePage'))
const ReferralsPage = lazy(() => import('../pages/counsellor/ReferralsPage'))
const AlertsPage = lazy(() => import('../pages/counsellor/AlertsPage'))
const GroupsPage = lazy(() => import('../pages/admin/GroupsPage'))
const DashboardPage = lazy(() => import('../pages/admin/DashboardPage'))
const ReportsPage = lazy(() => import('../pages/admin/ReportsPage'))
const UsersPage = lazy(() => import('../pages/admin/UsersPage'))
const CounsellorsAdminPage = lazy(() => import('../pages/admin/CounsellorsAdminPage'))
const RolesPage = lazy(() => import('../pages/admin/RolesPage'))
const ContentPage = lazy(() => import('../pages/admin/ContentPage'))
const RosterPage = lazy(() => import('../pages/admin/RosterPage'))
const SystemSettingsPage = lazy(() => import('../pages/admin/SystemSettingsPage'))
const AuditPage = lazy(() => import('../pages/admin/AuditPage'))
const WaitlistPage = lazy(() => import('../pages/admin/WaitlistPage'))

function Lazy({ children }: { children: ReactNode }) {
  const { t } = useTranslation()
  return <Suspense fallback={<Spinner label={t('common.loading')} />}>{children}</Suspense>
}

function Root() {
  return (
    <>
      <AppEffects />
      <IdleGuard />
      <Toaster />
      <Outlet />
    </>
  )
}

function CounsellorLayout() {
  const { t } = useTranslation()
  const isOfficer = useAuth((s) => s.session?.effectiveRoles.includes('emergencyOfficer'))
  const scheduling = t('nav.groupScheduling')
  const clients = t('nav.groupClients')
  const items: SidebarItem[] = [
    { to: '/counsellor', label: t('nav.overview'), icon: LayoutDashboard, end: true },
    { to: '/counsellor/appointments', label: t('nav.appointments'), icon: CalendarDays, group: scheduling },
    { to: '/counsellor/availability', label: t('nav.availability'), icon: CalendarClock, group: scheduling },
    { to: '/counsellor/cases', label: t('nav.cases'), icon: FolderHeart, group: clients },
    { to: '/counsellor/referrals', label: t('nav.referrals'), icon: Share2, group: clients },
    { to: '/counsellor/groups', label: t('nav.groups'), icon: UsersRound, group: clients },
    { to: '/counsellor/alerts', label: t('nav.alerts'), icon: isOfficer ? Siren : Bell, group: t('nav.groupEmergency') },
  ]
  return <PortalLayout items={items} title={t('nav.counsellorPortal')} homeTo="/counsellor" />
}

function AdminLayout() {
  const { t } = useTranslation()
  const isAdmin = useAuth((s) => s.session?.effectiveRoles.includes('admin'))
  const insights = t('nav.groupInsights')
  const people = t('nav.groupPeople')
  const service = t('nav.groupService')
  const system = t('nav.groupSystem')
  const items: SidebarItem[] = [
    { to: '/admin/dashboard', label: t('nav.dashboard'), icon: LayoutDashboard, group: insights },
    { to: '/admin/reports', label: t('nav.reports'), icon: FileText, group: insights },
    ...(isAdmin
      ? [
          { to: '/admin/users', label: t('nav.users'), icon: Users, group: people },
          { to: '/admin/counsellors', label: t('nav.counsellors'), icon: UserCog, group: people },
          { to: '/admin/roles', label: t('nav.roles'), icon: ShieldCheck, group: people },
          { to: '/admin/content', label: t('nav.content'), icon: ScrollText, group: service },
          { to: '/admin/groups', label: t('nav.groups'), icon: UsersRound, group: service },
          { to: '/admin/waitlist', label: t('nav.waitlist'), icon: PhoneCall, group: service },
          { to: '/admin/roster', label: t('nav.roster'), icon: Siren, group: t('nav.groupEmergency') },
          { to: '/counsellor/alerts', label: t('nav.alerts'), icon: ClipboardList, group: t('nav.groupEmergency') },
          { to: '/admin/settings', label: t('nav.systemSettings'), icon: Settings2, group: system },
          { to: '/admin/audit', label: t('nav.audit'), icon: ListChecks, group: system },
        ]
      : []),
  ]
  return <PortalLayout items={items} title={t('nav.adminPortal')} homeTo="/admin/dashboard" />
}

const counsellor = (el: ReactNode) => (
  <RequireRole roles={['counsellor']}>
    <Lazy>{el}</Lazy>
  </RequireRole>
)
const admin = (el: ReactNode) => (
  <RequireRole roles={['admin']}>
    <Lazy>{el}</Lazy>
  </RequireRole>
)
const analyst = (el: ReactNode) => (
  <RequireRole roles={['admin', 'analyst']}>
    <Lazy>{el}</Lazy>
  </RequireRole>
)
const beneficiary = (el: ReactNode) => <RequireRole roles={['beneficiary']}>{el}</RequireRole>

export const router = createBrowserRouter([
  {
    element: <Root />,
    children: [
      {
        element: <AppShell />,
        children: [
          { path: '/', element: <HomePage /> },
          { path: '/self-assessment', element: <SelfAssessmentIndex /> },
          { path: '/self-assessment/:type', element: <SelfAssessmentPage /> },
          { path: '/resources', element: <ResourcesPage /> },
          { path: '/resources/:id', element: <ResourceDetailPage /> },
          { path: '/counsellors', element: <CounsellorSearchPage /> },
          { path: '/book/:id', element: <BookingPage /> },
          { path: '/emergency', element: <EmergencyPage /> },
          { path: '/login', element: <LoginPage /> },
          { path: '/register', element: <RegisterPage /> },
          { path: '/recover', element: <RecoverPage /> },
          { path: '/me', element: beneficiary(<ProfilePage />) },
          { path: '/me/appointments', element: beneficiary(<MyAppointmentsPage />) },
          { path: '/me/settings', element: beneficiary(<SettingsPage />) },
          {
            path: '/account/security',
            element: (
              <RequireRole roles={['beneficiary', 'counsellor', 'emergencyOfficer', 'admin', 'analyst']}>
                <SecurityPage />
              </RequireRole>
            ),
          },
          { path: '*', element: <NotFoundPage /> },
        ],
      },
      {
        path: '/session/:id',
        element: (
          <RequireRole roles={['beneficiary', 'counsellor']}>
            <SessionRoomPage />
          </RequireRole>
        ),
      },
      {
        path: '/counsellor',
        element: (
          <RequireRole roles={['counsellor', 'emergencyOfficer', 'admin']}>
            <CounsellorLayout />
          </RequireRole>
        ),
        children: [
          { index: true, element: counsellor(<CounsellorHome />) },
          { path: 'appointments', element: counsellor(<CounsellorAppointments />) },
          { path: 'availability', element: counsellor(<AvailabilityPage />) },
          { path: 'cases', element: counsellor(<CasesPage />) },
          { path: 'cases/:id', element: counsellor(<CasePage />) },
          { path: 'referrals', element: counsellor(<ReferralsPage />) },
          { path: 'groups', element: counsellor(<GroupsPage />) },
          {
            path: 'alerts',
            element: (
              <RequireRole roles={['counsellor', 'emergencyOfficer', 'admin']}>
                <Lazy>
                  <AlertsPage />
                </Lazy>
              </RequireRole>
            ),
          },
        ],
      },
      {
        path: '/admin',
        element: (
          <RequireRole roles={['admin', 'analyst']}>
            <AdminLayout />
          </RequireRole>
        ),
        children: [
          { index: true, element: <Navigate to="/admin/dashboard" replace /> },
          { path: 'dashboard', element: analyst(<DashboardPage />) },
          { path: 'reports', element: analyst(<ReportsPage />) },
          { path: 'users', element: admin(<UsersPage />) },
          { path: 'counsellors', element: admin(<CounsellorsAdminPage />) },
          { path: 'roles', element: admin(<RolesPage />) },
          { path: 'content', element: admin(<ContentPage />) },
          { path: 'roster', element: admin(<RosterPage />) },
          { path: 'groups', element: admin(<GroupsPage />) },
          { path: 'waitlist', element: admin(<WaitlistPage />) },
          { path: 'settings', element: admin(<SystemSettingsPage />) },
          { path: 'audit', element: admin(<AuditPage />) },
        ],
      },
    ],
  },
])
