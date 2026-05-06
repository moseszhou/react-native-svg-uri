import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.tsx'],
  format: ['esm'],
  outExtension: () => ({ js: '.js', dts: '.d.ts' }),
  dts: {
    compilerOptions: {
      ignoreDeprecations: '6.0',
    },
  },
  clean: true,
  external: ['react', 'react-native', 'react-native-svg', 'xmldom'],
});
