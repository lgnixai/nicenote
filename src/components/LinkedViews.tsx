import React, { useState, useEffect, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { 
  FileText, 
  Hash, 
  Link, 
  List, 
  Eye, 
  EyeOff, 
  Settings, 
  ChevronDown,
  ChevronRight,
  Clock,
  Search
} from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useDocuments } from '@/store/documents';
import { Tab } from '@/store/tabManager';

interface LinkedView {
  id: string;
  type: 'outline' | 'backlinks' | 'tags' | 'recent' | 'search';
  title: string;
  isVisible: boolean;
  isCollapsed: boolean;
  position: 'left' | 'right' | 'bottom';
  panelId?: string;
  isLinked: boolean;
}

interface LinkedViewsProps {
  activeTab?: Tab;
  panelId: string;
  position: 'left' | 'right' | 'bottom';
  className?: string;
}

interface ViewContentProps {
  view: LinkedView;
  activeTab?: Tab;
  content: string;
}

const ViewContent: React.FC<ViewContentProps> = ({ view, activeTab, content }) => {
  const { documentsById } = useDocuments();
  
  const renderOutlineView = () => {
    if (!content) return <div className="text-muted-foreground text-sm p-4">暂无内容</div>;
    
    const headings = content.split('\n')
      .map((line, index) => ({ line, index }))
      .filter(({ line }) => line.match(/^#{1,6}\s/))
      .map(({ line, index }) => {
        const match = line.match(/^(#{1,6})\s(.+)$/);
        if (!match) return null;
        return {
          level: match[1].length,
          text: match[2],
          lineIndex: index
        };
      })
      .filter(Boolean);

    if (headings.length === 0) {
      return <div className="text-muted-foreground text-sm p-4">暂无标题</div>;
    }

    return (
      <div className="space-y-1">
        {headings.map((heading, index) => (
          <div
            key={index}
            className={cn(
              "px-2 py-1 text-sm cursor-pointer hover:bg-secondary rounded",
              "text-foreground"
            )}
            style={{ paddingLeft: `${heading!.level * 8 + 8}px` }}
          >
            {heading!.text}
          </div>
        ))}
      </div>
    );
  };

  const renderBacklinksView = () => {
    if (!activeTab?.title) return <div className="text-muted-foreground text-sm p-4">暂无反向链接</div>;
    
    const backlinks = Object.values(documentsById)
      .filter(doc => doc.id !== activeTab.documentId)
      .filter(doc => doc.content.includes(activeTab.title))
      .map(doc => ({
        id: doc.id,
        name: doc.name,
        matches: (doc.content.match(new RegExp(activeTab.title, 'gi')) || []).length
      }));

    if (backlinks.length === 0) {
      return <div className="text-muted-foreground text-sm p-4">暂无反向链接</div>;
    }

    return (
      <div className="space-y-1">
        {backlinks.map(link => (
          <div
            key={link.id}
            className="px-2 py-1 text-sm cursor-pointer hover:bg-secondary rounded flex items-center justify-between"
          >
            <span className="text-foreground">{link.name}</span>
            <span className="text-muted-foreground text-xs">{link.matches}</span>
          </div>
        ))}
      </div>
    );
  };

  const renderTagsView = () => {
    if (!content) return <div className="text-muted-foreground text-sm p-4">暂无标签</div>;
    
    const tags = content.match(/#[\w\u4e00-\u9fff]+/g) || [];
    const tagCounts = tags.reduce((acc, tag) => {
      acc[tag] = (acc[tag] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const uniqueTags = Object.entries(tagCounts);

    if (uniqueTags.length === 0) {
      return <div className="text-muted-foreground text-sm p-4">暂无标签</div>;
    }

    return (
      <div className="space-y-1">
        {uniqueTags.map(([tag, count]) => (
          <div
            key={tag}
            className="px-2 py-1 text-sm cursor-pointer hover:bg-secondary rounded flex items-center justify-between"
          >
            <span className="text-primary">{tag}</span>
            <span className="text-muted-foreground text-xs">{count}</span>
          </div>
        ))}
      </div>
    );
  };

  const renderRecentView = () => {
    const recentDocs = Object.values(documentsById)
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, 10);

    return (
      <div className="space-y-1">
        {recentDocs.map(doc => (
          <div
            key={doc.id}
            className="px-2 py-1 text-sm cursor-pointer hover:bg-secondary rounded"
          >
            <div className="flex items-center justify-between">
              <span className="text-foreground truncate">{doc.name}</span>
              {doc.isDirty && <div className="w-1.5 h-1.5 bg-primary rounded-full" />}
            </div>
            <div className="text-xs text-muted-foreground">
              {new Date(doc.updatedAt).toLocaleString('zh-CN', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderSearchView = () => {
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);

    useEffect(() => {
      if (!searchQuery.trim()) {
        setSearchResults([]);
        return;
      }

      const results = Object.values(documentsById)
        .filter(doc => 
          doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          doc.content.toLowerCase().includes(searchQuery.toLowerCase())
        )
        .map(doc => {
          const nameMatch = doc.name.toLowerCase().includes(searchQuery.toLowerCase());
          const contentMatches = (doc.content.toLowerCase().match(new RegExp(searchQuery.toLowerCase(), 'g')) || []).length;
          
          return {
            id: doc.id,
            name: doc.name,
            nameMatch,
            contentMatches,
            score: (nameMatch ? 100 : 0) + contentMatches
          };
        })
        .filter(result => result.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 20);

      setSearchResults(results);
    }, [searchQuery, documentsById]);

    return (
      <div>
        <div className="p-2 border-b border-border">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-3 h-3 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索文档..."
              className="w-full pl-7 pr-2 py-1 text-xs bg-secondary border-none rounded focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>
        
        <div className="space-y-1 max-h-64 overflow-y-auto">
          {searchResults.length === 0 ? (
            <div className="text-muted-foreground text-sm p-4">
              {searchQuery ? '未找到匹配项' : '输入关键词搜索'}
            </div>
          ) : (
            searchResults.map(result => (
              <div
                key={result.id}
                className="px-2 py-1 text-sm cursor-pointer hover:bg-secondary rounded"
              >
                <div className="flex items-center justify-between">
                  <span className={cn(
                    "truncate",
                    result.nameMatch ? "text-primary" : "text-foreground"
                  )}>
                    {result.name}
                  </span>
                  {result.contentMatches > 0 && (
                    <span className="text-muted-foreground text-xs">
                      {result.contentMatches}
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    );
  };

  switch (view.type) {
    case 'outline':
      return renderOutlineView();
    case 'backlinks':
      return renderBacklinksView();
    case 'tags':
      return renderTagsView();
    case 'recent':
      return renderRecentView();
    case 'search':
      return renderSearchView();
    default:
      return <div className="text-muted-foreground text-sm p-4">未知视图类型</div>;
  }
};

const LinkedViewPanel: React.FC<{ view: LinkedView; activeTab?: Tab; content: string; onToggle: () => void; onToggleVisibility: () => void; }> = ({
  view,
  activeTab,
  content,
  onToggle,
  onToggleVisibility
}) => {
  const getViewIcon = () => {
    switch (view.type) {
      case 'outline': return <List className="w-4 h-4" />;
      case 'backlinks': return <Link className="w-4 h-4" />;
      case 'tags': return <Hash className="w-4 h-4" />;
      case 'recent': return <Clock className="w-4 h-4" />;
      case 'search': return <Search className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  return (
    <div className="border-b border-border last:border-b-0">
      {/* Header */}
      <div className="flex items-center justify-between p-2 bg-secondary/30 hover:bg-secondary/50 transition-colors">
        <div className="flex items-center gap-2">
          <button
            onClick={onToggle}
            className="p-0.5 hover:bg-nav-hover rounded"
          >
            {view.isCollapsed ? (
              <ChevronRight className="w-3 h-3 text-muted-foreground" />
            ) : (
              <ChevronDown className="w-3 h-3 text-muted-foreground" />
            )}
          </button>
          
          <div className="flex items-center gap-1.5">
            {getViewIcon()}
            <span className="text-sm font-medium text-foreground">
              {view.title}
            </span>
          </div>
        </div>
        
        <div className="flex items-center gap-1">
          <button
            onClick={onToggleVisibility}
            className="p-0.5 hover:bg-nav-hover rounded"
            title={view.isVisible ? "隐藏视图" : "显示视图"}
          >
            {view.isVisible ? (
              <Eye className="w-3 h-3 text-muted-foreground" />
            ) : (
              <EyeOff className="w-3 h-3 text-muted-foreground" />
            )}
          </button>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="p-0.5 hover:bg-nav-hover rounded">
                <Settings className="w-3 h-3 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>
                配置视图
              </DropdownMenuItem>
              <DropdownMenuItem>
                重置视图
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      
      {/* Content */}
      {!view.isCollapsed && view.isVisible && (
        <div className="max-h-64 overflow-y-auto">
          <ViewContent view={view} activeTab={activeTab} content={content} />
        </div>
      )}
    </div>
  );
};

const LinkedViews: React.FC<LinkedViewsProps> = ({
  activeTab,
  panelId,
  position,
  className
}) => {
  const { getDocument } = useDocuments();
  const [views, setViews] = useState<LinkedView[]>([
    {
      id: 'outline',
      type: 'outline',
      title: '大纲',
      isVisible: true,
      isCollapsed: false,
      position,
      panelId,
      isLinked: true
    },
    {
      id: 'backlinks',
      type: 'backlinks',
      title: '反向链接',
      isVisible: true,
      isCollapsed: false,
      position,
      panelId,
      isLinked: true
    },
    {
      id: 'tags',
      type: 'tags',
      title: '标签',
      isVisible: true,
      isCollapsed: true,
      position,
      panelId,
      isLinked: true
    },
    {
      id: 'recent',
      type: 'recent',
      title: '最近文档',
      isVisible: true,
      isCollapsed: true,
      position,
      panelId,
      isLinked: false
    },
    {
      id: 'search',
      type: 'search',
      title: '搜索',
      isVisible: false,
      isCollapsed: false,
      position,
      panelId,
      isLinked: false
    }
  ]);

  const activeDocument = useMemo(() => {
    return activeTab?.documentId ? getDocument(activeTab.documentId) : null;
  }, [activeTab?.documentId, getDocument]);

  const handleToggleView = (viewId: string) => {
    setViews(prev => prev.map(view => 
      view.id === viewId 
        ? { ...view, isCollapsed: !view.isCollapsed }
        : view
    ));
  };

  const handleToggleVisibility = (viewId: string) => {
    setViews(prev => prev.map(view => 
      view.id === viewId 
        ? { ...view, isVisible: !view.isVisible }
        : view
    ));
  };

  const visibleViews = views.filter(view => view.isVisible);

  if (visibleViews.length === 0) {
    return null;
  }

  return (
    <div className={cn("bg-panel border-l border-border", className)}>
      {visibleViews.map(view => (
        <LinkedViewPanel
          key={view.id}
          view={view}
          activeTab={view.isLinked ? activeTab : undefined}
          content={view.isLinked && activeDocument ? activeDocument.content : ''}
          onToggle={() => handleToggleView(view.id)}
          onToggleVisibility={() => handleToggleVisibility(view.id)}
        />
      ))}
    </div>
  );
};

export default LinkedViews;