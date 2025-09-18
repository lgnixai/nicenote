import React, { useState, useCallback } from 'react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { TabBar, type TabType } from './Tab';
import Editor from './Editor';

interface PanelNode {
  id: string;
  type: 'leaf' | 'split';
  direction?: 'horizontal' | 'vertical';
  tabs?: TabType[];
  children?: PanelNode[];
  size?: number;
  minSize?: number;
}

const ObsidianLayout: React.FC = () => {
  const [panelTree, setPanelTree] = useState<PanelNode>({
    id: 'root',
    type: 'split',
    direction: 'horizontal',
    children: [
      {
        id: 'left',
        type: 'leaf',
        tabs: [
          { id: '1', title: '新标签页', isActive: true },
          { id: '2', title: '新标签页', isActive: false },
          { id: '3', title: '新标签页', isActive: false }
        ],
        size: 35,
        minSize: 20
      },
      {
        id: 'right-group',
        type: 'split',
        direction: 'vertical',
        size: 65,
        children: [
          {
            id: 'topRight',
            type: 'leaf',
            tabs: [{ id: '4', title: '新标签页', isActive: true }],
            size: 60,
            minSize: 20
          },
          {
            id: 'bottomRight',
            type: 'leaf',
            tabs: [{ id: '5', title: '新标签页', isActive: true }],
            size: 40,
            minSize: 20
          }
        ]
      }
    ]
  });

  const findPanelById = useCallback((tree: PanelNode, id: string): PanelNode | null => {
    if (tree.id === id) return tree;
    if (tree.children) {
      for (const child of tree.children) {
        const result = findPanelById(child, id);
        if (result) return result;
      }
    }
    return null;
  }, []);

  const updatePanelTabs = useCallback((panelId: string, newTabs: TabType[]) => {
    setPanelTree(prevTree => {
      const updateNode = (node: PanelNode): PanelNode => {
        if (node.id === panelId && node.type === 'leaf') {
          return { ...node, tabs: newTabs };
        }
        if (node.children) {
          return { ...node, children: node.children.map(updateNode) };
        }
        return node;
      };
      return updateNode(prevTree);
    });
  }, []);

  const handleToggleLock = useCallback((panelId: string) => (id: string) => {
    const panel = findPanelById(panelTree, panelId);
    if (!panel?.tabs) return;

    const newTabs = panel.tabs.map(tab => 
      tab.id === id ? { ...tab, isLocked: !tab.isLocked } : tab
    );
    updatePanelTabs(panelId, newTabs);
  }, [panelTree, findPanelById, updatePanelTabs]);

  const handleDuplicate = useCallback((panelId: string) => (id: string) => {
    const panel = findPanelById(panelTree, panelId);
    if (!panel?.tabs) return;

    const targetTab = panel.tabs.find(tab => tab.id === id);
    if (targetTab) {
      const newTab = {
        ...targetTab,
        id: Date.now().toString(),
        title: `${targetTab.title} - 副本`,
        isActive: false
      };
      const newTabs = [...panel.tabs, newTab];
      updatePanelTabs(panelId, newTabs);
    }
  }, [panelTree, findPanelById, updatePanelTabs]);

  const handleRename = useCallback((panelId: string) => (id: string, newTitle: string) => {
    const panel = findPanelById(panelTree, panelId);
    if (!panel?.tabs) return;

    const newTabs = panel.tabs.map(tab => 
      tab.id === id ? { ...tab, title: newTitle } : tab
    );
    updatePanelTabs(panelId, newTabs);
  }, [panelTree, findPanelById, updatePanelTabs]);

  const handleCopyPath = useCallback((panelId: string) => (id: string) => {
    const panel = findPanelById(panelTree, panelId);
    if (!panel?.tabs) return;

    const targetTab = panel.tabs.find(tab => tab.id === id);
    if (targetTab?.filePath) {
      navigator.clipboard.writeText(targetTab.filePath);
    }
  }, [panelTree, findPanelById]);

  const handleRevealInExplorer = useCallback((panelId: string) => (id: string) => {
    // 在网页环境中，我们可以显示文件路径或其他相关信息
    const panel = findPanelById(panelTree, panelId);
    if (!panel?.tabs) return;

    const targetTab = panel.tabs.find(tab => tab.id === id);
    if (targetTab) {
      alert(`文件位置: ${targetTab.filePath || '新文件'}`);
    }
  }, [panelTree, findPanelById]);

  const splitPanel = useCallback((panelId: string, direction: 'horizontal' | 'vertical') => {
    setPanelTree(prevTree => {
      const splitNode = (node: PanelNode): PanelNode => {
        if (node.id === panelId && node.type === 'leaf') {
          // 获取当前标签页的活动标签
          const activeTab = node.tabs?.find(tab => tab.isActive);
          const newTab = activeTab 
            ? { ...activeTab, id: Date.now().toString(), isActive: true }
            : { id: Date.now().toString(), title: '新标签页', isActive: true };

          // 创建新的分割面板
          return {
            id: node.id,
            type: 'split',
            direction,
            size: node.size,
            minSize: node.minSize,
            children: [
              {
                id: `${node.id}-original`,
                type: 'leaf',
                tabs: node.tabs,
                size: 50,
                minSize: 20
              },
              {
                id: `${node.id}-split-${Date.now()}`,
                type: 'leaf',
                tabs: [newTab],
                size: 50,
                minSize: 20
              }
            ]
          };
        }
        if (node.children) {
          return { ...node, children: node.children.map(splitNode) };
        }
        return node;
      };
      return splitNode(prevTree);
    });
  }, []);

  const removePanelNode = useCallback((panelId: string) => {
    setPanelTree(prevTree => {
      const removeNode = (node: PanelNode, parentNode?: PanelNode): PanelNode | null => {
        if (node.id === panelId) {
          return null; // 标记为删除
        }
        
        if (node.children) {
          const newChildren = node.children
            .map(child => removeNode(child, node))
            .filter((child): child is PanelNode => child !== null);
          
          // 如果只剩一个子节点，将其提升到当前级别
          if (newChildren.length === 1 && parentNode) {
            return { ...newChildren[0], size: node.size };
          }
          
          return { ...node, children: newChildren };
        }
        
        return node;
      };
      
      const result = removeNode(prevTree);
      return result || {
        id: 'root',
        type: 'leaf',
        tabs: [{ id: Date.now().toString(), title: '新标签页', isActive: true }]
      };
    });
  }, []);

  const handleCloseTab = useCallback((panelId: string) => (id: string) => {
    const panel = findPanelById(panelTree, panelId);
    if (!panel?.tabs) return;

    const newTabs = panel.tabs.filter(tab => tab.id !== id);
    
    if (newTabs.length === 0) {
      // 如果是根面板或唯一面板，保留一个新标签
      const isRootPanel = panelTree.id === panelId;
      const isOnlyPanel = panelTree.type === 'leaf';
      
      if (isRootPanel || isOnlyPanel) {
        const newTab = { id: Date.now().toString(), title: '新标签页', isActive: true };
        updatePanelTabs(panelId, [newTab]);
      } else {
        // 否则删除整个面板
        removePanelNode(panelId);
      }
    } else {
      const closedTab = panel.tabs.find(tab => tab.id === id);
      if (closedTab?.isActive && newTabs.length > 0) {
        newTabs[0].isActive = true;
      }
      updatePanelTabs(panelId, newTabs);
    }
  }, [panelTree, findPanelById, updatePanelTabs, removePanelNode]);

  const handleActivateTab = useCallback((panelId: string) => (id: string) => {
    const panel = findPanelById(panelTree, panelId);
    if (!panel?.tabs) return;

    const newTabs = panel.tabs.map(tab => ({ ...tab, isActive: tab.id === id }));
    updatePanelTabs(panelId, newTabs);
  }, [panelTree, findPanelById, updatePanelTabs]);

  const handleAddTab = useCallback((panelId: string) => () => {
    const panel = findPanelById(panelTree, panelId);
    if (!panel?.tabs) return;

    const newTab = {
      id: Date.now().toString(),
      title: '新标签页',
      isActive: false
    };
    const newTabs = [...panel.tabs, newTab];
    updatePanelTabs(panelId, newTabs);
  }, [panelTree, findPanelById, updatePanelTabs]);

  const handleCloseOthers = useCallback((panelId: string) => (id: string) => {
    const panel = findPanelById(panelTree, panelId);
    if (!panel?.tabs) return;

    const targetTab = panel.tabs.find(tab => tab.id === id);
    if (targetTab) {
      updatePanelTabs(panelId, [{ ...targetTab, isActive: true }]);
    }
  }, [panelTree, findPanelById, updatePanelTabs]);

  const handleCloseAll = useCallback((panelId: string) => () => {
    const newTab = { id: Date.now().toString(), title: '新标签页', isActive: true };
    updatePanelTabs(panelId, [newTab]);
  }, [updatePanelTabs]);

  const handleSplitHorizontal = useCallback((panelId: string) => (id: string) => {
    splitPanel(panelId, 'horizontal');
  }, [splitPanel]);

  const handleSplitVertical = useCallback((panelId: string) => (id: string) => {
    splitPanel(panelId, 'vertical');
  }, [splitPanel]);

  const renderPanelNode = useCallback((node: PanelNode): React.ReactElement => {
    if (node.type === 'leaf' && node.tabs) {
      return (
        <div className="h-full flex flex-col">
          <TabBar
            tabs={node.tabs}
            onCloseTab={handleCloseTab(node.id)}
            onActivateTab={handleActivateTab(node.id)}
            onAddTab={handleAddTab(node.id)}
            onCloseOthers={handleCloseOthers(node.id)}
            onCloseAll={handleCloseAll(node.id)}
            onSplitHorizontal={handleSplitHorizontal(node.id)}
            onSplitVertical={handleSplitVertical(node.id)}
            onToggleLock={handleToggleLock(node.id)}
            onDuplicate={handleDuplicate(node.id)}
            onRename={handleRename(node.id)}
            onCopyPath={handleCopyPath(node.id)}
            onRevealInExplorer={handleRevealInExplorer(node.id)}
          />
          <Editor />
        </div>
      );
    }

    if (node.type === 'split' && node.children && node.children.length > 0) {
      return (
        <PanelGroup direction={node.direction || 'horizontal'}>
          {node.children.map((child, index) => (
            <React.Fragment key={child.id}>
              <Panel 
                defaultSize={child.size || 50} 
                minSize={child.minSize || 20}
                className={node.direction === 'horizontal' && index === 0 ? 'border-r border-border' : ''}
              >
                {renderPanelNode(child)}
              </Panel>
              {index < node.children!.length - 1 && (
                <PanelResizeHandle 
                  className={node.direction === 'horizontal' 
                    ? "w-1 bg-border hover:bg-accent transition-colors duration-200" 
                    : "h-1 bg-border hover:bg-accent transition-colors duration-200"
                  } 
                />
              )}
            </React.Fragment>
          ))}
        </PanelGroup>
      );
    }

    return <div>Error: Invalid panel configuration</div>;
  }, [
    handleCloseTab,
    handleActivateTab,
    handleAddTab,
    handleCloseOthers,
    handleCloseAll,
    handleSplitHorizontal,
    handleSplitVertical,
    handleToggleLock,
    handleDuplicate,
    handleRename,
    handleCopyPath,
    handleRevealInExplorer
  ]);

  return (
    <div className="h-screen flex flex-col bg-background">
      {renderPanelNode(panelTree)}
    </div>
  );
};

export default ObsidianLayout;