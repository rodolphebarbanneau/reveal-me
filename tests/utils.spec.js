import fs from 'node:fs/promises';
import path from 'node:path';

import { glob } from 'glob';

import * as utils from '../src/utils';
import { NoEntryError } from './fixtures/errors';

jest.mock('node:fs/promises');
jest.mock('glob');

describe('debounce function tests', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  test('should be called only once after the specified wait time', () => {
    const mockFn = jest.fn();
    const debouncedFn = utils.debounce(mockFn, 100);
    debouncedFn();
    debouncedFn();
    debouncedFn();
    jest.runAllTimers();
    expect(mockFn).toHaveBeenCalledTimes(1);
  });
});

describe('isDirectory function tests', () => {
  beforeEach(() => {
    utils.isDirectory.cache.clear();
    jest.restoreAllMocks();
  });

  test('should return true for a directory path', async () => {
    fs.stat.mockResolvedValue({ isDirectory: () => true });
    const result = await utils.isDirectory('/path/to/directory');
    expect(result).toBe(true);
  });

  test('should return false for a file path', async () => {
    fs.stat.mockResolvedValue({ isDirectory: () => false });
    const result = await utils.isDirectory('/path/to/file.txt');
    expect(result).toBe(false);
  });

  test('should return false for a non-existent path', async () => {
    fs.stat.mockRejectedValue(new Error('ENOENT: no such file or directory'));
    const result = await utils.isDirectory('/path/does/not/exist');
    expect(result).toBe(false);
  });

  test('should correctly resolve the given path before checking', async () => {
    jest.spyOn(path, 'resolve');
    fs.stat.mockImplementation(async (p) => {
      if (p === '/path/to/directory') return { isDirectory: () => true };
      throw new Error('Unexpected path');
    });
    await utils.isDirectory('/path/to/directory');
    expect(path.resolve).toHaveBeenCalledWith('/path/to/directory');
  });
});

describe('isFile function tests', () => {
  beforeEach(() => {
    utils.isFile.cache.clear();
    jest.restoreAllMocks();
  });

  test('should return true for a file path', async () => {
    fs.stat.mockResolvedValue({ isFile: () => true });
    const result = await utils.isFile('/path/to/file.txt');
    expect(result).toBe(true);
  });

  test('should return false for a directory path', async () => {
    fs.stat.mockResolvedValue({ isFile: () => false });
    const result = await utils.isFile('/path/to/directory');
    expect(result).toBe(false);
  });

  test('should return false for a non-existent path', async () => {
    fs.stat.mockRejectedValue(new Error('ENOENT: no such file or directory'));
    const result = await utils.isFile('/path/does/not/exist');
    expect(result).toBe(false);
  });

  test('should correctly resolve the given path before checking', async () => {
    jest.spyOn(path, 'resolve');
    fs.stat.mockImplementation(async (p) => {
      if (p === '/path/to/file.txt') return { isFile: () => true };
      throw new Error('Unexpected path');
    });
    await utils.isFile('/path/to/file.txt');
    expect(path.resolve).toHaveBeenCalledWith('/path/to/file.txt');
  });
});

describe('isWithinDirectory function tests', () => {
  test('should return true for a path within the base path', () => {
    const targetPath = '/path/to/file.txt';
    const basePath = '/path/to';
    const result = utils.isWithinDirectory(targetPath, basePath);
    expect(result).toBe(true);
  });

  test('should return true for a path equal to the base path', () => {
    const targetPath = '/path/to';
    const basePath = '/path/to';
    const result = utils.isWithinDirectory(targetPath, basePath);
    expect(result).toBe(true);
  });

  test('should return false for a path outside the base path', () => {
    const targetPath = '/other/path/file.txt';
    const basePath = '/path/to';
    const result = utils.isWithinDirectory(targetPath, basePath);
    expect(result).toBe(false);
  });

  test('should handle relative paths and default to current working directory', () => {
    const targetPath = 'file.txt';
    const result = utils.isWithinDirectory(targetPath);
    expect(result).toBe(true);
  });
});

