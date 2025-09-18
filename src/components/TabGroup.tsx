import React, { useState, useRef } from 'react';
import { cn } from '@/lib/utils';
import { ChevronDown, ChevronRight, X, Lock, Unlock, Palette, Plus, MoreHorizontal } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useTabManager, Tab, TabGroup as TabGroupType } from '@/store/tabManager';
import { DndContext, DragEndEvent, DragOverlay, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, useSortable, arrayMove, horizontalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface TabGroupProps {
  group: TabGroupType;
  tabs: Tab[];
  onTabClick: (tabId: string) => void;
  onTabClose: (tabId: string) => void;
  onTabAction: (tabId: string, action: string) => void;
  onReorderTabs: (tabIds: string[]) => void;
}

interface TabGroupManagerProps {
  groups: TabGroupType[];
  ungroupedTabs: Tab[];
  onTabClick: (tabId: string) => void;
  onTabClose: (tabId: string) => void;
  onTabAction: (tabId: string, action: string) => void;
  onReorderTabs: (tabIds: string[]) => void;
  onCreateGroup: () => void;
}

const TabGroupItem: React.FC<{ tab: Tab; groupId: string; onTabClick: (tabId: string) => void; onTabClose: (tabId: string) => void; }> = ({ 
  tab, 
  groupId, 
  onTabClick, 
  onTabClose 
}) => {
  const { removeTabFromGroup } = useTabManager();
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ 
    id: tab.id, 
    disabled: tab.isLocked 
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition
  } as React.CSSProperties;

  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation();
    removeTabFromGroup(tab.id);
    onTabClose(tab.id);
  };

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      className={cn(
        "group relative flex items-center min-w-0 max-w-[200px] h-8",
        "border-r border-tab-border",
        tab.isActive 
          ? "bg-tab-active" 
          : "bg-tab-inactive hover:bg-tab-hover"
      )}
    >
      <div 
        className="flex-1 flex items-center px-3 cursor-pointer min-w-0"
        onClick={() => onTabClick(tab.id)}
        {...attributes}
        {...listeners}
      >
        {tab.isLocked && (
          <Lock className="w-3 h-3 mr-1.5 text-muted-foreground" />
        )}
        
        <span className="text-sm text-foreground truncate">
          {tab.title}
        </span>
        
        {tab.isDirty && (
          <div className="ml-2 w-1.5 h-1.5 bg-primary rounded-full" />
        )}
      </div>

      <button
        className={cn(
          "flex items-center justify-center w-5 h-5 mr-1",
          "opacity-0 group-hover:opacity-100 hover:bg-nav-hover rounded",
          "transition-opacity duration-150"
        )}
        onClick={handleClose}
      >
        <X className="w-3 h-3 text-muted-foreground hover:text-foreground" />
      </button>
    </div>
  );
};

