import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function seed() {
  console.log('Starting database seed...');

  // Read config files
  const configDir = path.join(process.cwd(), 'config');
  const dimensionsData = JSON.parse(fs.readFileSync(path.join(configDir, 'dimensions.json'), 'utf-8'));
  const questionsData = JSON.parse(fs.readFileSync(path.join(configDir, 'questions.json'), 'utf-8'));
  const levelsData = JSON.parse(fs.readFileSync(path.join(configDir, 'levels.json'), 'utf-8'));
  const scoringRulesData = JSON.parse(fs.readFileSync(path.join(configDir, 'scoring-rules.json'), 'utf-8'));

  // 1. Insert dimensions
  console.log('Inserting dimensions...');
  const dimensions = dimensionsData.dimensions.map((d: any) => ({
    id: d.id,
    order: d.order,
    section: d.section,
    short_label: d.short_label,
    name: d.name,
    description: d.description,
    icon: d.icon,
    weight: d.weight ?? 1,
  }));

  const { error: dimError } = await supabase
    .from('dimensions')
    .upsert(dimensions, { onConflict: 'id' });

  if (dimError) {
    console.error('Error inserting dimensions:', dimError);
    throw dimError;
  }
  console.log(`Inserted ${dimensions.length} dimensions`);

  // 2. Insert questions (without options first)
  console.log('Inserting questions...');
  const questions = questionsData.questions.map((q: any) => ({
    id: q.id,
    order: q.order,
    prompt: q.prompt,
    dimension_id: q.dimension_id,
  }));

  const { error: qError } = await supabase
    .from('questions')
    .upsert(questions, { onConflict: 'id' });

  if (qError) {
    console.error('Error inserting questions:', qError);
    throw qError;
  }
  console.log(`Inserted ${questions.length} questions`);

  // 3. Insert options
  console.log('Inserting options...');
  const options: any[] = [];
  for (const q of questionsData.questions) {
    for (let i = 0; i < q.options.length; i++) {
      const opt = q.options[i];
      options.push({
        id: opt.id,
        question_id: q.id,
        order: i + 1,
        label: opt.label,
        score: opt.score,
      });
    }
  }

  const { error: optError } = await supabase
    .from('options')
    .upsert(options, { onConflict: 'id' });

  if (optError) {
    console.error('Error inserting options:', optError);
    throw optError;
  }
  console.log(`Inserted ${options.length} options`);

  // 4. Insert levels config into app_settings
  console.log('Inserting levels config...');
  const { error: settingsError } = await supabase
    .from('app_settings')
    .upsert({ key: 'levels', value: levelsData }, { onConflict: 'key' });

  if (settingsError) {
    console.error('Error inserting app_settings:', settingsError);
    throw settingsError;
  }
  console.log('Inserted levels config');

  // 5. Insert scoring rules config into app_settings
  console.log('Inserting scoring rules config...');
  const { error: rulesError } = await supabase
    .from('app_settings')
    .upsert({ key: 'scoring_rules', value: scoringRulesData }, { onConflict: 'key' });

  if (rulesError) {
    console.error('Error inserting scoring_rules:', rulesError);
    throw rulesError;
  }
  console.log('Inserted scoring rules config');

  console.log('Seed completed successfully!');
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
