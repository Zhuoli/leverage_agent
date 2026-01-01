import { readFile, readdir, stat } from 'fs/promises';
import { join, relative, resolve, normalize, sep } from 'path';
import { glob } from 'glob';

/**
 * Filesystem tools for code repository access
 * Restricted to only allowed directories specified in configuration
 */
export class FilesystemTools {
  private allowedDirs: string[];

  constructor(allowedDirs: string[]) {
    // Normalize and resolve all allowed directories
    this.allowedDirs = allowedDirs.map(dir => resolve(normalize(dir)));
    console.error(`Filesystem tools initialized with ${this.allowedDirs.length} allowed directories`);
    this.allowedDirs.forEach(dir => console.error(`  - ${dir}`));
  }

  /**
   * Check if a path is within allowed directories
   */
  private isPathAllowed(filePath: string): boolean {
    const normalized = resolve(normalize(filePath));

    return this.allowedDirs.some(allowedDir => {
      const rel = relative(allowedDir, normalized);
      // Check if path is within allowed dir (relative path doesn't start with '..')
      // Empty string means same directory (allowed)
      // 'src/file.ts' means within directory (allowed)
      // '../outside' means outside directory (denied)
      return !rel.startsWith('..');
    });
  }

  /**
   * Read a text file from allowed directories
   */
  async readFile(filePath: string): Promise<string> {
    if (!this.isPathAllowed(filePath)) {
      throw new Error(`Access denied: ${filePath} is not within allowed directories`);
    }

    try {
      const content = await readFile(filePath, 'utf-8');
      return content;
    } catch (error) {
      throw new Error(`Failed to read file ${filePath}: ${error}`);
    }
  }

  /**
   * List files in a directory
   */
  async listDirectory(dirPath: string): Promise<string[]> {
    if (!this.isPathAllowed(dirPath)) {
      throw new Error(`Access denied: ${dirPath} is not within allowed directories`);
    }

    try {
      const entries = await readdir(dirPath, { withFileTypes: true });
      return entries.map(entry => {
        const type = entry.isDirectory() ? '[DIR]' : '[FILE]';
        return `${type} ${entry.name}`;
      });
    } catch (error) {
      throw new Error(`Failed to list directory ${dirPath}: ${error}`);
    }
  }

  /**
   * Search for files matching a pattern in allowed directories
   */
  async searchFiles(pattern: string, baseDir?: string): Promise<string[]> {
    const searchDirs = baseDir ? [baseDir] : this.allowedDirs;

    // Validate base directory if provided
    if (baseDir && !this.isPathAllowed(baseDir)) {
      throw new Error(`Access denied: ${baseDir} is not within allowed directories`);
    }

    try {
      const results: string[] = [];

      for (const dir of searchDirs) {
        const matches = await glob(pattern, {
          cwd: dir,
          absolute: false,
          nodir: false,
        });

        // Add directory prefix to results
        results.push(...matches.map(match => join(dir, match)));
      }

      return results;
    } catch (error) {
      throw new Error(`Failed to search files with pattern ${pattern}: ${error}`);
    }
  }

  /**
   * Get file metadata
   */
  async getFileInfo(filePath: string): Promise<{
    path: string;
    size: number;
    isDirectory: boolean;
    modified: Date;
  }> {
    if (!this.isPathAllowed(filePath)) {
      throw new Error(`Access denied: ${filePath} is not within allowed directories`);
    }

    try {
      const stats = await stat(filePath);
      return {
        path: filePath,
        size: stats.size,
        isDirectory: stats.isDirectory(),
        modified: stats.mtime,
      };
    } catch (error) {
      throw new Error(`Failed to get file info for ${filePath}: ${error}`);
    }
  }

  /**
   * Get a summary of allowed directories and their contents
   */
  async getAllowedDirectoriesSummary(): Promise<string> {
    const summaries: string[] = [];

    for (const dir of this.allowedDirs) {
      try {
        const entries = await readdir(dir, { withFileTypes: true });
        const dirs = entries.filter(e => e.isDirectory()).length;
        const files = entries.filter(e => !e.isDirectory()).length;

        summaries.push(`📂 ${dir}\n   ${dirs} directories, ${files} files`);
      } catch (error) {
        summaries.push(`📂 ${dir}\n   ❌ Error: ${error}`);
      }
    }

    return summaries.join('\n\n');
  }

  /**
   * Check if filesystem tools are available (have allowed directories)
   */
  isAvailable(): boolean {
    return this.allowedDirs.length > 0;
  }

  /**
   * Get allowed directories
   */
  getAllowedDirectories(): string[] {
    return [...this.allowedDirs];
  }
}
