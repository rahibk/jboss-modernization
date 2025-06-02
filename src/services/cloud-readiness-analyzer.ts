import { LlmService } from './llm-service';

export interface CloudReadinessIssue {
  category: string;
  severity: 'High' | 'Medium' | 'Low';
  description: string;
  recommendation?: string;
}

export interface CloudAssessment {
  filePath: string;
  readinessScore: number; // 0-10
  issues: CloudReadinessIssue[];
  strengths: string[];
  recommendations: string[];
  cloudProvider: string;
  assessmentTimestamp: string;
}

export class CloudReadinessAnalyzer {
  constructor(private llmService?: LlmService | null) {}

  async assessFile(filePath: string, fileContent: string, cloudProvider: string): Promise<CloudAssessment> {
    let llmAssessment: any = null;

    // Use LLM if available
    if (this.llmService) {
      try {
        const llmResponse = await this.llmService.assessCloudReadiness(filePath, fileContent, cloudProvider);
        llmAssessment = this.parseLlmResponse(llmResponse);
      } catch (error) {
        console.warn(`LLM assessment failed for ${filePath}, falling back to static analysis: ${error}`);
      }
    }

    // Perform static analysis
    const staticAssessment = this.performStaticAnalysis(filePath, fileContent, cloudProvider);

    // Combine LLM and static analysis results
    return this.combineAssessments(filePath, fileContent, cloudProvider, llmAssessment, staticAssessment);
  }

