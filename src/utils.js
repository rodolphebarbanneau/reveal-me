import fs from 'node:fs/promises';
import path from 'node:path';

import _ from 'lodash';
import { glob } from 'glob';

/**
 * Debounces a function with the given wait time in milliseconds.
 * @param {Function} func - The function to debounce.
 * @param {number} [wait] - The wait time in milliseconds.
 * @returns {Function} The debounced function.
 */
export const debounce = (func, wait = 100) => {
  let timeout;
  return (...args) => {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

/**
 * Checks if the given path is a directory.
 * @param {string} targetPath - The path to check.
 * @returns {Promise<boolean>} - True if the path is a directory, false otherwise.
 */
export const isDirectory = _.memoize(async (targetPath) => {
  return fs
    .stat(path.resolve(targetPath))
    .then((stats) => stats.isDirectory())
    .catch(() => false);
});

/**
 * Checks if the given path is a file.
 * @param {string} targetPath - The path to check.
 * @returns {Promise<boolean>} - True if the path is a file, false otherwise.
 */
export const isFile = _.memoize(async (targetPath) => {
  return fs
    .stat(path.resolve(targetPath))
    .then((stats) => stats.isFile())
    .catch(() => false);
});

/**
 * Checks if the given target path is within the given base path.
 * @param {string} targetPath - The target path to check.
 * @param {string} [basePath] - The optional base path (defaults to the current working directory).
 * @returns {boolean} - True if the target path is within the base path, false otherwise.
 */
export const isWithinDirectory = (targetPath, basePath) => {
  const checkBase = path.normalize(path.resolve(basePath || process.cwd()));
  const checkFile = path.normalize(path.resolve(checkBase, targetPath));
  return checkFile.startsWith(checkBase);
};

/**
 * Gets the directory of the given path.
 * @param {string} targetPath - The path to process.
 * @returns {Promise<string>} - The directory of the given path.
 */
export const getDirectory = async (targetPath) => {
  return (await isDirectory(targetPath)) ? targetPath : path.dirname(targetPath);
};

/**
 * Returns a readable path for a file.
 * @param {string} filePath - The file path.
 * @returns {string} The readable path.
 */
export const getReadablePath = (filePath) => {
  const relativePath = path.relative(process.cwd(), filePath);
  const segments = relativePath.replace(/\\/g, '/').split('/');
  if (segments.length > 4) {
    return segments.slice(0, 2).join('/') + '...' + segments.slice(-2).join('/');
  }
  return relativePath;
};

/**
 * Loads a JSON file.
 * @param {string} filePath - The path to the JSON file.
 * @returns {Promise<object>} The JSON object.
 */
export const loadJSON = async (filePath) => {
  try {
    const data = await fs.readFile(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    return {};
  }
};

/**
 * Makes the directory of the given path.
 * @param {string} targetPath - The path to process.
 * @returns {Promise<string | void>} The created directory if it does not exist else void.
 */
export const makeDirectory = async (targetPath) => {
  const targetDir = await getDirectory(targetPath);
  try {
    // Return if directory already exists
    await fs.access(targetDir);
  } catch (error) {
    // Create directory
    if (error.code === 'ENOENT') {
      return await fs.mkdir(targetDir, { recursive: true });
    } else {
      throw error;
    }
  }
};

/**
 * Merges the given objects.
 * @param {Object[]} objs - The objects to merge.
 * @returns {Object} The merged object.
 */
export const mergeObjects = (...objs) => {
  /**
   * Assigns the defaults from source object to the target object recursively. It assigns the source
   * properties to the target object *only* if the key is missing in the target object.
   * @param {Object} target - The target object.
   * @param {Object} source - The source object.
   */
  const defaults = (target, source) => {
    Object.keys(source).forEach((key) => {
      if (target instanceof Object) {
        if (source[key] instanceof Object && key in target && !Array.isArray(target[key])) {
          defaults(target[key], source[key]);
        } else if (!(key in target)) {
          target[key] = source[key];
        }
      }
    });
  };

  // Merge the objects
  const obj = {};
  objs.forEach((source) => defaults(obj, source));
  return obj;
};

/**
 * Sanitizes the given string and prevents directory traversal.
 * @param {string} str - The string to sanitize.
 * @param {Object} [options] - The sanitization options.
 * @param {string} [options.prefix] - The prefix to prepend to the string.
 * @param {string} [options.suffix] - The suffix to append to the string.
 * @returns {string} The sanitized string.
 */
export const sanitize = (str, { prefix = '', suffix = '' } = {}) => {
  const options = { prefix, suffix };
  let result = str.replace(/\?.*/, '');
  if (result.includes('..')) {
    return sanitize(result.replace('..', ''), options);
  }
  result = result.replace(/(^\/)|(\/$)/g, '');
  return result ? `${prefix}${result}${suffix}` : '';
};

/**
 * Searches for files.
 * @param {string} filter - A filter or glob pattern to apply to the files search.
 * @param {Object} [options] - The search options.
 * @param {string} [options.cwd] - The directory to search in (defaults to cwd).
 * @param {string[]} [options.exts] - The accepted file extensions to search for.
 * @returns {Promise<string[]>} - The found files.
 */
export const searchFiles = async (filter, { cwd = process.cwd(), exts = [] } = {}) => {
  // Retrieve files
  const patterns = filter.includes('*') ? [filter] : [`**/*${filter}*`, `**/*${filter}*/**`];
  const globs = patterns.map((pattern) => glob(pattern, { cwd, posix: true }));
  const results = await Promise.all(globs);
  const matches = _.uniq(_.flatten(results)).sort();

  // Filter files by extension
  const files = [];
  for (const match of matches) {
    if (path.extname(match) === '') {
      continue;
    } else if (!exts.length || exts.some((ext) => match.endsWith(ext.slice(1)))) {
      files.push(match);
    }
  }
  return files;
};

/**
 * Converts the given object to an array.
 * @param {object} obj - The object to convert to an array.
 * @returns {Array} The converted array.
 */
export const toArray = (obj) => {
  // Parse comma-separated string
  if (typeof obj === 'string') {
    return obj.split(',').map((item) => item.trim());
  } else if (Array.isArray(obj)) {
    return obj;
  } else if (obj === undefined || obj === null) {
    return [];
  }
  return [obj];
};

/**
 * Returns the title case of the given string.
 * @param {string} str - The string to convert to title case.
 * @returns {string} The title case string.
 */
export const toTitleCase = (str) => {
  return str
    .replace(path.extname(str), '')
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())
    .trim();
};
