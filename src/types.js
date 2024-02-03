export {};

/**
 * Configuration compiled from source configurations.
 * @typedef {SourceConfig & ApplicationConfig} Config
 *
 * Source configuration.
 * @typedef {Object} SourceConfig
 * @property {string | string[]} [extensions]
 * @property {string} [config]
 * @property {string} [project]
 * @property {string} [git]
 * @property {string} [host]
 * @property {number} [port]
 * @property {boolean} [open]
 * @property {boolean} [watch]
 * @property {string} [baseUrl]
 * @property {string} [outDir]
 * @property {string} [rootDir]
 * @property {string} [assetsDir]
 * @property {string} [templatePath]
 * @property {string | string[]} [preprocessorPaths]
 * @property {string | string[]} [partialPaths]
 * @property {string | string[]} [scriptPaths]
 * @property {string | string[]} [stylePaths]
 * @property {string | string[]} [themePaths]
 * @property {Record<string, ModuleConfig>} [modules]
 * @property {PresentationConfig} [presentation]
 * @property {boolean} [build]
 * @property {boolean} [print]
 * @property {string} [printSize]
 * @property {string} [puppeteerLaunch]
 * @property {string} [puppeteerExecutable]
 *
 * Module configuration.
 * @typedef {Object} ModuleConfig
 * @property {string} [url]
 * @property {string} [path]
 *
 * Presentation configuration.
 * @typedef {Object} PresentationConfig
 * @property {string | string[]} [hero]
 * @property {string} [name]
 * @property {string} [title]
 * @property {string | string[]} [description]
 * @property {string} [date]
 * @property {string} [author]
 * @property {string | number} [featured]
 * @property {string} [theme]
 * @property {string} [highlightTheme]
 * @property {SeparatorConfig} [separators]
 * @property {RevealConfig} [settings]
 * @property {string | string[]} [plugins]
 * @property {string | string[]} [scripts]
 * @property {string | string[]} [styles]
 *
 * Separators configuration.
 * @typedef {Object} SeparatorConfig
 * @property {string} [horizontalSeparator]
 * @property {string} [verticalSeparator]
 * @property {string} [noteSeparator]
 *
 * Reveal.js configuration.
 * @typedef {Record<string, object>} RevealConfig
 *
 * Application configuration.
 * @typedef {Object} ApplicationConfig
 * @property {string} packageDir
 * @property {string} targetDir
 * @property {string} targetPath
 * @property {ApplicationSources} sources
 * @property {boolean} hasFavicon
 *
 * Application sources.
 * @typedef {Object} ApplicationSources
 * @property {SourceConfig} cli
 * @property {SourceConfig} extra
 * @property {SourceConfig} process
 * @property {SourceConfig} defaults
 *
 * Options for the error template rendering.
 * @typedef {Object} ErrorOptions
 * @property {boolean} hasFavicon
 * @property {string} project
 * @property {string} title
 * @property {string} description
 * @property {string} content
 *
 * Options for the collection template rendering.
 * @typedef {Object} CollectionOptions
 * @property {string} project
 * @property {boolean} hasFavicon
 * @property {string} breadcrumb
 * @property {string} title
 * @property {CollectionItemOptions[]} content
 *
 * Options for the collection item template rendering.
 * @typedef {Object} CollectionItemOptions
 * @property {string} name
 * @property {string} title
 * @property {string} endpoint
 * @property {string} endpointUrl
 * @property {string} item
 * @property {string} itemUrl
 *
 * Options for the document template rendering.
 * @typedef {Object} DocumentOptions
 * @property {string} project
 * @property {boolean} hasFavicon
 * @property {string} hero
 * @property {string} title
 * @property {string} description
 * @property {string} date
 * @property {string} author
 * @property {string} content
 * @property {string} gitUrl
 * @property {string} themeUrl
 * @property {string} highlightThemeUrl
 * @property {string[]} scriptUrls
 * @property {string[]} styleUrls
 * @property {string} pluginsOptions
 * @property {string} revealOptions
 * @property {string} slidifyOptions
 * @property {string} host
 * @property {number} port
 * @property {boolean} watch
 * @property {string} extension
 *
 * Preprocessor function for the template rendering.
 * @callback Preprocessor
 * @param {string} content - The content to preprocess.
 * @param {DocumentOptions} options - The options object.
 * @returns {Promise<string>} - The preprocessed content.
 *
 * Asset used by the template rendering.
 * @typedef {Object} Asset
 * @property {string} url - The asset URL.
 * @property {string | null} path - The asset path.
 *
 * File used by the application.
 * @typedef {Object} File
 * @property {string} path - The file path.
 * @property {Promise<Buffer>} buffer - The file buffer.
 */
