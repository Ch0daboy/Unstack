import { WritingPersona, PersonaAnalysis, PersonaPreferences } from '../types';
import { supabase } from '../lib/supabase';
import { generateContent } from './geminiService';

// Create a new writing persona
export const createPersona = async (
  name: string,
  description: string,
  authorName?: string,
  preferences?: Partial<PersonaPreferences>
): Promise<WritingPersona> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const defaultPreferences: PersonaPreferences = {
    preferredGenres: [],
    avoidedTopics: [],
    specialInstructions: '',
    targetAudience: [],
    ...preferences
  };

  const { data, error } = await supabase
    .from('writing_personas')
    .insert({
      user_id: user.id,
      name,
      description,
      author_name: authorName || '',
      preferences: defaultPreferences,
      is_favorite: false
    })
    .select()
    .single();

  if (error) throw error;
  return data;
};

// Analyze writing sample and create persona
export const analyzeWritingSample = async (
  sampleText: string,
  apiKey: string
): Promise<PersonaAnalysis> => {
  const analysisPrompt = `
Analyze this writing sample and extract detailed style characteristics. Provide a comprehensive analysis in the following JSON format:

{
  "writingStyle": {
    "sentenceLength": "short|medium|long|varied",
    "vocabulary": "simple|moderate|complex|academic", 
    "tone": ["descriptive", "conversational", "formal", "etc"],
    "voiceCharacteristics": ["first person", "introspective", "humorous", "etc"]
  },
  "structuralElements": {
    "paragraphLength": "short|medium|long",
    "dialogueStyle": "description of dialogue approach",
    "descriptiveStyle": "description of descriptive approach", 
    "pacing": "fast|moderate|slow|varied"
  },
  "genreSpecialty": ["fantasy", "romance", "mystery", "etc"],
  "strengthsAndQuirks": ["specific writing strengths and unique characteristics"],
  "confidence": 0.85
}

Writing Sample:
${sampleText}

Analyze the writing style, voice, structure, vocabulary level, sentence patterns, dialogue approach, descriptive techniques, and any unique characteristics. Be specific and detailed in your analysis.`;

  try {
    const response = await generateContent(analysisPrompt, apiKey);
    
    // Extract JSON from response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Could not extract analysis from AI response');
    }
    
    const analysis = JSON.parse(jsonMatch[0]);
    return analysis;
  } catch (error) {
    console.error('Error analyzing writing sample:', error);
    throw new Error('Failed to analyze writing sample. Please try again.');
  }
};

// Create persona from writing sample analysis
export const createPersonaFromSample = async (
  name: string,
  description: string,
  sampleText: string,
  apiKey: string,
  authorName?: string
): Promise<WritingPersona> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  // Analyze the writing sample
  const analysis = await analyzeWritingSample(sampleText, apiKey);

  // Create preferences based on analysis
  const preferences: PersonaPreferences = {
    preferredGenres: analysis.genreSpecialty || [],
    avoidedTopics: [],
    specialInstructions: `Writing style: ${analysis.writingStyle.tone.join(', ')}. ${analysis.strengthsAndQuirks.join('. ')}.`,
    targetAudience: []
  };

  const { data, error } = await supabase
    .from('writing_personas')
    .insert({
      user_id: user.id,
      name,
      description,
      author_name: authorName || '',
      sample_text: sampleText,
      analysis_results: analysis,
      preferences,
      is_favorite: false
    })
    .select()
    .single();

  if (error) throw error;
  return data;
};

// Get all personas for current user
export const getUserPersonas = async (): Promise<WritingPersona[]> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const { data, error } = await supabase
    .from('writing_personas')
    .select('*')
    .eq('user_id', user.id)
    .order('is_favorite', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
};

// Get persona by ID
export const getPersonaById = async (id: string): Promise<WritingPersona | null> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const { data, error } = await supabase
    .from('writing_personas')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    throw error;
  }
  return data;
};

// Update persona
export const updatePersona = async (
  id: string,
  updates: Partial<Omit<WritingPersona, 'id' | 'createdAt' | 'updatedAt'>>
): Promise<WritingPersona> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const { data, error } = await supabase
    .from('writing_personas')
    .update(updates)
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single();

  if (error) throw error;
  return data;
};

// Delete persona
export const deletePersona = async (id: string): Promise<void> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const { error } = await supabase
    .from('writing_personas')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) throw error;
};

// Toggle favorite status
export const togglePersonaFavorite = async (id: string): Promise<WritingPersona> => {
  const persona = await getPersonaById(id);
  if (!persona) throw new Error('Persona not found');

  return updatePersona(id, { is_favorite: !persona.is_favorite });
};

// Generate content with persona style
export const generateContentWithPersona = async (
  prompt: string,
  persona: WritingPersona,
  apiKey: string
): Promise<string> => {
  let enhancedPrompt = prompt;

  // Add persona style instructions
  if (persona.analysis_results) {
    const analysis = persona.analysis_results;
    enhancedPrompt += `\n\nWrite in the following style:
- Sentence length: ${analysis.writingStyle.sentenceLength}
- Vocabulary level: ${analysis.writingStyle.vocabulary}
- Tone: ${analysis.writingStyle.tone.join(', ')}
- Voice characteristics: ${analysis.writingStyle.voiceCharacteristics.join(', ')}
- Paragraph style: ${analysis.structuralElements.paragraphLength}
- Pacing: ${analysis.structuralElements.pacing}`;

    if (analysis.strengthsAndQuirks.length > 0) {
      enhancedPrompt += `\n- Key characteristics: ${analysis.strengthsAndQuirks.join(', ')}`;
    }
  }

  // Add preferences
  if (persona.preferences.specialInstructions) {
    enhancedPrompt += `\n\nAdditional instructions: ${persona.preferences.specialInstructions}`;
  }

  if (persona.preferences.avoidedTopics.length > 0) {
    enhancedPrompt += `\n\nAvoid these topics: ${persona.preferences.avoidedTopics.join(', ')}`;
  }

  return generateContent(enhancedPrompt, apiKey);
};