describe('getDirectory function tests', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  test('should return the directory of a directory path', async () => {
    jest.spyOn(utils, 'isDirectory').mockResolvedValue(true);
    const result = await utils.getDirectory('/path/to/directory');
    expect(result).toBe('/path/to/directory');
  });

  test('should return the directory of a file path', async () => {
    jest.spyOn(utils, 'isDirectory').mockResolvedValue(false);
    const result = await utils.getDirectory('/path/to/file.txt');
    expect(result).toBe('/path/to');
  });

  test('should handle errors from is directory', async () => {
    jest.spyOn(utils, 'isDirectory').mockRejectedValue(new Error('Test error'));
    const result = await utils.getDirectory('/path/to/directory');
    expect(result).toBe('/path/to/directory');
  });
});

describe('getReadablePath function tests', () => {
  test('should return an identical path for a short file path', () => {
    const result = utils.getReadablePath('short/file.txt');
    expect(result).toEqual('short/file.txt');
  });

  test('should return a readable path for a file in a deeply nested directory', () => {
    const result = utils.getReadablePath('path/to/very/deeply/nested/file.txt');
    expect(result).toEqual('path/to...nested/file.txt');
  });
});

describe('loadJSON function tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should load and parse a valid JSON file', async () => {
    fs.readFile.mockResolvedValue('{"key": "value"}');
    const filePath = '/path/to/file.json';
    const result = await utils.loadJSON(filePath);
    expect(result).toEqual({ key: 'value' });
    expect(fs.readFile).toHaveBeenCalledWith(filePath, 'utf8');
  });

  test('should handle an empty JSON file', async () => {
    fs.readFile.mockResolvedValue('');
    const filePath = '/path/to/empty.json';
    const result = await utils.loadJSON(filePath);
    expect(result).toEqual({});
    expect(fs.readFile).toHaveBeenCalledWith(filePath, 'utf8');
  });

  test('should handle a JSON parsing error', async () => {
    fs.readFile.mockResolvedValue('invalid JSON');
    const filePath = '/path/to/invalid.json';
    const result = await utils.loadJSON(filePath);
    expect(result).toEqual({});
    expect(fs.readFile).toHaveBeenCalledWith(filePath, 'utf8');
  });

  test('should handle a file reading error', async () => {
    fs.readFile.mockRejectedValue(new Error('File not found'));
    const filePath = '/path/to/nonexistent.json';
    const result = await utils.loadJSON(filePath);
    expect(result).toEqual({});
    expect(fs.readFile).toHaveBeenCalledWith(filePath, 'utf8');
  });
});

describe('makeDirectory function tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should create a directory if it does not exist', async () => {
    const targetPath = '/path/to/new/directory';
    jest.spyOn(utils, 'getDirectory').mockResolvedValue(targetPath);
    fs.access.mockRejectedValue(new NoEntryError());
    fs.mkdir.mockResolvedValue(targetPath);
    const result = await utils.makeDirectory(targetPath);
    expect(result).toBe(targetPath);
    expect(fs.access).toHaveBeenCalledWith(path.dirname(targetPath));
    expect(fs.mkdir).toHaveBeenCalledWith(path.dirname(targetPath), { recursive: true });
  });

  test('should not create a directory if it already exists', async () => {
    const targetPath = '/path/to/existing/directory';
    jest.spyOn(utils, 'getDirectory').mockResolvedValue(targetPath);
    fs.access.mockResolvedValue(undefined);
    const result = await utils.makeDirectory(targetPath);
    expect(result).toBe(undefined);
    expect(fs.access).toHaveBeenCalledWith(path.dirname(targetPath));
    expect(fs.mkdir).not.toHaveBeenCalled();
  });

  test('should handle other errors', async () => {
    const targetPath = '/path/to/error/directory';
    const customError = new Error('Custom error message');
    jest.spyOn(utils, 'getDirectory').mockResolvedValue(targetPath);
    fs.access.mockRejectedValue(customError);
    try {
      await utils.makeDirectory(targetPath);
      expect(true).toBe(false);
    } catch (error) {
      expect(error).toBe(customError);
      expect(fs.access).toHaveBeenCalledWith(path.dirname(targetPath));
      expect(fs.mkdir).not.toHaveBeenCalled();
    }
  });
});

