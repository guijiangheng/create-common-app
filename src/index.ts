import _debug from 'debug';
import enquirer from 'enquirer';
import fs from 'fs';
import path from 'path';

import { copyDir, writeJSONFile } from './helper';
import {
  getPeerDependencies,
  installDependencies,
  normalizePackageName,
} from './npm-utils';

const debug = _debug('app:main');

interface Answer {
  packageName: string;
  env: string[];
  typescript: boolean;
  framework: 'none' | 'vite' | 'next';
}

const getDependencies = (answers: Answer) => {
  const { framework, typescript, env } = answers;
  const isReact = ['vite', 'next'].includes(framework);

  const result = [
    [
      isReact && 'react',
      isReact && 'react-dom',
      framework === 'next' && 'next',
    ].filter(Boolean) as string[],
    [
      typescript && 'typescript',
      framework === 'vite' && 'vite',
      framework === 'vite' && '@vitejs/plugin-react',
      (env.includes('node') || framework === 'next') && '@types/node',
      typescript && isReact && '@types/react',
      typescript && isReact && '@types/react-dom',
    ].filter(Boolean) as string[],
  ] as const;

  debug('Dependencies, %O', result[0]);
  debug('Development dependencies, %O', result[1]);

  return result;
};

const getEsLintDevDependencies = (config: any) => {
  const modules: Record<string, string> = {};

  for (const plugin of config.plugins || []) {
    const moduleName = normalizePackageName(plugin as string, 'eslint-plugin');
    modules[moduleName] = 'latest';
  }

  if (config.extends) {
    const extendList = (
      Array.isArray(config.extends) ? config.extends : [config.extends]
    ) as string[];

    for (const extend of extendList) {
      if (extend.startsWith('eslint:') || extend.startsWith('plugin:')) {
        continue;
      }

      const moduleName = normalizePackageName(extend, 'eslint-config');

      modules[moduleName] = 'latest';
      Object.assign(modules, getPeerDependencies(`${moduleName}@latest`));
    }

    if (config.parser) {
      modules[config.parser] = 'latest';
    }
  }

  const result = Object.keys(modules).map((name) => `${name}@${modules[name]}`);

  debug('Eslint development dependencies %O', result);

  return result;
};

const getEslintConfigs = (answers: Answer) => {
  const { framework, typescript, env } = answers;
  const isReact = ['vite', 'next'].includes(framework);

  const config: Record<string, any> = {
    env: {
      es2021: true,
    },
    parserOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
    },
    extends: [],
    plugins: [],
    rules: {
      'no-continue': 'off',
      'no-param-reassign': 'off',
      'no-restricted-syntax': 'off',
      'simple-import-sort/imports': 'error',
      'simple-import-sort/exports': 'error',
      'import/prefer-default-export': 'off',
    },
  };

  if (typescript) {
    config.parser = '@typescript-eslint/parser';
    config.parserOptions.project = './tsconfig.json';
    Object.assign(config.rules, {
      'tsdoc/syntax': 'warn',
      '@typescript-eslint/no-unsafe-member-access': 'off',
    });
  }

  if (isReact) {
    Object.assign(config.rules, {
      'react/self-closing-comp': ['error', { component: true, html: true }],
    });
  }

  if (framework === 'none') {
    env.forEach((item) => {
      config.env[item] = true;
    });
  } else if (framework === 'vite') {
    config.env.browser = true;
  } else if (framework === 'next') {
    config.env.browser = true;
    config.env.node = true;
  }

  config.plugins = [
    typescript && '@typescript-eslint',
    typescript && 'eslint-plugin-tsdoc',
    'import',
    'simple-import-sort',
  ].filter(Boolean);

  config.extends = [
    isReact ? 'airbnb' : 'airbnb/base',
    typescript && (isReact ? 'airbnb-typescript' : 'airbnb-typescript/base'),
    isReact && 'plugin:react/jsx-runtime',
    typescript && 'plugin:@typescript-eslint/recommended',
    typescript &&
      'plugin:@typescript-eslint/recommended-requiring-type-checking',
    framework === 'next' && 'next/core-web-vitals',
    'prettier',
  ].filter(Boolean);

  debug('Eslint configs: %O', config);

  return config;
};

export const createApp = async (answers: Answer) => {
  debug('Create app with answers %O', answers);

  const root = path.resolve(answers.packageName);
  const appName = path.basename(root);

  try {
    await fs.promises.mkdir(root);
  } catch (error: any) {
    if (error.code === 'EEXIST') {
      console.error(`Folder already exists: ${root}`);
      process.exit(1);
    }
  }

  process.chdir(root);

  const template = [
    answers.typescript ? 'typescript' : 'javascript',
    answers.framework === 'none' && 'plain',
    answers.framework === 'vite' && 'react',
    answers.framework === 'next' && 'next',
  ]
    .filter(Boolean)
    .join('-');

  debug('Copy template folder into target folder');
  copyDir(path.resolve(__dirname, 'templates', template), root);
  copyDir(path.resolve(__dirname, 'templates', 'common'), root, {
    rename: (file) =>
      ['gitignore', 'editorconfig', 'eslintignore', 'prettierrc'].includes(file)
        ? '.'.concat(file)
        : file,
  });

  debug('Rename package.json name filed');
  const rawPackageJson = fs.readFileSync(path.resolve(root, 'package.json'), {
    encoding: 'utf8',
  });
  const packageJson = JSON.parse(rawPackageJson) as Record<string, any>;
  packageJson.name = appName;
  writeJSONFile(packageJson, path.resolve(root, 'package.json'));

  debug('Get eslint config and dependencies');
  const config = getEslintConfigs(answers);
  const eslintDevDependencies = getEsLintDevDependencies(config);
  const [dependencies, devDependencies] = getDependencies(answers);

  debug('Write eslintrc.json');
  writeJSONFile(config, path.join(root, '.eslintrc.json'));

  debug('Installing dependencies');
  installDependencies(dependencies);
  installDependencies(devDependencies.concat(eslintDevDependencies), {
    dev: true,
  });
};

enquirer
  .prompt<Answer>([
    {
      type: 'input',
      name: 'packageName',
      message: 'What is your project named?',
      initial: 'my-app',
    },
    {
      type: 'select',
      name: 'framework',
      message: 'Which framework does your project use?',
      choices: [
        { message: 'Vite', name: 'vite' },
        { message: 'Next.js', name: 'next' },
        { message: 'None of these', name: 'none' },
      ],
    },
    {
      type: 'toggle',
      name: 'typescript',
      message: 'Does your project use typescript?',
      enabled: 'Yes',
      disabled: 'No',
      initial: true,
    },
    {
      type: 'multiselect',
      name: 'env',
      message: 'Where does your code run?',
      hint: '(Press <space> to select, <a> to toggle all, <i> to invert selection)',
      choices: [
        { message: 'Browser', name: 'browser' },
        { message: 'Node', name: 'node' },
      ],
    },
  ] as any[])
  .then((answers) => createApp(answers))
  .catch((err) => {
    console.log(err);
  });
