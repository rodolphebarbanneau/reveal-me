import fs from 'node:fs/promises';

import _ from 'lodash';
import createDebug from 'debug';
import upath from 'upath';
import { glob } from 'glob';
import { minimatch } from 'minimatch';

import configuration from './config.js';
import { renderCollection, renderDocument } from './render.js';
import {
  isDirectory,
  getReadablePath,
  makeDirectory,
  sanitize,
  searchFiles,
  toArray,
} from './utils.js';

/**
 * @typedef {import('./types').File} File
 */

// Initialize debug
const debug = createDebug('reveal-me');

/**
 * Copies files from one location and stores their data in a map with the new location as key.
 * @param {string} from - The source directory or file path.
 * @param {string} to - The destination directory or file path.
 * @param {Map<string, File>} files - The map of files.
 * @param {object} [options] - The matching options.
 * @param {string[]} [options.include] - The matching patterns to include.
 * @param {string[]} [options.exclude] - The matching patterns to exclude.
 * @returns {Promise<Map<string, File>>} The updated map of files.
 */
export const copy = async (from, to, files = new Map(), { include = [], exclude = [] } = {}) => {
  /**
   * Sets a file in the map.
   * @param {string} [match] - The relative match path.
   */
  const set = (match = '') => {
    if (!files.has(to)) {
      const fromMatch = upath.join(from, match);
      const toMatch = upath.join(to, match);
      if (
        (include.length === 0 || include.some((pattern) => minimatch(fromMatch, pattern))) &&
        (exclude.length === 0 || !exclude.some((pattern) => minimatch(fromMatch, pattern)))
      ) {
        console.debug(`❏ ${getReadablePath(fromMatch)} → ${getReadablePath(toMatch)}`);
        const buffer = fs.readFile(fromMatch);
        files.set(toMatch, { path: fromMatch, buffer });
      }
    }
  };

  if (await isDirectory(from)) {
    const matches = await glob('**/*.*', { cwd: from, nodir: true, posix: true });
    for (const match of matches) {
      set(match);
    }
  } else {
    set();
  }

  return files;
};

/**
 * Minify files.
 * @param {Map<string, File>} files - The map of files.
 * @returns {Promise<Map<string, File>>} The minified map of files.
 */
export const minify = async (files) => {
  //TODO
  return files;
};

/**
 * Writes files to the file system.
 * @param {Map<string, File>} files - The map of files.
 * @returns {Promise<string[]>} The paths of the written files.
 */
export const write = async (files) => {
  const operations = [];
  for (const [destination, file] of files.entries()) {
    const operation = (async () => {
      console.debug(`★ ${getReadablePath(file.path)} → ${getReadablePath(destination)}`);
      const data = await file.buffer;
      await makeDirectory(destination);
      await fs.writeFile(destination, data);
      return destination;
    })();
    operations.push(operation);
  }

  return Promise.all(operations);
};

/**
 * Builds the modules.
 * @returns {Promise<string>} The path to the built modules.
 */
export const buildModules = async () => {
  // Retrieve configuration
  const config = await configuration();

  // Retrieve excluded files
  const { cli, defaults } = config.sources;
  const configPath = upath.join(config.targetDir, cli.config || defaults.config);
  const presentations = await searchFiles('', {
    cwd: config.rootDir,
    exts: toArray(config.extensions),
    resolve: true,
  });

  // Log
  debug({ modules: config.modules, outDir: config.outDir });
  console.log(`👉 Building modules to "${config.outDir}"...`);

  // Build
  try {
    const files = new Map();
    for (const module of Object.values(config.modules)) {
      const from = module.path;
      const to = upath.join(config.outDir, module.url);
      await copy(from, to, files, { exclude: [configPath, ...presentations] });
    }
    await write(files);
  } catch (error) {
    console.error(`😱 Error building modules to "${config.outDir}":\n`, error);
    debug(error);
  }

  console.log(`✅ Successfully built modules to "${config.outDir}"`);
  return config.outDir;
};

/**
 * Builds a collection.
 * @param {string} url - The collection URL to build.
 * @returns {Promise<string>} The path to the built collection.
 */
export const buildCollection = async (url) => {
  // Retrieve configuration
  const config = await configuration();
  const buildUrl = sanitize(url, { leading: true });
  const builPath = upath.join(config.outDir, buildUrl.replace(/\.[^.]*$/, ''), 'index.html');

  // Log
  debug({ buildUrl, builPath });
  console.log(`👉 Building ":/${buildUrl}" to "${builPath}"...`);

  try {
    const markup = await renderCollection(buildUrl);
    await makeDirectory(builPath);
    await fs.writeFile(builPath, markup);
  } catch (error) {
    console.error(`😱 Error building ":/${buildUrl}" to "${builPath}":\n`, error);
    debug(error);
  }

  console.log(`✅ Successfully built ":/${buildUrl}" to "${builPath}"`);
  return builPath;
};

/**
 * Builds a presentation document.
 * @param {string} url - The presentation document URL to build.
 * @returns {Promise<string>} The path to the built presentation document.
 */
export const buildDocument = async (url) => {
  // Retrieve configuration
  const config = await configuration();
  const buildUrl = sanitize(url, { leading: true });
  const builPath = upath.join(config.outDir, buildUrl.replace(/\.[^.]*$/, '.html'));

  // Log
  debug({ buildUrl, builPath });
  console.log(`👉 Building ":/${buildUrl}" to "${builPath}"...`);

  // Build
  try {
    const operations = [];
    const [markup, hyperlinks] = await renderDocument(buildUrl);
    // Markup
    operations.push(
      (async () => {
        await makeDirectory(builPath);
        await fs.writeFile(builPath, markup);
        return builPath;
      })(),
    );
    // Hyperlinks
    const files = new Map();
    for (const hyperlink of hyperlinks) {
      const from = hyperlink.path;
      const to = upath.join(
        config.outDir,
        config.baseUrl,
        upath.relative(config.rootDir, hyperlink.path),
      );
      await copy(from, to, files);
    }
    operations.push(write(files));
    // Execute operations
    await Promise.all(operations);
  } catch (error) {
    console.error(`😱 Error building ":/${buildUrl}" to "${builPath}":\n`, error);
    debug(error);
  }

  console.log(`✅ Successfully built ":/${buildUrl}" to "${builPath}"`);
  return builPath;
};

/**
 * Builds some presentation documents.
 * @param {string[]} urls - The presentation document URLs to build.
 * @returns {Promise<string[]>} The path to the built presentation resources.
 */
export default async (urls) => {
  // Retrieve configuration
  const config = await configuration();
  const buildUrl = (await isDirectory(config.targetPath))
    ? upath.join(config.baseUrl, upath.relative(config.rootDir, config.targetPath))
    : null;

  // Retrieve documents and collections
  const documents = _.uniq(urls);
  const collections = _.uniq(
    documents.reduce((acc, url) => {
      if (!buildUrl) return upath.dirname(url);
      const segments = upath.relative(buildUrl, upath.dirname(url)).split('/');
      const collections = segments.map((_, index) =>
        upath.join(buildUrl, segments.slice(0, index + 1).join('/')),
      );
      return [...acc, ...collections];
    }, []),
  );

  const operations = [];
  // Build modules
  operations.push(buildModules());
  // Build documents
  documents.forEach((url) => operations.push(buildDocument(url)));
  // Build collections
  collections.forEach((url) => operations.push(buildCollection(url)));

  return Promise.all(operations);
};
