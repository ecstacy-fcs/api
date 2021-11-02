var testregex =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,22}$/;

export default function passwordvalidator(password: string): boolean {
  if (!testregex.test(password)) return false;

  return true;
}
