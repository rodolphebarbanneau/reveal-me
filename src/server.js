import fs from 'node:fs/promises';
import path from 'node:path';

import chokidar from 'chokidar';
import express from 'express';
import favicon from 'serve-favicon';
import ws, { WebSocketServer } from 'ws';

import configuration from './config.js';
import { renderError, renderCollection, renderDocument } from './render.js';
import { debounce, sanitize, toArray } from './utils.js';

/**
 * @typedef {import('http').Server} Server
 * @typedef {import('serve-static').RequestHandler} RequestHandler
 * @typedef {import('serve-static').ServeStaticOptions} ServeStaticOptions
 */

// Environment
const NODE_ENV = process.env.NODE_ENV || 'development'; // eslint-disable-line no-unused-vars

/**
 * Serves static files.
 * @param {string} root  - The root directory.
 * @param {ServeStaticOptions} [options] - The serve static options.
 * @returns {RequestHandler} The request handler.
 */
const serveStatic = (root, options = {}) => {
  const serve = express.static(root, { ...options, fallthrough: true });
  return (req, res, next) => {
    serve(req, res, (error) => {
      next(error);
    });
  };
};

/**
 * Starts the presentations server.
 * @returns {Promise<Server>} The HTTP server instance.
 */
export default async () => {
  // Retrieve configuration
  const config = await configuration();

  // Initialize the server
  const app = express();
  const server = app.listen(config.port);
  const wss = new WebSocketServer({ server });

  // Serve favicon
  const faviconPath = path.join(config.assetsDir, 'favicon.ico');
  const hasFavicon = await fs.stat(faviconPath).catch(() => false);
  if (hasFavicon) app.use(favicon(faviconPath));

  // Serve modules static files (highlight.js, reveal.js, assets modules...)
  Object.values(config.modules).forEach((value) => app.use(value.url, serveStatic(value.path)));

  // Serve resource
  app.get('/*', async (req, res, next) => {
    // Redirect to base URL if none is specified
    if (req.url === '/' && config.baseUrl !== '') return res.redirect(config.baseUrl);
    // Skip if URL doesn't match base URL
    if (!req.url.startsWith(config.baseUrl)) return next();

    // Retrieve resource information
    const resourceUrl = sanitize(decodeURIComponent(req.url));
    const resourceExtension = path.extname(resourceUrl);

    // Render resource
    if (!resourceExtension) {
      // Render collection
      if (req.path.slice(-1) !== '/') {
        const query = req.url.slice(req.path.length);
        res.redirect(301, `${req.path}/${query}`);
      } else {
        try {
          const filter = req.query.filter ? req.query.filter.toString() : '';
          const markup = await renderCollection(resourceUrl, filter);
          res.send(markup);
        } catch (error) {
          console.debug('Error serving collection:\n', error);
          const markup = await renderError('500', 'Error serving collection.', error.message);
          res.status(500).send(markup);
        }
      }
    } else if (toArray(config.extensions).includes(resourceExtension)) {
      // Render presentation
      try {
        const [markup] = await renderDocument(resourceUrl);
        res.send(markup);
      } catch (error) {
        console.debug('Error serving presentation:\n', error);
        const markup = await renderError('500', 'Error serving presentation.', error.message);
        res.status(500).send(markup);
      }
    } else {
      next();
    }
  });

  // Serve static files from root directory
  app.use(config.baseUrl, serveStatic(config.rootDir));

  // Serve "404" error page if no route was matched
  app.use('*', async (req, res) => {
    const markup = await renderError(
      '404',
      'Page not found.',
      "The page you're looking for doesn't exist.",
    );
    res.status(404).send(markup);
  });

  /**
   * Watch a path for changes and reload the presentation when a change occurs.
   * @param {string} targetPath - The target path to watch.
   * @param {boolean} recursive - Whether to watch the path recursively.
   */
  const watchPath = (targetPath, recursive = true) => {
    const watcher = chokidar.watch(targetPath, {
      ignored: /(^|[/\\])\../, // Ignore dot files
      persistent: true,
      depth: recursive ? undefined : 1,
    });
    // Send a reload message to all connected clients
    const sendReload = debounce(() => {
      wss.clients.forEach((client) => {
        if (client.readyState === ws.OPEN) {
          client.send('reload');
        }
      });
    }, 300);
    // Watch for changes in the presentation file content...
    watcher.on('change', (filePath) => {
      console.log(`File updated: ${filePath}`);
      sendReload();
    });
    // Watch for errors...
    watcher.on('error', (error) => console.error(`Watcher error: ${error}`));
  };

  // Watch for changes in the presentation file content...
  watchPath(config.assetsDir, true);
  watchPath(config.rootDir, true);

  console.log(`Presentations server running at http://${config.host}:${config.port}`);

  return server;
};
