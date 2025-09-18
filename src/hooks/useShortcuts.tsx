import { useEffect, useCallback, useRef } from 'react';
import { useTabManager } from '@/store/tabManager';

interface ShortcutConfig {
  key: string;
  ctrlKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  metaKey?: boolean;
  preventDefault?: boolean;
  description: string;
}

interface ShortcutCallbacks {
  onNewTab?: () => void;
  onCloseTab?: () => void;
  onNextTab?: () => void;
  onPrevTab?: () => void;
  onJumpToTab?: (index: number) => void;
  onQuickSearch?: () => void;
  onReopenClosedTab?: () => void;
  onSplitHorizontal?: () => void;
  onSplitVertical?: () => void;
  onToggleTabGroups?: () => void;
  onSaveWorkspace?: () => void;
  onNavigateBack?: () => void;
  onNavigateForward?: () => void;
  onDuplicateTab?: () => void;
  onLockTab?: () => void;
  onCloseOtherTabs?: () => void;
  onCloseAllTabs?: () => void;
  onMoveTabLeft?: () => void;
  onMoveTabRight?: () => void;
}

const DEFAULT_SHORTCUTS: Record<string, ShortcutConfig> = {
  newTab: { key: 't', ctrlKey: true, description: '新建标签页' },
  closeTab: { key: 'w', ctrlKey: true, description: '关闭当前标签页' },
  nextTab: { key: 'Tab', ctrlKey: true, description: '下一个标签页' },
  prevTab: { key: 'Tab', ctrlKey: true, shiftKey: true, description: '上一个标签页' },
  quickSearch: { key: 'p', ctrlKey: true, description: '快速搜索标签页' },
  reopenClosedTab: { key: 't', ctrlKey: true, shiftKey: true, description: '重新打开已关闭的标签页' },
  splitHorizontal: { key: 'h', ctrlKey: true, shiftKey: true, description: '水平分屏' },
  splitVertical: { key: 'v', ctrlKey: true, shiftKey: true, description: '垂直分屏' },
  toggleTabGroups: { key: 'g', ctrlKey: true, shiftKey: true, description: '切换标签页组显示' },
  saveWorkspace: { key: 's', ctrlKey: true, shiftKey: true, description: '保存工作区' },
  navigateBack: { key: 'ArrowLeft', altKey: true, description: '后退' },
  navigateForward: { key: 'ArrowRight', altKey: true, description: '前进' },
  duplicateTab: { key: 'd', ctrlKey: true, description: '复制标签页' },
  lockTab: { key: 'l', ctrlKey: true, description: '锁定/解锁标签页' },
  closeOtherTabs: { key: 'w', ctrlKey: true, altKey: true, description: '关闭其他标签页' },
  closeAllTabs: { key: 'w', ctrlKey: true, shiftKey: true, altKey: true, description: '关闭所有标签页' },
  moveTabLeft: { key: 'ArrowLeft', ctrlKey: true, shiftKey: true, description: '向左移动标签页' },
  moveTabRight: { key: 'ArrowRight', ctrlKey: true, shiftKey: true, description: '向右移动标签页' },
  
  // Jump to specific tabs (Ctrl+1-9)
  jumpToTab1: { key: '1', ctrlKey: true, description: '跳转到第1个标签页' },
  jumpToTab2: { key: '2', ctrlKey: true, description: '跳转到第2个标签页' },
  jumpToTab3: { key: '3', ctrlKey: true, description: '跳转到第3个标签页' },
  jumpToTab4: { key: '4', ctrlKey: true, description: '跳转到第4个标签页' },
  jumpToTab5: { key: '5', ctrlKey: true, description: '跳转到第5个标签页' },
  jumpToTab6: { key: '6', ctrlKey: true, description: '跳转到第6个标签页' },
  jumpToTab7: { key: '7', ctrlKey: true, description: '跳转到第7个标签页' },
  jumpToTab8: { key: '8', ctrlKey: true, description: '跳转到第8个标签页' },
  jumpToTab9: { key: '9', ctrlKey: true, description: '跳转到最后一个标签页' },
};

