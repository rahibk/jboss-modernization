#!/usr/bin/env node

// Load environment variables from .env file
import * as dotenv from 'dotenv';
dotenv.config();

import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import chalk from 'chalk';
import { cveCommand } from './commands/cve';
import { architectCommand } from './commands/architect';
import { cloudReadinessCommand } from './commands/cloud-readiness';

async function main() {
  const argv = await yargs(hideBin(process.argv))
    .scriptName('modernization-toolset')
    .usage('Usage: $0 <command> [options]')
    .command(cveCommand)
    .command(architectCommand)
    .command(cloudReadinessCommand)
    .demandCommand(1, 'You need to specify a command')
    .help('h')
    .alias('h', 'help')
    .version('1.0.0')
    .example('$0 cve --path ./src --llm-endpoint https://api.openai.com/v1', 'Analyze CVEs in the src directory')
    .example('$0 ast --path ./src --output ./ast-output.json', 'Generate AST for files in src directory')
    .example('$0 cloud-readiness --path ./src', 'Assess cloud readiness of the codebase')
    .epilogue('For more information, visit: https://github.com/your-org/modernization-toolset')
    .argv;
}

main().catch((error) => {
  console.error(chalk.red('Error:'), error.message);
  process.exit(1);
}); 