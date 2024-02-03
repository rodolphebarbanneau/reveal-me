export class NoEntryError extends Error {
  constructor() {
    super();
    this.name = 'NoEntryError';
    this.code = 'ENOENT';
    this.message = 'No such file or directory';
  }
}
