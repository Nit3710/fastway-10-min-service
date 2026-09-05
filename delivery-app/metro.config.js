const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('metro-config').MetroConfig}
 */
// Keep Zustand on its CommonJS entry; its ESM build uses import.meta.env,
// which Metro cannot evaluate in React Native.
const config = {
  resolver: {
    resolveRequest(context, moduleName, platform) {
      if (moduleName === 'zustand') {
        return context.resolveRequest(context, 'zustand/index.js', platform);
      }
      return context.resolveRequest(context, moduleName, platform);
    },
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
