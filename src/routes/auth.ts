import { User } from "@prisma/client";
import { compare, genSalt, hash } from "bcrypt";
import dayjs from "dayjs";
import express from "express";
import Joi from "joi";
import * as ERROR from "src/constants/errors";
import { mail } from "src/lib/mail";
import { isUser } from "src/lib/middlewares";
import { respond } from "src/lib/request-respond";
import * as email from "src/lib/validators/email";
import * as password from "src/lib/validators/password";
import prisma from "src/prisma";
import { LoginBody, RegisterBody } from "src/types";

const route = express();

route.post("/register", async (req: any, res, next) => {
  if (req.user) {
    respond(
      res,
      400,
      "Logged in user cannot create a new account. Please log out first."
    );
    return;
  }

  const body: RegisterBody = req.body;

  const { value, error } = Joi.object({
    email: email.schema,
    password: password.schema,
    name: Joi.string().trim().max(30).required(),
  }).validate(body, { convert: true });

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
      },
    });
  } catch (exception) {
    console.log(exception);
    respond(res, 500, ERROR.INTERNAL_ERROR);
    return;
  }

  // Create verification token
  const verificationToken = await prisma.token.create({
    data: { type: "EMAIL_VERIFICATION", userId: user.id },
  });

  const verificationLink = `${process.env.API_BASE_URL}/auth/verify?token=${verificationToken.id}&userId=${user.id}`;

  // Send mail to user with verification token
  await mail({
    to: user.email,
    subject: "Verify your email for Ecstacy",
    html: `<h1>Welcome to Ecstacy!</h1>
<p>Please verify your email before continuing your shopping!</p>
<p><strong><a href="${verificationLink}">Click here</a></strong> or copy the following link and paste it in your browser:<br>
<code>${verificationLink}</code>
</p>`,
  });

  respond(
    res,
    200,
    "Account registered, please check your mail to verify your account"
  );
});

route.post("/login", async (req: any, res, next) => {
  if (req.user) {
    respond(res, 400, "You are already logged in! Log out to login again.");
    return;
  }

  const body: LoginBody = req.body;

  const { value, error } = Joi.object({
    email: email.schema,
    password: password.schema,
  }).validate(body, { convert: true });

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

route.get("/logout", async (req: any, res, next) => {
  if (!req.user) {
    respond(res, 400, "You need to login to logout");
    return;
  }
  res.clearCookie(process.env.SESSION_NAME);
  req.session.destroy(() => respond(res, 200));
  return;
});

route.get("/user", async (req: any, res, next) => {
  if (!req.session?.uid || !req.user) return respond(res, 200, undefined);
  respond(res, 200, "logged-in user", {
    id: req.user.id,
    email: req.user.email,
    name: req.user.name,
    verified: req.user.verified,
  });
});

route.get("/verify", async (req, res, next) => {
  const { token, userId } = req.query as { token: string; userId: string };
  const { value, error } = Joi.object({
    token: Joi.string().trim().required(),
    userId: Joi.string().trim().required(),
  }).validate({ token, userId }, { convert: true });
  if (error) {
    respond(res, 400, ERROR.BAD_INPUT);
    return;
  }
  const verificationToken = await prisma.token.findFirst({
    where: {
      id: value.token,
      userId: value.userId,
      type: "EMAIL_VERIFICATION",
    },
  });
  // No such token
  if (!verificationToken) {
    respond(
      res,
      404,
      "Could not find any verification token associated with this user or token"
    );
    return;
  }
  // Invalid token
  if (!verificationToken.valid) {
    respond(
      res,
      400,
      "This link is no longer valid, please request a new link"
    );
    return;
  }
  // Expired token
  if (dayjs().diff(verificationToken.createdAt, "hours") > 2) {
    respond(res, 400, "This link has expired, please request a new one");
    return;
  }
  // Good token
  await prisma.buyer.create({ data: { userId } });
  await prisma.token.update({
    where: { id: value.token },
    data: { valid: false },
  });
  await prisma.user.update({
    where: { id: value.userId },
    data: { verified: true },
  });
  res.redirect(`${process.env.CLIENT_ORIGIN}/auth/login?verified=true`);
});

route.post(
  "/resend-verification-email",
  isUser,
  async (req: any, res, next) => {
    if (req.user.verified) {
      respond(res, 400, "User is already verified");
      return;
    }
    // Invalidate all tokens first
    await prisma.token.updateMany({
      where: { userId: req.user.id, type: "EMAIL_VERIFICATION" },
      data: { valid: false },
    });
    // Create a new token
    const verificationToken = await prisma.token.create({
      data: { type: "EMAIL_VERIFICATION", userId: req.user.id },
    });
    const verificationLink = `${process.env.API_BASE_URL}/auth/verify?token=${verificationToken.id}&userId=${req.user.id}`;
    // Send mail to user with verification token
    await mail({
      to: req.user.email,
      subject: "Verify your email for Ecstacy",
      html: `<h1>Welcome to Ecstacy!</h1>
<p>Please verify your email before continuing your shopping!</p>
<p><strong><a href="${verificationLink}">Click here</a></strong> or copy the following link and paste it in your browser:<br>
<code>${verificationLink}</code>
</p>`,
    });
    respond(res, 200, "Verification email sent");
  }
);

route.post("/forgot-password", async (req, res, next) => {});

route.post("/update-password", async (req, res, next) => {});

export default route;
