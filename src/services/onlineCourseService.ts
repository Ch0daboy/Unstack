import { researchTopic } from './perplexityService';
import { generateContent } from './geminiService'; // For text generation (lesson plans, slides, scripts)
// import { generateTTS } from './ttsService'; // For optional TTS audio

interface CourseSection {
  title: string;
  summary: string;
  lessonPlan: string;
  slides: string[];
  script: string;
  audioUrl?: string;
}

interface OnlineCourse {
  title: string;
  description: string;
  sections: CourseSection[];
}

/**
 * Main entry point for generating an online course.
 */
export const generateOnlineCourse = async (
  topic: string,
  description: string,
  perplexityApiKey: string,
  geminiApiKey: string,
  generateAudio: boolean = false
): Promise<OnlineCourse> => {
  // 1. Research the topic using Perplexity
  const research = await researchTopic(topic, description, perplexityApiKey);

  // 2. Parse research into sections/chapters
  const sections = await parseResearchIntoSections(research, topic, geminiApiKey);

  // 3. For each section, generate lesson plan, slides, script, and (optionally) audio
  const detailedSections: CourseSection[] = [];
  for (const section of sections) {
    console.log(`Generating content for section: ${section.title}`);
    
    // a. Generate lesson plan
    const lessonPlan = await generateLessonPlan(section.title, section.summary, geminiApiKey);
    
    // b. Generate Google Slides content
    const slides = await generateSlides(section.title, section.summary, lessonPlan, geminiApiKey);
    
    // c. Generate narration script
    const script = await generateScript(section.title, slides, geminiApiKey);
    
    // d. Optionally, generate TTS audio
    let audioUrl: string | undefined;
    if (generateAudio) {
      // audioUrl = await generateTTS(script, geminiApiKey);
      console.log('TTS audio generation not yet implemented');
    }

    detailedSections.push({
      ...section,
      lessonPlan,
      slides,
      script,
      audioUrl
    });
  }

  // 4. Return structured course object
  return {
    title: topic,
    description,
    sections: detailedSections
  };
};

/**
 * Parses the research text into an array of section objects using Gemini.
 */
const parseResearchIntoSections = async (
  research: string,
  topic: string,
  geminiApiKey: string
): Promise<Array<{ title: string; summary: string }>> => {
  const prompt = `
Based on the following research about "${topic}", break it down into 6-8 logical sections or chapters for an online course.

Research:
${research}

Please provide a response in the following JSON format:
{
  "sections": [
    {
      "title": "Section Title",
      "summary": "Brief summary of what this section will cover (2-3 sentences)"
    }
  ]
}

Each section should:
- Have a clear, descriptive title
- Cover a distinct aspect of the topic
- Build logically on previous sections
- Be suitable for a 15-30 minute lesson

IMPORTANT: Return ONLY the JSON object, no additional text or formatting.
`;

  try {
    const response = await generateContent('Course Structure', prompt, geminiApiKey);
    
    // Clean the response to extract JSON
    let cleanResponse = response.trim();
    cleanResponse = cleanResponse.replace(/```json\s*|\s*```/g, '');
    cleanResponse = cleanResponse.replace(/```\s*|\s*```/g, '');
    
    const jsonMatch = cleanResponse.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No valid JSON found in response');
    }
    
    const data = JSON.parse(jsonMatch[0]);
    return data.sections || [];
  } catch (error) {
    console.error('Error parsing research into sections:', error);
    // Fallback to basic structure
    return [
      { title: 'Introduction', summary: 'Overview of the topic.' },
      { title: 'Main Concepts', summary: 'Key ideas and principles.' },
      { title: 'Applications', summary: 'How the topic is used in practice.' },
      { title: 'Conclusion', summary: 'Summary and next steps.' }
    ];
  }
};

/**
 * Generates a detailed lesson plan for a section.
 */
const generateLessonPlan = async (
  sectionTitle: string,
  sectionSummary: string,
  geminiApiKey: string
): Promise<string> => {
  const prompt = `
Create a detailed lesson plan for the section "${sectionTitle}".

Section Summary: ${sectionSummary}

Please create a comprehensive lesson plan that includes:
1. Learning Objectives (3-5 specific, measurable objectives)
2. Key Concepts (main ideas to be covered)
3. Lesson Structure (timeline for 15-30 minute lesson)
4. Activities/Exercises (interactive elements for students)
5. Assessment/Quiz Questions (3-5 questions to test understanding)
6. Additional Resources (suggested readings, videos, etc.)

Format the response in a clear, structured manner suitable for an instructor to follow.
`;

  return await generateContent(sectionTitle, prompt, geminiApiKey);
};

/**
 * Generates Google Slides content for a section.
 */
const generateSlides = async (
  sectionTitle: string,
  sectionSummary: string,
  lessonPlan: string,
  geminiApiKey: string
): Promise<string[]> => {
  const prompt = `
Create Google Slides content for the section "${sectionTitle}".

Section Summary: ${sectionSummary}

Lesson Plan Context: ${lessonPlan}

Please create 8-12 slides with the following structure:
- Slide 1: Title slide with section title
- Slides 2-3: Introduction and overview
- Slides 4-8: Main content (key concepts, examples, activities)
- Slide 9-10: Summary and key takeaways
- Slide 11: Quiz/Assessment questions
- Slide 12: Next steps and additional resources

For each slide, provide:
- Slide title
- 3-5 bullet points or key content
- Any speaker notes or additional context

Format as a JSON array:
[
  {
    "title": "Slide Title",
    "content": ["Bullet point 1", "Bullet point 2", "Bullet point 3"],
    "notes": "Speaker notes or additional context"
  }
]

IMPORTANT: Return ONLY the JSON array, no additional text or formatting.
`;

  try {
    const response = await generateContent(sectionTitle, prompt, geminiApiKey);
    
    // Clean the response to extract JSON
    let cleanResponse = response.trim();
    cleanResponse = cleanResponse.replace(/```json\s*|\s*```/g, '');
    cleanResponse = cleanResponse.replace(/```\s*|\s*```/g, '');
    
    const jsonMatch = cleanResponse.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error('No valid JSON array found in response');
    }
    
    const slides = JSON.parse(jsonMatch[0]);
    return slides.map((slide: any) => 
      `${slide.title}\n${slide.content.join('\n')}\n\nNotes: ${slide.notes || ''}`
    );
  } catch (error) {
    console.error('Error generating slides:', error);
    // Fallback to basic slides
    return [
      `Title: ${sectionTitle}\nIntroduction to the topic\n\nNotes: Welcome to this section`,
      `Key Concepts\n• Main point 1\n• Main point 2\n• Main point 3\n\nNotes: Cover these essential concepts`,
      `Summary\n• Key takeaway 1\n• Key takeaway 2\n• Next steps\n\nNotes: Wrap up the section`
    ];
  }
};

/**
 * Generates a narration script for the slides.
 */
const generateScript = async (
  sectionTitle: string,
  slides: string[],
  geminiApiKey: string
): Promise<string> => {
  const slidesText = slides.join('\n\n---\n\n');
  
  const prompt = `
Create a narration script for the section "${sectionTitle}" based on these slides:

${slidesText}

Please create a natural, engaging narration script that:
- Flows smoothly between slides
- Uses conversational, educational tone
- Includes transitions between topics
- Is suitable for 15-30 minute audio recording
- Provides additional context and explanations
- Uses clear, professional language

Format the script with clear markers for each slide and timing estimates.
`;

  return await generateContent(sectionTitle, prompt, geminiApiKey);
};