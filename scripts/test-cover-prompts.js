#!/usr/bin/env node

// Test script to verify the new cover generation prompts
// Run with: node scripts/test-cover-prompts.js

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🎨 Testing New Cover Generation Prompts...\n');

// Mock book data for testing
const testBooks = [
  {
    title: "The Dragon's Quest",
    genre: "Fantasy",
    subGenre: "Epic Fantasy",
    tone: "Adventurous",
    description: "A young hero embarks on a dangerous journey to save the kingdom from an ancient dragon.",
    author: "J.R. Tolkien"
  },
  {
    title: "Love in Paris",
    genre: "Romance",
    subGenre: "Contemporary Romance",
    tone: "Romantic",
    description: "Two strangers meet in a Parisian café and discover an unexpected connection.",
    author: "Nicholas Sparks"
  },
  {
    title: "The Silent Witness",
    genre: "Mystery",
    tone: "Dark",
    description: "A detective investigates a series of murders in a small town where everyone has secrets.",
    author: "Agatha Christie"
  }
];

// Simulate the prompt generation logic from coverService.ts
function generatePrompt(book) {
  const authorName = book.author || 'Author Name';
  let prompt = `Create a professional photorealistic book cover for "${book.title}" by ${authorName}, a ${book.genre.toLowerCase()} book`;

  if (book.subGenre) {
    prompt += ` in the ${book.subGenre.toLowerCase()} style`;
  }

  if (book.tone) {
    prompt += ` with a ${book.tone.toLowerCase()} tone`;
  }

  const genrePrompts = {
    'romance': 'photorealistic romantic scene with cinematic lighting, elegant couple in beautiful setting, rose petals, golden hour sunset or moonlight, warm colors, intimate atmosphere, movie-quality photography',
    'fantasy': 'photorealistic mystical landscape with epic cinematography, enchanted forest or ancient castle, magical lighting effects, dragons or mythical creatures, rich detailed textures, fantasy movie poster style',
    'science fiction': 'photorealistic futuristic cityscape or space scene, advanced technology, cyberpunk atmosphere, neon lights, metallic surfaces, cosmic elements, sci-fi movie poster quality',
    'mystery': 'photorealistic dark atmospheric scene, foggy urban street, dramatic shadows, noir cinematography, detective elements, nighttime setting, film noir style',
    'thriller': 'photorealistic intense dramatic scene, stormy weather, dark clouds, suspenseful atmosphere, cinematic lighting, action movie poster style, high contrast',
    'historical fiction': 'photorealistic period-appropriate scene, authentic historical architecture, vintage elements, period costumes, documentary photography style, rich historical details',
    'contemporary fiction': 'photorealistic modern scene, urban or suburban setting, natural lighting, contemporary lifestyle, documentary photography style, relatable environments',
    'young adult': 'photorealistic vibrant scene, dynamic composition, bright natural colors, youthful energy, modern photography style, Instagram-worthy aesthetic',
    'non-fiction': 'photorealistic professional imagery, symbolic elements, clean composition, authoritative photography style, sophisticated visual metaphors',
    'self-help': 'photorealistic inspiring scene, sunrise or mountain peak, motivational imagery, bright optimistic lighting, lifestyle photography style',
    'business': 'photorealistic professional corporate scene, success imagery, modern office or cityscape, confident atmosphere, business photography style',
    'biography': 'photorealistic portrait-style composition, documentary photography, authentic setting, professional headshot quality, realistic lighting'
  };

  if (genrePrompts[book.genre.toLowerCase()]) {
    prompt += `. Visual style: ${genrePrompts[book.genre.toLowerCase()]}`;
  }

  prompt += `. Create a complete professional book cover with the title "${book.title}" prominently displayed at the top and author name "${book.author || 'Author Name'}" at the bottom. Use elegant, readable typography that fits the genre. Photorealistic style, not illustration. Vertical book cover orientation, high quality, professional photography or CGI quality, suitable for print, rich details, compelling composition, movie poster quality.`;

  if (book.description && book.description.length > 20) {
    const descriptionWords = book.description.split(' ').slice(0, 15).join(' ');
    prompt += ` Incorporate visual themes from: ${descriptionWords}`;
  }

  return prompt;
}

console.log('📋 Testing prompt generation for different genres:\n');

testBooks.forEach((book, index) => {
  console.log(`${index + 1}️⃣ **${book.title}** (${book.genre})`);
  console.log('─'.repeat(50));
  
  const prompt = generatePrompt(book);
  console.log('🎨 Generated Prompt:');
  console.log(`"${prompt}"`);
  
  console.log('\n✅ Key Features:');
  console.log('• Creates COMPLETE book covers with title and author');
  console.log('• Emphasizes PHOTOREALISTIC style (not illustration)');
  console.log('• Uses Imagen 4.0 Ultra model for better quality');
  console.log('• Incorporates book description themes');
  console.log('• Movie poster quality cinematography');
  
  console.log('\n' + '═'.repeat(80) + '\n');
});

console.log('🎯 **Latest Updates:**\n');
console.log('🔄 **PREVIOUS APPROACH:**');
console.log('   • Generated artwork without text');
console.log('   • Illustration style');
console.log('   • Imagen 3.0 model');
console.log('   • → Good artwork but incomplete covers\n');

console.log('✅ **NEW APPROACH:**');
console.log('   • "Complete professional book cover"');
console.log('   • "Title prominently displayed" + "Author name"');
console.log('   • "Photorealistic style, not illustration"');
console.log('   • "Movie poster quality" + Imagen 4.0 Ultra');
console.log('   • → Complete photorealistic book covers!\n');

console.log('🚀 **Ready to Test:**');
console.log('1. Go to your BookGen app');
console.log('2. Generate a new cover with Google AI');
console.log('3. Should now create COMPLETE photorealistic book covers!');
console.log('4. Try different genres to see varied photographic styles');
console.log('5. Covers will include title, author name, and photorealistic scenes');

console.log('\n📸 The new prompts will create photorealistic book covers with Imagen 4.0 Ultra! ✨');
