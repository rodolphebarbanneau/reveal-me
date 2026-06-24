import upath from 'upath';
import { glob } from 'glob';

import { isFile, isWithinDirectory, toArray } from './utils.js';

/**
 * @typedef {import('./types').Asset} Asset
 * @typedef {import('./types').AssetContext} AssetContext
 * @typedef {import('./types').Config} Config
 */

const CSS_URL_PATTERN = /url\(\s*(['"]?)([^'")]+)\1\s*\)/g;
const GLOB_CHARS_PATTERN = /[*?[{]/;

/**
 * Checks if the given URL is an absolute URL.
 * @param {string} url - The URL to check.
 * @returns {boolean} - True if the URL is an absolute URL, false otherwise.
 */
export const isAbsoluteUrl = (url) => {
  return !url.includes('\n') && (url.indexOf('://') > 0 || url.indexOf('//') === 0);
};

/**
 * Checks if a data-background value refers to an asset rather than a CSS color.
 * @param {string} value - The data-background attribute value.
 * @returns {boolean} - True if the value is an asset path, false otherwise.
 */
export const isBackgroundAsset = (value) => {
  const trimmed = value.trim();
  if (!trimmed || trimmed.startsWith('#')) return false;
  if (isAbsoluteUrl(trimmed)) return true;
  if (trimmed.startsWith('@/') || trimmed.startsWith('./') || trimmed.startsWith('../')) {
    return true;
  }
  if (/^(rgb|rgba|hsl|hsla|linear-gradient|radial-gradient)\(/i.test(trimmed)) return false;
  if (trimmed.includes('/')) return true;
  if (upath.extname(trimmed)) return true;
  return false;
};

/**
 * Gets the presentation URL directory.
 * @param {string} url - The presentation URL.
 * @returns {string} The URL directory.
 */
const getUrlDir = (url) => {
  return upath.extname(url) ? upath.dirname(url) : url;
};

/**
 * Matches asset paths from a pattern within a directory.
 * @param {string} pattern - The asset path or glob pattern.
 * @param {string} cwd - The directory to resolve from.
 * @returns {Promise<string[]>} The matched relative paths.
 */
const matchAssetPaths = async (pattern, cwd) => {
  const matches = await glob(pattern, { cwd, nodir: true, posix: true });
  if (matches.length > 0) return matches.sort();

  if (GLOB_CHARS_PATTERN.test(pattern)) return [];

  const literal = pattern.replace(/^\.\//, '');
  const filePath = upath.join(cwd, literal);
  if (await isFile(filePath)) return [literal];

  return [];
};

/**
 * Builds asset entries from matched paths.
 * @param {string[]} matches - The matched relative paths.
 * @param {string} cwd - The directory the matches are relative to.
 * @param {string} urlBase - The URL prefix for matched assets.
 * @param {string} fromUrl - The presentation URL used to compute relative URLs.
 * @returns {Asset[]} The resolved assets.
 */
const toAssets = (matches, cwd, urlBase, fromUrl) => {
  const urlDir = getUrlDir(fromUrl);
  return matches.map((match) => ({
    url: upath.relative(urlDir, upath.join(urlBase, match)),
    path: upath.join(cwd, match),
  }));
};

/**
 * Resolves asset references from a base directory.
 * @param {string} ref - The asset reference.
 * @param {AssetContext} context - The asset resolution context.
 * @param {'assets' | 'presentation' | 'auto'} [base='auto'] - The resolution base.
 * @returns {Promise<Asset[]>} The resolved assets.
 */
export const resolveAssetMatches = async (ref, context, base = 'auto') => {
  const { config, url, targetPath } = context;

  if (isAbsoluteUrl(ref)) {
    return [{ url: ref.toString(), path: null }];
  }
  if (ref.startsWith('#')) {
    return [];
  }

  const assetsModule = config.modules['assets'];
  const presentationDir = upath.dirname(targetPath);
  const presentationUrl = getUrlDir(url);
  const useAssets = ref.startsWith('@/') || base === 'assets';

  if (useAssets) {
    const pattern = ref.startsWith('@/') ? ref.slice(2) : ref;
    const matches = await matchAssetPaths(pattern, assetsModule.path);
    return toAssets(matches, assetsModule.path, assetsModule.url, url);
  }

  const pattern = ref.replace(/^\.\//, '');
  const matches = await matchAssetPaths(pattern, presentationDir);
  return toAssets(matches, presentationDir, presentationUrl, url);
};

/**
 * Resolves asset path patterns from a given base.
 * @param {AssetContext} context - The asset resolution context.
 * @param {string | string[]} paths - The asset path patterns.
 * @param {'assets' | 'presentation'} base - The resolution base.
 * @returns {Promise<Asset[]>} The resolved assets.
 */
export const resolveAssetPaths = async (context, paths, base) => {
  const assets = [];
  for (const path of toArray(paths)) {
    const resolved = await resolveAssetMatches(path, context, base);
    assets.push(...resolved);
  }
  return assets;
};

/**
 * Deduplicates assets by filesystem path.
 * @param {Asset[]} assets - The assets to deduplicate.
 * @returns {Asset[]} The deduplicated assets.
 */
export const dedupeAssets = (assets) => {
  const seen = new Set();
  return assets.filter((asset) => {
    if (!asset.path) return true;
    const key = upath.normalize(asset.path);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

/**
 * Collects local assets that should be bundled with a presentation.
 * @param {Asset[]} assets - The assets to filter.
 * @returns {Asset[]} The local assets with a filesystem path.
 */
export const getLocalAssets = (assets) => {
  return assets.filter((asset) => asset.path);
};

/**
 * Gets the build output path for a local asset.
 * @param {Config} config - The configuration object.
 * @param {string} assetPath - The asset filesystem path.
 * @returns {string} The build output path.
 */
export const getAssetBuildPath = (config, assetPath) => {
  return upath.join(config.outDir, config.baseUrl, upath.relative(config.rootDir, assetPath));
};

/**
 * Gets the canonical URL path of a stylesheet in the build output.
 * @param {string} cssPath - The stylesheet filesystem path.
 * @param {Config} config - The configuration object.
 * @returns {string} The stylesheet URL path.
 */
export const getCssUrl = (cssPath, config) => {
  const assetsModule = config.modules['assets'];
  const normalizedCssPath = upath.normalize(cssPath);

  if (isWithinDirectory(normalizedCssPath, assetsModule.path)) {
    const relativePath = upath.relative(assetsModule.path, normalizedCssPath);
    return upath.join(config.baseUrl, assetsModule.url, relativePath);
  }

  return upath.join(config.baseUrl, upath.relative(config.rootDir, normalizedCssPath));
};

/**
 * Resolves a CSS asset reference to its canonical URL path.
 * @param {string} ref - The CSS url() reference.
 * @param {Config} config - The configuration object.
 * @returns {string | null} The resolved asset URL path, or null if unchanged.
 */
const resolveCssAssetUrl = (ref, config) => {
  const trimmed = ref.trim();
  if (!trimmed || isAbsoluteUrl(trimmed) || trimmed.startsWith('data:')) {
    return null;
  }

  const assetsModule = config.modules['assets'];
  const assetsUrl = assetsModule.url;

  if (trimmed.startsWith('@/')) {
    return upath.join(assetsUrl, trimmed.slice(2));
  }

  if (trimmed.startsWith(`${assetsUrl}/`) || trimmed === assetsUrl) {
    return trimmed;
  }

  return null;
};

/**
 * Rewrites root-absolute and @/ CSS url() references for static build output.
 * @param {string} content - The stylesheet content.
 * @param {string} cssPath - The stylesheet filesystem path.
 * @param {Config} config - The configuration object.
 * @returns {{ content: string, assets: Asset[] }} The updated content and assets.
 */
export const rewriteCssUrls = (content, cssPath, config) => {
  const cssUrl = getCssUrl(cssPath, config);
  const cssUrlDir = upath.dirname(cssUrl);

  const updatedContent = content.replace(CSS_URL_PATTERN, (match, _quote, ref) => {
    const assetUrl = resolveCssAssetUrl(ref, config);
    if (!assetUrl) return match;

    const relativeUrl = upath.relative(cssUrlDir, assetUrl);
    const quote = match.includes("'") ? "'" : match.includes('"') ? '"' : '';
    return `url(${quote}${relativeUrl}${quote})`;
  });

  return { content: updatedContent, assets: [] };
};

/**
 * Scans presentation content for asset references.
 * @param {string} content - The presentation content.
 * @param {AssetContext} context - The asset resolution context.
 * @returns {Promise<{ content: string, assets: Asset[] }>} The updated content and assets.
 */
export const scanContentAssets = async (content, context) => {
  const assets = [];
  let updatedContent = content;

  const scanners = [
    { pattern: /\[.*\]\((.+?)\)/g, refs: (match) => [match[1]] },
    { pattern: /(?:data-background-image|href)=["'](.+?)["']/g, refs: (match) => [match[1]] },
    {
      pattern: /data-background=["'](.+?)["']/g,
      refs: (match) => (isBackgroundAsset(match[1]) ? [match[1]] : []),
    },
    { pattern: /\bsrc=["'](.+?)["']/g, refs: (match) => [match[1]] },
    {
      pattern: /data-background-video=["'](.+?)["']/g,
      refs: (match) =>
        match[1]
          .split(',')
          .map((value) => value.trim())
          .filter((value) => isBackgroundAsset(value) || isAbsoluteUrl(value)),
    },
  ];

  for (const scanner of scanners) {
    const matches = [...updatedContent.matchAll(scanner.pattern)];
    for (const match of matches) {
      let replacement = match[0];
      for (const ref of scanner.refs(match)) {
        if (isAbsoluteUrl(ref) || ref.startsWith('#')) continue;
        const resolved = await resolveAssetMatches(ref, context, 'auto');
        assets.push(...resolved.filter((asset) => asset.path));
        if (ref.startsWith('@/') && resolved[0]?.url) {
          replacement = replacement.replace(ref, resolved[0].url);
        }
      }
      if (replacement !== match[0]) {
        updatedContent = updatedContent.replace(match[0], replacement);
      }
    }
  }

  return { content: updatedContent, assets: dedupeAssets(assets) };
};
