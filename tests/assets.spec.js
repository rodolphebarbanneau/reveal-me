import upath from 'upath';

import * as assets from '../src/assets.js';

const fixturesDir = upath.join(process.cwd(), 'tests/fixtures');

/** @type {import('../src/types').AssetContext} */
const createContext = (overrides = {}) => ({
  config: {
    modules: {
      assets: {
        url: '/assets',
        path: upath.join(fixturesDir, 'assets'),
      },
    },
  },
  url: '/talk/deck.md',
  targetPath: upath.join(fixturesDir, 'src/talk/deck.md'),
  ...overrides,
});

describe('isAbsoluteUrl function tests', () => {
  test('should return true for absolute URLs', () => {
    expect(assets.isAbsoluteUrl('http://example.com')).toBe(true);
    expect(assets.isAbsoluteUrl('https://example.com')).toBe(true);
    expect(assets.isAbsoluteUrl('//cdn.example.com')).toBe(true);
  });

  test('should return false for relative URLs', () => {
    expect(assets.isAbsoluteUrl('/path/to/resource')).toBe(false);
    expect(assets.isAbsoluteUrl('path/to/resource')).toBe(false);
    expect(assets.isAbsoluteUrl('./path/to/resource')).toBe(false);
  });

  test('should return false for URLs containing newline characters', () => {
    expect(assets.isAbsoluteUrl('http://example.com\n')).toBe(false);
  });
});

describe('isBackgroundAsset function tests', () => {
  test('should return false for CSS color values', () => {
    expect(assets.isBackgroundAsset('#00ffff')).toBe(false);
    expect(assets.isBackgroundAsset('salmon')).toBe(false);
    expect(assets.isBackgroundAsset('rgba(0, 0, 0, 0.2)')).toBe(false);
  });

  test('should return true for asset paths', () => {
    expect(assets.isBackgroundAsset('./assets/image1.png')).toBe(true);
    expect(assets.isBackgroundAsset('@/images/logo.png')).toBe(true);
    expect(assets.isBackgroundAsset('https://example.com/image.png')).toBe(true);
  });
});

describe('resolveAssetMatches function tests', () => {
  test('should resolve shared assets from the assets directory', async () => {
    const context = createContext();
    const resolved = await assets.resolveAssetMatches('@/shared.js', context, 'auto');

    expect(resolved).toHaveLength(1);
    expect(resolved[0].path).toBe(upath.join(fixturesDir, 'assets/shared.js'));
  });

  test('should resolve presentation-local assets', async () => {
    const context = createContext();
    const resolved = await assets.resolveAssetMatches('./logo.png', context, 'auto');

    expect(resolved).toHaveLength(1);
    expect(resolved[0].path).toBe(upath.join(fixturesDir, 'src/talk/logo.png'));
  });

  test('should resolve bare presentation-local asset paths', async () => {
    const context = createContext();
    const resolved = await assets.resolveAssetMatches('deck.js', context, 'presentation');

    expect(resolved).toHaveLength(1);
    expect(resolved[0].path).toBe(upath.join(fixturesDir, 'src/talk/deck.js'));
  });

  test('should return external assets without a filesystem path', async () => {
    const context = createContext();
    const resolved = await assets.resolveAssetMatches(
      'https://example.com/app.js',
      context,
      'auto',
    );

    expect(resolved).toEqual([{ url: 'https://example.com/app.js', path: null }]);
  });
});

describe('resolveAssetPaths function tests', () => {
  test('should resolve assets from the assets base', async () => {
    const context = createContext();
    const resolved = await assets.resolveAssetPaths(context, ['shared.js'], 'assets');

    expect(resolved).toHaveLength(1);
    expect(resolved[0].path).toBe(upath.join(fixturesDir, 'assets/shared.js'));
  });
});

