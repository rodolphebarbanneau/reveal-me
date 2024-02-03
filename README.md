# `reveal-me`

## Introduction

`reveal-me` is a powerful command-line interface (CLI) tool designed to enhance the experience of creating, managing, and presenting slideshows with [reveal.js](https://revealjs.com/). It simplifies the workflow for users by offering features such as live reloading, presentation serving, and more, directly from the command line.

## Table of Contents

1. [Installation](#installation)
2. [CLI Usage](#cli-usage)
   - [Commands](#commands)
   - [Options](#options)
3. [Configuration](#configuration)
4. [Presentation Management](#presentation-management)
   - [Creating Presentations](#creating-presentations)
   - [Building Presentations](#building-presentations)
   - [Serving Presentations](#serving-presentations)
5. [Advanced Features](#advanced-features)
   - [Live Reloading](#live-reloading)
   - [Printing to PDF](#printing-to-pdf)
   - [Custom Templates and Themes](#custom-templates-and-themes)
6. [Troubleshooting](#troubleshooting)
7. [Contributing](#contributing)
8. [License](#license)
9. [Acknowledgments](#acknowledgments)

## Installation

To get started with `reveal-me`, you must have [Node.js](https://nodejs.org/en) installed on your machine. Once [Node.js](https://nodejs.org/en) is set up, you can install `reveal-me` globally using npm:

```bash
npm install -g reveal-me
```

This makes the `reveal-me` command available globally.

## CLI Usage

### Commands

To use `reveal-me`, you can start with the following commands:

```plaintext
reveal-me <presentation> [options]
reveal-me <project> <presentation> [options]
```

These commands allow you to serve or build your presentations with various options for customization.

### Options

The following table outlines the options available in `reveal-me`:

| Option                            | Description                                                         |
|-----------------------------------|---------------------------------------------------------------------|
| `-v`, `--version`                 | Output the version number.                                          |
| `--extensions` `<exts>`           | A comma-separated list of file extensions to include.               |
| `-c`, `--config` `<path>`         | Path to the configuration file.                                     |
| `--project` `<name>`              | Name of the project.                                                |
| `--git` `<url>`                   | Path to the git files repository of the project.                    |
| `--host` `<host>`                 | The hostname for serving the presentation.                          |
| `--port` `<port>`                 | The port number for the server.                                     |
| `--no-open`                       | Disable auto open of the presentation in the browser.               |
| `-w`, `--watch`                   | Enable watching file changes and live-reloading.                    |
| `--base-url` `<url>`              | The base URL for the presentation.                                  |
| `--out-dir` `<dir>`               | The output directory for the build files.                           |
| `--root-dir` `<dir>`              | The root directory of the project.                                  |
| `--assets-dir` `<dir>`            | The directory name for assets.                                      |
| `--template-path` `<path>`        | Path to the template file.                                          |
| `--preprocessor-paths` `<paths>`  | A comma-separated list of paths to preprocessor scripts.            |
| `--partial-paths` `<paths>`       | A comma-separated list of paths to partial files.                   |
| `--script-paths` `<paths>`        | A comma-separated list of paths to script files.                    |
| `--style-paths` `<paths>`         | A comma-separated list of paths to style files.                     |
| `--theme-paths` `<paths>`         | A comma-separated list of paths to theme files.                     |
| `-a`, `--all`                     | Build all presentations in the project without prompting.           |
| `-b`, `--build`                   | Trigger the build process.                                          |
| `-p`, `--print` `<filename>`      | Enable printing to PDF.                                             |
| `--print-size` `<size>`           | Specifies the paper size for the PDF print.                         |
| `--puppeteer-launch` `<args>`     | Custom arguments for launching Puppeteer.                           |
| `--puppeteer-executable` `<path>` | Path to a custom Puppeteer executable.                              |
| `-h`, `--help`                    | Display help for command.                                           |

## Configuration

`reveal-me` can be configured using a JSON file. By default, `reveal-me` looks for a file named `config.json` in the root directory of your project. You can also specify a different configuration file using the `-c` or `--config` option. This allows you to customize various aspects of your presentations, including the server's host and port, directories for assets and output, and paths for custom templates and styles.

## Presentation Management

### Creating Presentations

To create a new presentation, organize your content and assets into a directory structure. You can use Markdown or HTML for your slides, and include any necessary CSS or JavaScript files in the specified assets directory.

### Building Presentations

Use the `-b` or `--build` option to compile your presentation into static files. This is useful for deploying your presentation to a web server or hosting service.

### Serving Presentations

To serve a presentation locally, simply run `reveal-me` with the path to your presentation directory. Use the `--host` and `--port` options to specify the server configuration, and `--no-open` if you do not want the presentation to automatically open in your browser.

## Advanced Features

### Live Reloading

Enable live reloading with the `-w` or `--watch` option. This automatically refreshes your presentation in the browser when you make changes to the slides or assets.

### Printing to PDF

`reveal-me` supports printing presentations to PDF. Use the `-p` or `--print` option, followed optionally by the filename for the PDF. Customize the print size with `--print-size`.

### Custom Templates and Themes

Customize your presentation with custom templates and themes by specifying paths to your HTML template, CSS stylesheets, and JavaScript files using the respective options.

## Troubleshooting

If you encounter issues while using `reveal-me`, verify your configuration and command-line options. Ensure that all paths are correct and that you have the necessary permissions to read from and write to the specified directories.

## Contributing

Contributions to `reveal-me` are welcome! Please refer to the project's GitHub [repository guidelines](CONTRIBUTING.md) on contributing and submitting pull requests.

## License

`reveal-me` is released under the MIT License. See the LICENSE file in the project repository for more information.

## Acknowledgments

`reveal-me` builds upon the foundation of [reveal.js](https://revealjs.com/) and inspired from [reveal-md](https://github.com/webpro/reveal-md), extending its capabilities for an improved user experience. Special thanks to the creators and contributors of reveal.js projects for their innovative work in the field of presentation software.
