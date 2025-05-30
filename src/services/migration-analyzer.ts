import { LlmService } from './llm-service';

export interface FileStructureChange {
  type: 'rename' | 'move' | 'create' | 'delete' | 'modify';
  description: string;
  before?: string;
  after?: string;
  reason?: string;
}

export interface MigrationStep {
  title: string;
  description: string;
  priority: 'High' | 'Medium' | 'Low';
  category: 'Dependencies' | 'Configuration' | 'Code' | 'Testing' | 'Documentation';
  estimatedHours?: number;
  codeChanges?: string[];
}

export interface TargetAst {
  filePath: string;
  language: string;
  ast: any;
  changes: string[];
  newDependencies: string[];
}

export interface MigrationAnalysis {
  currentFramework: string;
  targetFramework: string;
  targetJavaVersion: string;
  complexityScore: number; // 1-10
  estimatedEffort: string;
  fileStructureChanges: FileStructureChange[];
  migrationSteps: MigrationStep[];
  targetAsts: TargetAst[];
  dependencyChanges: {
    remove: string[];
    add: string[];
    update: string[];
  };
  configurationChanges: string[];
  riskAssessment: {
    level: 'Low' | 'Medium' | 'High' | 'Critical';
    factors: string[];
  };
  recommendations: string[];
}

export class MigrationAnalyzer {
  constructor(private llmService: LlmService) {}

  async analyzeMigration(
    currentAsts: any[],
    targetFramework: string,
    targetJavaVersion: string,
    projectPath: string
  ): Promise<MigrationAnalysis> {
    // Filter Java files for analysis
    const javaAsts = currentAsts.filter(ast => 
      ast.language === 'java' || 
      ast.filePath.endsWith('.java') ||
      ast.filePath.endsWith('.xml') ||
      ast.filePath.endsWith('.properties') ||
      ast.filePath.endsWith('.yml')
    );

    // Detect current framework
    const currentFramework = this.detectCurrentFramework(currentAsts);

    // Generate migration analysis using LLM
    const llmAnalysis = await this.generateLlmMigrationAnalysis(
      javaAsts,
      currentFramework,
      targetFramework,
      targetJavaVersion,
      projectPath
    );

    // Combine with static analysis
    const staticAnalysis = this.performStaticMigrationAnalysis(currentAsts, targetFramework, targetJavaVersion);

    return this.combineMigrationAnalysis(llmAnalysis, staticAnalysis, currentFramework, targetFramework, targetJavaVersion);
  }

  private detectCurrentFramework(asts: any[]): string {
    // Look for Spring Boot indicators
    const indicators = {
      'Spring Boot 2': ['@SpringBootApplication', 'spring-boot-starter', 'javax.'],
      'Spring Boot 1': ['@EnableAutoConfiguration', 'spring-boot-1'],
      'Spring MVC': ['@Controller', '@RestController', 'spring-webmvc'],
      'Jakarta EE': ['jakarta.servlet', 'jakarta.persistence'],
      'Java EE': ['javax.servlet', 'javax.persistence'],
      'Plain Java': []
    };

    for (const ast of asts) {
      const content = JSON.stringify(ast);
      for (const [framework, patterns] of Object.entries(indicators)) {
        if (patterns.some(pattern => content.includes(pattern))) {
          return framework;
        }
      }
    }

    return 'Unknown';
  }

