import Joi from "joi";

/**
 * At least 1 lower case letter
 * At least 1 upper case letter
 * At least 1 digit
 * At least 1 special character
 * Minimum length: 12
 * Maximum length: 22
 */
const PASSWORD_REGEX =
  /^(?=[^A-Z\s]*[A-Z])(?=[^a-z\s]*[a-z])(?=[^\d\s]*\d)(?=\w*[\W_])\S{12,22}$/;

export const schema = Joi.string().trim().pattern(PASSWORD_REGEX).required();
