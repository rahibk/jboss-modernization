import { CommandModule, Argv } from 'yargs';
import chalk from 'chalk';
import ora from 'ora';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { LlmService } from '../services/llm-service';

interface ArchitectArgs {
  path: string;
  output?: string;
  sourceFramework?: 'jboss' | 'wildfly' | 'tomcat' | 'websphere' | 'weblogic';
  targetFramework?: 'springboot3' | 'springboot2';
  targetJavaVersion?: '17' | '21' | '11';
  llmEndpoint?: string;
  llmApiKey?: string;
  includeTests?: boolean;
  excludePatterns?: string[];
}

export const architectCommand: CommandModule<{}, ArchitectArgs> = {
  command: 'architect <path>',
  describe: 'Architect application migration from legacy frameworks to modern Spring Boot',
  builder: (yargs: Argv) => {
    return yargs
      .positional('path', {
        describe: 'Path to analyze for architectural migration',
        type: 'string',
        demandOption: true,
      })
      .option('output', {
        alias: 'o',
        describe: 'Output file for migration analysis results',
        type: 'string',
      })
      .option('source-framework', {
        alias: 's',
        describe: 'Source framework to migrate from',
        choices: ['jboss', 'wildfly', 'tomcat', 'websphere', 'weblogic'] as const,
        default: 'jboss' as const,
      })
      .option('target-framework', {
        alias: 't',
        describe: 'Target framework for migration',
        choices: ['springboot3', 'springboot2'] as const,
        default: 'springboot3' as const,
      })
      .option('target-java-version', {
        alias: 'j',
        describe: 'Target Java version for migration',
        choices: ['17', '21', '11'] as const,
        default: '21' as const,
      })
      .option('llm-endpoint', {
        alias: 'e',
        describe: 'LLM API endpoint URL',
        type: 'string',
        default: process.env.LLM_ENDPOINT || 'https://api.openai.com/v1',
      })
      .option('llm-api-key', {
        alias: 'k',
        describe: 'LLM API key',
        type: 'string',
        default: process.env.LLM_API_KEY,
      })
      .option('include-tests', {
        describe: 'Include test files in analysis',
        type: 'boolean',
        default: true,
      })
      .option('exclude-patterns', {
        describe: 'Patterns to exclude from packaging',
        type: 'array',
        default: ['node_modules', '.git', 'target', 'build', '*.class'],
      }) as Argv<ArchitectArgs>;
  },
  handler: async (argv) => {
    const spinner = ora('Initializing architectural migration analysis...').start();

    try {
      // Validate input path
      if (!fs.existsSync(argv.path)) {
        throw new Error(`Path does not exist: ${argv.path}`);
      }

      // Validate LLM API key
      if (!argv.llmApiKey) {
        throw new Error('LLM API key is required for architectural analysis. Set LLM_API_KEY environment variable or use --llm-api-key option.');
      }

      // Initialize LLM service
      const llmService = new LlmService(argv.llmEndpoint!, argv.llmApiKey);

      spinner.text = 'Packaging codebase with repomix...';
      
      // Use repomix to package the codebase
      const packagedContent = await packageCodebase(argv.path, argv.excludePatterns!);
      
      spinner.text = 'Analyzing codebase architecture...';
      
      // Analyze with LLM
      const migrationAnalysis = await analyzeArchitecture(
        llmService,
        packagedContent,
        argv.sourceFramework!,
        argv.targetFramework!,
        argv.targetJavaVersion!,
        argv.path
      );

      spinner.succeed(chalk.green('Architectural migration analysis completed!'));

      // Display results
      console.log(chalk.blue('\n🏗️  Architectural Migration Analysis:\n'));
      console.log(chalk.yellow(`Source: ${argv.sourceFramework!.toUpperCase()}`));
      console.log(chalk.yellow(`Target: ${argv.targetFramework!.toUpperCase()} with Java ${argv.targetJavaVersion}`));
      console.log(chalk.yellow(`Complexity Score: ${migrationAnalysis.complexityScore}/10`));
      console.log(chalk.yellow(`Estimated Effort: ${migrationAnalysis.estimatedEffort}\n`));

      // High-level migration steps
      if (migrationAnalysis.highLevelSteps && migrationAnalysis.highLevelSteps.length > 0) {
        console.log(chalk.cyan('📋 High-Level Migration Steps:\n'));
        migrationAnalysis.highLevelSteps.forEach((step: any, index: number) => {
          console.log(chalk.blue(`${index + 1}. ${step.title}`));
          console.log(chalk.gray(`   ${step.description}`));
          if (step.effort) console.log(chalk.yellow(`   Effort: ${step.effort}`));
          console.log('');
        });
      }

      // Framework-specific changes
      if (migrationAnalysis.frameworkChanges && migrationAnalysis.frameworkChanges.length > 0) {
        console.log(chalk.cyan('🔄 Framework-Specific Changes:\n'));
        migrationAnalysis.frameworkChanges.forEach((change: any, index: number) => {
          console.log(chalk.blue(`${index + 1}. ${change.component}: ${change.action}`));
          console.log(chalk.gray(`   ${change.description}`));
          if (change.before) console.log(chalk.red(`   Before: ${change.before}`));
          if (change.after) console.log(chalk.green(`   After:  ${change.after}`));
          console.log('');
        });
      }

      // Dependencies analysis
      if (migrationAnalysis.dependencyChanges) {
        console.log(chalk.cyan('📦 Dependency Changes:\n'));
        
        if (migrationAnalysis.dependencyChanges.remove?.length > 0) {
          console.log(chalk.red('Remove:'));
          migrationAnalysis.dependencyChanges.remove.forEach((dep: string) => {
            console.log(chalk.red(`  - ${dep}`));
          });
          console.log('');
        }

        if (migrationAnalysis.dependencyChanges.add?.length > 0) {
          console.log(chalk.green('Add:'));
          migrationAnalysis.dependencyChanges.add.forEach((dep: string) => {
            console.log(chalk.green(`  + ${dep}`));
          });
          console.log('');
        }

        if (migrationAnalysis.dependencyChanges.update?.length > 0) {
          console.log(chalk.yellow('Update:'));
          migrationAnalysis.dependencyChanges.update.forEach((dep: string) => {
            console.log(chalk.yellow(`  ~ ${dep}`));
          });
          console.log('');
        }
      }

      // Code examples
      if (migrationAnalysis.codeExamples && migrationAnalysis.codeExamples.length > 0) {
        console.log(chalk.cyan('💡 Code Transformation Examples:\n'));
        migrationAnalysis.codeExamples.forEach((example: any, index: number) => {
          console.log(chalk.blue(`${index + 1}. ${example.description}:`));
          console.log(chalk.red('   Before:'));
          console.log(chalk.gray(`   ${example.before}`));
          console.log(chalk.green('   After:'));
          console.log(chalk.gray(`   ${example.after}`));
          console.log('');
        });
      }

      // Save results to file if specified
      if (argv.output) {
        const outputData = {
          metadata: {
            timestamp: new Date().toISOString(),
            analyzedPath: argv.path,
            sourceFramework: argv.sourceFramework,
            targetFramework: argv.targetFramework,
            targetJavaVersion: argv.targetJavaVersion,
          },
          packagedContent: {
            size: packagedContent.length,
            preview: packagedContent.substring(0, 500) + '...'
          },
          migrationAnalysis: migrationAnalysis,
        };
        
        fs.writeFileSync(argv.output, JSON.stringify(outputData, null, 2));
        console.log(chalk.blue(`\n📄 Migration analysis saved to: ${argv.output}`));
      }

    } catch (error) {
      spinner.fail(chalk.red('Architectural migration analysis failed'));
      throw error;
    }
  },
};

