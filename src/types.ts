export interface Note {
  id: string;
  title: string;
  content: string;
  tags: string[];
  category: string;
  attachments: Attachment[];
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Attachment {
  id: string;
  name: string;
  type: string;
  size: number;
  url: string;
}

export interface Category {
  id: string;
  name: string;
  color: string;
  order: number;
}

export type ViewMode = 'fullscreen' | 'two-column' | 'three-column';

export interface AppState {
  notes: Note[];
  categories: Category[];
  selectedNoteId: string | null;
  selectedCategory: string | null;
  searchQuery: string;
  selectedTags: string[];
}