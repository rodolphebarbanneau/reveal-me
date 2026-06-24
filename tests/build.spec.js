import { execFileSync } from 'node:child_process';
import fs from 'node:fs/promises';

import upath from 'upath';

const projectRoot = upath.resolve('.');
const fixturesDir = upath.join(projectRoot, 'tests/fixtures');
const distDir = upath.join(fixturesDir, 'dist');

describe('buildDocument function tests', () => {
  afterEach(async () => {
    await fs.rm(distDir, { recursive: true, force: true });
  });

  test('should bundle co-located presentation assets and shared assets on build', async () => {
    execFileSync(
      process.execPath,
      [
        upath.join(projectRoot, 'bin/main.js'),
        fixturesDir,
        'src/talk/deck.md',
        '--build',
        '--no-open',
        '--port',
        '3011',
      ],
      { cwd: projectRoot, stdio: 'pipe' },
    );

    await expect(fs.stat(upath.join(distDir, 'talk/deck.html'))).resolves.toBeDefined();
    await expect(fs.stat(upath.join(distDir, 'talk/logo.png'))).resolves.toBeDefined();
    await expect(fs.stat(upath.join(distDir, 'talk/deck.js'))).resolves.toBeDefined();
    await expect(fs.stat(upath.join(distDir, 'talk/deck.css'))).resolves.toBeDefined();
    await expect(fs.stat(upath.join(distDir, 'assets/shared.js'))).resolves.toBeDefined();
  });

  test('should rewrite hero and CSS asset URLs for static build output', async () => {
    execFileSync(
      process.execPath,
      [
        upath.join(projectRoot, 'bin/main.js'),
        fixturesDir,
        'src/talk/deck.md',
        '--build',
        '--no-open',
        '--port',
        '3012',
      ],
      { cwd: projectRoot, stdio: 'pipe' },
    );

    const html = await fs.readFile(upath.join(distDir, 'talk/deck.html'), 'utf-8');
    const fontsCss = await fs.readFile(upath.join(distDir, 'assets/styles/fonts.css'), 'utf-8');

    expect(html).toContain('../assets/hero.png');
    expect(html).not.toContain('data-background="/assets/hero.png"');
    expect(fontsCss).toContain("url('../fonts/test.woff2')");
    expect(fontsCss).not.toContain('/assets/fonts/');
    expect(fontsCss).not.toContain('@/fonts/');
  });
});
