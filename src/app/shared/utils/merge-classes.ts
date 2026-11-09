import { twMerge } from 'tailwind-merge';
import { ClassValue, clsx } from 'clsx';
import { generateId as safeId } from '@shared/utils/id';

export type { ClassValue };

export function mergeClasses(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function transform(value: boolean | string): boolean {
  return typeof value === 'string' ? value === '' : value;
}

/** Usa o gerador com fallback: `crypto.randomUUID` não existe em HTTP fora do localhost (jogo na rede local). */
export function generateId(prefix = ''): string {
  const id = safeId(prefix || 'id');
  return prefix ? `${prefix}-${id}` : id;
}

export const noopFun = () => void 0;

export const isElementContentTruncated = (element: HTMLElement | undefined): boolean => {
  if (!element) {
    return false;
  }
  const range = document.createRange();
  range.selectNodeContents(element);
  const rangeWidth = range.getBoundingClientRect().width;
  const elementWidth = element.getBoundingClientRect().width;

  return rangeWidth > elementWidth;
};