"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createApp = void 0;
const enquirer_1 = __importDefault(require("enquirer"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const helper_1 = require("./helper");
const npm_utils_1 = require("./npm-utils");
const getModuleList = (config) => {
    const modules = {};
    for (const plugin of config.plugins || []) {
        const moduleName = (0, npm_utils_1.normalizePackageName)(plugin, 'eslint-plugin');
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
            const moduleName = (0, npm_utils_1.normalizePackageName)(extend, 'eslint-config');
            modules[moduleName] = 'latest';
            Object.assign(modules, (0, npm_utils_1.getPeerDependencies)(`${moduleName}@latest`));
        }
        if (config.parser) {
            modules[config.parser] = 'latest';
        }
    }
    return Object.keys(modules).map((name) => `${name}@${modules[name]}`);
};
const getEslintConfigs = (answers) => {
    const config = {
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
    }
    else if (answers.framework === 'react') {
        config.env.browser = true;
    }
    else if (answers.framework === 'next') {
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
    }
    else if (answers.framework === 'react') {
        config.extends = [
            'airbnb',
            answers.typescript && 'airbnb-typescript',
            'airbnb/hooks',
            'plugin:@typescript-eslint/recommended',
            'plugin:@typescript-eslint/recommended-requiring-type-checking',
            'prettier',
        ].filter(Boolean);
    }
    else if (answers.framework === 'next') {
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
const createApp = async (answers) => {
    const root = path_1.default.resolve(answers.packageName);
    const appName = path_1.default.basename(root);
    if (!(await (0, helper_1.isWriteable)(path_1.default.dirname(root)))) {
        console.error('The application path is not writable, please check folder permissions and try again.');
        process.exit(1);
    }
    try {
        await fs_1.default.promises.mkdir(root);
    }
    catch (error) {
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
    (0, helper_1.writeJSONFile)(packageJson, path_1.default.join(root, 'package.json'));
    const config = getEslintConfigs(answers);
    const modules = getModuleList(config);
    (0, npm_utils_1.installDevDependencies)(modules);
    const template = [
        answers.typescript ? 'typescript' : 'javascript',
        answers.framework === 'none' && 'plain',
        answers.framework === 'react' && 'react',
        answers.framework === 'next' && 'next',
    ]
        .filter(Boolean)
        .join('-');
    (0, helper_1.copyDir)(path_1.default.resolve(__dirname, 'templates', template), root);
    (0, helper_1.copyDir)(path_1.default.resolve(__dirname, 'templates', 'common'), root, {
        rename: (file) => ['gitignore', 'editorconfig', 'eslintignore', 'prettierrc'].includes(file)
            ? '.'.concat(file)
            : file,
    });
    (0, helper_1.writeJSONFile)(config, path_1.default.join(root, '.eslintrc.json'));
};
exports.createApp = createApp;
enquirer_1.default
    .prompt([
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
]) // Enquirer's ts support is fairly poor, cast as any
    .then((answers) => {
    (0, exports.createApp)(answers);
});
