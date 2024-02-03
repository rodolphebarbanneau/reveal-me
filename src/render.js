import fs from 'node:fs/promises';
import path from 'node:path';

import _ from 'lodash';
import handlebars from 'handlebars';
import yamlFrontMatter from 'yaml-front-matter';
import { glob } from 'glob';

import configuration from './config.js';
import { isDirectory, isFile, searchFiles, toArray, toTitleCase } from './utils.js';

/**
 * @typedef {import('express').Request} Request
 * @typedef {import('express').Response} Response
 * @typedef {import('./types').Config} Config
 * @typedef {import('./types').ModuleConfig} ModuleConfig
 * @typedef {import('./types').PresentationConfig} PresentationConfig
 * @typedef {import('./types').SourceConfig} SourceConfig
 * @typedef {import('./types').Asset} Asset
 * @typedef {import('./types').Preprocessor} Preprocessor
 */

/**
 * Checks if the given URL is an absolute URL.
 * @param {string} url - The URL to check.
 * @returns {boolean} - True if the URL is an absolute URL, false otherwise.
 */
export const isAbsoluteUrl = (url) => {
  return !url.includes('\n') && (url.indexOf('://') > 0 || url.indexOf('//') === 0);
};

/**
 * Gets the assets.
 * @param {ModuleConfig} assetsModule - The assets module.
 * @param {string | string[]} assetsPaths - The assets paths.
 * @param {string} [fromUrl] - The URL to resolve the paths from.
 * @returns {Promise<Asset[]>} The assets.
 */
export const getAssets = async (assetsModule, assetsPaths, fromUrl = '/') => {
  // Evaluate URL and absolute path for each asset path
  const assets = [];
  for (const assetsPath of toArray(assetsPaths)) {
    if (isAbsoluteUrl(assetsPath)) {
      assets.push({ url: assetsPath.toString(), path: null });
    } else {
      const matches = (await glob(assetsPath, { cwd: assetsModule.path, posix: true })).sort();
      for (const match of matches) {
        assets.push({
          url: path.relative(path.dirname(fromUrl), path.join(assetsModule.url, match)),
          path: path.join(assetsModule.path, match),
        });
      }
    }
  }
  return assets;
};

/**
 * Gets the plugins options.
 * @param {Config} config - The configuration object.
 * @returns {Promise<string>} The plugins options.
 */
export const getPluginsOptions = async (config) => {
  const { plugins } = config.presentation;
  return Array.isArray(plugins) ? plugins.join(',') : plugins || '';
};

/**
 * Gets the preprocessor functions.
 * @param {Config} config - The configuration object.
 * @returns {Promise<Preprocessor[]>} The preprocessor functions.
 */
export const getPreprocessors = async (config) => {
  // Parse comma-separated preprocessors
  const preprocessorPaths = toArray(config.preprocessorPaths);
  // Check if there are any preprocessors
  if (!preprocessorPaths) return [_.identity];
  // Retrieve the preprocessor functions
  const preprocessors = [];
  for (const preprocessorPath of preprocessorPaths) {
    const pattern = path.join(config.assetsDir, preprocessorPath);
    const matches = (await glob(pattern, { posix: true })).sort();
    for (const match of matches) {
      const { default: preprocessor } = await import(match);
      preprocessors.push(preprocessor);
    }
  }
  return preprocessors;
};

/**
 * Gets the reveal options.
 * @param {Config} config - The configuration object.
 * @param {string} [fromUrl] - The URL to resolve the paths from.
 * @returns {Promise<string>} The reveal options.
 */
export const getRevealOptions = async (config, fromUrl = '/') => {
  // Update reveal menu themes
  if (!config.presentation.settings.menu.themes) {
    const themes = await getThemes(config, fromUrl);
    config.presentation.settings.menu.themes = themes.map((theme) => ({
      name: toTitleCase(path.basename(theme.url)),
      theme: theme.url,
    }));
  }
  // Stringify reveal options
  return JSON.stringify(config.presentation.settings);
};

