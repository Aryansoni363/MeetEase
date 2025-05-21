// babel.config.cjs
module.exports = {
  presets: [
    [
      '@babel/preset-env',
      {
        targets: { node: 'current' } // Transpile code for the current Node version
      }
    ]
  ]
};