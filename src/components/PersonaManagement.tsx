import React, { useState, useEffect } from 'react';
import { WritingPersona } from '../types';
import { 
  getUserPersonas, 
  createPersona, 
  createPersonaFromSample, 
  updatePersona, 
  deletePersona, 
  togglePersonaFavorite 
} from '../services/personaService';
import { 
  Plus, 
  Upload, 
  Star, 
  Edit3, 
  Trash2, 
  FileText, 
  Brain, 
  User,
  Search,
  Filter,
  X,
  Save,
  Loader
} from 'lucide-react';

interface PersonaManagementProps {
  apiKeys: {
    gemini?: string;
    openai?: string;
    perplexity?: string;
  };
  onPersonaSelect?: (persona: WritingPersona) => void;
  selectedPersonaId?: string;
}

const PersonaManagement: React.FC<PersonaManagementProps> = ({ 
  apiKeys, 
  onPersonaSelect,
  selectedPersonaId 
}) => {
  const [personas, setPersonas] = useState<WritingPersona[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [editingPersona, setEditingPersona] = useState<WritingPersona | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterFavorites, setFilterFavorites] = useState(false);

  // Create persona form state
  const [createForm, setCreateForm] = useState({
    name: '',
    description: '',
    authorName: '',
    preferredGenres: '',
    specialInstructions: ''
  });

  // Upload form state
  const [uploadForm, setUploadForm] = useState({
    name: '',
    description: '',
    authorName: '',
    sampleText: ''
  });

  const [isCreating, setIsCreating] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  useEffect(() => {
    loadPersonas();
  }, []);

  const loadPersonas = async () => {
    try {
      setLoading(true);
      const data = await getUserPersonas();
      setPersonas(data);
    } catch (error) {
      console.error('Error loading personas:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePersona = async () => {
    if (!createForm.name.trim()) return;

    try {
      setIsCreating(true);
      const preferences = {
        preferredGenres: createForm.preferredGenres.split(',').map(g => g.trim()).filter(Boolean),
        avoidedTopics: [],
        specialInstructions: createForm.specialInstructions,
        targetAudience: []
      };

      await createPersona(
        createForm.name,
        createForm.description,
        createForm.authorName,
        preferences
      );

      setCreateForm({
        name: '',
        description: '',
        authorName: '',
        preferredGenres: '',
        specialInstructions: ''
      });
      setShowCreateModal(false);
      loadPersonas();
    } catch (error) {
      console.error('Error creating persona:', error);
      alert('Failed to create persona. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleAnalyzeAndCreate = async () => {
    if (!uploadForm.name.trim() || !uploadForm.sampleText.trim()) return;
    if (!apiKeys.gemini) {
      alert('Gemini API key is required for writing analysis');
      return;
    }

    try {
      setIsAnalyzing(true);
      await createPersonaFromSample(
        uploadForm.name,
        uploadForm.description,
        uploadForm.sampleText,
        apiKeys.gemini,
        uploadForm.authorName
      );

      setUploadForm({
        name: '',
        description: '',
        authorName: '',
        sampleText: ''
      });
      setShowUploadModal(false);
      loadPersonas();
    } catch (error) {
      console.error('Error analyzing writing sample:', error);
      alert('Failed to analyze writing sample. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleToggleFavorite = async (persona: WritingPersona) => {
    try {
      await togglePersonaFavorite(persona.id);
      loadPersonas();
    } catch (error) {
      console.error('Error toggling favorite:', error);
    }
  };

  const handleDeletePersona = async (persona: WritingPersona) => {
    if (!confirm(`Are you sure you want to delete "${persona.name}"?`)) return;

    try {
      await deletePersona(persona.id);
      loadPersonas();
    } catch (error) {
      console.error('Error deleting persona:', error);
      alert('Failed to delete persona. Please try again.');
    }
  };

  const filteredPersonas = personas.filter(persona => {
    const matchesSearch = persona.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         persona.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = !filterFavorites || persona.is_favorite;
    return matchesSearch && matchesFilter;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader className="w-6 h-6 animate-spin text-indigo-600" />
        <span className="ml-2 text-gray-600">Loading personas...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Writing Personas</h2>
          <p className="text-gray-600">Create and manage your writing styles</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create Persona
          </button>
          <button
            onClick={() => setShowUploadModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <Upload className="w-4 h-4" />
            Analyze Sample
          </button>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search personas..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>
        <button
          onClick={() => setFilterFavorites(!filterFavorites)}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
            filterFavorites 
              ? 'bg-yellow-100 text-yellow-800 border border-yellow-300' 
              : 'bg-gray-100 text-gray-600 border border-gray-300'
          }`}
        >
          <Star className={`w-4 h-4 ${filterFavorites ? 'fill-current' : ''}`} />
          Favorites
        </button>
      </div>

      {/* Personas Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredPersonas.map((persona) => (
          <div
            key={persona.id}
            className={`bg-white rounded-lg border-2 p-4 hover:shadow-md transition-all cursor-pointer ${
              selectedPersonaId === persona.id 
                ? 'border-indigo-500 bg-indigo-50' 
                : 'border-gray-200'
            }`}
            onClick={() => onPersonaSelect?.(persona)}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-600 rounded-full flex items-center justify-center">
                  <User className="w-4 h-4 text-white" />
                </div>
                <h3 className="font-semibold text-gray-800">{persona.name}</h3>
              </div>
              <div className="flex gap-1">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggleFavorite(persona);
                  }}
                  className={`p-1 rounded hover:bg-gray-100 ${
                    persona.is_favorite ? 'text-yellow-500' : 'text-gray-400'
                  }`}
                >
                  <Star className={`w-4 h-4 ${persona.is_favorite ? 'fill-current' : ''}`} />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeletePersona(persona);
                  }}
                  className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-red-500"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            <p className="text-gray-600 text-sm mb-3 line-clamp-2">{persona.description}</p>

            <div className="space-y-2">
              {persona.author_name && (
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <FileText className="w-3 h-3" />
                  Author: {persona.author_name}
                </div>
              )}
              
              {persona.analysis_results && (
                <div className="flex items-center gap-2 text-xs text-green-600">
                  <Brain className="w-3 h-3" />
                  AI Analyzed
                </div>
              )}

              {persona.preferences.preferredGenres.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {persona.preferences.preferredGenres.slice(0, 3).map((genre) => (
                    <span
                      key={genre}
                      className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded"
                    >
                      {genre}
                    </span>
                  ))}
                  {persona.preferences.preferredGenres.length > 3 && (
                    <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                      +{persona.preferences.preferredGenres.length - 3}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {filteredPersonas.length === 0 && (
        <div className="text-center py-12">
          <User className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-600 mb-2">
            {searchTerm || filterFavorites ? 'No personas found' : 'No personas yet'}
          </h3>
          <p className="text-gray-500 mb-4">
            {searchTerm || filterFavorites 
              ? 'Try adjusting your search or filters'
              : 'Create your first writing persona to get started'
            }
          </p>
          {!searchTerm && !filterFavorites && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              Create Your First Persona
            </button>
          )}
        </div>
      )}

      {/* Create Persona Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Create New Persona</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Persona Name *
                </label>
                <input
                  type="text"
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="e.g., Romantic Novelist, Mystery Writer"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={createForm.description}
                  onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  rows={3}
                  placeholder="Describe this writing style..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Author Name
                </label>
                <input
                  type="text"
                  value={createForm.authorName}
                  onChange={(e) => setCreateForm({ ...createForm, authorName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="Default author name for this persona"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Preferred Genres
                </label>
                <input
                  type="text"
                  value={createForm.preferredGenres}
                  onChange={(e) => setCreateForm({ ...createForm, preferredGenres: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="Romance, Fantasy, Mystery (comma-separated)"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Special Instructions
                </label>
                <textarea
                  value={createForm.specialInstructions}
                  onChange={(e) => setCreateForm({ ...createForm, specialInstructions: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  rows={2}
                  placeholder="Any specific writing guidelines or preferences..."
                />
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreatePersona}
                disabled={!createForm.name.trim() || isCreating}
                className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {isCreating ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Create Persona
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upload and Analyze Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Analyze Writing Sample</h3>
              <button
                onClick={() => setShowUploadModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Persona Name *
                </label>
                <input
                  type="text"
                  value={uploadForm.name}
                  onChange={(e) => setUploadForm({ ...uploadForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="e.g., Jane Austen Style, Hemingway Style"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={uploadForm.description}
                  onChange={(e) => setUploadForm({ ...uploadForm, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  rows={2}
                  placeholder="Describe this writing style..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Author Name
                </label>
                <input
                  type="text"
                  value={uploadForm.authorName}
                  onChange={(e) => setUploadForm({ ...uploadForm, authorName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="Author name for this style"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Writing Sample *
                </label>
                <textarea
                  value={uploadForm.sampleText}
                  onChange={(e) => setUploadForm({ ...uploadForm, sampleText: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  rows={8}
                  placeholder="Paste a representative writing sample here (at least 200 words for best analysis)..."
                />
                <p className="text-xs text-gray-500 mt-1">
                  {uploadForm.sampleText.length} characters
                </p>
              </div>

              {!apiKeys.gemini && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <p className="text-yellow-800 text-sm">
                    ⚠️ Gemini API key is required for writing analysis. Please add it in Settings.
                  </p>
                </div>
              )}
            </div>

            <div className="flex gap-2 mt-6">
              <button
                onClick={() => setShowUploadModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAnalyzeAndCreate}
                disabled={!uploadForm.name.trim() || !uploadForm.sampleText.trim() || !apiKeys.gemini || isAnalyzing}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {isAnalyzing ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Brain className="w-4 h-4" />
                    Analyze & Create
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PersonaManagement;
