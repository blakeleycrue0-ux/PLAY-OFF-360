import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import importX from 'eslint-plugin-import-x';
import tseslint from 'typescript-eslint';

/**
 * Infraestructura prohibida en los paquetes puros (ADR-005).
 * Esta lista es la que convierte "el dominio es puro" en una regla verificable
 * en vez de una convención que se erosiona.
 */
const FORBIDDEN_IN_PURE_PACKAGES = [
  { group: ['pg', 'pg-*'], message: 'El dominio no puede depender de PostgreSQL (ADR-005).' },
  {
    group: ['fastify', '@fastify/*'],
    message: 'El dominio no puede depender de Fastify (ADR-005).',
  },
  { group: ['ioredis', 'redis'], message: 'El dominio no puede depender de Redis (ADR-005).' },
  {
    group: ['react', 'react-*', 'next', 'next/*', 'expo', 'expo-*', 'react-native'],
    message: 'El dominio no puede depender de la capa de cliente (ADR-005).',
  },
  {
    group: ['node:*', 'fs', 'path', 'os', 'child_process', 'http', 'https', 'net', 'dns'],
    message: 'El dominio no puede usar APIs de Node: debe correr también en el cliente (ADR-005).',
  },
  {
    group: ['@airline/db', '@airline/simulation', '@airline/api', '@airline/worker'],
    message: 'El dominio no puede depender de infraestructura ni de aplicaciones (ADR-005).',
  },
  {
    group: ['dotenv', 'pino', 'zod-to-*'],
    message: 'Dependencia de infraestructura no permitida en un paquete puro (ADR-005).',
  },
];

export default tseslint.config(
  {
    ignores: [
      '**/dist/**',
      '.tsbuild/**',
      '**/node_modules/**',
      '**/*.tsbuildinfo',
      'coverage/**',
      'data/**',
      'apps/web/**',
      'apps/mobile/**',
      // La propia configuración no forma parte del proyecto de TypeScript.
      'eslint.config.js',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        // Un proyecto aparte que sí incluye los tests: los tsconfig de cada
        // paquete los excluyen para no emitirlos, pero el lint con información
        // de tipos necesita verlos.
        project: ['./tsconfig.eslint.json'],
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: { 'import-x': importX },
    settings: {
      'import-x/resolver': {
        typescript: {
          project: [
            './packages/*/tsconfig.json',
            './apps/*/tsconfig.json',
            './scripts/tsconfig.json',
          ],
        },
      },
    },
    rules: {
      // Calidad exigida por el encargo.
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/explicit-module-boundary-types': 'error',
      '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports' }],
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/switch-exhaustiveness-check': 'error',
      '@typescript-eslint/no-unnecessary-condition': 'off',
      '@typescript-eslint/restrict-template-expressions': ['error', { allowNumber: true }],
      'import-x/no-cycle': ['error', { maxDepth: 10 }],
      // TypeScript exige corchetes para las firmas de índice
      // (noPropertyAccessFromIndexSignature); esta regla pide lo contrario.
      '@typescript-eslint/dot-notation': 'off',
      'no-console': 'error',
      complexity: ['error', 18],
      'max-lines-per-function': ['error', { max: 90, skipBlankLines: true, skipComments: true }],
      eqeqeq: ['error', 'always'],
      'no-restricted-syntax': [
        'error',
        {
          selector: "NewExpression[callee.name='Date'][arguments.length=0]",
          message: 'Usa un Clock inyectado en vez de new Date() (ADR-001, ADR-010).',
        },
        {
          selector: "CallExpression[callee.object.name='Date'][callee.property.name='now']",
          message: 'Usa un Clock inyectado en vez de Date.now() (ADR-001, ADR-010).',
        },
        {
          selector: "CallExpression[callee.object.name='Math'][callee.property.name='random']",
          message: 'Usa el RNG determinista sembrado de @airline/shared (ADR-010).',
        },
      ],
    },
  },
  {
    // Los paquetes puros: dominio, primitivas compartidas y parámetros de balance.
    files: ['packages/shared/**/*.ts', 'packages/config/**/*.ts', 'packages/domain/**/*.ts'],
    rules: {
      'no-restricted-imports': ['error', { patterns: FORBIDDEN_IN_PURE_PACKAGES }],
    },
  },
  {
    // Las CLI y los scripts sí escriben por consola: es su interfaz.
    files: [
      '**/cli/**/*.ts',
      'scripts/**/*.ts',
      'scripts/**/*.mjs',
      'apps/*/src/main.ts',
      'apps/worker/src/logger.ts',
    ],
    // Escribir por consola y leer process es el trabajo de una herramienta de
    // línea de comandos, no una fuga.
    languageOptions: { globals: { console: 'readonly', process: 'readonly' } },
    rules: {
      'no-console': 'off',
      'max-lines-per-function': 'off',
      // Una herramienta de línea de comandos mide tiempo real y sella fechas de
      // descarga: ahí el reloj del sistema es lo correcto, no una fuga del
      // dominio.
      'no-restricted-syntax': 'off',
    },
  },
  {
    // Frontera de datos: aquí es donde las filas del driver, que no tienen tipo,
    // se convierten en entidades tipadas. Es el único sitio del repositorio
    // donde se permite tocar valores sin tipar, y está acotado a propósito.
    files: ['packages/db/src/mappers/**/*.ts', 'scripts/export-ui-snapshot.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
    },
  },
  {
    files: ['**/*.test.ts', '**/testing/**/*.ts'],
    rules: {
      'max-lines-per-function': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      'no-restricted-syntax': 'off',
    },
  },
  {
    // La infraestructura sí usa el reloj del sistema: es quien lo implementa.
    files: ['packages/shared/src/time/system-clock.ts', 'packages/db/**/*.ts', 'apps/**/*.ts'],
    rules: { 'no-restricted-syntax': 'off' },
  },
  prettier,
);
