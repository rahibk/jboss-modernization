# Modernization Toolset

A TypeScript CLI tool for code modernization analysis that helps identify vulnerabilities, generate architectural insights, and assess cloud readiness for your applications.

## Features

- **CVE Analysis**: Identify security vulnerabilities and get AI-powered remediation suggestions
- **Architectural Migration**: Package and analyze codebases for framework migrations (JBOSS → Spring Boot)
- **Cloud Readiness Assessment**: Evaluate applications for cloud deployment readiness

## Installation

```bash
npm install
npm run build
```

## Usage

### CVE Analysis
Analyze code for security vulnerabilities:

```bash
npm start cve <path> [options]
# Example: npm start cve ./src --severity critical,high
```

Options:
- `--severity, -s`: Filter by severity levels (critical, high, medium, low)
- `--output, -o`: Output file for results
- `--llm-api-key, -k`: LLM API key for enhanced analysis

### Architectural Migration
Package codebase with repomix and analyze for framework migration (JBOSS to Spring Boot):

```bash
npm start architect <path> [options]
# Example: npm start architect ./legacy-app --source-framework jboss --target-framework springboot3 --target-java-version 21
```

Options:
- `--source-framework, -s`: Source framework (jboss, wildfly, tomcat, websphere, weblogic)
- `--target-framework, -t`: Target framework (springboot3, springboot2)
- `--target-java-version, -j`: Target Java version (17, 21, 11)
- `--include-tests`: Include test files in analysis
- `--exclude-patterns`: Patterns to exclude from packaging
- `--output, -o`: Output file for migration analysis results

### Cloud Readiness Assessment
Assess application readiness for cloud deployment:

```bash
npm start cloud-readiness <path> [options]
# Example: npm start cloud-readiness ./app --provider aws
```

Options:
- `--provider, -p`: Cloud provider (aws, azure, gcp)
- `--output, -o`: Output file for assessment results
- `--include-security`: Include security assessment
- `--include-performance`: Include performance assessment

## Environment Variables

Create a `.env` file with:

```
LLM_API_KEY=your_openai_api_key_here
LLM_ENDPOINT=https://api.openai.com/v1
```

## Dependencies

- **yargs**: Command-line interface
- **chalk**: Terminal styling
- **ora**: Loading spinners
- **axios**: HTTP client for LLM APIs
- **repomix**: Codebase packaging for analysis
- **@babel/\***: AST parsing for JavaScript/TypeScript
- **dotenv**: Environment variable management

## Development

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Run in development mode
npm run dev

# Build and run
npm start <command>
```

## Example Workflows

### JBOSS to Spring Boot Migration
1. Package your JBOSS application with repomix
2. Analyze migration requirements with AI
3. Get step-by-step migration plan
4. Receive code transformation examples

```bash
npm start architect ./legacy-jboss-app --source-framework jboss --target-framework springboot3 --target-java-version 21 --output migration-plan.json
```

### Security and Cloud Assessment
1. Analyze code for vulnerabilities
2. Assess cloud deployment readiness
3. Get comprehensive modernization recommendations

```bash
npm start cve ./src --severity critical,high --output security-report.json
npm start cloud-readiness ./src --provider aws --output cloud-assessment.json
``` 