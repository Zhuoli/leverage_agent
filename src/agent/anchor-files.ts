import { glob } from 'glob';

/**
 * Anchor files are high-signal files that provide disproportionate value
 * for understanding a codebase (README, Makefile, package.json, etc.)
 */

export type AnchorFileType = 'documentation' | 'entrypoint' | 'infrastructure' | 'configuration' | 'code_entry' | 'other';

export interface AnchorFile {
  path: string;
  priority: number;
  reason: string;
  type: AnchorFileType;
}

interface AnchorPattern {
  pattern: string;
  priority: number;
  reason: string;
}

export class AnchorFileStrategy {
  // Ordered by priority (most important first)
  private static readonly ANCHOR_PATTERNS: AnchorPattern[] = [
    // Tier 1: Project Overview (MUST READ)
    { pattern: 'README.md', priority: 100, reason: 'Project overview, purpose, architecture' },
    { pattern: 'readme.md', priority: 100, reason: 'Project overview (lowercase variant)' },
    { pattern: 'README.MD', priority: 100, reason: 'Project overview (uppercase variant)' },
    { pattern: 'ARCHITECTURE.md', priority: 95, reason: 'System design and patterns' },
    { pattern: 'docs/README.md', priority: 90, reason: 'Detailed documentation' },

    // Tier 2: Entry Points (CRITICAL for understanding flow)
    { pattern: 'Makefile', priority: 85, reason: 'Build targets, entry points, workflows' },
    { pattern: 'package.json', priority: 85, reason: 'Dependencies, scripts, entry points' },
    { pattern: 'docker-compose.yml', priority: 80, reason: 'Service architecture, dependencies' },
    { pattern: 'docker-compose.yaml', priority: 80, reason: 'Service architecture (yaml variant)' },
    { pattern: 'Dockerfile', priority: 75, reason: 'Runtime environment, build process' },

    // Tier 3: Configuration (reveals structure)
    { pattern: 'tsconfig.json', priority: 70, reason: 'TypeScript setup, paths, modules' },
    { pattern: '.github/workflows/*.yml', priority: 70, reason: 'CI/CD, testing, deployment' },
    { pattern: '.github/workflows/*.yaml', priority: 70, reason: 'CI/CD workflows (yaml variant)' },
    { pattern: 'requirements.txt', priority: 80, reason: 'Python dependencies' },
    { pattern: 'Pipfile', priority: 80, reason: 'Python pipenv dependencies' },
    { pattern: 'pyproject.toml', priority: 80, reason: 'Python project configuration' },
    { pattern: 'Cargo.toml', priority: 80, reason: 'Rust dependencies and structure' },
    { pattern: 'go.mod', priority: 80, reason: 'Go modules and dependencies' },
    { pattern: 'pom.xml', priority: 80, reason: 'Java/Maven structure' },
    { pattern: 'build.gradle', priority: 80, reason: 'Java/Gradle structure' },

    // Tier 4: Domain Knowledge
    { pattern: 'CONTRIBUTING.md', priority: 65, reason: 'Development workflow, conventions' },
    { pattern: 'CHANGELOG.md', priority: 60, reason: 'Recent changes, evolution' },
    { pattern: 'API.md', priority: 75, reason: 'API documentation' },
    { pattern: 'DESIGN.md', priority: 75, reason: 'Design documentation' },

    // Tier 5: Code Entry Points
    { pattern: 'main.ts', priority: 80, reason: 'TypeScript entry point' },
    { pattern: 'main.js', priority: 80, reason: 'JavaScript entry point' },
    { pattern: 'main.py', priority: 80, reason: 'Python entry point' },
    { pattern: 'main.go', priority: 80, reason: 'Go entry point' },
    { pattern: 'main.rs', priority: 80, reason: 'Rust entry point' },
    { pattern: 'index.ts', priority: 75, reason: 'TypeScript module entry' },
    { pattern: 'index.js', priority: 75, reason: 'JavaScript module entry' },
    { pattern: 'app.ts', priority: 75, reason: 'Application setup (TypeScript)' },
    { pattern: 'app.js', priority: 75, reason: 'Application setup (JavaScript)' },
    { pattern: 'app.py', priority: 75, reason: 'Application setup (Python)' },
    { pattern: 'server.ts', priority: 75, reason: 'Server initialization (TypeScript)' },
    { pattern: 'server.js', priority: 75, reason: 'Server initialization (JavaScript)' },
    { pattern: 'server.py', priority: 75, reason: 'Server initialization (Python)' },
    { pattern: '__init__.py', priority: 70, reason: 'Python package entry' },
    { pattern: 'src/main.ts', priority: 78, reason: 'TypeScript entry in src/' },
    { pattern: 'src/main.js', priority: 78, reason: 'JavaScript entry in src/' },
    { pattern: 'src/index.ts', priority: 73, reason: 'TypeScript module in src/' },
    { pattern: 'src/index.js', priority: 73, reason: 'JavaScript module in src/' },
  ];

