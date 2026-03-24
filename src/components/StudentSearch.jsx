import { useState, useRef, useEffect, useCallback } from 'react';
import { searchStudents, getStudentRecord } from '../utils/studentCalculations';
import { formatCurrency } from '../utils/formatters';
import StudentDetail from './StudentDetail';

export default function StudentSearch({ data, location }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const inputRef = useRef(null);

  // Focus input when overlay opens
  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
    }
  }, [open]);

  // Search as user types
  useEffect(() => {
    if (!open) return;
    const matches = searchStudents(data, query, location);
    setResults(matches);
  }, [query, data, location, open]);

  // Close on Escape
  useEffect(() => {
    function handleKey(e) {
      if (e.key === 'Escape') {
        if (selectedStudent) {
          setSelectedStudent(null);
        } else if (open) {
          handleClose();
        }
      }
      // Cmd/Ctrl+K to open search
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(true);
      }
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open, selectedStudent]);

  const handleClose = useCallback(() => {
    setOpen(false);
    setQuery('');
    setResults([]);
    setSelectedStudent(null);
  }, []);

  const handleSelectStudent = useCallback((student) => {
    const record = getStudentRecord(data, student);
    setSelectedStudent(record);
  }, [data]);

  if (selectedStudent) {
    return (
      <>
        <SearchButton onClick={() => setOpen(true)} />
        <StudentDetail
          student={selectedStudent}
          onClose={() => setSelectedStudent(null)}
          onBack={() => setSelectedStudent(null)}
        />
      </>
    );
  }

  return (
    <>
      <SearchButton onClick={() => setOpen(true)} />
      {open && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[10vh]">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={handleClose}
          />

          {/* Search Panel */}
          <div className="relative w-full max-w-xl mx-4 bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl shadow-2xl overflow-hidden">
            {/* Search Input */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--color-border)]">
              <svg className="w-5 h-5 text-[var(--color-text-muted)] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by name, email, or phone..."
                className="flex-1 bg-transparent text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] text-sm outline-none"
              />
              <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-[10px] text-[var(--color-text-muted)] bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded">
                ESC
              </kbd>
            </div>

            {/* Results */}
            <div className="max-h-[60vh] overflow-y-auto">
              {query.length < 2 ? (
                <div className="px-4 py-8 text-center text-sm text-[var(--color-text-muted)]">
                  Type at least 2 characters to search
                </div>
              ) : results.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-[var(--color-text-muted)]">
                  No students found for "{query}"
                </div>
              ) : (
                <div className="py-1">
                  {results.map((student, i) => (
                    <button
                      key={student.studentId || student.email || i}
                      onClick={() => handleSelectStudent(student)}
                      className="w-full px-4 py-3 flex items-center gap-3 hover:bg-[var(--color-bg-primary)]/50 transition-colors text-left cursor-pointer"
                    >
                      {/* Avatar circle */}
                      <div className="w-9 h-9 rounded-full bg-[var(--color-accent-blue)]/20 flex items-center justify-center shrink-0">
                        <span className="text-sm font-medium text-[var(--color-accent-blue)]">
                          {(student.fullName || '?').charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-[var(--color-text-primary)] truncate">
                          {student.fullName || 'Unknown'}
                        </div>
                        <div className="text-xs text-[var(--color-text-muted)] truncate">
                          {student.email} {student.phone ? `· ${student.phone}` : ''}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-xs font-medium text-[var(--color-text-secondary)]">
                          {formatCurrency(student.contractPrice)}
                        </div>
                        <div className="text-[10px] text-[var(--color-text-muted)]">
                          {student.program}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Footer hint */}
            {results.length > 0 && (
              <div className="px-4 py-2 border-t border-[var(--color-border)] text-[10px] text-[var(--color-text-muted)]">
                {results.length} result{results.length !== 1 ? 's' : ''} — click to view full record
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function SearchButton({ onClick }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 px-3 py-1.5 text-xs text-[var(--color-text-muted)] bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded-lg hover:border-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] transition-colors cursor-pointer"
      title="Search students (Ctrl+K)"
    >
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
      <span className="hidden sm:inline">Search</span>
      <kbd className="hidden sm:inline-flex items-center px-1 py-0.5 text-[9px] bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded ml-1">
        ⌘K
      </kbd>
    </button>
  );
}
