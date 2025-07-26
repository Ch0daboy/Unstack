#!/usr/bin/env node

/**
 * Demo Script for PR Monitor System
 * Demonstrates the capabilities of the monitoring system
 */

const chalk = require('chalk');
const fs = require('fs');
const path = require('path');

class Demo {
  constructor() {
    this.logFile = path.join(__dirname, 'demo.log');
  }

  log(message, level = 'info') {
    const colors = {
      info: chalk.blue,
      success: chalk.green,
      warning: chalk.yellow,
      error: chalk.red,
      title: chalk.cyan.bold
    };
    
    const coloredMessage = colors[level] ? colors[level](message) : message;
    console.log(coloredMessage);
  }

  async showSystemOverview() {
    this.log('🤖 Unstack PR Monitor System Demo', 'title');
    this.log('═'.repeat(60), 'info');
    this.log('');
    
    this.log('📋 System Components:', 'info');
    this.log('  ✅ PR Monitor - Watches for new pull requests', 'success');
    this.log('  ✅ Test Runner - Comprehensive testing suite', 'success');
    this.log('  ✅ Refactor Analyzer - Code quality analysis', 'success');
    this.log('  ✅ Monitor Daemon - Continuous monitoring', 'success');
    this.log('  ✅ Setup Script - Easy configuration', 'success');
    this.log('');
  }

  async showTestResults() {
    this.log('🧪 Latest Test Results:', 'title');
    this.log('─'.repeat(40), 'info');
    
    const reportPath = path.join(__dirname, 'test-report.json');
    if (fs.existsSync(reportPath)) {
      try {
        const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
        
        this.log(`📊 Summary:`, 'info');
        this.log(`  Total Tests: ${report.summary.total}`, 'info');
        this.log(`  Passed: ${report.summary.passed}`, 'success');
        this.log(`  Failed: ${report.summary.failed}`, report.summary.failed > 0 ? 'error' : 'info');
        this.log(`  Pass Rate: ${report.summary.passRate}%`, report.summary.passRate >= 80 ? 'success' : 'warning');
        this.log(`  Timestamp: ${new Date(report.timestamp).toLocaleString()}`, 'info');
        this.log('');
        
        if (report.tests && report.tests.length > 0) {
          this.log('📝 Test Details:', 'info');
          report.tests.forEach(test => {
            const status = test.status === 'passed' ? '✅' : '❌';
            const color = test.status === 'passed' ? 'success' : 'error';
            this.log(`  ${status} ${test.name} (${test.duration}ms)`, color);
          });
        }
      } catch (error) {
        this.log('❌ Error reading test report', 'error');
      }
    } else {
      this.log('📄 No test report found. Run tests first:', 'warning');
      this.log('  node test-runner.js', 'info');
    }
    this.log('');
  }

  async showConfiguration() {
    this.log('⚙️ Current Configuration:', 'title');
    this.log('─'.repeat(40), 'info');
    
    const configPath = path.join(__dirname, 'monitor-config.json');
    if (fs.existsSync(configPath)) {
      try {
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        
        this.log(`📅 Check Interval: ${config.checkInterval}`, 'info');
        this.log(`🔧 Auto-refactoring: ${config.enableAutoRefactoring ? 'Enabled' : 'Disabled'}`, 
          config.enableAutoRefactoring ? 'success' : 'warning');
        this.log(`🧪 Auto-testing: ${config.enableAutoTesting ? 'Enabled' : 'Disabled'}`, 
          config.enableAutoTesting ? 'success' : 'warning');
        this.log(`📊 Max Concurrent PRs: ${config.maxConcurrentPRs}`, 'info');
        
      } catch (error) {
        this.log('❌ Error reading configuration', 'error');
      }
    } else {
      this.log('📄 No configuration found. Run setup first:', 'warning');
      this.log('  node setup.js', 'info');
    }
    this.log('');
  }

  async showUsageExamples() {
    this.log('🚀 Usage Examples:', 'title');
    this.log('─'.repeat(40), 'info');
    
    this.log('1️⃣ Setup the system:', 'info');
    this.log('   node setup.js', 'warning');
    this.log('');
    
    this.log('2️⃣ Start monitoring daemon:', 'info');
    this.log('   node monitor-daemon.js start', 'warning');
    this.log('');
    
    this.log('3️⃣ Check daemon status:', 'info');
    this.log('   node monitor-daemon.js status', 'warning');
    this.log('');
    
    this.log('4️⃣ Run tests manually:', 'info');
    this.log('   node test-runner.js', 'warning');
    this.log('');
    
    this.log('5️⃣ Analyze code for refactoring:', 'info');
    this.log('   node refactor-analyzer.js [PR_NUMBER]', 'warning');
    this.log('');
    
    this.log('6️⃣ One-time PR check:', 'info');
    this.log('   node pr-monitor.js', 'warning');
    this.log('');
    
    this.log('7️⃣ View logs:', 'info');
    this.log('   node monitor-daemon.js logs 50', 'warning');
    this.log('');
  }

  async showFeatures() {
    this.log('✨ Key Features:', 'title');
    this.log('─'.repeat(40), 'info');
    
    const features = [
      '🔍 Automatic PR detection and monitoring',
      '🧪 Comprehensive test suite (build, lint, types, security)',
      '🔧 Code quality analysis and refactoring suggestions',
      '📊 Detailed reporting and metrics',
      '🤖 Automated PR comments with test results',
      '🛡️ Security vulnerability scanning',
      '♿ Accessibility compliance checking',
      '⚡ Performance and bundle size analysis',
      '🔄 Continuous monitoring with configurable intervals',
      '📈 Code quality trend tracking'
    ];
    
    features.forEach(feature => {
      this.log(`  ${feature}`, 'success');
    });
    this.log('');
  }

  async showNextSteps() {
    this.log('🎯 Next Steps:', 'title');
    this.log('─'.repeat(40), 'info');
    
    const envExists = fs.existsSync(path.join(__dirname, '.env'));
    const configExists = fs.existsSync(path.join(__dirname, 'monitor-config.json'));
    
    if (!envExists || !configExists) {
      this.log('1. Complete setup:', 'warning');
      this.log('   node setup.js', 'info');
      this.log('');
    }
    
    this.log('2. Start the monitoring system:', 'info');
    this.log('   node monitor-daemon.js start', 'warning');
    this.log('');
    
    this.log('3. Create a test PR to see the system in action', 'info');
    this.log('');
    
    this.log('4. Monitor the logs:', 'info');
    this.log('   tail -f scripts/daemon.log', 'warning');
    this.log('');
    
    this.log('5. Check system status periodically:', 'info');
    this.log('   node monitor-daemon.js status', 'warning');
    this.log('');
  }

  async run() {
    await this.showSystemOverview();
    await this.showFeatures();
    await this.showConfiguration();
    await this.showTestResults();
    await this.showUsageExamples();
    await this.showNextSteps();
    
    this.log('🎉 Demo complete! The PR monitoring system is ready to use.', 'success');
    this.log('');
    this.log('For more information, see:', 'info');
    this.log('  📖 scripts/README.md - Detailed documentation', 'info');
    this.log('  🔧 scripts/setup.js - Interactive setup', 'info');
    this.log('  📊 scripts/test-runner.js - Run comprehensive tests', 'info');
  }
}

// Run demo if called directly
if (require.main === module) {
  const demo = new Demo();
  demo.run().catch(error => {
    console.error(chalk.red('Demo error:'), error);
    process.exit(1);
  });
}

module.exports = Demo;
