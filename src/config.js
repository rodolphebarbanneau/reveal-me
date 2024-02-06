import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

import _ from 'lodash';
import upath from 'upath';
import yargsParser from 'yargs-parser';

import {
  isDirectory,
  isFile,
  isWithinDirectory,
  loadJSON,
  mergeObjects,
  sanitize,
} from './utils.js';

/**
 * @typedef {import('./types').Config} Config
 * @typedef {import('./types').ModuleConfig} ModuleConfig
 * @typedef {import('./types').PresentationConfig} PresentationConfig
 * @typedef {import('./types').SourceConfig} SourceConfig
 */

// Retrieve package directory
const __dirname = upath.dirname(fileURLToPath(import.meta.url));

// CLI options
export const CLI_OPTIONS = {
  alias: {
    a: 'all',
    b: 'build',
    c: 'config',
    h: 'help',
    i: 'init',
    p: 'print',
    v: 'version',
    w: 'watch',
  },
  boolean: ['all', 'help', 'build', 'init', 'no-open', 'print', 'version', 'watch'],
  string: ['config'],
};

// Retrieve modules configuration
const require = createRequire(import.meta.url);
const revealPath = upath.join(require.resolve('reveal.js'), '..', '..', '/');
const bootstrapPath = upath.join(require.resolve('bootstrap'), '..', '..');
const datatablesPath = upath.join(require.resolve('datatables.net'), '..', '..', '/');
const datatablesBsPath = upath.join(require.resolve('datatables.net-bs5'), '..', '..', '/');
const fontAwesomePath = upath.join(require.resolve('font-awesome/package.json'), '..');
const highlightPath = upath.join(require.resolve('highlight.js'), '..', '..', 'styles');
const jqueryPath = upath.join(require.resolve('jquery'), '..');
const menuPath = upath.join(require.resolve('reveal.js-menu/menu.js'), '..');

/** @type {Record<string, ModuleConfig>} */
const MODULES = {
  /* eslint-disable prettier/prettier */
  'assets': { url: '/assets' },
  'base': { url: '/modules/reveal', path: revealPath },
  'bootstrap': { url: '/modules/bootstrap', path: bootstrapPath },
  'datatables': { url: '/modules/datatables', path: datatablesPath },
  'datatables-bs': { url: '/modules/datatables-bs', path: datatablesBsPath },
  'font-awesome': { url: '/modules/font-awesome', path: fontAwesomePath },
  'highlight': { url: '/modules/highlight', path: highlightPath },
  'jquery': { url: '/modules/jquery', path: jqueryPath },
  'menu': { url: '/modules/menu', path: menuPath },
  /* eslint-enable prettier/prettier */
};

/**
 * Gets the directory of the given target path.
 * @param {string} targetPath - The target path to process.
 * @returns {Promise<string>} - The directory of the target path.
 */
export const getDir = async (targetPath) => {
  // Define glob patterns that indicate the start of a pattern
  const patterns = ['*', '?', '[', ']'];

  // Find the first segment of the path that contains a glob pattern
  const segments = targetPath.split(/\/|\\/);
  let index = segments.length;
  for (let i = 0; i < segments.length; i++) {
    if (patterns.some((pattern) => segments[i].includes(pattern))) {
      index = i;
      break;
    }
  }

  // Build the base path up to the segment before the glob pattern starts
  const base = segments.slice(0, index).join('/') || '/';
  // Retrieve the directory of the base path
  const dir = upath.extname(base) ? upath.dirname(base) : base;
  if (!(await isDirectory(dir))) {
    throw new Error('The target directory must be a valid directory');
  }
  return dir;
};

/**
 * Gets the absolute path of the given target path relative to the given base path and package path.
 * The package path is used to resolve tilde paths.
 * @param {string} targetPath - The target path to process.
 * @param {string} [basePath] - The optional base path (defaults to the current working directory).
 * @param {string} [packagePath] - The optional package path (defaults to the base path).
 * @returns {Promise<string>} - The absolute path.
 */
export const getPath = async (targetPath, basePath, packagePath) => {
  return targetPath.startsWith('~')
    ? upath.resolve(packagePath || basePath || process.cwd(), targetPath.slice(1))
    : upath.resolve(basePath || process.cwd(), targetPath);
};

/**
 * Builds the configuration object with the given presentation configuration.
 * @param {PresentationConfig} presentationConfig - The presentation configuration.
 * @returns {Promise<Config>} The compiled options.
 */
export default _.memoize(async (presentationConfig = {}) => {
  // Retrieve cli configuration
  // Remove first two elements of the array (node and script name)
  const { _: cli_, ...cli } = yargsParser(process.argv.slice(2), CLI_OPTIONS);
  /** @type {SourceConfig} */
  // @ts-ignore
  const cliConfig = { open: !(cli['no-open'] ?? false), ...cli };

  // Retrieve target directory and path
  let targetDir, targetPath;
  switch (cli_.length) {
    case 0:
    case 1:
      targetPath = await getPath(cli_[0].toString(), process.cwd(), __dirname);
      targetDir = await getDir(targetPath);
      break;
    case 2:
      targetDir = await getPath(cli_[0].toString(), process.cwd(), __dirname);
      if (!isDirectory(targetDir)) {
        throw new Error('The target directory must be a directory');
      }
      targetPath = upath.resolve(targetDir, cli_[1].toString());
      if (!isWithinDirectory(targetPath, targetDir)) {
        throw new Error('The target path must be within the target directory');
      }
      break;
    default:
      throw new Error('Too many CLI positional arguments, only one or two are allowed');
  }

  // Retrieve project configuration
  const extraConfig = { presentation: presentationConfig };
  const defaultConfig = await loadJSON(upath.join(__dirname, 'defaults.json'));
  const processConfig = await loadJSON(
    upath.join(targetDir, cliConfig.config || defaultConfig.config),
  );

  // Merge configurations
  /** @type {Config} */
  const config = mergeObjects(cliConfig, extraConfig, processConfig, defaultConfig, {
    modules: MODULES,
  });

  // Update configuration template
  config.templatePath = await getPath(config.templatePath, targetDir, __dirname);
  // Update configuration urls
  config.baseUrl = sanitize(config.baseUrl, { leading: true });
  Object.values(config.modules).forEach(
    (value) => (value.url = sanitize(value.url, { leading: true })),
  );
  // Update configuration paths
  config.packageDir = __dirname;
  config.targetDir = targetDir;
  config.targetPath = targetPath;
  config.outDir = upath.join(targetDir, config.outDir);
  config.rootDir = upath.join(targetDir, config.rootDir);
  config.assetsDir = upath.join(targetDir, config.assetsDir);
  // Update configuration modules
  config.modules['assets'].path = config.assetsDir;
  // Update configuration sources
  config.sources = {
    cli: cliConfig,
    extra: extraConfig,
    process: processConfig,
    defaults: defaultConfig,
  };
  // Update configuration favicon
  config.hasFavicon = await isFile(upath.join(config.assetsDir, 'favicon.ico'));

  return config;
});
