import { RouterProvider } from 'react-router-dom'
import './i18n'
import { router } from './routes/router'
import { ensureSeeded } from './services/storage'

ensureSeeded()

export default function App() {
  return <RouterProvider router={router} />
}
