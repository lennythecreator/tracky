#!/usr/bin/env node
import { run } from './run.js'

// `run` reports failures itself and sets `process.exitCode`.
void run(process.argv.slice(2))
