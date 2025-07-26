#!/usr/bin/env node

/**
 * Setup Script for PR Monitor System
 * Configures the monitoring system and validates environment
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const inquirer = require('inquirer');
const chalk = require('chalk');

class SetupManager {
  constructor() {
    this.configPath = path.join(__dirname, 'monitor-config.json');
    this.envPath = path.join(__dirname, '.env');
  }

  log(message, level = 'info') {
    const colors = {
      info: chalk.blue,
      success: chalk.green,
      warning: chalk.yellow,
      error: chalk.red
    };
    
    const coloredMessage = colors[level] ? colors[level](message) : message;
    console.log(coloredMessage);
  }

  async checkPrerequisites() {
    this.log('🔍 Checking prerequisites...', 'info');
    
    const checks = [
      { name: 'Node.js', command: 'node --version' },
      { name: 'npm', command: 'npm --version' },
      { name: 'git', command: 'git --version' }
    ];

    for (const check of checks) {
      try {
        const version = execSync(check.command, { encoding: 'utf8' }).trim();
        this.log(`✅ ${check.name}: ${version}`, 'success');
      } catch (error) {
        this.log(`❌ ${check.name}: Not found`, 'error');
        throw new Error(`${check.name} is required but not installed`);
      }
    }
  }

  async setupEnvironment() {
    this.log('🔧 Setting up environment...', 'info');

    const questions = [
      {
        type: 'input',
        name: 'githubToken',
        message: 'Enter your GitHub Personal Access Token:',
        validate: (input) => {
          if (!input || input.length < 10) {
            return 'Please enter a valid GitHub token';
          }
          return true;
        }
      },
      {
        type: 'list',
        name: 'checkInterval',
        message: 'How often should we check for new PRs?',
        choices: [
          { name: 'Every 5 minutes', value: '*/5 * * * *' },
          { name: 'Every 15 minutes', value: '*/15 * * * *' },
          { name: 'Every 30 minutes', value: '*/30 * * * *' },
          { name: 'Every hour', value: '0 * * * *' },
          { name: 'Custom cron expression', value: 'custom' }
        ]
      },
      {
        type: 'input',
        name: 'customInterval',
        message: 'Enter custom cron expression:',
        when: (answers) => answers.checkInterval === 'custom',
        validate: (input) => {
          // Basic cron validation
          const parts = input.split(' ');
          if (parts.length !== 5) {
            return 'Cron expression must have 5 parts (minute hour day month weekday)';
          }
          return true;
        }
      },
      {
        type: 'confirm',
        name: 'enableAutoRefactoring',
        message: 'Enable automatic refactoring suggestions?',
        default: true
      },
      {
        type: 'confirm',
        name: 'enableAutoTesting',
        message: 'Enable automatic testing of PRs?',
        default: true
      },
      {
        type: 'number',
        name: 'maxConcurrentPRs',
        message: 'Maximum number of PRs to process concurrently:',
        default: 3,
        validate: (input) => {
          if (input < 1 || input > 10) {
            return 'Please enter a number between 1 and 10';
          }
          return true;
        }
      }
    ];

    const answers = await inquirer.prompt(questions);

    // Save environment variables
    const envContent = `GITHUB_TOKEN=${answers.githubToken}\n`;
    fs.writeFileSync(this.envPath, envContent);
    this.log('✅ Environment variables saved', 'success');

    // Save configuration
    const config = {
      checkInterval: answers.customInterval || answers.checkInterval,
      enableAutoRefactoring: answers.enableAutoRefactoring,
      enableAutoTesting: answers.enableAutoTesting,
      maxConcurrentPRs: answers.maxConcurrentPRs,
      notifications: {
        slack: false,
        email: false,
        discord: false
      }
    };

    fs.writeFileSync(this.configPath, JSON.stringify(config, null, 2));
    this.log('✅ Configuration saved', 'success');

    return config;
  }

  async validateGitHubAccess() {
    this.log('🔐 Validating GitHub access...', 'info');

    try {
      // Load environment
      require('dotenv').config({ path: this.envPath });
      
      const { Octokit } = require('@octokit/rest');
      const octokit = new Octokit({
        auth: process.env.GITHUB_TOKEN
      });

      // Test API access
      const { data: user } = await octokit.users.getAuthenticated();
      this.log(`✅ GitHub access validated for user: ${user.login}`, 'success');

      // Test repository access
      const { data: repo } = await octokit.repos.get({
        owner: 'Ch0daboy',
        repo: 'Unstack'
      });
      this.log(`✅ Repository access validated: ${repo.full_name}`, 'success');

      return true;
    } catch (error) {
      this.log(`❌ GitHub access validation failed: ${error.message}`, 'error');
      return false;
    }
  }

  async setupGitHooks() {
    this.log('🪝 Setting up Git hooks...', 'info');

    const hooksDir = path.join(process.cwd(), '.git', 'hooks');
    
    if (!fs.existsSync(hooksDir)) {
      this.log('❌ Git hooks directory not found. Make sure you\'re in a Git repository.', 'error');
      return false;
    }

    // Pre-commit hook
    const preCommitHook = `#!/bin/sh
# Unstack PR Monitor - Pre-commit hook
echo "Running pre-commit checks..."

# Run linting
npm run lint
if [ $? -ne 0 ]; then
  echo "❌ Linting failed. Please fix the issues before committing."
  exit 1
fi

# Run type checking
npx tsc --noEmit
if [ $? -ne 0 ]; then
  echo "❌ Type checking failed. Please fix the issues before committing."
  exit 1
fi

echo "✅ Pre-commit checks passed!"
`;

    const preCommitPath = path.join(hooksDir, 'pre-commit');
    fs.writeFileSync(preCommitPath, preCommitHook);
    fs.chmodSync(preCommitPath, '755');
    this.log('✅ Pre-commit hook installed', 'success');

    return true;
  }

  async createSystemdService() {
    const questions = [
      {
        type: 'confirm',
        name: 'createService',
        message: 'Create systemd service for automatic startup? (Linux only)',
        default: false
      }
    ];

    const answers = await inquirer.prompt(questions);

    if (!answers.createService) {
      return;
    }

    const serviceContent = `[Unit]
Description=Unstack PR Monitor Daemon
After=network.target

[Service]
Type=simple
User=${process.env.USER}
WorkingDirectory=${process.cwd()}
ExecStart=${process.execPath} ${path.join(__dirname, 'monitor-daemon.js')} start
Restart=always
RestartSec=10
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
`;

    const servicePath = '/tmp/unstack-pr-monitor.service';
    fs.writeFileSync(servicePath, serviceContent);

    this.log(`📝 Systemd service file created at: ${servicePath}`, 'info');
    this.log('To install the service, run:', 'info');
    this.log(`  sudo cp ${servicePath} /etc/systemd/system/`, 'warning');
    this.log('  sudo systemctl daemon-reload', 'warning');
    this.log('  sudo systemctl enable unstack-pr-monitor', 'warning');
    this.log('  sudo systemctl start unstack-pr-monitor', 'warning');
  }

  async runTests() {
    this.log('🧪 Running initial tests...', 'info');

    try {
      // Test the monitoring system
      const PRMonitor = require('./pr-monitor');
      const monitor = new PRMonitor();
      
      this.log('✅ PR Monitor module loaded successfully', 'success');

      // Test refactoring analyzer
      const RefactorAnalyzer = require('./refactor-analyzer');
      this.log('✅ Refactor Analyzer module loaded successfully', 'success');

      // Test daemon
      const MonitorDaemon = require('./monitor-daemon');
      this.log('✅ Monitor Daemon module loaded successfully', 'success');

      return true;
    } catch (error) {
      this.log(`❌ Module test failed: ${error.message}`, 'error');
      return false;
    }
  }

  async run() {
    try {
      this.log('🚀 Starting Unstack PR Monitor Setup', 'info');
      this.log('═'.repeat(50), 'info');

      // Check prerequisites
      await this.checkPrerequisites();

      // Setup environment and configuration
      const config = await this.setupEnvironment();

      // Validate GitHub access
      const githubValid = await this.validateGitHubAccess();
      if (!githubValid) {
        throw new Error('GitHub access validation failed');
      }

      // Setup Git hooks
      await this.setupGitHooks();

      // Run tests
      const testsPass = await this.runTests();
      if (!testsPass) {
        throw new Error('Initial tests failed');
      }

      // Optional systemd service
      await this.createSystemdService();

      this.log('═'.repeat(50), 'success');
      this.log('🎉 Setup completed successfully!', 'success');
      this.log('', 'info');
      this.log('Next steps:', 'info');
      this.log('1. Start the monitor daemon:', 'info');
      this.log('   node monitor-daemon.js start', 'warning');
      this.log('', 'info');
      this.log('2. Check daemon status:', 'info');
      this.log('   node monitor-daemon.js status', 'warning');
      this.log('', 'info');
      this.log('3. View logs:', 'info');
      this.log('   node monitor-daemon.js logs', 'warning');

    } catch (error) {
      this.log(`❌ Setup failed: ${error.message}`, 'error');
      process.exit(1);
    }
  }
}

// Run setup if called directly
if (require.main === module) {
  const setup = new SetupManager();
  setup.run();
}

module.exports = SetupManager;
