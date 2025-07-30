#!/usr/bin/env node

// Test script to check Google AI image generation capabilities
// Run with: node scripts/test-imagen.js

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🧪 Testing Google AI Image Generation...\n');

// Read environment variables
const envPath = path.join(__dirname, '..', '.env');
let envVars = {};

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length > 0) {
      envVars[key.trim()] = valueParts.join('=').trim();
    }
  });
}

const apiKey = envVars.VITE_GEMINI_API_KEY;

if (!apiKey || apiKey === 'your_gemini_api_key_here') {
  console.log('❌ No valid Gemini API key found in .env file');
  process.exit(1);
}

console.log('✅ API key found');
console.log('🔍 Testing different Google AI endpoints...\n');

// Test different endpoints
const tests = [
  {
    name: 'Gemini Text Generation (baseline)',
    url: `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`,
    body: {
      contents: [{
        parts: [{
          text: 'Hello, this is a test.'
        }]
      }]
    }
  },
  {
    name: 'Gemini Vision (image understanding)',
    url: `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro-vision:generateContent?key=${apiKey}`,
    body: {
      contents: [{
        parts: [{
          text: 'Generate a book cover image for a fantasy novel'
        }]
      }]
    }
  },
  {
    name: 'Imagen 3.0 (correct model)',
    url: `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:generateContent?key=${apiKey}`,
    body: {
      contents: [{
        parts: [{
          text: 'A professional book cover for a fantasy novel'
        }]
      }]
    }
  },
  {
    name: 'Gemini 2.0 Flash Image Generation (detailed prompt)',
    url: `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp-image-generation:generateContent?key=${apiKey}`,
    body: {
      contents: [{
        parts: [{
          text: 'Create an image of a professional book cover for "The Dragon\'s Quest" by John Smith, fantasy genre. The cover should have mystical colors, a dragon silhouette, castle in background, elegant typography with the title and author name clearly visible, vertical book cover orientation, high quality, marketable design.'
        }]
      }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 1024
      }
    }
  },
  {
    name: 'Gemini 2.0 Flash Image Generation (simple command)',
    url: `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp-image-generation:generateContent?key=${apiKey}`,
    body: {
      contents: [{
        parts: [{
          text: 'Generate an image now: fantasy book cover'
        }]
      }]
    }
  },
  {
    name: 'Gemini 2.0 Flash Image Generation (very simple)',
    url: `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp-image-generation:generateContent?key=${apiKey}`,
    body: {
      contents: [{
        parts: [{
          text: 'Create an image of a blue circle'
        }]
      }]
    }
  },
  {
    name: 'Gemini 2.0 Flash Image Generation (abstract)',
    url: `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp-image-generation:generateContent?key=${apiKey}`,
    body: {
      contents: [{
        parts: [{
          text: 'Generate abstract geometric shapes in blue and gold colors'
        }]
      }]
    }
  },
  {
    name: 'Gemini 2.0 Flash Preview Image Generation (CORRECT FORMAT)',
    url: `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-preview-image-generation:generateContent?key=${apiKey}`,
    body: {
      contents: [{
        parts: [{
          text: 'A professional book cover for a fantasy novel with a dragon and castle'
        }]
      }],
      generationConfig: {
        responseModalities: ["TEXT", "IMAGE"],
        temperature: 0.7
      }
    }
  },
  {
    name: 'List Available Models',
    url: `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`,
    method: 'GET'
  }
];

async function runTests() {
  for (const test of tests) {
    console.log(`🧪 Testing: ${test.name}`);
    
    try {
      const options = {
        method: test.method || 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      };
      
      if (test.body) {
        options.body = JSON.stringify(test.body);
      }
      
      const response = await fetch(test.url, options);
      
      console.log(`   Status: ${response.status} ${response.statusText}`);
      
      if (response.ok) {
        const data = await response.json();
        
        if (test.name === 'List Available Models') {
          console.log('   Available models:');
          if (data.models) {
            data.models.forEach(model => {
              console.log(`     - ${model.name}`);
            });
          }
        } else {
          console.log('   ✅ Success');
          if (data.candidates && data.candidates[0]) {
            const candidate = data.candidates[0];

            // Check for text response
            if (candidate.content?.parts[0]?.text) {
              const text = candidate.content.parts[0].text.substring(0, 100);
              console.log(`   Text Response: ${text}...`);
            }

            // Check for image data
            if (candidate.content?.parts[0]?.inlineData) {
              console.log(`   ✅ Image data found! Type: ${candidate.content.parts[0].inlineData.mimeType}`);
              console.log(`   Image size: ${candidate.content.parts[0].inlineData.data.length} characters`);
            }

            // Show full structure for debugging
            if (test.name.includes('Image Generation')) {
              console.log('   Full response structure:', JSON.stringify(data, null, 2).substring(0, 500) + '...');
            }

            // Special check for the correct format test
            if (test.name.includes('CORRECT FORMAT')) {
              console.log('   🔍 Detailed analysis of CORRECT FORMAT response:');
              console.log('   Number of candidates:', data.candidates?.length || 0);

              if (data.candidates && data.candidates[0]) {
                const candidate = data.candidates[0];
                console.log('   Number of parts:', candidate.content?.parts?.length || 0);

                candidate.content?.parts?.forEach((part, index) => {
                  console.log(`   Part ${index + 1}:`);
                  if (part.text) {
                    console.log(`     - Text: ${part.text.substring(0, 100)}...`);
                  }
                  if (part.inlineData) {
                    console.log(`     - 🎉 IMAGE DATA FOUND! Type: ${part.inlineData.mimeType}, Size: ${part.inlineData.data?.length || 0} chars`);
                  }
                  if (part.functionCall) {
                    console.log(`     - Function call: ${part.functionCall.name}`);
                  }
                  console.log(`     - Part keys: ${Object.keys(part).join(', ')}`);
                });
              }
            }
          }
        }
      } else {
        const errorText = await response.text();
        console.log(`   ❌ Error: ${errorText.substring(0, 200)}...`);
      }
      
    } catch (error) {
      console.log(`   ❌ Network Error: ${error.message}`);
    }
    
    console.log('');
  }
}

runTests().then(() => {
  console.log('🏁 Test completed!');
  console.log('\n📋 Summary:');
  console.log('- If Gemini Text works but image generation fails, your API key doesn\'t have image generation permissions');
  console.log('- Check the available models list to see what\'s supported');
  console.log('- You may need to enable Vertex AI API in Google Cloud Console');
  console.log('- Consider using DALL-E as an alternative');
}).catch(error => {
  console.error('Test failed:', error);
});