export const useShortcuts = (callbacks: ShortcutCallbacks, enabled: boolean = true) => {
  const { shortcuts: customShortcuts } = useTabManager();
  const callbacksRef = useRef(callbacks);
  const closedTabsRef = useRef<Array<{ id: string; title: string; documentId?: string; filePath?: string }>>([]);

  // Update callbacks ref when callbacks change
  useEffect(() => {
    callbacksRef.current = callbacks;
  }, [callbacks]);

  const matchesShortcut = useCallback((event: KeyboardEvent, config: ShortcutConfig): boolean => {
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    
    // Handle key matching
    if (event.key !== config.key) return false;
    
    // Handle modifier keys
    const ctrlOrCmd = isMac ? event.metaKey : event.ctrlKey;
    const expectedCtrl = config.ctrlKey || config.metaKey;
    
    if (!!expectedCtrl !== !!ctrlOrCmd) return false;
    if (!!config.shiftKey !== !!event.shiftKey) return false;
    if (!!config.altKey !== !!event.altKey) return false;
    
    return true;
  }, []);

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!enabled) return;

    // Skip if user is typing in an input field
    const target = event.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.contentEditable === 'true') {
      return;
    }

    const shortcuts = { ...DEFAULT_SHORTCUTS, ...customShortcuts };
    
    for (const [action, config] of Object.entries(shortcuts)) {
      if (matchesShortcut(event, config)) {
        if (config.preventDefault !== false) {
          event.preventDefault();
          event.stopPropagation();
        }

        const callbacks = callbacksRef.current;

        switch (action) {
          case 'newTab':
            callbacks.onNewTab?.();
            break;
          case 'closeTab':
            callbacks.onCloseTab?.();
            break;
          case 'nextTab':
            callbacks.onNextTab?.();
            break;
          case 'prevTab':
            callbacks.onPrevTab?.();
            break;
          case 'quickSearch':
            callbacks.onQuickSearch?.();
            break;
          case 'reopenClosedTab':
            callbacks.onReopenClosedTab?.();
            break;
          case 'splitHorizontal':
            callbacks.onSplitHorizontal?.();
            break;
          case 'splitVertical':
            callbacks.onSplitVertical?.();
            break;
          case 'toggleTabGroups':
            callbacks.onToggleTabGroups?.();
            break;
          case 'saveWorkspace':
            callbacks.onSaveWorkspace?.();
            break;
          case 'navigateBack':
            callbacks.onNavigateBack?.();
            break;
          case 'navigateForward':
            callbacks.onNavigateForward?.();
            break;
          case 'duplicateTab':
            callbacks.onDuplicateTab?.();
            break;
          case 'lockTab':
            callbacks.onLockTab?.();
            break;
          case 'closeOtherTabs':
            callbacks.onCloseOtherTabs?.();
            break;
          case 'closeAllTabs':
            callbacks.onCloseAllTabs?.();
            break;
          case 'moveTabLeft':
            callbacks.onMoveTabLeft?.();
            break;
          case 'moveTabRight':
            callbacks.onMoveTabRight?.();
            break;
          default:
            // Handle jump to tab shortcuts
            if (action.startsWith('jumpToTab')) {
              const tabNumber = parseInt(action.replace('jumpToTab', ''));
              callbacks.onJumpToTab?.(tabNumber === 9 ? -1 : tabNumber - 1); // -1 means last tab
            }
            break;
        }
        break;
      }
    }
  }, [enabled, customShortcuts, matchesShortcut]);

  useEffect(() => {
    if (enabled) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [handleKeyDown, enabled]);

  // Utility functions for managing closed tabs
  const addClosedTab = useCallback((tab: { id: string; title: string; documentId?: string; filePath?: string }) => {
    closedTabsRef.current.unshift(tab);
    if (closedTabsRef.current.length > 10) {
      closedTabsRef.current = closedTabsRef.current.slice(0, 10);
    }
  }, []);

  const getLastClosedTab = useCallback(() => {
    return closedTabsRef.current.shift();
  }, []);

  const getShortcutDescription = useCallback((action: string): string => {
    const shortcuts = { ...DEFAULT_SHORTCUTS, ...customShortcuts };
    const config = shortcuts[action];
    if (!config) return '';

    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const parts: string[] = [];
    
    if (config.ctrlKey || config.metaKey) {
      parts.push(isMac ? '⌘' : 'Ctrl');
    }
    if (config.shiftKey) parts.push('Shift');
    if (config.altKey) parts.push(isMac ? '⌥' : 'Alt');
    parts.push(config.key);
    
    return parts.join('+');
  }, [customShortcuts]);

  const getAllShortcuts = useCallback(() => {
    const shortcuts = { ...DEFAULT_SHORTCUTS, ...customShortcuts };
    return Object.entries(shortcuts).map(([action, config]) => ({
      action,
      shortcut: getShortcutDescription(action),
      description: config.description,
    }));
  }, [customShortcuts, getShortcutDescription]);

  return {
    addClosedTab,
    getLastClosedTab,
    getShortcutDescription,
    getAllShortcuts,
  };
};

export default useShortcuts;