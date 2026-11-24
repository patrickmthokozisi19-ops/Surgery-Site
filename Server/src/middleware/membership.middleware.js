
import { createUserClient } from "../config/supabase.js";

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

        if (!memberships || memberships.length === 0) {
            return res.status(403).json({
                message: "You do not have an active hospital membership."
            });
        }

        if (memberships.length > 1) {
            return res.status(409).json({
                message: "Multiple hospital memberships found. Practice selection is required."
            });
        }

        // Get the verified practice information.
        const practiceId = memberships[0].practice_id;

        const { data: practice, error: practiceError } = await userSupabase
            .from("practices")
            .select("timezone")
            .eq("id", practiceId)
            .single();

        if (practiceError || !practice?.timezone) {
            console.error("Practice timezone lookup error:", practiceError);

            return res.status(500).json({
                message: "Could not retrieve the practice timezone."
            });
        }

        // Verify that the timezone is a valid IANA timezone.
        try {
            new Intl.DateTimeFormat("en-US", {
                timeZone: practice.timezone
            });
        } catch {
            return res.status(500).json({
                message: "The practice has an invalid timezone configuration."
            });
        }

        // Attach verified practice information to the request.
        req.practiceId = practiceId;
        req.practiceRole = memberships[0].role;
        req.practiceTimezone = practice.timezone;
        req.userSupabase = userSupabase;

        next();

    } catch (error) {
        console.error("Membership middleware error:", error);

        return res.status(500).json({
            message: "Hospital membership verification failed."
        });
    }
}
