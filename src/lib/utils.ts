import { twMerge } from 'tailwind-merge'

/**
 * Joins class names, letting later Tailwind classes override earlier ones
 * (`cn('text-text-primary', 'text-expense')` → `text-expense`). A plain join
 * left the winner to stylesheet order, so overrides silently failed.
 */
export function cn(...classes: (string | false | null | undefined)[]): string {
  return twMerge(classes.filter(Boolean).join(' '))
}
