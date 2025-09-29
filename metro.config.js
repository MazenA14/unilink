// @ts-check
const { getDefaultConfig } = require('expo/metro-config');

/**
 * Metro configuration with smaller bundle output:
 * - Use terser for better minification
 * - Enable inline requires to reduce startup time
 */
module.exports = (async () => {
  const baseConfig = await getDefaultConfig(__dirname);

  return {
    ...baseConfig,
    transformer: {
      ...baseConfig.transformer,
      minifierPath: 'metro-minify-terser',
      minifierConfig: {
        ecma: 2020,
        keep_classnames: false,
        keep_fnames: false,
        module: true,
        mangle: {
          safari10: true,
        },
        compress: {
          // Remove console.* in production-like builds for safety; babel already strips most
          drop_console: true,
          drop_debugger: true,
          passes: 2,
          pure_getters: true,
          unsafe: false,
        },
        output: {
          comments: false,
        },
      },
      unstable_allowRequireContext: true,
      inlineRequires: true,
    },
  };
})();