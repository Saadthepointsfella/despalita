// scripts/validate-config.ts
import fs from 'node:fs';
import path from 'node:path';
import Ajv from 'ajv';

type Json = Record<string, unknown>;

function readJson(p: string): unknown {
  return JSON.parse(fs.readFileSync(p, 'utf-8'));
}

function main() {
  const root = process.cwd();
  const configDir = path.join(root, 'src', 'config');
  const schemasDir = path.join(configDir, 'schemas');
  const examplesDir = path.join(configDir, 'examples');

  const ajv = new Ajv({ allErrors: true, strict: true });

  const files: Array<{ file: string; schema: string }> = [
    { file: 'tokens.json', schema: 'tokens.schema.json' },
    { file: 'dimensions.json', schema: 'dimensions.schema.json' },
    { file: 'questions.json', schema: 'questions.schema.json' },
    { file: 'levels.json', schema: 'levels.schema.json' },
    { file: 'scoring-rules.json', schema: 'scoring-rules.schema.json' },
    { file: 'roadmap-modules.json', schema: 'roadmap-modules.schema.json' },
    // examples
    { file: path.join('examples', 'answers_example.json'), schema: 'answers_example.schema.json' },
    { file: path.join('examples', 'expected_scoring_output.json'), schema: 'expected_scoring_output.schema.json' },
  ];

  for (const { file, schema } of files) {
    const dataPath = path.join(configDir, file);
    const schemaPath = path.join(schemasDir, schema);

    const data = readJson(dataPath);
    const sch = readJson(schemaPath) as Json;

    const validate = ajv.compile(sch);
    const ok = validate(data);

    if (!ok) {
      console.error(`❌ Config validation failed: ${file}`);
      console.error(JSON.stringify(validate.errors, null, 2));
      process.exit(1);
    }

    console.log(`✅ ${file}`);
  }

  console.log('✅ All config files validated.');
}

main();
