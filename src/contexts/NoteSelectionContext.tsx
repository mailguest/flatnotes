import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface NoteSelectionContextType {
  selectedNoteId: string | null;
  selectNote: (noteId: string) => void;
  clearSelection: () => void;
  clearSelectionIfMatches: (noteId: string) => void;
}

const NoteSelectionContext = createContext<NoteSelectionContextType | undefined>(undefined);

export const useNoteSelection = () => {
  const context = useContext(NoteSelectionContext);
  if (context === undefined) {
    throw new Error('useNoteSelection must be used within a NoteSelectionProvider');
  }
  return context;
};

interface NoteSelectionProviderProps {
  children: ReactNode;
  initialSelectedNoteId?: string | null;
}

export const NoteSelectionProvider: React.FC<NoteSelectionProviderProps> = ({
  children,
  initialSelectedNoteId = null,
}) => {
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(initialSelectedNoteId);

  const selectNote = useCallback((noteId: string) => {
    setSelectedNoteId(noteId);
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedNoteId(null);
  }, []);

  const clearSelectionIfMatches = useCallback((noteId: string) => {
    setSelectedNoteId(prev => prev === noteId ? null : prev);
  }, []);

  return (
    <NoteSelectionContext.Provider value={{ selectedNoteId, selectNote, clearSelection, clearSelectionIfMatches }}>
      {children}
    </NoteSelectionContext.Provider>
  );
};