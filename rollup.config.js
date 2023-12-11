const typescript = require('@rollup/plugin-typescript');

module.exports = {
  input: './lib/index.ts',
  output: [
    { format: 'cjs', entryFileNames: '[name].js', dir: './lib', preserveModules: true, sourcemap: 'inline' },
    { format: 'es', entryFileNames: '[name].mjs', dir: './lib', preserveModules: true, sourcemap: 'inline' },
  ],
  plugins: [typescript({ tsconfig: './tsconfig.build.json' })],
};
