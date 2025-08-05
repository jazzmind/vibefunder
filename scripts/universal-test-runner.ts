#!/usr/bin/env npx tsx

/**
 * Universal Test Runner for VibeFunder
 * 
 * Handles the complete test lifecycle:
 * 1. Sources .env.local for TEST_PORT
 * 2. Kills any existing servers on TEST_PORT
 * 3. Starts LOCAL_API=true next dev --port ${TEST_PORT}
 * 4. Runs Jest with passed parameters
 * 5. Cleans up automatically
 * 
 * Usage:
 *   npm run test [jest-args...]
 *   npm run test __tests__/integration/full-workflow.test.ts
 *   npm run test __tests__/ai/ --verbose
 *   npm run test --testNamePattern="AI Image Generation"
 */

import { spawn, exec, ChildProcess } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';

const execAsync = promisify(exec);

interface TestRunnerConfig {
  testPort: number;
  maxServerStartupTime: number;
  serverReadyTimeout: number;
  cleanupGracePeriod: number;
}

class UniversalTestRunner {
  private config: TestRunnerConfig;
  private serverProcess: ChildProcess | null = null;
  private isShuttingDown: boolean = false;

  constructor() {
    this.config = {
      testPort: this.getTestPort(),
      maxServerStartupTime: 45000, // 45 seconds
      serverReadyTimeout: 2000, // 2 seconds between ready checks
      cleanupGracePeriod: 3000 // 3 seconds for graceful shutdown
    };

    // Setup cleanup handlers
    process.on('SIGINT', () => this.gracefulShutdown('SIGINT'));
    process.on('SIGTERM', () => this.gracefulShutdown('SIGTERM'));
    process.on('exit', () => this.cleanup());
    process.on('uncaughtException', (error) => {
      console.error('❌ Uncaught exception:', error);
      this.gracefulShutdown('UNCAUGHT_EXCEPTION');
    });
  }

  /**
   * Read TEST_PORT from .env.local, fallback to 3101
   */
  private getTestPort(): number {
    try {
      const envLocalPath = path.join(process.cwd(), '.env.local');
      if (fs.existsSync(envLocalPath)) {
        const envContent = fs.readFileSync(envLocalPath, 'utf-8');
        const testPortMatch = envContent.match(/TEST_PORT=(\d+)/);
        if (testPortMatch) {
          return parseInt(testPortMatch[1], 10);
        }
      }
    } catch {
      console.log(`⚠️  Could not read .env.local`);
    }
   
    console.log('ℹ️  TEST_PORT not found in .env.local, using default: 3101');
    return 3101;
  }

  /**
   * Kill any existing processes on the test port
   */
  private async killExistingServer(): Promise<void> {
    try {
      console.log(`🔍 Checking for existing servers on port ${this.config.testPort}...`);
      const { stdout } = await execAsync(`lsof -ti:${this.config.testPort}`);
      
      if (stdout.trim()) {
        console.log(`🔪 Killing existing server on port ${this.config.testPort}...`);
        await execAsync(`lsof -ti:${this.config.testPort} | xargs kill -9`);
        console.log(`✅ Port ${this.config.testPort} cleared`);
        
        // Wait a moment for the port to be fully released
        await new Promise(resolve => setTimeout(resolve, 1000));
      } else {
        console.log(`✅ Port ${this.config.testPort} is available`);
      }
    } catch {
      // lsof returns exit code 1 when no processes found, which is fine
      console.log(`✅ Port ${this.config.testPort} is available`);
    }
  }

  /**
   * Start the test server
   */
  private async startTestServer(): Promise<void> {
    console.log(`🚀 Starting VibeFunder test server on port ${this.config.testPort}...`);

    return new Promise((resolve, reject) => {
      const env = {
        ...process.env,
        LOCAL_API: 'true',
        PORT: this.config.testPort.toString(),
        NEXTAUTH_URL: `http://localhost:${this.config.testPort}`,
        NODE_ENV: 'test' as const
      };

      this.serverProcess = spawn('npm', ['run', 'dev', '--', '--port', this.config.testPort.toString()], {
        env,
        cwd: process.cwd(),
        stdio: ['pipe', 'pipe', 'pipe'],
        detached: false
      });

      let hasStarted = false;
      const timeout = setTimeout(() => {
        if (!hasStarted) {
          reject(new Error(`VibeFunder server failed to start within ${this.config.maxServerStartupTime}ms`));
        }
      }, this.config.maxServerStartupTime);

      this.serverProcess.stdout?.on('data', (data) => {
        const output = data.toString();
        console.log(`[SERVER] ${output.trim()}`);
        
        // Check for server ready indicators
        if ((output.includes('Ready') || output.includes('ready')) && !hasStarted) {
          hasStarted = true;
          clearTimeout(timeout);
          console.log(`✅ VibeFunder test server ready on http://localhost:${this.config.testPort}`);
          resolve();
        }
      });

      this.serverProcess.stderr?.on('data', (data) => {
        const output = data.toString();
        console.error(`[SERVER ERROR] ${output.trim()}`);
        
        // Check for port in use error
        if (output.includes('EADDRINUSE') || output.includes('address already in use')) {
          if (!hasStarted) {
            clearTimeout(timeout);
            reject(new Error(`Port ${this.config.testPort} is already in use`));
          }
        }
      });

      this.serverProcess.on('close', (code) => {
        console.log(`[SERVER] Process exited with code ${code}`);
        if (!hasStarted && code !== 0) {
          clearTimeout(timeout);
          reject(new Error(`Server process exited with code ${code}`));
        }
      });

      this.serverProcess.on('error', (error) => {
        console.error(`[SERVER] Failed to start:`, error);
        if (!hasStarted) {
          clearTimeout(timeout);
          reject(error);
        }
      });
    });
  }

