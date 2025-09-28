module.exports = {
  presets: ['babel-preset-expo'],
  plugins: [
    ['transform-remove-console', { exclude: ['error', 'warn'] }],
  ],
};