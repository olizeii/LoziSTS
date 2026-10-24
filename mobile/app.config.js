// Ergänzt app.json: Beim Web-Export für den Server (npm run export:web) läuft die Browser-Version unter /app.
// Expo Go und der normale Dev-Server bleiben davon unberührt.
module.exports = ({ config }) => ({
  ...config,
  experiments: {
    ...config.experiments,
    ...(process.env.EXPO_BASE_URL ? { baseUrl: process.env.EXPO_BASE_URL } : {}),
  },
});