  private async generateLlmMigrationAnalysis(
    asts: any[],
    currentFramework: string,
    targetFramework: string,
    targetJavaVersion: string,
    projectPath: string
  ): Promise<any> {
    const prompt = `
Analyze the following Java project ASTs and provide a comprehensive migration plan from ${currentFramework} to ${targetFramework.toUpperCase()} with Java ${targetJavaVersion}.

Current Project ASTs:
${JSON.stringify(asts.slice(0, 5), null, 2)} // Limit to first 5 files for prompt size

Project Path: ${projectPath}
Current Framework: ${currentFramework}
Target: ${targetFramework.toUpperCase()} with Java ${targetJavaVersion}

Please provide a detailed migration analysis with:

1. **Complexity Assessment**: Rate complexity (1-10) and estimated effort (hours/days/weeks)

2. **File Structure Changes**: What directories, packages, and files need to be renamed, moved, or created

3. **Migration Steps**: Detailed step-by-step migration plan with priorities

4. **Target AST Structure**: How the code structure should look after migration

5. **Dependency Changes**: What dependencies to remove, add, or update

6. **Configuration Changes**: Changes needed in application.properties, pom.xml, etc.

7. **Risk Assessment**: Potential risks and mitigation strategies

8. **Code Transformation Examples**: Before/after code examples for key changes

Focus specifically on:
- Spring Boot 3 changes (Spring Framework 6, Spring Security 6)
- Java 21 features and compatibility
- javax.* to jakarta.* package migrations
- Updated configuration patterns
- Performance optimizations
- Security improvements

Format your response as a JSON object with the following structure:
{
  "complexityScore": number,
  "estimatedEffort": "string",
  "fileStructureChanges": [
    {
      "type": "rename|move|create|delete|modify",
      "description": "string",
      "before": "string",
      "after": "string",
      "reason": "string"
    }
  ],
  "migrationSteps": [
    {
      "title": "string",
      "description": "string",
      "priority": "High|Medium|Low",
      "category": "Dependencies|Configuration|Code|Testing|Documentation",
      "estimatedHours": number,
      "codeChanges": ["string"]
    }
  ],
  "targetAsts": [
    {
      "filePath": "string",
      "changes": ["string"],
      "newDependencies": ["string"]
    }
  ],
  "dependencyChanges": {
    "remove": ["string"],
    "add": ["string"],
    "update": ["string"]
  },
  "configurationChanges": ["string"],
  "riskAssessment": {
    "level": "Low|Medium|High|Critical",
    "factors": ["string"]
  },
  "recommendations": ["string"]
}
`;

    try {
      const response = await this.llmService.sendRequest({
        prompt,
        maxTokens: 3000,
        temperature: 0.1,
      });

      // Parse the LLM response
      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      const jsonContent = jsonMatch ? jsonMatch[0] : response.content;
      return JSON.parse(jsonContent);
    } catch (error) {
      console.warn('LLM migration analysis failed, using fallback analysis');
      return this.createFallbackMigrationAnalysis(currentFramework, targetFramework, targetJavaVersion);
    }
  }

  private performStaticMigrationAnalysis(asts: any[], targetFramework: string, targetJavaVersion: string): any {
    const changes: FileStructureChange[] = [];
    const steps: MigrationStep[] = [];
    const dependencyChanges = { 
      remove: [] as string[], 
      add: [] as string[], 
      update: [] as string[] 
    };

    // Standard Spring Boot 3 migration changes
    if (targetFramework === 'springboot3') {
      // File structure changes
      changes.push({
        type: 'modify',
        description: 'Update package imports from javax.* to jakarta.*',
        before: 'javax.servlet, javax.persistence, javax.validation',
        after: 'jakarta.servlet, jakarta.persistence, jakarta.validation',
        reason: 'Spring Boot 3 uses Jakarta EE 9+ which moved from javax to jakarta namespace'
      });

      changes.push({
        type: 'modify',
        description: 'Update Maven/Gradle configuration for Java 21',
        before: '<java.version>11</java.version>',
        after: '<java.version>21</java.version>',
        reason: 'Target Java version upgrade'
      });

      // Migration steps
      steps.push({
        title: 'Update Java Version',
        description: 'Upgrade Java version to 21 and update build configuration',
        priority: 'High',
        category: 'Configuration',
        estimatedHours: 2,
        codeChanges: ['Update pom.xml or build.gradle', 'Set JAVA_HOME', 'Update CI/CD pipelines']
      });

      steps.push({
        title: 'Package Migration javax → jakarta',
        description: 'Replace all javax.* imports with jakarta.* equivalents',
        priority: 'High',
        category: 'Code',
        estimatedHours: 8,
        codeChanges: [
          'javax.servlet → jakarta.servlet',
          'javax.persistence → jakarta.persistence',
          'javax.validation → jakarta.validation'
        ]
      });

      steps.push({
        title: 'Spring Boot Dependencies Update',
        description: 'Update Spring Boot version to 3.x and related dependencies',
        priority: 'High',
        category: 'Dependencies',
        estimatedHours: 4,
        codeChanges: ['Update spring-boot-starter-parent to 3.x', 'Update other Spring dependencies']
      });

      steps.push({
        title: 'Configuration Properties Migration',
        description: 'Update deprecated configuration properties',
        priority: 'Medium',
        category: 'Configuration',
        estimatedHours: 3,
        codeChanges: ['Update application.properties/yml', 'Review custom configurations']
      });

      steps.push({
        title: 'Security Configuration Update',
        description: 'Update Spring Security configuration for version 6',
        priority: 'High',
        category: 'Code',
        estimatedHours: 6,
        codeChanges: ['Update WebSecurityConfigurerAdapter usage', 'Review authentication flows']
      });

      // Dependency changes
      dependencyChanges.add.push(
        'spring-boot-starter-parent:3.2.0',
        'spring-security-config:6.2.0'
      );

      dependencyChanges.remove.push(
        'org.springframework.security:spring-security-config:5.x'
      );
    }

    return {
      fileStructureChanges: changes,
      migrationSteps: steps,
      dependencyChanges,
      complexityScore: 7,
      estimatedEffort: '2-3 weeks'
    };
  }

