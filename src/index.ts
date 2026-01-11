#!/usr/bin/env node

import { program } from 'commander';
import { readFileSync } from 'fs';
import { classifyEvidence, generateSummary } from './classifier.js';

program
  .name('evidence-classifier')
  .description('Classify study evidence quality using causal inference best practices')
  .version('1.0.0');

program
  .option('-f, --file <path>', 'Path to text file containing study abstract/excerpt')
  .option('-t, --text <text>', 'Study abstract/excerpt as a string')
  .option('-j, --json-only', 'Output only JSON (no summary)')
  .option('-s, --summary-only', 'Output only human-readable summary (no JSON)')
  .option('-p, --pretty', 'Pretty-print JSON output');

program.parse();

const options = program.opts();

// Get input text
let inputText: string;

if (options.file) {
  try {
    inputText = readFileSync(options.file, 'utf-8');
  } catch (error) {
    console.error(`Error reading file: ${options.file}`);
    process.exit(1);
  }
} else if (options.text) {
  inputText = options.text;
} else {
  // Read from stdin if available
  const stdin = readFileSync(0, 'utf-8').trim();
  if (stdin) {
    inputText = stdin;
  } else {
    console.error('Error: No input provided. Use --file, --text, or pipe text to stdin.');
    console.error('');
    console.error('Usage:');
    console.error('  evidence-classifier --file study.txt');
    console.error('  evidence-classifier --text "Abstract text here..."');
    console.error('  cat study.txt | evidence-classifier');
    process.exit(1);
  }
}

// Validate input
if (!inputText || inputText.trim().length < 50) {
  console.error('Error: Input text too short. Please provide a study abstract or excerpt (min 50 characters).');
  process.exit(1);
}

// Classify
const result = classifyEvidence(inputText);

// Output
if (options.summaryOnly) {
  console.log(generateSummary(result));
} else if (options.jsonOnly) {
  console.log(options.pretty ? JSON.stringify(result, null, 2) : JSON.stringify(result));
} else {
  // Default: both summary and JSON
  console.log(generateSummary(result));
  console.log('');
  console.log('───────────────────────────────────────────────────────────────');
  console.log('  FULL JSON OUTPUT');
  console.log('───────────────────────────────────────────────────────────────');
  console.log(JSON.stringify(result, null, 2));
}
