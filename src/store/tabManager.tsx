import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

export interface Tab {
  id: string;
  title: string;
  isActive: boolean;
  isDirty?: boolean;
  isLocked?: boolean;
  filePath?: string;
  documentId?: string;
  groupId?: string;
  color?: string;
  stackId?: string;
  lastActivated?: number;
}

export interface TabGroup {
  id: string;
  name: string;
  color: string;
  tabs: string[]; // tab IDs
  isCollapsed: boolean;
  isLocked: boolean;
  position: number;
}

export interface TabStack {
  id: string;
  tabs: string[]; // tab IDs
  activeTabIndex: number;
  isStacked: boolean;
  stackTitle?: string;
  panelId: string;
}

export interface WorkspaceLayout {
  id: string;
  name: string;
  description?: string;
  panelTree: any; // PanelNode from ObsidianLayout
  tabGroups: Record<string, TabGroup>;
  tabStacks: Record<string, TabStack>;
  createdAt: number;
  isDefault?: boolean;
}

interface NavigationHistory {
  panelId: string;
  history: string[]; // tab IDs
  currentIndex: number;
  maxSize: number;
}

interface TabManagerState {
  tabGroups: Record<string, TabGroup>;
  tabStacks: Record<string, TabStack>;
  workspaceLayouts: Record<string, WorkspaceLayout>;
  navigationHistories: Record<string, NavigationHistory>;
  shortcuts: Record<string, string>;
  settings: {
    maxVisibleTabs: number;
    enableAutoStacking: boolean;
    stackingStrategy: 'overflow' | 'group' | 'manual';
    enableTabGroups: boolean;
    showTabPreview: boolean;
  };
}

interface TabManagerContextValue extends TabManagerState {
  // Tab Group Management
  createTabGroup: (name: string, color: string, tabIds: string[]) => string;
  updateTabGroup: (groupId: string, updates: Partial<TabGroup>) => void;
  deleteTabGroup: (groupId: string) => void;
  addTabToGroup: (tabId: string, groupId: string) => void;
  removeTabFromGroup: (tabId: string) => void;
  moveTabBetweenGroups: (tabId: string, fromGroupId: string, toGroupId: string) => void;
  
  // Tab Stack Management
  createTabStack: (panelId: string, tabIds: string[]) => string;
  addTabToStack: (tabId: string, stackId: string) => void;
  removeTabFromStack: (tabId: string, stackId: string) => void;
  setStackActiveTab: (stackId: string, tabIndex: number) => void;
  toggleStackMode: (stackId: string) => void;
  
  // Workspace Layout Management
  saveWorkspaceLayout: (name: string, panelTree: any, description?: string) => string;
  loadWorkspaceLayout: (layoutId: string) => WorkspaceLayout | null;
  deleteWorkspaceLayout: (layoutId: string) => void;
  setDefaultLayout: (layoutId: string) => void;
  
  // Navigation Management
  addToHistory: (panelId: string, tabId: string) => void;
  navigateBack: (panelId: string) => string | null;
  navigateForward: (panelId: string) => string | null;
  getRecentTabs: (panelId: string, limit?: number) => string[];
  
  // Settings Management
  updateSettings: (settings: Partial<TabManagerState['settings']>) => void;
  
  // Utility Functions
  getTabsByGroup: (groupId: string) => Tab[];
  getTabsByStack: (stackId: string) => Tab[];
  shouldStackTabs: (panelId: string, tabCount: number) => boolean;
  getGroupColors: () => string[];
}

const TabManagerContext = createContext<TabManagerContextValue | null>(null);

const DEFAULT_SETTINGS: TabManagerState['settings'] = {
  maxVisibleTabs: 8,
  enableAutoStacking: true,
  stackingStrategy: 'overflow',
  enableTabGroups: true,
  showTabPreview: true,
};

const DEFAULT_GROUP_COLORS = [
  '#3b82f6', // blue
  '#ef4444', // red
  '#10b981', // green
  '#f59e0b', // amber
  '#8b5cf6', // purple
  '#06b6d4', // cyan
  '#ec4899', // pink
  '#84cc16', // lime
];

