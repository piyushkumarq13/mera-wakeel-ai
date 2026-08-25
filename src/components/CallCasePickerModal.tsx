import React, { useState, useEffect } from 'react';
import { Phone, X, Plus, AlertTriangle, Clock } from 'lucide-react';
import { Case } from '../types/database';

interface CallCasePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  cases: Case[];
  onSelectCase: (caseId: string) => void;
  onCreateNewCase: () => void;
  isCreatingCase?: boolean;
}

export const CallCasePickerModal: React.FC<CallCasePickerModalProps> = ({
  isOpen,
  onClose,
  cases,
  onSelectCase,
  onCreateNewCase,
  isCreatingCase = false,
}) => {
  const [showWarning, setShowWarning] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setShowWarning(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const activeCases = cases.filter(
    (c) => c.status === 'ongoing' || c.status === 'assessed' || c.status === 'lawyer_connected'
  );

  const handleCreateNewCase = () => {
    if (activeCases.length > 0) {
      setShowWarning(true);
      return;
    }
    onCreateNewCase();
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      return new Date(dateStr).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return '';
    }
  };

  const statusColor = (status: string) => {
    switch (status) {
      case 'ongoing': return 'bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A]';
      case 'assessed': return 'bg-[#EFF6FF] text-[#1E40AF] border border-[#BFDBFE]';
      case 'lawyer_connected': return 'bg-[#ECFDF5] text-[#065F46] border border-[#A7F3D0]';
      default: return 'bg-[#F1F5F9] text-[#475569] border border-[#E2E8F0]';
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-[#0F172A] border border-[#1E2E4F] rounded-3xl shadow-2xl overflow-hidden text-white my-8"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Header */}
        <div className="p-4 bg-[#070D18] border-b border-[#1E2E4F] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-[#10B981]/10 border border-[#10B981]/20">
              <Phone className="w-5 h-5 text-[#10B981]" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Select Case for Voice Call</h3>
              <p className="text-[11px] text-slate-400">Choose an active case or start a new one</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 max-h-[60vh] overflow-y-auto">
          
          {activeCases.length === 0 ? (
            <div className="text-center py-8 px-4">
              <div className="w-14 h-14 rounded-full bg-[#1E2E4F] flex items-center justify-center mx-auto mb-3">
                <Phone className="w-7 h-7 text-slate-400" />
              </div>
              <p className="text-sm font-semibold text-slate-300">No active cases yet</p>
              <p className="text-xs text-slate-500 mt-1">Start one to begin your voice call consultation</p>
            </div>
          ) : (
            <div className="space-y-2">
              {activeCases.map((c) => (
                <button
                  key={c.id}
                  onClick={() => onSelectCase(c.id)}
                  className="w-full text-left p-3.5 rounded-xl border border-[#1E2E4F] hover:border-[#D98800] hover:bg-[#1E2E4F]/50 transition-all group cursor-pointer"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-white truncate group-hover:text-[#D98800] transition-colors">
                        {c.title || 'Untitled Case'}
                      </p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide ${statusColor(c.status)}`}>
                          {c.status.replace('_', ' ')}
                        </span>
                        {c.created_at && (
                          <span className="flex items-center gap-1 text-[10px] text-slate-500">
                            <Clock className="w-3 h-3" />
                            {formatDate(c.updated_at || c.created_at)}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="shrink-0 mt-1">
                      <Phone className="w-4 h-4 text-slate-600 group-hover:text-[#D98800] transition-colors" />
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Create New Case button */}
          <button
            onClick={handleCreateNewCase}
            disabled={isCreatingCase}
            className="w-full p-3.5 rounded-xl border-2 border-dashed border-[#1E2E4F] hover:border-[#D98800] text-slate-400 hover:text-[#D98800] transition-all flex items-center justify-center gap-2 text-sm font-bold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isCreatingCase ? (
              <>
                <div className="w-4 h-4 border-2 border-[#D98800] border-t-transparent rounded-full animate-spin" />
                <span>Creating case...</span>
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" />
                <span>Create New Case</span>
              </>
            )}
          </button>

          {/* Inline warning when active cases exist */}
          {showWarning && activeCases.length > 0 && (
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-[#FEF3C7]/10 border border-[#FDE68A]/30">
              <AlertTriangle className="w-4 h-4 text-[#F59E0B] shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-[#F59E0B]">You already have an active case</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Please close it before starting a new one.</p>
              </div>
              <button
                onClick={() => setShowWarning(false)}
                className="shrink-0 ml-auto p-0.5 rounded text-slate-500 hover:text-white transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-[#070D18] border-t border-[#1E2E4F] flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-300 hover:text-white rounded-xl transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
