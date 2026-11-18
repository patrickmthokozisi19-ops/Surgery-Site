const practiceA = process.env.PRACTICE_DEMO_A_UUID;
const practiceB = process.env.PRACTICE_DEMO_B_UUID;

if (!practiceA) {
  throw new Error("PRACTICE_DEMO_A_UUID is missing from Server/.env");
}

export const practiceIds = {
  A: practiceA,
  B: practiceB || null
};