  /**
   * Find all anchor files in a repository
   */
  async findAnchorFiles(repoPath: string): Promise<AnchorFile[]> {
    const found: AnchorFile[] = [];
    const seenPaths = new Set<string>(); // Deduplicate

    for (const anchor of AnchorFileStrategy.ANCHOR_PATTERNS) {
      try {
        const matches = await glob(anchor.pattern, {
          cwd: repoPath,
          absolute: true,
          nodir: true,
          ignore: ['**/node_modules/**', '**/dist/**', '**/build/**', '**/.git/**'],
        });

        for (const match of matches) {
          if (!seenPaths.has(match)) {
            seenPaths.add(match);
            found.push({
              path: match,
              priority: anchor.priority,
              reason: anchor.reason,
              type: this.categorizeFile(match),
            });
          }
        }
      } catch (e) {
        // File doesn't exist or pattern error, skip
        console.error(`Error finding anchor pattern ${anchor.pattern}:`, e);
      }
    }

    // Also search for README files in subdirectories (but with lower priority)
    try {
      const subReadmes = await glob('**/README.md', {
        cwd: repoPath,
        absolute: true,
        nodir: true,
        ignore: ['**/node_modules/**', '**/dist/**', '**/build/**', '**/.git/**'],
      });

      for (const readme of subReadmes) {
        if (!seenPaths.has(readme)) {
          seenPaths.add(readme);
          found.push({
            path: readme,
            priority: 88, // Lower than root README
            reason: 'Module-specific documentation',
            type: 'documentation',
          });
        }
      }
    } catch (e) {
      console.error('Error finding subdirectory READMEs:', e);
    }

    // Sort by priority (highest first)
    return found.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Categorize a file by type
   */
  private categorizeFile(path: string): AnchorFileType {
    const lower = path.toLowerCase();

    if (lower.includes('readme') || lower.includes('architecture') || lower.includes('contributing')) {
      return 'documentation';
    }
    if (lower.includes('makefile') || lower.includes('package.json')) {
      return 'entrypoint';
    }
    if (lower.includes('docker') || lower.includes('compose')) {
      return 'infrastructure';
    }
    if (lower.endsWith('.json') || lower.endsWith('.toml') || lower.endsWith('.yml') || lower.endsWith('.yaml')) {
      return 'configuration';
    }
    if (lower.includes('main') || lower.includes('index') || lower.includes('app') || lower.includes('server')) {
      return 'code_entry';
    }

    return 'other';
  }

  /**
   * Filter anchor files by type
   */
  filterByType(anchorFiles: AnchorFile[], type: AnchorFileType): AnchorFile[] {
    return anchorFiles.filter(f => f.type === type);
  }

  /**
   * Get the top N anchor files
   */
  getTopN(anchorFiles: AnchorFile[], n: number): AnchorFile[] {
    return anchorFiles.slice(0, n);
  }
}
