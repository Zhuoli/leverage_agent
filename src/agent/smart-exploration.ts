import { readFile } from 'fs/promises';
import { join, relative } from 'path';
import { FilesystemTools } from './filesystem-tools.js';
import { AnchorFileStrategy, AnchorFile } from './anchor-files.js';
import { MakefileAnalyzer } from './makefile-analyzer.js';

export interface ExplorationContext {
  overview: string;
  structure: {
    services?: string[];
    entryPoints?: string[];
    [key: string]: any;
  };
  keyFiles: Array<{
    path: string;
    content: string;
    reason: string;
    type: string;
  }>;
  relevantCode: Array<{
    path: string;
    content: string;
    dependencies: string[];
    isEntryPoint?: boolean;
    relevanceScore?: number;
  }>;
  filesRead: number;
  tokensEstimate: number;
}

export interface SmartExplorationOptions {
  maxAnchorFiles?: number;
  maxAdditionalFiles?: number;
  maxFileSize?: number;
  includeTests?: boolean;
}

/**
 * Smart exploration strategy that uses anchor files and Makefile analysis
 * to efficiently understand codebases
 */
export class SmartExploration {
  private anchorStrategy: AnchorFileStrategy;
  private makefileAnalyzer: MakefileAnalyzer;

  constructor(private filesystemTools: FilesystemTools) {
    this.anchorStrategy = new AnchorFileStrategy();
    this.makefileAnalyzer = new MakefileAnalyzer();
  }

  /**
   * Get a comprehensive overview of the codebase by reading anchor files
   */
  async getProjectOverview(repoPath: string, options?: SmartExplorationOptions): Promise<ExplorationContext> {
    const opts = {
      maxAnchorFiles: options?.maxAnchorFiles || 15,
      maxAdditionalFiles: options?.maxAdditionalFiles || 10,
      maxFileSize: options?.maxFileSize || 50000,
      includeTests: options?.includeTests || false,
    };

    const context: ExplorationContext = {
      overview: '',
      structure: {},
      keyFiles: [],
      relevantCode: [],
      filesRead: 0,
      tokensEstimate: 0,
    };

    console.error('🔍 Phase 1: Finding anchor files...');
    const anchorFiles = await this.anchorStrategy.findAnchorFiles(repoPath);
    console.error(`Found ${anchorFiles.length} anchor files`);

    // Read top anchor files
    const topAnchors = this.anchorStrategy.getTopN(anchorFiles, opts.maxAnchorFiles);

    console.error('📖 Phase 2: Reading anchor files...');
    for (const anchor of topAnchors) {
      try {
        const content = await this.filesystemTools.readFile(anchor.path);

        // Skip if too large
        if (content.length > opts.maxFileSize) {
          console.error(`⚠️  Skipping ${anchor.path} (too large: ${content.length} chars)`);
          continue;
        }

        context.filesRead++;
        context.tokensEstimate += this.estimateTokens(content);

        // Special handling for different file types
        await this.processAnchorFile(anchor, content, context, repoPath);
      } catch (error) {
        console.error(`Failed to read anchor file ${anchor.path}:`, error);
      }
    }

    // Add overview header
    context.overview = this.formatOverview(context, repoPath);

    console.error(`✅ Exploration complete: ${context.filesRead} files read, ~${context.tokensEstimate} tokens`);

    return context;
  }

