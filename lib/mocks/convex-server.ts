// Mock convex/server for mobile bundling
// This is needed because some generated code imports from convex/server
// which is not available (and not needed) on the mobile client.

// Mock convex/server for mobile bundling
// This is needed because some generated code imports from convex/server
// which is not available (and not needed) on the mobile client.

const proxyCache = new Map<string, any>();

const functionNameSymbol = Symbol.for("functionName");

const createProxy = (path: string[] = []): any => {
    const cacheKey = path.join(".");
    if (proxyCache.has(cacheKey)) {
        return proxyCache.get(cacheKey);
    }

    // Function references in Convex need to handle Symbol.for("functionName")
    // to return their path string.
    const target = () => { };
    const pathString = path.join(":");
    (target as any)._path = pathString;
    (target as any)._type = "query";
    (target as any).toString = () => pathString;

    const proxy = new Proxy(target, {
        get: (target, prop) => {
            if (prop === functionNameSymbol) {
                // Return the formatted path like Convex's real anyApi
                // Note: Convex real anyApi uses slash for modules, but raceday seems to expect colon or default
                // Let's stick with the colon logic if it matches what's expected.
                if (path.length < 2) return path.join("/");
                const mod = path.slice(0, -1).join("/");
                const func = path[path.length - 1];
                return mod + ":" + func;
            }
            if (prop === Symbol.toStringTag) return "FunctionReference";
            if (prop === "_path") return (target as any)._path;
            if (prop === "_type") return (target as any)._type;
            if (prop === "toString") return (target as any).toString;

            if (typeof prop === "string") {
                return createProxy([...path, prop]);
            }
            return (target as any)[prop];
        }
    });

    proxyCache.set(cacheKey, proxy);
    return proxy;
};

export const anyApi = createProxy();
export const componentsGeneric = () => ({});
export const internalApi = createProxy();
export const queryGeneric = () => ({});
export const mutationGeneric = () => ({});
export const actionGeneric = () => ({});
export const httpRouter = () => ({});
