import {
  findAllSpecialists,
  findSpecialistById
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