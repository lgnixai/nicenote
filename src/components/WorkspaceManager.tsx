import React, { useState, useRef } from 'react';
import { cn } from '@/lib/utils';
import { Save, FolderOpen, Trash2, Star, StarOff, Plus, Settings, Download, Upload, Copy, Clock } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useTabManager, WorkspaceLayout } from '@/store/tabManager';
import { Button } from '@/components/ui/button';

interface WorkspaceManagerProps {
  isOpen: boolean;
  onClose: () => void;
  currentPanelTree: any;
  onLoadLayout: (layout: WorkspaceLayout) => void;
}

interface SaveLayoutDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (name: string, description: string) => void;
}

const SaveLayoutDialog: React.FC<SaveLayoutDialogProps> = ({ isOpen, onClose, onSave }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const handleSave = () => {
    if (name.trim()) {
      onSave(name.trim(), description.trim());
      setName('');
      setDescription('');
      onClose();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      handleSave();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>保存工作区布局</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">
              布局名称 *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="输入布局名称..."
              className="w-full px-3 py-2 bg-secondary border border-border rounded-md text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              autoFocus
            />
          </div>
          
          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">
              描述（可选）
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="描述这个布局的用途..."
              rows={3}
              className="w-full px-3 py-2 bg-secondary border border-border rounded-md text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            取消
          </Button>
          <Button onClick={handleSave} disabled={!name.trim()}>
            保存布局
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const WorkspaceManager: React.FC<WorkspaceManagerProps> = ({
  isOpen,
  onClose,
  currentPanelTree,
  onLoadLayout
}) => {
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [selectedLayout, setSelectedLayout] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const {
    workspaceLayouts,
    saveWorkspaceLayout,
    loadWorkspaceLayout,
    deleteWorkspaceLayout,
    setDefaultLayout
  } = useTabManager();

  const layouts = Object.values(workspaceLayouts).sort((a, b) => {
    if (a.isDefault && !b.isDefault) return -1;
    if (!a.isDefault && b.isDefault) return 1;
    return b.createdAt - a.createdAt;
  });

  const handleSaveLayout = (name: string, description: string) => {
    saveWorkspaceLayout(name, currentPanelTree, description);
  };

  const handleLoadLayout = (layoutId: string) => {
    const layout = loadWorkspaceLayout(layoutId);
    if (layout) {
      onLoadLayout(layout);
      onClose();
    }
  };

  const handleDeleteLayout = (layoutId: string) => {
    if (confirm('确定要删除这个工作区布局吗？')) {
      deleteWorkspaceLayout(layoutId);
    }
  };

  const handleSetDefault = (layoutId: string) => {
    setDefaultLayout(layoutId);
  };

  const handleExportLayout = (layout: WorkspaceLayout) => {
    const dataStr = JSON.stringify(layout, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `workspace-${layout.name.replace(/\s+/g, '-').toLowerCase()}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const handleImportLayout = () => {
    fileInputRef.current?.click();
  };

  const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const layoutData = JSON.parse(e.target?.result as string) as WorkspaceLayout;
          // Generate new ID to avoid conflicts
          const newLayoutId = saveWorkspaceLayout(
            `${layoutData.name} (导入)`,
            layoutData.panelTree,
            layoutData.description
          );
          console.log('Imported layout:', newLayoutId);
        } catch (error) {
          alert('导入失败：文件格式不正确');
        }
      };
      reader.readAsText(file);
    }
    // Reset file input
    event.target.value = '';
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('zh-CN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getLayoutPreview = (layout: WorkspaceLayout) => {
    // Simple preview generation based on panel structure
    const countPanels = (node: any): number => {
      if (node.type === 'leaf') return 1;
      if (node.children) return node.children.reduce((sum: number, child: any) => sum + countPanels(child), 0);
      return 0;
    };
    
    const panelCount = countPanels(layout.panelTree);
    const groupCount = Object.keys(layout.tabGroups).length;
    const stackCount = Object.keys(layout.tabStacks).length;
    
    return `${panelCount} 面板${groupCount > 0 ? `, ${groupCount} 组` : ''}${stackCount > 0 ? `, ${stackCount} 堆叠` : ''}`;
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[80vh] p-0">
          <DialogHeader className="px-6 py-4 border-b border-border">
            <DialogTitle className="text-lg font-semibold">工作区布局管理</DialogTitle>
          </DialogHeader>
          
          <div className="flex flex-1 min-h-0">
            {/* Sidebar */}
            <div className="w-64 border-r border-border bg-secondary/30 p-4">
              <div className="space-y-2">
                <Button
                  onClick={() => setShowSaveDialog(true)}
                  className="w-full justify-start"
                  size="sm"
                >
                  <Save className="w-4 h-4 mr-2" />
                  保存当前布局
                </Button>
                
                <Button
                  onClick={handleImportLayout}
                  variant="outline"
                  className="w-full justify-start"
                  size="sm"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  导入布局
                </Button>
                
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  onChange={handleFileImport}
                  className="hidden"
                />
              </div>
              
              <div className="mt-6">
                <h3 className="text-sm font-medium text-muted-foreground mb-2">快速操作</h3>
                <div className="text-xs text-muted-foreground space-y-1">
                  <div>• 双击布局加载</div>
                  <div>• 右键更多操作</div>
                  <div>• ⭐ 标记默认布局</div>
                </div>
              </div>
            </div>
            
            {/* Main content */}
            <div className="flex-1 p-6 overflow-y-auto">
              {layouts.length === 0 ? (
                <div className="text-center py-12">
                  <FolderOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-2">暂无保存的布局</h3>
                  <p className="text-muted-foreground mb-4">
                    保存当前的工作区布局，以便稍后快速恢复
                  </p>
                  <Button onClick={() => setShowSaveDialog(true)}>
                    <Save className="w-4 h-4 mr-2" />
                    保存当前布局
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {layouts.map(layout => (
                    <div
                      key={layout.id}
                      className={cn(
                        "group relative p-4 border border-border rounded-lg hover:border-primary/50 transition-colors cursor-pointer",
                        selectedLayout === layout.id ? "border-primary bg-primary/5" : "bg-card",
                        layout.isDefault && "ring-2 ring-primary/20"
                      )}
                      onClick={() => setSelectedLayout(layout.id)}
                      onDoubleClick={() => handleLoadLayout(layout.id)}
                    >
                      {/* Header */}
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium text-foreground truncate">
                            {layout.name}
                          </h4>
                          {layout.isDefault && (
                            <Star className="w-4 h-4 text-primary fill-primary" />
                          )}
                        </div>
                        
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="opacity-0 group-hover:opacity-100 p-1 hover:bg-nav-hover rounded transition-opacity">
                              <Settings className="w-4 h-4 text-muted-foreground" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onSelect={() => handleLoadLayout(layout.id)}>
                              <FolderOpen className="w-4 h-4 mr-2" />
                              加载布局
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onSelect={() => handleSetDefault(layout.id)}
                              disabled={layout.isDefault}
                            >
                              {layout.isDefault ? (
                                <><StarOff className="w-4 h-4 mr-2" />取消默认</>
                              ) : (
                                <><Star className="w-4 h-4 mr-2" />设为默认</>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => handleExportLayout(layout)}>
                              <Download className="w-4 h-4 mr-2" />
                              导出布局
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onSelect={() => {
                                navigator.clipboard.writeText(JSON.stringify(layout, null, 2));
                              }}
                            >
                              <Copy className="w-4 h-4 mr-2" />
                              复制数据
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              onSelect={() => handleDeleteLayout(layout.id)}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              删除布局
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      
                      {/* Description */}
                      {layout.description && (
                        <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                          {layout.description}
                        </p>
                      )}
                      
                      {/* Preview info */}
                      <div className="text-xs text-muted-foreground mb-3">
                        {getLayoutPreview(layout)}
                      </div>
                      
                      {/* Footer */}
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDate(layout.createdAt)}
                        </div>
                        
                        {selectedLayout === layout.id && (
                          <Button
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleLoadLayout(layout.id);
                            }}
                          >
                            加载
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
      
      <SaveLayoutDialog
        isOpen={showSaveDialog}
        onClose={() => setShowSaveDialog(false)}
        onSave={handleSaveLayout}
      />
    </>
  );
};

export default WorkspaceManager;