  /**
   * Process an anchor file based on its type
   */
  private async processAnchorFile(
    anchor: AnchorFile,
    content: string,
    context: ExplorationContext,
    repoPath: string
  ): Promise<void> {
    const relativePath = relative(repoPath, anchor.path);

    if (anchor.type === 'documentation') {
      // Add to overview
      context.overview += `\n\n## 📄 ${relativePath}\n${this.truncateIfNeeded(content, 10000)}`;
    } else if (anchor.path.includes('Makefile')) {
      // Analyze Makefile
      try {
        const insights = await this.makefileAnalyzer.analyze(anchor.path);
        context.overview += `\n\n## 🔧 Makefile Analysis\n${insights.summary}`;

        if (insights.entryPoints.length > 0) {
          context.structure.entryPoints = insights.entryPoints;
          context.overview += `\n\n### Entry Points:\n${insights.entryPoints.map(ep => `- ${ep}`).join('\n')}`;
        }
      } catch (error) {
        console.error('Failed to analyze Makefile:', error);
      }
    } else if (anchor.path.includes('package.json')) {
      // Parse package.json
      try {
        const pkg = JSON.parse(content);
        const summary = this.summarizePackageJson(pkg);
        context.overview += `\n\n## 📦 package.json\n${summary}`;

        // Add entry point if defined
        if (pkg.main) {
          if (!context.structure.entryPoints) context.structure.entryPoints = [];
          context.structure.entryPoints.push(pkg.main);
        }
      } catch (error) {
        console.error('Failed to parse package.json:', error);
      }
    } else if (anchor.path.includes('docker-compose')) {
      // Parse docker-compose
      try {
        const services = this.parseDockerCompose(content);
        context.structure.services = services;
        context.overview += `\n\n## 🐳 Docker Services\n${services.map(s => `- ${s}`).join('\n')}`;
      } catch (error) {
        console.error('Failed to parse docker-compose:', error);
      }
    } else if (anchor.path.includes('tsconfig.json')) {
      // Parse TypeScript config
      try {
        const tsconfig = JSON.parse(content);
        if (tsconfig.compilerOptions?.paths) {
          context.overview += `\n\n## 📘 TypeScript Path Mappings\n`;
          for (const [alias, paths] of Object.entries(tsconfig.compilerOptions.paths)) {
            context.overview += `- ${alias} → ${(paths as string[]).join(', ')}\n`;
          }
        }
      } catch (error) {
        console.error('Failed to parse tsconfig.json:', error);
      }
    } else if (anchor.type === 'code_entry') {
      // Read entry point code
      context.keyFiles.push({
        path: anchor.path,
        content: this.truncateIfNeeded(content, 5000),
        reason: anchor.reason,
        type: 'entry_point',
      });
    } else {
      // Generic config or other file
      context.keyFiles.push({
        path: anchor.path,
        content: this.truncateIfNeeded(content, 3000),
        reason: anchor.reason,
        type: anchor.type,
      });
    }
  }

  /**
   * Summarize package.json
   */
  private summarizePackageJson(pkg: any): string {
    const lines: string[] = [];

    if (pkg.name) lines.push(`**Name**: ${pkg.name}`);
    if (pkg.version) lines.push(`**Version**: ${pkg.version}`);
    if (pkg.description) lines.push(`**Description**: ${pkg.description}`);
    if (pkg.main) lines.push(`**Main Entry**: ${pkg.main}`);

    if (pkg.scripts) {
      const scripts = Object.keys(pkg.scripts).slice(0, 10);
      lines.push(`**Scripts**: ${scripts.join(', ')}`);
    }

    if (pkg.dependencies) {
      const deps = Object.keys(pkg.dependencies).slice(0, 15);
      lines.push(`**Key Dependencies** (${Object.keys(pkg.dependencies).length} total): ${deps.join(', ')}`);
    }

    return lines.join('\n');
  }

  /**
   * Parse docker-compose.yml to extract service names
   */
  private parseDockerCompose(content: string): string[] {
    try {
      // Simple regex-based extraction (avoid yaml dependency)
      const serviceMatches = content.matchAll(/^\s{2}([a-zA-Z0-9_-]+):/gm);
      const services: string[] = [];

      for (const match of serviceMatches) {
        // Skip top-level keys like 'version', 'services', 'volumes'
        const serviceName = match[1];
        if (!['version', 'services', 'volumes', 'networks'].includes(serviceName)) {
          services.push(serviceName);
        }
      }

      return services;
    } catch (error) {
      return [];
    }
  }

  /**
   * Find files relevant to a specific query
   */
  async findRelevantFiles(
    query: string,
    repoPath: string,
    context: ExplorationContext,
    maxResults = 10
  ): Promise<Array<{ path: string; score: number; reason: string }>> {
    const keywords = this.extractKeywords(query);

    // Search for files matching keywords
    const allFiles: string[] = [];

    // Search by pattern
    for (const keyword of keywords) {
      try {
        const matches = await this.filesystemTools.searchFiles(`**/*${keyword}*.{ts,js,py,go,rs,java}`, repoPath);
        allFiles.push(...matches);
      } catch (error) {
        // Pattern not found
      }
    }

    // Deduplicate and score
    const uniqueFiles = [...new Set(allFiles)];
    const scored = uniqueFiles.map(path => ({
      path,
      score: this.calculateRelevance(path, keywords, context),
      reason: this.explainRelevance(path, keywords, context),
    }));

    // Sort by score and return top results
    return scored.sort((a, b) => b.score - a.score).slice(0, maxResults);
  }

