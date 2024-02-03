import path from 'node:path';

import * as config from '../src/config';

describe('getPath function tests', () => {
  test('should return the absolute path of a target path', () => {
    const basePath = '/base/path';
    const targetPath = 'file.txt';
    const result = config.getPath(targetPath, basePath);
    expect(result).toBe('/base/path/file.txt');
  });

  test('should resolve tilde paths using package path', () => {
    const basePath = '/base/path';
    const targetPath = '~file.txt';
    const packagePath = '/package';
    const result = config.getPath(targetPath, basePath, packagePath);
    expect(result).toBe('/package/file.txt');
  });

  test('should use base path as default when package path is not provided', () => {
    const basePath = '/base/path';
    const targetPath = 'file.txt';
    const result = config.getPath(targetPath, basePath);
    expect(result).toBe('/base/path/file.txt');
  });

  test('should use current working directory as default for base path and package path', () => {
    const targetPath = 'file.txt';
    const result = config.getPath(targetPath);
    expect(result).toBe(path.resolve(process.cwd(), 'file.txt'));
  });
});

describe('getPaths function tests', () => {
  test('should return an array of absolute paths for target paths', () => {
    const basePath = '/base/path';
    const targetPaths = ['file1.txt', 'file2.txt', '~file3.txt'];
    const packagePath = '/package';
    const result = config.getPaths(targetPaths, basePath, packagePath);
    expect(result).toEqual(['/base/path/file1.txt', '/base/path/file2.txt', '/package/file3.txt']);
  });
});
