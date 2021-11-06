//idle, absolute and renewal timeout
import * as ERROR from "src/constants/errors";
import prisma from "src/prisma";

const idleTimeout = 3 * 60 * 60 * 1000;
const absoluteTimeout = 2 * 24 * 60 * 60 * 1000;

export default async function validate(req, res, next) {
  if (req.session.uid === undefined || req.session.uid === null) {
    next();
    return;
  }

  const sid = req.sessionID;
  const session = await prisma.session.findUnique({
    where: { sid },
  });

  if (!session) {
    res.status(400).json({ success: "false", error: ERROR.BAD_INPUT });
    return;
  }

  const currentTime = new Date();

  // absolute timeout:
  if (
    currentTime.getTime() - new Date(req.session.loginTime).getTime() >=
    absoluteTimeout
  ) {
    // send a custom error message for session expiration
    // after this logout and ask the user to reauthenticate
    req.session.regenerate(() => {
      res.status(401).json({ success: false, error: ERROR.SESSION_TIMEOUT });
    });
    return;
  }

  // idle session:
  // after this logout and ask the user to reauthenticate
  if (
    currentTime.getTime() - new Date(req.session.lastActive).getTime() >=
    idleTimeout
  ) {
    req.session.regenerate(() => {
      res.status(401).json({ success: false, error: ERROR.SESSION_TIMEOUT });
    });
    return;
  }

  req.session.lastActive = currentTime;
  next();
}
