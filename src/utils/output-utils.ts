import * as fs from 'fs';
import * as path from 'path';
import chalk from 'chalk';

export function generateTimestamp(): string {
  const now = new Date();
  return now.toISOString().replace(/[:.]/g, '-').replace('T', '_').split('.')[0];
}

export function saveAnalysisResults(
  analysisType: string,
  data: any,
  terminalOutput: string,
  projectPath: string
): { jsonFile: string; markdownFile: string } {
  const timestamp = generateTimestamp();
  const sanitizedPath = path.basename(projectPath).replace(/[^a-zA-Z0-9]/g, '_');
  
  const jsonFileName = `${analysisType}_${sanitizedPath}_${timestamp}.json`;
  const markdownFileName = `${analysisType}_${sanitizedPath}_${timestamp}.md`;
  
  // Save JSON data
  fs.writeFileSync(jsonFileName, JSON.stringify(data, null, 2));
  
  // Save Markdown report
  const markdownContent = generateMarkdownReport(analysisType, data, terminalOutput, projectPath);
  fs.writeFileSync(markdownFileName, markdownContent);
  
  return { jsonFile: jsonFileName, markdownFile: markdownFileName };
}

function generateMarkdownReport(
  analysisType: string,
  data: any,
  terminalOutput: string,
  projectPath: string
): string {
  const timestamp = new Date().toISOString();
  
  let markdown = `# ${analysisType.charAt(0).toUpperCase() + analysisType.slice(1)} Analysis Report

**Project:** ${projectPath}  
**Analysis Date:** ${timestamp}  
**Tool:** Modernization Toolset

---

`;

  // Add type-specific content
  switch (analysisType) {
    case 'architect':
      markdown += generateArchitectMarkdown(data, terminalOutput);
      break;
    case 'cve':
      markdown += generateCVEMarkdown(data, terminalOutput);
      break;
    case 'cloud-readiness':
      markdown += generateCloudReadinessMarkdown(data, terminalOutput);
      break;
  }

  // Add raw terminal output
  markdown += `
---

## Raw Terminal Output

\`\`\`
${terminalOutput.replace(/\x1b\[[0-9;]*m/g, '')} // Remove ANSI color codes
\`\`\`

---

## Analysis Data (JSON)

\`\`\`json
${JSON.stringify(data, null, 2)}
\`\`\`
`;

  return markdown;
}

function generateArchitectMarkdown(data: any, terminalOutput: string): string {
  const analysis = data.migrationAnalysis || data;
  
  return `## Executive Summary

- **Source Framework:** ${data.metadata?.sourceFramework?.toUpperCase() || 'Unknown'}
- **Target Framework:** ${data.metadata?.targetFramework?.toUpperCase() || 'Unknown'}
- **Target Java Version:** ${data.metadata?.targetJavaVersion || 'Unknown'}
- **Complexity Score:** ${analysis.complexityScore || 'N/A'}/10
- **Estimated Effort:** ${analysis.estimatedEffort || 'N/A'}

## High-Level Migration Steps

${analysis.highLevelSteps?.map((step: any, index: number) => 
  `### ${index + 1}. ${step.title}

${step.description}

**Effort:** ${step.effort || 'Not specified'}
`).join('\n') || 'No migration steps available.'}

## Framework-Specific Changes

${analysis.frameworkChanges?.map((change: any, index: number) => 
  `### ${index + 1}. ${change.component}: ${change.action}

${change.description}

- **Before:** \`${change.before || 'N/A'}\`
- **After:** \`${change.after || 'N/A'}\`
`).join('\n') || 'No framework changes available.'}

## Dependency Changes

### Dependencies to Remove
${analysis.dependencyChanges?.remove?.map((dep: string) => `- ${dep}`).join('\n') || 'None'}

### Dependencies to Add
${analysis.dependencyChanges?.add?.map((dep: string) => `- ${dep}`).join('\n') || 'None'}

### Dependencies to Update
${analysis.dependencyChanges?.update?.map((dep: string) => `- ${dep}`).join('\n') || 'None'}

## Code Transformation Examples

