# Sample Commands for kitchensink-jboss Analysis

This document provides example commands to analyze the `kitchensink-jboss` application using the modernization toolset.

## Prerequisites

1. Ensure the project is built:
   ```bash
   npm run build
   ```

2. Set up your LLM API key (required for architectural and CVE analysis):
   ```bash
   export LLM_API_KEY=your-openai-api-key
   export LLM_ENDPOINT=https://api.openai.com/v1  # Optional, defaults to OpenAI
   ```

3. **NEW:** Your NVD API key is pre-configured for enhanced OWASP analysis: `ccfd0503-b629-4aa2-a759-53f2bc9b585a`

## Available Commands

The modernization toolset provides three main commands:
- `architect` - Architectural migration analysis  
- `cve` - CVE vulnerability analysis
- `cloud-readiness` - Cloud readiness assessment

**✨ Automatic File Saving**: All commands now automatically save results to the current directory with timestamped filenames. Each analysis generates both JSON and Markdown files for easy viewing.

## Architectural Analysis Commands

### Basic architectural analysis
```bash
npx modernize architect ./kitchensink-jboss
```

### Specify source and target frameworks
```bash
npx modernize architect ./kitchensink-jboss \
  --source-framework jboss \
  --target-framework springboot3
```

### Complete architectural analysis with all options
```bash
npx modernize architect ./kitchensink-jboss \
  --source-framework jboss \
  --target-framework springboot3 \
  --llm-endpoint https://api.openai.com/v1 \
  --llm-api-key your-api-key \
  --include-tests \
  --exclude-patterns "*.class" "target/" "node_modules/"
```

> **Note**: There's currently a validation issue with the `--target-java-version` option. The command defaults to Java 21, which works well for most migrations.

## Security Analysis Commands

### Enhanced CVE Analysis (🆕 OWASP + NVD + LLM Integration)

#### **🚀 Enhanced CVE Analysis (Recommended)**
```bash
npx modernize cve ./kitchensink-jboss
```

**This NEW enhanced analysis provides:**
- **🛡️ OWASP Dependency Check** with your NVD API key for authoritative vulnerability data
- **🧠 LLM Analysis** for business context and strategic recommendations  
- **📊 Real-time CVE Database** access (no training data limitations)
- **🎯 Strategic Migration Planning** with risk prioritization
- **📈 Executive Dashboards** with actionable insights

#### Enhanced Analysis Process:
1. **Step 1:** OWASP Dependency Check scans with NVD database (your API key: `ccfd0503-b629-4aa2-a759-53f2bc9b585a`)
2. **Step 2:** LLM enhances findings with business context and migration complexity
3. **Step 3:** Strategic recommendations with phased remediation plans

#### Custom NVD API Key
```bash
npx modernize cve ./kitchensink-jboss --nvd-api-key your-custom-nvd-key
```

#### Enhanced Analysis with Custom Parameters
```bash
npx modernize cve ./kitchensink-jboss \
  --llm-endpoint https://api.openai.com/v1 \
  --llm-api-key your-api-key \
  --nvd-api-key ccfd0503-b629-4aa2-a759-53f2bc9b585a
```

## Cloud Readiness Assessment Commands

### Basic cloud readiness assessment
```bash
npx modernize cloud-readiness ./kitchensink-jboss
```

### Cloud readiness for specific provider
```bash
npx modernize cloud-readiness ./kitchensink-jboss \
  --cloud-provider aws
```

### Cloud readiness with specific file types
```bash
npx modernize cloud-readiness ./kitchensink-jboss \
  --cloud-provider aws \
  --extensions ".java" ".xml" ".properties" ".yml"
```

## Batch Analysis

### Run all analyses together
```bash
# Set API key once
export LLM_API_KEY=your-openai-api-key

# Architectural analysis
npx modernize architect ./kitchensink-jboss \
  --source-framework jboss \
  --target-framework springboot3

# Security analysis
npx modernize cve ./kitchensink-jboss

# Cloud readiness
npx modernize cloud-readiness ./kitchensink-jboss \
  --cloud-provider mongodb
```

## Framework-Specific Examples

