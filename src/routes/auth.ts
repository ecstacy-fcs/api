import { User } from "@prisma/client";
import { compare, genSalt, hash } from "bcrypt";
import express from "express";
import Joi from "joi";
import * as ERROR from "src/constants/errors";
import { respond } from "src/lib/request-respond";
import * as email from "src/lib/validators/email";
import * as password from "src/lib/validators/password";
import prisma from "src/prisma";
import { LoginBody, RegisterBody } from "src/types";

const route = express();

route.post("/register", async (req, res, next) => {
  const body: RegisterBody = req.body;

  const { value, error } = Joi.object({
    email: email.schema,
    password: password.schema,
    name: Joi.string().required().max(30),
  }).validate(body);

  if (error) {
    respond(res, 400, `${ERROR.BAD_INPUT}: ${error.message}`);
    return;
  }

  let user: User;

  try {
    user = await prisma.user.findUnique({
      where: {
        email: value.email,
      },
    });

    if (user) {
      respond(res, 400, ERROR.ACCOUNT_EXISTS);
      return;
    }

    const salt = await genSalt();
    const hashedPassword = await hash(value.password, salt);

    user = await prisma.user.create({
      data: {
        name: value.name,
        email: value.email,
        password: hashedPassword,
        verified: true,
      },
    });
  } catch (exception) {
    console.log(exception);
    respond(res, 500, ERROR.INTERNAL_ERROR);
    return;
  }

  //send verification mail
  respond(res, 200, "Account registered");
});

route.post("/login", async (req, res, next) => {
  const body: LoginBody = req.body;

  const { value, error } = Joi.object({
    email: email.schema,
    password: password.schema,
  }).validate(body);

  if (error) {
    respond(res, 400, `${ERROR.BAD_INPUT}: ${error.message}`);
    return;
  }

  let user: User;

  try {
    user = await prisma.user.findUnique({
      where: {
        email: value.email,
      },
    });

    if (!user) {
      respond(res, 404, ERROR.ACCOUNT_NOT_FOUND);
      return;
    }

    if (!(await compare(value.password, user.password))) {
      respond(res, 403, ERROR.WRONG_PASSWORD);
      return;
    }

    if (!user.verified) {
      respond(res, 401, ERROR.UNVERIFIED_ACCOUNT);
      return;
    }
  } catch (exception) {
    respond(res, 500, ERROR.INTERNAL_ERROR);
    return;
  }

  //TODO:use session.regenerate here
  req.session.uid = user.id;
  req.session.loginTime = new Date();
  req.session.lastActive = new Date();

  respond(res, 200);
});

route.get("/logout", async (req, res, next) => {
  if (req.session.uid === undefined || req.session.uid === null) {
    respond(res, 403, ERROR.ACCESS_DENIED);
    return;
  }

  res.clearCookie(process.env.SESSION_NAME);

  req.session.destroy(function (err) {
    console.log("logged out");
    respond(res, 200);
  });
  return;
});

route.get("/user", async (req, res, next) => {
  // If session id is not present in the request, return early
  if (!req.session?.uid) return respond(res, 200, undefined);

  // If it is present, verify
  try {
    const user = await prisma.user.findUnique({
      where: {
        id: req.session.uid,
      },
      select: {
        id: true,
        email: true,
        name: true,
        verified: true,
      },
    });
    respond(res, 200, "logged-in user", user);
  } catch (err) {
    console.error(err);
    respond(res, 500, ERROR.INTERNAL_ERROR);
  }
});

route.get("/verify", async (req, res, next) => {});

route.post("/resend-verification-email", async (req, res, next) => {});

route.post("/forgot-password", async (req, res, next) => {});

route.post("/update-password", async (req, res, next) => {});

export default route;
