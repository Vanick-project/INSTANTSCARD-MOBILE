// Dev: reads mobile/.env.local. EAS cloud builds use env in eas.json (preview profile).
require('dotenv').config({ path: '.env.local' });

const appJson = require('./app.json').expo;

/** @type {import('@expo/config').ExpoConfig} */
module.exports = ({ config }) => ({
  ...appJson,
  ...config,
  extra: {
    ...appJson.extra,
    ...config?.extra,
  },
});
