/**
 * LOCATE icon set — hand-drawn 1.5px stroke icons on a 24 grid.
 * Deliberately bespoke: round caps, technical feel, no external icon library.
 */
import type { SVGProps } from 'react'

type IconProps = SVGProps<SVGSVGElement> & { size?: number }

function Icon({ size = 18, children, ...rest }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {children}
    </svg>
  )
}

export const IconCrosshair = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="7.2" />
    <path d="M12 1.8v4.4M12 17.8v4.4M1.8 12h4.4M17.8 12h4.4" />
    <circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none" />
  </Icon>
)

export const IconArrowRight = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4 12h15M13 6l6 6-6 6" />
  </Icon>
)

export const IconArrowLeft = (p: IconProps) => (
  <Icon {...p}>
    <path d="M20 12H5M11 6l-6 6 6 6" />
  </Icon>
)

export const IconArrowUpRight = (p: IconProps) => (
  <Icon {...p}>
    <path d="M7 17L17 7M8 7h9v9" />
  </Icon>
)

export const IconBook = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15.5H6.5A2.5 2.5 0 0 0 4 21V5.5z" />
    <path d="M4 18.5A2.5 2.5 0 0 1 6.5 16H20" />
    <path d="M9 8h7M9 11.5h5" />
  </Icon>
)

export const IconTag = (p: IconProps) => (
  <Icon {...p}>
    <path d="M3.5 12.5V4.5a1 1 0 0 1 1-1h8l8 8-9 9-8-8z" />
    <circle cx="8" cy="8" r="1.4" fill="currentColor" stroke="none" />
  </Icon>
)

export const IconLoop = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4 9a8 8 0 0 1 14-2.5M20 15a8 8 0 0 1-14 2.5" />
    <path d="M18 3v4h-4M6 21v-4h4" />
  </Icon>
)

export const IconShieldCheck = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 3l7.5 3v5.5c0 4.6-3.2 7.7-7.5 9.5-4.3-1.8-7.5-4.9-7.5-9.5V6L12 3z" />
    <path d="M8.8 12l2.2 2.2 4.2-4.4" />
  </Icon>
)

export const IconGauge = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4 15a8 8 0 1 1 16 0" />
    <path d="M12 15l4-5" />
    <circle cx="12" cy="15" r="1.4" fill="currentColor" stroke="none" />
  </Icon>
)

export const IconWallet = (p: IconProps) => (
  <Icon {...p}>
    <path d="M3.5 7A2.5 2.5 0 0 1 6 4.5h11.5v3" />
    <path d="M3.5 7v10.5A2 2 0 0 0 5.5 19.5h14a1 1 0 0 0 1-1v-9a1 1 0 0 0-1-1H3.5" />
    <circle cx="16.5" cy="13.5" r="1.3" fill="currentColor" stroke="none" />
  </Icon>
)

export const IconPlus = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 5v14M5 12h14" />
  </Icon>
)

export const IconX = (p: IconProps) => (
  <Icon {...p}>
    <path d="M6 6l12 12M18 6L6 18" />
  </Icon>
)

export const IconCheck = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4.5 12.5l5 5L19.5 7" />
  </Icon>
)

export const IconAlert = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 3.5L21.5 20h-19L12 3.5z" />
    <path d="M12 10v4.5" />
    <circle cx="12" cy="17.2" r="0.9" fill="currentColor" stroke="none" />
  </Icon>
)

export const IconChevronDown = (p: IconProps) => (
  <Icon {...p}>
    <path d="M6 9.5l6 6 6-6" />
  </Icon>
)

export const IconClock = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 7v5.5l3.5 2" />
  </Icon>
)

export const IconLock = (p: IconProps) => (
  <Icon {...p}>
    <rect x="5" y="10.5" width="14" height="9.5" rx="2" />
    <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" />
    <circle cx="12" cy="15" r="1.3" fill="currentColor" stroke="none" />
  </Icon>
)

export const IconMenu = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4 7h16M4 12h16M4 17h16" />
  </Icon>
)

export const IconScan = (p: IconProps) => (
  <Icon {...p}>
    <path d="M3.5 8V5a1.5 1.5 0 0 1 1.5-1.5h3M16 3.5h3A1.5 1.5 0 0 1 20.5 5v3M20.5 16v3a1.5 1.5 0 0 1-1.5 1.5h-3M8 20.5H5A1.5 1.5 0 0 1 3.5 19v-3" />
    <path d="M3.5 12h17" />
  </Icon>
)

/** Brand mark — the LOCATE crosshair (soft indigo on near-black). */
export function LocateMark({ size = 26, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" className={className} aria-hidden="true" focusable="false">
      <rect width="32" height="32" rx="7" fill="#0A0A0A" stroke="#313131" strokeWidth="1" />
      <circle cx="16" cy="16" r="7.5" fill="none" stroke="#6798FF" strokeWidth="2" />
      <path d="M16 4v5M16 23v5M4 16h5M23 16h5" stroke="#6798FF" strokeWidth="2" strokeLinecap="round" />
      <circle cx="16" cy="16" r="2.2" fill="#6798FF" />
    </svg>
  )
}