describe('mergeObjects function tests', () => {
  test('should merge two objects with non-overlapping properties', () => {
    const obj1 = { a: 1, b: 2 };
    const obj2 = { c: 3, d: 4 };
    const mergedObj = utils.mergeObjects(obj1, obj2);
    expect(mergedObj).toEqual({ a: 1, b: 2, c: 3, d: 4 });
  });

  test('should merge two objects with overlapping properties', () => {
    const obj1 = { a: 1, b: 2, c: 3 };
    const obj2 = { b: 4, c: 5, d: 6 };
    const mergedObj = utils.mergeObjects(obj1, obj2);
    expect(mergedObj).toEqual({ a: 1, b: 2, c: 3, d: 6 });
  });

  test('should merge three objects with nested properties', () => {
    const obj1 = { a: { x: 1, y: 2 }, b: { z: 3 } };
    const obj2 = { a: { y: 3 }, c: { w: 4 } };
    const obj3 = { a: { z: 5 }, d: { v: 6 } };
    const mergedObj = utils.mergeObjects(obj1, obj2, obj3);
    expect(mergedObj).toEqual({
      a: { x: 1, y: 2, z: 5 },
      b: { z: 3 },
      c: { w: 4 },
      d: { v: 6 },
    });
  });

  test('should merge objects with empty and non-object properties', () => {
    const obj1 = { a: 1, b: 2 };
    const obj2 = { a: { x: 1 }, b: 2 };
    const obj3 = { a: { y: 2 }, b: undefined, c: { z: 3 } };
    const mergedObj = utils.mergeObjects(obj1, obj2, obj3);
    expect(mergedObj).toEqual({
      a: 1,
      b: 2,
      c: { z: 3 },
    });
  });

  test('should merge objects with null properties', () => {
    const obj1 = { a: { x: null }, b: null };
    const obj2 = { a: { y: 2 }, b: 2 };
    const mergedObj = utils.mergeObjects(obj1, obj2);
    expect(mergedObj).toEqual({
      a: { x: null, y: 2 },
      b: null,
    });
  });
});

describe('sanitize function tests', () => {
  test('should sanitize a basic URL', () => {
    const url = 'http://example.com/path/to/resource';
    const sanitizedUrl = utils.sanitize(url);
    expect(sanitizedUrl).toBe('http://example.com/path/to/resource');
  });

  test('should sanitize a URL with query parameters', () => {
    const url = 'http://example.com/path/to/resource?param1=value1&param2=value2';
    const sanitizedUrl = utils.sanitize(url);
    expect(sanitizedUrl).toBe('http://example.com/path/to/resource');
  });

  test('should sanitize a URL with directory traversal (..)', () => {
    const url = 'http://example.com/path/../to/resource';
    const sanitizedUrl = utils.sanitize(url);
    expect(sanitizedUrl).toBe('http://example.com/path//to/resource');
  });

  test('should sanitize a URL with leading and trailing slashes', () => {
    const url = '/path/to/resource/';
    const sanitizedUrl = utils.sanitize(url);
    expect(sanitizedUrl).toBe('path/to/resource');
  });

  test('should sanitize a URL with prefix and suffix', () => {
    const url = 'path/to/resource';
    const options = { prefix: 'https://example.com/', suffix: '/info' };
    const sanitizedUrl = utils.sanitize(url, options);
    expect(sanitizedUrl).toBe('https://example.com/path/to/resource/info');
  });

  test('should sanitize a URL with prefix only', () => {
    const url = 'path/to/resource';
    const options = { prefix: 'https://example.com/' };
    const sanitizedUrl = utils.sanitize(url, options);
    expect(sanitizedUrl).toBe('https://example.com/path/to/resource');
  });

  test('should sanitize a URL with suffix only', () => {
    const url = 'path/to/resource';
    const options = { prefix: '/', suffix: '/info' };
    const sanitizedUrl = utils.sanitize(url, options);
    expect(sanitizedUrl).toBe('/path/to/resource/info');
  });

  test('should sanitize an empty URL', () => {
    const url = '';
    const sanitizedUrl = utils.sanitize(url);
    expect(sanitizedUrl).toBe('');
  });
});

describe('searchFiles function tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should find files matching the filter with default options', async () => {
    const filter = 'file1.js';
    glob.mockImplementation((pattern, options) =>
      options.cwd === process.cwd() && ['**/*file1.js*', '**/*file1.js*/**'].includes(pattern)
        ? Promise.resolve(['file1.js'])
        : Promise.resolve([]),
    );
    const result = await utils.searchFiles(filter);
    expect(result).toEqual(['file1.js']);
  });

  test('should find files matching the filter pattern', async () => {
    const filter = '*.js*';
    const cwd = '/path/to/search';
    const exts = ['.js'];
    glob.mockImplementation((pattern, options) =>
      options.cwd === cwd && pattern === filter
        ? Promise.resolve(['file1.js', 'file2.jsx', 'dir1/file3.js', 'dir2/file4.jsx'])
        : Promise.resolve([]),
    );
    const result = await utils.searchFiles(filter, { cwd, exts });
    expect(result).toEqual(['dir1/file3.js', 'file1.js']);
  });

  test('should return an empty array when no files match the filter pattern', async () => {
    const filter = '*.js';
    glob.mockImplementation(() => Promise.resolve([]));
    const result = await utils.searchFiles(filter);
    expect(result).toEqual([]);
  });
});

