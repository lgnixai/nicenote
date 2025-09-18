import React, { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { ChevronDown, X, MoreHorizontal } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useTabManager, Tab } from '@/store/tabManager';

interface StackedTabProps {
  tabs: Tab[];
  activeTabIndex: number;
  stackId: string;
  onTabClick: (tabId: string) => void;
  onTabClose: (tabId: string) => void;
  onTabAction: (tabId: string, action: string) => void;
  maxVisibleTabs?: number;
}

const StackedTab: React.FC<StackedTabProps> = ({
  tabs,
  activeTabIndex,
  stackId,
  onTabClick,
  onTabClose,
  onTabAction,
  maxVisibleTabs = 3
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const { setStackActiveTab, toggleStackMode, removeTabFromStack } = useTabManager();
  const dropdownRef = useRef<HTMLDivElement>(null);

  const activeTab = tabs[activeTabIndex];
  const visibleTabs = isExpanded ? tabs : tabs.slice(0, maxVisibleTabs);
  const hiddenCount = Math.max(0, tabs.length - maxVisibleTabs);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsExpanded(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleTabClick = (tab: Tab, index: number) => {
    setStackActiveTab(stackId, index);
    onTabClick(tab.id);
    setIsExpanded(false);
  };

  const handleTabClose = (tab: Tab, e: React.MouseEvent) => {
    e.stopPropagation();
    removeTabFromStack(tab.id, stackId);
    onTabClose(tab.id);
  };

  const handleUnstack = () => {
    toggleStackMode(stackId);
    setIsDropdownOpen(false);
  };

  const handleCloseOthers = (keepTabId: string) => {
    tabs.forEach(tab => {
      if (tab.id !== keepTabId) {
        removeTabFromStack(tab.id, stackId);
        onTabClose(tab.id);
      }
    });
    setIsDropdownOpen(false);
  };

  const handleCloseAll = () => {
    tabs.forEach(tab => {
      removeTabFromStack(tab.id, stackId);
      onTabClose(tab.id);
    });
    setIsDropdownOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Main stacked tab display */}
      <div className={cn(
        "group relative flex items-center min-w-0 max-w-[200px] h-8",
        "border-r border-tab-border bg-tab-inactive hover:bg-tab-hover",
        activeTab?.isActive && "bg-tab-active"
      )}>
        {/* Stack indicator */}
        <div className="absolute -top-0.5 -left-0.5 w-full h-full bg-tab-inactive border border-tab-border rounded-t-sm opacity-60" />
        <div className="absolute -top-1 -left-1 w-full h-full bg-tab-inactive border border-tab-border rounded-t-sm opacity-30" />
        
        {/* Active tab content */}
        <div 
          className="relative flex-1 flex items-center px-3 cursor-pointer min-w-0 z-10 bg-inherit"
          onClick={() => activeTab && onTabClick(activeTab.id)}
        >
          {activeTab?.isLocked && (
            <svg className="w-3 h-3 mr-1.5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 0h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          )}
          
          <span className="text-sm text-foreground truncate">
            {activeTab?.title || '空栈'}
          </span>
          
          {activeTab?.isDirty && (
            <div className="ml-2 w-1.5 h-1.5 bg-primary rounded-full" />
          )}
          
          {/* Stack count badge */}
          {tabs.length > 1 && (
            <div className="ml-2 px-1.5 py-0.5 bg-secondary text-xs rounded-full text-muted-foreground">
              {tabs.length}
            </div>
          )}
        </div>

        {/* Stack dropdown */}
        <button
          className={cn(
            "relative z-10 flex items-center justify-center w-5 h-5 mr-1",
            "opacity-0 group-hover:opacity-100 hover:bg-nav-hover rounded",
            "transition-opacity duration-150",
            isExpanded && "opacity-100"
          )}
          onClick={(e) => {
            e.stopPropagation();
            setIsExpanded(!isExpanded);
          }}
        >
          <ChevronDown className={cn(
            "w-3 h-3 text-muted-foreground transition-transform duration-200",
            isExpanded && "rotate-180"
          )} />
        </button>

        {/* Stack options */}
        <DropdownMenu open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
          <DropdownMenuTrigger asChild>
            <button 
              className={cn(
                "relative z-10 flex items-center justify-center w-5 h-5 mr-1",
                "opacity-0 group-hover:opacity-100 hover:bg-nav-hover rounded",
                "transition-opacity duration-150"
              )}
              onClick={(e) => e.stopPropagation()}
            >
              <MoreHorizontal className="w-3 h-3 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-48 bg-card border border-border shadow-dropdown z-50">
            <DropdownMenuItem 
              className="text-sm hover:bg-secondary cursor-pointer"
              onSelect={handleUnstack}
            >
              取消堆叠
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              className="text-sm hover:bg-secondary cursor-pointer"
              onSelect={() => activeTab && handleCloseOthers(activeTab.id)}
            >
              关闭其他标签页
            </DropdownMenuItem>
            <DropdownMenuItem 
              className="text-sm hover:bg-secondary cursor-pointer"
              onSelect={handleCloseAll}
            >
              关闭所有标签页
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Expanded tab list */}
      {isExpanded && (
        <div className="absolute top-full left-0 right-0 bg-card border border-border shadow-dropdown rounded-b-md z-50 max-h-64 overflow-y-auto">
          {tabs.map((tab, index) => (
            <div
              key={tab.id}
              className={cn(
                "flex items-center px-3 py-2 hover:bg-secondary cursor-pointer border-b border-border last:border-b-0",
                index === activeTabIndex && "bg-secondary"
              )}
              onClick={() => handleTabClick(tab, index)}
            >
              {tab.isLocked && (
                <svg className="w-3 h-3 mr-2 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 0h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              )}
              
              <span className="flex-1 text-sm text-foreground truncate">
                {tab.title}
              </span>
              
              {tab.isDirty && (
                <div className="mx-2 w-1.5 h-1.5 bg-primary rounded-full" />
              )}
              
              <button
                className="p-1 hover:bg-nav-hover rounded opacity-0 group-hover:opacity-100"
                onClick={(e) => handleTabClose(tab, e)}
              >
                <X className="w-3 h-3 text-muted-foreground hover:text-foreground" />
              </button>
            </div>
          ))}
          
          {hiddenCount > 0 && !isExpanded && (
            <div className="px-3 py-2 text-xs text-muted-foreground text-center border-t border-border">
              还有 {hiddenCount} 个标签页...
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default StackedTab;