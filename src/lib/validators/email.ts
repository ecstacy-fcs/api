import Joi from "joi";

export const schema = Joi.string()
  .trim()
  .max(64)
  .pattern(/@iiitd.ac.in$/)
  .email({ tlds: { allow: ["ac.in"] } })
  .required();
