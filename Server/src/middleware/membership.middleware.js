
import { createUserClient } from "../config/supabase.js";

/*One design detail: A user may eventually belong to more than one hospital. For now, this middleware deliberately stops when it 
       finds multiple active memberships. Later we'll build hospital selection rather than arbitrarily choosing one.*/
export async function requirePracticeMembership(req, res, next) {
    try {
        // Create a Supabase client using the signed-in user's token.
        const userSupabase = createUserClient(req.accessToken);

        // Find this user's active hospital memberships.
        const { data: memberships, error } = await userSupabase
            .from("practice_memberships")
            .select("practice_id, role, active")
            .eq("user_id", req.user.id)
            .eq("active", true)
            .limit(2);

        if (error) {
            console.error("Membership lookup error:", error);

            return res.status(500).json({
                message: "Could not verify hospital membership."
            });
        }

        // The user must belong to an active hospital.
        if (!memberships || memberships.length === 0) {
            return res.status(403).json({
                message: "You do not have an active hospital membership."
            });
        }

        // For now, require exactly one active membership.
        if (memberships.length > 1) {
            return res.status(409).json({
                message: "Multiple hospital memberships found. Practice selection is required."
            });
        }

   // Attach the verified membership information to the request.
req.practiceId = memberships[0].practice_id;
req.practiceRole = memberships[0].role;

// Make the authenticated Supabase client available
// to the appointment and patient services.
req.userSupabase = userSupabase;

next();

    } catch (error) {
        console.error("Membership middleware error:", error);

        return res.status(500).json({
            message: "Hospital membership verification failed."
        });
    }
}
