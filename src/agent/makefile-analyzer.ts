import { readFile } from 'fs/promises';

export type TargetCategory = 'build' | 'test' | 'run' | 'deploy' | 'clean' | 'setup' | 'docker' | 'lint' | 'other';

export interface MakeTarget {
  name: string;
  dependencies: string[];
  commands: string[];
  category: TargetCategory;
}

export interface MakefileInsights {
  targets: MakeTarget[];
  entryPoints: string[];
  dependencies: Map<string, string[]>;
  summary: string;
}

/**
 * Analyzes Makefiles to extract build targets, entry points, and workflows
 */
export class MakefileAnalyzer {
  /**
   * Analyze a Makefile and extract insights
   */
  async analyze(makefilePath: string): Promise<MakefileInsights> {
    const content = await readFile(makefilePath, 'utf-8');

    const targets = this.extractTargets(content);
    const entryPoints = this.extractEntryPoints(targets);
    const dependencies = this.extractDependencies(targets);
    const summary = this.generateSummary(targets);

    return {
      targets,
      entryPoints,
      dependencies,
      summary,
    };
  }

  /**
   * Extract all targets from Makefile
   */
  private extractTargets(content: string): MakeTarget[] {
    const targets: MakeTarget[] = [];
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Skip comments and empty lines
      if (line.trim().startsWith('#') || line.trim() === '') {
        continue;
      }

      // Match target definitions: "target: dependencies"
      // Exclude lines with '=' (variable assignments)
      const match = line.match(/^([a-zA-Z0-9_-]+):\s*(.*)$/);
      if (match && !line.includes('=')) {
        const [, name, deps] = match;

        // Get the command(s) for this target (indented lines below)
        const commands: string[] = [];
        for (let j = i + 1; j < lines.length; j++) {
          const nextLine = lines[j];

          // Commands must start with tab
          if (nextLine.startsWith('\t')) {
            // Remove the tab and any @ or - prefixes
            const cmd = nextLine.substring(1).replace(/^[@-]\s*/, '').trim();
            if (cmd && !cmd.startsWith('#')) {
              commands.push(cmd);
            }
          } else {
            // No more commands for this target
            break;
          }
        }

        targets.push({
          name,
          dependencies: deps.split(/\s+/).filter(Boolean),
          commands,
          category: this.categorizeTarget(name, commands),
        });
      }
    }

