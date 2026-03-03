import { useAuth as useClerkAuth, useUser } from "@clerk/clerk-expo";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useMemo } from "react";

/**
 * Unified authentication hook that combines Clerk auth state
 * with the Convex user record.
 */
export function useAuth() {
    const { isLoaded: isClerkLoaded, isSignedIn, userId, signOut } = useClerkAuth();
    const { user: clerkUser } = useUser();

    // Fetch the Convex user record using the Clerk UID
    const convexUser = useQuery(
        api.users.getByUid,
        userId ? { uid: userId } : "skip"
    );

    const isLoaded = isClerkLoaded && (convexUser !== undefined || !isSignedIn);

    return useMemo(() => ({
        isLoaded,
        isSignedIn,
        userId,
        clerkUser,
        user: convexUser ?? null,
        signOut,
    }), [isLoaded, isSignedIn, userId, clerkUser, convexUser, signOut]);
}
