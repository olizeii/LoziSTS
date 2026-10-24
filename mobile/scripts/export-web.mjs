// Baut die Browser-Version der App (für iPhone & Co.) nach dist-web/.
// Das Backend liefert sie dann unter http://<server>:3000/app aus.
// Aufruf: npm run export:web
import { spawnSync } from 'node:child_process';

const result = spawnSync('npx', ['expo', 'export', '--platform', 'web', '--output-dir', 'dist-web', '--clear'], {
  stdio: 'inherit',
  shell: true,
  env: {
    ...process.env,
    EXPO_BASE_URL: '/app',
    // Leer = die Browser-Version verbindet sich mit dem Server, von dem sie geladen wurde
    EXPO_PUBLIC_SERVER_IP: '',
  },
});

process.exit(result.status ?? 1);
