import React, { useState, useEffect } from 'react';
import { Book, BookChapter } from '../types';
import { generateBlogArticle, generateLessonPlan } from '../services/geminiService';
import { generateFeaturedImage } from '../services/coverService';
import { generateLessonPlanAudio, getAvailableVoices } from '../services/ttsService';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface OnlineCourseChapterViewProps {
  chapter: BookChapter;
  onBack: () => void;
  onUpdateChapter: (updatedChapter: BookChapter) => void;
  apiKeys: { gemini: string; perplexity: string };
}

const OnlineCourseChapterView: React.FC<OnlineCourseChapterViewProps> = ({ chapter, onBack, onUpdateChapter, apiKeys }) => {
  const [blogArticle, setBlogArticle] = useState('');
  const [lessonPlan, setLessonPlan] = useState<any>(null);
  const [featuredImage, setFeaturedImage] = useState('');
  const [isGeneratingArticle, setIsGeneratingArticle] = useState(false);
  const [isGeneratingLessonPlan, setIsGeneratingLessonPlan] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);

  const handleGenerateArticle = async () => {
    setIsGeneratingArticle(true);
    try {
      const article = await generateBlogArticle(chapter.title, chapter.description, apiKeys.gemini);
      setBlogArticle(article);
    } catch (error) {
      console.error('Error generating blog article:', error);
      alert('Failed to generate blog article.');
    } finally {
      setIsGeneratingArticle(false);
    }
  };

  const handleGenerateLessonPlan = async () => {
    setIsGeneratingLessonPlan(true);
    try {
      const plan = await generateLessonPlan(chapter.title, chapter.description, apiKeys.gemini);
      setLessonPlan(JSON.parse(plan));
    } catch (error) {
      console.error('Error generating lesson plan:', error);
      alert('Failed to generate lesson plan.');
    } finally {
      setIsGeneratingLessonPlan(false);
    }
  };

  const handleGenerateImage = async () => {
    setIsGeneratingImage(true);
    try {
      const imageUrl = await generateFeaturedImage(chapter.title, chapter.description, apiKeys.gemini);
      setFeaturedImage(imageUrl);
    } catch (error) {
      console.error('Error generating featured image:', error);
      alert('Failed to generate featured image.');
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const handleGenerateAudio = async () => {
    if (!lessonPlan) {
      alert('Please generate the lesson plan first.');
      return;
    }
    setIsGeneratingAudio(true);
    try {
      const voices = getAvailableVoices();
      if (voices.length === 0) {
        alert('No voices available for text-to-speech.');
        return;
      }
      const audioLessonPlan = await generateLessonPlanAudio(lessonPlan, voices[0].voice);
      setLessonPlan(audioLessonPlan);
    } catch (error) {
      console.error('Error generating audio:', error);
      alert('Failed to generate audio.');
    } finally {
      setIsGeneratingAudio(false);
    }
  };

  return (
    <div>
      <Button onClick={onBack}>Back to Outline</Button>
      <h1 className="text-2xl font-bold my-4">{chapter.title}</h1>
      <p>{chapter.description}</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">
        <Card>
          <CardHeader>
            <CardTitle>Blog Article</CardTitle>
          </CardHeader>
          <CardContent>
            <Button onClick={handleGenerateArticle} disabled={isGeneratingArticle}>
              {isGeneratingArticle ? 'Generating...' : 'Generate Blog Article'}
            </Button>
            {featuredImage && <img src={featuredImage} alt="Featured Image" className="mt-4" />}
            <Button onClick={handleGenerateImage} disabled={isGeneratingImage} className="mt-4">
              {isGeneratingImage ? 'Generating...' : 'Generate Featured Image'}
            </Button>
            <Textarea value={blogArticle} readOnly className="mt-4 h-96" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Lesson Plan</CardTitle>
          </CardHeader>
          <CardContent>
            <Button onClick={handleGenerateLessonPlan} disabled={isGeneratingLessonPlan}>
              {isGeneratingLessonPlan ? 'Generating...' : 'Generate Lesson Plan'}
            </Button>
            <Button onClick={handleGenerateAudio} disabled={isGeneratingAudio || !lessonPlan} className="ml-4">
              {isGeneratingAudio ? 'Generating Audio...' : 'Generate Audio'}
            </Button>
            {lessonPlan && (
              <div className="mt-4">
                <h2 className="font-bold">{lessonPlan.title}</h2>
                {lessonPlan.slides.map((slide: any, index: number) => (
                  <div key={index} className="mt-4">
                    <h3 className="font-semibold">{slide.title}</h3>
                    <p>{slide.content}</p>
                    <p className="text-sm text-gray-600">{slide.script}</p>
                    {slide.audioUrl && <audio controls src={slide.audioUrl} className="mt-2" />}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default OnlineCourseChapterView;
