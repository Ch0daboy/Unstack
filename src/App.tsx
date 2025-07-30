import React, { useState } from 'react';
import { useEffect } from 'react';
import { Menu, User } from 'lucide-react';
import AuthWrapper from './components/AuthWrapper';
import { supabase } from './lib/supabase';
import BookSidebar from './components/BookSidebar';
import BookPrompt from './components/BookPrompt';
import OutlineView from './components/OutlineView';
import ChapterView from './components/ChapterView';
import OnlineCourseChapterView from './components/OnlineCourseChapterView';
import BookEditor from './components/BookEditor';
import PersonaManagement from './components/PersonaManagement';
import { Book, BookChapter, SubChapter, WritingPersona } from './types';
import { saveBook, loadBook } from './services/bookService';

function App() {
  const [currentStep, setCurrentStep] = useState<'prompt' | 'outline' | 'chapter' | 'edit' | 'personas'>('prompt');
  const [book, setBook] = useState<Book | null>(null);
  const [selectedChapter, setSelectedChapter] = useState<BookChapter | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedPersona, setSelectedPersona] = useState<WritingPersona | null>(null);
  
  // Handle OAuth callback
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        // OAuth callback successful
        console.log('OAuth sign in successful');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const apiKeys = {
    gemini: import.meta.env.VITE_GEMINI_API_KEY || '',
    perplexity: import.meta.env.VITE_PERPLEXITY_API_KEY || ''
  };

  const handleBookGenerated = (generatedBook: Book) => {
    saveBookToDatabase(generatedBook);
    setBook(generatedBook);
    setCurrentStep('outline');
  };

  const saveBookToDatabase = async (bookToSave: Book) => {
    try {
      await saveBook(bookToSave);
    } catch (error) {
      console.error('Error saving book:', error);
    }
  };

  const handleChapterClick = (chapter: BookChapter) => {
    setSelectedChapter(chapter);
    setCurrentStep('chapter');
  };

  const handleBackToOutline = () => {
    setSelectedChapter(null);
    setCurrentStep('outline');
  };

  const handleUpdateChapter = (updatedChapter: BookChapter) => {
    if (!book) return;
    
    const updatedChapters = book.chapters.map(ch => 
      ch.id === updatedChapter.id ? updatedChapter : ch
    );
    
    const updatedBook = { ...book, chapters: updatedChapters };
    setBook(updatedBook);
    setSelectedChapter(updatedChapter);
    
    // Auto-save progress
    saveBookToDatabase(updatedBook);
  };

  const handleNewBook = () => {
    setBook(null);
    setSelectedChapter(null);
    setCurrentStep('prompt');
  };

  const handleSelectBook = async (selectedBook: Book) => {
    try {
      const fullBook = await loadBook(selectedBook.id);
      if (fullBook) {
        setBook(fullBook);
        setSelectedChapter(null);
        // Check if we're in edit mode from URL hash
        const hash = window.location.hash;
        if (hash.startsWith('#edit/')) {
          setCurrentStep('edit');
        } else {
          setCurrentStep('outline');
        }
        setSidebarOpen(false);
      }
    } catch (error) {
      console.error('Error loading book:', error);
      alert('Failed to load book. Please try again.');
    }
  };

  const handleNewBookFromSidebar = () => {
    setBook(null);
    setSelectedChapter(null);
    setCurrentStep('prompt');
    setSidebarOpen(false);
  };

  const handleEditBook = () => {
    if (book) {
      setCurrentStep('edit');
      window.location.hash = `#edit/${book.id}`;
    }
  };

  const handleBackFromEdit = () => {
    setCurrentStep('outline');
    window.location.hash = '';
  };

  // Handle URL hash changes for edit mode
  React.useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      if (hash.startsWith('#edit/') && book) {
        setCurrentStep('edit');
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [book]);

  const renderChapterView = () => {
    if (currentStep === 'chapter' && selectedChapter && book) {
      if (book.genre === 'Online Course Generator') {
        return (
          <OnlineCourseChapterView
            chapter={selectedChapter}
            onBack={handleBackToOutline}
            onUpdateChapter={handleUpdateChapter}
            apiKeys={apiKeys}
          />
        );
      } else {
        return (
          <ChapterView
            chapter={selectedChapter}
            onBack={handleBackToOutline}
            onUpdateChapter={handleUpdateChapter}
            apiKeys={apiKeys}
          />
        );
      }
    }
    return null;
  };

  return (
    <AuthWrapper>
      <div className="flex h-screen">
        {/* Sidebar */}
        <BookSidebar
          isOpen={sidebarOpen}
          onToggle={() => setSidebarOpen(!sidebarOpen)}
          onSelectBook={handleSelectBook}
          onNewBook={handleNewBookFromSidebar}
          currentBookId={book?.id}
        />

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <header className="bg-white shadow-sm border-b border-gray-200 px-4 py-4 lg:px-8">
            <div className="flex items-center justify-between">
              {/* Left side - Navigation */}
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                  className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors duration-200"
                >
                  <Menu className="w-5 h-5 text-gray-600" />
                </button>

                <button
                  onClick={() => {
                    console.log('Personas button clicked!');
                    setCurrentStep('personas');
                  }}
                  className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all duration-200 shadow-sm ${
                    currentStep === 'personas'
                      ? 'bg-indigo-600 text-white shadow-md'
                      : 'bg-white text-gray-700 border border-gray-300 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-300'
                  }`}
                >
                  <User className="w-5 h-5" />
                  <span>Writing Personas</span>
                </button>
              </div>

              {/* Right side - empty for now, can add user menu later */}
              <div className="flex items-center gap-2">
                {/* Future: User menu, settings, etc. */}
              </div>
            </div>
          </header>

          {/* Content */}
          <main className="flex-1 overflow-y-auto p-4 lg:p-8">
            <div className="max-w-6xl mx-auto">

              {currentStep === 'prompt' && (
                <BookPrompt 
                  onBookGenerated={handleBookGenerated}
                  apiKeys={apiKeys}
                />
              )}

              {currentStep === 'outline' && book && (
                <OutlineView 
                  book={book}
                  onChapterClick={handleChapterClick}
                  onNewBook={handleNewBook}
                  onUpdateBook={(updatedBook) => {
                    setBook(updatedBook);
                    saveBookToDatabase(updatedBook);
                  }}
                  apiKeys={apiKeys}
                />
              )}

              {renderChapterView()}

              {currentStep === 'edit' && book && (
                <BookEditor
                  book={book}
                  onBack={handleBackFromEdit}
                  onUpdateBook={(updatedBook) => {
                    setBook(updatedBook);
                    saveBookToDatabase(updatedBook);
                  }}
                  apiKeys={apiKeys}
                />
              )}

              {currentStep === 'personas' && (
                <PersonaManagement
                  apiKeys={apiKeys}
                  onPersonaSelect={setSelectedPersona}
                  selectedPersonaId={selectedPersona?.id}
                />
              )}
            </div>
          </main>
        </div>
      </div>
    </AuthWrapper>
  );
}

export default App;