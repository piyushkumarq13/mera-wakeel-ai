import React, { useState, useEffect } from 'react';
import { Language } from '../types';
import { CaseDeadline, DeadlineType } from '../types/database';
import { fetchCaseDeadlines, addCaseDeadline, deleteCaseDeadline } from '../lib/supabase';
import { CalendarDays, Plus, Trash2, Gavel, FileText, MessageSquare, AlertTriangle, Clock, X } from 'lucide-react';

interface DeadlineTimelineProps {
  language: Language;
  citizenId?: string;
  caseId?: string | null;
  title?: string;
}

const LOCAL = {
  title: { en: 'Court Deadlines', hi: 'अदालत की तारीखें' },
  add: { en: '+ Add', hi: '+ जोड़ें' },
  loading: { en: 'Loading deadlines...', hi: 'तारीखें लोड हो रही हैं...' },
  noDeadlines: { en: 'No deadlines scheduled yet.', hi: 'अभी कोई तारीख तय नहीं है।' },
  urgent: { en: 'URGENT', hi: 'जरूरी' },
  inDays: { en: 'in {n} day(s)', hi: '{n} दिन में' },
  today: { en: 'today', hi: 'आज' },
  overdue: { en: '{n} day(s) ago', hi: '{n} दिन पहले' },
  caseTitle: { en: 'Case', hi: 'केस' },
  formTitle: { en: 'Add New Deadline', hi: 'नई तारीख जोड़ें' },
  caseIdLabel: { en: 'Case ID', hi: 'केस आईडी' },
  typeLabel: { en: 'Deadline Type', hi: 'तारीख का प्रकार' },
  dateLabel: { en: 'Due Date', hi: 'तय तारीख' },
  notesLabel: { en: 'Notes', hi: 'नोट्स' },
  save: { en: 'Save', hi: 'सेव करें' },
  cancel: { en: 'Cancel', hi: 'रद्द करें' },
  typeHearing: { en: 'Hearing', hi: 'सुनवाई' },
  typeFiling: { en: 'Filing', hi: 'दाखिल करना' },
  typeResponse: { en: 'Response', hi: 'जवाब' },
};

