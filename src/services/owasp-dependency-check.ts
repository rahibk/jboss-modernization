import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as xml2js from 'xml2js';

export interface OwaspVulnerability {
  name: string;
  severity: 'Critical' | 'High' | 'Medium' | 'Low';
  cvssScore: number;
  cveId: string;
  description: string;
  references: string[];
  affectedArtifact: string;
  fileName: string;
  solution?: string;
}

export interface OwaspDependencyCheckResult {
  projectInfo: {
    reportDate: string;
    scanDuration: string;
    dependencies: number;
    vulnerableDependencies: number;
  };
  vulnerabilities: OwaspVulnerability[];
  scanSuccess: boolean;
  reportPath?: string;
  xmlReportPath?: string;
}

export class OwaspDependencyCheckService {
  private readonly nvdApiKey: string;
  private readonly defaultTimeout = 300000; // 5 minutes

  constructor(nvdApiKey?: string) {
    this.nvdApiKey = nvdApiKey || process.env.NVD_API_KEY || 'ccfd0503-b629-4aa2-a759-53f2bc9b585a';
  }

  async runDependencyCheck(projectPath: string): Promise<OwaspDependencyCheckResult> {
    console.log('🔍 Running OWASP Dependency Check with NVD database...');
    
    try {
      // Check if project has Maven or Gradle
      const isMavenProject = fs.existsSync(path.join(projectPath, 'pom.xml'));
      const isGradleProject = fs.existsSync(path.join(projectPath, 'build.gradle')) || 
                             fs.existsSync(path.join(projectPath, 'build.gradle.kts'));

      if (isMavenProject) {
        return await this.runMavenDependencyCheck(projectPath);
      } else if (isGradleProject) {
        return await this.runGradleDependencyCheck(projectPath);
      } else {
        return await this.runGenericDependencyCheck(projectPath);
      }
    } catch (error) {
      console.error('OWASP Dependency Check failed:', error);
      return {
        projectInfo: {
          reportDate: new Date().toISOString(),
          scanDuration: '0s',
          dependencies: 0,
          vulnerableDependencies: 0,
        },
        vulnerabilities: [],
        scanSuccess: false,
      };
    }
  }

  private async runMavenDependencyCheck(projectPath: string): Promise<OwaspDependencyCheckResult> {
    // Convert to absolute path
    const absoluteProjectPath = path.resolve(projectPath);
    const reportDir = path.join(absoluteProjectPath, 'target', 'dependency-check-report');
    
    // Ensure report directory exists
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }

    const command = `mvn org.owasp:dependency-check-maven:check ` +
      `-Dformat=ALL ` +
      `-DnvdApiKey=${this.nvdApiKey} ` +
      `-DreportOutputDirectory=${reportDir} ` +
      `-DfailBuildOnCVSS=0 ` +
      `-DskipTestScope=false ` +
      `-DskipProvidedScope=false ` +
      `-DskipRuntimeScope=false`;

    console.log('📦 Analyzing Maven dependencies with OWASP...');
    
    try {
      execSync(command, { 
        stdio: 'pipe',
        timeout: this.defaultTimeout,
        cwd: absoluteProjectPath
      });
    } catch (error) {
      console.warn('Maven dependency check had issues, but may have generated report:', error);
    }
    
    // Always try to parse report from multiple locations, regardless of command success
    const reportLocations = [
      reportDir, // User-specified directory
      path.join(absoluteProjectPath, 'target'), // Default Maven target directory
    ];
    
    console.log(`DEBUG: Will try parsing reports from these locations:`, reportLocations);
    
    for (const location of reportLocations) {
      try {
        console.log(`DEBUG: Trying to parse report from: ${location}`);
        const result = await this.parseOwaspReport(location);
        console.log(`DEBUG: Parse result - scanSuccess: ${result.scanSuccess}, vulnerabilities: ${result.vulnerabilities.length}, dependencies: ${result.projectInfo.dependencies}`);
        console.log(`✅ Successfully parsed OWASP report from: ${location}`);
        return result;
      } catch (error) {
        console.log(`❌ Failed to parse report from ${location}: ${(error as Error).message}`);
        console.log(`DEBUG: Continuing to next location...`);
      }
    }
    