describe('toArray function tests', () => {
  test('should convert a string to an array', () => {
    const inputString = 'apple,banana,cherry';
    const resultArray = utils.toArray(inputString);
    expect(resultArray).toEqual(['apple', 'banana', 'cherry']);
  });

  test('should return an empty array for undefined input', () => {
    const undefinedInput = undefined;
    const resultArray = utils.toArray(undefinedInput);
    expect(resultArray).toEqual([]);
  });

  test('should return an empty array for null input', () => {
    const nullInput = null;
    const resultArray = utils.toArray(nullInput);
    expect(resultArray).toEqual([]);
  });

  test('should return the input array unchanged', () => {
    const inputArray = ['apple', 'banana', 'cherry'];
    const resultArray = utils.toArray(inputArray);
    expect(resultArray).toEqual(inputArray);
  });

  test('should return an empty array for non-array, non-string inputs', () => {
    const inputObject = { fruit: 'apple' };
    const resultArray = utils.toArray(inputObject);
    expect(resultArray).toEqual([{ fruit: 'apple' }]);
  });

  test('should handle an empty string input', () => {
    const emptyString = '';
    const resultArray = utils.toArray(emptyString);
    expect(resultArray).toEqual(['']);
  });

  test('should handle a string with spaces', () => {
    const stringWithSpaces = 'apple, banana , cherry ';
    const resultArray = utils.toArray(stringWithSpaces);
    expect(resultArray).toEqual(['apple', 'banana', 'cherry']);
  });
});

describe('toTitleCase function tests', () => {
  test('should convert a lowercase string to title case', () => {
    const lowercaseStr = 'this is a title case test';
    const resultStr = utils.toTitleCase(lowercaseStr);
    expect(resultStr).toBe('This Is A Title Case Test');
  });

  test('should handle a string with hyphens and underscores', () => {
    const strWithHyphensUnderscores = 'word1_word2-word3_word4';
    const resultStr = utils.toTitleCase(strWithHyphensUnderscores);
    expect(resultStr).toBe('Word1 Word2 Word3 Word4');
  });

  test('should handle a string with mixed case', () => {
    const mixedCaseStr = 'ThIS iS a MixEd CaSe TeSt';
    const resultStr = utils.toTitleCase(mixedCaseStr);
    expect(resultStr).toBe('ThIS IS A MixEd CaSe TeSt');
  });

  test('should handle a string with special characters', () => {
    const specialCharsStr = '$100,000 income/year';
    const resultStr = utils.toTitleCase(specialCharsStr);
    expect(resultStr).toBe('$100,000 Income/Year');
  });

  test('should handle an empty string', () => {
    const emptyStr = '';
    const resultStr = utils.toTitleCase(emptyStr);
    expect(resultStr).toBe('');
  });

  test('should handle a single-word string', () => {
    const singleWordStr = 'hello';
    const resultStr = utils.toTitleCase(singleWordStr);
    expect(resultStr).toBe('Hello');
  });

  test('should handle a string with only spaces', () => {
    const spacesStr = '    ';
    const resultStr = utils.toTitleCase(spacesStr);
    expect(resultStr).toBe('');
  });

  test('should handle a string with leading and trailing spaces', () => {
    const strWithSpaces = '   leading and trailing spaces   ';
    const resultStr = utils.toTitleCase(strWithSpaces);
    expect(resultStr).toBe('Leading And Trailing Spaces');
  });

  test('should handle a string with digits', () => {
    const digitsStr = 'the year is 2023';
    const resultStr = utils.toTitleCase(digitsStr);
    expect(resultStr).toBe('The Year Is 2023');
  });

  test('should handle a string with punctuation', () => {
    const punctuationStr = 'hello, world! how are you?';
    const resultStr = utils.toTitleCase(punctuationStr);
    expect(resultStr).toBe('Hello, World! How Are You?');
  });
});
