import { describe, expect, it } from 'vitest';
import { isMatched, lineKey, mixLabel, resolveMix } from '../mix';

const colours = ['Black', 'Graphite', 'Glacier Blue'];
const cases = [
  { label: 'Cabin', colours },
  { label: 'Medium', colours },
  { label: 'Large', colours },
];

describe('mixed-colour sets', () => {
  it('keys a plain line by variant and a mixed line by variant and colours', () => {
    expect(lineKey('v1')).toBe('v1');
    expect(lineKey('v1', [])).toBe('v1');
    expect(lineKey('v1', ['Black', 'Graphite', 'Glacier Blue'])).toBe('v1|Black|Graphite|Glacier Blue');
  });

  it('accepts known colours case-insensitively and returns canonical names', () => {
    expect(resolveMix(['black', 'GRAPHITE', 'glacier blue'], cases)).toEqual(['Black', 'Graphite', 'Glacier Blue']);
  });

  it('rejects unknown colours, wrong counts and non-arrays', () => {
    expect(resolveMix(['Black', 'Pink', 'Black'], cases)).toBeNull();
    expect(resolveMix(['Black', 'Black'], cases)).toBeNull();
    expect(resolveMix('Black', cases)).toBeNull();
    expect(resolveMix(['Black'], [])).toBeNull();
  });

  it('labels each case with its colour', () => {
    expect(mixLabel(['Black', 'Graphite', 'Glacier Blue'], cases)).toBe('Cabin Black · Medium Graphite · Large Glacier Blue');
  });

  it('knows when all three match', () => {
    expect(isMatched(['Black', 'Black', 'Black'])).toBe(true);
    expect(isMatched(['Black', 'Graphite', 'Black'])).toBe(false);
  });
});
