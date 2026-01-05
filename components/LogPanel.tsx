import React from 'react';
import { LogEntry, LogType } from '../types';

interface LogPanelProps {
  logs: LogEntry[];
}

const LogPanel: React.FC<LogPanelProps> = ({ logs }) => {
  return (
    <div className="h-full bg-[#0B0F19] text-gray-400 font-mono text-xs overflow-y-auto p-2">
      {logs.length === 0 && <div className="text-gray-700 italic">System ready...</div>}
      {logs.map((log, index) => (
        <div key={index} className="mb-1 flex items-start">
          <span className="text-gray-600 w-20 shrink-0">[{log.timestamp}]</span>
          <span className={`mr-2 font-bold ${
            log.type === LogType.ERROR ? 'text-red-500' :
            log.type === LogType.SUCCESS ? 'text-green-400' :
            log.type === LogType.WARNING ? 'text-yellow-400' :
            'text-blue-400'
          }`}>{log.type}:</span>
          <span className="text-gray-300 break-all">{log.message}</span>
        </div>
      ))}
    </div>
  );
};

export default LogPanel;