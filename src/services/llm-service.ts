import axios, { AxiosInstance } from 'axios';

export interface LlmRequest {
  prompt: string;
  maxTokens?: number;
  temperature?: number;
  model?: string;
}

export interface LlmResponse {
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export class LlmService {
  private client: AxiosInstance;
  private apiKey: string;
  private endpoint: string;

  constructor(endpoint: string, apiKey: string) {
    this.endpoint = endpoint;
    this.apiKey = apiKey;
    this.client = axios.create({
      baseURL: endpoint,
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });
  }

  async sendRequest(request: LlmRequest): Promise<LlmResponse> {
    try {
      const response = await this.client.post('/chat/completions', {
        model: request.model || 'gpt-4o',
        messages: [
          {
            role: 'user',
            content: request.prompt,
          },
        ],
        max_tokens: request.maxTokens || 5000,
        temperature: request.temperature || 0.1,
      });

      return {
        content: response.data.choices[0].message.content,
        usage: {
          promptTokens: response.data.usage?.prompt_tokens || 0,
          completionTokens: response.data.usage?.completion_tokens || 0,
          totalTokens: response.data.usage?.total_tokens || 0,
        },
      };
    } catch (error: any) {
      throw new Error(`LLM API request failed: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  async analyzeCves(filePath: string, fileContent: string): Promise<string> {
    const prompt = `
Analyze the following code file for potential security vulnerabilities (CVEs) and modernization opportunities:

File: ${filePath}
Content:
\`\`\`
${fileContent}
\`\`\`

Please provide:
1. Identified security vulnerabilities with CVE references if applicable
2. Severity level (Critical, High, Medium, Low)
3. Line numbers where issues occur
4. Specific recommendations for fixing each vulnerability
5. Suggested modern alternatives or libraries

Format your response as a JSON object with the following structure:
{
  "vulnerabilities": [
    {
      "type": "vulnerability_type",
      "severity": "High|Medium|Low|Critical",
      "lineNumber": number,
      "description": "detailed description",
      "cveId": "CVE-XXXX-XXXX or null",
      "recommendation": "specific fix recommendation"
    }
  ]
}
`;

    const response = await this.sendRequest({
      prompt,
      maxTokens: 2000,
      temperature: 0.1,
    });

    return response.content;
  }

  async assessCloudReadiness(filePath: string, fileContent: string, cloudProvider: string): Promise<string> {
    const providerSpecific = cloudProvider === 'atlas' 
      ? 'MongoDB Atlas deployment' 
      : `${cloudProvider.toUpperCase()} cloud deployment`;
    
    const atlasSpecificCriteria = cloudProvider === 'atlas' 
      ? `
9. MongoDB Atlas compatibility (connection strings, drivers)
10. Atlas App Services integration potential
11. Atlas Search and Analytics readiness
12. Atlas Device Sync considerations` 
      : '';

    const prompt = `
Assess the following code file for cloud deployment readiness on ${providerSpecific}:

File: ${filePath}
Content:
\`\`\`
${fileContent}
\`\`\`

Please evaluate:
1. Cloud-native patterns usage
2. Configuration management (environment variables, secrets)
3. Logging and monitoring readiness
4. Scalability considerations
5. Container/serverless compatibility
6. Database and storage patterns
7. Security best practices for cloud
8. CI/CD readiness${atlasSpecificCriteria}

Provide a readiness score (0-10) and specific recommendations.

Format your response as a JSON object:
{
  "readinessScore": number,
  "issues": [
    {
      "category": "category_name",
      "severity": "High|Medium|Low",
      "description": "issue description",
      "recommendation": "specific recommendation"
    }
  ],
  "strengths": ["list of cloud-ready aspects"],
  "recommendations": ["overall recommendations for improvement"]
}
`;

    const response = await this.sendRequest({
      prompt,
      maxTokens: 2000,
      temperature: 0.1,
    });

    return response.content;
  }
} 