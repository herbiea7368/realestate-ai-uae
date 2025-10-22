import fs from 'fs';
import child from 'child_process';

child.execSync(
  'npx typedoc --tsconfig services/api/tsconfig.json --entryPointStrategy expand --out docs/services services/api/src',
  { stdio: 'inherit' }
);

fs.writeFileSync(
  'README.md',
  `# RealEstate AI Platform

## Overview
Full-stack AI real estate platform with:
- NLP property generation
- Semantic search
- Multi-tenant management
- Chat assistant
- Observability and self-healing

## Deployment
\`\`\`bash
docker compose up -d
\`\`\`

## API Reference
See /docs/services
`
);

console.log('Validated: Documentation generated.');