  private parseLlmResponse(response: string): any {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      const jsonContent = jsonMatch ? jsonMatch[0] : response;
      return JSON.parse(jsonContent);
    } catch (error) {
      return null;
    }
  }

  private performStaticAnalysis(filePath: string, fileContent: string, cloudProvider: string): any {
    const issues: CloudReadinessIssue[] = [];
    const strengths: string[] = [];
    const recommendations: string[] = [];

    // Check for cloud-native patterns
    this.checkConfigurationManagement(fileContent, issues, strengths);
    this.checkLoggingPatterns(fileContent, issues, strengths);
    this.checkSecurityPatterns(fileContent, issues, strengths);
    this.checkScalabilityPatterns(fileContent, issues, strengths);
    this.checkContainerReadiness(fileContent, issues, strengths);
    this.checkDatabasePatterns(fileContent, issues, strengths);

    // Calculate readiness score based on issues and strengths
    const score = this.calculateStaticScore(issues, strengths);

    return {
      readinessScore: score,
      issues,
      strengths,
      recommendations: this.generateRecommendations(issues, cloudProvider),
    };
  }

  private checkConfigurationManagement(content: string, issues: CloudReadinessIssue[], strengths: string[]): void {
    // Check for environment variable usage
    if (/process\.env\./g.test(content) || /os\.environ/g.test(content) || /System\.getenv/g.test(content)) {
      strengths.push('Uses environment variables for configuration');
    } else if (/config\s*=\s*{[\s\S]*}/.test(content)) {
      issues.push({
        category: 'Configuration',
        severity: 'Medium',
        description: 'Hardcoded configuration detected',
        recommendation: 'Use environment variables or external configuration files',
      });
    }

    // Check for secrets in code
    if (/(?:password|secret|key|token)\s*[:=]\s*["'`][^"'`\s]+["'`]/i.test(content)) {
      issues.push({
        category: 'Security',
        severity: 'High',
        description: 'Hardcoded secrets detected',
        recommendation: 'Use environment variables or secret management services',
      });
    }
  }

  private checkLoggingPatterns(content: string, issues: CloudReadinessIssue[], strengths: string[]): void {
    // Check for structured logging
    if (/console\.log\(.*JSON\.stringify/g.test(content) || /logger\.(info|error|warn|debug)/g.test(content)) {
      strengths.push('Uses structured logging patterns');
    } else if (/console\.log|print\(/g.test(content)) {
      issues.push({
        category: 'Observability',
        severity: 'Medium',
        description: 'Basic console logging detected',
        recommendation: 'Implement structured logging with log levels and JSON format',
      });
    }

    // Check for monitoring/metrics
    if (/metrics|prometheus|datadog|newrelic/i.test(content)) {
      strengths.push('Includes monitoring/metrics integration');
    }
  }

  private checkSecurityPatterns(content: string, issues: CloudReadinessIssue[], strengths: string[]): void {
    // Check for HTTPS usage
    if (/https:\/\//g.test(content)) {
      strengths.push('Uses HTTPS for external communications');
    }

    if (/http:\/\//.test(content) && !/localhost|127\.0\.0\.1/.test(content)) {
      issues.push({
        category: 'Security',
        severity: 'Medium',
        description: 'HTTP protocol used for external communications',
        recommendation: 'Use HTTPS for all external API calls',
      });
    }

    // Check for input validation
    if (/validation|validate|sanitize/i.test(content)) {
      strengths.push('Includes input validation patterns');
    }
  }

  private checkScalabilityPatterns(content: string, issues: CloudReadinessIssue[], strengths: string[]): void {
    // Check for stateless patterns
    if (/session|state/i.test(content) && !/stateless|jwt/i.test(content)) {
      issues.push({
        category: 'Scalability',
        severity: 'Medium',
        description: 'Potential stateful session management',
        recommendation: 'Use stateless authentication (JWT) and external session storage',
      });
    }

    // Check for caching
    if (/cache|redis|memcached/i.test(content)) {
      strengths.push('Includes caching mechanisms');
    }

    // Check for async patterns
    if (/async|await|Promise/g.test(content)) {
      strengths.push('Uses asynchronous programming patterns');
    }
  }

  private checkContainerReadiness(content: string, issues: CloudReadinessIssue[], strengths: string[]): void {
    // Check for health check endpoints
    if (/\/health|\/status|\/ping/g.test(content)) {
      strengths.push('Includes health check endpoints');
    }

    // Check for graceful shutdown
    if (/SIGTERM|SIGINT|graceful.*shutdown/i.test(content)) {
      strengths.push('Handles graceful shutdown signals');
    }

    // Check for file system dependencies
    if (/fs\.|file\.|FileSystem/g.test(content)) {
      issues.push({
        category: 'Container',
        severity: 'Low',
        description: 'File system operations detected',
        recommendation: 'Use external storage services for persistent data',
      });
    }
  }

  private checkDatabasePatterns(content: string, issues: CloudReadinessIssue[], strengths: string[]): void {
    // Check for connection pooling
    if (/pool|connection.*pool/i.test(content)) {
      strengths.push('Uses database connection pooling');
    }

    // Check for cloud database services
    if (/rds|cosmos|clouddb|firestore/i.test(content)) {
      strengths.push('Uses cloud-managed database services');
    }

    // Check for database migrations
    if (/migration|migrate/i.test(content)) {
      strengths.push('Includes database migration support');
    }
  }

  private calculateStaticScore(issues: CloudReadinessIssue[], strengths: string[]): number {
    let score = 7; // Base score

    // Deduct points for issues
    issues.forEach(issue => {
      switch (issue.severity) {
        case 'High':
          score -= 2;
          break;
        case 'Medium':
          score -= 1;
          break;
        case 'Low':
          score -= 0.5;
          break;
      }
    });

    // Add points for strengths
    score += Math.min(strengths.length * 0.5, 3);

    return Math.max(0, Math.min(10, score));
  }

  private generateRecommendations(issues: CloudReadinessIssue[], cloudProvider: string): string[] {
    const recommendations = new Set<string>();

    if (issues.some(i => i.category === 'Configuration')) {
      if (cloudProvider === 'atlas') {
        recommendations.add('Use MongoDB Atlas App Services for configuration and secrets management');
      } else {
        recommendations.add(`Use ${cloudProvider.toUpperCase()} configuration services (Parameter Store, Key Vault, etc.)`);
      }
    }

    if (issues.some(i => i.category === 'Security')) {
      if (cloudProvider === 'atlas') {
        recommendations.add('Implement MongoDB Atlas security best practices including Network Access Lists and Database Users');
      } else {
        recommendations.add('Implement cloud security best practices and use managed identity services');
      }
    }

    if (issues.some(i => i.category === 'Observability')) {
      if (cloudProvider === 'atlas') {
        recommendations.add('Integrate with MongoDB Atlas monitoring, alerts, and performance advisor');
      } else {
        recommendations.add('Integrate with cloud monitoring and logging services');
      }
    }

    if (issues.some(i => i.category === 'Scalability')) {
      if (cloudProvider === 'atlas') {
        recommendations.add('Design for MongoDB Atlas auto-scaling and use Atlas Data Lake for analytics');
      } else {
        recommendations.add('Design for horizontal scaling and use managed services');
      }
    }

    return Array.from(recommendations);
  }

  private combineAssessments(
    filePath: string,
    fileContent: string,
    cloudProvider: string,
    llmAssessment: any,
    staticAssessment: any
  ): CloudAssessment {
    let finalScore = staticAssessment.readinessScore;
    let finalIssues = [...staticAssessment.issues];
    let finalStrengths = [...staticAssessment.strengths];
    let finalRecommendations = [...staticAssessment.recommendations];

    // Incorporate LLM assessment if available
    if (llmAssessment) {
      // Average the scores, giving more weight to LLM if available
      finalScore = (staticAssessment.readinessScore + (llmAssessment.readinessScore || 5)) / 2;
      
      // Merge issues (avoiding duplicates)
      if (llmAssessment.issues) {
        const existingIssueTypes = new Set(finalIssues.map(i => i.description));
        llmAssessment.issues.forEach((issue: any) => {
          if (!existingIssueTypes.has(issue.description)) {
            finalIssues.push({
              category: issue.category || 'General',
              severity: issue.severity || 'Medium',
              description: issue.description,
              recommendation: issue.recommendation,
            });
          }
        });
      }

      // Merge strengths and recommendations
      if (llmAssessment.strengths) {
        finalStrengths = [...new Set([...finalStrengths, ...llmAssessment.strengths])];
      }
      if (llmAssessment.recommendations) {
        finalRecommendations = [...new Set([...finalRecommendations, ...llmAssessment.recommendations])];
      }
    }

    return {
      filePath,
      readinessScore: Math.round(finalScore * 10) / 10,
      issues: finalIssues,
      strengths: finalStrengths,
      recommendations: finalRecommendations,
      cloudProvider,
      assessmentTimestamp: new Date().toISOString(),
    };
  }

  calculateOverallReadiness(assessments: CloudAssessment[]): number {
    if (assessments.length === 0) return 0;
    
    const totalScore = assessments.reduce((sum, assessment) => sum + assessment.readinessScore, 0);
    return totalScore / assessments.length;
  }
} 