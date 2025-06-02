import { CommandModule, Argv } from 'yargs';
import chalk from 'chalk';
import ora, { Ora } from 'ora';
import * as fs from 'fs';
import * as path from 'path';
import { LlmService } from '../services/llm-service';
import { EnhancedCveAnalyzer, EnhancedCveAnalysisResult } from '../services/enhanced-cve-analyzer';
import { saveAnalysisResults } from '../utils/output-utils';

interface CveArgs {
  path: string;
  llmEndpoint?: string;
  llmApiKey?: string;
  nvdApiKey?: string;
  enhancedMode?: boolean;
}

export const cveCommand: CommandModule<{}, CveArgs> = {
  command: 'cve <path>',
  describe: 'Enhanced CVE analysis with OWASP Dependency Check + NVD database + LLM insights',
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
      .option('nvd-api-key', {
        alias: 'n',
        describe: 'NVD API key for OWASP Dependency Check',
        type: 'string',
        default: process.env.NVD_API_KEY || 'ccfd0503-b629-4aa2-a759-53f2bc9b585a',
      })
      .option('enhanced-mode', {
        alias: 'enhanced',
        describe: 'Use enhanced analysis with OWASP + LLM (default: true)',
        type: 'boolean',
        default: true,
      }) as Argv<CveArgs>;
  },
  handler: async (argv) => {
    const spinner = ora('Initializing enhanced CVE analysis...').start();

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
      const enhancedAnalyzer = new EnhancedCveAnalyzer(llmService, argv.nvdApiKey);

      // Check if this is a Java project for enhanced analysis
      const isJavaProject = await isJavaProjectDetected(argv.path);
      
      if (!isJavaProject) {
        spinner.warn(chalk.yellow('Non-Java project detected. Enhanced OWASP analysis may have limited results.'));
        console.log(chalk.yellow('💡 For best results with enhanced CVE analysis, use on Java projects with Maven or Gradle.'));
      }

      // Run enhanced CVE analysis
      spinner.text = 'Running comprehensive CVE analysis (OWASP + NVD + LLM)...';
      const analysisResult = await enhancedAnalyzer.analyzeProject(argv.path);

      spinner.succeed(chalk.green('🎉 Enhanced CVE analysis completed!'));

      // Display comprehensive results
      displayEnhancedResults(analysisResult);

      // Restore original console.log
      console.log = originalLog;

      // Save enhanced results
      const outputData = {
        timestamp: new Date().toISOString(),
        analyzedPath: argv.path,
        enhancedAnalysis: analysisResult,
        nvdApiUsed: true,
        owaspIntegration: true,
      };
      
      const { jsonFile, markdownFile } = saveAnalysisResults(
        'cve-enhanced',
        outputData,
        terminalOutput,
        argv.path
      );

      console.log(chalk.blue(`\n📄 Enhanced CVE analysis results saved:`));
      console.log(chalk.blue(`   JSON: ${jsonFile}`));
      console.log(chalk.blue(`   Markdown: ${markdownFile}`));
      
      if (analysisResult.reportPaths.owaspHtmlReport) {
        console.log(chalk.blue(`   OWASP Report: ${analysisResult.reportPaths.owaspHtmlReport}`));
      }

    } catch (error) {
      // Restore original console.log in case of error
      console.log = originalLog;
      spinner.fail(chalk.red('Enhanced CVE analysis failed'));
      throw error;
    }
  },
};

async function isJavaProjectDetected(projectPath: string): Promise<boolean> {
  try {
    const hasMaven = fs.existsSync(path.join(projectPath, 'pom.xml'));
    const hasGradle = fs.existsSync(path.join(projectPath, 'build.gradle')) || 
                     fs.existsSync(path.join(projectPath, 'build.gradle.kts'));
    
    return hasMaven || hasGradle;
  } catch (error) {
    return false;
  }
}

