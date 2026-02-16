import { describe, expect, it } from 'vitest';
import { morphPath, morphPathCenter } from './goey-toast-item.component';

function commandPair(path: string, command: 'M' | 'L'): [number, number] {
  const match = new RegExp(`\\b${command}\\s*([-+]?\\d*\\.?\\d+),\\s*([-+]?\\d*\\.?\\d+)`).exec(path);
  if (!match) {
    throw new Error(`Missing "${command}" command in path: ${path}`);
  }

  return [Number(match[1]), Number(match[2])];
}

function hasHorizontalTo(path: string, target: number): boolean {
  return Array.from(path.matchAll(/\bH\s*([-+]?\d*\.?\d+)/g))
    .some((match) => Math.abs(Number(match[1]) - target) < 0.001);
}

function hasLineTo(path: string, xTarget: number, yTarget?: number): boolean {
  return Array.from(path.matchAll(/\bL\s*([-+]?\d*\.?\d+),\s*([-+]?\d*\.?\d+)/g))
    .some((match) => {
      const x = Number(match[1]);
      const y = Number(match[2]);
      if (Math.abs(x - xTarget) >= 0.001) {
        return false;
      }

      if (typeof yTarget === 'number' && Math.abs(y - yTarget) >= 0.001) {
        return false;
      }

      return true;
    });
}

describe('morphPath', () => {
  it('returns a pill path at progress 0', () => {
    const path = morphPath(100, 300, 120, 0);
    const [moveX, moveY] = commandPair(path, 'M');

    expect(moveX).toBeCloseTo(0, 3);
    expect(moveY).toBeCloseTo(17, 3);
    expect(hasHorizontalTo(path, 83)).toBe(true);
    expect(path).not.toMatch(/\bQ\b/);
  });

  it('interpolates body width during expansion', () => {
    const half = morphPath(100, 300, 120, 0.5);
    const full = morphPath(100, 300, 120, 1);

    expect(hasLineTo(half, 200)).toBe(true);
    expect(hasLineTo(full, 300)).toBe(true);
  });

  it('keeps pill shape when expanded body is too short for rounded corners', () => {
    const path = morphPath(120, 300, 38, 1);

    expect(hasHorizontalTo(path, 103)).toBe(true);
    expect(path).not.toMatch(/\bQ\b/);
  });

  it('supports configurable pill radius', () => {
    const path = morphPath(100, 300, 120, 0, { pill: 10, body: 8 });
    const [moveX, moveY] = commandPair(path, 'M');

    expect(moveX).toBeCloseTo(0, 3);
    expect(moveY).toBeCloseTo(10, 3);
  });

  it('supports square pill corners at radius 0', () => {
    const path = morphPath(100, 300, 120, 0, { pill: 0, body: 0 });

    expect(path).toMatch(/\bM\s*0,\s*0\b/);
    expect(path).not.toMatch(/\bA\b/);
  });
});

describe('morphPathCenter', () => {
  it('anchors compact pill at centered offset', () => {
    const path = morphPathCenter(100, 300, 120, 0);
    const [moveX, moveY] = commandPair(path, 'M');

    expect(moveX).toBeCloseTo(100, 3);
    expect(moveY).toBeCloseTo(17, 3);
    expect(path).not.toMatch(/\bQ\b/);
  });

  it('expands symmetrically to full body width', () => {
    const path = morphPathCenter(100, 300, 120, 1);

    expect(hasLineTo(path, 300, 104)).toBe(true);
    expect(hasHorizontalTo(path, 16)).toBe(true);
    expect(path).toMatch(/\bQ\b/);
  });
});
