#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import autocompletePrompt from 'inquirer-autocomplete-prompt';
import inquirer from 'inquirer';
import open from 'open';
import updater from 'update-notifier';
import yargsParser from 'yargs-parser';

import build from '../src/build.js';
import configuration, { CLI_OPTIONS } from '../src/config.js';
import init from '../src/init.js';
import print from '../src/print.js';
import startServer from '../src/server.js';
import { isDirectory, isFile, loadJSON, sanitize, searchFiles, toArray } from '../src/utils.js';

/**
 * @typedef {import('../src/types').Config} Config
 */

// Retrieve package directory
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Retrieve package
const pkg = await loadJSON(path.join(__dirname, '../package.json'));
updater({ pkg }).notify();

// Retrieve command line arguments
const argv = yargsParser(process.argv.slice(2), CLI_OPTIONS);

// Register the autocomplete prompt type
inquirer.registerPrompt('autocomplete', autocompletePrompt);

/**
 * Prompts the user for a project initialization.
 * @returns {Promise<object>} - The prompt answer.
 */
const promptForInit = async () => {
  return inquirer.prompt([
    { name: 'private', message: 'private:', default: true },
    { name: 'name', message: 'package name:', default: path.basename(process.cwd()) },
    { name: 'version', message: 'version:', default: '1.0.0' },
    { name: 'license', message: 'license:' },
    { name: 'description', message: 'description:' },
    { name: 'keywords', message: 'keywords:' },
    { name: 'author', message: 'author:' },
    {
      type: 'confirm',
      name: 'confirm',
      message: 'Proceed with initialization in current directory? (y/N)',
      default: false,
    },
  ]);
};

/**
 * Prompts the user for action selection.
 * @returns {Promise<object>} - The prompt answer.
 */
const promptForAction = async () => {
  return inquirer.prompt([
    {
      type: 'list',
      name: 'target',
      message: 'Select an option:',
      choices: [
        { name: 'Load active directory', value: '.' },
        { name: 'Load examples', value: '~examples' },
        { name: 'Exit (^C)', value: null },
      ],
    },
  ]);
};

/**
 * Prompts the user for presentation selection.
 * @param {Config} config - The configuration object.
 * @returns {Promise<object>} - The prompt answer.
 */
const promptForPresentation = async (config) => {
  // Set count stat
  let count = 0;

  /**
   * Callback function for the autocomplete prompt.
   * @param {object} answers - The answers to the prompt.
   * @param {string} [input] - The user input.
   * @returns {Promise<string[]>} - The found presentations.
   */
  const callback = async (answers, input = '') => {
    // Retrieve files
    const files = await searchFiles(input, {
      cwd: config.rootDir,
      exts: toArray(config.extensions),
    });
    // Update count and return files
    count = files.length;
    return files;
  };

  // Initialize count stat
  await callback();

  // Prompt
  return inquirer.prompt([
    {
      type: 'confirm',
      name: 'select',
      message: 'Select a specifc presentation? (y/N)',
      default: false,
    },
    {
      type: 'autocomplete',
      name: 'selection',
      message: 'Select a presentation:',
      when: (answers) => answers.select,
      source: callback,
    },
    {
      type: 'confirm',
      name: 'confirm',
      message: `Proceed with ${count} presentation(s)? (y/N)`,
      default: false,
      when: (answers) => !answers.select && (config.build || config.print),
    },
  ]);
};

/**
 * CLI entry point.
 * 1. Prompt the user for presentation(s) selection if the target is a directory and the "all"
 *    option is not set ;
 * 2. Start the server with the provided configuration ;
 * 3. Build presentation(s) if the "build" operation is set ;
 * 4. Print presentation(s) if the "print" operation is set ;
 * 5. Open the presentation in the default browser if the "open" option is set and no other
 *    operation is set (i.e. "build" and "print").
 * */
(async () => {
  if (argv.help) {
    // Print help
    const help = await fs.readFile(path.join(__dirname, './help.txt'));
    console.log(help.toString());
  } else if (argv.version) {
    // Print version
    console.log(pkg.version);
  } else if (argv.init) {
    // Initialize a new project
    const project = await promptForInit();
    if (project.confirm) {
      await init(pkg, project);
    } else {
      console.log('Operation aborted');
    }
    process.exit(0);
  } else {
    // Serve presentations
    const mode = [argv.build ? 'build' : '', argv.print ? 'print' : '']
      .filter(Boolean)
      .join('+')
      .replace(/^$/, 'serve');
    console.log(`\x1b[1mreveal-me\x1b[0m ${pkg.version} [${mode}]`);

    try {
      // Prompt for an action if target path is not provided
      const cli = yargsParser(process.argv.slice(2));
      if (cli['_'].length === 0) {
        const action = await promptForAction();
        // Update command line arguments if a choice is made
        if (!action.target) return;
        process.argv.splice(2, 0, action.target);
      }

      // Retrieve configuration
      const config = await configuration();

      // Retrieve target presentations URLs
      let targetUrl = sanitize(path.relative(config.rootDir, config.targetPath));
      let targetUrls = [];

      if (config.targetPath.includes('*')) {
        // Handle wildcard target
        targetUrls = await searchFiles(config.targetPath, {
          cwd: config.rootDir,
          exts: toArray(config.extensions),
        });
        targetUrl = targetUrls.length ? targetUrls[0] : '';
      } else if (await isDirectory(config.targetPath)) {
        // Handle directory target
        const answers = argv.all ? { confirm: true } : await promptForPresentation(config);
        if (answers.select ?? true) {
          targetUrl = answers.selection;
          targetUrls = [answers.selection];
        } else if (answers.confirm ?? true) {
          targetUrls = await searchFiles(`${targetUrl ? targetUrl : '*'}*/**`, {
            cwd: config.rootDir,
            exts: toArray(config.extensions),
          });
        } else {
          console.log('Operation aborted');
          process.exit(0);
        }
      } else if (await isFile(config.targetPath)) {
        // Handle file target
        targetUrls = [targetUrl];
      }

      // Check if target URLs were found
      if (!targetUrls.length) {
        console.error('No presentations found...');
        process.exit(1);
      }

      // Retrieve presentation URLs
      const url = path.join(config.baseUrl, targetUrl);
      const urls = targetUrls.map((url) => path.join(config.baseUrl, url));

      // Start the server
      const server = await startServer();

      // Handle build and print operations
      if (config.build) await build(urls);
      if (config.print) await print(urls);

      // Finalize
      if (config.build || config.print) {
        server.close();
        process.exit(0);
      } else if (config.open) {
        open(`http://${config.host}:${config.port}${url}`);
        process.on('SIGINT', () => {
          console.log('Shutting down server...');
          server.close();
          process.exit(0);
        });
      }
    } catch (error) {
      console.error('Failed to serve presentations:\n', error);
      process.exit(1);
    }
  }
})();