${analysis.codeExamples?.map((example: any, index: number) => 
  `### ${index + 1}. ${example.description}

**Before:**
\`\`\`java
${example.before}
\`\`\`

**After:**
\`\`\`java
${example.after}
\`\`\`
`).join('\n') || 'No code examples available.'}
`;
}

function generateCVEMarkdown(data: any, terminalOutput: string): string {
  return `## Summary

- **Total Files Analyzed:** ${data.totalFiles || 0}
- **Files with Vulnerabilities:** ${data.vulnerableFiles || 0}
- **Analysis Date:** ${data.timestamp}

## Vulnerability Details

${data.results?.map((result: any, index: number) => 
  `### ${index + 1}. ${result.filePath}

${result.vulnerabilities?.map((vuln: any, vulnIndex: number) => 
  `#### ${vulnIndex + 1}. ${vuln.type} (${vuln.severity} Severity)

**Line:** ${vuln.lineNumber}  
**Description:** ${vuln.description}

${vuln.recommendation ? `**Recommendation:** ${vuln.recommendation}` : ''}
`).join('\n')}
`).join('\n') || 'No vulnerabilities detected.'}

## Recommendations

1. **High Severity Issues:** Address immediately before deployment
2. **Medium Severity Issues:** Plan fixes in next development cycle  
3. **Low Severity Issues:** Consider addressing during regular maintenance

## Security Best Practices

- Implement input validation for all user inputs
- Use parameterized queries to prevent SQL injection
- Avoid logging sensitive information
- Use HTTPS for all external communications
- Implement proper error handling without exposing sensitive details
`;
}

function generateCloudReadinessMarkdown(data: any, terminalOutput: string): string {
  return `## Summary

- **Overall Readiness Score:** ${data.overallScore?.toFixed(1) || 'N/A'}/10
- **Target Cloud Provider:** ${data.cloudProvider?.toUpperCase() || 'Generic'}
- **Total Files Analyzed:** ${data.totalFiles || 0}

### Readiness Distribution
- **High Readiness (8-10):** ${data.summary?.highReadiness || 0} files
- **Medium Readiness (5-7):** ${data.summary?.mediumReadiness || 0} files  
- **Low Readiness (0-4):** ${data.summary?.lowReadiness || 0} files

## Detailed Assessment

${data.assessments?.map((assessment: any, index: number) => 
  `### ${index + 1}. ${assessment.filePath}

**Readiness Score:** ${assessment.readinessScore?.toFixed(1)}/10

#### Issues Identified:
${assessment.issues?.map((issue: any) => 
  `- **${issue.category}** (${issue.severity}): ${issue.description}
  ${issue.recommendation ? `  - *Recommendation:* ${issue.recommendation}` : ''}`
).join('\n')}
`).join('\n') || 'No assessments available.'}

## Cloud Migration Recommendations

### Immediate Actions (High Priority)
- Address low readiness files with critical cloud compatibility issues
- Implement stateless design patterns
- Externalize configuration management

### Short-term Improvements (Medium Priority)  
- Implement health checks and monitoring
- Add distributed tracing capabilities
- Optimize for horizontal scaling

### Long-term Enhancements (Low Priority)
- Adopt cloud-native patterns (circuit breakers, service mesh)
- Implement advanced observability
- Consider serverless opportunities

## Cloud Provider Specific Guidance

${data.cloudProvider === 'aws' ? `
### AWS Recommendations
- Use AWS Application Load Balancer for traffic distribution
- Implement AWS CloudWatch for monitoring
- Consider AWS Lambda for serverless functions
- Use AWS RDS for managed databases
` : data.cloudProvider === 'azure' ? `
### Azure Recommendations  
- Use Azure Application Gateway for load balancing
- Implement Azure Monitor for observability
- Consider Azure Functions for serverless computing
- Use Azure SQL Database for managed data services
` : data.cloudProvider === 'gcp' ? `
### Google Cloud Recommendations
- Use Google Cloud Load Balancing
- Implement Cloud Monitoring and Logging
- Consider Cloud Functions for event-driven architecture
- Use Cloud SQL for managed databases
` : `
### Generic Cloud Recommendations
- Implement container orchestration (Kubernetes)
- Use managed database services
- Implement proper monitoring and logging
- Design for auto-scaling capabilities
`}
`;
}

export function stripAnsiColors(text: string): string {
  return text.replace(/\x1b\[[0-9;]*m/g, '');
} 