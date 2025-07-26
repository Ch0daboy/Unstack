import { Book, AudiobookData, AudioChapter, VoiceOption } from '../types';

// Voice selection logic based on book characteristics
export const analyzeBookForVoiceSelection = (book: Book): { recommendedGender: 'male' | 'female' | 'neutral'; confidence: number } => {
  let femaleScore = 0;
  let maleScore = 0;
  let confidence = 0.5; // Default confidence

  // Analyze perspective
  if (book.perspective === 'first') {
    confidence += 0.3;
    
    // Check for gender indicators in description and title
    const textToAnalyze = `${book.title} ${book.description}`.toLowerCase();
    
    // Female indicators
    const femaleIndicators = [
      'she', 'her', 'hers', 'herself', 'woman', 'girl', 'female', 'lady',
      'mother', 'daughter', 'sister', 'wife', 'girlfriend', 'princess', 'queen'
    ];
    
    // Male indicators  
    const maleIndicators = [
      'he', 'him', 'his', 'himself', 'man', 'boy', 'male', 'guy',
      'father', 'son', 'brother', 'husband', 'boyfriend', 'prince', 'king'
    ];
    
    femaleIndicators.forEach(indicator => {
      const matches = (textToAnalyze.match(new RegExp(`\\b${indicator}\\b`, 'g')) || []).length;
      femaleScore += matches * 0.1;
    });
    
    maleIndicators.forEach(indicator => {
      const matches = (textToAnalyze.match(new RegExp(`\\b${indicator}\\b`, 'g')) || []).length;
      maleScore += matches * 0.1;
    });
  }

  // Genre-based preferences
  const femaleGenres = ['romance', 'young adult', 'contemporary fiction', 'women\'s fiction'];
  const maleGenres = ['thriller', 'action', 'military', 'western'];
  
  if (femaleGenres.some(genre => book.genre.toLowerCase().includes(genre))) {
    femaleScore += 0.2;
    confidence += 0.1;
  }
  
  if (maleGenres.some(genre => book.genre.toLowerCase().includes(genre))) {
    maleScore += 0.2;
    confidence += 0.1;
  }

  // Determine recommendation
  if (femaleScore > maleScore + 0.1) {
    return { recommendedGender: 'female', confidence: Math.min(confidence + (femaleScore - maleScore), 0.9) };
  } else if (maleScore > femaleScore + 0.1) {
    return { recommendedGender: 'male', confidence: Math.min(confidence + (maleScore - femaleScore), 0.9) };
  } else {
    return { recommendedGender: 'neutral', confidence: 0.5 };
  }
};

// Get available voices and categorize them
export const getAvailableVoices = (): VoiceOption[] => {
  const voices = speechSynthesis.getVoices();
  
  return voices
    .filter(voice => voice.lang.startsWith('en')) // English voices only
    .map(voice => {
      const name = voice.name.toLowerCase();
      let gender: 'male' | 'female' | 'neutral' = 'neutral';
      
      // Categorize by common voice name patterns
      if (name.includes('female') || name.includes('woman') || 
          ['samantha', 'susan', 'victoria', 'karen', 'zira', 'hazel', 'moira'].some(n => name.includes(n))) {
        gender = 'female';
      } else if (name.includes('male') || name.includes('man') || 
                 ['alex', 'daniel', 'tom', 'david', 'mark', 'fred'].some(n => name.includes(n))) {
        gender = 'male';
      }
      
      return {
        voice,
        gender,
        language: voice.lang,
        isRecommended: false
      };
    })
    .sort((a, b) => {
      // Prioritize higher quality voices
      if (a.voice.localService !== b.voice.localService) {
        return a.voice.localService ? -1 : 1;
      }
      return a.voice.name.localeCompare(b.voice.name);
    });
};

// Select the best voice for a book
export const selectVoiceForBook = (book: Book, availableVoices?: VoiceOption[]): VoiceOption | null => {
  const voices = availableVoices || getAvailableVoices();
  if (voices.length === 0) return null;

  const analysis = analyzeBookForVoiceSelection(book);
  
  // Find voices matching the recommended gender
  const matchingVoices = voices.filter(v => v.gender === analysis.recommendedGender);
  
  if (matchingVoices.length > 0) {
    // Mark the first matching voice as recommended
    matchingVoices[0].isRecommended = true;
    return matchingVoices[0];
  }
  
  // Fallback to first available voice
  voices[0].isRecommended = true;
  return voices[0];
};

