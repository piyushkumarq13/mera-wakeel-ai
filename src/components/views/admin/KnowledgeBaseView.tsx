import React, { useState, useEffect, useRef } from 'react';
import {
  Database,
  Plus,
  Search,
  Sparkles,
  Trash2,
  BookOpen,
  CheckCircle2,
  AlertCircle,
  FileText,
  Filter,
  RefreshCw,
  Zap,
  ArrowRight,
  Info,
  Upload,
  FileSpreadsheet,
} from 'lucide-react';
import { CaseCategory, LegalKnowledgeBase } from '../../../types/database';
import {
  insertKnowledgeChunk,
  fetchAllKnowledgeChunks,
  deleteKnowledgeChunk,
  seedDefaultKnowledgeBase,
  searchKnowledgeBase,
} from '../../../lib/rag';

interface KnowledgeBaseViewProps {
  onBackToHome: () => void;
}

export const KnowledgeBaseView: React.FC<KnowledgeBaseViewProps> = ({ onBackToHome }) => {
  const [chunks, setChunks] = useState<LegalKnowledgeBase[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<'manager' | 'tester'>('manager');

  // Input form state
  const [actName, setActName] = useState('');
  const [sectionNumber, setSectionNumber] = useState('');
  const [category, setCategory] = useState<CaseCategory>('property');
  const [content, setContent] = useState('');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Search tester state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchCategory, setSearchCategory] = useState<CaseCategory | 'all'>('all');
  const [searchResults, setSearchResults] = useState<{ chunk: LegalKnowledgeBase; similarity: number }[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Category filter for list
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadKnowledgeBase = async () => {
    setLoading(true);
    try {
      await seedDefaultKnowledgeBase();
      const fetched = await fetchAllKnowledgeChunks();
      setChunks(fetched);
    } catch (err) {
      console.warn('Failed to load knowledge base:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadKnowledgeBase();
  }, []);

  const handleCsvImport = async (csvText: string) => {
    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const lines = csvText.split(/\r?\n/).filter((line) => line.trim().length > 0);
      if (lines.length === 0) {
        throw new Error('CSV file is empty');
      }

      let count = 0;
      // Skip header if present
      const startIdx = lines[0].toLowerCase().includes('act_name') || lines[0].toLowerCase().includes('act') ? 1 : 0;

      for (let i = startIdx; i < lines.length; i++) {
        const line = lines[i];
        // Split by comma respecting quotes
        const cols = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || line.split(',');
        const cleanCols = cols.map((c) => c.replace(/^"|"$/g, '').trim());

        if (cleanCols.length >= 2) {
          const importedAct = cleanCols[0] || 'Indian Statute';
          const importedSec = cleanCols.length >= 4 ? cleanCols[1] : null;
          const importedCat = (cleanCols.length >= 4 ? cleanCols[2] : 'other') as CaseCategory;
          const importedContent = cleanCols[cleanCols.length - 1];

          if (importedContent) {
            await insertKnowledgeChunk({
              act_name: importedAct,
              section_number: importedSec,
              category: ['property', 'tenant', 'family', 'consumer', 'labour'].includes(importedCat) ? importedCat : 'other',
              content: importedContent,
            });
            count++;
          }
        }
      }

      setSuccessMessage(`Successfully imported ${count} legal chunks from CSV into knowledge base with 768-dim embeddings!`);
      await loadKnowledgeBase();
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to parse or import CSV file.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      if (text) handleCsvImport(text);
    };
    reader.readAsText(file);
  };

  const handleAddChunk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!actName.trim() || !content.trim()) {
      setErrorMessage('Please provide both Act Name and Content text chunk.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const newChunk = await insertKnowledgeChunk({
        act_name: actName.trim(),
        section_number: sectionNumber.trim() || null,
        category,
        content: content.trim(),
      });

      setSuccessMessage(`Successfully chunked and embedded "${newChunk.act_name}" with 768-dim vector!`);
      setActName('');
      setSectionNumber('');
      setContent('');
      await loadKnowledgeBase();
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to generate embedding and save knowledge chunk.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Delete chunk "${name}" from Knowledge Base?`)) return;
    await deleteKnowledgeChunk(id);
    await loadKnowledgeBase();
  };

  const handleRunSearchTest = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      const catFilter = searchCategory === 'all' ? null : (searchCategory as CaseCategory);
      const results = await searchKnowledgeBase(searchQuery, catFilter, 5);
      setSearchResults(results);
    } catch (err) {
      console.error('Search test failed:', err);
    } finally {
      setIsSearching(false);
    }
  };

  const handlePrefillAct = (act: string, section: string, cat: CaseCategory, text: string) => {
    setActName(act);
    setSectionNumber(section);
    setCategory(cat);
    setContent(text);
    setSuccessMessage(null);
    setErrorMessage(null);
  };

  const filteredChunks = chunks.filter((c) => {
    if (selectedCategory === 'all') return true;
    return c.category === selectedCategory;
  });

  return (
    <div className="min-h-screen bg-[#070D18] text-[#F3F4F6] pb-16 font-sans">
      {/* Top Header */}
      <header className="bg-[#0F1D38] border-b border-[#1E2E4F]/60 sticky top-0 z-30 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={onBackToHome}
              className="p-2 hover:bg-[#1E2E4F] rounded-xl text-gray-300 hover:text-white transition-all cursor-pointer"
              title="Back to Home"
            >
              <ArrowRight className="w-5 h-5 rotate-180" />
            </button>
            <div className="p-2.5 bg-[#D98800]/15 border border-[#D98800]/30 rounded-xl text-[#F5A623]">
              <Database className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black tracking-tight text-white">Indian Legal Knowledge Base</h1>
                <span className="bg-[#D98800]/20 text-[#F5A623] border border-[#D98800]/40 text-[10px] uppercase font-black px-2 py-0.5 rounded-full tracking-wider">
                  RAG Vector Store
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">
                Manage statutory act chunks, generate embeddings (768-dim), & ground AI legal claims in real Indian law text.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={() => setActiveTab('manager')}
              className={`flex-1 sm:flex-initial px-4 py-2 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer ${
                activeTab === 'manager'
                  ? 'bg-[#D98800] text-[#070D18] shadow-md shadow-[#D98800]/20'
                  : 'bg-[#1E2E4F]/50 text-gray-300 hover:bg-[#1E2E4F]'
              }`}
            >
              <Plus className="w-4 h-4" />
              <span>Chunk Ingestion</span>
            </button>

            <button
              onClick={() => setActiveTab('tester')}
              className={`flex-1 sm:flex-initial px-4 py-2 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer ${
                activeTab === 'tester'
                  ? 'bg-[#D98800] text-[#070D18] shadow-md shadow-[#D98800]/20'
                  : 'bg-[#1E2E4F]/50 text-gray-300 hover:bg-[#1E2E4F]'
              }`}
            >
              <Zap className="w-4 h-4" />
              <span>Similarity Search Tester</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        {/* Banner Alert */}
        <div className="mb-6 bg-gradient-to-r from-[#1E2E4F]/80 to-[#0F1D38] border border-[#D98800]/30 p-4 rounded-2xl flex items-start gap-3 text-sm text-gray-300 shadow-lg">
          <Info className="w-5 h-5 text-[#F5A623] shrink-0 mt-0.5" />
          <div className="leading-relaxed text-xs sm:text-sm">
            <span className="font-bold text-white">Legal Intelligence in Mera Wakeel AI:</span> Before generating legal guidance in Chat, user queries are matched against verified Indian Act provisions (BNS, BNSS, BSA, IPC, CRPC, Specific Relief Act) to ensure highly accurate section citations and prevent hallucinations.
          </div>
        </div>

        {activeTab === 'manager' ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left Column: Form & Prefills */}
            <div className="lg:col-span-5 space-y-6">
              {/* Form Card */}
              <div className="bg-[#0F1D38] border border-[#1E2E4F] rounded-2xl p-6 shadow-xl space-y-5">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-base font-extrabold text-white flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-[#F5A623]" />
                    Add Act Text Chunk
                  </h2>

                  <div>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      accept=".csv,text/csv"
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="bg-[#1E2E4F] hover:bg-[#2A3E68] text-white text-xs font-bold px-3 py-1.5 rounded-xl border border-[#D98800]/30 transition-all flex items-center gap-1.5 cursor-pointer"
                      title="Upload CSV File (columns: act_name, section_number, category, content)"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5 text-[#F5A623]" />
                      <span>Import CSV</span>
                    </button>
                  </div>
                </div>

                {successMessage && (
                  <div className="bg-[#10B981]/15 border border-[#10B981]/40 p-3.5 rounded-xl text-emerald-300 text-xs flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{successMessage}</span>
                  </div>
                )}

                {errorMessage && (
                  <div className="bg-[#EF4444]/15 border border-[#EF4444]/40 p-3.5 rounded-xl text-rose-300 text-xs flex items-start gap-2.5">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                <form onSubmit={handleAddChunk} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-300 mb-1.5">
                      Act Name <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Hindu Succession Act, 1956"
                      value={actName}
                      onChange={(e) => setActName(e.target.value)}
                      className="w-full bg-[#070D18] border border-[#1E2E4F] focus:border-[#D98800] rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none transition-colors"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-gray-300 mb-1.5">Section Number</label>
                      <input
                        type="text"
                        placeholder="e.g. Section 6"
                        value={sectionNumber}
                        onChange={(e) => setSectionNumber(e.target.value)}
                        className="w-full bg-[#070D18] border border-[#1E2E4F] focus:border-[#D98800] rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none transition-colors"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-300 mb-1.5">Category</label>
                      <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value as CaseCategory)}
                        className="w-full bg-[#070D18] border border-[#1E2E4F] focus:border-[#D98800] rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none transition-colors cursor-pointer"
                      >
                        <option value="property">Property Law</option>
                        <option value="tenant">Tenant & Rent Control</option>
                        <option value="family">Family & Succession</option>
                        <option value="consumer">Consumer Protection</option>
                        <option value="labour">Labour & Employment</option>
                        <option value="other">Other / Criminal / General</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-300 mb-1.5">
                      Statute Content Chunk <span className="text-rose-400">*</span>
                    </label>
                    <textarea
                      rows={5}
                      placeholder="Paste verbatim section text, rules, or core principles of the Indian statute..."
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      className="w-full bg-[#070D18] border border-[#1E2E4F] focus:border-[#D98800] rounded-xl p-3.5 text-xs text-white placeholder-gray-500 focus:outline-none transition-colors leading-relaxed"
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-[#D98800] hover:bg-[#F5A623] disabled:opacity-50 text-[#070D18] font-black py-3 px-4 rounded-xl text-xs transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#D98800]/20 cursor-pointer"
                  >
                    {isSubmitting ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Generating Embedding & Saving...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        <span>Generate Vector Embedding & Save Chunk</span>
                      </>
                    )}
                  </button>
                </form>
              </div>

              {/* Quick Template Prefills */}
              <div className="bg-[#0F1D38]/60 border border-[#1E2E4F] rounded-2xl p-5 space-y-3">
                <h3 className="text-xs font-extrabold text-gray-300 uppercase tracking-wider">Quick Sample Templates</h3>
                <div className="space-y-2">
                  <button
                    onClick={() =>
                      handlePrefillAct(
                        'Transfer of Property Act, 1882',
                        'Section 106',
                        'tenant',
                        'Duration of certain leases in absence of written contract. In the absence of a written contract, lease of immovable property for residential purpose is terminable by 15 days notice expiring with the end of tenancy month.'
                      )
                    }
                    className="w-full text-left bg-[#070D18] hover:bg-[#1E2E4F]/50 border border-[#1E2E4F] p-2.5 rounded-xl text-xs text-gray-300 transition-all cursor-pointer flex items-center justify-between"
                  >
                    <div>
                      <div className="font-bold text-white">Transfer of Property Act — Section 106</div>
                      <div className="text-[10px] text-gray-400">15-day notice period for tenant eviction</div>
                    </div>
                    <Plus className="w-4 h-4 text-[#F5A623] shrink-0" />
                  </button>

                  <button
                    onClick={() =>
                      handlePrefillAct(
                        'Negotiable Instruments Act, 1881',
                        'Section 138',
                        'other',
                        'Dishonour of cheque for insufficiency of funds. Returned cheque unpaid constitutes offence punishable with imprisonment up to 2 years or fine up to twice cheque amount. Statutory notice must be served within 30 days.'
                      )
                    }
                    className="w-full text-left bg-[#070D18] hover:bg-[#1E2E4F]/50 border border-[#1E2E4F] p-2.5 rounded-xl text-xs text-gray-300 transition-all cursor-pointer flex items-center justify-between"
                  >
                    <div>
                      <div className="font-bold text-white">Negotiable Instruments Act — Section 138</div>
                      <div className="text-[10px] text-gray-400">Cheque Bounce criminal notice procedure</div>
                    </div>
                    <Plus className="w-4 h-4 text-[#F5A623] shrink-0" />
                  </button>
                </div>
              </div>
            </div>

            {/* Right Column: Chunk List */}
            <div className="lg:col-span-7 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#0F1D38] border border-[#1E2E4F] p-4 rounded-2xl">
                <div>
                  <h2 className="text-base font-extrabold text-white flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-[#F5A623]" />
                    Stored Law Chunks ({filteredChunks.length})
                  </h2>
                  <p className="text-xs text-gray-400 mt-0.5">Grounding context available for RAG matching</p>
                </div>

                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-gray-400" />
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="bg-[#070D18] border border-[#1E2E4F] text-xs text-white px-3 py-1.5 rounded-xl focus:outline-none"
                  >
                    <option value="all">All Categories</option>
                    <option value="property">Property</option>
                    <option value="tenant">Tenant</option>
                    <option value="family">Family</option>
                    <option value="consumer">Consumer</option>
                    <option value="labour">Labour</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              {loading ? (
                <div className="bg-[#0F1D38] border border-[#1E2E4F] p-12 rounded-2xl text-center space-y-3">
                  <RefreshCw className="w-8 h-8 text-[#F5A623] animate-spin mx-auto" />
                  <p className="text-xs text-gray-400">Loading vector embeddings from knowledge base...</p>
                </div>
              ) : filteredChunks.length === 0 ? (
                <div className="bg-[#0F1D38] border border-[#1E2E4F] p-12 rounded-2xl text-center space-y-3">
                  <Database className="w-10 h-10 text-gray-500 mx-auto" />
                  <p className="text-sm text-gray-300 font-bold">No knowledge chunks found in this category.</p>
                  <button
                    onClick={() => seedDefaultKnowledgeBase().then(loadKnowledgeBase)}
                    className="bg-[#1E2E4F] hover:bg-[#2A3E68] text-white text-xs font-bold py-2 px-4 rounded-xl transition-all cursor-pointer inline-flex items-center gap-2"
                  >
                    <RefreshCw className="w-4 h-4 text-[#F5A623]" />
                    <span>Reset & Seed Default Indian Acts</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredChunks.map((chunk) => (
                    <div
                      key={chunk.id}
                      className="bg-[#0F1D38] border border-[#1E2E4F] hover:border-[#D98800]/40 p-4 rounded-2xl space-y-2.5 transition-all shadow-md group"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-extrabold text-sm text-white">{chunk.act_name}</span>
                            {chunk.section_number && (
                              <span className="bg-[#D98800]/20 text-[#F5A623] border border-[#D98800]/40 text-xs font-bold px-2 py-0.5 rounded-lg">
                                {chunk.section_number}
                              </span>
                            )}
                            <span className="bg-[#1E2E4F] text-gray-300 text-[10px] uppercase font-bold px-2 py-0.5 rounded-lg">
                              {chunk.category || 'general'}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-emerald-400 bg-[#10B981]/10 border border-[#10B981]/30 px-2 py-0.5 rounded-md flex items-center gap-1 font-mono">
                            <CheckCircle2 className="w-3 h-3" />
                            768-dim vector
                          </span>
                          <button
                            onClick={() => handleDelete(chunk.id, `${chunk.act_name} ${chunk.section_number || ''}`)}
                            className="p-1.5 text-gray-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                            title="Delete Chunk"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <p className="text-xs text-gray-300 leading-relaxed bg-[#070D18] p-3 rounded-xl border border-[#1E2E4F]/50 font-serif">
                        "{chunk.content}"
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Similarity Search Tester Tab */
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="bg-[#0F1D38] border border-[#1E2E4F] rounded-2xl p-6 shadow-xl space-y-5">
              <div>
                <h2 className="text-lg font-extrabold text-white flex items-center gap-2">
                  <Search className="w-5 h-5 text-[#F5A623]" />
                  Live Cosine Similarity Vector Search
                </h2>
                <p className="text-xs text-gray-400 mt-1">
                  Test how user queries extract grounding law chunks from <code className="text-[#F5A623]">legal_knowledge_base</code> using cosine vector angle (<code className="text-[#F5A623]">cos θ</code>).
                </p>
              </div>

              <form onSubmit={handleRunSearchTest} className="space-y-4">
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="flex-1 relative">
                    <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3.5" />
                    <input
                      type="text"
                      placeholder="e.g. My father died without a will, do daughters get equal rights in house?"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-[#070D18] border border-[#1E2E4F] focus:border-[#D98800] rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none transition-colors"
                    />
                  </div>

                  <select
                    value={searchCategory}
                    onChange={(e) => setSearchCategory(e.target.value as any)}
                    className="bg-[#070D18] border border-[#1E2E4F] text-xs text-white px-3 py-2.5 rounded-xl focus:outline-none cursor-pointer"
                  >
                    <option value="all">All Categories</option>
                    <option value="property">Property</option>
                    <option value="tenant">Tenant</option>
                    <option value="family">Family</option>
                    <option value="consumer">Consumer</option>
                    <option value="labour">Labour</option>
                  </select>

                  <button
                    type="submit"
                    disabled={isSearching}
                    className="bg-[#D98800] hover:bg-[#F5A623] text-[#070D18] font-black px-5 py-2.5 rounded-xl text-xs transition-all flex items-center justify-center gap-2 shadow-md cursor-pointer shrink-0"
                  >
                    {isSearching ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                    <span>Test Search</span>
                  </button>
                </div>
              </form>

              {/* Sample Queries */}
              <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[#1E2E4F]/60 text-xs">
                <span className="text-gray-400 text-[11px] font-bold">Try Sample Queries:</span>
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('Landlord gave only 2 days notice to vacate house in Delhi');
                    setSearchCategory('tenant');
                  }}
                  className="bg-[#070D18] hover:bg-[#1E2E4F] border border-[#1E2E4F] text-gray-300 text-[11px] px-2.5 py-1 rounded-lg transition-colors"
                >
                  "Tenant 15-day notice rule"
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('Cheque bounced due to insufficient funds in bank account');
                    setSearchCategory('all');
                  }}
                  className="bg-[#070D18] hover:bg-[#1E2E4F] border border-[#1E2E4F] text-gray-300 text-[11px] px-2.5 py-1 rounded-lg transition-colors"
                >
                  "Cheque bounce notice 138"
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('Bought defective mobile on Amazon, company refusing refund');
                    setSearchCategory('consumer');
                  }}
                  className="bg-[#070D18] hover:bg-[#1E2E4F] border border-[#1E2E4F] text-gray-300 text-[11px] px-2.5 py-1 rounded-lg transition-colors"
                >
                  "Consumer forum complaint"
                </button>
              </div>
            </div>

            {/* Results Display */}
            {searchResults.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-sm font-extrabold text-white flex items-center justify-between">
                  <span>Top Vector Matches ({searchResults.length})</span>
                  <span className="text-xs text-[#F5A623]">Sorted by Cosine Similarity</span>
                </h3>

                <div className="space-y-3">
                  {searchResults.map((res, idx) => {
                    const similarityPct = (res.similarity * 100).toFixed(1);
                    const isHighMatch = res.similarity >= 0.35;

                    return (
                      <div
                        key={res.chunk.id}
                        className={`p-5 rounded-2xl border transition-all space-y-2.5 ${
                          isHighMatch
                            ? 'bg-[#0F1D38] border-[#10B981]/50 shadow-lg shadow-[#10B981]/5'
                            : 'bg-[#0F1D38]/60 border-[#1E2E4F]'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-[#1E2E4F] text-white text-[11px] font-black flex items-center justify-center">
                              #{idx + 1}
                            </span>
                            <span className="font-extrabold text-sm text-white">{res.chunk.act_name}</span>
                            {res.chunk.section_number && (
                              <span className="bg-[#D98800]/20 text-[#F5A623] border border-[#D98800]/40 text-xs font-bold px-2 py-0.5 rounded-lg">
                                {res.chunk.section_number}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            <span
                              className={`text-xs font-bold px-2.5 py-1 rounded-xl flex items-center gap-1 ${
                                isHighMatch
                                  ? 'bg-[#10B981]/20 text-emerald-300 border border-[#10B981]/40'
                                  : 'bg-[#1E2E4F] text-gray-300'
                              }`}
                            >
                              Similarity: {similarityPct}%
                            </span>
                          </div>
                        </div>

                        <p className="text-xs text-gray-300 bg-[#070D18] p-3 rounded-xl border border-[#1E2E4F]/60 font-serif leading-relaxed">
                          "{res.chunk.content}"
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};
