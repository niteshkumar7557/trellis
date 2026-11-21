// Metro is React Native's bundler (docs/mobile.md §2). Expo's defaults are kept; one thing
// is added.
//
// Metro only bundles files inside the folders it watches, and by default that's this
// project (mobile/). The domain code the app reuses lives OUTSIDE it, in ../shared, and the
// brand mark in ../frontend/components/brand. Expo's automatic monorepo support only finds
// npm-workspace packages, and shared/ isn't one (it has no package.json, on purpose: the
// frontend and backend import it by path too). So the two folders are watched by hand.
// Imports still use the "@shared/*" alias from tsconfig.json, which Expo's Metro reads.

const path = require("node:path");
const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

config.watchFolders = [
  ...(config.watchFolders ?? []),
  path.resolve(__dirname, "../shared"),
  path.resolve(__dirname, "../frontend/components/brand"),
  // usage.ts: the words for the AI allowance, so the app says what the site says.
  path.resolve(__dirname, "../frontend/lib"),
];

// Babel adds helper imports (like @babel/runtime) to every file it compiles, ../shared's
// too. Looking those up from ../shared climbs to the repo root, where there is no
// node_modules; this tells Metro to also look in mobile/node_modules.
config.resolver.nodeModulesPaths = [path.resolve(__dirname, "node_modules")];

module.exports = config;