### JBoss to Spring Boot 3 (Uses Java 21 by default)
```bash
npx modernize architect ./kitchensink-jboss \
  --source-framework jboss \
  --target-framework springboot3
```

### JBoss to Spring Boot 2 (Uses Java 21 by default) 
```bash
npx modernize architect ./kitchensink-jboss \
  --source-framework jboss \
  --target-framework springboot2
```

## Output Files

Each command automatically generates timestamped files in the current directory:

### Architect Command
- `architect_kitchensink_jboss_2024-01-15_14-30-25.json` - Raw analysis data
- `architect_kitchensink_jboss_2024-01-15_14-30-25.md` - Formatted report for easy reading

### CVE Command  
- `cve_kitchensink_jboss_2024-01-15_14-32-10.json` - Vulnerability data
- `cve_kitchensink_jboss_2024-01-15_14-32-10.md` - Security report with recommendations

### Cloud Readiness Command
- `cloud-readiness_kitchensink_jboss_2024-01-15_14-35-45.json` - Assessment data  
- `cloud-readiness_kitchensink_jboss_2024-01-15_14-35-45.md` - Cloud migration guide

### Markdown Reports Include:
- **Executive Summary** with key metrics
- **Detailed Analysis** with actionable recommendations  
- **Code Examples** and transformation patterns
- **Best Practices** and implementation guidance
- **Raw Terminal Output** for reference
- **Complete JSON Data** for integration

## Local Development Commands

If you're developing locally, you can also run:

```bash
# Using npm script
npm run dev architect ./kitchensink-jboss

# Using ts-node directly  
npx ts-node src/index.ts architect ./kitchensink-jboss

# Using built version
node dist/index.js architect ./kitchensink-jboss
```

## Working Example Output

The `architect` command produces detailed migration analysis like this:

```
🏗️  Architectural Migration Analysis:

Source: JBOSS
Target: SPRINGBOOT2 with Java 21
Complexity Score: 7/10
Estimated Effort: 4-6 weeks

📋 High-Level Migration Steps:
1. Project Setup - Initialize Spring Boot project (1-2 days)
2. Dependency Management - Update Maven POM (1-2 days) 
3. Configuration Migration - Convert config files (2-3 days)
4. Code Refactoring - Replace JBoss components (2-3 weeks)
5. Testing and Validation - Update and run tests (1-2 weeks)

🔄 Framework-Specific Changes:
- CDI Annotations: @Inject → @Autowired, @Named → @Component
- JPA Configuration: persistence.xml → application.properties  
- JSF: Replace with Spring MVC/WebFlux

📦 Dependency Changes:
- Remove: jboss-javaee-7.0, jboss-jsf-api
- Add: spring-boot-starter-web, spring-boot-starter-data-jpa
- Update: spring-boot-starter-test

📄 Analysis results saved:
   JSON: architect_kitchensink_jboss_2024-01-15_14-30-25.json
   Markdown: architect_kitchensink_jboss_2024-01-15_14-30-25.md
```

## Troubleshooting

If you encounter issues:

1. **Command not found**: Make sure the project is built
   ```bash
   npm run build
   ```

2. **LLM API Key Required**: Most analysis commands require an LLM API key
   ```bash
   export LLM_API_KEY=your-openai-api-key
   ```

3. **Java Version Issues**: Currently there's a validation bug with `--target-java-version`. Use the default (Java 21) for now.

4. **Invalid Path**: Ensure the kitchensink-jboss directory exists and contains Java files

5. **Network Issues**: Check your internet connection for LLM API calls

6. **Permissions**: Ensure you have read/write access to the project directory

7. **File Already Exists**: Commands generate unique timestamped filenames to avoid conflicts

## Expected Output

The commands will generate detailed reports containing:
- **Architect**: Migration complexity scores, step-by-step migration plans, framework-specific changes required, dependency updates needed
- **CVE**: Security vulnerability assessments with severity levels and recommendations
- **Cloud-readiness**: Cloud readiness scores and recommendations for deployment

The tool now provides meaningful analysis specific to your codebase with both machine-readable JSON and human-friendly Markdown outputs! 