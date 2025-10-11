import { config } from 'dotenv';
import { applySchema } from '../src/setup.js';

config();

applySchema()
  .then(() => {
    console.log('Schema applied successfully.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Failed to apply schema:', error);
    process.exit(1);
  });
