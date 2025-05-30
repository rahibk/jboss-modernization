import { parse } from '@babel/parser';
import traverse from '@babel/traverse';
import * as t from '@babel/types';
import * as fs from 'fs';
import * as path from 'path';

export interface AstNode {
  type: string;
  start?: number;
  end?: number;
  loc?: {
    start: { line: number; column: number };
    end: { line: number; column: number };
  };
  [key: string]: any;
}

export interface FileAst {
  filePath: string;
  language: string;
  ast: AstNode;
  metadata?: {
    size: number;
    lines: number;
    functions: number;
    classes: number;
    imports: number;
    exports: number;
  };
  parseTimestamp: string;
}

export class AstGenerator {
  generateAst(filePath: string, fileContent: string, includeMetadata: boolean = true): FileAst {
    const language = this.detectLanguage(filePath);
    
    try {
      let ast: any;
      
      if (language === 'javascript' || language === 'typescript' || language === 'jsx' || language === 'tsx') {
        ast = this.parseJavaScriptTypeScript(fileContent, language);
      } else {
        // For other languages, create a basic text-based AST
        ast = this.createTextBasedAst(fileContent);
      }

      const result: FileAst = {
        filePath,
        language,
        ast,
        parseTimestamp: new Date().toISOString(),
      };

      if (includeMetadata) {
        result.metadata = this.generateMetadata(fileContent, ast, language);
      }

      return result;
    } catch (error) {
      throw new Error(`Failed to parse ${filePath}: ${error}`);
    }
  }

  private detectLanguage(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    
    const languageMap: { [key: string]: string } = {
      '.js': 'javascript',
      '.jsx': 'jsx',
      '.ts': 'typescript',
      '.tsx': 'tsx',
      '.py': 'python',
      '.java': 'java',
      '.cpp': 'cpp',
      '.c': 'c',
      '.cs': 'csharp',
      '.go': 'go',
      '.rs': 'rust',
      '.php': 'php',
      '.rb': 'ruby',
    };

    return languageMap[ext] || 'unknown';
  }

  private parseJavaScriptTypeScript(content: string, language: string): AstNode {
    const parserOptions: any = {
      sourceType: 'module',
      allowImportExportEverywhere: true,
      allowReturnOutsideFunction: true,
      plugins: ['jsx', 'asyncGenerators', 'functionBind', 'decorators-legacy', 'classProperties'],
    };

    if (language === 'typescript' || language === 'tsx') {
      parserOptions.plugins.push('typescript');
    }

    const parsedAst = parse(content, parserOptions);
    return parsedAst as AstNode;
  }

  private createTextBasedAst(content: string): AstNode {
    // Create a simple AST for non-JavaScript languages
    const lines = content.split('\n');
    
    return {
      type: 'File',
      start: 0,
      end: content.length,
      loc: {
        start: { line: 1, column: 0 },
        end: { line: lines.length, column: lines[lines.length - 1]?.length || 0 },
      },
      body: lines.map((line, index) => ({
        type: 'Line',
        content: line,
        lineNumber: index + 1,
        start: content.indexOf(line),
        end: content.indexOf(line) + line.length,
      })),
    };
  }

  private generateMetadata(content: string, ast: any, language: string): any {
    const lines = content.split('\n');
    const metadata = {
      size: content.length,
      lines: lines.length,
      functions: 0,
      classes: 0,
      imports: 0,
      exports: 0,
    };

    if (language === 'javascript' || language === 'typescript' || language === 'jsx' || language === 'tsx') {
      // Use Babel traverse to count AST nodes
      traverse(ast, {
        FunctionDeclaration() {
          metadata.functions++;
        },
        FunctionExpression() {
          metadata.functions++;
        },
        ArrowFunctionExpression() {
          metadata.functions++;
        },
        ClassDeclaration() {
          metadata.classes++;
        },
        ImportDeclaration() {
          metadata.imports++;
        },
        ExportDefaultDeclaration() {
          metadata.exports++;
        },
        ExportNamedDeclaration() {
          metadata.exports++;
        },
      });
    } else {
      // Basic pattern matching for other languages
      metadata.functions = this.countPatterns(content, [
        /function\s+\w+/g,
        /def\s+\w+/g,
        /\w+\s*\([^)]*\)\s*{/g,
      ]);

      metadata.classes = this.countPatterns(content, [
        /class\s+\w+/g,
        /struct\s+\w+/g,
        /interface\s+\w+/g,
      ]);

      metadata.imports = this.countPatterns(content, [
        /import\s+/g,
        /#include\s+/g,
        /require\s*\(/g,
        /from\s+['"][\w\./]+['"]/g,
      ]);
    }

    return metadata;
  }

  private countPatterns(content: string, patterns: RegExp[]): number {
    return patterns.reduce((count, pattern) => {
      const matches = content.match(pattern);
      return count + (matches ? matches.length : 0);
    }, 0);
  }

  // Utility method to extract specific information from AST
  extractFunctionNames(ast: any, language: string): string[] {
    const functionNames: string[] = [];

    if (language === 'javascript' || language === 'typescript' || language === 'jsx' || language === 'tsx') {
      traverse(ast, {
        FunctionDeclaration(path) {
          if (path.node.id && path.node.id.name) {
            functionNames.push(path.node.id.name);
          }
        },
        FunctionExpression(path) {
          if (path.node.id && path.node.id.name) {
            functionNames.push(path.node.id.name);
          }
        },
      });
    }

    return functionNames;
  }

  extractImports(ast: any, language: string): string[] {
    const imports: string[] = [];

    if (language === 'javascript' || language === 'typescript' || language === 'jsx' || language === 'tsx') {
      traverse(ast, {
        ImportDeclaration(path) {
          if (path.node.source && t.isStringLiteral(path.node.source)) {
            imports.push(path.node.source.value);
          }
        },
      });
    }

    return imports;
  }
} 