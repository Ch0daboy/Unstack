import React, { useState, useEffect } from 'react';
import { ArrowLeft, FileText, Play, Image, Volume2 } from 'lucide-react';
import { Book, BookChapter } from '../types';
import { generateBlogArticle, generateLessonPlan } from '../services/geminiService';
import { generateFeaturedImage } from '../services/coverService';
import { generateLessonPlanAudio, getAvailableVoices } from '../services/ttsService';

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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors duration-200"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Outline
        </button>
      </div>

      {/* Chapter Info */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h1 className="text-3xl font-bold text-gray-800 mb-3">{chapter.title}</h1>
        <p className="text-gray-600 text-lg">{chapter.description}</p>
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Blog Article Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <FileText className="w-5 h-5 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-800">Blog Article</h2>
          </div>

          <div className="space-y-4">
            <button
              onClick={handleGenerateArticle}
              disabled={isGeneratingArticle}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 px-6 rounded-xl font-medium hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2"
            >
              {isGeneratingArticle ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Generating...
                </>
              ) : (
                <>
                  <FileText className="w-5 h-5" />
                  Generate Blog Article
                </>
              )}
            </button>

            {featuredImage && (
              <div className="mt-4">
                <img src={featuredImage} alt="Featured Image" className="w-full rounded-lg shadow-sm" />
              </div>
            )}

            <button
              onClick={handleGenerateImage}
              disabled={isGeneratingImage}
              className="w-full bg-gradient-to-r from-green-600 to-teal-600 text-white py-3 px-6 rounded-xl font-medium hover:from-green-700 hover:to-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2"
            >
              {isGeneratingImage ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Generating...
                </>
              ) : (
                <>
                  <Image className="w-5 h-5" />
                  Generate Featured Image
                </>
              )}
            </button>

            {blogArticle && (
              <textarea
                value={blogArticle}
                readOnly
                className="w-full h-96 p-4 border border-gray-300 rounded-lg bg-gray-50 text-sm font-mono resize-none focus:outline-none"
                placeholder="Generated blog article will appear here..."
              />
            )}
          </div>
        </div>

        {/* Lesson Plan Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Play className="w-5 h-5 text-purple-600" />
            <h2 className="text-xl font-semibold text-gray-800">Lesson Plan</h2>
          </div>

          <div className="space-y-4">
            <button
              onClick={handleGenerateLessonPlan}
              disabled={isGeneratingLessonPlan}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3 px-6 rounded-xl font-medium hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2"
            >
              {isGeneratingLessonPlan ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Generating...
                </>
              ) : (
                <>
                  <Play className="w-5 h-5" />
                  Generate Lesson Plan
                </>
              )}
            </button>

            <button
              onClick={handleGenerateAudio}
              disabled={isGeneratingAudio || !lessonPlan}
              className="w-full bg-gradient-to-r from-orange-600 to-red-600 text-white py-3 px-6 rounded-xl font-medium hover:from-orange-700 hover:to-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2"
            >
              {isGeneratingAudio ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Generating Audio...
                </>
              ) : (
                <>
                  <Volume2 className="w-5 h-5" />
                  Generate Audio
                </>
              )}
            </button>

            {lessonPlan && (
              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <h3 className="text-lg font-bold text-gray-800 mb-4">{lessonPlan.title}</h3>
                <div className="space-y-4">
                  {lessonPlan.slides.map((slide: any, index: number) => (
                    <div key={index} className="bg-white p-4 rounded-lg border border-gray-200">
                      <h4 className="font-semibold text-gray-800 mb-2">{slide.title}</h4>
                      <p className="text-gray-700 mb-2">{slide.content}</p>
                      <p className="text-sm text-gray-600 italic mb-2">{slide.script}</p>
                      {slide.audioUrl && (
                        <audio controls src={slide.audioUrl} className="w-full mt-2" />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OnlineCourseChapterView;
