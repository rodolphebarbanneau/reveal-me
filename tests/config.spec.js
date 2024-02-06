import fs from 'node:fs/promises';

import upath from 'upath';

import * as config from '../src/config';

jest.mock('node:fs/promises');

describe('getDir function tests', () => {
  afterEach(() => {
    jest.resetAllMocks();
    jest.restoreAllMocks();
  });

  test('should return the directory for a direct path without glob patterns', async () => {
    const targetPath = '/path/to/directory';
    fs.stat.mockResolvedValue({ isDirectory: async () => true });
    const result = await config.getDir(targetPath);
    expect(result).toBe(targetPath);
  });

  test('should return the base directory path before the glob pattern starts', async () => {
    const targetPath = '/path/to/glob*/**/directory';
    const targetDir = '/path/to';
    fs.stat.mockResolvedValue({ isDirectory: async () => true });
    const result = await config.getDir(targetPath);
    expect(result).toBe(targetDir);
  });

  test('should return the parent directory if the base path is not a directory', async () => {
    const targetPath = '/path/to/file.txt';
    const targetDir = '/path/to';
    fs.stat.mockResolvedValue({ isDirectory: async () => false });
    const result = await config.getDir(targetPath);
    expect(result).toBe(targetDir);
  });
});

describe('getPath function tests', () => {
  test('should return the absolute path of a target path', async () => {
    const basePath = '/base/path';
    const targetPath = 'file.txt';
    const result = await config.getPath(targetPath, basePath);
    expect(result).toBe(upath.resolve('/base/path/file.txt'));
  });

  test('should resolve tilde paths using package path', async () => {
    const basePath = '/base/path';
    const targetPath = '~file.txt';
    const packagePath = '/package';
    const result = await config.getPath(targetPath, basePath, packagePath);
    expect(result).toBe(upath.resolve('/package/file.txt'));
  });

  test('should use base path as default when package path is not provided', async () => {
    const basePath = '/base/path';
    const targetPath = 'file.txt';
    const result = await config.getPath(targetPath, basePath);
    expect(result).toBe(upath.resolve('/base/path/file.txt'));
  });

  test('should use current working directory as default for base path and package path', async () => {
    const targetPath = 'file.txt';
    const result = await config.getPath(targetPath);
    expect(result).toBe(upath.resolve(process.cwd(), 'file.txt'));
  });
});
