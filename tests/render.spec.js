import * as render from '../src/render.js';

describe('isAbsoluteUrl function tests', () => {
  test('should return true for absolute URLs', () => {
    expect(render.isAbsoluteUrl('http://example.com')).toBe(true);
    expect(render.isAbsoluteUrl('https://example.com')).toBe(true);
    expect(render.isAbsoluteUrl('//cdn.example.com')).toBe(true);
  });

  test('should return false for relative URLs', () => {
    expect(render.isAbsoluteUrl('/path/to/resource')).toBe(false);
    expect(render.isAbsoluteUrl('path/to/resource')).toBe(false);
    expect(render.isAbsoluteUrl('./path/to/resource')).toBe(false);
  });

  test('should return false for URLs containing newline characters', () => {
    expect(render.isAbsoluteUrl('http://example.com\n')).toBe(false);
  });
});
