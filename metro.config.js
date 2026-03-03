const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const config = getDefaultConfig(__dirname);

// Follow symlinks — needed for the convex/ symlink to ../raceday-next/convex
config.resolver.unstable_enableSymlinks = true;

// Redirect convex/server to a local mock since it's used in shared code 
// but not available (and not needed) in the mobile client.
config.resolver.resolveRequest = (context, moduleName, platform) => {
    if (moduleName === "convex/server") {
        return {
            filePath: path.resolve(__dirname, "lib/mocks/convex-server.ts"),
            type: "sourceFile",
        };
    }
    // Default resolver
    return context.resolveRequest(context, moduleName, platform);
};

// Also watch the symlink target for changes
config.watchFolders = [
    path.resolve(__dirname, "../raceday-next/convex"),
];

module.exports = config;
