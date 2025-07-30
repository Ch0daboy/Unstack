# 🤖 Unstack PR Monitor System

An automated system for monitoring pull requests, running tests, analyzing code quality, and creating refactoring suggestions.

## ✨ Features

- **🔍 Automated PR Monitoring**: Continuously monitors for new pull requests
- **🧪 Comprehensive Testing**: Runs build, lint, type-check, and quality tests
- **🔧 Code Refactoring**: Analyzes code and suggests improvements
- **📊 Quality Reports**: Generates detailed test and quality reports
- **🚀 Auto-deployment**: Creates refactoring PRs automatically
- **⚡ Real-time Notifications**: Comments on PRs with test results
- **🛡️ Security Scanning**: Checks for vulnerabilities and secrets
- **♿ Accessibility Checks**: Basic accessibility validation

## 🚀 Quick Start

### 1. Setup

```bash
cd scripts
npm install
node setup.js
```

The setup script will guide you through:
- GitHub token configuration
- Monitoring intervals
- Feature toggles
- Git hooks installation

### 2. Start Monitoring

```bash
# Start the daemon
node monitor-daemon.js start

# Check status
node monitor-daemon.js status

# View logs
node monitor-daemon.js logs
```

### 3. Manual Testing

```bash
# Test a specific PR
node test-runner.js 123

# Run refactoring analysis
node refactor-analyzer.js 123

# One-time PR check
node pr-monitor.js
```

## 📁 File Structure

```
scripts/
├── pr-monitor.js          # Core PR monitoring logic
├── monitor-daemon.js      # Daemon for continuous monitoring
├── refactor-analyzer.js   # Code quality analysis and refactoring
├── test-runner.js         # Comprehensive test suite
├── setup.js              # Initial setup and configuration
├── package.json          # Dependencies and scripts
├── README.md             # This file
├── .env                  # Environment variables (created by setup)
├── monitor-config.json   # Configuration file (created by setup)
└── logs/                 # Log files directory
```

## ⚙️ Configuration

The system uses `monitor-config.json` for configuration:

```json
{
  "checkInterval": "*/5 * * * *",
  "enableAutoRefactoring": true,
  "enableAutoTesting": true,
  "maxConcurrentPRs": 3,
  "notifications": {
    "slack": false,
    "email": false,
    "discord": false
  }
}
```

### Configuration Options

- **checkInterval**: Cron expression for monitoring frequency
- **enableAutoRefactoring**: Automatically create refactoring PRs
- **enableAutoTesting**: Run tests on new PRs
- **maxConcurrentPRs**: Maximum PRs to process simultaneously
- **notifications**: External notification settings

## 🧪 Test Suite

The test runner performs comprehensive checks:

### Critical Tests (Must Pass)
- ✅ **Build Test**: Ensures code compiles successfully
- ✅ **TypeScript Check**: Validates type safety

### Quality Tests (Warnings Only)
- 🔍 **Linting**: Code style and best practices
- 🛡️ **Security Scan**: Vulnerability and secret detection
- 📊 **Code Quality**: File size, complexity analysis
- ⚡ **Performance**: Bundle size optimization
- ♿ **Accessibility**: Basic a11y compliance
- 📦 **Dependencies**: Security audit and updates

## 🔧 Refactoring Analysis

The refactoring analyzer checks for:

- **Long Functions**: Functions over 50 lines
- **Duplicate Code**: Repeated code blocks
- **Complex Components**: React components with too many hooks/lines
- **Missing Types**: Usage of `any` types
- **Unused Imports**: Dead code elimination
- **Consistency Issues**: Quote styles, semicolons, indentation

## 📊 Monitoring Dashboard

### View Status
```bash
node monitor-daemon.js status
```

### View Recent Logs
```bash
node monitor-daemon.js logs 100
```

### Configuration Management
```bash
node monitor-daemon.js config show
```

## 🔔 Notifications

The system can comment on PRs with:
- ✅ Test results and status
- 📊 Code quality metrics
- 🔧 Refactoring suggestions
- ❌ Build failures and errors

## 🐳 Deployment Options

### Local Development
```bash
node monitor-daemon.js start
```

### Systemd Service (Linux)
The setup script can create a systemd service for automatic startup:

```bash
sudo systemctl enable unstack-pr-monitor
sudo systemctl start unstack-pr-monitor
```

### Docker Container
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY scripts/ .
RUN npm install
CMD ["node", "monitor-daemon.js", "start"]
```

### GitHub Actions
```yaml
name: PR Monitor
on:
  schedule:
    - cron: '*/5 * * * *'
  workflow_dispatch:

jobs:
  monitor:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: cd scripts && npm install
      - run: cd scripts && node pr-monitor.js
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

## 🛠️ Development

### Adding New Tests
```javascript
// In test-runner.js
async testCustomCheck() {
  return new Promise((resolve, reject) => {
    // Your test logic here
    if (testPassed) {
      resolve();
    } else {
      reject(new Error('Test failed'));
    }
  });
}
```

### Adding Refactoring Rules
```javascript
// In refactor-analyzer.js
async checkCustomRule() {
  // Analyze code and add suggestions
  this.suggestions.push({
    type: 'improvement',
    file: 'path/to/file.ts',
    message: 'Custom improvement suggestion',
    severity: 'medium',
    suggestion: 'How to fix this issue'
  });
}
```

## 🔍 Troubleshooting

### Common Issues

**GitHub API Rate Limits**
- Use a personal access token with appropriate permissions
- Consider reducing check frequency

**Build Failures**
- Ensure all dependencies are installed
- Check Node.js version compatibility

**Permission Errors**
- Verify GitHub token has repository access
- Check file system permissions

### Debug Mode
```bash
DEBUG=1 node monitor-daemon.js start
```

### Log Analysis
```bash
# View error logs only
grep ERROR scripts/daemon.log

# Monitor logs in real-time
tail -f scripts/daemon.log
```

## 📈 Metrics and Analytics

The system tracks:
- PR processing time
- Test success rates
- Code quality trends
- Refactoring acceptance rates

Reports are saved in JSON format for further analysis.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Submit a pull request

The monitoring system will automatically test your changes!

## 📄 License

This monitoring system is part of the Unstack project and follows the same license terms.

---

*Happy monitoring! 🚀*