export function DeadlineTimeline({ language, citizenId, caseId, title }: DeadlineTimelineProps) {
  const [deadlines, setDeadlines] = useState<CaseDeadline[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [showAddForm, setShowAddForm] = useState<boolean>(false);
  const [formCaseId, setFormCaseId] = useState<string>(caseId || '');
  const [formType, setFormType] = useState<DeadlineType>('hearing');
  const [formDate, setFormDate] = useState<string>('');
  const [formNotes, setFormNotes] = useState<string>('');

  const t = (rec: { en: string; hi: string }) => {
    const value = rec[language as 'en' | 'hi'];
    return value !== undefined && value !== '' ? value : rec.en;
  };

  useEffect(() => {
    setFormCaseId(caseId || '');
  }, [caseId]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!citizenId) {
        setDeadlines([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      const data = await fetchCaseDeadlines(citizenId);
      if (cancelled) return;
      let list = Array.isArray(data) ? data : [];
      if (caseId) list = list.filter((d) => d.case_id === caseId);
      list = [...list].sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());
      setDeadlines(list);
      setLoading(false);
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [citizenId, caseId]);

  const refresh = async () => {
    if (!citizenId) return;
    const data = await fetchCaseDeadlines(citizenId);
    let list = Array.isArray(data) ? data : [];
    if (caseId) list = list.filter((d) => d.case_id === caseId);
    list = [...list].sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());
    setDeadlines(list);
  };

  const handleSave = async () => {
    const targetCaseId = caseId || formCaseId;
    if (!citizenId || !targetCaseId || !formDate) return;
    const created = await addCaseDeadline(targetCaseId, citizenId, formType, new Date(formDate).toISOString(), formNotes);
    setShowAddForm(false);
    setFormNotes('');
    setFormDate('');
    setFormType('hearing');
    if (created) {
      await refresh();
    }
  };

  const handleDelete = async (id: string) => {
    await deleteCaseDeadline(id);
    await refresh();
  };

  const typeIcon = (type: DeadlineType) => {
    switch (type) {
      case 'hearing':
        return { Icon: Gavel, color: '#DC2626', label: t(LOCAL.typeHearing) };
      case 'filing':
        return { Icon: FileText, color: '#2563EB', label: t(LOCAL.typeFiling) };
      case 'response':
      default:
        return { Icon: MessageSquare, color: '#059669', label: t(LOCAL.typeResponse) };
    }
  };

  const formatDate = (dueDate: string) => {
    try {
      return new Date(dueDate).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return dueDate;
    }
  };

  const dayDiff = (dueDate: string): number => {
    const due = new Date(dueDate);
    due.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return Math.round((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  };

  const renderDayBadge = (dueDate: string) => {
    const diff = dayDiff(dueDate);
    if (diff <= 3) {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800 ring-1 ring-amber-500/30">
          <AlertTriangle className="h-3 w-3" />
          {t(LOCAL.urgent)}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-500">
        <Clock className="h-3 w-3" />
        {diff === 0
          ? t(LOCAL.today)
          : diff > 0
            ? t(LOCAL.inDays).replace('{n}', String(diff))
            : t(LOCAL.overdue).replace('{n}', String(Math.abs(diff)))}
      </span>
    );
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-lg font-bold text-[#0F1D38]">
          <CalendarDays className="h-5 w-5 text-[#D98800]" />
          {title || t(LOCAL.title)}
        </h2>
        <button
          onClick={() => setShowAddForm((v) => !v)}
          className="inline-flex items-center gap-1 rounded-lg bg-[#F5A623] px-3 py-1.5 text-sm font-semibold text-[#0F1D38] transition hover:bg-[#D98800]"
        >
          <Plus className="h-4 w-4" />
          {t(LOCAL.add)}
        </button>
      </div>

      {showAddForm && (
        <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-bold text-[#0F1D38]">{t(LOCAL.formTitle)}</h3>
            <button onClick={() => setShowAddForm(false)} className="text-slate-400 hover:text-slate-600">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-600">{t(LOCAL.typeLabel)}</span>
              <select
                value={formType}
                onChange={(e) => setFormType(e.target.value as DeadlineType)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-[#D98800] focus:outline-none"
              >
                <option value="hearing">{t(LOCAL.typeHearing)}</option>
                <option value="filing">{t(LOCAL.typeFiling)}</option>
                <option value="response">{t(LOCAL.typeResponse)}</option>
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-600">{t(LOCAL.dateLabel)}</span>
              <input
                type="date"
                value={formDate}
                onChange={(e) => setFormDate(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#D98800] focus:outline-none"
              />
            </label>
            <label className="block sm:col-span-2">
              <span className="mb-1 block text-xs font-medium text-slate-600">{t(LOCAL.notesLabel)}</span>
              <textarea
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
                rows={2}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#D98800] focus:outline-none"
              />
            </label>
          </div>
          <div className="mt-3 flex gap-2">
            <button
              onClick={handleSave}
              className="rounded-lg bg-[#D98800] px-4 py-1.5 text-sm font-semibold text-white transition hover:bg-[#F5A623]"
            >
              {t(LOCAL.save)}
            </button>
            <button
              onClick={() => setShowAddForm(false)}
              className="rounded-lg border border-slate-300 px-4 py-1.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-100"
            >
              {t(LOCAL.cancel)}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <p className="py-6 text-center text-sm text-slate-500">{t(LOCAL.loading)}</p>
      ) : deadlines.length === 0 ? (
        <p className="py-6 text-center text-sm text-slate-500">{t(LOCAL.noDeadlines)}</p>
      ) : (
        <div className="relative space-y-3">
          <div className="absolute left-[15px] top-2 bottom-2 w-px bg-slate-200" />
          {deadlines.map((d) => {
            const { Icon, color, label } = typeIcon(d.deadline_type);
            return (
              <div key={d.id} className="relative flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                <span
                  className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white"
                  style={{ backgroundColor: color }}
                >
                  <Icon className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-bold text-[#0F1D38]">{formatDate(d.due_date)}</span>
                    {renderDayBadge(d.due_date)}
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">{label}</span>
                  </div>
                  <p className="mt-1 text-sm text-slate-700">{d.notes || '-'}</p>
                  {d.case?.title && (
                    <p className="mt-0.5 text-xs text-slate-400">
                      {t(LOCAL.caseTitle)}: {d.case.title}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => handleDelete(d.id)}
                  className="shrink-0 rounded-lg p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                  aria-label="Delete"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

export default DeadlineTimeline;