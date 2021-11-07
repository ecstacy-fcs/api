import * as ERROR from "src/constants/errors";
import prisma from "src/prisma";
import { respond } from "../request-respond";

export default async function validate(req, res, next) {
  try {
    const admin = await prisma.admin.findUnique({
      where: {
        userId: req.session.uid
      }
    });
    if (!admin) {
      respond(res, 403, ERROR.ACCESS_DENIED);
      return;
    }else{
      next();
      return;
    }
  } catch (error) {
    console.log(error);
    respond(res, 500, ERROR.INTERNAL_ERROR);
    return;
  }
  next();
}