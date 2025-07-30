#!/usr/bin/env node

/**
 * Code Refactoring Analyzer
 * Analyzes code changes and suggests/implements refactoring improvements
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { Octokit } = require('@octokit/rest');

class RefactorAnalyzer {
  constructor(prNumber) {
    this.prNumber = prNumber;
    this.octokit = new Octokit({
      auth: process.env.GITHUB_TOKEN
    });
    this.owner = 'Ch0daboy';
    this.repo = 'Unstack';
    this.logFile = path.join(__dirname, 'refactor.log');
    this.suggestions = [];
  }

  log(message) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}\n`;
    console.log(logMessage.trim());
    fs.appendFileSync(this.logFile, logMessage);
  }

  async analyzeCodeQuality() {
    this.log('Analyzing code quality...');
    
    const issues = [];

    // Check for common code quality issues
    await this.checkForLongFunctions();
    await this.checkForDuplicateCode();
    await this.checkForComplexComponents();
    await this.checkForMissingTypes();
    await this.checkForUnusedImports();
    await this.checkForConsistencyIssues();

    return issues;
  }

  async checkForLongFunctions() {
    this.log('Checking for long functions...');
    
    const srcFiles = this.getSourceFiles();
    
    for (const file of srcFiles) {
      const content = fs.readFileSync(file, 'utf8');
      const lines = content.split('\n');
      
      let currentFunction = null;
      let functionStart = 0;
      let braceCount = 0;
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        // Detect function start
        if (line.includes('function ') || line.includes('const ') && line.includes(' = ') && line.includes('=>')) {
          if (braceCount === 0) {
            currentFunction = line;
            functionStart = i;
          }
        }
        
        // Count braces
        braceCount += (line.match(/{/g) || []).length;
        braceCount -= (line.match(/}/g) || []).length;
        
        // Function end
        if (currentFunction && braceCount === 0 && i > functionStart) {
          const functionLength = i - functionStart;
          if (functionLength > 50) {
            this.suggestions.push({
              type: 'refactor',
              file: file,
              line: functionStart + 1,
              message: `Function is ${functionLength} lines long. Consider breaking it into smaller functions.`,
              severity: 'medium',
              suggestion: 'Break this function into smaller, more focused functions.'
            });
          }
          currentFunction = null;
        }
      }
    }
  }

  async checkForDuplicateCode() {
    this.log('Checking for duplicate code...');
    
    const srcFiles = this.getSourceFiles();
    const codeBlocks = new Map();
    
    for (const file of srcFiles) {
      const content = fs.readFileSync(file, 'utf8');
      const lines = content.split('\n');
      
      // Check for duplicate blocks of 5+ lines
      for (let i = 0; i <= lines.length - 5; i++) {
        const block = lines.slice(i, i + 5).join('\n').trim();
        if (block.length > 50) { // Ignore very short blocks
          if (codeBlocks.has(block)) {
            const existing = codeBlocks.get(block);
            this.suggestions.push({
              type: 'refactor',
              file: file,
              line: i + 1,
              message: `Duplicate code block found (also in ${existing.file}:${existing.line})`,
              severity: 'medium',
              suggestion: 'Extract this code into a reusable function or component.'
            });
          } else {
            codeBlocks.set(block, { file, line: i + 1 });
          }
        }
      }
    }
  }

  async checkForComplexComponents() {
    this.log('Checking for complex React components...');
    
    const componentFiles = this.getSourceFiles().filter(f => 
      f.includes('/components/') && f.endsWith('.tsx')
    );
    
    for (const file of componentFiles) {
      const content = fs.readFileSync(file, 'utf8');
      
      // Count hooks
      const hookCount = (content.match(/use[A-Z]\w*/g) || []).length;
      
      // Count JSX elements
      const jsxCount = (content.match(/<[A-Z]\w*/g) || []).length;
      
      // Count lines
      const lineCount = content.split('\n').length;
      
      if (hookCount > 8) {
        this.suggestions.push({
          type: 'refactor',
          file: file,
          message: `Component uses ${hookCount} hooks. Consider using custom hooks or breaking into smaller components.`,
          severity: 'medium',
          suggestion: 'Extract logic into custom hooks or split component.'
        });
      }
      
      if (lineCount > 300) {
        this.suggestions.push({
          type: 'refactor',
          file: file,
          message: `Component is ${lineCount} lines long. Consider breaking into smaller components.`,
          severity: 'high',
          suggestion: 'Split this component into smaller, more focused components.'
        });
      }
    }
  }

  async checkForMissingTypes() {
    this.log('Checking for missing TypeScript types...');
    
    const tsFiles = this.getSourceFiles().filter(f => f.endsWith('.ts') || f.endsWith('.tsx'));
    
    for (const file of tsFiles) {
      const content = fs.readFileSync(file, 'utf8');
      
      // Check for 'any' types
      const anyMatches = content.match(/:\s*any\b/g);
      if (anyMatches && anyMatches.length > 0) {
        this.suggestions.push({
          type: 'improvement',
          file: file,
          message: `Found ${anyMatches.length} usage(s) of 'any' type. Consider using specific types.`,
          severity: 'low',
          suggestion: 'Replace any types with specific type definitions.'
        });
      }
      
      // Check for untyped function parameters
      const untypedParams = content.match(/\(\s*\w+\s*\)/g);
      if (untypedParams && untypedParams.length > 0) {
        this.suggestions.push({
          type: 'improvement',
          file: file,
          message: 'Found function parameters without explicit types.',
          severity: 'low',
          suggestion: 'Add explicit types to function parameters.'
        });
      }
    }
  }

  async checkForUnusedImports() {
    this.log('Checking for unused imports...');
    
    try {
      // Use ESLint to check for unused imports
      const result = execSync('npx eslint src/ --format json --rule "no-unused-vars: error"', 
        { encoding: 'utf8', stdio: 'pipe' });
      
      const eslintResults = JSON.parse(result);
      
      for (const fileResult of eslintResults) {
        const unusedImports = fileResult.messages.filter(msg => 
          msg.ruleId === 'no-unused-vars' && msg.message.includes('is defined but never used')
        );
        
        if (unusedImports.length > 0) {
          this.suggestions.push({
            type: 'cleanup',
            file: fileResult.filePath,
            message: `Found ${unusedImports.length} unused import(s).`,
            severity: 'low',
            suggestion: 'Remove unused imports to clean up the code.'
          });
        }
      }
    } catch (error) {
      this.log(`ESLint check failed: ${error.message}`);
    }
  }

  async checkForConsistencyIssues() {
    this.log('Checking for consistency issues...');
    
    const srcFiles = this.getSourceFiles();
    const patterns = {
      quotes: { single: 0, double: 0 },
      semicolons: { with: 0, without: 0 },
      indentation: { spaces: 0, tabs: 0 }
    };
    
    for (const file of srcFiles) {
      const content = fs.readFileSync(file, 'utf8');
      
      // Check quote consistency
      patterns.quotes.single += (content.match(/'/g) || []).length;
      patterns.quotes.double += (content.match(/"/g) || []).length;
      
      // Check semicolon consistency
      const lines = content.split('\n');
      for (const line of lines) {
        if (line.trim().endsWith(';')) patterns.semicolons.with++;
        else if (line.trim().length > 0 && !line.trim().endsWith('{') && !line.trim().endsWith('}')) {
          patterns.semicolons.without++;
        }
      }
      
      // Check indentation
      for (const line of lines) {
        if (line.startsWith('\t')) patterns.indentation.tabs++;
        else if (line.startsWith('  ')) patterns.indentation.spaces++;
      }
    }
    
    // Report inconsistencies
    if (patterns.quotes.single > 0 && patterns.quotes.double > 0) {
      const dominant = patterns.quotes.single > patterns.quotes.double ? 'single' : 'double';
      this.suggestions.push({
        type: 'consistency',
        message: `Mixed quote styles found. Consider using ${dominant} quotes consistently.`,
        severity: 'low',
        suggestion: `Use ${dominant} quotes throughout the codebase.`
      });
    }
  }

  getSourceFiles() {
    const srcDir = path.join(process.cwd(), 'src');
    const files = [];
    
    const walkDir = (dir) => {
      const items = fs.readdirSync(dir);
      for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
          walkDir(fullPath);
        } else if (item.endsWith('.ts') || item.endsWith('.tsx') || item.endsWith('.js') || item.endsWith('.jsx')) {
          files.push(fullPath);
        }
      }
    };
    
    if (fs.existsSync(srcDir)) {
      walkDir(srcDir);
    }
    
    return files;
  }

  async generateRefactoringPR() {
    if (this.suggestions.length === 0) {
      this.log('No refactoring suggestions found.');
      return;
    }

    this.log(`Generating refactoring PR with ${this.suggestions.length} suggestions...`);
    
    // Create refactoring branch
    const branchName = `refactor/automated-improvements-pr-${this.prNumber}`;
    
    try {
      execSync(`git checkout -b ${branchName}`, { stdio: 'inherit' });
      
      // Apply automatic fixes where possible
      await this.applyAutomaticFixes();
      
      // Check if there are changes to commit
      try {
        execSync('git diff --exit-code', { stdio: 'pipe' });
        this.log('No changes to commit after automatic fixes.');
        return;
      } catch (error) {
        // There are changes, continue with PR creation
      }
      
      // Commit changes
      execSync('git add .', { stdio: 'inherit' });
      execSync(`git commit -m "refactor: automated code improvements based on PR #${this.prNumber}"`, { stdio: 'inherit' });
      
      // Push branch
      execSync(`git push origin ${branchName}`, { stdio: 'inherit' });
      
      // Create PR
      const prBody = this.generatePRDescription();
      
      const { data: newPR } = await this.octokit.pulls.create({
        owner: this.owner,
        repo: this.repo,
        title: `🔧 Automated Code Improvements (Based on PR #${this.prNumber})`,
        head: branchName,
        base: 'main',
        body: prBody
      });
      
      this.log(`Created refactoring PR: ${newPR.html_url}`);
      
    } catch (error) {
      this.log(`Error creating refactoring PR: ${error.message}`);
    } finally {
      // Return to main branch
      try {
        execSync('git checkout main', { stdio: 'inherit' });
      } catch (error) {
        this.log(`Error returning to main: ${error.message}`);
      }
    }
  }

  async applyAutomaticFixes() {
    this.log('Applying automatic fixes...');
    
    // Run ESLint with --fix
    try {
      execSync('npx eslint src/ --fix', { stdio: 'inherit' });
      this.log('Applied ESLint automatic fixes.');
    } catch (error) {
      this.log('ESLint fix failed, continuing...');
    }
    
    // Run Prettier
    try {
      execSync('npx prettier --write "src/**/*.{ts,tsx,js,jsx}"', { stdio: 'inherit' });
      this.log('Applied Prettier formatting.');
    } catch (error) {
      this.log('Prettier formatting failed, continuing...');
    }
  }

  generatePRDescription() {
    const highPriority = this.suggestions.filter(s => s.severity === 'high');
    const mediumPriority = this.suggestions.filter(s => s.severity === 'medium');
    const lowPriority = this.suggestions.filter(s => s.severity === 'low');
    
    let description = `## 🔧 Automated Code Improvements\n\n`;
    description += `This PR contains automated code improvements based on analysis of PR #${this.prNumber}.\n\n`;
    
    if (highPriority.length > 0) {
      description += `### 🔴 High Priority Issues (${highPriority.length})\n`;
      highPriority.forEach(s => {
        description += `- **${s.file}**: ${s.message}\n`;
      });
      description += '\n';
    }
    
    if (mediumPriority.length > 0) {
      description += `### 🟡 Medium Priority Issues (${mediumPriority.length})\n`;
      mediumPriority.forEach(s => {
        description += `- **${s.file}**: ${s.message}\n`;
      });
      description += '\n';
    }
    
    if (lowPriority.length > 0) {
      description += `### 🟢 Low Priority Issues (${lowPriority.length})\n`;
      lowPriority.forEach(s => {
        description += `- **${s.file}**: ${s.message}\n`;
      });
      description += '\n';
    }
    
    description += `### 🤖 Automatic Fixes Applied\n`;
    description += `- ESLint automatic fixes\n`;
    description += `- Prettier code formatting\n\n`;
    
    description += `### 📋 Manual Review Needed\n`;
    description += `Please review the suggestions above and consider implementing the recommended changes.\n\n`;
    
    description += `---\n*This PR was automatically generated by the code quality monitoring system.*`;
    
    return description;
  }

  async run() {
    this.log(`Starting refactoring analysis for PR #${this.prNumber}`);
    
    await this.analyzeCodeQuality();
    
    if (this.suggestions.length > 0) {
      this.log(`Found ${this.suggestions.length} suggestions for improvement.`);
      await this.generateRefactoringPR();
    } else {
      this.log('No refactoring suggestions found. Code quality looks good!');
    }
  }
}

// Run if called directly
if (require.main === module) {
  const prNumber = process.argv[2];
  if (!prNumber) {
    console.error('Usage: node refactor-analyzer.js <PR_NUMBER>');
    process.exit(1);
  }
  
  const analyzer = new RefactorAnalyzer(parseInt(prNumber));
  analyzer.run().catch(error => {
    console.error('Refactor analyzer error:', error);
    process.exit(1);
  });
}

module.exports = RefactorAnalyzer;
