const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('metro-config').MetroConfig}
 */
const config = {
  resolver: {
    // Keep 'browser' so Axios can map 'http' adapter dependencies to stub files
    resolverMainFields: ['react-native', 'browser', 'main'],
    resolveRequest(context, moduleName, platform) {
      // Force Zustand to resolve to its CommonJS entry
      if (moduleName === 'zustand') {
        return context.resolveRequest(context, 'zustand/index.js', platform);
      }
      // Force all Firebase client libraries to resolve to unified CommonJS/Native bundles
      // to prevent duplicate ESM/CJS runtime registrations
      if (moduleName === '@firebase/auth' || moduleName === '@firebase/auth/dist/rn') {
        return context.resolveRequest(context, '@firebase/auth/dist/rn/index.js', platform);
      }
      if (moduleName === '@firebase/app') {
        return context.resolveRequest(context, '@firebase/app/dist/index.cjs.js', platform);
      }
      if (moduleName === '@firebase/database') {
        return context.resolveRequest(context, '@firebase/database/dist/index.cjs.js', platform);
      }
      return context.resolveRequest(context, moduleName, platform);
    },
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
