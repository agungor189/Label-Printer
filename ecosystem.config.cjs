module.exports = {
  apps: [
    {
      name: 'label-printer',
      script: 'server.mjs',
      cwd: __dirname,
      env: {
        NODE_ENV: 'production',
        PORT: process.env.PORT || 3000,
        DATA_DIR: process.env.DATA_DIR || './data',
        STATE_FILE: process.env.STATE_FILE || 'app-state.json',
      },
    },
  ],
};
