import { CommandModule, Argv } from 'yargs';
import chalk from 'chalk';
import ora from 'ora';
import * as fs from 'fs';
import * as path from 'path';
import { CveAnalyzer } from '../services/cve-analyzer';
import { FileScanner } from '../utils/file-scanner';
import { LlmService } from '../services/llm-service';
import { saveAnalysisResults } from '../utils/output-utils';

interface CveArgs {
  path: string;
  llmEndpoint?: string;
  llmApiKey?: string;
  recursive?: boolean;
  extensions?: string[];
}

export const cveCommand: CommandModule<{}, CveArgs> = {
  command: 'cve <path>',
  describe: 'Analyze code for CVEs and suggest modernization paths',
  builder: (yargs: Argv) => {
    return yargs
      .positional('path', {
        describe: 'Path to analyze for CVEs',
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
        default: ['.js', '.ts', '.jsx', '.tsx', '.py', '.java', '.cpp', '.c'],
      }) as Argv<CveArgs>;
  },
  handler: async (argv) => {
    const spinner = ora('Initializing CVE analysis...').start();

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

      if (!argv.llmApiKey) {
        throw new Error('LLM API key is required. Set LLM_API_KEY environment variable or use --llm-api-key option.');
      }

      // Initialize services
      const llmService = new LlmService(argv.llmEndpoint!, argv.llmApiKey);
      const fileScanner = new FileScanner(argv.extensions as string[]);
      const cveAnalyzer = new CveAnalyzer(llmService);

      spinner.text = 'Scanning files...';
      const files = fileScanner.scanDirectory(argv.path, argv.recursive!);
      
      spinner.text = `Found ${files.length} files. Analyzing for CVEs...`;
      
      const results = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        spinner.text = `Analyzing ${file} (${i + 1}/${files.length})...`;
        
        const fileContent = fs.readFileSync(file, 'utf-8');
        const analysis = await cveAnalyzer.analyzeFile(file, fileContent);
        
        if (analysis.vulnerabilities.length > 0) {
          results.push(analysis);
        }
      }

      spinner.succeed(chalk.green(`CVE analysis completed! Found ${results.length} files with potential vulnerabilities.`));

      // Display results
      if (results.length > 0) {
        console.log(chalk.yellow('\n📋 CVE Analysis Results:\n'));
        
        results.forEach((result, index) => {
          console.log(chalk.blue(`${index + 1}. ${result.filePath}`));
          
          result.vulnerabilities.forEach((vuln, vulnIndex) => {
            console.log(chalk.red(`   ${vulnIndex + 1}. ${vuln.type} (Severity: ${vuln.severity})`));
            console.log(chalk.gray(`      Line ${vuln.lineNumber}: ${vuln.description}`));
            if (vuln.recommendation) {
              console.log(chalk.green(`      💡 Recommendation: ${vuln.recommendation}`));
            }
          });
          console.log('');
        });
      } else {
        console.log(chalk.green('\n✅ No CVEs detected in the analyzed files.'));
      }

      // Restore original console.log
      console.log = originalLog;

      // Automatically save results with timestamp
      const outputData = {
        timestamp: new Date().toISOString(),
        analyzedPath: argv.path,
        totalFiles: files.length,
        vulnerableFiles: results.length,
        results: results,
      };
      
      const { jsonFile, markdownFile } = saveAnalysisResults(
        'cve',
        outputData,
        terminalOutput,
        argv.path
      );

      console.log(chalk.blue(`\n📄 Results saved:`));
      console.log(chalk.blue(`   JSON: ${jsonFile}`));
      console.log(chalk.blue(`   Markdown: ${markdownFile}`));

    } catch (error) {
      // Restore original console.log in case of error
      console.log = originalLog;
      spinner.fail(chalk.red('CVE analysis failed'));
      throw error;
    }
  },
}; 