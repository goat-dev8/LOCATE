import { useStore } from '../../state/StoreProvider'
import { IconX } from '../primitives/icons'

/** Toast stack — quiet, dark, mono. Feedback for every important action. */
export function Toaster() {
  const { state, actions } = useStore()
  if (state.toasts.length === 0) return null
  return (
    <div className="toaster" role="status" aria-live="polite">
      {state.toasts.map((t) => (
        <div key={t.id} className={`toast toast--${t.tone}`}>
          <span className="toast-tick" aria-hidden="true" />
          <div>
            <div className="toast-title">{t.title}</div>
            {t.body && <div className="toast-body">{t.body}</div>}
          </div>
          <button className="toast-dismiss" onClick={() => actions.dismissToast(t.id)} aria-label="Dismiss notification">
            <IconX size={13} />
          </button>
        </div>
      ))}
    </div>
  )
}
