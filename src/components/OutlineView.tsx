import React, { useState } from 'react';
import { BookOpen, ChevronRight, Play, Search, RotateCcw, Download, FileText, Heart, Image, Palette, Edit3, Volume2 } from 'lucide-react';
import { Book, BookChapter, AudiobookData } from '../types';
import { generateAllContent, generateAllContentWithResearch, convertRomanceHeatLevel } from '../services/contentService';
import { exportToPDF, exportToEPUB } from '../services/exportService';
import { generateBookCover, generateBookCoverWithDALLE } from '../services/coverService';
import AudiobookGenerator from './AudiobookGenerator';

interface OutlineViewProps {
  book: Book;
  onChapterClick: (chapter: BookChapter) => void;
  onNewBook: () => void;
  onUpdateBook: (book: Book) => void;
  apiKeys: {gemini: string; perplexity: string};
}

const OutlineView: React.FC<OutlineViewProps> = ({ 
  book, 
  onChapterClick, 
  onNewBook, 
  onUpdateBook, 
  apiKeys 
}) => {
  const [isGeneratingAll, setIsGeneratingAll] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const [showHeatLevelSelector, setShowHeatLevelSelector] = useState(false);
  const [isGeneratingCover, setIsGeneratingCover] = useState(false);
  const [showCoverOptions, setShowCoverOptions] = useState(false);
  const [showCoverModal, setShowCoverModal] = useState(false);
  const [selectedNewHeatLevel, setSelectedNewHeatLevel] = useState('');
  const [showAudiobookGenerator, setShowAudiobookGenerator] = useState(false);

  const HEAT_LEVELS = [
    { value: 'clean', label: 'Clean/Wholesome' },
    { value: 'sweet', label: 'Sweet' },
    { value: 'sensual', label: 'Sensual/Warm' },
    { value: 'steamy', label: 'Steamy/Hot' },
    { value: 'spicy', label: 'Spicy/Erotic' },
    { value: 'explicit', label: 'Explicit/Pornographic' }
  ];

  const handleGenerateAll = async (withResearch: boolean = false) => {
    setIsGeneratingAll(true);
    try {
      let updatedBook = { ...book };
      
      if (withResearch) {
        updatedBook = await generateAllContentWithResearch(updatedBook, apiKeys, (progress) => {
          onUpdateBook(progress);
        });
      } else {
        updatedBook = await generateAllContent(updatedBook, apiKeys.gemini, (progress) => {
          onUpdateBook(progress);
        });
      }
      
      onUpdateBook(updatedBook);
    } catch (error) {
      console.error('Error generating all content:', error);
      alert('Failed to generate all content. Please try again.');
    } finally {
      setIsGeneratingAll(false);
    }
  };

  const handleConvertHeatLevel = async () => {
    if (!selectedNewHeatLevel) return;
    
    setIsConverting(true);
    try {
      const convertedBook = await convertRomanceHeatLevel(
        book, 
        selectedNewHeatLevel, 
        apiKeys, 
        (progress) => {
          // You might want to show this as a separate book or update in place
          console.log('Conversion progress:', progress);
        }
      );
      
      // For now, we'll replace the current book with the converted one
      // In a full app, you might want to create a new book entry
      onUpdateBook(convertedBook);
      setShowHeatLevelSelector(false);
      setSelectedNewHeatLevel('');
    } catch (error) {
      console.error('Error converting heat level:', error);
      alert('Failed to convert heat level. Please try again.');
    } finally {
      setIsConverting(false);
    }
  };
  const handleExport = async (format: 'pdf' | 'epub') => {
    setIsExporting(true);
    try {
      if (format === 'pdf') {
        await exportToPDF(book);
      } else {
        await exportToEPUB(book);
      }
    } catch (error) {
      console.error('Error exporting book:', error);
      alert(`Failed to export book as ${format.toUpperCase()}. Please try again.`);
    } finally {
      setIsExporting(false);
    }
  };

  const handleAudiobookGenerated = (audiobook: AudiobookData) => {
    // Update the book with the generated audiobook
    const updatedBook = { ...book, audiobook };
    onUpdateBook(updatedBook);
  };

  const handleGenerateCover = async (useDALLE: boolean = false) => {
    let apiKey: string;

    if (useDALLE) {
      // For DALL-E, we still need OpenAI API key
      const userApiKey = prompt('Enter your OpenAI API key for DALL-E:');
      if (!userApiKey) return;
      apiKey = userApiKey;
    } else {
      // For Gemini Imagen, use the existing Gemini API key
      apiKey = apiKeys.gemini;
    }
    
    setIsGeneratingCover(true);
    try {
      const coverUrl = useDALLE 
        ? await generateBookCoverWithDALLE(book, apiKey)
        : await generateBookCover(book, apiKey);
      
      const updatedBook = { ...book, coverUrl };
      onUpdateBook(updatedBook);
      setShowCoverOptions(false);
    } catch (error) {
      console.error('Error generating cover:', error);

      let errorMessage = 'Failed to generate cover.';

      if (error instanceof Error) {
        if (error.message.includes('content policies') || error.message.includes('policy')) {
          errorMessage = `Google AI rejected this image due to content policies.

This can happen with fantasy themes (dragons, castles, etc.).

Solutions:
• Try a simpler prompt (e.g., "abstract book cover design")
• Use DALL-E instead (click DALL-E button)
• Modify the book genre or description

Would you like to try DALL-E instead?`;

          if (confirm(errorMessage)) {
            // Automatically try DALL-E
            setTimeout(() => handleGenerateCover(true), 100);
            return;
          }
        } else if (error.message.includes('API key') || error.message.includes('access denied')) {
          errorMessage = `API Key Issue: ${error.message}

Your API key works for text but may need additional permissions for image generation.`;
        } else {
          errorMessage = `Cover generation failed: ${error.message}

You can try DALL-E as an alternative.`;
        }
      }

      alert(errorMessage);
    } finally {
      setIsGeneratingCover(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-100';
      case 'generating': return 'text-blue-600 bg-blue-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const completedChapters = book.chapters.filter(ch => ch.status === 'completed').length;
  const progressPercentage = (completedChapters / book.chapters.length) * 100;
  const isBookCompleted = completedChapters === book.chapters.length && book.chapters.every(ch => 
    ch.subChapters && ch.subChapters.every(sc => sc.status === 'completed')
  );
  const isRomanceBook = book.genre.toLowerCase() === 'romance';

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl shadow-xl p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-start gap-6">
            <div className="flex-shrink-0">
              {book.coverUrl ? (
                <div className="relative group cursor-pointer" onClick={() => setShowCoverModal(true)}>
                  <img
                    src={book.coverUrl}
                    alt={`${book.title} cover`}
                    className="w-48 h-72 object-cover rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 border-2 border-gray-200 hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 rounded-xl transition-all duration-300 flex items-center justify-center">
                    <div className="opacity-0 group-hover:opacity-100 bg-white bg-opacity-90 rounded-full p-2 transition-opacity duration-300">
                      <Search className="w-5 h-5 text-gray-700" />
                    </div>
                  </div>
                  <div className="absolute bottom-2 right-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full shadow-md">
                    AI Generated
                  </div>
                  <div className="absolute top-2 left-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded-full">
                    Click to enlarge
                  </div>
                </div>
              ) : (
                <div className="w-48 h-72 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center shadow-lg border-2 border-gray-200">
                  <div className="text-center text-white">
                    <BookOpen className="w-16 h-16 mx-auto mb-2" />
                    <p className="text-sm font-medium">No Cover Yet</p>
                    <p className="text-xs opacity-80">Generate one below</p>
                  </div>
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-3xl font-bold text-gray-800 mb-2">{book.title}</h1>
              <div className="space-y-3">
                <p className="text-gray-600 text-lg leading-relaxed">{book.description}</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-gray-500">
                  <span><strong>Genre:</strong> {book.genre}</span>
                  {book.subGenre && <span><strong>Sub-Genre:</strong> {book.subGenre}</span>}
                  <span><strong>Tone:</strong> {book.tone}</span>
                  {book.perspective && <span><strong>Perspective:</strong> {book.perspective === 'first' ? 'First Person' : book.perspective === 'third-limited' ? 'Third Person Limited' : book.perspective === 'third-omniscient' ? 'Third Person Omniscient' : book.perspective === 'second' ? 'Second Person' : book.perspective}</span>}
                  {book.heatLevel && book.genre.toLowerCase() === 'romance' && (
                    <span><strong>Heat Level:</strong> {book.heatLevel}</span>
                  )}
                </div>
              </div>
            </div>
          </div>
          <button
            onClick={onNewBook}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors duration-200 flex items-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            New Book
          </button>
        </div>

        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-700">Progress</span>
            <span className="text-sm text-gray-600">{completedChapters}/{book.chapters.length} chapters</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-gradient-to-r from-green-500 to-blue-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progressPercentage}%` }}
            ></div>
          </div>
        </div>

        {/* Action Buttons */}
        {isBookCompleted ? (
          <div className="space-y-4">
            <div className="flex items-center justify-center gap-2 text-green-600 bg-green-50 py-3 px-6 rounded-xl">
              <FileText className="w-5 h-5" />
              <span className="font-medium">Book completed! Ready for export.</span>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => window.location.hash = `#edit/${book.id}`}
                className="flex-1 bg-gradient-to-r from-orange-600 to-red-600 text-white py-3 px-6 rounded-xl font-medium hover:from-orange-700 hover:to-red-700 transition-all duration-200 flex items-center justify-center gap-2"
              >
                <Edit3 className="w-5 h-5" />
                Edit Book
              </button>
              
              {/* Cover Generation */}
              <div className="space-y-3">
                {!showCoverOptions ? (
                  <button
                    onClick={() => setShowCoverOptions(true)}
                    className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white py-3 px-6 rounded-xl font-medium hover:from-purple-700 hover:to-indigo-700 transition-all duration-200 flex items-center justify-center gap-2"
                  >
                    <Palette className="w-5 h-5" />
                    {book.coverUrl ? 'Regenerate Cover' : 'Generate Cover'}
                  </button>
                ) : (
                  <div className="bg-purple-50 p-4 rounded-xl space-y-3">
                    <h4 className="font-medium text-purple-900">Choose Cover Generation Service</h4>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleGenerateCover(false)}
                        disabled={isGeneratingCover}
                        title="Generate book cover using Google AI (Vertex AI Imagen + Gemini fallback)"
                        className="flex-1 bg-gradient-to-r from-green-600 to-blue-600 text-white py-2 px-4 rounded-lg font-medium hover:from-green-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2"
                      >
                        <Image className="w-4 h-4" />
                        {isGeneratingCover ? 'Generating...' : 'Google AI'}
                      </button>
                      <button
                        onClick={() => handleGenerateCover(true)}
                        disabled={isGeneratingCover}
                        className="flex-1 bg-gradient-to-r from-green-600 to-teal-600 text-white py-2 px-4 rounded-lg font-medium hover:from-green-700 hover:to-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2"
                      >
                        <Palette className="w-4 h-4" />
                        {isGeneratingCover ? 'Generating...' : 'DALL-E'}
                      </button>
                    </div>
                    <button
                      onClick={() => setShowCoverOptions(false)}
                      className="w-full px-4 py-2 text-purple-600 hover:text-purple-800 transition-colors duration-200"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
              
              {isRomanceBook && (
                <div className="space-y-3">
                  {!showHeatLevelSelector ? (
                    <button
                      onClick={() => setShowHeatLevelSelector(true)}
                      className="w-full bg-gradient-to-r from-pink-600 to-rose-600 text-white py-3 px-6 rounded-xl font-medium hover:from-pink-700 hover:to-rose-700 transition-all duration-200 flex items-center justify-center gap-2"
                    >
                      <Heart className="w-5 h-5" />
                      Create Version with Different Heat Level
                    </button>
                  ) : (
                    <div className="bg-pink-50 p-4 rounded-xl space-y-3">
                      <h4 className="font-medium text-pink-900">Convert to Different Heat Level</h4>
                      <select
                        value={selectedNewHeatLevel}
                        onChange={(e) => setSelectedNewHeatLevel(e.target.value)}
                        className="w-full px-3 py-2 border border-pink-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                      >
                        <option value="">Select new heat level...</option>
                        {HEAT_LEVELS.filter(level => level.value !== book.heatLevel).map((level) => (
                          <option key={level.value} value={level.value}>
                            {level.label}
                          </option>
                        ))}
                      </select>
                      <div className="flex gap-2">
                        <button
                          onClick={handleConvertHeatLevel}
                          disabled={!selectedNewHeatLevel || isConverting}
                          className="flex-1 bg-gradient-to-r from-pink-600 to-rose-600 text-white py-2 px-4 rounded-lg font-medium hover:from-pink-700 hover:to-rose-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                        >
                          {isConverting ? 'Converting...' : 'Convert'}
                        </button>
                        <button
                          onClick={() => {
                            setShowHeatLevelSelector(false);
                            setSelectedNewHeatLevel('');
                          }}
                          className="px-4 py-2 text-pink-600 hover:text-pink-800 transition-colors duration-200"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <button
                onClick={() => handleExport('pdf')}
                disabled={isExporting}
                className="flex-1 bg-gradient-to-r from-red-600 to-pink-600 text-white py-3 px-6 rounded-xl font-medium hover:from-red-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2"
              >
                <Download className="w-5 h-5" />
                {isExporting ? 'Exporting...' : 'Export as PDF'}
              </button>
              <button
                onClick={() => handleExport('epub')}
                disabled={isExporting}
                className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3 px-6 rounded-xl font-medium hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2"
              >
                <Download className="w-5 h-5" />
                {isExporting ? 'Exporting...' : 'Export as EPUB'}
              </button>
              <button
                onClick={() => setShowAudiobookGenerator(true)}
                className="flex-1 bg-gradient-to-r from-green-600 to-teal-600 text-white py-3 px-6 rounded-xl font-medium hover:from-green-700 hover:to-teal-700 transition-all duration-200 flex items-center justify-center gap-2"
              >
                <Volume2 className="w-5 h-5" />
                Create Audiobook
              </button>
            </div>
          </div>
        ) : (
          <div className="flex gap-3">
            {/* Cover Generation */}
            <div className="space-y-3">
              {!showCoverOptions ? (
                <button
                  onClick={() => setShowCoverOptions(true)}
                  className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white py-3 px-6 rounded-xl font-medium hover:from-purple-700 hover:to-indigo-700 transition-all duration-200 flex items-center justify-center gap-2"
                >
                  <Palette className="w-5 h-5" />
                  Generate Cover
                </button>
              ) : (
                <div className="bg-purple-50 p-4 rounded-xl space-y-3">
                  <h4 className="font-medium text-purple-900">Choose Cover Generation Service</h4>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleGenerateCover(false)}
                      disabled={isGeneratingCover}
                      title="Generate book cover using Google AI (Vertex AI Imagen + Gemini fallback)"
                      className="flex-1 bg-gradient-to-r from-green-600 to-blue-600 text-white py-2 px-4 rounded-lg font-medium hover:from-green-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2"
                    >
                      <Image className="w-4 h-4" />
                      {isGeneratingCover ? 'Generating...' : 'Google AI'}
                    </button>
                    <button
                      onClick={() => handleGenerateCover(true)}
                      disabled={isGeneratingCover}
                      className="flex-1 bg-gradient-to-r from-green-600 to-teal-600 text-white py-2 px-4 rounded-lg font-medium hover:from-green-700 hover:to-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2"
                    >
                      <Palette className="w-4 h-4" />
                      {isGeneratingCover ? 'Generating...' : 'DALL-E'}
                    </button>
                  </div>
                  <button
                    onClick={() => setShowCoverOptions(false)}
                    className="w-full px-4 py-2 text-purple-600 hover:text-purple-800 transition-colors duration-200"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
            
            <button
              onClick={() => window.location.hash = `#edit/${book.id}`}
              className="flex-1 bg-gradient-to-r from-orange-600 to-red-600 text-white py-3 px-6 rounded-xl font-medium hover:from-orange-700 hover:to-red-700 transition-all duration-200 flex items-center justify-center gap-2"
            >
              <Edit3 className="w-5 h-5" />
              Edit Book
            </button>
            
            <button
              onClick={() => handleGenerateAll(false)}
              disabled={isGeneratingAll}
              className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 px-6 rounded-xl font-medium hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2"
            >
              <Play className="w-5 h-5" />
              {isGeneratingAll ? 'Generating...' : 'Generate All'}
            </button>
            <button
              onClick={() => handleGenerateAll(true)}
              disabled={isGeneratingAll}
              className="flex-1 bg-gradient-to-r from-green-600 to-teal-600 text-white py-3 px-6 rounded-xl font-medium hover:from-green-700 hover:to-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2"
            >
              <Search className="w-5 h-5" />
              {isGeneratingAll ? 'Researching...' : 'Research & Generate All'}
            </button>
          </div>
        )}
      </div>

      {/* Chapters List */}
      <div className="space-y-4">
        {book.chapters.map((chapter, index) => (
          <div 
            key={chapter.id}
            className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 cursor-pointer group"
            onClick={() => onChapterClick(chapter)}
          >
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                    {index + 1}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800 group-hover:text-blue-600 transition-colors duration-200">
                      {chapter.title}
                    </h3>
                    <p className="text-gray-600 text-sm mt-1">{chapter.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(chapter.status)}`}>
                    {chapter.status === 'completed' ? 'Complete' : 
                     chapter.status === 'generating' ? 'Generating' : 'Pending'}
                  </span>
                  <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-blue-600 transition-colors duration-200" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Cover Image Modal */}
      {showCoverModal && book.coverUrl && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50" onClick={() => setShowCoverModal(false)}>
          <div className="relative max-w-2xl max-h-[90vh] bg-white rounded-2xl shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="absolute top-4 right-4 z-10">
              <button
                onClick={() => setShowCoverModal(false)}
                className="bg-black bg-opacity-50 hover:bg-opacity-70 text-white rounded-full p-2 transition-all duration-200"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6">
              <img
                src={book.coverUrl}
                alt={`${book.title} cover - Full Size`}
                className="w-full h-auto max-h-[80vh] object-contain rounded-lg shadow-lg"
              />
              <div className="mt-4 text-center">
                <h3 className="text-xl font-bold text-gray-800 mb-2">{book.title}</h3>
                <p className="text-gray-600 mb-3">by {book.author || 'Author Name'}</p>
                <div className="flex items-center justify-center gap-4 mb-3">
                  <div className="inline-flex items-center gap-2 bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    AI Generated Cover
                  </div>
                  <button
                    onClick={() => {
                      const link = document.createElement('a');
                      link.href = book.coverUrl!;
                      link.download = `${book.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_cover.png`;
                      link.click();
                    }}
                    className="inline-flex items-center gap-2 bg-blue-100 hover:bg-blue-200 text-blue-800 px-3 py-1 rounded-full text-sm transition-colors duration-200"
                  >
                    <Download className="w-3 h-3" />
                    Download
                  </button>
                </div>
                <p className="text-xs text-gray-500">Click outside to close</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Audiobook Generator Modal */}
      {showAudiobookGenerator && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <AudiobookGenerator
              book={book}
              onAudiobookGenerated={handleAudiobookGenerated}
              onClose={() => setShowAudiobookGenerator(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default OutlineView;