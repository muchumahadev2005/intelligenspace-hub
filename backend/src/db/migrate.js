import 'dotenv/config';
import { query } from './client.js';
import { schema } from './schema.js';

import { seedTemplates } from './seed-templates.js';

async function migrate() {
  console.log('🔄 Running database migrations...');
  try {
    await query(schema);
    console.log('✅ All tables created successfully.');
    await seedTemplates();
    process.exit(0);
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
  }
}

migrate();