    return targets;
  }

  /**
   * Categorize a target based on its name and commands
   */
  private categorizeTarget(name: string, commands: string[]): TargetCategory {
    const nameLower = name.toLowerCase();
    const cmdStr = commands.join(' ').toLowerCase();

    // Test targets
    if (nameLower.includes('test') || cmdStr.includes('pytest') || cmdStr.includes('npm test') || cmdStr.includes('go test')) {
      return 'test';
    }

    // Build targets
    if (nameLower.includes('build') || nameLower.includes('compile') || cmdStr.includes('build') || cmdStr.includes('compile')) {
      return 'build';
    }

    // Run/start targets
    if (nameLower === 'run' || nameLower === 'start' || nameLower === 'serve' || nameLower === 'dev' ||
        nameLower.includes('server') || cmdStr.includes('python ') || cmdStr.includes('node ') || cmdStr.includes('go run')) {
      return 'run';
    }

    // Deploy targets
    if (nameLower.includes('deploy') || nameLower.includes('release') || nameLower.includes('publish')) {
      return 'deploy';
    }

    // Clean targets
    if (nameLower.includes('clean') || cmdStr.includes('rm -rf') || cmdStr.includes('rm -r')) {
      return 'clean';
    }

    // Setup/install targets
    if (nameLower.includes('install') || nameLower.includes('setup') || nameLower.includes('init') ||
        cmdStr.includes('npm install') || cmdStr.includes('pip install')) {
      return 'setup';
    }

    // Docker targets
    if (nameLower.includes('docker') || cmdStr.includes('docker')) {
      return 'docker';
    }

    // Lint/format targets
    if (nameLower.includes('lint') || nameLower.includes('format') || nameLower.includes('fmt') ||
        cmdStr.includes('eslint') || cmdStr.includes('prettier') || cmdStr.includes('black')) {
      return 'lint';
    }

    return 'other';
  }

  /**
   * Extract entry points from run/start targets
   */
  private extractEntryPoints(targets: MakeTarget[]): string[] {
    const entryPoints: string[] = [];

    // Look for run/start targets
    const runTargets = targets.filter(
      t =>
        t.category === 'run' ||
        t.name === 'start' ||
        t.name === 'serve' ||
        t.name === 'dev' ||
        t.name === 'app'
    );

    for (const target of runTargets) {
      // Extract file being executed from commands
      for (const cmd of target.commands) {
        const patterns = [
          /python3?\s+([^\s]+\.py)/,           // python main.py
          /node\s+([^\s]+\.js)/,               // node server.js
          /ts-node\s+([^\s]+\.ts)/,            // ts-node main.ts
          /\.\/([^\s]+)/,                      // ./binary
          /go\s+run\s+([^\s]+)/,               // go run main.go
          /cargo\s+run\s+--bin\s+([^\s]+)/,   // cargo run --bin myapp
          /npm\s+run\s+([^\s]+)/,              // npm run start
          /yarn\s+([^\s]+)/,                   // yarn start
        ];

        for (const pattern of patterns) {
          const match = cmd.match(pattern);
          if (match) {
            entryPoints.push(match[1]);
          }
        }
      }
    }

    // Deduplicate
    return [...new Set(entryPoints)];
  }

  /**
   * Extract dependency graph from targets
   */
  private extractDependencies(targets: MakeTarget[]): Map<string, string[]> {
    const depGraph = new Map<string, string[]>();

    for (const target of targets) {
      depGraph.set(target.name, target.dependencies);
    }

    return depGraph;
  }

  /**
   * Generate human-readable summary
   */
  private generateSummary(targets: MakeTarget[]): string {
    const byCategory = new Map<TargetCategory, MakeTarget[]>();

    // Group by category
    for (const target of targets) {
      const category = target.category;
      if (!byCategory.has(category)) {
        byCategory.set(category, []);
      }
      byCategory.get(category)!.push(target);
    }

    const summary: string[] = ['# Makefile Analysis\n'];

    // Summary stats
    summary.push(`Found ${targets.length} targets\n`);

    // List by category
    const categoryOrder: TargetCategory[] = ['run', 'build', 'test', 'setup', 'docker', 'deploy', 'lint', 'clean', 'other'];

    for (const category of categoryOrder) {
      const categoryTargets = byCategory.get(category);
      if (categoryTargets && categoryTargets.length > 0) {
        summary.push(`\n## ${this.formatCategory(category)} (${categoryTargets.length}):`);

        for (const target of categoryTargets) {
          const depsStr = target.dependencies.length > 0 ? ` (depends on: ${target.dependencies.join(', ')})` : '';
          const cmdPreview = target.commands.length > 0 ? target.commands[0] : 'No command';
          summary.push(`- **${target.name}**${depsStr}: ${cmdPreview}`);

          // Show additional commands if any
          if (target.commands.length > 1) {
            summary.push(`  └─ ... +${target.commands.length - 1} more command(s)`);
          }
        }
      }
    }

    return summary.join('\n');
  }

  /**
   * Format category name for display
   */
  private formatCategory(category: TargetCategory): string {
    const formatted = category.charAt(0).toUpperCase() + category.slice(1);
    return formatted + ' Targets';
  }

  /**
   * Get common workflow from Makefile
   */
  async getCommonWorkflow(makefilePath: string): Promise<string> {
    const insights = await this.analyze(makefilePath);
    const workflow: string[] = ['# Common Workflow:\n'];

    // Find setup target
    const setupTarget = insights.targets.find(t => t.category === 'setup');
    if (setupTarget) {
      workflow.push(`1. **Setup**: make ${setupTarget.name}`);
    }

    // Find build target
    const buildTarget = insights.targets.find(t => t.category === 'build');
    if (buildTarget) {
      workflow.push(`2. **Build**: make ${buildTarget.name}`);
    }

    // Find run target
    const runTarget = insights.targets.find(t => t.category === 'run');
    if (runTarget) {
      workflow.push(`3. **Run**: make ${runTarget.name}`);
    }

    // Find test target
    const testTarget = insights.targets.find(t => t.category === 'test');
    if (testTarget) {
      workflow.push(`4. **Test**: make ${testTarget.name}`);
    }

    return workflow.join('\n');
  }
}
