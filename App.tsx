import React, { useState, useEffect, useRef } from 'react';
import Sidebar from './components/Sidebar';
import FileTree from './components/FileTree';
import CodePanel from './components/CodePanel';
import LogPanel from './components/LogPanel';
// @ts-ignore
import JSZip from 'jszip';
import { FileNode, FlatFile, AppStatus, LogEntry, LogType, MigrationStats } from './types';
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

  // Stats & ZIP & Progress
  const [stats, setStats] = useState<MigrationStats>({ total: 0, processed: 0, success: 0, failed: 0, skipped: 0 });
  const [zipBlob, setZipBlob] = useState<Blob | null>(null);
  const [currentProcessingFile, setCurrentProcessingFile] = useState<string | null>(null);

  // Derived Progress
  const progress = stats.total > 0 ? Math.round((stats.processed / stats.total) * 100) : 0;

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

  // Helper: Detect language from extension
  const getLanguageFromExtension = (filename: string): string => {
    const ext = filename.split('.').pop()?.toLowerCase();
    switch(ext) {
      case 'js': case 'jsx': return 'JavaScript';
      case 'ts': case 'tsx': return 'TypeScript';
      case 'py': return 'Python';
      case 'java': return 'Java';
      case 'php': return 'PHP';
      case 'html': return 'HTML';
      case 'css': return 'CSS';
      case 'cs': return 'C#';
      case 'go': return 'Go';
      case 'rs': return 'Rust';
      case 'rb': return 'Ruby';
      case 'kt': case 'kts': return 'Kotlin';
      case 'swift': return 'Swift';
      case 'vue': return 'Vue';
      default: return 'Unknown';
    }
  };

  // Handle View Current File
  const handleViewCurrent = () => {
    if (!currentProcessingFile) return;
    const file = flatFiles.find(f => f.path === currentProcessingFile);
    if (file) {
       setSelectedFile({
          name: file.path.split('/').pop() || 'unknown',
          path: file.path,
          content: file.content,
          isDirectory: false
       });
    }
  };

  // Handle Folder Upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setStatus(AppStatus.ANALYZING);
      setLogs([]); 
      setConvertedContent({});
      setSelectedFile(null);
      setZipBlob(null);
      setStats({ total: 0, processed: 0, success: 0, failed: 0, skipped: 0 });
      setCurrentProcessingFile(null);
      
      const files = Array.from(e.target.files);
      const readFiles: FlatFile[] = [];
      let detectedRootFolder = "";

      addLog(`Started loading ${files.length} files...`, LogType.INFO);

      // Read files
      const promises = files.map(file => {
        return new Promise<void>((resolve) => {
          // Skip known binary formats early
          if (file.name.match(/\.(png|jpg|jpeg|gif|ico|pdf|zip|exe|bin|class|jar|dll|so|dylib)$/i)) {
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
      
      // Analyze Structure
      if (readFiles.length > 0) {
        addLog("Analyzing project structure with Gemini...", LogType.INFO);
        const structureAnalysis = await analyzeProjectStructure(readFiles.map(f => f.path));
        addLog(`Analysis Result: ${structureAnalysis}`, LogType.SUCCESS);
        
        if (sourceLang === 'Auto-detect') {
            const analysisLower = structureAnalysis.toLowerCase();
            let detectedLang = '';
            
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
            else if (analysisLower.includes('c#')) detectedLang = 'C#';
            else if (analysisLower.includes('go')) detectedLang = 'Go';
            else if (analysisLower.includes('rust')) detectedLang = 'Rust';

            if (detectedLang) {
                setSourceLang(detectedLang);
                addLog(`Auto-detected language: ${detectedLang}`, LogType.SUCCESS);
            } else {
                addLog("Could not confidentally auto-detect language from analysis. Using per-file detection.", LogType.WARNING);
            }
        }
      }

      setStatus(AppStatus.IDLE);
    }
  };

  // Handle Migration with Queue and ZIP
  const handleMigrate = async () => {
    if (!flatFiles.length) return;
    setStatus(AppStatus.CONVERTING);
    addLog(`Starting migration from ${sourceLang} to ${targetLang}...`, LogType.INFO);

    const zip = new JSZip();
    const newConverted: Record<string, string> = {};
    const rootFolder = zip.folder(folderName || "migrated-project");

    const eligibleFiles = flatFiles.filter(f => 
      !f.path.includes('node_modules') && 
      !f.path.includes('.git') &&
      !f.path.includes('.DS_Store') &&
      !f.path.includes('package-lock.json') &&
      !f.path.includes('yarn.lock')
    );

    let currentStats = { total: eligibleFiles.length, processed: 0, success: 0, failed: 0, skipped: 0 };
    setStats(currentStats);

    const CONCURRENCY_LIMIT = 3; 
    let currentIndex = 0;

    const processFile = async (file: FlatFile) => {
        setCurrentProcessingFile(file.path);

        // Decide if we should translate or just copy
        const isCode = file.path.match(/\.(js|jsx|ts|tsx|java|py|php|html|css|c|cpp|cs|kt|go|rs|rb|swift)$/i);
        // Exclude configs unless user wants them (simplistic check)
        const isConfig = file.path.match(/\.(json|xml|yml|yaml|toml|gradle)$/i);

        let finalContent = file.content;
        let isTranslated = false;

        if (isCode && !isConfig) {
            const fileLang = sourceLang === 'Auto-detect' ? getLanguageFromExtension(file.path) : sourceLang;
            
            try {
                addLog(`Translating ${file.path} (${fileLang} -> ${targetLang})...`, LogType.INFO);
                const translated = await translateCode(file.content, fileLang, targetLang, file.path);
                
                if (translated.startsWith('// Error')) {
                    throw new Error(translated);
                }

                finalContent = translated;
                newConverted[file.path] = translated;
                isTranslated = true;
                currentStats.success++;
                addLog(`Success: ${file.path}`, LogType.SUCCESS);
            } catch (err: any) {
                currentStats.failed++;
                addLog(`Failed to translate ${file.path}: ${err.message}`, LogType.ERROR);
                // On fail, we might keep original content or add error comment
                finalContent = `// MIGRATION FAILED for ${file.path}\n// Error: ${err.message}\n\n` + file.content;
            }
        } else {
            currentStats.skipped++;
            addLog(`Skipped conversion for ${file.path} (Asset/Config/Unknown)`, LogType.WARNING);
        }

        // Add to ZIP (maintain hierarchy)
        // Remove root folder name from path if it exists to avoid double nesting if zip.folder is used
        const relativePath = file.path.indexOf('/') > -1 ? file.path.substring(file.path.indexOf('/') + 1) : file.path;
        rootFolder?.file(relativePath, finalContent);

        currentStats.processed++;
        setStats({...currentStats});
        setConvertedContent(prev => ({ ...prev, [file.path]: isTranslated ? finalContent : null }));
    };

    // Processing Loop with Concurrency
    while (currentIndex < eligibleFiles.length) {
        const batch = eligibleFiles.slice(currentIndex, currentIndex + CONCURRENCY_LIMIT);
        await Promise.all(batch.map(file => processFile(file)));
        currentIndex += CONCURRENCY_LIMIT;
    }

    // Generate ZIP
    setCurrentProcessingFile(null);
    addLog("Generating ZIP archive...", LogType.INFO);
    const blob = await zip.generateAsync({ type: "blob" });
    setZipBlob(blob);

    addLog("Migration completed.", LogType.SUCCESS);
    setStatus(AppStatus.COMPLETED);
    setActiveTab('logs');
  };

  const downloadZip = () => {
    if (!zipBlob) return;
    const url = URL.createObjectURL(zipBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${folderName || 'project'}-migrated-${targetLang}.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const SummaryOverlay = () => {
    if (status !== AppStatus.COMPLETED) return null;

    return (
        <div className="absolute inset-0 bg-gray-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-gray-900 border border-gray-700 rounded-xl shadow-2xl max-w-md w-full p-6 text-center">
                <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <i className="fa-solid fa-check text-2xl text-green-500"></i>
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">Migration Complete</h2>
                <p className="text-gray-400 mb-6">Your codebase has been analyzed and processed.</p>

                <div className="grid grid-cols-3 gap-4 mb-6">
                    <div className="bg-gray-800 p-3 rounded-lg">
                        <div className="text-xl font-bold text-white">{stats.success}</div>
                        <div className="text-xs text-gray-400 uppercase">Converted</div>
                    </div>
                    <div className="bg-gray-800 p-3 rounded-lg">
                         <div className="text-xl font-bold text-yellow-500">{stats.skipped}</div>
                         <div className="text-xs text-gray-400 uppercase">Skipped</div>
                    </div>
                    <div className="bg-gray-800 p-3 rounded-lg">
                         <div className="text-xl font-bold text-red-500">{stats.failed}</div>
                         <div className="text-xs text-gray-400 uppercase">Failed</div>
                    </div>
                </div>

                <div className="flex gap-3">
                    <button 
                        onClick={() => setStatus(AppStatus.IDLE)}
                        className="flex-1 py-3 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg font-medium transition"
                    >
                        Close
                    </button>
                    <button 
                        onClick={downloadZip}
                        className="flex-1 py-3 bg-accent-blue hover:bg-blue-600 text-white rounded-lg font-bold shadow-lg shadow-blue-900/30 transition flex items-center justify-center gap-2"
                    >
                        <i className="fa-solid fa-download"></i> Download ZIP
                    </button>
                </div>
            </div>
        </div>
    );
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#0B0F19] relative">
      
      <SummaryOverlay />

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
        progress={progress}
        currentProcessingFile={currentProcessingFile}
        onViewCurrent={handleViewCurrent}
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
            title="Source" 
            language={sourceLang}
            code={selectedFile?.content || null} 
            isEmpty={!selectedFile || !!selectedFile.isDirectory}
          />
        </div>

        {/* Target Code */}
        <div className="flex-1 min-w-0 border-l border-gray-800">
           <CodePanel 
            title="Converted" 
            language={targetLang}
            code={selectedFile && convertedContent[selectedFile.path] ? convertedContent[selectedFile.path] : null} 
            isEmpty={!selectedFile || !convertedContent[selectedFile.path]}
            emptyMessage={status === AppStatus.CONVERTING ? "Waiting for conversion..." : "Select a converted file"}
          />
        </div>
      </div>

    </div>
  );
};

export default App;