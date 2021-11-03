// reference: https://github.com/manishsaraan/email-validator/blob/master/index.js

const EMAIL_REGEX =
  /^[-!#$%&'*+\/0-9=?A-Z^_a-z`{|}~](\.?[-!#$%&'*+\/0-9=?A-Z^_a-z`{|}~])*@[a-zA-Z0-9](-*\.?[a-zA-Z0-9])*\.[a-zA-Z](-?[a-zA-Z0-9])+$/;

export const validate = (email: string): boolean => {
  if (!email) return false;

  const emailParts = email.split("@");
  if (emailParts.length !== 2) return false;

  const [account, address] = emailParts;

  if (account.length > 64) return false;
  else if (address.length > 255) return false;
  const domainParts = address.split(".");
  if (domainParts.some((part) => part.length > 63)) return false;

  return EMAIL_REGEX.test(email);
};