async function packageCodebase(projectPath: string, excludePatterns: string[]): Promise<string> {
  try {
    // Create a temporary config for repomix
    const tempConfigPath = path.join(process.cwd(), 'repomix-temp.config.json');
    const outputFilePath = path.join(process.cwd(), 'temp-packaged.txt');
    
    const config = {
      output: {
        filePath: outputFilePath,
        style: 'plain'
      },
      include: ['**/*'],
      ignore: {
        useGitignore: true,
        useDefaultPatterns: true,
        customPatterns: excludePatterns
      }
    };

    fs.writeFileSync(tempConfigPath, JSON.stringify(config, null, 2));

    // Run repomix to package the codebase using the config file
    const command = `npx repomix --config ${tempConfigPath} ${projectPath}`;
    execSync(command, { stdio: 'pipe' });

    // Read the packaged content
    const packagedContent = fs.readFileSync(outputFilePath, 'utf-8');

    // Clean up temporary files
    fs.unlinkSync(tempConfigPath);
    fs.unlinkSync(outputFilePath);

    return packagedContent;
  } catch (error) {
    console.warn('Failed to use repomix, falling back to manual packaging');
    return await manualPackaging(projectPath, excludePatterns);
  }
}

async function manualPackaging(projectPath: string, excludePatterns: string[]): Promise<string> {
  const files: string[] = [];
  const excludeRegexes = excludePatterns.map(pattern => 
    new RegExp(pattern.replace(/\*/g, '.*').replace(/\./g, '\\.'))
  );

  function scanDirectory(dir: string) {
    try {
      const entries = fs.readdirSync(dir);
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry);
        const relativePath = path.relative(projectPath, fullPath);
        
        // Check if should exclude
        if (excludeRegexes.some(regex => regex.test(relativePath))) {
          continue;
        }
        
        try {
          const stats = fs.statSync(fullPath);
          if (stats.isDirectory()) {
            scanDirectory(fullPath);
          } else if (stats.isFile()) {
            files.push(fullPath);
          }
        } catch (statError) {
          // Skip files that can't be accessed
          continue;
        }
      }
    } catch (readError) {
      // Skip directories that can't be read
      return;
    }
  }

  scanDirectory(projectPath);

  // Package files into a single string
  let packagedContent = `Project: ${projectPath}\nFiles: ${files.length}\n\n`;
  
  for (const file of files.slice(0, 100)) { // Limit to first 100 files to avoid huge outputs
    try {
      const content = fs.readFileSync(file, 'utf-8');
      const relativePath = path.relative(projectPath, file);
      packagedContent += `=== ${relativePath} ===\n${content}\n\n`;
    } catch (error) {
      // Skip files that can't be read (binary files, permission issues, etc.)
      const relativePath = path.relative(projectPath, file);
      packagedContent += `=== ${relativePath} ===\n[Binary or unreadable file]\n\n`;
    }
  }
  
  if (files.length > 100) {
    packagedContent += `\n... and ${files.length - 100} more files (truncated for brevity)\n`;
  }

  return packagedContent;
}

