// Setzt alle Challenges auf 0 und leert das Event-Log (z. B. nach dem Testen, vor der LAN-Party).
// Aufruf: npm run reset -- --yes
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createStore } from '../src/db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'data', 'lanparty.db');

if (!process.argv.includes('--yes')) {
  console.log(`Das löscht ALLE Ticks in ${DB_PATH}.`);
  console.log('Zum Bestätigen: npm run reset -- --yes');
  process.exit(1);
}

const store = await createStore(DB_PATH);
await store.reset();
await store.close();
console.log(`✅ Datenbank zurückgesetzt: ${DB_PATH}`);
