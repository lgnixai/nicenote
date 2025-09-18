import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

export interface FileNodeData {
  id: string;
  name: string;
  type: 'file' | 'folder';
  parentId?: string;
  children?: string[]; // store ids for folders
  documentId?: string; // for files
  createdAt: number;
  updatedAt: number;
}

interface FileTreeContextValue {
  nodesById: Record<string, FileNodeData>;
  rootId: string;
  createFolder: (parentId: string, name?: string) => string;
  createFile: (parentId: string, name?: string, documentId?: string) => string;
  renameNode: (id: string, name: string) => void;
  deleteNode: (id: string) => void;
  listChildren: (id: string) => FileNodeData[];
}

const FileTreeContext = createContext<FileTreeContextValue | null>(null);

const STORAGE_KEY = 'obsidian.clone.filetree';

export const FileTreeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [nodesById, setNodesById] = useState<Record<string, FileNodeData>>({});
  const [rootId, setRootId] = useState<string>('');
  const timer = useRef<number | null>(null);

  // Load
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as { rootId: string; nodesById: Record<string, FileNodeData> };
        setRootId(parsed.rootId);
        setNodesById(parsed.nodesById);
        return;
      }
    } catch {}
    // initialize
    const id = 'root-' + Date.now().toString(36);
    const now = Date.now();
    const root: FileNodeData = { id, name: 'Vault', type: 'folder', children: [], createdAt: now, updatedAt: now };
    setRootId(id);
    setNodesById({ [id]: root });
  }, []);

  // Persist
  useEffect(() => {
    if (!rootId) return;
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ rootId, nodesById }));
      } catch {}
    }, 400);
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, [rootId, nodesById]);

  const createFolder = useCallback((parentId: string, name?: string) => {
    const id = 'fld-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    const now = Date.now();
    setNodesById(prev => {
      const parent = prev[parentId];
      if (!parent || parent.type !== 'folder') return prev;
      const node: FileNodeData = { id, name: name ?? '新建文件夹', type: 'folder', parentId, children: [], createdAt: now, updatedAt: now };
      return {
        ...prev,
        [id]: node,
        [parentId]: { ...parent, children: [...(parent.children ?? []), id], updatedAt: now }
      };
    });
    return id;
  }, []);

  const createFile = useCallback((parentId: string, name?: string, documentId?: string) => {
    const id = 'fil-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    const now = Date.now();
    setNodesById(prev => {
      const parent = prev[parentId];
      if (!parent || parent.type !== 'folder') return prev;
      const node: FileNodeData = { id, name: name ?? '未命名.md', type: 'file', parentId, documentId, createdAt: now, updatedAt: now };
      return {
        ...prev,
        [id]: node,
        [parentId]: { ...parent, children: [...(parent.children ?? []), id], updatedAt: now }
      };
    });
    return id;
  }, []);

  const renameNode = useCallback((id: string, name: string) => {
    setNodesById(prev => {
      const node = prev[id];
      if (!node) return prev;
      return { ...prev, [id]: { ...node, name, updatedAt: Date.now() } };
    });
  }, []);

  const deleteNode = useCallback((id: string) => {
    setNodesById(prev => {
      const node = prev[id];
      if (!node) return prev;
      const next = { ...prev } as Record<string, FileNodeData>;
      const removeRecursively = (nid: string) => {
        const n = next[nid];
        if (!n) return;
        if (n.type === 'folder') {
          (n.children ?? []).forEach(removeRecursively);
        }
        delete next[nid];
      };
      removeRecursively(id);
      if (node.parentId && next[node.parentId]) {
        const parent = next[node.parentId];
        next[node.parentId] = { ...parent, children: (parent.children ?? []).filter(cid => cid !== id), updatedAt: Date.now() };
      }
      return next;
    });
  }, []);

  const listChildren = useCallback((id: string) => {
    const node = nodesById[id];
    if (!node || node.type !== 'folder') return [];
    return (node.children ?? []).map(cid => nodesById[cid]).filter(Boolean) as FileNodeData[];
  }, [nodesById]);

  const value = useMemo<FileTreeContextValue>(() => ({
    nodesById,
    rootId,
    createFolder,
    createFile,
    renameNode,
    deleteNode,
    listChildren
  }), [nodesById, rootId, createFolder, createFile, renameNode, deleteNode, listChildren]);

  return (
    <FileTreeContext.Provider value={value}>
      {children}
    </FileTreeContext.Provider>
  );
};

export const useFileTree = (): FileTreeContextValue => {
  const ctx = useContext(FileTreeContext);
  if (!ctx) throw new Error('useFileTree must be used within FileTreeProvider');
  return ctx;
};

