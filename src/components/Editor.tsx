import React, { useCallback, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Editor as MonacoEditor } from '@monaco-editor/react';
import { useDocuments } from '@/store/documents';

interface EditorProps {
  className?: string;
  documentId?: string;
  fallbackLanguage?: string;
  fallbackValue?: string;
}

const Editor: React.FC<EditorProps> = ({ 
  className,
  documentId,
  fallbackLanguage = 'markdown',
  fallbackValue = ''
}) => {
  const { getDocument, updateDocumentContent } = useDocuments();
  const doc = useMemo(() => getDocument(documentId), [getDocument, documentId]);

  const handleChange = useCallback((val?: string) => {
    if (doc?.id) {
      updateDocumentContent(doc.id, val ?? '');
    }
  }, [doc?.id, updateDocumentContent]);

  return (
    <div className={cn("flex-1 min-h-0 h-full bg-card", className)}>
      <MonacoEditor
        value={doc?.content ?? fallbackValue}
        defaultValue={fallbackValue || '# 新标签页\n在此编辑...'}
        onChange={handleChange}
        language={doc?.language ?? fallbackLanguage}
        theme="vs-dark"
        options={{
          minimap: { enabled: false },
          wordWrap: 'on',
          automaticLayout: true,
          fontSize: 14,
          scrollBeyondLastLine: false,
          smoothScrolling: true,
          renderWhitespace: 'selection',
        }}
        loading={<div className="w-full h-full flex items-center justify-center text-muted-foreground">正在加载编辑器...</div>}
        height="100%"
        width="100%"
      />
    </div>
  );
};

export default Editor;