
import { supabase } from "../config/supabase.js";

export async function requireAuth(req, res, next) {
  // 1. Get the Authorization header.
  const authHeader = req.headers.authorization;

  // 2. Check whether the user supplied a token.
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      message: "Authentication required."
    });
  }

  // 3. Extract the access token.
  const token = authHeader.slice(7).trim();

  try {
    // 4. Ask Supabase to verify the token.
    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data.user) {
      return res.status(401).json({
        message: "Invalid or expired access token."
      });
    }

    // 5. Attach the verified user to the request.
    req.user = data.user;
    req.accessToken = token;

    // 6. Continue to the next middleware or route.
    next();

  } catch (error) {
    return res.status(500).json({
      message: "Authentication could not be verified."
    });
  }
}