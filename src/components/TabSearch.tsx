import React, { useState, useEffect, useRef, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Search, Clock, Hash, FileText, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useTabManager, Tab } from '@/store/tabManager';

interface TabSearchProps {
  isOpen: boolean;
  onClose: () => void;
  tabs: Tab[];
  onTabSelect: (tabId: string) => void;
  currentPanelId?: string;
}

interface SearchResult {
  tab: Tab;
  score: number;
  matchType: 'title' | 'path' | 'group' | 'recent';
  highlightedTitle: string;
}

const TabSearch: React.FC<TabSearchProps> = ({
  isOpen,
  onClose,
  tabs,
  onTabSelect,
  currentPanelId
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const { getRecentTabs, tabGroups } = useTabManager();

  // Get recent tabs for current panel
  const recentTabs = useMemo(() => {
    if (!currentPanelId) return [];
    return getRecentTabs(currentPanelId, 10);
  }, [currentPanelId, getRecentTabs]);

  // Search and filter tabs
  const searchResults = useMemo(() => {
    if (!query.trim()) {
      // Show recent tabs when no query
      return recentTabs
        .map(tabId => tabs.find(tab => tab.id === tabId))
        .filter((tab): tab is Tab => !!tab)
        .slice(0, 8)
        .map((tab, index) => ({
          tab,
          score: 1000 - index, // Higher score for more recent
          matchType: 'recent' as const,
          highlightedTitle: tab.title,
        }));
    }

    const results: SearchResult[] = [];
    const queryLower = query.toLowerCase();
    
    tabs.forEach(tab => {
      const titleLower = tab.title.toLowerCase();
      const pathLower = tab.filePath?.toLowerCase() || '';
      
      let score = 0;
      let matchType: SearchResult['matchType'] = 'title';
      let highlightedTitle = tab.title;
      
      // Title matching (highest priority)
      if (titleLower.includes(queryLower)) {
        score += titleLower === queryLower ? 1000 : 800;
        score += titleLower.startsWith(queryLower) ? 200 : 0;
        matchType = 'title';
        
        // Highlight matching text
        const index = titleLower.indexOf(queryLower);
        if (index >= 0) {
          highlightedTitle = 
            tab.title.slice(0, index) +
            '<mark>' + tab.title.slice(index, index + query.length) + '</mark>' +
            tab.title.slice(index + query.length);
        }
      }
      
      // Path matching
      else if (pathLower.includes(queryLower)) {
        score += 600;
        matchType = 'path';
      }
      
      // Group name matching
      else if (tab.groupId) {
        const group = tabGroups[tab.groupId];
        if (group && group.name.toLowerCase().includes(queryLower)) {
          score += 400;
          matchType = 'group';
        }
      }
      
      // Fuzzy matching for title
      else {
        const fuzzyScore = getFuzzyScore(titleLower, queryLower);
        if (fuzzyScore > 0) {
          score += fuzzyScore;
          matchType = 'title';
        }
      }
      
      // Boost active tabs
      if (tab.isActive) score += 100;
      
      // Boost recently used tabs
      const recentIndex = recentTabs.indexOf(tab.id);
      if (recentIndex >= 0) {
        score += 50 - recentIndex * 5;
      }
      
      if (score > 0) {
        results.push({
          tab,
          score,
          matchType,
          highlightedTitle,
        });
      }
    });
    
    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);
  }, [query, tabs, recentTabs, tabGroups]);

  // Fuzzy search algorithm
  const getFuzzyScore = (text: string, pattern: string): number => {
    if (pattern.length === 0) return 0;
    if (text.length === 0) return 0;
    
    let score = 0;
    let patternIndex = 0;
    let previousMatch = false;
    
    for (let i = 0; i < text.length && patternIndex < pattern.length; i++) {
      if (text[i] === pattern[patternIndex]) {
        score += previousMatch ? 5 : 1;
        previousMatch = true;
        patternIndex++;
      } else {
        previousMatch = false;
      }
    }
    
    return patternIndex === pattern.length ? score : 0;
  };

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev => Math.min(prev + 1, searchResults.length - 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => Math.max(prev - 1, 0));
          break;
        case 'Enter':
          e.preventDefault();
          if (searchResults[selectedIndex]) {
            handleTabSelect(searchResults[selectedIndex].tab.id);
          }
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, searchResults, selectedIndex, onClose]);

  // Reset state when dialog opens
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Auto-scroll selected item into view
  useEffect(() => {
    if (resultsRef.current) {
      const selectedElement = resultsRef.current.children[selectedIndex] as HTMLElement;
      if (selectedElement) {
        selectedElement.scrollIntoView({
          block: 'nearest',
          behavior: 'smooth',
        });
      }
    }
  }, [selectedIndex]);

  const handleTabSelect = (tabId: string) => {
    onTabSelect(tabId);
    onClose();
  };

  const getMatchIcon = (matchType: SearchResult['matchType']) => {
    switch (matchType) {
      case 'recent':
        return <Clock className="w-4 h-4 text-muted-foreground" />;
      case 'path':
        return <FileText className="w-4 h-4 text-muted-foreground" />;
      case 'group':
        return <Hash className="w-4 h-4 text-muted-foreground" />;
      default:
        return <FileText className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getMatchDescription = (result: SearchResult) => {
    switch (result.matchType) {
      case 'recent':
        return '最近使用';
      case 'path':
        return result.tab.filePath || '';
      case 'group':
        const group = result.tab.groupId ? tabGroups[result.tab.groupId] : null;
        return group ? `组: ${group.name}` : '';
      default:
        return result.tab.filePath || '';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl p-0 gap-0">
        <DialogHeader className="px-4 py-3 border-b border-border">
          <DialogTitle className="text-base font-medium">快速跳转标签页</DialogTitle>
        </DialogHeader>
        
        {/* Search input */}
        <div className="relative px-4 py-3 border-b border-border">
          <Search className="absolute left-6 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜索标签页..."
            className="w-full pl-8 pr-4 py-2 bg-transparent border-none outline-none text-foreground placeholder-muted-foreground"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute right-6 top-1/2 transform -translate-y-1/2 p-1 hover:bg-nav-hover rounded"
            >
              <X className="w-3 h-3 text-muted-foreground" />
            </button>
          )}
        </div>
        
        {/* Search results */}
        <div ref={resultsRef} className="max-h-96 overflow-y-auto">
          {searchResults.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              {query ? '未找到匹配的标签页' : '开始输入以搜索标签页'}
            </div>
          ) : (
            searchResults.map((result, index) => (
              <div
                key={result.tab.id}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 cursor-pointer border-b border-border last:border-b-0",
                  index === selectedIndex ? "bg-secondary" : "hover:bg-secondary/50"
                )}
                onClick={() => handleTabSelect(result.tab.id)}
              >
                {getMatchIcon(result.matchType)}
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <div
                      className="font-medium text-foreground truncate"
                      dangerouslySetInnerHTML={{ __html: result.highlightedTitle }}
                    />
                    {result.tab.isDirty && (
                      <div className="w-1.5 h-1.5 bg-primary rounded-full flex-shrink-0" />
                    )}
                    {result.tab.isLocked && (
                      <div className="w-3 h-3 text-muted-foreground flex-shrink-0">
                        🔒
                      </div>
                    )}
                    {result.tab.isActive && (
                      <div className="px-1.5 py-0.5 bg-primary text-primary-foreground text-xs rounded flex-shrink-0">
                        活动
                      </div>
                    )}
                  </div>
                  
                  <div className="text-sm text-muted-foreground truncate">
                    {getMatchDescription(result)}
                  </div>
                </div>
                
                {result.tab.groupId && (
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: tabGroups[result.tab.groupId]?.color }}
                  />
                )}
              </div>
            ))
          )}
        </div>
        
        {/* Footer with shortcuts */}
        <div className="px-4 py-2 bg-secondary/30 text-xs text-muted-foreground border-t border-border">
          <div className="flex items-center justify-between">
            <span>使用 ↑↓ 导航，Enter 选择，Esc 关闭</span>
            <span>{searchResults.length} 个结果</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TabSearch;