describe('scanContentAssets function tests', () => {
  test('should collect and rewrite supported content asset references', async () => {
    const context = createContext();
    const content = [
      '![Logo](./logo.png)',
      '<section data-background="#00ffff"></section>',
      '<section data-background="./logo.png"></section>',
      '<img src="./logo.png">',
      '![Shared](@/shared.js)',
    ].join('\n');

    const result = await assets.scanContentAssets(content, context);

    expect(result.assets).toHaveLength(2);
    expect(result.assets.map((asset) => asset.path)).toEqual(
      expect.arrayContaining([
        upath.join(fixturesDir, 'src/talk/logo.png'),
        upath.join(fixturesDir, 'assets/shared.js'),
      ]),
    );
    expect(result.content).not.toContain('@/shared.js');
    expect(result.content).toContain('data-background="#00ffff"');
  });
});

describe('dedupeAssets function tests', () => {
  test('should deduplicate assets by filesystem path', () => {
    const path = upath.join(fixturesDir, 'src/talk/logo.png');
    const deduped = assets.dedupeAssets([
      { url: 'logo.png', path },
      { url: './logo.png', path },
      { url: 'https://example.com', path: null },
    ]);

    expect(deduped).toHaveLength(2);
  });
});

describe('getAssetBuildPath function tests', () => {
  test('should compute the build output path for a local asset', () => {
    const config = {
      outDir: upath.join(fixturesDir, 'dist'),
      baseUrl: '/',
      rootDir: upath.join(fixturesDir, 'src'),
    };
    const assetPath = upath.join(fixturesDir, 'src/talk/logo.png');
    const buildPath = assets.getAssetBuildPath(config, assetPath);

    expect(buildPath).toBe(upath.join(fixturesDir, 'dist/talk/logo.png'));
  });
});

/** @type {import('../src/types').Config} */
const createConfig = (overrides = {}) => ({
  baseUrl: '/',
  rootDir: upath.join(fixturesDir, 'src'),
  assetsDir: upath.join(fixturesDir, 'assets'),
  modules: {
    assets: {
      url: '/assets',
      path: upath.join(fixturesDir, 'assets'),
    },
  },
  ...overrides,
});

describe('getCssUrl function tests', () => {
  test('should return the assets module URL for stylesheets under assetsDir', () => {
    const cssPath = upath.join(fixturesDir, 'assets/styles/fonts.css');
    const cssUrl = assets.getCssUrl(cssPath, createConfig());

    expect(cssUrl).toBe('/assets/styles/fonts.css');
  });

  test('should return the presentation URL for local stylesheets', () => {
    const cssPath = upath.join(fixturesDir, 'src/talk/deck.css');
    const cssUrl = assets.getCssUrl(cssPath, createConfig());

    expect(cssUrl).toBe('/talk/deck.css');
  });
});

describe('rewriteCssUrls function tests', () => {
  test('should rewrite root-absolute asset URLs relative to the stylesheet URL', () => {
    const cssPath = upath.join(fixturesDir, 'assets/styles/main.css');
    const content = "@font-face { src: url('/assets/fonts/x.woff2'); }";
    const result = assets.rewriteCssUrls(content, cssPath, createConfig());

    expect(result.content).toContain("url('../fonts/x.woff2')");
    expect(result.content).not.toContain('/assets/fonts/');
  });

  test('should rewrite @/ asset URLs relative to the stylesheet URL', () => {
    const cssPath = upath.join(fixturesDir, 'assets/styles/main.css');
    const content = "@font-face { src: url('@/fonts/x.woff2'); }";
    const result = assets.rewriteCssUrls(content, cssPath, createConfig());

    expect(result.content).toContain("url('../fonts/x.woff2')");
    expect(result.content).not.toContain('@/fonts/');
  });

  test('should leave external and relative asset URLs unchanged', () => {
    const cssPath = upath.join(fixturesDir, 'assets/styles/main.css');
    const content = [
      "@font-face { src: url('https://example.com/font.woff2'); }",
      "@font-face { src: url('../fonts/x.woff2'); }",
    ].join('\n');
    const result = assets.rewriteCssUrls(content, cssPath, createConfig());

    expect(result.content).toBe(content);
  });
});
