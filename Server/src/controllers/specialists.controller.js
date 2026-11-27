import {
  findAllSpecialists,
  findSpecialistById,
  updateSpecialist
} from "../services/specialists.service.js";

const handle = (callback) => async (req, res, next) => {
  try {
    await callback(req, res, next);
  } catch (error) {
    next(error);
  }
};

// GET all specialists belonging to the current practice.
export const getSpecialists = handle(async (req, res) => {
  const specialists = await findAllSpecialists(
    req.practiceId,
    req.userSupabase
  );

  res.status(200).json(specialists);
});

// GET one specialist by database UUID.
export const getSpecialistById = handle(async (req, res) => {
  const specialist = await findSpecialistById(
    req.params.id,
    req.practiceId,
    req.userSupabase
  );

  if (!specialist) {
    return res.status(404).json({
      message: "Specialist not found."
    });
  }

  res.status(200).json(specialist);
});
// PATCH one specialist's professional profile.
export const editSpecialist = handle(async (req, res) => {
  const {
    fullName,
    specialty,
    credentials
  } = req.body;

  if (typeof fullName !== "string" || !fullName.trim()) {
    return res.status(400).json({
      message: "A valid specialist name is required."
    });
  }

  if (
    credentials !== undefined &&
    (typeof credentials !== "object" ||
      credentials === null ||
      Array.isArray(credentials))
  ) {
    return res.status(400).json({
      message: "Credentials must be a valid object."
    });
  }

  const existingSpecialist = await findSpecialistById(
    req.params.id,
    req.practiceId,
    req.userSupabase
  );

  if (!existingSpecialist) {
    return res.status(404).json({
      message: "Specialist not found."
    });
  }

  const updatedSpecialist = await updateSpecialist({
    id: req.params.id,
    practiceId: req.practiceId,
    fullName: fullName.trim(),
    specialty: typeof specialty === "string" ? specialty.trim() || null : existingSpecialist.specialty,
    credentials: credentials ?? existingSpecialist.credentials,
    userSupabase: req.userSupabase
  });

  if (!updatedSpecialist) {
    return res.status(404).json({
      message: "Specialist not found."
    });
  }

  res.status(200).json({
    message: "Specialist profile updated successfully.",
    specialist: updatedSpecialist
  });
});