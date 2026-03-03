import { api } from "@/convex/_generated/api";
import { useUser } from "@clerk/clerk-expo";
import { useQuery } from "convex/react";
import { useMemo } from "react";

/**
 * Resolves the Clerk user to the Convex user record.
 * Returns the full Convex user (with _id, role, displayName, etc.)
 */
export function useCurrentUser() {
    const { user: clerkUser, isLoaded: isClerkLoaded } = useUser();

    const convexUser = useQuery(
        api.users.getByUid,
        clerkUser?.id ? { uid: clerkUser.id } : "skip"
    );

    return useMemo(() => ({
        user: convexUser ?? null,
        clerkUser: clerkUser ?? null,
        isLoaded: isClerkLoaded && (convexUser !== undefined || !clerkUser),
        isSignedIn: !!clerkUser,
    }), [convexUser, clerkUser, isClerkLoaded]);
}