function displayEnhancedResults(result: EnhancedCveAnalysisResult): void {
  console.log(chalk.blue('\n🛡️  Enhanced CVE Security Analysis\n'));
  
  // OWASP scan summary
  console.log(chalk.cyan('📊 OWASP Dependency Check Results:'));
  console.log(chalk.yellow(`   Scan Date: ${result.owaspResults.projectInfo.reportDate}`));
  console.log(chalk.yellow(`   Dependencies Scanned: ${result.owaspResults.projectInfo.dependencies}`));
  console.log(chalk.yellow(`   Vulnerable Dependencies: ${result.owaspResults.projectInfo.vulnerableDependencies}`));
  console.log(chalk.yellow(`   Scan Success: ${result.owaspResults.scanSuccess ? '✅' : '❌'}\n`));

  // Risk assessment
  console.log(chalk.cyan('🎯 Risk Assessment:'));
  console.log(chalk.yellow(`   Overall Risk Level: ${getRiskColor(result.overallRiskLevel)(result.overallRiskLevel)}`));
  console.log(chalk.yellow(`   Immediate Action Required: ${result.immediateActionRequired ? '🚨 YES' : '✅ NO'}\n`));

  // Vulnerability summary
  const { summary } = result;
  console.log(chalk.cyan('📈 Vulnerability Summary:'));
  console.log(chalk.red(`   🔴 Critical: ${summary.criticalCount}`));
  console.log(chalk.yellow(`   🟠 High: ${summary.highCount}`));
  console.log(chalk.blue(`   🟡 Medium: ${summary.mediumCount}`));
  console.log(chalk.green(`   🟢 Low: ${summary.lowCount}`));
  console.log(chalk.magenta(`   ⚡ Action Required: ${summary.vulnerabilitiesNeedingImmediateAction}\n`));

  // Enhanced vulnerabilities
  if (result.enhancedVulnerabilities.length > 0) {
    console.log(chalk.cyan('🔍 Enhanced Vulnerability Analysis:\n'));
    
    // Show critical and high-priority vulnerabilities first
    const priorityVulns = result.enhancedVulnerabilities
      .filter(v => v.actionRequired)
      .slice(0, 10); // Limit display to top 10

    priorityVulns.forEach((vuln, index) => {
      console.log(chalk.bold(`${index + 1}. ${vuln.cveId} - ${vuln.name}`));
      console.log(chalk.gray(`   Artifact: ${vuln.affectedArtifact}`));
      console.log(chalk.gray(`   Severity: ${getSeverityIcon(vuln.severity)} ${vuln.severity} (CVSS: ${vuln.cvssScore})`));
      console.log(chalk.gray(`   Description: ${vuln.description.substring(0, 150)}...`));
      
      if (vuln.llmAnalysis) {
        console.log(chalk.blue(`   🧠 LLM Analysis:`));
        console.log(chalk.blue(`      Risk: ${vuln.llmAnalysis.riskAssessment.substring(0, 100)}...`));
        console.log(chalk.blue(`      Priority: ${vuln.llmAnalysis.remediationPriority}`));
        console.log(chalk.blue(`      Complexity: ${vuln.llmAnalysis.migrationComplexity}`));
      }
      
      console.log(chalk.green(`   💡 ${vuln.finalRecommendation}`));
      console.log('');
    });

    if (result.enhancedVulnerabilities.length > priorityVulns.length) {
      console.log(chalk.gray(`   ... and ${result.enhancedVulnerabilities.length - priorityVulns.length} more vulnerabilities (see full report)\n`));
    }
  }

  // Strategic recommendations
  if (result.strategicRecommendations.length > 0) {
    console.log(chalk.cyan('🎯 Strategic Recommendations:\n'));
    result.strategicRecommendations.forEach((rec, index) => {
      console.log(chalk.blue(`${index + 1}. ${rec}`));
    });
    console.log('');
  }

  // Migration plan
  if (result.migrationPlan?.phases) {
    console.log(chalk.cyan('🗺️  Security Migration Plan:\n'));
    console.log(chalk.yellow(`Total Estimated Duration: ${result.migrationPlan.totalEstimatedDuration}\n`));
    
    result.migrationPlan.phases.forEach((phase, index) => {
      console.log(chalk.bold(`Phase ${phase.priority}: ${phase.phase}`));
      console.log(chalk.gray(`Duration: ${phase.estimatedDuration}`));
      console.log(chalk.gray('Activities:'));
      phase.activities.forEach(activity => {
        console.log(chalk.gray(`  • ${activity}`));
      });
      console.log('');
    });
  }
}

function getSeverityIcon(severity: string): string {
  switch (severity) {
    case 'Critical': return '🔴';
    case 'High': return '🟠';
    case 'Medium': return '🟡';
    case 'Low': return '🟢';
    default: return '⚪';
  }
}

function getRiskColor(riskLevel: string): typeof chalk.red.bold {
  switch (riskLevel) {
    case 'Critical': return chalk.red.bold;
    case 'High': return chalk.red;
    case 'Medium': return chalk.yellow;
    case 'Low': return chalk.green;
    default: return chalk.gray;
  }
} 