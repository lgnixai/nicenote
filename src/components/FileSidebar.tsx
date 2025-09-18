import React, { useCallback, useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import { useFileTree, type FileNodeData } from '@/store/filetree';
import { useDocuments } from '@/store/documents';
import { FolderPlus, FilePlus, ChevronRight, ChevronDown, FileText } from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from '@/components/ui/sidebar';

interface FileSidebarProps {
  onOpenFile: (node: FileNodeData) => void;
}

const FileSidebar: React.FC<FileSidebarProps> = ({ onOpenFile }) => {
  const { rootId, listChildren, createFolder, createFile, nodesById } = useFileTree();
  const { createDocument } = useDocuments();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const toggle = useCallback((id: string) => {
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const handleCreateFolder = useCallback(() => {
    createFolder(rootId);
    setExpanded(prev => ({ ...prev, [rootId]: true }));
  }, [createFolder, rootId]);

  const handleCreateFile = useCallback(() => {
    const docId = createDocument('未命名.md', { language: 'markdown', content: '' });
    const fileId = createFile(rootId, '未命名.md', docId);
    setExpanded(prev => ({ ...prev, [rootId]: true }));
    // Open immediately
    const node = nodesById[fileId];
    if (node) onOpenFile(node);
  }, [createDocument, createFile, nodesById, rootId, onOpenFile]);

  const renderChildren = useCallback((folderId: string, depth: number) => {
    const children = listChildren(folderId);
    if (children.length === 0) {
      return (
        <div className="px-2 py-1 text-xs text-muted-foreground">暂无文件</div>
      );
    }
    return (
      <div className="space-y-0.5">
        {children.map(child => (
          <div key={child.id} className="w-full">
            {child.type === 'folder' ? (
              <div>
                <button
                  className={cn(
                    'w-full flex items-center gap-2 px-2 py-1 rounded hover:bg-sidebar-accent text-left',
                  )}
                  onClick={() => toggle(child.id)}
                >
                  {expanded[child.id] ? (
                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  )}
                  <span className="text-sm text-foreground truncate">{child.name}</span>
                </button>
                {expanded[child.id] && (
                  <div className="ml-4 border-l border-sidebar-border pl-2">
                    {renderChildren(child.id, depth + 1)}
                  </div>
                )}
              </div>
            ) : (
              <div
                className="flex items-center gap-2 px-2 py-1 rounded hover:bg-sidebar-accent cursor-pointer"
                onDoubleClick={() => onOpenFile(child)}
              >
                <FileText className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-foreground truncate">{child.name}</span>
              </div>
            )}
          </div>
        ))}
      </div>
    );
  }, [expanded, listChildren, onOpenFile, toggle]);

  const vaultChildren = useMemo(() => listChildren(rootId), [rootId, listChildren]);

  return (
    <Sidebar collapsible="icon" className="bg-sidebar border-r border-sidebar-border">
      <SidebarHeader>
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs text-muted-foreground">文件</SidebarGroupLabel>
          <div className="flex gap-1 px-2">
            <button className="px-2 py-1 text-xs bg-secondary hover:bg-secondary/80 rounded flex items-center gap-1" onClick={handleCreateFolder}>
              <FolderPlus className="w-3.5 h-3.5" /> 新建文件夹
            </button>
            <button className="px-2 py-1 text-xs bg-secondary hover:bg-secondary/80 rounded flex items-center gap-1" onClick={handleCreateFile}>
              <FilePlus className="w-3.5 h-3.5" /> 新建文件
            </button>
          </div>
        </SidebarGroup>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <div className="flex items-center gap-2 px-2 py-1 text-sm font-medium">
                  <span className="truncate">Vault</span>
                </div>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
          <div className="px-1 mt-1">
            {vaultChildren.length === 0 ? (
              <div className="text-xs text-muted-foreground px-1">暂无文件</div>
            ) : (
              <div>{renderChildren(rootId, 0)}</div>
            )}
          </div>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
};

export default FileSidebar;

