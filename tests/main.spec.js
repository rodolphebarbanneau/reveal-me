import { spawn } from 'node:child_process';

describe('main function tests', () => {
  afterEach(() => {
    jest.resetAllMocks();
    jest.restoreAllMocks();
  });

  test('should run the CLI command successfully', (done) => {
    // Call the CLI process
    const cli = spawn('node', ['bin/main.js', 'tests/fixtures', '--no-open', '--port', '3099'], {
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let output = '';
    let answeredPresentation = false;
    let sentSigint = false;

    // Check for successful exit
    cli.on('close', (code, signal) => {
      expect(code === 0 || signal === 'SIGINT').toBe(true);
      done();
    });

    cli.on('error', (error) => {
      done(error);
    });

    const handleOutput = (data) => {
      output += data.toString();

      if (!answeredPresentation && output.includes('Select a specifc presentation?')) {
        // Select default option (no specific presentation)
        answeredPresentation = true;
        cli.stdin.write('\n');
      } else if (!sentSigint && output.includes('Press ^C to exit')) {
        // Close the server
        sentSigint = true;
        cli.kill('SIGINT');
      }
    };

    // Close the CLI process
    cli.stdout.on('data', handleOutput);
    cli.stderr.on('data', handleOutput);
  }, 15000);
});
