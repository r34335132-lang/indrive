const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// El panel web (admin-web/) es un proyecto aparte con sus propias dependencias.
const adminWeb = path.resolve(__dirname, 'admin-web').replace(/[/\\]/g, '[/\\\\]');
config.resolver.blockList = [
  ...[].concat(config.resolver.blockList ?? []),
  new RegExp(`${adminWeb}[/\\\\].*`),
];

module.exports = config;
