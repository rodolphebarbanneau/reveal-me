/* eslint-disable no-console */
import path from 'node:path';

import _ from 'lodash';
import createDebug from 'debug';

import configuration from './config.js';
import { makeDirectory, sanitize } from './utils.js';

/**
 * @typedef {import('./types').Config} Config
 */

// Initialize debug
const debug = createDebug('reveal-me');

// Import puppeteer dynamically to avoid bundling it in the final binary
const puppeteerImport = (async () => {
  try {
    return await import('puppeteer');
  } catch (error) {
    console.warn('Unable to print file (Puppeteer unavailable)');
    debug(error);
  }
})();

/**
 * Gets the print options.
 * @param {Config} config - The configuration object.
 * @return {Object} The print options.
 */
export const getPrintOptions = (config) => {
  const { printSize } = config;
  const { settings } = config.presentation;

  // Handle print size
  if (printSize) {
    const dimensions = printSize.match(/^([\d.]+)x([\d.]+)([a-z]*)$/);
    if (dimensions) {
      const [width, height, unit] = dimensions.slice(1);
      return { width: `${width}${unit}`, height: `${height}${unit}` };
    }
    return { format: printSize };
  } else if (settings.width && settings.height) {
    return { width: settings.widt, height: settings.height };
  }

  return {};
};

/**
 * Gets the puppeteer options.
 * @param {Config} config - The configuration object.
 * @returns {Object} The puppeteer options.
 */
export const getPuppeteerOptions = (config) => {
  const { puppeteerLaunch, puppeteerExecutable } = config;
  return {
    headless: 'new',
    args: puppeteerLaunch ? puppeteerLaunch.split(' ') : [],
    executablePath: puppeteerExecutable || null,
  };
};

/**
 * Gets the slide URL.
 * @param {string} slide - The slide id (e.g. 3-1).
 * @returns {string} The slide URL.
 */
export const getSlideUrl = (slide) => {
  const [mainSlide, subSlide] = slide.split('-').map((slide) => _.parseInt(slide, 10));
  return isNaN(mainSlide) ? '' : '#/' + mainSlide + (isNaN(subSlide) ? '' : '/' + subSlide);
};

/**
 * Prints a presentation document.
 * @param {string} url - The presentation document URL to print.
 * @param {string} [slide] - The slide id (e.g. 3-1).
 * @returns {Promise<string>} The path to the printed presentation document.
 */
export const print = async (url, slide) => {
  // Retrieve puppeteer
  const puppeteer = await puppeteerImport;
  if (!puppeteer) return;

  // Retrieve configuration
  const config = await configuration();
  const puppeteerOptions = getPuppeteerOptions(config);
  const printFormat = slide ? '.jpg' : '.pdf';
  const printUrl = sanitize(slide, { prefix: '/' });
  const slideUrl = slide ? getSlideUrl(slide) : '';
  const printModule = path.join(config.modules['base'].path, 'plugin/print-pdf/print-pdf.js');
  const printPath =
    typeof config.print === 'string'
      ? path.resolve(config.print)
      : (() => {
          const printPath = printUrl.replace(/\.[^.]*$/, printFormat);
          return slide
            ? path.join(config.outDir, printPath)
            : path.join(config.outDir, 'pdf', printPath.slice(config.baseUrl.length));
        })();
  const printOptions = {
    path: printPath,
    width: slide ? 1200 : 960,
    height: slide ? 1200 : 700,
    ...getPrintOptions(config),
  };

  // Log
  debug({ printUrl, slideUrl, printPath, printModule, puppeteerOptions });
  console.log(`Printing ":/${printUrl}" to "${printPath}"...`);

  // Print
  try {
    await makeDirectory(printPath);
    const browser = await puppeteer.launch(puppeteerOptions);
    const page = await browser.newPage();
    if (slide) {
      const targetUrl = `http://${config.host}:${config.port}${printUrl}?menu=hide${slideUrl}`;
      await page.setViewport(printOptions);
      await page.goto(targetUrl, { waitUntil: 'load' });
      await page.screenshot({ quality: 70, fullPage: true, ...printOptions });
    } else {
      const targetUrl = `http://${config.host}:${config.port}${printUrl}?menu=hide&view=print`;
      await page.goto(`${targetUrl}&view=print`, { waitUntil: 'networkidle0' });
      await page.pdf({ printBackground: true, ...printOptions });
    }
    await browser.close();
  } catch (error) {
    console.error(`Error printing ":/${printUrl}" to "${printPath}":\n`, error);
    debug(error);
  }

  console.log(`Successfully printed ":/${printUrl}" to "${printPath}"`);
  return printPath;
};

/**
 * Prints some presentation documents.
 * @param {string[]} urls - The presentation document URLs to print.
 * @param {string} [slide] - The slide id (e.g. 3-1).
 * @returns {Promise<string[]>} The path to the printed presentation documents.
 */
export default async (urls, slide) => {
  // Retrieve puppeteer
  const puppeteer = await puppeteerImport;
  if (!puppeteer) return;

  // Print
  const operations = [];
  for (const url of _.uniq(urls)) {
    operations.push(print(url, slide));
  }
  return Promise.all(operations);
};