const TabGroup: React.FC<TabGroupProps> = ({
  group,
  tabs,
  onTabClick,
  onTabClose,
  onTabAction,
  onReorderTabs
}) => {
  const [isRenaming, setIsRenaming] = useState(false);
  const [newName, setNewName] = useState(group.name);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const { updateTabGroup, deleteTabGroup, getGroupColors, removeTabFromGroup } = useTabManager();

  const handleToggleCollapse = () => {
    updateTabGroup(group.id, { isCollapsed: !group.isCollapsed });
  };

  const handleToggleLock = () => {
    updateTabGroup(group.id, { isLocked: !group.isLocked });
  };

  const handleRename = () => {
    if (newName.trim() && newName !== group.name) {
      updateTabGroup(group.id, { name: newName.trim() });
    }
    setIsRenaming(false);
  };

  const handleColorChange = (color: string) => {
    updateTabGroup(group.id, { color });
    setShowColorPicker(false);
  };

  const handleDeleteGroup = () => {
    // Remove all tabs from group first
    group.tabs.forEach(tabId => removeTabFromGroup(tabId));
    deleteTabGroup(group.id);
  };

  const handleCloseAllTabs = () => {
    tabs.forEach(tab => onTabClose(tab.id));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = tabs.findIndex(t => t.id === active.id);
    const newIndex = tabs.findIndex(t => t.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const newOrder = arrayMove(tabs, oldIndex, newIndex);
    onReorderTabs(newOrder.map(t => t.id));
  };

  // DnD sensors: require slight pointer movement to start dragging to avoid click conflicts
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  return (
    <div className="flex flex-col border-b border-border">
      {/* Group header */}
      <div 
        className="flex items-center h-6 px-2 bg-secondary/50 border-b border-border"
        style={{ borderLeftColor: group.color, borderLeftWidth: '3px' }}
      >
        <button
          className="p-0.5 hover:bg-nav-hover rounded mr-1"
          onClick={handleToggleCollapse}
        >
          {group.isCollapsed ? (
            <ChevronRight className="w-3 h-3 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-3 h-3 text-muted-foreground" />
          )}
        </button>

        {isRenaming ? (
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onBlur={handleRename}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleRename();
              if (e.key === 'Escape') {
                setNewName(group.name);
                setIsRenaming(false);
              }
            }}
            className="flex-1 text-xs bg-transparent border-none outline-none text-foreground"
            autoFocus
          />
        ) : (
          <span 
            className="flex-1 text-xs font-medium text-foreground cursor-pointer"
            onDoubleClick={() => setIsRenaming(true)}
          >
            {group.name}
          </span>
        )}

        <div className="flex items-center gap-1">
          <span className="text-xs text-muted-foreground">
            {tabs.length}
          </span>

          {group.isLocked && (
            <Lock className="w-3 h-3 text-muted-foreground" />
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="p-0.5 hover:bg-nav-hover rounded">
                <MoreHorizontal className="w-3 h-3 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 bg-card border border-border shadow-dropdown">
              <DropdownMenuItem 
                className="text-sm hover:bg-secondary cursor-pointer"
                onClick={() => setIsRenaming(true)}
              >
                重命名组
              </DropdownMenuItem>
              <DropdownMenuItem 
                className="text-sm hover:bg-secondary cursor-pointer"
                onClick={() => setShowColorPicker(!showColorPicker)}
              >
                <Palette className="w-4 h-4 mr-2" />
                更改颜色
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                className="text-sm hover:bg-secondary cursor-pointer"
                onClick={handleToggleLock}
              >
                {group.isLocked ? (
                  <>
                    <Unlock className="w-4 h-4 mr-2" />
                    解锁组
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4 mr-2" />
                    锁定组
                  </>
                )}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                className="text-sm hover:bg-secondary cursor-pointer"
                onClick={handleCloseAllTabs}
              >
                关闭所有标签页
              </DropdownMenuItem>
              <DropdownMenuItem 
                className="text-sm hover:bg-secondary cursor-pointer text-destructive"
                onClick={handleDeleteGroup}
              >
                删除组
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Color picker */}
      {showColorPicker && (
        <div className="flex items-center gap-2 p-2 bg-secondary/30 border-b border-border">
          {getGroupColors().map(color => (
            <button
              key={color}
              className={cn(
                "w-6 h-6 rounded-full border-2 hover:scale-110 transition-transform",
                group.color === color ? "border-foreground" : "border-transparent"
              )}
              style={{ backgroundColor: color }}
              onClick={() => handleColorChange(color)}
            />
          ))}
        </div>
      )}

      {/* Group tabs */}
      {!group.isCollapsed && (
        <div className="flex overflow-x-auto">
          <DndContext onDragEnd={handleDragEnd} sensors={sensors}>
            <SortableContext items={tabs.map(t => t.id)} strategy={horizontalListSortingStrategy}>
              {tabs.map(tab => (
                <TabGroupItem
                  key={tab.id}
                  tab={tab}
                  groupId={group.id}
                  onTabClick={onTabClick}
                  onTabClose={onTabClose}
                />
              ))}
            </SortableContext>
          </DndContext>
        </div>
      )}
    </div>
  );
};

const TabGroupManager: React.FC<TabGroupManagerProps> = ({
  groups,
  ungroupedTabs,
  onTabClick,
  onTabClose,
  onTabAction,
  onReorderTabs,
  onCreateGroup
}) => {
  const { createTabGroup } = useTabManager();

  const handleCreateGroup = () => {
    const groupName = `组 ${groups.length + 1}`;
    const colors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6'];
    const color = colors[groups.length % colors.length];
    createTabGroup(groupName, color, []);
  };

  return (
    <div className="flex flex-col">
      {/* Grouped tabs */}
      {groups.map(group => {
        const groupTabs = ungroupedTabs.filter(tab => group.tabs.includes(tab.id));
        return (
          <TabGroup
            key={group.id}
            group={group}
            tabs={groupTabs}
            onTabClick={onTabClick}
            onTabClose={onTabClose}
            onTabAction={onTabAction}
            onReorderTabs={onReorderTabs}
          />
        );
      })}

      {/* Ungrouped tabs */}
      {ungroupedTabs.filter(tab => !groups.some(g => g.tabs.includes(tab.id))).length > 0 && (
        <div className="flex overflow-x-auto border-b border-border">
          {ungroupedTabs
            .filter(tab => !groups.some(g => g.tabs.includes(tab.id)))
            .map(tab => (
              <TabGroupItem
                key={tab.id}
                tab={tab}
                groupId=""
                onTabClick={onTabClick}
                onTabClose={onTabClose}
              />
            ))}
        </div>
      )}

      {/* Create group button */}
      <div className="flex items-center justify-center p-2 border-b border-border">
        <button
          className="flex items-center gap-2 px-3 py-1 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary rounded"
          onClick={handleCreateGroup}
        >
          <Plus className="w-4 h-4" />
          创建标签页组
        </button>
      </div>
    </div>
  );
};

export { TabGroup, TabGroupManager };
export default TabGroup;