// Generate speech for text content
export const generateSpeech = (text: string, voice: SpeechSynthesisVoice, rate: number = 1): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    if (!('speechSynthesis' in window) || !('MediaRecorder' in window)) {
      reject(new Error('Speech synthesis or MediaRecorder not supported in this browser'));
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.voice = voice;
    utterance.rate = rate;
    utterance.pitch = 1;
    utterance.volume = 1;

    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const dest = audioContext.createMediaStreamDestination();
    const mediaRecorder = new MediaRecorder(dest.stream);

    const chunks: BlobPart[] = [];
    mediaRecorder.ondataavailable = (event) => {
      chunks.push(event.data);
    };

    mediaRecorder.onstop = () => {
      const blob = new Blob(chunks, { type: 'audio/webm;codecs=opus' });
      resolve(blob);
      audioContext.close();
    };

    const source = audioContext.createBufferSource(); // Dummy source to keep context running

    utterance.onstart = () => {
      mediaRecorder.start();
    };

    utterance.onend = () => {
      mediaRecorder.stop();
    };

    utterance.onerror = (event) => {
      reject(new Error(`Speech synthesis error: ${event.error}`));
    };

    // Hack to connect utterance to media recorder
    const utteranceSource = audioContext.createMediaStreamSource(dest.stream);
    utteranceSource.connect(audioContext.destination);
    
    speechSynthesis.speak(utterance);
  });
};

// Generate audiobook from book content
export const generateAudiobook = async (
  book: Book, 
  selectedVoice: SpeechSynthesisVoice,
  onProgress?: (progress: number, currentChapter: string) => void
): Promise<AudiobookData> => {
  const audioChapters: AudioChapter[] = [];
  let totalDuration = 0;

  for (let i = 0; i < book.chapters.length; i++) {
    const chapter = book.chapters[i];
    onProgress?.(i / book.chapters.length, chapter.title);

    // Combine chapter content
    let chapterText = `Chapter ${i + 1}: ${chapter.title}\n\n${chapter.description}\n\n`;
    
    if (chapter.subChapters) {
      chapter.subChapters.forEach((subChapter, subIndex) => {
        chapterText += `${subChapter.title}\n${subChapter.description}\n`;
        if (subChapter.content) {
          chapterText += `${subChapter.content}\n\n`;
        }
      });
    }

    try {
      const audioBlob = await generateSpeech(chapterText, selectedVoice);
      const audioUrl = URL.createObjectURL(audioBlob);
      
      // Estimate duration (rough calculation: ~150 words per minute)
      const wordCount = chapterText.split(' ').length;
      const estimatedDuration = (wordCount / 150) * 60; // seconds
      
      const audioChapter: AudioChapter = {
        id: `audio-${chapter.id}`,
        chapterId: chapter.id,
        title: chapter.title,
        audioBlob,
        audioUrl,
        duration: estimatedDuration,
        status: 'completed'
      };
      
      audioChapters.push(audioChapter);
      totalDuration += estimatedDuration;
    } catch (error) {
      console.error(`Error generating audio for chapter ${chapter.title}:`, error);
      audioChapters.push({
        id: `audio-${chapter.id}`,
        chapterId: chapter.id,
        title: chapter.title,
        status: 'error'
      });
    }
  }

  onProgress?.(1, 'Completed');

  return {
    id: `audiobook-${book.id}`,
    selectedVoice: selectedVoice.name,
    audioChapters,
    totalDuration,
    generatedAt: new Date().toISOString(),
    status: 'completed'
  };
};

// Clean up audio URLs to prevent memory leaks
export const cleanupAudiobook = (audiobook: AudiobookData): void => {
  audiobook.audioChapters.forEach(chapter => {
    if (chapter.audioUrl) {
      URL.revokeObjectURL(chapter.audioUrl);
    }
  });
};

// Format duration for display
export const formatDuration = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  } else {
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }
};

export const generateLessonPlanAudio = async (
  lessonPlan: any,
  voice: SpeechSynthesisVoice,
  onProgress?: (progress: number, currentSlide: string) => void
): Promise<any> => {
  const audioSlides: any[] = [];
  let totalDuration = 0;

  for (let i = 0; i < lessonPlan.slides.length; i++) {
    const slide = lessonPlan.slides[i];
    onProgress?.(i / lessonPlan.slides.length, slide.title);

    try {
      const audioBlob = await generateSpeech(slide.script, voice);
      const audioUrl = URL.createObjectURL(audioBlob);

      const wordCount = slide.script.split(' ').length;
      const estimatedDuration = (wordCount / 150) * 60;

      audioSlides.push({
        ...slide,
        audioBlob,
        audioUrl,
        duration: estimatedDuration,
        status: 'completed'
      });
      totalDuration += estimatedDuration;
    } catch (error) {
      console.error(`Error generating audio for slide ${slide.title}:`, error);
      audioSlides.push({
        ...slide,
        status: 'error'
      });
    }
  }

  onProgress?.(1, 'Completed');

  return {
    ...lessonPlan,
    slides: audioSlides,
    totalDuration,
    generatedAt: new Date().toISOString(),
    status: 'completed'
  };
};
