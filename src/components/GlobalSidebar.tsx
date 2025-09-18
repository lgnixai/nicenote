import React from 'react';
import { cn } from '@/lib/utils';
import { FolderPlus, FilePlus, FileText, Folder, MoreHorizontal } from 'lucide-react';
import { useFileTree } from '@/store/filetree';
import { useDocuments } from '@/store/documents';

interface GlobalSidebarProps {
  onOpenFile: (fileId: string, fileName: string, documentId: string) => void;
  className?: string;
}

const GlobalSidebar: React.FC<GlobalSidebarProps> = ({ onOpenFile, className }) => {
  const { rootId, listChildren, createFile, createFolder, nodesById } = useFileTree();
  const { createDocument } = useDocuments();

  return (
    <div className={cn("w-64 border-r border-border bg-panel p-3 space-y-3", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-foreground">文件管理器</span>
        <button className={cn('p-1 hover:bg-nav-hover rounded')}>
          <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button 
          className={cn('px-2 py-1.5 text-xs bg-secondary hover:bg-secondary/80 rounded flex items-center gap-1.5')} 
          onClick={() => createFolder(rootId)}
        >
          <FolderPlus className="w-3.5 h-3.5" />
          新建文件夹
        </button>
        <button 
          className={cn('px-2 py-1.5 text-xs bg-secondary hover:bg-secondary/80 rounded flex items-center gap-1.5')} 
          onClick={() => {
            const docId = createDocument('未命名.md', { language: 'markdown', content: '' });
            createFile(rootId, '未命名.md', docId);
          }}
        >
          <FilePlus className="w-3.5 h-3.5" />
          新建文件
        </button>
      </div>

      {/* File Tree */}
      <div className="space-y-1">
        {listChildren(rootId).length === 0 ? (
          <div className="text-xs text-muted-foreground px-2 py-3 text-center">
            暂无文件
            <br />
            <span className="text-xs opacity-70">点击上方按钮创建文件</span>
          </div>
        ) : (
          <FileTreeNode 
            nodes={listChildren(rootId)}
            nodesById={nodesById}
            onOpenFile={onOpenFile}
            level={0}
          />
        )}
      </div>
    </div>
  );
};

interface FileTreeNodeProps {
  nodes: Array<{ id: string; name: string; type: 'file' | 'folder'; documentId?: string }>;
  nodesById: Record<string, any>;
  onOpenFile: (fileId: string, fileName: string, documentId: string) => void;
  level: number;
}

const FileTreeNode: React.FC<FileTreeNodeProps> = ({ nodes, nodesById, onOpenFile, level }) => {
  const { listChildren } = useFileTree();

  return (
    <>
      {nodes.map(node => (
        <div key={node.id}>
          <div
            className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-nav-hover cursor-pointer group"
            style={{ paddingLeft: `${8 + level * 16}px` }}
            onDoubleClick={() => {
              if (node.type === 'file' && node.documentId) {
                onOpenFile(node.id, node.name, node.documentId);
              }
            }}
          >
            {node.type === 'file' ? (
              <FileText className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            ) : (
              <Folder className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            )}
            <span className="text-sm text-foreground truncate flex-1">{node.name}</span>
          </div>
          
          {/* Render children for folders */}
          {node.type === 'folder' && (
            <FileTreeNode
              nodes={listChildren(node.id)}
              nodesById={nodesById}
              onOpenFile={onOpenFile}
              level={level + 1}
            />
          )}
        </div>
      ))}
    </>
  );
};

export default GlobalSidebar;