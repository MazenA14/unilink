module.exports = function (api) {
  api.cache(true);
  const isProd = process.env.NODE_ENV === 'production';

  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // keep worklets plugin first (replaces reanimated plugin in v4)
      'react-native-worklets/plugin',
      // strip console.* calls in production to reduce bundle size
      isProd && [
        'transform-remove-console',
        { exclude: ['error', 'warn'] },
      ],
    ].filter(Boolean),
  };
};