/**
 * LOCATE UI primitives — small, semantic, built on the design system CSS.
 * These are the only building blocks views are allowed to compose with.
 */
import {
  useEffect,
  useId,
  useRef,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
} from 'react'
import { useReveal } from '../../hooks/usePerception'
import { IconCheck, IconX } from './icons'

/* ------------------------------------------------------------------ */
/* button                                                              */
/* ------------------------------------------------------------------ */

type BtnVariant = 'primary' | 'ghost' | 'accent' | 'danger'

interface BtnProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: BtnVariant
  size?: 'md' | 'sm'
  block?: boolean
  busy?: boolean
  arrow?: boolean
}

export function Btn({
  variant = 'primary',
  size = 'md',
  block,
  busy,
  arrow,
  className = '',
  children,
  disabled,
  ...rest
}: BtnProps) {
  return (
    <button
      className={[
        'btn',
        `btn-${variant}`,
        size === 'sm' ? 'btn-sm' : '',
        block ? 'btn-block' : '',
        busy ? 'is-busy' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      disabled={disabled || busy}
      {...rest}
    >
      {busy && <span className="btn-spinner" aria-hidden="true" />}
      {children}
      {arrow && !busy && <span className="arrow">→</span>}
    </button>
  )
}

/* ------------------------------------------------------------------ */
/* status chip                                                         */
/* ------------------------------------------------------------------ */

export type ChipTone = 'neutral' | 'pos' | 'warn' | 'neg' | 'dark'

export function Chip({
  tone = 'neutral',
  dot = true,
  children,
  className = '',
}: {
  tone?: ChipTone
  dot?: boolean
  children: ReactNode
  className?: string
}) {
  return (
    <span className={`chip chip-${tone} ${className}`}>
      {dot && <span className="chip-dot" aria-hidden="true" />}
      {children}
    </span>
  )
}

/** Maps domain statuses to chip tones. */
export function statusTone(status: string): ChipTone {
  switch (status) {
    case 'ACTIVE':
    case 'TAKEN':
    case 'SETTLED':
    case 'RETURNED':
    case 'VERIFIED':
      return 'pos'
    case 'CLAIMABLE':
      return 'warn'
    case 'CLAIMED':
    case 'CANCELLED':
    case 'REFUSED':
      return 'neg'
    default:
      return 'neutral'
  }
}

/* ------------------------------------------------------------------ */
/* stat block                                                          */
/* ------------------------------------------------------------------ */

export function Stat({
  label,
  value,
  sub,
  xl,
}: {
  label: ReactNode
  value: ReactNode
  sub?: ReactNode
  xl?: boolean
}) {
  return (
    <div className="stat">
      <span className="stat-label">{label}</span>
      <span className={`stat-value${xl ? ' stat-value--xl' : ''} num`}>{value}</span>
      {sub && <span className="stat-sub">{sub}</span>}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* data rows                                                           */
/* ------------------------------------------------------------------ */

export function RowLine({ k, v, tone }: { k: ReactNode; v: ReactNode; tone?: 'ink' | 'lime' | 'amber' | 'red' }) {
  // tone names are stable data labels; the dark theme maps them to
  // accent (positive), warn, and danger semantics.
  const style =
    tone === 'lime'
      ? { color: 'var(--accent-soft)' }
      : tone === 'amber'
        ? { color: 'var(--warn-soft)' }
        : tone === 'red'
          ? { color: 'var(--danger-soft)' }
          : undefined
  return (
    <div className="row-line">
      <span className="row-key">{k}</span>
      <span className="row-val num" style={style}>
        {v}
      </span>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* reveal wrapper                                                      */
/* ------------------------------------------------------------------ */

export function Reveal({
  children,
  delay = 0,
  className = '',
  as: Tag = 'div',
}: {
  children: ReactNode
  delay?: number
  className?: string
  as?: 'div' | 'section' | 'li' | 'article'
}) {
  const ref = useReveal<HTMLDivElement>()
  return (
    <Tag
      ref={ref as never}
      className={`reveal ${className}`}
      style={delay ? { ['--reveal-delay' as never]: `${delay}ms` } : undefined}
    >
      {children}
    </Tag>
  )
}

/* ------------------------------------------------------------------ */
/* drawer                                                              */
/* ------------------------------------------------------------------ */

export function Drawer({
  open,
  onClose,
  title,
  children,
  footer,
}: {
  open: boolean
  onClose: () => void
  title: ReactNode
  children: ReactNode
  footer?: ReactNode
}) {
  const panelRef = useRef<HTMLDivElement>(null)
  const restoreRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!open) return
    restoreRef.current = document.activeElement as HTMLElement | null
    const panel = panelRef.current
    panel?.focus()
    document.documentElement.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.documentElement.style.overflow = ''
      window.removeEventListener('keydown', onKey)
      restoreRef.current?.focus?.()
    }
  }, [open, onClose])

  return (
    <>
      <div className={`drawer-overlay${open ? ' open' : ''}`} onClick={onClose} aria-hidden="true" />
      <div
        ref={panelRef}
        className={`drawer${open ? ' open' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === 'string' ? title : 'Dialog'}
        tabIndex={-1}
      >
        <div className="drawer-head">
          <div className="drawer-title">{title}</div>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            <IconX size={16} />
          </button>
        </div>
        <div className="drawer-body">{children}</div>
        {footer && <div className="drawer-foot">{footer}</div>}
      </div>
    </>
  )
}

/* ------------------------------------------------------------------ */
/* form field                                                          */
/* ------------------------------------------------------------------ */

interface FieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'className'> {
  label: string
  suffix?: string
  aux?: ReactNode
  hint?: string
  error?: string
}

export function Field({ label, suffix, aux, hint, error, id, ...rest }: FieldProps) {
  const autoId = useId()
  const fieldId = id ?? autoId
  return (
    <div className="field">
      <label className="field-label" htmlFor={fieldId}>
        <span>{label}</span>
        {aux && <span className="field-aux">{aux}</span>}
      </label>
      <div className="field-input">
        <input id={fieldId} {...rest} />
        {suffix && <span className="field-suffix">{suffix}</span>}
      </div>
      {error ? <div className="field-error">{error}</div> : hint ? <div className="field-hint">{hint}</div> : null}
    </div>
  )
}

export function SelectField({
  label,
  children,
  id,
  ...rest
}: SelectHTMLAttributes<HTMLSelectElement> & { label: string }) {
  const autoId = useId()
  const fieldId = id ?? autoId
  return (
    <div className="field">
      <label className="field-label" htmlFor={fieldId}>
        <span>{label}</span>
      </label>
      <div className="field-input">
        <select id={fieldId} {...rest}>
          {children}
        </select>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* segmented control                                                   */
/* ------------------------------------------------------------------ */

export interface SegmentOption<T extends string | number> {
  value: T
  label: string
}

export function Segmented<T extends string | number>({
  options,
  value,
  onChange,
  full,
  ariaLabel,
}: {
  options: readonly SegmentOption<T>[]
  value: T
  onChange: (v: T) => void
  full?: boolean
  ariaLabel: string
}) {
  return (
    <div className={`segmented${full ? ' segmented--full' : ''}`} role="group" aria-label={ariaLabel}>
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          aria-pressed={o.value === value}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* maturity ring                                                       */
/* ------------------------------------------------------------------ */

export function MaturityRing({
  progress,
  size = 128,
  children,
}: {
  /** 0..1 remaining fraction */
  progress: number
  size?: number
  children?: ReactNode
}) {
  const r = 56
  const c = 2 * Math.PI * r
  const clamped = Math.max(0, Math.min(1, progress))
  return (
    <div className="ring-wrap" style={{ width: size, height: size }}>
      <svg viewBox="0 0 128 128" width={size} height={size} aria-hidden="true">
        <circle className="ring-track" cx="64" cy="64" r={r} />
        <circle
          className="ring-fill"
          cx="64"
          cy="64"
          r={r}
          strokeDasharray={c}
          strokeDashoffset={c * (1 - clamped)}
        />
      </svg>
      <div className="ring-center">{children}</div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* staged progress (used by drawers during settlement)                 */
/* ------------------------------------------------------------------ */

export function StagedProgress({
  steps,
  current,
}: {
  steps: string[]
  /** index of the running step; steps before it are done */
  current: number
}) {
  return (
    <div className="stages" role="status" aria-live="polite">
      {steps.map((s, i) => (
        <div key={s} className={`stage-step${i < current ? ' done' : ''}${i === current ? ' active' : ''}`}>
          <span className="step-dot">{i < current ? <IconCheck size={10} /> : null}</span>
          {s}
        </div>
      ))}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* notices                                                             */
/* ------------------------------------------------------------------ */

export function Notice({
  tone = 'info',
  icon,
  children,
}: {
  tone?: 'info' | 'warn' | 'lime' | 'neg'
  icon?: ReactNode
  children: ReactNode
}) {
  return (
    <div className={`notice notice--${tone}`}>
      {icon}
      <div>{children}</div>
    </div>
  )
}
