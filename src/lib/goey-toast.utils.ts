import type { GoeyToastOffset } from './goey-toast.types';

export function toCssLength(value: GoeyToastOffset): string {
  return typeof value === 'number' ? `${value}px` : value;
}

export function clamp(value: number, min: number, max: number): number {
  if (value < min) {
    return min;
  }

  if (value > max) {
    return max;
  }

  return value;
}