    // If we get here, no reports were found
    throw new Error(`No OWASP dependency check reports found in any of the expected locations: ${reportLocations.join(', ')}`);
  }

  private async runGradleDependencyCheck(projectPath: string): Promise<OwaspDependencyCheckResult> {
    // For Gradle, we'll use the CLI version of dependency-check
    return await this.runGenericDependencyCheck(projectPath);
  }

  private async runGenericDependencyCheck(projectPath: string): Promise<OwaspDependencyCheckResult> {
    // Convert to absolute path
    const absoluteProjectPath = path.resolve(projectPath);
    const reportDir = path.join(absoluteProjectPath, 'dependency-check-report');
    
    // Ensure report directory exists
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }

    // Use OWASP dependency-check CLI
    const command = `dependency-check.sh ` +
      `--scan "${absoluteProjectPath}" ` +
      `--format ALL ` +
      `--out "${reportDir}" ` +
      `--nvdApiKey ${this.nvdApiKey} ` +
      `--enableRetired ` +
      `--enableExperimental`;

    console.log('📦 Analyzing project dependencies with OWASP CLI...');
    
    try {
      execSync(command, { 
        stdio: 'pipe',
        timeout: this.defaultTimeout 
      });

      return await this.parseOwaspReport(reportDir);
    } catch (error) {
      console.warn('CLI dependency check failed, trying alternative approach:', error);
      
      // Fallback: try using Docker if available
      return await this.runDockerDependencyCheck(absoluteProjectPath, reportDir);
    }
  }

  private async runDockerDependencyCheck(projectPath: string, reportDir: string): Promise<OwaspDependencyCheckResult> {
    const command = `docker run --rm ` +
      `-v "${projectPath}:/src" ` +
      `-v "${reportDir}:/report" ` +
      `owasp/dependency-check:latest ` +
      `--scan /src ` +
      `--format ALL ` +
      `--out /report ` +
      `--nvdApiKey ${this.nvdApiKey}`;

    console.log('🐳 Running OWASP Dependency Check via Docker...');
    
    try {
      execSync(command, { 
        stdio: 'pipe',
        timeout: this.defaultTimeout 
      });

      return await this.parseOwaspReport(reportDir);
    } catch (error) {
      console.error('Docker dependency check also failed:', error);
      return {
        projectInfo: {
          reportDate: new Date().toISOString(),
          scanDuration: '0s',
          dependencies: 0,
          vulnerableDependencies: 0,
        },
        vulnerabilities: [],
        scanSuccess: false,
      };
    }
  }

  private async parseOwaspReport(reportDir: string): Promise<OwaspDependencyCheckResult> {
    const callId = Math.random().toString(36).substring(7);
    console.log(`DEBUG: parseOwaspReport called with reportDir: ${reportDir} [ID: ${callId}]`);
    try {
      // Look for the XML report (most comprehensive)
      const xmlReportPath = path.join(reportDir, 'dependency-check-report.xml');
      
      console.log(`DEBUG: Looking for XML report at: ${xmlReportPath}`);
      
      if (!fs.existsSync(xmlReportPath)) {
        throw new Error(`OWASP report not found at ${xmlReportPath}`);
      }

      console.log(`DEBUG: XML report found, reading content...`);
      const xmlContent = fs.readFileSync(xmlReportPath, 'utf-8');
      console.log(`DEBUG: XML content length: ${xmlContent.length} characters`);
      
      try {
        const parser = new xml2js.Parser();
        const result = await parser.parseStringPromise(xmlContent);

        console.log(`DEBUG: XML parsed successfully`);
        console.log(`DEBUG: Root keys:`, Object.keys(result));
        console.log(`DEBUG: Has analysis?`, !!result.analysis);
        
        const analysis = result.analysis;
        if (!analysis) {
          throw new Error('No analysis section found in XML report');
        }

        console.log(`DEBUG: Analysis keys:`, Object.keys(analysis));
        console.log(`DEBUG: Dependencies structure:`, analysis.dependencies ? Object.keys(analysis.dependencies[0] || {}) : 'No dependencies');

        // Extract project info
        const projectInfo = {
          reportDate: analysis.projectInfo?.[0]?.reportDate?.[0] || new Date().toISOString(),
          scanDuration: this.calculateDuration(analysis.projectInfo?.[0]?.reportDate?.[0]),
          dependencies: 0, // Will be updated below
          vulnerableDependencies: 0,
        };

        // Extract vulnerabilities
        const vulnerabilities: OwaspVulnerability[] = [];
        const dependencies = analysis.dependencies?.[0]?.dependency || [];

        console.log(`DEBUG: Found ${dependencies.length} dependencies to analyze`);
        
        // Update the dependencies count
        projectInfo.dependencies = dependencies.length;

        for (const dep of dependencies) {
          const fileName = dep.fileName?.[0] || 'unknown';
          console.log(`DEBUG: Checking dependency: ${fileName}`);
          
          try {
            // Check if this dependency has vulnerabilities
            if (dep.vulnerabilities?.[0]?.vulnerability) {
              const depVulns = dep.vulnerabilities[0].vulnerability;
              console.log(`DEBUG: Found ${depVulns.length} vulnerabilities for ${fileName}`);
              projectInfo.vulnerableDependencies++;
              
              for (const vuln of depVulns) {
                try {
                  const rawSeverity = vuln.severity?.[0] || 'Low';
                  const severity = this.mapSeverity(rawSeverity);
                  
                  const vulnerability: OwaspVulnerability = {
                    name: vuln.name?.[0] || 'Unknown',
                    cveId: vuln.name?.[0] || 'Unknown', // CVE ID is the same as name in OWASP reports
                    severity,
                    description: vuln.description?.[0] || 'No description available',
                    cvssScore: vuln.cvssV3?.[0]?.baseScore?.[0] ? parseFloat(vuln.cvssV3[0].baseScore[0]) : 0,
                    references: vuln.references?.[0]?.reference?.map((ref: any) => ref.url?.[0] || '') || [],
                    affectedArtifact: fileName,
                    fileName,
                    solution: this.generateSolution(vuln, dep)
                  };
                  
                  vulnerabilities.push(vulnerability);
                  console.log(`DEBUG: Added vulnerability ${vulnerability.name} for ${fileName}`);
                } catch (vulnError) {
                  console.error(`DEBUG: Error processing vulnerability:`, vulnError);
                }
              }
            } else {
              console.log(`DEBUG: No vulnerabilities found for ${fileName}`);
            }
          } catch (depError) {
            console.error(`DEBUG: Error processing dependency ${fileName}:`, depError);
          }
        }

        console.log(`✅ OWASP scan complete: ${vulnerabilities.length} vulnerabilities found in ${projectInfo.dependencies} dependencies [ID: ${callId}]`);

        return {
          projectInfo,
          vulnerabilities,
          scanSuccess: true,
          reportPath: path.join(reportDir, 'dependency-check-report.html'),
          xmlReportPath,
        };
      } catch (parseError) {
        console.error('DEBUG: XML parsing failed:', parseError);
        throw parseError;
      }
    } catch (error) {
      console.error(`Failed to parse OWASP report [ID: ${callId}]:`, error);
      throw error;
    }
  }

  private parseVulnerability(vuln: any, dependency: any): OwaspVulnerability | null {
    try {
      const name = vuln.name?.[0] || 'Unknown Vulnerability';
      const cveId = vuln.name?.[0] || vuln.cve?.[0] || 'Unknown CVE';
      const description = vuln.description?.[0] || 'No description available';
      
      // Parse CVSS score and severity
      let cvssScore = 0;
      let severity: 'Critical' | 'High' | 'Medium' | 'Low' = 'Medium';

      if (vuln.cvssV3?.[0]) {
        cvssScore = parseFloat(vuln.cvssV3[0].baseScore?.[0] || '0');
      } else if (vuln.cvssV2?.[0]) {
        cvssScore = parseFloat(vuln.cvssV2[0].score?.[0] || '0');
      }

      // Determine severity from CVSS score
      if (cvssScore >= 9.0) severity = 'Critical';
      else if (cvssScore >= 7.0) severity = 'High';
      else if (cvssScore >= 4.0) severity = 'Medium';
      else severity = 'Low';

      // Extract references
      const references: string[] = [];
      if (vuln.references?.[0]?.reference) {
        for (const ref of vuln.references[0].reference) {
          if (ref.url?.[0]) {
            references.push(ref.url[0]);
          }
        }
      }

      // Get affected artifact info
      const fileName = dependency.fileName?.[0] || 'Unknown file';
      const affectedArtifact = dependency.packages?.[0]?.package?.[0]?.id?.[0] || fileName;

      return {
        name,
        severity,
        cvssScore,
        cveId,
        description,
        references,
        affectedArtifact,
        fileName,
        solution: this.generateSolution(vuln, dependency),
      };
    } catch (error) {
      console.warn('Failed to parse individual vulnerability:', error);
      return null;
    }
  }

  private generateSolution(vuln: any, dependency: any): string {
    const solutions = [];
    
    // Check for fixed versions
    if (vuln.software?.[0]?.vulnerable_software) {
      solutions.push('Update to a patched version');
    }
    
    // Add general recommendations
    solutions.push('Review security advisories for this dependency');
    solutions.push('Consider using alternative libraries if no fix is available');
    
    return solutions.join('. ');
  }

  private calculateDuration(scanDate?: string): string {
    // Simple duration calculation - in a real implementation you'd track start/end times
    return 'N/A';
  }

  // Utility method to check if OWASP tools are available
  async checkOwaspAvailability(): Promise<{maven: boolean, cli: boolean, docker: boolean}> {
    const availability = {
      maven: false,
      cli: false,
      docker: false,
    };

    try {
      execSync('mvn --version', { stdio: 'pipe' });
      availability.maven = true;
    } catch (error) {
      // Maven not available
    }

    try {
      execSync('dependency-check.sh --version', { stdio: 'pipe' });
      availability.cli = true;
    } catch (error) {
      // CLI not available
    }

    try {
      execSync('docker --version', { stdio: 'pipe' });
      availability.docker = true;
    } catch (error) {
      // Docker not available
    }

    return availability;
  }

  private mapSeverity(rawSeverity: string): 'Critical' | 'High' | 'Medium' | 'Low' {
    const normalizedSeverity = rawSeverity.toLowerCase();
    switch (normalizedSeverity) {
      case 'critical':
        return 'Critical';
      case 'high':
        return 'High';
      case 'medium':
        return 'Medium';
      case 'low':
        return 'Low';
      default:
        console.warn(`Unknown severity: ${rawSeverity}, defaulting to Medium`);
        return 'Medium';
    }
  }
} 