export const TabManagerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<TabManagerState>({
    tabGroups: {},
    tabStacks: {},
    workspaceLayouts: {},
    navigationHistories: {},
    shortcuts: {},
    settings: DEFAULT_SETTINGS,
  });

  const saveTimer = useRef<number | null>(null);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('obsidian.clone.tabManager');
      if (saved) {
        const parsed = JSON.parse(saved) as TabManagerState;
        setState(prev => ({ ...prev, ...parsed, settings: { ...DEFAULT_SETTINGS, ...parsed.settings } }));
      }
    } catch (error) {
      console.error('Failed to load tab manager state:', error);
    }
  }, []);

  // Debounced save to localStorage
  useEffect(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      try {
        localStorage.setItem('obsidian.clone.tabManager', JSON.stringify(state));
      } catch (error) {
        console.error('Failed to save tab manager state:', error);
      }
    }, 500);

    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [state]);

  // Tab Group Management
  const createTabGroup = useCallback((name: string, color: string, tabIds: string[] = []): string => {
    const groupId = `group_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const newGroup: TabGroup = {
      id: groupId,
      name,
      color,
      tabs: tabIds,
      isCollapsed: false,
      isLocked: false,
      position: Object.keys(state.tabGroups).length,
    };

    setState(prev => ({
      ...prev,
      tabGroups: { ...prev.tabGroups, [groupId]: newGroup },
    }));

    return groupId;
  }, [state.tabGroups]);

  const updateTabGroup = useCallback((groupId: string, updates: Partial<TabGroup>) => {
    setState(prev => ({
      ...prev,
      tabGroups: {
        ...prev.tabGroups,
        [groupId]: { ...prev.tabGroups[groupId], ...updates },
      },
    }));
  }, []);

  const deleteTabGroup = useCallback((groupId: string) => {
    setState(prev => {
      const newGroups = { ...prev.tabGroups };
      delete newGroups[groupId];
      return { ...prev, tabGroups: newGroups };
    });
  }, []);

  const addTabToGroup = useCallback((tabId: string, groupId: string) => {
    setState(prev => {
      const group = prev.tabGroups[groupId];
      if (!group || group.tabs.includes(tabId)) return prev;

      return {
        ...prev,
        tabGroups: {
          ...prev.tabGroups,
          [groupId]: { ...group, tabs: [...group.tabs, tabId] },
        },
      };
    });
  }, []);

  const removeTabFromGroup = useCallback((tabId: string) => {
    setState(prev => {
      const newGroups = { ...prev.tabGroups };
      Object.values(newGroups).forEach(group => {
        const index = group.tabs.indexOf(tabId);
        if (index > -1) {
          group.tabs = group.tabs.filter(id => id !== tabId);
        }
      });
      return { ...prev, tabGroups: newGroups };
    });
  }, []);

  const moveTabBetweenGroups = useCallback((tabId: string, fromGroupId: string, toGroupId: string) => {
    setState(prev => {
      const newGroups = { ...prev.tabGroups };
      const fromGroup = newGroups[fromGroupId];
      const toGroup = newGroups[toGroupId];

      if (!fromGroup || !toGroup) return prev;

      // Remove from source group
      fromGroup.tabs = fromGroup.tabs.filter(id => id !== tabId);
      
      // Add to target group if not already present
      if (!toGroup.tabs.includes(tabId)) {
        toGroup.tabs.push(tabId);
      }

      return { ...prev, tabGroups: newGroups };
    });
  }, []);

  // Tab Stack Management
  const createTabStack = useCallback((panelId: string, tabIds: string[] = []): string => {
    const stackId = `stack_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const newStack: TabStack = {
      id: stackId,
      tabs: tabIds,
      activeTabIndex: 0,
      isStacked: true,
      panelId,
    };

    setState(prev => ({
      ...prev,
      tabStacks: { ...prev.tabStacks, [stackId]: newStack },
    }));

    return stackId;
  }, []);

  const addTabToStack = useCallback((tabId: string, stackId: string) => {
    setState(prev => {
      const stack = prev.tabStacks[stackId];
      if (!stack || stack.tabs.includes(tabId)) return prev;

      return {
        ...prev,
        tabStacks: {
          ...prev.tabStacks,
          [stackId]: { ...stack, tabs: [...stack.tabs, tabId] },
        },
      };
    });
  }, []);

  const removeTabFromStack = useCallback((tabId: string, stackId: string) => {
    setState(prev => {
      const stack = prev.tabStacks[stackId];
      if (!stack) return prev;

      const newTabs = stack.tabs.filter(id => id !== tabId);
      const newActiveIndex = Math.min(stack.activeTabIndex, Math.max(0, newTabs.length - 1));

      return {
        ...prev,
        tabStacks: {
          ...prev.tabStacks,
          [stackId]: { ...stack, tabs: newTabs, activeTabIndex: newActiveIndex },
        },
      };
    });
  }, []);

  const setStackActiveTab = useCallback((stackId: string, tabIndex: number) => {
    setState(prev => {
      const stack = prev.tabStacks[stackId];
      if (!stack || tabIndex < 0 || tabIndex >= stack.tabs.length) return prev;

      return {
        ...prev,
        tabStacks: {
          ...prev.tabStacks,
          [stackId]: { ...stack, activeTabIndex: tabIndex },
        },
      };
    });
  }, []);

  const toggleStackMode = useCallback((stackId: string) => {
    setState(prev => ({
      ...prev,
      tabStacks: {
        ...prev.tabStacks,
        [stackId]: { ...prev.tabStacks[stackId], isStacked: !prev.tabStacks[stackId].isStacked },
      },
    }));
  }, []);

  // Workspace Layout Management
  const saveWorkspaceLayout = useCallback((name: string, panelTree: any, description?: string): string => {
    const layoutId = `layout_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const newLayout: WorkspaceLayout = {
      id: layoutId,
      name,
      description,
      panelTree,
      tabGroups: { ...state.tabGroups },
      tabStacks: { ...state.tabStacks },
      createdAt: Date.now(),
    };

    setState(prev => ({
      ...prev,
      workspaceLayouts: { ...prev.workspaceLayouts, [layoutId]: newLayout },
    }));

    return layoutId;
  }, [state.tabGroups, state.tabStacks]);

  const loadWorkspaceLayout = useCallback((layoutId: string): WorkspaceLayout | null => {
    const layout = state.workspaceLayouts[layoutId];
    if (!layout) return null;

    setState(prev => ({
      ...prev,
      tabGroups: { ...layout.tabGroups },
      tabStacks: { ...layout.tabStacks },
    }));

    return layout;
  }, [state.workspaceLayouts]);

  const deleteWorkspaceLayout = useCallback((layoutId: string) => {
    setState(prev => {
      const newLayouts = { ...prev.workspaceLayouts };
      delete newLayouts[layoutId];
      return { ...prev, workspaceLayouts: newLayouts };
    });
  }, []);

  const setDefaultLayout = useCallback((layoutId: string) => {
    setState(prev => {
      const newLayouts = { ...prev.workspaceLayouts };
      Object.values(newLayouts).forEach(layout => {
        layout.isDefault = layout.id === layoutId;
      });
      return { ...prev, workspaceLayouts: newLayouts };
    });
  }, []);

  // Navigation Management
  const addToHistory = useCallback((panelId: string, tabId: string) => {
    setState(prev => {
      const history = prev.navigationHistories[panelId] || {
        panelId,
        history: [],
        currentIndex: -1,
        maxSize: 50,
      };

      const newHistory = [...history.history];
      const existingIndex = newHistory.indexOf(tabId);
      
      if (existingIndex > -1) {
        newHistory.splice(existingIndex, 1);
      }
      
      newHistory.push(tabId);
      
      if (newHistory.length > history.maxSize) {
        newHistory.shift();
      }

      return {
        ...prev,
        navigationHistories: {
          ...prev.navigationHistories,
          [panelId]: {
            ...history,
            history: newHistory,
            currentIndex: newHistory.length - 1,
          },
        },
      };
    });
  }, []);

  const navigateBack = useCallback((panelId: string): string | null => {
    const history = state.navigationHistories[panelId];
    if (!history || history.currentIndex <= 0) return null;

    const newIndex = history.currentIndex - 1;
    const tabId = history.history[newIndex];

    setState(prev => ({
      ...prev,
      navigationHistories: {
        ...prev.navigationHistories,
        [panelId]: { ...history, currentIndex: newIndex },
      },
    }));

    return tabId;
  }, [state.navigationHistories]);

  const navigateForward = useCallback((panelId: string): string | null => {
    const history = state.navigationHistories[panelId];
    if (!history || history.currentIndex >= history.history.length - 1) return null;

    const newIndex = history.currentIndex + 1;
    const tabId = history.history[newIndex];

    setState(prev => ({
      ...prev,
      navigationHistories: {
        ...prev.navigationHistories,
        [panelId]: { ...history, currentIndex: newIndex },
      },
    }));

    return tabId;
  }, [state.navigationHistories]);

  const getRecentTabs = useCallback((panelId: string, limit: number = 10): string[] => {
    const history = state.navigationHistories[panelId];
    if (!history) return [];

    return history.history.slice(-limit).reverse();
  }, [state.navigationHistories]);

  // Settings Management
  const updateSettings = useCallback((settings: Partial<TabManagerState['settings']>) => {
    setState(prev => ({
      ...prev,
      settings: { ...prev.settings, ...settings },
    }));
  }, []);

  // Utility Functions
  const getTabsByGroup = useCallback((groupId: string): Tab[] => {
    const group = state.tabGroups[groupId];
    return group ? group.tabs.map(id => ({ id } as Tab)) : [];
  }, [state.tabGroups]);

  const getTabsByStack = useCallback((stackId: string): Tab[] => {
    const stack = state.tabStacks[stackId];
    return stack ? stack.tabs.map(id => ({ id } as Tab)) : [];
  }, [state.tabStacks]);

  const shouldStackTabs = useCallback((panelId: string, tabCount: number): boolean => {
    return state.settings.enableAutoStacking && 
           state.settings.stackingStrategy === 'overflow' && 
           tabCount > state.settings.maxVisibleTabs;
  }, [state.settings]);

  const getGroupColors = useCallback((): string[] => {
    return DEFAULT_GROUP_COLORS;
  }, []);

  const value = useMemo<TabManagerContextValue>(() => ({
    ...state,
    createTabGroup,
    updateTabGroup,
    deleteTabGroup,
    addTabToGroup,
    removeTabFromGroup,
    moveTabBetweenGroups,
    createTabStack,
    addTabToStack,
    removeTabFromStack,
    setStackActiveTab,
    toggleStackMode,
    saveWorkspaceLayout,
    loadWorkspaceLayout,
    deleteWorkspaceLayout,
    setDefaultLayout,
    addToHistory,
    navigateBack,
    navigateForward,
    getRecentTabs,
    updateSettings,
    getTabsByGroup,
    getTabsByStack,
    shouldStackTabs,
    getGroupColors,
  }), [
    state,
    createTabGroup,
    updateTabGroup,
    deleteTabGroup,
    addTabToGroup,
    removeTabFromGroup,
    moveTabBetweenGroups,
    createTabStack,
    addTabToStack,
    removeTabFromStack,
    setStackActiveTab,
    toggleStackMode,
    saveWorkspaceLayout,
    loadWorkspaceLayout,
    deleteWorkspaceLayout,
    setDefaultLayout,
    addToHistory,
    navigateBack,
    navigateForward,
    getRecentTabs,
    updateSettings,
    getTabsByGroup,
    getTabsByStack,
    shouldStackTabs,
    getGroupColors,
  ]);

  return (
    <TabManagerContext.Provider value={value}>
      {children}
    </TabManagerContext.Provider>
  );
};

export const useTabManager = (): TabManagerContextValue => {
  const context = useContext(TabManagerContext);
  if (!context) {
    throw new Error('useTabManager must be used within TabManagerProvider');
  }
  return context;
};