/**
 * Gets the scripts.
 * @param {Config} config - The configuration object.
 * @param {string} [fromUrl] - The URL to resolve the paths from.
 * @returns {Promise<Asset[]>} The scripts.
 */
export const getScripts = async (config, fromUrl = '/') => {
  const scriptPaths = [...toArray(config.scriptPaths), ...toArray(config.presentation.scripts)];
  return await getAssets(config.modules['assets'], scriptPaths, fromUrl);
};

/**
 * Gets the styles.
 * @param {Config} config - The configuration object.
 * @param {string} [fromUrl] - The URL to resolve the paths from.
 * @returns {Promise<Asset[]>} The styles.
 */
export const getStyles = async (config, fromUrl = '/') => {
  const stylePaths = [...toArray(config.stylePaths), ...toArray(config.presentation.styles)];
  return await getAssets(config.modules['assets'], stylePaths, fromUrl);
};

/**
 * Gets the slidify options.
 * @param {Config} config - The configuration object.
 * @returns {Promise<string>} The slidify options.
 */
export const getSlidifyOptions = async (config) => {
  // Slidify attributes for content processing
  const slidifyAttributes = {
    horizontalSeparator: 'data-separator',
    verticalSeparator: 'data-separator-vertical',
    notesSeparator: 'data-separator-notes',
  };

  // Retrieve slidify options
  const slidifyArguments = _.pick(config.presentation.separators, Object.keys(slidifyAttributes));
  let slidifyOptions = [];
  for (const [key, value] of Object.entries(slidifyArguments)) {
    const escaped_value = value.replace(/\n/g, '\\n').replace(/\r/g, '\\r');
    slidifyOptions.push(`${slidifyAttributes[key]}="${escaped_value}"`);
  }
  return slidifyOptions.join(' ');
};

/**
 * Gets the template engine.
 * @param {Config} config - The configuration object.
 * @param {string} [fromUrl] - The URL to resolve the paths from.
 * @returns {Promise<Handlebars>} The template engine.
 */
export const getTemplateEngine = async (config, fromUrl = '/') => {
  // Create handlebars instance
  const hbs = handlebars.create();
  // Register helpers
  hbs.registerHelper('concat', (...args) => {
    const options = args.pop();
    const separator = options.hash.separator || ' - ';
    return args.filter((arg) => arg).join(separator);
  });
  hbs.registerHelper('eq', (arg1, arg2) => {
    return arg1 === arg2;
  });
  hbs.registerHelper('module', (name) => {
    return path.relative(path.dirname(fromUrl), config.modules[name].url);
  });

  // Register partials
  for (const partialPath of toArray(config.partialPaths)) {
    const pattern = path.join(config.assetsDir, partialPath);
    const matches = (await glob(pattern, { posix: true })).sort();
    for (const match of matches) {
      // Check if the target path is a file or a directory
      if (await isFile(match)) {
        hbs.registerPartial(path.parse(match).name, await fs.readFile(match, 'utf-8'));
      } else {
        const fileNames = await fs.readdir(match);
        for (const fileName of fileNames) {
          if (fileName.endsWith('.hbs')) {
            hbs.registerPartial(
              path.parse(fileName).name,
              await fs.readFile(path.join(match, fileName), 'utf-8'),
            );
          }
        }
      }
    }
  }

  return hbs;
};

/**
 * Gets the theme URLs.
 * @param {Config} config - The configuration object.
 * @param {string} [fromUrl] - The URL to resolve the paths from.
 * @returns {Promise<Asset[]>} The theme URLs.
 */
export const getThemes = async (config, fromUrl = '/') => {
  return config.themePaths.length
    ? await getAssets(config.modules['assets'], config.themePaths, fromUrl)
    : await getAssets(config.modules['base'], 'dist/theme/*.css', fromUrl);
};

/**
 * Gets the theme URL.
 * @param {Config} config - The configuration object.
 * @param {string} [fromUrl] - The URL to resolve the paths from.
 * @returns {Promise<Asset>} The theme.
 */
