import { config } from 'dotenv';
import { seedDatabase } from '../src/setup.js';

config();

seedDatabase()
  .then(() => {
    console.log('Seed data inserted successfully.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Failed to seed database:', error);
    process.exit(1);
  });
