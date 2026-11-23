import {
    findAllSpecialists
  } from "../services/specialists.service.js";
  
  export const getSpecialists = async (req, res, next) => {
    try {
      const specialists = await findAllSpecialists(
        req.practiceId,
        req.userSupabase
      );
  
      res.status(200).json(specialists);
    } catch (error) {
      next(error);
    }
  };