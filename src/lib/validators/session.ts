//idle, absolute and renewal timeout
import * as ERROR from "src/constants/errors";
import prisma from "src/prisma";
import { respond } from "../request-respond";

const idleTimeout = 3 * 60 * 60 * 1000;
const absoluteTimeout = 2 * 24 * 60 * 60 * 1000;

export default async function validate(req, res, next) {
  if (!req.session.uid) {
    next();
    return;
  }

  const session = await prisma.session.findUnique({
    where: { sid: req.sessionID },
  });
  if (!session) {
    respond(res, 400, ERROR.BAD_INPUT);
    return;
  }

  const currentTime = new Date();

  // absolute timeout:
  // send a custom error message for session expiration
  // after this logout and ask the user to reauthenticate
  if (
    currentTime.getTime() - new Date(req.session.loginTime).getTime() >=
    absoluteTimeout
  ) {
    req.session.regenerate(() => respond(res, 401, ERROR.SESSION_TIMEOUT));
    return;
  }

  // idle session:
  // after this logout and ask the user to reauthenticate
  if (
    currentTime.getTime() - new Date(req.session.lastActive).getTime() >=
    idleTimeout
  ) {
    req.session.regenerate(() => respond(res, 401, ERROR.SESSION_TIMEOUT));
    return;
  }

  const user = await prisma.user.findUnique({
    where: { id: req.session.uid },
    include: { adminProfile: true, buyerProfile: true, sellerProfile: true },
  });
  if (!user) {
    // Delete invalid session
    await prisma.session.delete({
      where: { sid: req.sessionID },
    });
    res.clearCookie(process.env.SESSION_NAME);
    req.session.destroy(() => respond(res, 400));
    return;
  }

  req.session.lastActive = currentTime;
  req.user = user;

  next();
}
