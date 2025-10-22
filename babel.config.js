module.exports = function (api) {
  api.cache(true);
  const isProd = process.env.NODE_ENV === 'production';

  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // strip console.* calls in production to reduce bundle size
      isProd && [
        'transform-remove-console',
        { exclude: ['error', 'warn'] },
      ],
    ].filter(Boolean),
  };
};