  private createFallbackMigrationAnalysis(currentFramework: string, targetFramework: string, targetJavaVersion: string): any {
    return {
      complexityScore: 6,
      estimatedEffort: '2-4 weeks',
      fileStructureChanges: [
        {
          type: 'modify',
          description: 'Package migration from javax to jakarta',
          before: 'javax.*',
          after: 'jakarta.*',
          reason: 'Spring Boot 3 requirement'
        }
      ],
      migrationSteps: [
        {
          title: 'Prepare Migration Environment',
          description: 'Set up development environment with Java 21 and Spring Boot 3',
          priority: 'High',
          category: 'Configuration',
          estimatedHours: 4
        }
      ],
      targetAsts: [],
      dependencyChanges: {
        remove: ['spring-boot-2.x dependencies'],
        add: ['spring-boot-3.x dependencies'],
        update: ['Java version to 21']
      },
      configurationChanges: ['Update Java version', 'Migrate to Jakarta EE'],
      riskAssessment: {
        level: 'Medium',
        factors: ['Package namespace changes', 'Configuration updates']
      },
      recommendations: ['Test thoroughly', 'Migrate incrementally', 'Update documentation']
    };
  }

  private combineMigrationAnalysis(
    llmAnalysis: any,
    staticAnalysis: any,
    currentFramework: string,
    targetFramework: string,
    targetJavaVersion: string
  ): MigrationAnalysis {
    return {
      currentFramework,
      targetFramework,
      targetJavaVersion,
      complexityScore: llmAnalysis.complexityScore || staticAnalysis.complexityScore,
      estimatedEffort: llmAnalysis.estimatedEffort || staticAnalysis.estimatedEffort,
      fileStructureChanges: [
        ...(llmAnalysis.fileStructureChanges || []),
        ...(staticAnalysis.fileStructureChanges || [])
      ],
      migrationSteps: [
        ...(llmAnalysis.migrationSteps || []),
        ...(staticAnalysis.migrationSteps || [])
      ],
      targetAsts: llmAnalysis.targetAsts || [],
      dependencyChanges: {
        remove: [
          ...(llmAnalysis.dependencyChanges?.remove || []),
          ...(staticAnalysis.dependencyChanges?.remove || [])
        ],
        add: [
          ...(llmAnalysis.dependencyChanges?.add || []),
          ...(staticAnalysis.dependencyChanges?.add || [])
        ],
        update: [
          ...(llmAnalysis.dependencyChanges?.update || []),
          ...(staticAnalysis.dependencyChanges?.update || [])
        ]
      },
      configurationChanges: [
        ...(llmAnalysis.configurationChanges || []),
        ...(staticAnalysis.configurationChanges || [])
      ],
      riskAssessment: llmAnalysis.riskAssessment || staticAnalysis.riskAssessment || {
        level: 'Medium',
        factors: ['Framework migration complexity']
      },
      recommendations: llmAnalysis.recommendations || staticAnalysis.recommendations || [
        'Plan migration in phases',
        'Set up comprehensive testing',
        'Update documentation'
      ]
    };
  }
} 