import React, { useState, useEffect, useRef } from 'react';
import Sidebar from './components/Sidebar';
import FileTree from './components/FileTree';
import CodePanel from './components/CodePanel';
import LogPanel from './components/LogPanel';
import { FileNode, FlatFile, AppStatus, LogEntry, LogType } from './types';
import { analyzeProjectStructure, translateCode } from './services/geminiService';

const App: React.FC = () => {
  // State
  const [flatFiles, setFlatFiles] = useState<FlatFile[]>([]);
  const [fileTree, setFileTree] = useState<FileNode[]>([]);
  const [selectedFile, setSelectedFile] = useState<FileNode | null>(null);
  
  const [sourceLang, setSourceLang] = useState<string>('Auto-detect');
  const [targetLang, setTargetLang] = useState<string>('Java');
  
  const [status, setStatus] = useState<AppStatus>(AppStatus.IDLE);
  const [convertedContent, setConvertedContent] = useState<Record<string, string>>({});
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [folderName, setFolderName] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'explorer' | 'logs'>('explorer');

  // Helper: Logging
  const addLog = (message: string, type: LogType = LogType.INFO) => {
    const timestamp = new Date().toLocaleTimeString([], { hour12: false });
    setLogs(prev => [...prev, { timestamp, type, message }]);
  };

  // Helper: Build Tree from Flat paths
  const buildFileTree = (files: FlatFile[]): FileNode[] => {
    const root: FileNode[] = [];
    
    files.forEach(file => {
      const parts = file.path.split('/');
      let currentLevel = root;
      
      parts.forEach((part, index) => {
        const isFile = index === parts.length - 1;
        const existingPath = currentLevel.find(n => n.name === part);
        
        if (existingPath) {
          if (!isFile && existingPath.children) {
            currentLevel = existingPath.children;
          }
        } else {
          const newNode: FileNode = {
            name: part,
            path: parts.slice(0, index + 1).join('/'),
            content: isFile ? file.content : null,
            isDirectory: !isFile,
            children: isFile ? undefined : []
          };
          currentLevel.push(newNode);
          if (!isFile && newNode.children) {
            currentLevel = newNode.children;
          }
        }
      });
    });
    return root;
  };

  // Handle Folder Upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setStatus(AppStatus.ANALYZING);
      setLogs([]); // Clear previous logs
      setConvertedContent({});
      setSelectedFile(null);
      
      const files = Array.from(e.target.files);
      const readFiles: FlatFile[] = [];
      let detectedRootFolder = "";

      addLog(`Started loading ${files.length} files...`, LogType.INFO);

      // Read files (Filtering for text files roughly)
      // Note: In a real app, better binary detection is needed.
      const promises = files.map(file => {
        return new Promise<void>((resolve) => {
          // Skip if binary-ish (simple check)
          if (file.name.match(/\.(png|jpg|jpeg|gif|ico|pdf|zip|exe|bin|class|jar)$/i)) {
             resolve();
             return;
          }

          const reader = new FileReader();
          reader.onload = (event) => {
            const path = file.webkitRelativePath || file.name;
            if (!detectedRootFolder) detectedRootFolder = path.split('/')[0];
            
            readFiles.push({
              path: path,
              content: event.target?.result as string
            });
            resolve();
          };
          reader.readAsText(file);
        });
      });

      await Promise.all(promises);

      // Sort files by path
      readFiles.sort((a, b) => a.path.localeCompare(b.path));
      
      setFlatFiles(readFiles);
      setFileTree(buildFileTree(readFiles));
      setFolderName(detectedRootFolder);
      addLog(`Loaded ${readFiles.length} text files successfully.`, LogType.SUCCESS);
      
      // Analyze Structure with Gemini
      if (readFiles.length > 0) {
        addLog("Analyzing project structure with Gemini...", LogType.INFO);
        const structureAnalysis = await analyzeProjectStructure(readFiles.map(f => f.path));
        addLog(`Analysis Result: ${structureAnalysis}`, LogType.SUCCESS);
        
        // Try to auto-set source lang based on analysis (simple heuristic from result string)
        if (sourceLang === 'Auto-detect') {
            const analysisLower = structureAnalysis.toLowerCase();
            let detectedLang = '';

            // Prioritize specific languages based on user request and common project types
            if (analysisLower.includes('kotlin')) detectedLang = 'Kotlin';
            else if (analysisLower.includes('java')) detectedLang = 'Java';
            else if (analysisLower.includes('python')) detectedLang = 'Python';
            else if (analysisLower.includes('php')) detectedLang = 'PHP';
            else if (analysisLower.includes('typescript')) detectedLang = 'TypeScript';
            else if (analysisLower.includes('javascript') || analysisLower.includes('node')) detectedLang = 'JavaScript';
            else if (analysisLower.includes('html') || analysisLower.includes('css')) detectedLang = 'HTML/CSS';
            else if (analysisLower.includes('react')) detectedLang = 'React';
            else if (analysisLower.includes('vue')) detectedLang = 'Vue';
            else if (analysisLower.includes('angular')) detectedLang = 'Angular';
            else if (analysisLower.includes('c#') || analysisLower.includes('csharp')) detectedLang = 'C#';
            else if (analysisLower.includes('go')) detectedLang = 'Go';
            else if (analysisLower.includes('rust')) detectedLang = 'Rust';

            if (detectedLang) {
                setSourceLang(detectedLang);
                addLog(`Auto-detected language: ${detectedLang}`, LogType.SUCCESS);
            } else {
                addLog("Could not confidentally auto-detect language from analysis.", LogType.WARNING);
            }
        }
      }

      setStatus(AppStatus.IDLE);
    }
  };

  // Handle Migration
  const handleMigrate = async () => {
    if (!flatFiles.length) return;
    setStatus(AppStatus.CONVERTING);
    addLog(`Starting migration from ${sourceLang} to ${targetLang}...`, LogType.INFO);

    const newConverted: Record<string, string> = {};

    // For demo purposes, we process the first 5 relevant code files to avoid hitting API limits instantly
    // In a production app, this would use a queue system.
    const eligibleFiles = flatFiles.filter(f => !f.path.includes('node_modules') && !f.path.includes('.git'));
    const batchSize = 5;
    let processedCount = 0;

    for (const file of eligibleFiles) {
      if (processedCount >= batchSize) {
         addLog("Demo limit reached (5 files).", LogType.WARNING);
         break;
      }
      
      // Simple extension check to decide if we should translate
      const isCode = file.path.match(/\.(js|jsx|ts|tsx|java|py|php|html|css|c|cpp|cs|kt|go|rs|rb|swift)$/i);
      
      if (isCode) {
        addLog(`Translating ${file.path}...`, LogType.INFO);
        const translated = await translateCode(file.content, sourceLang, targetLang, file.path);
        newConverted[file.path] = translated;
        addLog(`Translated ${file.path}`, LogType.SUCCESS);
        processedCount++;
        
        // Update state incrementally so user sees progress
        setConvertedContent(prev => ({ ...prev, [file.path]: translated }));
      }
    }

    addLog("Migration batch completed.", LogType.SUCCESS);
    setStatus(AppStatus.COMPLETED);
    
    // Automatically switch to logs to show success, then back or stay
    setActiveTab('logs');
    setTimeout(() => setActiveTab('explorer'), 1500);
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#0B0F19]">
      
      {/* 1. Sidebar */}
      <Sidebar 
        onUpload={handleFileUpload}
        sourceLang={sourceLang}
        setSourceLang={setSourceLang}
        targetLang={targetLang}
        setTargetLang={setTargetLang}
        status={status}
        onMigrate={handleMigrate}
        folderName={folderName}
        fileCount={flatFiles.length}
      />

      {/* 2. Explorer / Logs Panel */}
      <div className="w-64 bg-[#0B0F19] border-r border-gray-800 flex flex-col">
        {/* Tabs */}
        <div className="flex border-b border-gray-800">
           <button 
             onClick={() => setActiveTab('explorer')}
             className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider ${activeTab === 'explorer' ? 'text-accent-blue border-b-2 border-accent-blue bg-gray-900/50' : 'text-gray-500 hover:text-gray-300'}`}
           >
             <i className="fa-regular fa-folder mr-2"></i> Explorer
           </button>
           <button 
             onClick={() => setActiveTab('logs')}
             className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider ${activeTab === 'logs' ? 'text-accent-blue border-b-2 border-accent-blue bg-gray-900/50' : 'text-gray-500 hover:text-gray-300'}`}
           >
             <i className="fa-solid fa-clock-rotate-left mr-2"></i> Logs
           </button>
        </div>

        {activeTab === 'explorer' ? (
           <FileTree 
             nodes={fileTree} 
             onSelect={setSelectedFile} 
             selectedPath={selectedFile?.path || null} 
           />
        ) : (
           <LogPanel logs={logs} />
        )}
      </div>

      {/* 3. Main Content Area - Split View */}
      <div className="flex-1 flex">
        
        {/* Source Code */}
        <div className="flex-1 min-w-0">
          <CodePanel 
            title="Ready for Analysis" 
            language={sourceLang}
            code={selectedFile?.content || null} 
            isEmpty={!selectedFile || !!selectedFile.isDirectory}
          />
        </div>

        {/* Target Code */}
        <div className="flex-1 min-w-0 border-l border-gray-800">
           <CodePanel 
            title="Migration Output" 
            language={targetLang}
            code={selectedFile ? convertedContent[selectedFile.path] : null} 
            isEmpty={!selectedFile || !convertedContent[selectedFile.path]}
            emptyMessage={status === AppStatus.CONVERTING ? "Waiting for conversion..." : "No converted output for this file"}
          />
        </div>
      </div>

    </div>
  );
};

export default App;