import React, { useMemo, useState } from 'react';
import { X, ChevronDown, MoreHorizontal, ArrowLeft, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useDocuments } from '@/store/documents';
import { DndContext, DragEndEvent, DragStartEvent, DragOverlay } from '@dnd-kit/core';
import { SortableContext, useSortable, arrayMove, horizontalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface Tab {
  id: string;
  title: string;
  isActive: boolean;
  isDirty?: boolean;
  isLocked?: boolean;
  filePath?: string;
  documentId?: string;
}

interface TabProps {
  tab: Tab;
  onClose: (id: string) => void;
  onActivate: (id: string) => void;
  onCloseOthers: (id: string) => void;
  onCloseAll: () => void;
  onSplitHorizontal: (id: string) => void;
  onSplitVertical: (id: string) => void;
  onToggleLock: (id: string) => void;
  onDuplicate: (id: string) => void;
  onRename: (id: string, newTitle: string) => void;
  onCopyPath?: (id: string) => void;
  onRevealInExplorer?: (id: string) => void;
}

const Tab: React.FC<TabProps> = ({ 
  tab, 
  onClose, 
  onActivate, 
  onCloseOthers, 
  onCloseAll, 
  onSplitHorizontal, 
  onSplitVertical,
  onToggleLock,
  onDuplicate,
  onRename,
  onCopyPath,
  onRevealInExplorer
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const { getDocument } = useDocuments();
  const doc = useMemo(() => getDocument(tab.documentId), [getDocument, tab.documentId]);
  const [newTitle, setNewTitle] = useState(doc?.name ?? tab.title);

  const handleDropdownClick = (action: string) => {
    setIsDropdownOpen(false);
    switch (action) {
      case 'close':
        if (!tab.isLocked) onClose(tab.id);
        break;
      case 'closeOthers':
        onCloseOthers(tab.id);
        break;
      case 'closeAll':
        onCloseAll();
        break;
      case 'splitHorizontal':
        onSplitHorizontal(tab.id);
        break;
      case 'splitVertical':
        onSplitVertical(tab.id);
        break;
      case 'toggleLock':
        onToggleLock(tab.id);
        break;
      case 'duplicate':
        onDuplicate(tab.id);
        break;
      case 'rename':
        setIsRenaming(true);
        setNewTitle(tab.title);
        break;
      case 'copyPath':
        if (onCopyPath) onCopyPath(tab.id);
        break;
      case 'revealInExplorer':
        if (onRevealInExplorer) onRevealInExplorer(tab.id);
        break;
    }
  };

  const handleRenameSubmit = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      onRename(tab.id, newTitle);
      setIsRenaming(false);
    } else if (e.key === 'Escape') {
      setIsRenaming(false);
      setNewTitle(doc?.name ?? tab.title);
    }
  };

  return (
    <div
      className={cn(
        "group relative flex items-center min-w-0 max-w-[200px] h-8",
        "border-r border-tab-border",
        tab.isActive 
          ? "bg-tab-active" 
          : "bg-tab-inactive hover:bg-tab-hover"
      )}
    >
      {/* Tab content */}
      <div 
        className="flex-1 flex items-center px-3 cursor-pointer min-w-0"
        onClick={() => onActivate(tab.id)}
      >
        {tab.isLocked && (
          <svg className="w-3 h-3 mr-1.5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 0h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        )}
        
        {isRenaming ? (
          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={handleRenameSubmit}
            onBlur={() => setIsRenaming(false)}
            className="flex-1 text-sm bg-transparent border-none outline-none text-foreground"
            autoFocus
          />
        ) : (
          <span className="text-sm text-foreground truncate">
            {doc?.name ?? tab.title}
          </span>
        )}
        
        {(doc?.isDirty || tab.isDirty) && (
          <div className="ml-2 w-1.5 h-1.5 bg-primary rounded-full" />
        )}
      </div>

      {/* Tab dropdown */}
      <DropdownMenu open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
        <DropdownMenuTrigger asChild>
          <button 
            className={cn(
              "flex items-center justify-center w-5 h-5 mr-1",
              "opacity-0 group-hover:opacity-100 hover:bg-nav-hover rounded",
              "transition-opacity duration-150"
            )}
            onClick={(e) => e.stopPropagation()}
          >
            <ChevronDown className="w-3 h-3 text-muted-foreground" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent 
          align="start" 
          className="w-48 bg-card border border-border shadow-dropdown z-50"
        >
          <DropdownMenuItem 
            className="text-sm hover:bg-secondary cursor-pointer"
            onClick={() => handleDropdownClick('close')}
            disabled={tab.isLocked}
          >
            关闭
          </DropdownMenuItem>
          <DropdownMenuItem 
            className="text-sm hover:bg-secondary cursor-pointer"
            onClick={() => handleDropdownClick('closeOthers')}
          >
            关闭其他标签页
          </DropdownMenuItem>
          <DropdownMenuItem 
            className="text-sm hover:bg-secondary cursor-pointer"
            onClick={() => handleDropdownClick('closeAll')}
          >
            全部关闭
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem 
            className="text-sm hover:bg-secondary cursor-pointer"
            onClick={() => handleDropdownClick('duplicate')}
          >
            复制标签页
          </DropdownMenuItem>
          <DropdownMenuItem 
            className="text-sm hover:bg-secondary cursor-pointer"
            onClick={() => handleDropdownClick('rename')}
          >
            重命名
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem 
            className="text-sm hover:bg-secondary cursor-pointer"
            onClick={() => handleDropdownClick('toggleLock')}
          >
            {tab.isLocked ? '解锁' : '锁定'}
          </DropdownMenuItem>
          <DropdownMenuItem 
            className="text-sm hover:bg-secondary cursor-pointer"
            onClick={() => handleDropdownClick('copyPath')}
            disabled={!tab.filePath}
          >
            复制文件路径
          </DropdownMenuItem>
          <DropdownMenuItem 
            className="text-sm hover:bg-secondary cursor-pointer"
            onClick={() => handleDropdownClick('revealInExplorer')}
          >
            在资源管理器中显示
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem 
            className="text-sm hover:bg-secondary cursor-pointer"
            onClick={() => handleDropdownClick('splitHorizontal')}
          >
            左右分屏
          </DropdownMenuItem>
          <DropdownMenuItem 
            className="text-sm hover:bg-secondary cursor-pointer"
            onClick={() => handleDropdownClick('splitVertical')}
          >
            上下分屏
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Close button */}
      <button
        className={cn(
          "flex items-center justify-center w-5 h-5 mr-1",
          "opacity-0 group-hover:opacity-100 hover:bg-nav-hover rounded",
          "transition-opacity duration-150"
        )}
        onClick={(e) => {
          e.stopPropagation();
          onClose(tab.id);
        }}
      >
        <X className="w-3 h-3 text-muted-foreground hover:text-foreground" />
      </button>
    </div>
  );
};

interface TabBarProps {
  tabs: Tab[];
  onCloseTab: (id: string) => void;
  onActivateTab: (id: string) => void;
  onAddTab: () => void;
  onCloseOthers: (id: string) => void;
  onCloseAll: () => void;
  onSplitHorizontal: (id: string) => void;
  onSplitVertical: (id: string) => void;
  onToggleLock: (id: string) => void;
  onDuplicate: (id: string) => void;
  onRename: (id: string, newTitle: string) => void;
  onCopyPath?: (id: string) => void;
  onRevealInExplorer?: (id: string) => void;
  onReorderTabs: (tabs: Tab[]) => void;
  onBack?: () => void;
  onForward?: () => void;
}

const TabBar: React.FC<TabBarProps> = ({ 
  tabs, 
  onCloseTab, 
  onActivateTab, 
  onAddTab, 
  onCloseOthers, 
  onCloseAll, 
  onSplitHorizontal, 
  onSplitVertical,
  onToggleLock,
  onDuplicate,
  onRename,
  onCopyPath,
  onRevealInExplorer,
  onReorderTabs,
  onBack,
  onForward
}) => {
  // 排序容器内的单个可排序 Tab
  const SortableTab: React.FC<{ tab: Tab }> = ({ tab }) => {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: tab.id, disabled: tab.isLocked });
    const style = {
      transform: CSS.Transform.toString(transform),
      transition
    } as React.CSSProperties;
    return (
      <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
        <Tab
          key={tab.id}
          tab={tab}
          onClose={onCloseTab}
          onActivate={onActivateTab}
          onCloseOthers={onCloseOthers}
          onCloseAll={onCloseAll}
          onSplitHorizontal={onSplitHorizontal}
          onSplitVertical={onSplitVertical}
          onToggleLock={onToggleLock}
          onDuplicate={onDuplicate}
          onRename={onRename}
          onCopyPath={onCopyPath}
          onRevealInExplorer={onRevealInExplorer}
        />
      </div>
    );
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = tabs.findIndex(t => t.id === active.id);
    const newIndex = tabs.findIndex(t => t.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const newOrder = arrayMove(tabs, oldIndex, newIndex).map(t => ({ ...t }));
    const activeId = tabs.find(t => t.isActive)?.id;
    newOrder.forEach(t => { t.isActive = t.id === activeId; });
    onReorderTabs(newOrder);
  };

  return (
    <div className="flex items-center bg-panel border-b border-border">
      {/* Navigation controls */}
      <div className="flex items-center px-2 border-r border-border">
        <button className="p-1 hover:bg-nav-hover rounded" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 text-muted-foreground" />
        </button>
        <button className="p-1 hover:bg-nav-hover rounded" onClick={onForward}>
          <ArrowRight className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex flex-1 overflow-hidden">
        <DndContext onDragEnd={handleDragEnd}>
          <SortableContext items={tabs.map(t => t.id)} strategy={horizontalListSortingStrategy}>
            {tabs.map((tab) => (
              <SortableTab key={tab.id} tab={tab} />
            ))}
          </SortableContext>
        </DndContext>
      </div>

      {/* Add tab button */}
      <div className="flex items-center px-2 border-l border-border">
        <button 
          onClick={onAddTab}
          className="p-1 hover:bg-nav-hover rounded"
        >
          <svg className="w-4 h-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>

        {/* More options */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="p-1 hover:bg-nav-hover rounded ml-1">
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48 bg-card border border-border shadow-dropdown">
            <DropdownMenuItem 
              className="text-sm hover:bg-secondary cursor-pointer"
              onClick={onAddTab}
            >
              新标签页
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <button className="p-1 hover:bg-nav-hover rounded ml-1">
          <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>
    </div>
  );
};

export { Tab, TabBar };
export type { Tab as TabType };