async function analyzeArchitecture(
  llmService: LlmService,
  packagedContent: string,
  sourceFramework: string,
  targetFramework: string,
  targetJavaVersion: string,
  projectPath: string
): Promise<any> {
  const prompt = `You are a conversion assistant. Please convert the following ${sourceFramework.toUpperCase()} application to a ${targetFramework.toUpperCase()} application. Ensure that the resulting recommendations use proper Spring Boot conventions. Give me high level steps of what needs to be done to migrate this.

Project Path: ${projectPath}
Source Framework: ${sourceFramework.toUpperCase()}
Target Framework: ${targetFramework.toUpperCase()} with Java ${targetJavaVersion}

Packaged Codebase:
${packagedContent.substring(0, 15000)} // Limit content for prompt size

Please analyze this codebase and provide:

1. **High-Level Migration Steps**: What are the major phases of this migration?
2. **Framework-Specific Changes**: What ${sourceFramework} components need to be replaced with Spring Boot equivalents?
3. **Dependency Analysis**: What dependencies need to be removed, added, or updated?
4. **Configuration Migration**: How to migrate from ${sourceFramework} configuration to Spring Boot configuration?
5. **Code Transformation Examples**: Show before/after examples for key patterns
6. **Complexity Assessment**: Rate the migration complexity (1-10) and estimated effort
7. **Risk Assessment**: What are the main risks and how to mitigate them?

Focus on:
- ${sourceFramework.toUpperCase()} to Spring Boot migration patterns
- Java ${targetJavaVersion} best practices
- Dependency injection patterns
- Configuration management
- Web layer migration (Servlets → Spring MVC/WebFlux)
- Data access layer migration
- Security configuration migration
- Testing framework updates

Format your response as a JSON object:
{
  "complexityScore": number,
  "estimatedEffort": "string",
  "highLevelSteps": [
    {
      "title": "string",
      "description": "string", 
      "effort": "string"
    }
  ],
  "frameworkChanges": [
    {
      "component": "string",
      "action": "string",
      "description": "string",
      "before": "string",
      "after": "string"
    }
  ],
  "dependencyChanges": {
    "remove": ["string"],
    "add": ["string"],
    "update": ["string"]
  },
  "codeExamples": [
    {
      "description": "string",
      "before": "string",
      "after": "string"
    }
  ],
  "riskAssessment": {
    "level": "Low|Medium|High|Critical",
    "risks": ["string"],
    "mitigations": ["string"]
  },
  "recommendations": ["string"]
}`;

  try {
    const response = await llmService.sendRequest({
      prompt,
      maxTokens: 4000,
      temperature: 0.1,
    });

    // Parse the LLM response
    const jsonMatch = response.content.match(/\{[\s\S]*\}/);
    const jsonContent = jsonMatch ? jsonMatch[0] : response.content;
    return JSON.parse(jsonContent);
  } catch (error) {
    console.warn('LLM architectural analysis failed, using fallback analysis');
    return createFallbackArchitecturalAnalysis(sourceFramework, targetFramework, targetJavaVersion);
  }
}

