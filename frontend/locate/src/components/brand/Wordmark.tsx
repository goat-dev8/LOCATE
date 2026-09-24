import { LocateMark } from '../primitives/icons'

/** LOCATE wordmark — serif logotype + crosshair mark. */
export function Wordmark({ dark = false, size = 22 }: { dark?: boolean; size?: number }) {
  return (
    <span className={`wordmark${dark ? ' wordmark--dark' : ''}`}>
      <LocateMark size={size + 4} />
      <span className="wordmark-text" style={{ fontSize: size }}>
        LOCATE
      </span>
    </span>
  )
}
