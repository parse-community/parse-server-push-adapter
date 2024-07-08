import { booleanParser } from '../src/utils.js';

describe('utils', () => {
  it('booleanParser', () => {
    expect(booleanParser(true)).toBe(true);
    expect(booleanParser('true')).toBe(true);
    expect(booleanParser('1')).toBe(true);
    expect(booleanParser('false')).toBe(false);
  });
});
