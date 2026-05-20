/**
 * IconHanger — cabide minimalista. Símbolo do provador / fashion da Cabine.
 * Substitui o "✦" anterior para alinhar a identidade ao universo de moda.
 */
export function IconHanger({
  size = 14,
  color = 'currentColor',
  strokeWidth = 1.7,
  className,
}: {
  size?: number
  color?: string
  strokeWidth?: number
  className?: string
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d="M12 9.2V7.6a2.1 2.1 0 1 1 2.1 2.1" />
      <path d="M12 9.2 3.3 16.4a.9.9 0 0 0 .55 1.6h16.3a.9.9 0 0 0 .55-1.6L12 9.2Z" />
    </svg>
  )
}
