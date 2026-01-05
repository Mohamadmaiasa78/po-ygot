export interface FileNode {
  name: string;
  path: string;
  content: string | null;
  isDirectory: boolean;
  children?: FileNode[];
  language?: string;
}

export interface FlatFile {
  path: string;
  content: string;
}

export enum LogType {
  INFO = 'INFO',
  SUCCESS = 'SUCCESS',
  WARNING = 'WARNING',
  ERROR = 'ERROR',
}

export interface LogEntry {
  timestamp: string;
  type: LogType;
  message: string;
}

export enum AppStatus {
  IDLE = 'IDLE',
  ANALYZING = 'ANALYZING',
  CONVERTING = 'CONVERTING',
  COMPLETED = 'COMPLETED',
  ERROR = 'ERROR'
}

export const SUPPORTED_LANGUAGES = [
  'JavaScript',
  'TypeScript',
  'Python',
  'Java',
  'C#',
  'C++',
  'PHP',
  'Go',
  'Rust',
  'Ruby',
  'Swift',
  'Kotlin',
  'HTML/CSS',
  'React',
  'Vue',
  'Angular'
];