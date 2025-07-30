import { Book } from '../types';

export const generateBookCover = async (book: Book, geminiApiKey: string): Promise<string> => {
  // Note: Google AI image generation is currently limited and may not work with all API keys
  // This function attempts to use Google's image generation but falls back to suggesting DALL-E
  // Create a detailed prompt for a complete photorealistic book cover
  const authorName = book.author || 'Author Name';
  let prompt = `Create a professional photorealistic book cover for "${book.title}" by ${authorName}, a ${book.genre.toLowerCase()} book`;

  if (book.subGenre) {
    prompt += ` in the ${book.subGenre.toLowerCase()} style`;
  }

  if (book.tone) {
    prompt += ` with a ${book.tone.toLowerCase()} tone`;
  }

  // Add genre-specific photorealistic visual scenes
  const genrePrompts: {[key: string]: string} = {
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

  // Add technical specifications for the complete book cover
  prompt += `. Create a complete professional book cover with the title "${book.title}" prominently displayed at the top and author name "${authorName}" at the bottom. Use elegant, readable typography that fits the genre. Photorealistic style, not illustration. Vertical book cover orientation, high quality, professional photography or CGI quality, suitable for print, rich details, compelling composition, movie poster quality.`;

  // Add description-based elements if available
  if (book.description && book.description.length > 20) {
    const descriptionWords = book.description.split(' ').slice(0, 15).join(' ');
    prompt += ` Incorporate visual themes from: ${descriptionWords}`;
  }

  // Try Vertex AI Imagen first (more reliable), then fallback to Gemini API
  const attempts = [
    // Attempt 1: Vertex AI Imagen (production-ready)
    async () => {
      console.log('Trying Vertex AI Imagen...');

      // Get Google Cloud access token
      const tokenResponse = await fetch('http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token', {
        headers: {
          'Metadata-Flavor': 'Google'
        }
      });

      let accessToken;
      if (tokenResponse.ok) {
        const tokenData = await tokenResponse.json();
        accessToken = tokenData.access_token;
      } else {
        // Fallback: try to use the API key as a bearer token (won't work but will give clear error)
        throw new Error('Vertex AI requires Google Cloud authentication. Using Gemini API instead.');
      }

      const response = await fetch(`https://us-central1-aiplatform.googleapis.com/v1/projects/unstackapp/locations/us-central1/publishers/google/models/imagen-4.0-ultra-generate-preview-06-06:predict`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          instances: [{
            prompt: prompt
          }],
          parameters: {
            sampleCount: 1,
            aspectRatio: "3:4", // Good for book covers
            safetySetting: "block_medium_and_above",
            personGeneration: "allow_adult",
            addWatermark: false
          }
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Vertex AI Imagen error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();

      if (data.predictions && data.predictions.length > 0 && data.predictions[0].bytesBase64Encoded) {
        console.log('✅ Vertex AI Imagen generated image successfully!');
        const mimeType = data.predictions[0].mimeType || 'image/png';
        return `data:${mimeType};base64,${data.predictions[0].bytesBase64Encoded}`;
      }

      throw new Error('No image data in Vertex AI response');
    },

    // Attempt 2: Gemini API (fallback)
    async () => {
      console.log('Trying Gemini API as fallback...');

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-preview-image-generation:generateContent?key=${geminiApiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: prompt
            }]
          }],
          generationConfig: {
            responseModalities: ["TEXT", "IMAGE"],
            temperature: 0.7,
          }
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();

      if (!data.candidates || data.candidates.length === 0) {
        throw new Error('No image generated by Gemini API');
      }

      // Look for image data in the response
      for (const candidate of data.candidates) {
        if (candidate.content?.parts) {
          for (const part of candidate.content.parts) {
            if (part.inlineData?.data) {
              console.log('✅ Gemini API generated image successfully!');
              const mimeType = part.inlineData.mimeType || 'image/png';
              return `data:${mimeType};base64,${part.inlineData.data}`;
            }
          }
        }
      }

      // Check for policy violations
      const textResponse = data.candidates[0]?.content?.parts?.[0]?.text;
      if (textResponse && (textResponse.includes('policy') || textResponse.includes('violates'))) {
        throw new Error(`Content policy violation: ${textResponse.substring(0, 200)}...`);
      }

      throw new Error('No image data found in Gemini API response');
    }
  ];

  // Try each approach
  for (let i = 0; i < attempts.length; i++) {
    try {
      return await attempts[i]();
    } catch (error) {
      console.log(`Attempt ${i + 1} failed:`, error);

      if (i === attempts.length - 1) {
        // Last attempt failed
        if (error instanceof Error) {
          if (error.message.includes('policy') || error.message.includes('violates')) {
            throw new Error(`Google AI rejected this image due to content policies. Try a simpler prompt or use DALL-E instead.`);
          }

          if (error.message.includes('Vertex AI requires')) {
            throw new Error(`Google AI image generation failed. Your setup works but may need additional permissions. Try DALL-E as an alternative.`);
          }

          throw new Error(`Google AI image generation failed: ${error.message}`);
        }

        throw new Error('Google AI image generation failed. Try DALL-E instead.');
      }
    }
  }
};

