import { describe, expect, it } from 'vitest';
import { morphPath, morphPathCenter } from './goey-toast-item.component';

describe('morphPath', () => {
  it('returns a pill path at progress 0', () => {
    const path = morphPath(100, 300, 120, 0);

    expect(path).toContain('M 0,17');
    expect(path).toContain('H 83');
    expect(path).not.toContain(' Q ');
  });

  it('interpolates body width during expansion', () => {
    const half = morphPath(100, 300, 120, 0.5);
    const full = morphPath(100, 300, 120, 1);

    expect(half).toContain('L 200,');
    expect(full).toContain('L 300,');
  });

  it('keeps pill shape when expanded body is too short for rounded corners', () => {
    const path = morphPath(120, 300, 38, 1);

    expect(path).toContain('H 103');
    expect(path).not.toContain(' Q ');
  });
});

describe('morphPathCenter', () => {
  it('anchors compact pill at centered offset', () => {
    const path = morphPathCenter(100, 300, 120, 0);

    expect(path.startsWith('M 100,17')).toBe(true);
  });

  it('expands symmetrically to full body width', () => {
    const path = morphPathCenter(100, 300, 120, 1);

    expect(path).toContain('L 300,104');
    expect(path).toContain('H 16');
  });
});
