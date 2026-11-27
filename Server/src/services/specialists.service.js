export const findAllSpecialists = async (practiceId, userSupabase) => {
  const { data, error } = await userSupabase
    .from("specialists")
    .select(`
      id,
      user_id,
      full_name,
      specialty,
      credentials,
      created_at
    `)
    .eq("practice_id", practiceId)
    .order("full_name", { ascending: true });

  if (error) {
    console.error("Could not retrieve specialists:", error);
    throw new Error("Could not retrieve specialists.");
  }

  return data;
};