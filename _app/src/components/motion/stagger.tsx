'use client'

import { Children, cloneElement, isValidElement } from 'react'
import type { CSSProperties, ReactElement, ReactNode } from 'react'
import { cn } from '@/lib/utils'

/**
 * Stagger — aplica animação em cascata aos filhos diretos via --i (índice).
 * Usa o helper CSS `.vv-stagger` definido em globals.css. Cada filho ganha
 * a variável `--i` automaticamente (sem precisar mexer em cada item).
 *
 * Atalhos úteis:
 *   <Stagger as="ul">…</Stagger>
 *   <Stagger step={75}>…</Stagger>  // override do --stagger no escopo
 */
export function Stagger({
  children,
  as: Tag = 'div',
  className,
  step,
  style,
}: {
  children: ReactNode
  as?: keyof JSX.IntrinsicElements
  className?: string
  /** Override do --stagger (ms ou string CSS), só vale neste escopo. */
  step?: number | string
  style?: CSSProperties
}) {
  const Component = Tag as React.ElementType
  const stepStyle: CSSProperties =
    step != null
      ? {
          ['--stagger' as string]: typeof step === 'number' ? `${step}ms` : step,
        }
      : {}
  return (
    <Component className={cn('vv-stagger', className)} style={{ ...stepStyle, ...style }}>
      {Children.map(children, (child, index) => {
        if (!isValidElement(child)) return child
        const el = child as ReactElement<{ style?: CSSProperties }>
        return cloneElement(el, {
          style: {
            ...(el.props.style ?? {}),
            ['--i' as string]: index,
          } as CSSProperties,
        })
      })}
    </Component>
  )
}
