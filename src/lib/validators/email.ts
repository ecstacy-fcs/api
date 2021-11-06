import Joi from "joi";

export const schema = Joi.string()
  .max(64)
  .email({ tlds: { allow: true } })
  .required();
