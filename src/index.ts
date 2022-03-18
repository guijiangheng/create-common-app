import enquirer from 'enquirer';
import fs from 'fs';
import path from 'path';

import { copyDir, writeJSONFile } from './helper';
import {
  getPeerDependencies,
  installDevDependencies,
  normalizePackageName,
} from './npm-utils';

interface Answer {
  packageName: string;
  framework: string;
  typescript: boolean;
  env: string[];
}

const getModuleList = (config: any) => {
  const modules: Record<string, string> = {};

  for (const plugin of config.plugins || []) {
    const moduleName = normalizePackageName(plugin, 'eslint-plugin');
    modules[moduleName] = 'latest';
  }

  if (config.extends) {
    const extendList = Array.isArray(config.extends)
      ? config.extends
      : [config.extends];

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

  return Object.keys(modules).map((name) => `${name}@${modules[name]}`);
};

const getEslintConfigs = (answers: Answer) => {
  const config: any = {
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
      'simple-import-sort/imports': 'error',
      'simple-import-sort/exports': 'error',
      'import/prefer-default-export': 'off',
    },
  };

  if (answers.typescript) {
    config.parser = '@typescript-eslint/parser';
    config.parserOptions.project = './tsconfig.json';
  }

  if (answers.framework === 'none') {
    answers.env.forEach((env) => {
      config.env[env] = true;
    });
  } else if (answers.framework === 'react') {
    config.env.browser = true;
  } else if (answers.framework === 'next') {
    config.env.browser = true;
    config.env.node = true;
  }

  config.plugins = [
    answers.typescript && '@typescript-eslint',
    answers.typescript && 'eslint-plugin-tsdoc',
    'import',
    'simple-import-sort',
  ].filter(Boolean);

  if (answers.framework === 'none') {
    config.extends = [
      'airbnb/base',
      answers.typescript && 'airbnb-typescript/base',
      'prettier',
    ].filter(Boolean);
  } else if (answers.framework === 'react') {
    config.extends = [
      'airbnb',
      answers.typescript && 'airbnb-typescript',
      'airbnb/hooks',
      'plugin:@typescript-eslint/recommended',
      'plugin:@typescript-eslint/recommended-requiring-type-checking',
      'prettier',
    ].filter(Boolean);
  } else if (answers.framework === 'next') {
    config.extends = [
      'airbnb',
      answers.typescript && 'airbnb-typescript',
      'airbnb/hooks',
      'plugin:@typescript-eslint/recommended',
      'plugin:@typescript-eslint/recommended-requiring-type-checking',
      'next/core-web-vitals',
      'prettier',
    ].filter(Boolean);
  }

  if (['react', 'next'].includes(answers.framework)) {
    Object.assign(config.rules, {
      'react/self-closing-comp': ['error', { component: true, html: true }],
    });
  }

  return config;
};

export const createApp = async (answers: Answer) => {
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

  const packageJson = {
    name: appName,
    version: '0.1.0',
    private: true,
    scripts: {},
  };

  writeJSONFile(packageJson, path.join(root, 'package.json'));

  const config = getEslintConfigs(answers);
  const modules = getModuleList(config);
  installDevDependencies(modules);

  const template = [
    answers.typescript ? 'typescript' : 'javascript',
    answers.framework === 'none' && 'plain',
    answers.framework === 'react' && 'react',
    answers.framework === 'next' && 'next',
  ]
    .filter(Boolean)
    .join('-');

  copyDir(path.resolve(__dirname, 'templates', template), root);
  copyDir(path.resolve(__dirname, 'templates', 'common'), root, {
    rename: (file) =>
      ['gitignore', 'editorconfig', 'eslintignore', 'prettierrc'].includes(file)
        ? '.'.concat(file)
        : file,
  });

  writeJSONFile(config, path.join(root, '.eslintrc.json'));
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
        { message: 'React', name: 'react' },
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
  ] as any) // Enquirer's ts support is fairly poor, cast as any
  .then((answers) => {
    createApp(answers);
  });
