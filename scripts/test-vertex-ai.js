#!/usr/bin/env node

// Test script to check Vertex AI Imagen capabilities
// Run with: node scripts/test-vertex-ai.js

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🧪 Testing Vertex AI Imagen...\n');

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

const project = envVars.VITE_GOOGLE_CLOUD_PROJECT || 'unstackapp';
const location = envVars.VITE_GOOGLE_CLOUD_LOCATION || 'us-central1';
const apiKey = envVars.VITE_GEMINI_API_KEY;

console.log(`📋 Configuration:`);
console.log(`   Project: ${project}`);
console.log(`   Location: ${location}`);
console.log(`   API Key: ${apiKey ? '✅ Set' : '❌ Missing'}\n`);

async function testVertexAI() {
  console.log('🔍 Testing Vertex AI Imagen access...\n');

  // Test 1: Check if we can get a Google Cloud access token
  console.log('1️⃣ Testing Google Cloud metadata service...');
  try {
    const tokenResponse = await fetch('http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token', {
      headers: {
        'Metadata-Flavor': 'Google'
      }
    });

    if (tokenResponse.ok) {
      const tokenData = await tokenResponse.json();
      console.log('   ✅ Google Cloud metadata service accessible');
      console.log(`   ✅ Access token obtained (${tokenData.access_token.substring(0, 20)}...)`);
      
      // Test 2: Try Vertex AI Imagen
      console.log('\n2️⃣ Testing Vertex AI Imagen API...');
      
      const imagenResponse = await fetch(`https://${location}-aiplatform.googleapis.com/v1/projects/${project}/locations/${location}/publishers/google/models/imagen-3.0-generate-002:predict`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${tokenData.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          instances: [{
            prompt: 'A simple blue circle on white background'
          }],
          parameters: {
            sampleCount: 1,
            aspectRatio: "1:1",
            safetySetting: "block_medium_and_above",
            addWatermark: false
          }
        })
      });

      console.log(`   Status: ${imagenResponse.status} ${imagenResponse.statusText}`);
      
      if (imagenResponse.ok) {
        const data = await imagenResponse.json();
        
        if (data.predictions && data.predictions.length > 0 && data.predictions[0].bytesBase64Encoded) {
          console.log('   🎉 SUCCESS! Vertex AI Imagen generated an image!');
          console.log(`   📊 Image size: ${data.predictions[0].bytesBase64Encoded.length} characters`);
          console.log(`   📄 MIME type: ${data.predictions[0].mimeType}`);
          
          // Save the image for verification
          const imageBuffer = Buffer.from(data.predictions[0].bytesBase64Encoded, 'base64');
          fs.writeFileSync('vertex-ai-test-image.png', imageBuffer);
          console.log('   💾 Image saved as vertex-ai-test-image.png');
          
        } else {
          console.log('   ❌ No image data in response');
          console.log('   Response:', JSON.stringify(data, null, 2).substring(0, 500) + '...');
        }
      } else {
        const errorText = await imagenResponse.text();
        console.log(`   ❌ Error: ${errorText.substring(0, 300)}...`);
      }
      
    } else {
      console.log('   ❌ Google Cloud metadata service not accessible');
      console.log('   ℹ️  This is expected when running outside Google Cloud');
    }
  } catch (error) {
    console.log(`   ❌ Error accessing metadata service: ${error.message}`);
    console.log('   ℹ️  This is expected when running outside Google Cloud');
  }

  // Test 3: Fallback to Gemini API
  console.log('\n3️⃣ Testing Gemini API fallback...');
  
  if (!apiKey) {
    console.log('   ❌ No API key available for Gemini API test');
    return;
  }
  
  try {
    const geminiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-preview-image-generation:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: 'A simple blue circle on white background'
          }]
        }],
        generationConfig: {
          responseModalities: ["TEXT", "IMAGE"],
          temperature: 0.7,
        }
      })
    });

    console.log(`   Status: ${geminiResponse.status} ${geminiResponse.statusText}`);
    
    if (geminiResponse.ok) {
      const data = await geminiResponse.json();
      
      if (data.candidates && data.candidates.length > 0) {
        let imageFound = false;
        
        for (const candidate of data.candidates) {
          if (candidate.content?.parts) {
            for (const part of candidate.content.parts) {
              if (part.inlineData?.data) {
                console.log('   🎉 SUCCESS! Gemini API generated an image!');
                console.log(`   📊 Image size: ${part.inlineData.data.length} characters`);
                console.log(`   📄 MIME type: ${part.inlineData.mimeType}`);
                
                // Save the image for verification
                const imageBuffer = Buffer.from(part.inlineData.data, 'base64');
                fs.writeFileSync('gemini-test-image.png', imageBuffer);
                console.log('   💾 Image saved as gemini-test-image.png');
                
                imageFound = true;
                break;
              }
            }
          }
        }
        
        if (!imageFound) {
          const textResponse = data.candidates[0]?.content?.parts?.[0]?.text;
          if (textResponse) {
            console.log('   ⚠️  Text response instead of image:');
            console.log(`   "${textResponse.substring(0, 200)}..."`);
          } else {
            console.log('   ❌ No image or text found in response');
          }
        }
      } else {
        console.log('   ❌ No candidates in response');
      }
    } else {
      const errorText = await geminiResponse.text();
      console.log(`   ❌ Error: ${errorText.substring(0, 300)}...`);
    }
    
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
  }
}

testVertexAI().then(() => {
  console.log('\n🏁 Test completed!');
  console.log('\n📋 Summary:');
  console.log('- Vertex AI Imagen is the preferred method (production-ready)');
  console.log('- Gemini API works as a fallback');
  console.log('- Your BookGen app will try Vertex AI first, then Gemini');
  console.log('- Both methods should work for generating book covers');
}).catch(error => {
  console.error('Test failed:', error);
});
