import { spawn } from 'node:child_process';

describe('main function tests', () => {
  afterEach(() => {
    jest.resetAllMocks();
    jest.restoreAllMocks();
  });

  test('should run the CLI command successfully', (done) => {
    // Call the CLI process
    const cli = spawn('node', ['bin/main.js', 'tests/fixtures']);
    // Check for successful exit
    cli.on('close', (code) => {
      expect(code).toBe(0);
      done();
    });
    // Check for errors
    cli.on('error', (error) => {
      expect(error).toBeNull();
      done();
    });

    // Close the CLI process
    cli.stdout.on('data', (data) => {
      const content = data.toString();
      if (content.includes('Select a specifc presentation?')) {
        // Select default option (no specific presentation)
        cli.stdin.write('\n');
      } else if (content.includes('Press ^C to exit')) {
        // Close the server
        cli.kill('SIGINT');
      }
    });
  });
});
