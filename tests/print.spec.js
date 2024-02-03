import * as print from '../src/print';

describe('getSlideUrl function tests', () => {
  test('should return a valid slide URL', () => {
    const slide = '3-1';
    const result = print.getSlideUrl(slide);
    expect(result).toBe('#/3/1');
  });

  test('should handle invalid slide format', () => {
    const slide = 'invalid';
    const result = print.getSlideUrl(slide);
    expect(result).toBe('');
  });
});
