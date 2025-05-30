import * as fs from 'fs';
import * as path from 'path';

export class FileScanner {
  private extensions: Set<string>;

  constructor(extensions: string[]) {
    this.extensions = new Set(extensions.map(ext => ext.toLowerCase()));
  }

  scanDirectory(targetPath: string, recursive: boolean = true): string[] {
    const files: string[] = [];
    
    try {
      const stats = fs.statSync(targetPath);
      
      if (stats.isFile()) {
        if (this.shouldIncludeFile(targetPath)) {
          files.push(path.resolve(targetPath));
        }
      } else if (stats.isDirectory()) {
        this.scanDirectoryRecursive(targetPath, files, recursive);
      }
    } catch (error) {
      throw new Error(`Cannot access path: ${targetPath}. ${error}`);
    }
    
    return files.sort();
  }

  private scanDirectoryRecursive(dirPath: string, files: string[], recursive: boolean): void {
    try {
      const entries = fs.readdirSync(dirPath);
      
      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry);
        
        try {
          const stats = fs.statSync(fullPath);
          
          if (stats.isFile()) {
            if (this.shouldIncludeFile(fullPath)) {
              files.push(path.resolve(fullPath));
            }
          } else if (stats.isDirectory() && recursive) {
            // Skip common directories that should be ignored
            if (!this.shouldSkipDirectory(entry)) {
              this.scanDirectoryRecursive(fullPath, files, recursive);
            }
          }
        } catch (error) {
          // Skip files/directories that can't be accessed
          console.warn(`Warning: Cannot access ${fullPath}: ${error}`);
        }
      }
    } catch (error) {
      console.warn(`Warning: Cannot read directory ${dirPath}: ${error}`);
    }
  }

  private shouldIncludeFile(filePath: string): boolean {
    const ext = path.extname(filePath).toLowerCase();
    return this.extensions.has(ext);
  }

  private shouldSkipDirectory(dirName: string): boolean {
    const skipDirs = new Set([
      'node_modules',
      '.git',
      '.svn',
      '.hg',
      'dist',
      'build',
      'target',
      'bin',
      'obj',
      '.idea',
      '.vscode',
      '__pycache__',
      '.pytest_cache',
      'coverage',
      '.nyc_output',
      'logs',
      'tmp',
      'temp',
      '.DS_Store',
    ]);
    
    return skipDirs.has(dirName) || dirName.startsWith('.');
  }

  // Get file information including size and modification time
  getFileInfo(filePath: string): { size: number; mtime: Date; relativePath: string } {
    const stats = fs.statSync(filePath);
    return {
      size: stats.size,
      mtime: stats.mtime,
      relativePath: path.relative(process.cwd(), filePath),
    };
  }

  // Count total files and size in a directory
  getDirectoryStats(targetPath: string, recursive: boolean = true): { fileCount: number; totalSize: number; extensions: Map<string, number> } {
    const files = this.scanDirectory(targetPath, recursive);
    const extensions = new Map<string, number>();
    let totalSize = 0;
    
    for (const file of files) {
      const ext = path.extname(file).toLowerCase();
      const stats = fs.statSync(file);
      
      totalSize += stats.size;
      extensions.set(ext, (extensions.get(ext) || 0) + 1);
    }
    
    return {
      fileCount: files.length,
      totalSize,
      extensions,
    };
  }

  // Filter files by size or modification time
  filterFiles(files: string[], options: {
    maxSize?: number;
    minSize?: number;
    modifiedAfter?: Date;
    modifiedBefore?: Date;
  } = {}): string[] {
    return files.filter(file => {
      try {
        const stats = fs.statSync(file);
        
        if (options.maxSize && stats.size > options.maxSize) return false;
        if (options.minSize && stats.size < options.minSize) return false;
        if (options.modifiedAfter && stats.mtime < options.modifiedAfter) return false;
        if (options.modifiedBefore && stats.mtime > options.modifiedBefore) return false;
        
        return true;
      } catch (error) {
        return false;
      }
    });
  }
} 