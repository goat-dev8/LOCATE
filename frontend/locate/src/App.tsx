/**
 * LOCATE — root component.
 * One product, one workspace: a landing site that explains the mechanism,
 * and an app that runs it. Everything is client-side preview state.
 */
import { LocateProvider, useStore } from './state/StoreProvider'
import { Landing } from './components/landing/Landing'
import { AppShell } from './components/app/AppShell'
import { Toaster } from './components/app/Toaster'
import { IconCrosshair } from './components/primitives/icons'
import './styles/landing.css'
import './styles/app.css'

function Root() {
  const { state } = useStore()

  if (!state.booted) {
    return (
      <div className="boot">
        <div className="boot-inner">
          <IconCrosshair size={34} className="locate-spin" />
          <span className="boot-label">Connecting to rail</span>
        </div>
      </div>
    )
  }

  return (
    <>
      {state.view === 'landing' ? <Landing /> : <AppShell />}
      <Toaster />
    </>
  )
}

export default function App() {
  return (
    <div className="locate">
      <LocateProvider>
        <Root />
      </LocateProvider>
    </div>
  )
}
