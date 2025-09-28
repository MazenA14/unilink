module.exports = {
  resolver: {
    alias: {
      // Reduce Supabase bundle size by excluding unused features
      'cross-fetch': require.resolve('cross-fetch/dist/browser-ponyfill.js'),
    },
  },
};