function createFallbackArchitecturalAnalysis(sourceFramework: string, targetFramework: string, targetJavaVersion: string): any {
  return {
    complexityScore: 7,
    estimatedEffort: '3-6 months',
    highLevelSteps: [
      {
        title: 'Assessment and Planning',
        description: `Analyze current ${sourceFramework} application architecture and dependencies`,
        effort: '2-3 weeks'
      },
      {
        title: 'Environment Setup',
        description: `Set up ${targetFramework} development environment with Java ${targetJavaVersion}`,
        effort: '1 week'
      },
      {
        title: 'Core Framework Migration',
        description: `Migrate from ${sourceFramework} to ${targetFramework} core components`,
        effort: '4-8 weeks'
      },
      {
        title: 'Testing and Validation',
        description: 'Comprehensive testing of migrated application',
        effort: '3-4 weeks'
      }
    ],
    frameworkChanges: [
      {
        component: 'Application Server',
        action: 'Replace',
        description: `Replace ${sourceFramework} application server with embedded ${targetFramework} server`,
        before: `${sourceFramework} EAR/WAR deployment`,
        after: `${targetFramework} executable JAR`
      }
    ],
    dependencyChanges: {
      remove: [`${sourceFramework} dependencies`],
      add: [`${targetFramework} starters`],
      update: [`Java version to ${targetJavaVersion}`]
    },
    codeExamples: [],
    riskAssessment: {
      level: 'Medium',
      risks: ['Framework compatibility issues', 'Configuration complexity'],
      mitigations: ['Incremental migration', 'Comprehensive testing']
    },
    recommendations: [
      'Plan migration in phases',
      'Set up comprehensive testing',
      'Train team on Spring Boot',
      'Document migration process'
    ]
  };
} 