export const getTheme = async (config, fromUrl = '/') => {
  const { presentation } = config;
  // Check if the theme is an absolute URL
  if (isAbsoluteUrl(presentation.theme)) return { url: presentation.theme, path: null };
  // Retrieve the theme URL
  const themes = await getThemes(config, fromUrl);
  const theme = themes.find(
    (match) => path.basename(match.url).replace(path.extname(match.url), '') === presentation.theme,
  );
  return theme || { url: '/', path: null };
};

/**
 * Gets the theme options.
 * @param {Config} config - The configuration object.
 * @param {string} [fromUrl] - The URL to resolve the paths from.
 * @returns {Promise<string>} The theme options.
 */
export const getThemeOptions = async (config, fromUrl = '/') => {
  const themes = await getThemes(config, fromUrl);
  const themeOptions = themes.map((theme) => {
    const name = path.basename(theme.url).replace(path.extname(theme.url), '');
    const title = name.charAt(0).toUpperCase() + name.slice(1);
    return { name: title, theme: theme.url };
  });
  return JSON.stringify(themeOptions);
};

/**
 * Gets the highlight theme URL.
 * @param {Config} config - The configuration object.
 * @param {string} [fromUrl] - The URL to resolve the paths from.
 * @returns {Promise<Asset>} The highlight theme path.
 */
export const getHighlightTheme = async (config, fromUrl = '/') => {
  const { highlightTheme } = config.presentation;
  // Check if the highlight theme is an absolute URL
  if (isAbsoluteUrl(highlightTheme)) return { url: highlightTheme, path: null };
  // Retrieve the highlight theme URL
  const [theme] = await getAssets(config.modules['highlight'], `${highlightTheme}.css`, fromUrl);
  return theme || { url: '/', path: null };
};

/**
 * Parses a presentation document content with YAML front matter.
 * @param {string} content - The document content to parse.
 * @returns {ParsedDocument} The parsed presentation document.
 *
 * The parsed document object contains the following properties:
 * @typedef {object} ParsedDocument
 * @property {PresentationConfig} config - The document presentation configuration.
 * @property {string} content - The document content.
 */
export const parseDocument = (content) => {
  const document = yamlFrontMatter.loadFront(content.replace(/^\uFEFF/, ''));
  return {
    config: _.omit(document, '__content'),
    content: document.__content || content,
  };
};

/**
 * Renders a collection of presentations into HTML.
 * @param {string} url - The URL of the collection to render.
 * @param {string} [filter] - The filter to apply to the presentation names.
 * @returns {Promise<string>} The rendered HTML collection markup with its assets.
 */
export const renderCollection = async (url, filter = '') => {
  // Retrieve collection
  const config = await configuration();
  const targetUrl = url.slice(config.baseUrl.length);
  const isCollection = await isDirectory(path.join(config.rootDir, targetUrl));
  if (!isCollection) throw new Error(`Collection not found: ${url}`);

  // Retrieve configuration
  const engine = await getTemplateEngine(config, url);
  const theme = await getTheme(config, url);
  const searchDir = path.join(config.rootDir, targetUrl);
  const presentations = await searchFiles(filter, {
    cwd: searchDir,
    exts: toArray(config.extensions),
  });

  // Retrieve template options
  const options = {
    project: config.project,
    hasFavicon: config.hasFavicon,
    breadcrumb: targetUrl,
    title: toTitleCase(path.basename(url)),
    content: presentations.map((presentation) => {
      const name = path.basename(presentation, path.extname(presentation));
      const title = path.basename(presentation);
      const endpoint = path.join('/', path.dirname(presentation));
      const endpointUrl = path.dirname(presentation);
      const item = config.build ? name : title;
      const itemUrl = path.join(endpointUrl, config.build ? name + '.html' : title);
      return { name, title, endpoint, endpointUrl, item, itemUrl };
    }),
    themeUrl: theme.url,
  };

  // Compile template
  const templatePath = path.join(config.packageDir, 'templates/collection.hbs');
  const template = await fs.readFile(templatePath, 'utf-8');
  const markup = engine.compile(template.toString())(options);

  return markup;
};

