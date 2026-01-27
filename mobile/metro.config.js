const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const config = getDefaultConfig(projectRoot);

// Prevent Metro from looking in parent directories for node_modules
// This stops it from finding packages like mongodb, bcryptjs, etc. that use Node.js crypto
config.watchFolders = [projectRoot];

// Only resolve from the mobile project's node_modules
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
];

// Block the parent directory from being watched
config.resolver.blockList = [
  // Block parent node_modules
  new RegExp(`${path.resolve(projectRoot, '..', 'node_modules').replace(/[/\\]/g, '[/\\\\]')}.*`),
  // Block parent app directory
  new RegExp(`${path.resolve(projectRoot, '..', 'app').replace(/[/\\]/g, '[/\\\\]')}.*`),
  // Block parent lib directory
  new RegExp(`${path.resolve(projectRoot, '..', 'lib').replace(/[/\\]/g, '[/\\\\]')}.*`),
];

module.exports = config;
