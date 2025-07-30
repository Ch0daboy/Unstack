#!/usr/bin/env node

/**
 * Comprehensive Test Runner for PR Changes
 * Runs various tests and quality checks on code changes
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const chalk = require('chalk');

class TestRunner {
  constructor(prNumber = null) {
    this.prNumber = prNumber;
    this.logFile = path.join(__dirname, 'test-results.log');
    this.projectRoot = path.resolve(__dirname, '..');
    this.results = {
      passed: 0,
      failed: 0,
      skipped: 0,
      tests: []
    };
  }

  log(message, level = 'info') {
    const timestamp = new Date().toISOString();
    const colors = {
      info: chalk.blue,
      success: chalk.green,
      warning: chalk.yellow,
      error: chalk.red
    };
    
    const coloredMessage = colors[level] ? colors[level](message) : message;
    const logMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}\n`;
    
    console.log(`[${timestamp}] ${coloredMessage}`);
    fs.appendFileSync(this.logFile, logMessage);
  }

  async runTest(testName, testFunction, critical = false) {
    this.log(`🧪 Running ${testName}...`, 'info');
    
    const startTime = Date.now();
    let result = {
      name: testName,
      status: 'unknown',
      duration: 0,
      error: null,
      critical: critical
    };

    try {
      await testFunction();
      result.status = 'passed';
      result.duration = Date.now() - startTime;
      this.results.passed++;
      this.log(`✅ ${testName} passed (${result.duration}ms)`, 'success');
    } catch (error) {
      result.status = 'failed';
      result.duration = Date.now() - startTime;
      result.error = error.message;
      this.results.failed++;
      this.log(`❌ ${testName} failed: ${error.message}`, 'error');
      
      if (critical) {
        throw new Error(`Critical test failed: ${testName}`);
      }
    }

    this.results.tests.push(result);
    return result;
  }

  async testBuild() {
    return new Promise((resolve, reject) => {
      try {
        execSync('npm run build', { stdio: 'pipe', cwd: this.projectRoot });
        resolve();
      } catch (error) {
        reject(new Error(`Build failed: ${error.message}`));
      }
    });
  }

  async testLinting() {
    return new Promise((resolve, reject) => {
      try {
        execSync('npm run lint', { stdio: 'pipe', cwd: this.projectRoot });
        resolve();
      } catch (error) {
        // Check if it's just warnings
        const output = error.stdout ? error.stdout.toString() : '';
        if (output.includes('warning') && !output.includes('error')) {
          this.log('Linting completed with warnings', 'warning');
          resolve();
        } else {
          reject(new Error(`Linting failed: ${error.message}`));
        }
      }
    });
  }

  async testTypeScript() {
    return new Promise((resolve, reject) => {
      try {
        execSync('npx tsc --noEmit', { stdio: 'pipe', cwd: this.projectRoot });
        resolve();
      } catch (error) {
        reject(new Error(`TypeScript compilation failed: ${error.message}`));
      }
    });
  }

  async testDependencies() {
    return new Promise((resolve, reject) => {
      try {
        // Check for security vulnerabilities
        const auditResult = execSync('npm audit --audit-level=high', { stdio: 'pipe', cwd: this.projectRoot });

        // Check for outdated dependencies
        const outdatedResult = execSync('npm outdated', { stdio: 'pipe', cwd: this.projectRoot });

        if (outdatedResult.toString().trim()) {
          this.log('Some dependencies are outdated', 'warning');
        }

        resolve();
      } catch (error) {
        if (error.status === 1) {
          // npm audit found vulnerabilities
          reject(new Error('Security vulnerabilities found in dependencies'));
        } else {
          reject(new Error(`Dependency check failed: ${error.message}`));
        }
      }
    });
  }

  async testCodeQuality() {
    return new Promise((resolve, reject) => {
      try {
        const srcDir = path.join(this.projectRoot, 'src');
        if (!fs.existsSync(srcDir)) {
          resolve(); // No src directory to check
          return;
        }

        // Check for common code quality issues
        const issues = [];
        
        // Check file sizes
        const checkFileSize = (dir) => {
          const files = fs.readdirSync(dir);
          for (const file of files) {
            const filePath = path.join(dir, file);
            const stat = fs.statSync(filePath);
            
            if (stat.isDirectory()) {
              checkFileSize(filePath);
            } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
              const content = fs.readFileSync(filePath, 'utf8');
              const lines = content.split('\n').length;
              
              if (lines > 500) {
                issues.push(`Large file: ${filePath} (${lines} lines)`);
              }
            }
          }
        };

        checkFileSize(srcDir);

        if (issues.length > 0) {
          this.log(`Code quality issues found: ${issues.length}`, 'warning');
          issues.forEach(issue => this.log(`  - ${issue}`, 'warning'));
        }

        resolve();
      } catch (error) {
        reject(new Error(`Code quality check failed: ${error.message}`));
      }
    });
  }

  async testPerformance() {
    return new Promise((resolve, reject) => {
      try {
        // Build and analyze bundle size
        execSync('npm run build', { stdio: 'pipe', cwd: this.projectRoot });

        const distDir = path.join(this.projectRoot, 'dist');
        if (!fs.existsSync(distDir)) {
          resolve(); // No dist directory
          return;
        }

        let totalSize = 0;
        const checkSize = (dir) => {
          const files = fs.readdirSync(dir);
          for (const file of files) {
            const filePath = path.join(dir, file);
            const stat = fs.statSync(filePath);
            
            if (stat.isDirectory()) {
              checkSize(filePath);
            } else {
              totalSize += stat.size;
            }
          }
        };

        checkSize(distDir);
        const totalSizeMB = (totalSize / 1024 / 1024).toFixed(2);
        
        this.log(`Bundle size: ${totalSizeMB} MB`, 'info');
        
        if (totalSize > 10 * 1024 * 1024) { // 10MB
          this.log('Bundle size is quite large, consider optimization', 'warning');
        }

        resolve();
      } catch (error) {
        reject(new Error(`Performance test failed: ${error.message}`));
      }
    });
  }

  async testSecurity() {
    return new Promise((resolve, reject) => {
      try {
        // Check for common security issues
        const issues = [];
        
        // Check for hardcoded secrets
        const checkSecrets = (dir) => {
          const files = fs.readdirSync(dir);
          for (const file of files) {
            const filePath = path.join(dir, file);
            const stat = fs.statSync(filePath);
            
            if (stat.isDirectory() && !file.includes('node_modules')) {
              checkSecrets(filePath);
            } else if (file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.js')) {
              const content = fs.readFileSync(filePath, 'utf8');
              
              // Check for potential secrets
              const secretPatterns = [
                /api[_-]?key[_-]?=\s*['"][^'"]+['"]/i,
                /secret[_-]?key[_-]?=\s*['"][^'"]+['"]/i,
                /password[_-]?=\s*['"][^'"]+['"]/i,
                /token[_-]?=\s*['"][^'"]+['"]/i
              ];

              for (const pattern of secretPatterns) {
                if (pattern.test(content)) {
                  issues.push(`Potential hardcoded secret in ${filePath}`);
                }
              }
            }
          }
        };

        checkSecrets(this.projectRoot);

        if (issues.length > 0) {
          issues.forEach(issue => this.log(`  - ${issue}`, 'warning'));
        }

        resolve();
      } catch (error) {
        reject(new Error(`Security test failed: ${error.message}`));
      }
    });
  }

  async testAccessibility() {
    return new Promise((resolve, reject) => {
      try {
        // Basic accessibility checks
        const srcDir = path.join(this.projectRoot, 'src');
        if (!fs.existsSync(srcDir)) {
          resolve();
          return;
        }

        const issues = [];
        
        const checkA11y = (dir) => {
          const files = fs.readdirSync(dir);
          for (const file of files) {
            const filePath = path.join(dir, file);
            const stat = fs.statSync(filePath);
            
            if (stat.isDirectory()) {
              checkA11y(filePath);
            } else if (file.endsWith('.tsx')) {
              const content = fs.readFileSync(filePath, 'utf8');
              
              // Check for missing alt attributes
              const imgTags = content.match(/<img[^>]*>/g) || [];
              for (const img of imgTags) {
                if (!img.includes('alt=')) {
                  issues.push(`Missing alt attribute in ${filePath}`);
                }
              }
              
              // Check for missing labels
              const inputTags = content.match(/<input[^>]*>/g) || [];
              for (const input of inputTags) {
                if (!input.includes('aria-label') && !input.includes('id=')) {
                  issues.push(`Input without label in ${filePath}`);
                }
              }
            }
          }
        };

        checkA11y(srcDir);

        if (issues.length > 0) {
          this.log(`Accessibility issues found: ${issues.length}`, 'warning');
          issues.forEach(issue => this.log(`  - ${issue}`, 'warning'));
        }

        resolve();
      } catch (error) {
        reject(new Error(`Accessibility test failed: ${error.message}`));
      }
    });
  }

  async runAllTests() {
    this.log('🚀 Starting comprehensive test suite...', 'info');
    this.log('═'.repeat(60), 'info');

    const tests = [
      { name: 'Build Test', fn: () => this.testBuild(), critical: true },
      { name: 'TypeScript Check', fn: () => this.testTypeScript(), critical: true },
      { name: 'Linting', fn: () => this.testLinting(), critical: false },
      { name: 'Dependency Security', fn: () => this.testDependencies(), critical: false },
      { name: 'Code Quality', fn: () => this.testCodeQuality(), critical: false },
      { name: 'Performance', fn: () => this.testPerformance(), critical: false },
      { name: 'Security Scan', fn: () => this.testSecurity(), critical: false },
      { name: 'Accessibility', fn: () => this.testAccessibility(), critical: false }
    ];

    for (const test of tests) {
      try {
        await this.runTest(test.name, test.fn, test.critical);
      } catch (error) {
        this.log(`Critical test failure, stopping test suite: ${error.message}`, 'error');
        break;
      }
    }

    this.generateReport();
  }

  generateReport() {
    this.log('═'.repeat(60), 'info');
    this.log('📊 Test Results Summary', 'info');
    this.log('═'.repeat(60), 'info');

    const total = this.results.passed + this.results.failed + this.results.skipped;
    const passRate = total > 0 ? ((this.results.passed / total) * 100).toFixed(1) : 0;

    this.log(`Total Tests: ${total}`, 'info');
    this.log(`Passed: ${this.results.passed}`, 'success');
    this.log(`Failed: ${this.results.failed}`, this.results.failed > 0 ? 'error' : 'info');
    this.log(`Skipped: ${this.results.skipped}`, 'warning');
    this.log(`Pass Rate: ${passRate}%`, passRate >= 80 ? 'success' : 'warning');

    if (this.results.failed > 0) {
      this.log('', 'info');
      this.log('❌ Failed Tests:', 'error');
      this.results.tests
        .filter(test => test.status === 'failed')
        .forEach(test => {
          this.log(`  - ${test.name}: ${test.error}`, 'error');
        });
    }

    // Save detailed report
    const reportPath = path.join(__dirname, 'test-report.json');
    fs.writeFileSync(reportPath, JSON.stringify({
      timestamp: new Date().toISOString(),
      prNumber: this.prNumber,
      summary: {
        total,
        passed: this.results.passed,
        failed: this.results.failed,
        skipped: this.results.skipped,
        passRate: parseFloat(passRate)
      },
      tests: this.results.tests
    }, null, 2));

    this.log(`📄 Detailed report saved to: ${reportPath}`, 'info');

    return this.results.failed === 0;
  }
}

// Run if called directly
if (require.main === module) {
  const prNumber = process.argv[2] ? parseInt(process.argv[2]) : null;
  const runner = new TestRunner(prNumber);
  
  runner.runAllTests().then(() => {
    const success = runner.results.failed === 0;
    process.exit(success ? 0 : 1);
  }).catch(error => {
    console.error(chalk.red('Test runner error:'), error);
    process.exit(1);
  });
}

module.exports = TestRunner;
