import { CommandModule, Argv } from 'yargs';
import chalk from 'chalk';
import ora from 'ora';
import * as fs from 'fs';
import { CloudReadinessAnalyzer } from '../services/cloud-readiness-analyzer';
import { FileScanner } from '../utils/file-scanner';
import { LlmService } from '../services/llm-service';
import { saveAnalysisResults } from '../utils/output-utils';

interface CloudReadinessArgs {
  path: string;
  llmEndpoint?: string;
  llmApiKey?: string;
  recursive?: boolean;
  extensions?: string[];
  cloudProvider?: 'aws' | 'azure' | 'gcp' | 'atlas' | 'generic';
}

export const cloudReadinessCommand: CommandModule<{}, CloudReadinessArgs> = {
  command: 'cloud-readiness <path>',
  describe: 'Assess code readiness for cloud deployment',
  builder: (yargs: Argv) => {
    return yargs
      .positional('path', {
        describe: 'Path to assess for cloud readiness',
        type: 'string',
        demandOption: true,
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
      .option('recursive', {
        alias: 'r',
        describe: 'Recursively scan directories',
        type: 'boolean',
        default: true,
      })
      .option('extensions', {
        alias: 'ext',
        describe: 'File extensions to analyze',
        type: 'array',
        default: ['.js', '.ts', '.jsx', '.tsx', '.py', '.java', '.go', '.rs'],
      })
      .option('cloud-provider', {
        alias: 'p',
        describe: 'Target cloud provider for assessment',
        choices: ['aws', 'azure', 'gcp', 'atlas', 'generic'] as const,
        default: 'generic' as const,
      }) as Argv<CloudReadinessArgs>;
  },
  handler: async (argv) => {
    const spinner = ora('Initializing cloud readiness assessment...').start();

    // Capture terminal output
    let terminalOutput = '';
    const originalLog = console.log;
    console.log = (...args: any[]) => {
      const message = args.join(' ');
      terminalOutput += message + '\n';
      originalLog(...args);
    };

    try {
      // Validate input path
      if (!fs.existsSync(argv.path)) {
        throw new Error(`Path does not exist: ${argv.path}`);
      }

      // Initialize services
      const llmService = argv.llmApiKey ? new LlmService(argv.llmEndpoint!, argv.llmApiKey) : null;
      const fileScanner = new FileScanner(argv.extensions as string[]);
      const cloudAnalyzer = new CloudReadinessAnalyzer(llmService);

      spinner.text = 'Scanning files...';
      const files = fileScanner.scanDirectory(argv.path, argv.recursive!);
      
      spinner.text = `Found ${files.length} files. Assessing cloud readiness...`;
      
      const assessmentResults = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        spinner.text = `Assessing ${file} (${i + 1}/${files.length})...`;
        
        const fileContent = fs.readFileSync(file, 'utf-8');
        const assessment = await cloudAnalyzer.assessFile(file, fileContent, argv.cloudProvider!);
        
        assessmentResults.push(assessment);
      }

      // Calculate overall readiness score
      const overallScore = cloudAnalyzer.calculateOverallReadiness(assessmentResults);
      
      spinner.succeed(chalk.green(`Cloud readiness assessment completed! Overall score: ${overallScore.toFixed(1)}/10`));

      // Display results
      console.log(chalk.blue('\n☁️  Cloud Readiness Assessment Results:\n'));
      
      console.log(chalk.yellow(`Overall Readiness Score: ${overallScore.toFixed(1)}/10`));
      console.log(chalk.yellow(`Target Cloud Provider: ${argv.cloudProvider?.toUpperCase()}\n`));

      // Group results by readiness level
      const highReadiness = assessmentResults.filter(r => r.readinessScore >= 8);
      const mediumReadiness = assessmentResults.filter(r => r.readinessScore >= 5 && r.readinessScore < 8);
      const lowReadiness = assessmentResults.filter(r => r.readinessScore < 5);

      if (highReadiness.length > 0) {
        console.log(chalk.green(`✅ High Readiness (${highReadiness.length} files):`));
        highReadiness.slice(0, 5).forEach(r => {
          console.log(chalk.green(`   • ${r.filePath} (${r.readinessScore.toFixed(1)}/10)`));
        });
        if (highReadiness.length > 5) {
          console.log(chalk.gray(`   ... and ${highReadiness.length - 5} more`));
        }
        console.log('');
      }

      if (mediumReadiness.length > 0) {
        console.log(chalk.yellow(`⚠️  Medium Readiness (${mediumReadiness.length} files):`));
        mediumReadiness.slice(0, 5).forEach(r => {
          console.log(chalk.yellow(`   • ${r.filePath} (${r.readinessScore.toFixed(1)}/10)`));
          r.issues.slice(0, 2).forEach((issue: any) => {
            console.log(chalk.gray(`     - ${issue.description}`));
          });
        });
        if (mediumReadiness.length > 5) {
          console.log(chalk.gray(`   ... and ${mediumReadiness.length - 5} more`));
        }
        console.log('');
      }

      if (lowReadiness.length > 0) {
        console.log(chalk.red(`❌ Low Readiness (${lowReadiness.length} files):`));
        lowReadiness.slice(0, 5).forEach(r => {
          console.log(chalk.red(`   • ${r.filePath} (${r.readinessScore.toFixed(1)}/10)`));
          r.issues.slice(0, 3).forEach((issue: any) => {
            console.log(chalk.gray(`     - ${issue.description}`));
            if (issue.recommendation) {
              console.log(chalk.green(`       💡 ${issue.recommendation}`));
            }
          });
        });
        if (lowReadiness.length > 5) {
          console.log(chalk.gray(`   ... and ${lowReadiness.length - 5} more`));
        }
      }

      // Restore original console.log
      console.log = originalLog;

      // Automatically save results with timestamp
      const outputData = {
        timestamp: new Date().toISOString(),
        analyzedPath: argv.path,
        cloudProvider: argv.cloudProvider,
        overallScore: overallScore,
        totalFiles: files.length,
        summary: {
          highReadiness: highReadiness.length,
          mediumReadiness: mediumReadiness.length,
          lowReadiness: lowReadiness.length,
        },
        assessments: assessmentResults,
      };
      
      const { jsonFile, markdownFile } = saveAnalysisResults(
        'cloud-readiness',
        outputData,
        terminalOutput,
        argv.path
      );

      console.log(chalk.blue(`\n📄 Assessment results saved:`));
      console.log(chalk.blue(`   JSON: ${jsonFile}`));
      console.log(chalk.blue(`   Markdown: ${markdownFile}`));

    } catch (error) {
      // Restore original console.log in case of error
      console.log = originalLog;
      spinner.fail(chalk.red('Cloud readiness assessment failed'));
      throw error;
    }
  },
}; 