/**
 * Renders a given presentation document into HTML.
 * @param {string} url - The URL of the presentation document to render.
 * @returns {Promise<[string, Asset[]]>} The rendered HTML presentation document markup with its
 * associated hyperlinks.
 */
export const renderDocument = async (url) => {
  // Retrieve url properties
  const endpoint = path.dirname(url);
  const extension = path.extname(url);
  const name = path.basename(url, extension);
  const title = toTitleCase(name);

  // Retrieve presentation document
  let config = await configuration();
  const targetUrl = url.slice(config.baseUrl.length);
  const content = await fs.readFile(path.join(config.rootDir, targetUrl), 'utf-8').catch(() => {
    throw new Error(`Document not found: ${url}`);
  });
  const presentation = parseDocument(content);

  // Retrieve configuration
  config = await configuration(presentation.config);
  const engine = await getTemplateEngine(config, url);
  const theme = await getTheme(config, url);
  const highlightTheme = await getHighlightTheme(config, url);
  const scripts = await getScripts(config, url);
  const styles = await getStyles(config, url);

  // Retrieve template options
  const options = {
    project: config.project,
    hasFavicon: config.hasFavicon,
    hero: [].concat(config.presentation.hero).join(''),
    name: config.presentation.name || name,
    title: config.presentation.title || title,
    description: [].concat(config.presentation.description).join(''),
    date: config.presentation.date,
    author: config.presentation.author,
    content: presentation.content,
    gitUrl: config.git ? `${config.git}/${targetUrl}` : '',
    themeUrl: theme.url,
    highlightThemeUrl: highlightTheme.url,
    scriptUrls: scripts.map((script) => script.url),
    styleUrls: styles.map((style) => style.url),
    pluginsOptions: await getPluginsOptions(config),
    revealOptions: await getRevealOptions(config, url),
    slidifyOptions: await getSlidifyOptions(config),
    host: config.host,
    port: config.port,
    watch: config.watch,
    extension,
  };

  // Execute preprocessors
  const preprocessors = await getPreprocessors(config);
  for (const preprocessor of preprocessors) {
    options.content = await preprocessor(options.content, options);
  }

  // Update content hyperlinks
  const hyperlinks = [];
  const patterns = [/\[.*\]\((.+?)\)/g, /(?:data-background-image|href)=["'](.+?)["']/g];
  patterns.forEach((pattern) => {
    options.content = options.content.replace(pattern, (match, sub) => {
      if (isAbsoluteUrl(sub)) {
        // Handle absolute hyperlinks
        return match;
      } else if (sub.startsWith('@/')) {
        // Handle assets hyperlinks
        const assets = config.modules['assets'];
        const hyperlink = {
          url: path.relative(path.dirname(url), path.join(assets.url, sub.slice(2))),
          path: path.join(assets.path, sub.slice(2)),
        };
        return match.replace(sub, hyperlink.url);
      } else {
        // Handle relative hyperlinks
        const hyperlink = {
          url: path.relative(path.dirname(url), path.join(endpoint, sub)),
          path: path.join(config.rootDir, path.dirname(targetUrl), sub),
        };
        hyperlinks.push(hyperlink);
        return match;
      }
    });
  });

  // Compile template
  options.content = engine.compile(options.content)(options);
  const template = await fs.readFile(config.templatePath, 'utf-8');
  const markup = engine.compile(template.toString())(options);

  return [markup, hyperlinks];
};

/**
 * Renders an error.
 * @param {string} title - The error title to render.
 * @param {string} [description] - The error description to render.
 * @param {string} [content] - The error content to render.
 * @returns {Promise<string>} The rendered HTML error markup.
 */
export const renderError = async (title, description = '', content = '') => {
  // Retrieve configuration and template engine
  const config = await configuration();
  const engine = await getTemplateEngine(config);

  // Retrieve template options
  const options = {
    project: config.project,
    hasFavicon: config.hasFavicon,
    title,
    description,
    content,
  };

  // Compile template
  const templatePath = path.join(config.packageDir, 'templates/error.hbs');
  const template = await fs.readFile(templatePath, 'utf-8');
  const markup = engine.compile(template.toString())(options);

  return markup;
};
