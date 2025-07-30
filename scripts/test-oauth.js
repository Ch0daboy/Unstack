#!/usr/bin/env node

// Test script to verify OAuth configuration
// Run with: node scripts/test-oauth.js

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔍 Testing Google OAuth Configuration...\n');

// Check if environment file exists
const envPath = path.join(__dirname, '..', '.env');
const envLocalPath = path.join(__dirname, '..', '.env.local');

let envFile = null;
if (fs.existsSync(envPath)) {
  envFile = envPath;
  console.log('✅ Found .env file');
} else if (fs.existsSync(envLocalPath)) {
  envFile = envLocalPath;
  console.log('✅ Found .env.local file');
} else {
  console.log('❌ No environment file found');
  process.exit(1);
}

// Read environment variables
const envContent = fs.readFileSync(envFile, 'utf8');
const envVars = {};

envContent.split('\n').forEach(line => {
  const [key, ...valueParts] = line.split('=');
  if (key && valueParts.length > 0) {
    envVars[key.trim()] = valueParts.join('=').trim();
  }
});

// Check required variables
const requiredVars = [
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_ANON_KEY',
  'GOOGLE_OAUTH_CLIENT_ID',
  'GOOGLE_OAUTH_CLIENT_SECRET'
];

let allPresent = true;

console.log('\n📋 Checking required environment variables:');
requiredVars.forEach(varName => {
  if (envVars[varName] && envVars[varName] !== 'your_google_oauth_client_id_here' && envVars[varName] !== 'your_google_oauth_client_secret_here') {
    console.log(`✅ ${varName}: Set`);
  } else {
    console.log(`❌ ${varName}: Missing or placeholder`);
    allPresent = false;
  }
});

// Check Supabase configuration
console.log('\n🔧 Checking Supabase configuration:');
const configPath = path.join(__dirname, '..', 'supabase', 'config.toml');

if (fs.existsSync(configPath)) {
  console.log('✅ Supabase config.toml found');
  
  const configContent = fs.readFileSync(configPath, 'utf8');
  
  if (configContent.includes('[auth.external.google]')) {
    console.log('✅ Google OAuth section found in config');
  } else {
    console.log('❌ Google OAuth section missing in config');
    allPresent = false;
  }
  
  if (configContent.includes('enabled = true')) {
    console.log('✅ Google OAuth enabled');
  } else {
    console.log('❌ Google OAuth not enabled');
    allPresent = false;
  }
} else {
  console.log('❌ Supabase config.toml not found');
  allPresent = false;
}

// Summary
console.log('\n📊 Configuration Summary:');
if (allPresent) {
  console.log('🎉 All configuration looks good!');
  console.log('\n📝 Next steps:');
  console.log('1. Make sure you have set up Google OAuth credentials in Google Cloud Console');
  console.log('2. Update GOOGLE_OAUTH_CLIENT_ID and GOOGLE_OAUTH_CLIENT_SECRET in your .env file');
  console.log('3. Start your application: npm run dev:local');
  console.log('4. Test Google sign-in at http://localhost:5174');
} else {
  console.log('⚠️  Configuration incomplete. Please check the items marked with ❌ above.');
  console.log('\n📚 For detailed setup instructions, see:');
  console.log('   docs/GOOGLE_OAUTH_SETUP.md');
}

console.log('\n🔗 Useful URLs:');
console.log('   Supabase Studio: http://127.0.0.1:54323');
console.log('   Google Cloud Console: https://console.cloud.google.com/');
console.log('   Your App: http://localhost:5174');
