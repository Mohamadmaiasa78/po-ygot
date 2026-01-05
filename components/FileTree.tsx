import React, { useState } from 'react';
import { FileNode } from '../types';

interface FileTreeProps {
  nodes: FileNode[];
  onSelect: (node: FileNode) => void;
  selectedPath: string | null;
}

const TreeNode: React.FC<{ node: FileNode; onSelect: (n: FileNode) => void; selectedPath: string | null; depth: number }> = ({ 
  node, 
  onSelect, 
  selectedPath,
  depth 
}) => {
  const [expanded, setExpanded] = useState(false);
  
  const isSelected = node.path === selectedPath;
  
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (node.isDirectory) {
      setExpanded(!expanded);
    } else {
      onSelect(node);
    }
  };

  const getIcon = () => {
    if (node.isDirectory) {
      return expanded 
        ? <i className="fa-regular fa-folder-open mr-2 text-yellow-500"></i>
        : <i className="fa-regular fa-folder mr-2 text-yellow-500"></i>;
    }
    // Simple extension matching for icons
    if (node.name.endsWith('.js') || node.name.endsWith('.ts') || node.name.endsWith('.tsx')) 
      return <i className="fa-brands fa-js mr-2 text-yellow-300"></i>;
    if (node.name.endsWith('.css')) return <i className="fa-brands fa-css3 mr-2 text-blue-400"></i>;
    if (node.name.endsWith('.html')) return <i className="fa-brands fa-html5 mr-2 text-orange-500"></i>;
    if (node.name.endsWith('.java')) return <i className="fa-brands fa-java mr-2 text-red-400"></i>;
    if (node.name.endsWith('.py')) return <i className="fa-brands fa-python mr-2 text-blue-300"></i>;
    return <i className="fa-regular fa-file mr-2 text-gray-400"></i>;
  };

  return (
    <div>
      <div 
        onClick={handleClick}
        className={`
          flex items-center py-1 px-2 cursor-pointer select-none text-sm
          hover:bg-gray-800 transition-colors
          ${isSelected ? 'bg-gray-800 text-accent-blue border-l-2 border-accent-blue' : 'text-gray-400 border-l-2 border-transparent'}
        `}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
      >
        <span className="w-4 flex justify-center text-[10px] text-gray-600 mr-1">
            {node.isDirectory && (
                <i className={`fa-solid fa-chevron-right transition-transform ${expanded ? 'rotate-90' : ''}`}></i>
            )}
        </span>
        {getIcon()}
        <span className="truncate">{node.name}</span>
      </div>
      {node.isDirectory && expanded && node.children && (
        <div>
          {node.children.map((child) => (
            <TreeNode 
              key={child.path} 
              node={child} 
              onSelect={onSelect} 
              selectedPath={selectedPath}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const FileTree: React.FC<FileTreeProps> = ({ nodes, onSelect, selectedPath }) => {
  return (
    <div className="flex-1 overflow-y-auto font-mono">
      {nodes.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-40 text-gray-600 mt-10">
          <i className="fa-regular fa-folder-open text-3xl mb-2 opacity-50"></i>
          <span className="text-xs">No Folder Loaded</span>
        </div>
      ) : (
        nodes.map(node => (
          <TreeNode 
            key={node.path} 
            node={node} 
            onSelect={onSelect} 
            selectedPath={selectedPath}
            depth={0} 
          />
        ))
      )}
    </div>
  );
};

export default FileTree;