// Alternative: Generate cover using DALL-E (if user has OpenAI API key)
export const generateBookCoverWithDALLE = async (book: Book, apiKey: string): Promise<string> => {
  const authorName = book.author || 'Author Name';

  // Create complete photorealistic book cover prompt
  let prompt = `Create a professional photorealistic book cover for "${book.title}" by ${authorName}, a ${book.genre.toLowerCase()} book`;

  if (book.description) {
    // Take first sentence of description for context
    const firstSentence = book.description.split('.')[0];
    prompt += `. Story context: ${firstSentence}`;
  }

  // Add genre-specific photorealistic visual direction
  const genreStyles: {[key: string]: string} = {
    'romance': 'photorealistic romantic scene with cinematic lighting, elegant atmosphere, warm golden colors, movie-quality photography',
    'fantasy': 'photorealistic mystical landscape with magical elements, enchanted setting, rich fantasy colors, epic cinematography',
    'science fiction': 'photorealistic futuristic scene with advanced technology, space elements, cyberpunk atmosphere, sci-fi movie quality',
    'mystery': 'photorealistic dark atmospheric scene with mysterious shadows, noir cinematography, film noir style',
    'thriller': 'photorealistic intense dramatic scene with suspenseful atmosphere, bold contrasts, action movie poster style',
    'historical fiction': 'photorealistic period-appropriate historical scene with authentic details, documentary photography style',
    'contemporary fiction': 'photorealistic modern scene with natural lighting, documentary photography style',
    'young adult': 'photorealistic vibrant dynamic scene with youthful energy, modern photography style',
    'non-fiction': 'photorealistic clean professional imagery with symbolic elements, business photography style',
    'self-help': 'photorealistic inspiring uplifting scene with motivational imagery, lifestyle photography style',
    'business': 'photorealistic professional corporate scene with success imagery, business photography style',
    'biography': 'photorealistic portrait-style composition with documentary photography, professional headshot quality'
  };

  if (genreStyles[book.genre.toLowerCase()]) {
    prompt += `. Visual style: ${genreStyles[book.genre.toLowerCase()]}`;
  }

  prompt += `. Create a complete book cover with the title "${book.title}" prominently displayed at the top and author name "${authorName}" at the bottom. Use elegant, readable typography that fits the genre. Photorealistic style, not illustration. Vertical book cover orientation, high quality, professional photography or CGI quality, movie poster quality, rich details, compelling composition.`;
  
  try {
    const response = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: "dall-e-3",
        prompt: prompt,
        n: 1,
        size: "1024x1792", // Vertical book cover ratio
        quality: "standard",
        response_format: "url"
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('DALL-E API Error:', errorText);
      throw new Error(`Cover generation failed: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    
    if (!data.data || data.data.length === 0) {
      throw new Error('No image generated');
    }
    
    // Convert URL to base64 for storage
    const imageUrl = data.data[0].url;
    const imageResponse = await fetch(imageUrl);
    const imageBlob = await imageResponse.blob();
    
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(imageBlob);
    });
  } catch (error) {
    console.error('Error generating book cover with DALL-E:', error);
    throw error;
  }
};