  /**
   * Wait for server to be responsive
   */
  private async waitForServerReady(): Promise<void> {
    const maxAttempts = 15; // 30 seconds total
    console.log('⏳ Waiting for VibeFunder server to be responsive...');
    
    for (let i = 0; i < maxAttempts; i++) {
      try {
        // Try a simple health check endpoint
        const response = await fetch(`http://localhost:${this.config.testPort}/api/auth/session`, {
          signal: AbortSignal.timeout(5000)
        });
        
        if (response.status === 200 || response.status === 401) {
          console.log('✅ VibeFunder server is responsive and ready for testing');
          return;
        }
      } catch {
        // Server not ready yet
      }
      
      if (i < maxAttempts - 1) {
        console.log(`⏳ Attempt ${i + 1}/${maxAttempts} - waiting ${this.config.serverReadyTimeout}ms...`);
        await new Promise(resolve => setTimeout(resolve, this.config.serverReadyTimeout));
      }
    }
    
    throw new Error('VibeFunder server failed to become responsive');
  }

  /**
   * Run Jest with the provided arguments
   */
  private async runJestTests(jestArgs: string[]): Promise<number> {
    console.log('\n🧪 Starting VibeFunder Jest test execution...');
    console.log(`📋 Jest args: ${jestArgs.join(' ')}`);
    
    return new Promise((resolve) => {
      const jestProcess = spawn('npx', ['jest', ...jestArgs], {
        cwd: process.cwd(),
        stdio: 'inherit', // Pass through all output
        env: {
          ...process.env,
          NODE_ENV: 'test',
          LOCAL_API: 'true',
          API_TEST_URL: `http://localhost:${this.config.testPort}`,
          TEST_PORT: this.config.testPort.toString()
        }
      });

      jestProcess.on('close', (code) => {
        console.log(`\n📊 VibeFunder Jest completed with exit code: ${code || 0}`);
        resolve(code || 0);
      });

      jestProcess.on('error', (error) => {
        console.error('\n❌ Jest execution failed:', error);
        resolve(1);
      });
    });
  }

  /**
   * Cleanup resources
   */
  private async cleanup(): Promise<void> {
    if (this.isShuttingDown) {
      return; // Prevent multiple cleanup calls
    }

    if (this.serverProcess && !this.serverProcess.killed) {
      console.log('\n🧹 Cleaning up VibeFunder test server...');
      
      try {
        // Try graceful shutdown first
        this.serverProcess.kill('SIGTERM');
        
        // Wait for graceful shutdown
        await new Promise(resolve => setTimeout(resolve, this.config.cleanupGracePeriod));
        
        // Force kill if still running
        if (!this.serverProcess.killed) {
          console.log('🔪 Force killing VibeFunder test server...');
          this.serverProcess.kill('SIGKILL');
        }
        
        console.log('✅ VibeFunder test server cleanup complete');
      } catch (error) {
        console.error('⚠️  Error during cleanup:', error);
      }
    }
  }

  /**
   * Graceful shutdown handler
   */
  private async gracefulShutdown(signal: string): Promise<void> {
    if (this.isShuttingDown) {
      console.log(`\n⚠️  Force ${signal} received, exiting immediately...`);
      process.exit(1);
    }
    
    console.log(`\n🛑 ${signal} received, shutting down gracefully...`);
    this.isShuttingDown = true;
    
    await this.cleanup();
    process.exit(0);
  }

  /**
   * Main test execution flow
   */
  async runTests(jestArgs: string[]): Promise<number> {
    try {
      console.log('🧪 VibeFunder Universal Test Runner');
      console.log('===================================');
      console.log(`📍 Test Port: ${this.config.testPort}`);
      console.log(`📁 Working Directory: ${process.cwd()}`);
      console.log('===================================\n');

      // Step 1: Kill existing servers
      await this.killExistingServer();

      // Step 2: Start test server
      await this.startTestServer();

      // Step 3: Wait for server to be ready
      await this.waitForServerReady();

      // Step 4: Run Jest tests
      const exitCode = await this.runJestTests(jestArgs);

      // Step 5: Cleanup (automatic)
      await this.cleanup();

      return exitCode;

    } catch (error) {
      console.error('\n❌ VibeFunder test runner failed:', error);
      await this.cleanup();
      return 1;
    }
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
🧪 VibeFunder Universal Test Runner

Usage: npm run test [jest-args...]

Examples:
  npm run test                                          # Run all tests
  npm run test __tests__/ai/                        # Run AI tests
  npm run test __tests__/integration/               # Run integration tests  
  npm run test --testNamePattern="AI Image"             # Run tests matching pattern
  npm run test __tests__/specific.test.ts --verbose           # Run specific test with verbose output
  npm run test --coverage                               # Run with coverage
  npm run test --watch                                  # Run in watch mode

Environment:
  TEST_PORT: Read from .env.local (default: 3101)
  
The runner automatically:
1. Reads TEST_PORT from .env.local
2. Kills any existing servers on TEST_PORT
3. Starts LOCAL_API=true next dev --port TEST_PORT
4. Runs Jest with your arguments
5. Cleans up when done
    `);
    process.exit(0);
  }

  const runner = new UniversalTestRunner();
  const exitCode = await runner.runTests(args);
  process.exit(exitCode);
}

if (require.main === module) {
  main().catch((error) => {
    console.error('❌ VibeFunder universal test runner crashed:', error);
    process.exit(1);
  });
}

export { UniversalTestRunner };