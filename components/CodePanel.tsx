import React from 'react';

interface CodePanelProps {
  title: string;
  code: string | null;
  language: string;
  readOnly?: boolean;
  isEmpty: boolean;
  emptyMessage?: string;
}

const CodePanel: React.FC<CodePanelProps> = ({ 
  title, 
  code, 
  language, 
  isEmpty, 
  emptyMessage = "Select a file to inspect" 
}) => {
  
  // Basic line number generation
  const lines = code ? code.split('\n') : [];

  return (
    <div className="flex flex-col h-full bg-[#0d1117] border-l border-gray-800">
      <div className="h-10 bg-[#161b22] border-b border-gray-800 flex items-center px-4 justify-between">
        <div className="flex items-center gap-2">
           <i className="fa-solid fa-terminal text-gray-500 text-xs"></i>
           <span className="text-xs font-semibold text-gray-300 uppercase tracking-wider">{title}</span>
        </div>
        {code && (
           <span className="text-[10px] px-2 py-0.5 rounded bg-gray-800 text-gray-400 border border-gray-700">{language}</span>
        )}
      </div>

      <div className="flex-1 overflow-hidden relative group">
        {isEmpty ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-600">
            <div className="w-16 h-16 rounded-xl bg-gray-900 flex items-center justify-center mb-4 border border-gray-800">
                <i className="fa-solid fa-file-code text-2xl opacity-50"></i>
            </div>
            <p className="text-sm font-medium">{emptyMessage}</p>
          </div>
        ) : (
          <div className="flex h-full text-sm font-mono overflow-auto custom-scrollbar">
            {/* Line Numbers */}
            <div className="bg-[#0d1117] text-gray-600 text-right pr-4 pl-2 py-4 select-none border-r border-gray-800 w-12 flex-shrink-0">
              {lines.map((_, i) => (
                <div key={i} className="leading-6">{i + 1}</div>
              ))}
            </div>
            {/* Code Content */}
            <div className="flex-1 p-4 bg-[#0d1117] text-gray-300 whitespace-pre tab-4 leading-6">
              {code}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CodePanel;