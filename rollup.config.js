import typescript from '@rollup/plugin-typescript';
import commonjs from '@rollup/plugin-commonjs';
import resolve from '@rollup/plugin-node-resolve';

export default {
  input: 'src/index.ts',
  output: {
    file: 'dist/index.js',
    format: 'cjs',
    sourcemap: true
  },
  plugins: [
    resolve(),
    commonjs(),
    typescript()
  ],
  external: ['express', 'cors', 'body-parser', 'dotenv', 'pg', 'bcrypt', 'jsonwebtoken', 'nodemailer', 'imap-simple', 'mailparser', 'axios', 'cheerio', 'trafilatura', 'openai', '@sentry/node', 'winston', 'socket.io']
};
