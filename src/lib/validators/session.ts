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
    respond(res, req, 400, ERROR.BAD_INPUT);
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
    req.session.regenerate(() => respond(res, req, 401, ERROR.SESSION_TIMEOUT));
    return;
  }

  // idle session:
  // after this logout and ask the user to reauthenticate
  if (
    currentTime.getTime() - new Date(req.session.lastActive).getTime() >=
    idleTimeout
  ) {
    req.session.regenerate(() => respond(res, req, 401, ERROR.SESSION_TIMEOUT));
    return;
  }

  const user = await prisma.user.findUnique({
    where: { id: req.session.uid },
    include: { adminProfile: true, buyerProfile: true, sellerProfile: true },
  });
  if (!user || user.deleted) {
    // Delete invalid session
    await prisma.session.delete({ where: { sid: req.sessionID } });
    req.session.destroy(() => {
      respond(res, req, 400, ERROR.ACCOUNT_NOT_FOUND, undefined);
    });
    return;
  }

  if (user.banned) {
    await prisma.session.delete({ where: { sid: req.sessionID } });
    req.session.destroy(() => {
      respond(res, req, 400, ERROR.ACCOUNT_BANNED, undefined);
    });
    return;
  }

  req.session.lastActive = currentTime;
  req.user = user;

  next();
}
