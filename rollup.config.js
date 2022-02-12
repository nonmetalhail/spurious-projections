/* eslint-env node */
import ascii from 'rollup-plugin-ascii';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import path from 'path';

export default {
  input: path.resolve(__dirname, 'src/d3_bundle/d3_pkgs.js'),
  plugins: [
    nodeResolve(),
    ascii()
  ],
  output: {
    extend: true,
    file: path.resolve(__dirname, 'src/d3_bundle/dist/spd3.js'),
    format: 'es',
    indent: false,
    name: 'd3'
  }
};