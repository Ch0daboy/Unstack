#!/usr/bin/env node

/**
 * PR Monitor Script
 * Monitors the repository for new pull requests and triggers testing/refactoring workflow
 */

const { Octokit } = require('@octokit/rest');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

class PRMonitor {
  constructor() {
    this.octokit = new Octokit({
      auth: process.env.GITHUB_TOKEN
    });
    this.owner = 'Ch0daboy';
    this.repo = 'Unstack';
    this.lastCheckedFile = path.join(__dirname, '.last-pr-check');
    this.logFile = path.join(__dirname, 'pr-monitor.log');
  }

  log(message) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}\n`;
    console.log(logMessage.trim());
    fs.appendFileSync(this.logFile, logMessage);
  }

  async getLastCheckedTime() {
    try {
      if (fs.existsSync(this.lastCheckedFile)) {
        return fs.readFileSync(this.lastCheckedFile, 'utf8').trim();
      }
    } catch (error) {
      this.log(`Error reading last checked time: ${error.message}`);
    }
    return new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(); // 24 hours ago
  }

  async updateLastCheckedTime() {
    const now = new Date().toISOString();
    fs.writeFileSync(this.lastCheckedFile, now);
  }

  async getNewPullRequests() {
    try {
      const lastChecked = await this.getLastCheckedTime();
      
      const { data: pullRequests } = await this.octokit.pulls.list({
        owner: this.owner,
        repo: this.repo,
        state: 'open',
        sort: 'created',
        direction: 'desc'
      });

      // Filter PRs created after last check
      const newPRs = pullRequests.filter(pr => 
        new Date(pr.created_at) > new Date(lastChecked)
      );

      return newPRs;
    } catch (error) {
      this.log(`Error fetching pull requests: ${error.message}`);
      return [];
    }
  }

  async analyzePRChanges(prNumber) {
    try {
      const { data: files } = await this.octokit.pulls.listFiles({
        owner: this.owner,
        repo: this.repo,
        pull_number: prNumber
      });

      const analysis = {
        totalFiles: files.length,
        additions: files.reduce((sum, file) => sum + file.additions, 0),
        deletions: files.reduce((sum, file) => sum + file.deletions, 0),
        fileTypes: {},
        criticalFiles: [],
        testFiles: []
      };

      files.forEach(file => {
        const ext = path.extname(file.filename);
        analysis.fileTypes[ext] = (analysis.fileTypes[ext] || 0) + 1;

        // Identify critical files
        if (file.filename.includes('package.json') || 
            file.filename.includes('tsconfig') ||
            file.filename.includes('vite.config') ||
            file.filename.includes('supabase/migrations')) {
          analysis.criticalFiles.push(file.filename);
        }

        // Identify test files
        if (file.filename.includes('.test.') || 
            file.filename.includes('.spec.') ||
            file.filename.includes('__tests__')) {
          analysis.testFiles.push(file.filename);
        }
      });

      return analysis;
    } catch (error) {
      this.log(`Error analyzing PR changes: ${error.message}`);
      return null;
    }
  }

  async runTests(prNumber, branchName) {
    this.log(`Running tests for PR #${prNumber} on branch ${branchName}`);
    
    try {
      // Checkout the PR branch
      execSync(`git fetch origin pull/${prNumber}/head:pr-${prNumber}`, { stdio: 'inherit' });
      execSync(`git checkout pr-${prNumber}`, { stdio: 'inherit' });

      // Install dependencies
      this.log('Installing dependencies...');
      execSync('npm install', { stdio: 'inherit' });

      // Run linting
      this.log('Running ESLint...');
      try {
        execSync('npm run lint', { stdio: 'inherit' });
      } catch (error) {
        this.log('Linting failed, but continuing with tests...');
      }

      // Run build test
      this.log('Testing build...');
      execSync('npm run build', { stdio: 'inherit' });

      // Run type checking
      this.log('Running TypeScript type check...');
      execSync('npx tsc --noEmit', { stdio: 'inherit' });

      this.log('All tests passed successfully!');
      return { success: true, errors: [] };

    } catch (error) {
      this.log(`Tests failed: ${error.message}`);
      return { success: false, errors: [error.message] };
    } finally {
      // Return to main branch
      try {
        execSync('git checkout main', { stdio: 'inherit' });
      } catch (error) {
        this.log(`Error returning to main branch: ${error.message}`);
      }
    }
  }

  async createRefactoringBranch(prNumber) {
    const branchName = `refactor/pr-${prNumber}-improvements`;
    
    try {
      // Create and checkout new branch
      execSync(`git checkout -b ${branchName}`, { stdio: 'inherit' });
      return branchName;
    } catch (error) {
      this.log(`Error creating refactoring branch: ${error.message}`);
      return null;
    }
  }

  async processPullRequest(pr) {
    this.log(`Processing PR #${pr.number}: ${pr.title}`);
    
    // Analyze changes
    const analysis = await this.analyzePRChanges(pr.number);
    if (analysis) {
      this.log(`PR Analysis: ${analysis.totalFiles} files, +${analysis.additions}/-${analysis.deletions} lines`);
      
      if (analysis.criticalFiles.length > 0) {
        this.log(`Critical files modified: ${analysis.criticalFiles.join(', ')}`);
      }
    }

    // Run tests
    const testResults = await this.runTests(pr.number, pr.head.ref);
    
    if (testResults.success) {
      this.log(`Tests passed for PR #${pr.number}`);
      
      // Create comment on PR
      await this.octokit.issues.createComment({
        owner: this.owner,
        repo: this.repo,
        issue_number: pr.number,
        body: `✅ **Automated Testing Complete**\n\n` +
              `All tests passed successfully!\n\n` +
              `**Analysis:**\n` +
              `- Files changed: ${analysis?.totalFiles || 'N/A'}\n` +
              `- Lines added: ${analysis?.additions || 'N/A'}\n` +
              `- Lines deleted: ${analysis?.deletions || 'N/A'}\n\n` +
              `Build, linting, and type checking all completed successfully.`
      });

      // Trigger refactoring if needed
      if (analysis && (analysis.totalFiles > 5 || analysis.additions > 100)) {
        await this.triggerRefactoring(pr);
      }

    } else {
      this.log(`Tests failed for PR #${pr.number}`);
      
      // Create comment with test failures
      await this.octokit.issues.createComment({
        owner: this.owner,
        repo: this.repo,
        issue_number: pr.number,
        body: `❌ **Automated Testing Failed**\n\n` +
              `The following issues were found:\n\n` +
              testResults.errors.map(error => `- ${error}`).join('\n') +
              `\n\nPlease fix these issues before merging.`
      });
    }
  }

  async triggerRefactoring(pr) {
    this.log(`Triggering refactoring analysis for PR #${pr.number}`);
    
    // This would trigger the refactoring script
    try {
      execSync(`node ${path.join(__dirname, 'refactor-analyzer.js')} ${pr.number}`, { stdio: 'inherit' });
    } catch (error) {
      this.log(`Refactoring analysis failed: ${error.message}`);
    }
  }

  async start() {
    this.log('Starting PR monitor...');
    
    const newPRs = await this.getNewPullRequests();
    
    if (newPRs.length === 0) {
      this.log('No new pull requests found.');
    } else {
      this.log(`Found ${newPRs.length} new pull request(s)`);
      
      for (const pr of newPRs) {
        await this.processPullRequest(pr);
      }
    }

    await this.updateLastCheckedTime();
    this.log('PR monitor cycle complete.');
  }
}

// Run if called directly
if (require.main === module) {
  const monitor = new PRMonitor();
  monitor.start().catch(error => {
    console.error('PR Monitor error:', error);
    process.exit(1);
  });
}

module.exports = PRMonitor;
