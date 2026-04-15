// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');
const { withNativewind } = require('nativewind/metro');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '..');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(projectRoot);

// 1. Permitir que o Metro encontre pacotes no root do workspace
config.watchFolders = [projectRoot, workspaceRoot];

config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

// 2. Habilitar lookup hierárquico
config.resolver.disableHierarchicalLookup = false;

// 3. Excluir arquivos gigantes que causam crash no Metro
config.resolver.blockList = [
  /.*\.zip/,
  /.*\.tar/,
  /.*\.tar\.gz/,
  /.*\.iso/,
  /backend-api\/uploads\/.*/,
];

module.exports = withNativewind(config, {
  inlineVariables: false,
  globalClassNamePolyfill: false,
});
