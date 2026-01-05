import React from 'react';
import { SUPPORTED_LANGUAGES, AppStatus } from '../types';

interface SidebarProps {
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  sourceLang: string;
  setSourceLang: (lang: string) => void;
  targetLang: string;
  setTargetLang: (lang: string) => void;
  status: AppStatus;
  onMigrate: () => void;
  folderName: string | null;
  fileCount: number;
}

const Sidebar: React.FC<SidebarProps> = ({
  onUpload,
  sourceLang,
  setSourceLang,
  targetLang,
  setTargetLang,
  status,
  onMigrate,
  folderName,
  fileCount
}) => {
  
  const isProcessing = status === AppStatus.ANALYZING || status === AppStatus.CONVERTING;

  return (
    <div className="w-80 bg-gray-950 border-r border-gray-800 flex flex-col h-full shadow-2xl z-10">
      <div className="p-4 border-b border-gray-800 flex items-center gap-2">
        <i className="fa-solid fa-code-branch text-accent-blue text-xl"></i>
        <h1 className="text-xl font-bold tracking-tight text-white">PolyGlot <span className="text-accent-blue">Engine</span></h1>
      </div>

      <div className="p-4 flex-1 overflow-y-auto space-y-6">
        
        {/* Shield/Info Card */}
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-1 h-full bg-accent-blue"></div>
          <div className="flex items-start gap-3">
            <i className="fa-solid fa-shield-halved text-accent-blue mt-1"></i>
            <div>
              <h3 className="text-sm font-bold text-blue-100 mb-1">CONVERSION SHIELD</h3>
              <p className="text-xs text-gray-400 leading-relaxed">
                Gemini 1.5 Pro & Flash integrated. Config files and binary assets are isolated. Code is transpiled with architectural awareness.
              </p>
            </div>
          </div>
        </div>

        {/* Input Source */}
        <div>
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block">
            Input Source
          </label>
          
          <div className="flex bg-gray-900 p-1 rounded-md border border-gray-800 mb-4">
             <button className="flex-1 py-1.5 text-xs font-medium rounded text-gray-400 hover:text-white hover:bg-gray-800 transition">Snippet</button>
             <button className="flex-1 py-1.5 text-xs font-medium rounded bg-gray-800 text-white shadow-sm border border-gray-700">Project</button>
          </div>

          <div className="relative group">
             {/* Styling the file input to look like a button */}
            <input
              type="file"
              // @ts-ignore - webkitdirectory is standard in modern browsers but missing in some react types
              webkitdirectory=""
              directory=""
              multiple
              onChange={onUpload}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              disabled={isProcessing}
            />
             <div className="w-full py-8 border-2 border-dashed border-gray-700 rounded-lg flex flex-col items-center justify-center text-gray-400 group-hover:border-accent-blue group-hover:text-accent-blue transition-colors bg-gray-900/50">
                <i className="fa-solid fa-folder-open text-2xl mb-2"></i>
                <span className="text-xs font-medium">{folderName ? folderName : "Upload Folder"}</span>
                {fileCount > 0 && <span className="text-[10px] opacity-70 mt-1">{fileCount} files loaded</span>}
             </div>
          </div>
        </div>

        {/* Pipeline Configuration */}
        <div>
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 block">
            Pipeline Configuration
          </label>

          <div className="space-y-4">
            <div>
              <span className="text-xs text-gray-400 mb-1 block">Source Language</span>
              <div className="relative">
                <select 
                  value={sourceLang}
                  onChange={(e) => setSourceLang(e.target.value)}
                  className="w-full bg-gray-900 text-sm text-gray-300 border border-gray-700 rounded px-3 py-2 outline-none focus:border-accent-blue appearance-none"
                >
                  <option value="Auto-detect">Auto-detect</option>
                  {SUPPORTED_LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
                <i className="fa-solid fa-chevron-down absolute right-3 top-3 text-xs text-gray-500 pointer-events-none"></i>
              </div>
            </div>

            <div className="flex justify-center">
              <i className="fa-solid fa-arrow-down text-gray-600"></i>
            </div>

            <div>
              <span className="text-xs text-gray-400 mb-1 block">Target Language</span>
              <div className="relative">
                <select 
                  value={targetLang}
                  onChange={(e) => setTargetLang(e.target.value)}
                  className="w-full bg-gray-900 text-sm text-gray-300 border border-gray-700 rounded px-3 py-2 outline-none focus:border-accent-blue appearance-none"
                >
                  {SUPPORTED_LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
                <i className="fa-solid fa-chevron-down absolute right-3 top-3 text-xs text-gray-500 pointer-events-none"></i>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Footer Action */}
      <div className="p-4 border-t border-gray-800 bg-gray-900/50">
        <button
          onClick={onMigrate}
          disabled={!folderName || isProcessing}
          className={`w-full py-3 rounded flex items-center justify-center gap-2 text-sm font-bold shadow-lg transition-all
            ${!folderName || isProcessing 
              ? 'bg-gray-800 text-gray-500 cursor-not-allowed' 
              : 'bg-accent-blue hover:bg-blue-600 text-white shadow-blue-900/20'}`}
        >
          {isProcessing ? (
             <><i className="fa-solid fa-circle-notch fa-spin"></i> Processing...</>
          ) : (
             <><i className="fa-solid fa-wand-magic-sparkles"></i> Execute Migration</>
          )}
        </button>
      </div>
    </div>
  );
};

export default Sidebar;