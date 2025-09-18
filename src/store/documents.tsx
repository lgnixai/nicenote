import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

export interface DocumentData {
  id: string;
  name: string;
  content: string;
  language: string;
  path?: string;
  createdAt: number;
  updatedAt: number;
  isDirty: boolean;
}

interface DocumentsContextValue {
  documentsById: Record<string, DocumentData>;
  createDocument: (name: string, options?: { content?: string; language?: string; path?: string }) => string;
  updateDocumentContent: (id: string, content: string) => void;
  renameDocument: (id: string, name: string) => void;
  setDocumentLanguage: (id: string, language: string) => void;
  setDocumentPath: (id: string, path: string) => void;
  getDocument: (id?: string) => DocumentData | undefined;
}

const DocumentsContext = createContext<DocumentsContextValue | null>(null);

export const DocumentsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [documentsById, setDocumentsById] = useState<Record<string, DocumentData>>({});
  const saveTimer = useRef<number | null>(null);

  // 从 localStorage 恢复
  useEffect(() => {
    try {
      const raw = localStorage.getItem('obsidian.clone.documents');
      if (raw) {
        const parsed = JSON.parse(raw) as Record<string, DocumentData>;
        setDocumentsById(parsed);
      }
    } catch {}
  }, []);

  // 防抖持久化
  useEffect(() => {
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      try {
        localStorage.setItem('obsidian.clone.documents', JSON.stringify(documentsById));
      } catch {}
    }, 500);
    return () => {
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
    };
  }, [documentsById]);

  const createDocument = useCallback((name: string, options?: { content?: string; language?: string; path?: string }) => {
    const id = Date.now().toString() + Math.random().toString(36).slice(2);
    const now = Date.now();
    const doc: DocumentData = {
      id,
      name,
      content: options?.content ?? '',
      language: options?.language ?? 'markdown',
      path: options?.path,
      createdAt: now,
      updatedAt: now,
      isDirty: Boolean(options?.content && options?.content.length > 0)
    };
    setDocumentsById(prev => ({ ...prev, [id]: doc }));
    return id;
  }, []);

  const updateDocumentContent = useCallback((id: string, content: string) => {
    setDocumentsById(prev => {
      const existing = prev[id];
      if (!existing) return prev;
      const updated: DocumentData = {
        ...existing,
        content,
        updatedAt: Date.now(),
        isDirty: true
      };
      return { ...prev, [id]: updated };
    });
  }, []);

  const renameDocument = useCallback((id: string, name: string) => {
    setDocumentsById(prev => {
      const existing = prev[id];
      if (!existing) return prev;
      return { ...prev, [id]: { ...existing, name, updatedAt: Date.now() } };
    });
  }, []);

  const setDocumentLanguage = useCallback((id: string, language: string) => {
    setDocumentsById(prev => {
      const existing = prev[id];
      if (!existing) return prev;
      return { ...prev, [id]: { ...existing, language, updatedAt: Date.now() } };
    });
  }, []);

  const setDocumentPath = useCallback((id: string, path: string) => {
    setDocumentsById(prev => {
      const existing = prev[id];
      if (!existing) return prev;
      return { ...prev, [id]: { ...existing, path, updatedAt: Date.now() } };
    });
  }, []);

  const getDocument = useCallback((id?: string) => {
    if (!id) return undefined;
    return documentsById[id];
  }, [documentsById]);

  const value = useMemo<DocumentsContextValue>(() => ({
    documentsById,
    createDocument,
    updateDocumentContent,
    renameDocument,
    setDocumentLanguage,
    setDocumentPath,
    getDocument
  }), [documentsById, createDocument, updateDocumentContent, renameDocument, setDocumentLanguage, setDocumentPath, getDocument]);

  return (
    <DocumentsContext.Provider value={value}>
      {children}
    </DocumentsContext.Provider>
  );
};

export const useDocuments = (): DocumentsContextValue => {
  const ctx = useContext(DocumentsContext);
  if (!ctx) {
    throw new Error('useDocuments must be used within DocumentsProvider');
  }
  return ctx;
};

