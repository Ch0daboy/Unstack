#!/usr/bin/env node

/**
 * PR Monitor Daemon
 * Continuously monitors for new pull requests and triggers automated workflows
 */

const cron = require('node-cron');
const chalk = require('chalk');
const PRMonitor = require('./pr-monitor');
const fs = require('fs');
const path = require('path');

class MonitorDaemon {
  constructor() {
    this.monitor = new PRMonitor();
    this.logFile = path.join(__dirname, 'daemon.log');
    this.isRunning = false;
    this.config = this.loadConfig();
  }

  loadConfig() {
    const configPath = path.join(__dirname, 'monitor-config.json');
    const defaultConfig = {
      checkInterval: '*/5 * * * *', // Every 5 minutes
      enableAutoRefactoring: true,
      enableAutoTesting: true,
      maxConcurrentPRs: 3,
      notifications: {
        slack: false,
        email: false,
        discord: false
      }
    };

    try {
      if (fs.existsSync(configPath)) {
        const userConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        return { ...defaultConfig, ...userConfig };
      }
    } catch (error) {
      this.log(`Error loading config: ${error.message}`, 'error');
    }

    // Save default config
    fs.writeFileSync(configPath, JSON.stringify(defaultConfig, null, 2));
    return defaultConfig;
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

  async start() {
    if (this.isRunning) {
      this.log('Monitor daemon is already running', 'warning');
      return;
    }

    this.isRunning = true;
    this.log('🚀 Starting PR Monitor Daemon', 'success');
    this.log(`📅 Check interval: ${this.config.checkInterval}`, 'info');
    this.log(`🔧 Auto-refactoring: ${this.config.enableAutoRefactoring ? 'enabled' : 'disabled'}`, 'info');
    this.log(`🧪 Auto-testing: ${this.config.enableAutoTesting ? 'enabled' : 'disabled'}`, 'info');

    // Schedule the monitoring task
    const task = cron.schedule(this.config.checkInterval, async () => {
      try {
        this.log('🔍 Running scheduled PR check...', 'info');
        await this.monitor.start();
        this.log('✅ Scheduled PR check completed', 'success');
      } catch (error) {
        this.log(`❌ Scheduled PR check failed: ${error.message}`, 'error');
      }
    }, {
      scheduled: false
    });

    // Start the scheduled task
    task.start();

    // Handle graceful shutdown
    process.on('SIGINT', () => {
      this.log('🛑 Received SIGINT, shutting down gracefully...', 'warning');
      task.stop();
      this.isRunning = false;
      process.exit(0);
    });

    process.on('SIGTERM', () => {
      this.log('🛑 Received SIGTERM, shutting down gracefully...', 'warning');
      task.stop();
      this.isRunning = false;
      process.exit(0);
    });

    // Run initial check
    try {
      this.log('🔍 Running initial PR check...', 'info');
      await this.monitor.start();
      this.log('✅ Initial PR check completed', 'success');
    } catch (error) {
      this.log(`❌ Initial PR check failed: ${error.message}`, 'error');
    }

    this.log('✨ PR Monitor Daemon is now running', 'success');
    this.log('Press Ctrl+C to stop', 'info');

    // Keep the process alive
    setInterval(() => {
      // Health check
      if (!this.isRunning) {
        process.exit(0);
      }
    }, 30000); // Check every 30 seconds
  }

  async stop() {
    this.log('🛑 Stopping PR Monitor Daemon...', 'warning');
    this.isRunning = false;
  }

  async status() {
    const statusInfo = {
      running: this.isRunning,
      config: this.config,
      lastCheck: this.getLastCheckTime(),
      logFile: this.logFile
    };

    console.log(chalk.cyan('📊 PR Monitor Daemon Status:'));
    console.log(chalk.white('─'.repeat(40)));
    console.log(`Status: ${statusInfo.running ? chalk.green('Running') : chalk.red('Stopped')}`);
    console.log(`Check Interval: ${chalk.yellow(this.config.checkInterval)}`);
    console.log(`Auto-refactoring: ${this.config.enableAutoRefactoring ? chalk.green('Enabled') : chalk.red('Disabled')}`);
    console.log(`Auto-testing: ${this.config.enableAutoTesting ? chalk.green('Enabled') : chalk.red('Disabled')}`);
    console.log(`Last Check: ${statusInfo.lastCheck || chalk.gray('Never')}`);
    console.log(`Log File: ${chalk.blue(statusInfo.logFile)}`);

    return statusInfo;
  }

  getLastCheckTime() {
    const lastCheckFile = path.join(__dirname, '.last-pr-check');
    try {
      if (fs.existsSync(lastCheckFile)) {
        const timestamp = fs.readFileSync(lastCheckFile, 'utf8').trim();
        return new Date(timestamp).toLocaleString();
      }
    } catch (error) {
      return null;
    }
    return null;
  }

  async updateConfig(newConfig) {
    const configPath = path.join(__dirname, 'monitor-config.json');
    const updatedConfig = { ...this.config, ...newConfig };
    
    try {
      fs.writeFileSync(configPath, JSON.stringify(updatedConfig, null, 2));
      this.config = updatedConfig;
      this.log('📝 Configuration updated successfully', 'success');
      return true;
    } catch (error) {
      this.log(`❌ Failed to update configuration: ${error.message}`, 'error');
      return false;
    }
  }

  async showLogs(lines = 50) {
    try {
      const logContent = fs.readFileSync(this.logFile, 'utf8');
      const logLines = logContent.split('\n').filter(line => line.trim());
      const recentLines = logLines.slice(-lines);
      
      console.log(chalk.cyan(`📋 Last ${recentLines.length} log entries:`));
      console.log(chalk.white('─'.repeat(80)));
      
      recentLines.forEach(line => {
        if (line.includes('[ERROR]')) {
          console.log(chalk.red(line));
        } else if (line.includes('[WARNING]')) {
          console.log(chalk.yellow(line));
        } else if (line.includes('[SUCCESS]')) {
          console.log(chalk.green(line));
        } else {
          console.log(line);
        }
      });
    } catch (error) {
      this.log(`❌ Failed to read logs: ${error.message}`, 'error');
    }
  }
}

// CLI interface
if (require.main === module) {
  const daemon = new MonitorDaemon();
  const command = process.argv[2];

  switch (command) {
    case 'start':
      daemon.start().catch(error => {
        console.error(chalk.red('Failed to start daemon:'), error);
        process.exit(1);
      });
      break;

    case 'status':
      daemon.status().catch(error => {
        console.error(chalk.red('Failed to get status:'), error);
        process.exit(1);
      });
      break;

    case 'logs':
      const lines = parseInt(process.argv[3]) || 50;
      daemon.showLogs(lines).catch(error => {
        console.error(chalk.red('Failed to show logs:'), error);
        process.exit(1);
      });
      break;

    case 'config':
      const configAction = process.argv[3];
      if (configAction === 'show') {
        console.log(chalk.cyan('Current Configuration:'));
        console.log(JSON.stringify(daemon.config, null, 2));
      } else {
        console.log(chalk.yellow('Usage: node monitor-daemon.js config show'));
      }
      break;

    default:
      console.log(chalk.cyan('🤖 Unstack PR Monitor Daemon'));
      console.log(chalk.white('─'.repeat(40)));
      console.log('Usage:');
      console.log('  node monitor-daemon.js start     - Start the daemon');
      console.log('  node monitor-daemon.js status    - Show daemon status');
      console.log('  node monitor-daemon.js logs [n]  - Show last n log entries');
      console.log('  node monitor-daemon.js config show - Show current configuration');
      console.log('');
      console.log('Examples:');
      console.log('  node monitor-daemon.js start');
      console.log('  node monitor-daemon.js logs 100');
      break;
  }
}

module.exports = MonitorDaemon;
