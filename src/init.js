import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

import upath from 'upath';

import { isDirectory, toTitleCase } from './utils.js';

// Retrieve package directory
const __dirname = upath.dirname(fileURLToPath(import.meta.url));

/**
 * Copies a file or directory recursively to a specified destination.
 * @param {string} src - The source path.
 * @param {string} dest - The destination path.
 */
export const copyRecursively = async (src, dest) => {
  // Check if source path exists
  const exists = await fs
    .stat(src)
    .then(() => true)
    .catch(() => false);
  if (!exists) {
    throw new Error(`Source path "${src}" does not exist.`);
  }

  // Copy file or directory
  if (await isDirectory(src)) {
    await fs.mkdir(dest, { recursive: true });
    const children = await fs.readdir(src);
    for (let childItemName of children) {
      const srcPath = upath.join(src, childItemName);
      const destPath = upath.join(dest, childItemName);
      await copyRecursively(srcPath, destPath);
    }
  } else {
    await fs.copyFile(src, dest);
  }
};

/**
 * Initializes a new project.
 * @param {object} pkg - The reveal-me package.json object.
 * @param {object} config - The custom user-defined configuration.
 */
export default async (pkg, config) => {
  // Write config.json
  await fs.writeFile(
    upath.join(process.cwd(), 'config.json'),
    JSON.stringify(
      {
        project: toTitleCase(config.name),
        baseUrl: 'slides',
        outDir: 'dist',
        rootDir: 'src',
        assetsDir: 'assets',
        presentation: {
          theme: 'white',
        },
      },
      null,
      2,
    ),
  );

  // Write package.json
  await fs.writeFile(
    upath.join(process.cwd(), 'package.json'),
    JSON.stringify(
      {
        type: 'module',
        private: config.private,
        name: config.name,
        version: config.version,
        license: config.license,
        description: config.description,
        keywords: config.keywords.split(',').map((keyword) => keyword.trim()),
        author: config.author,
        scripts: {
          start: 'reveal-me . --watch',
          build: 'reveal-me . --build --print',
          test: 'echo "Error: no test specified" && exit 1',
        },
        dependencies: {
          puppeteer: '^21.9.0',
        },
      },
      null,
      2,
    ),
  );

  // Write README.md
  await fs.writeFile(
    upath.join(process.cwd(), 'README.md'),
    `# ${toTitleCase(config.name)}\n\n${config.description}`,
  );

  // Copy demo project
  try {
    await copyRecursively(upath.join(__dirname, 'demo'), upath.join(process.cwd(), ''));
  } catch (error) {
    console.error(`😱 Error copying demo project:\n`, error);
  }

  console.log('✅ Project initialized successfully.');
};