  /**
   * Calculate relevance score for a file
   */
  private calculateRelevance(path: string, keywords: string[], context: ExplorationContext): number {
    let score = 0;
    const lowerPath = path.toLowerCase();

    // Keyword matching in path
    keywords.forEach(kw => {
      if (lowerPath.includes(kw.toLowerCase())) score += 10;
    });

    // Bonus if mentioned in README or other docs
    if (context.overview.toLowerCase().includes(path.toLowerCase())) {
      score += 15;
    }

    // Bonus if it's an entry point or dependency
    const isEntryPoint = context.structure.entryPoints?.some(ep => path.includes(ep));
    if (isEntryPoint) score += 20;

    // File type bonuses
    if (lowerPath.endsWith('.ts') || lowerPath.endsWith('.js')) score += 5;
    if (lowerPath.endsWith('.py')) score += 5;

    // Penalties
    if (lowerPath.includes('test') || lowerPath.includes('spec')) score -= 10;
    if (lowerPath.includes('node_modules')) score -= 100;
    if (lowerPath.includes('dist') || lowerPath.includes('build')) score -= 50;

    // Depth penalty (prefer root-level files)
    const depth = path.split('/').length;
    score -= depth;

    return score;
  }

  /**
   * Explain why a file is relevant
   */
  private explainRelevance(path: string, keywords: string[], context: ExplorationContext): string {
    const reasons: string[] = [];

    keywords.forEach(kw => {
      if (path.toLowerCase().includes(kw.toLowerCase())) {
        reasons.push(`matches keyword "${kw}"`);
      }
    });

    if (context.structure.entryPoints?.some(ep => path.includes(ep))) {
      reasons.push('is an entry point');
    }

    if (context.overview.toLowerCase().includes(path.toLowerCase())) {
      reasons.push('mentioned in documentation');
    }

    return reasons.length > 0 ? reasons.join(', ') : 'general match';
  }

  /**
   * Extract keywords from query
   */
  private extractKeywords(query: string): string[] {
    const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'is', 'are', 'was', 'were']);

    return query
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ') // Remove punctuation
      .split(/\s+/)
      .filter(word => word.length > 2 && !stopWords.has(word));
  }

  /**
   * Truncate content if too long
   */
  private truncateIfNeeded(content: string, maxChars: number): string {
    if (content.length <= maxChars) return content;
    return content.slice(0, maxChars) + `\n\n... [truncated ${content.length - maxChars} chars]`;
  }

  /**
   * Estimate tokens in content (rough approximation)
   */
  private estimateTokens(content: string): number {
    // Rough estimate: 1 token ≈ 4 characters
    return Math.ceil(content.length / 4);
  }

  /**
   * Format the overview header
   */
  private formatOverview(context: ExplorationContext, repoPath: string): string {
    const header = [
      '# Codebase Overview',
      `**Repository**: ${repoPath}`,
      `**Files Analyzed**: ${context.filesRead}`,
      `**Estimated Tokens**: ~${context.tokensEstimate}`,
      '',
    ];

    return header.join('\n') + context.overview;
  }

  /**
   * Extract dependencies from code content
   */
  extractDependencies(content: string): string[] {
    const deps: string[] = [];

    // TypeScript/JavaScript imports
    const importMatches = content.matchAll(/import .* from ['"](.+)['"]/g);
    for (const match of importMatches) {
      deps.push(match[1]);
    }

    // Python imports
    const pyMatches = content.matchAll(/from ([^\s]+) import|import ([^\s]+)/g);
    for (const match of pyMatches) {
      deps.push(match[1] || match[2]);
    }

    // Go imports
    const goMatches = content.matchAll(/import "([^"]+)"/g);
    for (const match of goMatches) {
      deps.push(match[1]);
    }

    return [...new Set(deps)]; // Deduplicate
  }
}
