import React from 'react';
import { cn } from '@/lib/utils';

interface EditorProps {
  className?: string;
}

const Editor: React.FC<EditorProps> = ({ className }) => {
  const shortcuts = [
    { text: "创建新文件", shortcut: "⌘ N" },
    { text: "打开文件", shortcut: "⌘ O" },
    { text: "查看近期文件", shortcut: "⌘ O" },
    { text: "关闭标签页", shortcut: "" }
  ];

  return (
    <div className={cn("flex flex-col items-center justify-center h-full bg-card", className)}>
      <div className="text-center space-y-6">
        {shortcuts.map((item, index) => (
          <div key={index} className="group">
            <button 
              className={cn(
                "text-lg font-medium text-accent hover:text-accent/80",
                "transition-colors duration-150 cursor-pointer"
              )}
            >
              {item.text}
              {item.shortcut && (
                <span className="ml-2 text-muted-foreground">
                  ({item.shortcut})
                </span>
              )}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Editor;