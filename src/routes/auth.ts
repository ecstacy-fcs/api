import { Token, User } from "@prisma/client";
import { compare, genSalt, hash } from "bcrypt";
import dayjs from "dayjs";
import deepValidateEmail from "deep-email-validator";
import express from "express";
import Joi from "joi";
import * as ERROR from "src/constants/errors";
import { log } from "src/lib/log";
import { mail } from "src/lib/mail";
import { isUser } from "src/lib/middlewares";
import { respond } from "src/lib/request-respond";
import * as email from "src/lib/validators/email";
import * as password from "src/lib/validators/password";
import prisma from "src/prisma";

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
  const { value, error } = Joi.object({
    email: email.schema,
    password: password.schema,
    name: Joi.string().trim().max(30).required(),
  }).validate(req.body, { convert: true });
  if (error) {
    respond(res, 400, `${ERROR.BAD_INPUT}: ${error.message}`);
    return;
  }
  try {
    const { valid } = await deepValidateEmail(value.email);
    if (!valid) {
      respond(res, 400, ERROR.INVALID_EMAIL);
      return;
    }
  } catch (err) {
    console.error(err);
    respond(res, 500, ERROR.INTERNAL_ERROR);
    return;
  }
  let user: User;
  try {
    user = await prisma.user.findUnique({
      where: { email: value.email },
    });
    if ((user && !user.deleted) || (user && user.banned)) {
      respond(res, 400, ERROR.ACCOUNT_EXISTS);
      return;
    }
    const salt = await genSalt();
    const hashedPassword = await hash(value.password, salt);
    if (user) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          name: value.name,
          password: hashedPassword,
          deleted: false,
          verified: false,
        },
      });
    } else {
      user = await prisma.user.create({
        data: {
          name: value.name,
          email: value.email,
          password: hashedPassword,
        },
      });
      log({ ...req, user }, "CREATE", "User registered");
    }
  } catch (exception) {
    console.error(exception);
    respond(res, 500, ERROR.INTERNAL_ERROR);
    return;
  }
  try {
    // Create verification token
    const verificationToken = await prisma.token.create({
      data: { type: "EMAIL_VERIFICATION", userId: user.id },
    });
    log({ ...req, user }, "CREATE", "Email verification token created");
    const verificationLink = `${process.env.API_BASE_URL}/auth/verify?token=${verificationToken.id}&userId=${user.id}`;
    try {
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
    } catch (err) {
      respond(res, 500, "There was an error sending the email");
      return;
    }
    respond(
      res,
      200,
      "Account registered, please check your mail to verify your account"
    );
  } catch (err) {
    respond(res, 500, ERROR.INTERNAL_ERROR);
  }
});

route.post("/login", async (req: any, res, next) => {
  if (req.user) {
    respond(res, 400, "You are already logged in! Log out to login again.");
    return;
  }
  const { value, error } = Joi.object({
    email: email.schema,
    password: password.schema,
  }).validate(req.body, { convert: true });
  if (error) {
    respond(res, 400, `${ERROR.BAD_INPUT}: ${error.message}`);
    return;
  }
  let user: User;
  try {
    user = await prisma.user.findUnique({
      where: { email: value.email },
    });
    if (!user) {
      respond(res, 404, ERROR.ACCOUNT_NOT_FOUND);
      return;
    }
    if (!(await compare(value.password, user.password))) {
      respond(res, 403, ERROR.WRONG_PASSWORD);
      return;
    }
    if (user.deleted && !user.banned) {
      respond(
        res,
        404,
        "Account deleted. Register again with the same email ID to activate it."
      );
      return;
    }
    if(user.banned){
      respond(res, 403, "Account banned. Contact admin to unban.");
      return;
    }
  } catch (exception) {
    respond(res, 500, ERROR.INTERNAL_ERROR);
    return;
  }
  req.session.uid = user.id;
  req.session.loginTime = new Date();
  req.session.lastActive = new Date();
  log({ ...req, user }, "CREATE", "User session created, logged in");
  respond(res, 200);
});

route.get("/logout", isUser, async (req: any, res, next) => {
  log(req, "DELETE", "User session destroyed, logged out");
  res = res.clearCookie(process.env.SESSION_NAME);
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
  try {
    const verificationToken = await prisma.token.findFirst({
      where: {
        id: value.token,
        userId: value.userId,
        type: "EMAIL_VERIFICATION",
      },
      include: { user: { include: { buyerProfile: true } } },
    });
    if (!verifyToken(verificationToken, res)) return;
    // Good token
    if (!verificationToken.user.buyerProfile) {
      log(
        { ...req, user: verificationToken.user },
        "CREATE",
        "Buyer profile created"
      );
      await prisma.buyer.create({ data: { userId } });
    }
    await prisma.token.update({
      where: { id: value.token },
      data: { valid: false },
    });
    log(
      { ...req, user: verificationToken.user },
      "UPDATE",
      "Email verification token invalidated"
    );
    await prisma.user.update({
      where: { id: value.userId },
      data: { verified: true },
    });
    log({ ...req, user: verificationToken.user }, "UPDATE", "User verified");
    res.redirect(`${process.env.CLIENT_ORIGIN}/auth/login?verified=true`);
  } catch (err) {
    respond(res, 500, ERROR.INTERNAL_ERROR);
  }
});

route.post(
  "/resend-verification-email",
  isUser,
  async (req: any, res, next) => {
    if (req.user.verified) {
      respond(res, 400, "User is already verified");
      return;
    }
    try {
      let verificationToken = await prisma.token.findFirst({
        where: {
          userId: req.user.id,
          type: "EMAIL_VERIFICATION",
          valid: true,
          createdAt: {
            gt: new Date(Date.now() - 2 * 60 * 60 * 1000),
          },
        },
      });
      if (verificationToken) {
        respond(res, 400, "Verification token already sent to email!");
        return;
      }
      // Create a new token
      verificationToken = await prisma.token.create({
        data: { type: "EMAIL_VERIFICATION", userId: req.user.id },
      });
      log(req, "CREATE", "Email verification token created");
      const verificationLink = `${process.env.API_BASE_URL}/auth/verify?token=${verificationToken.id}&userId=${req.user.id}`;
      try {
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
      } catch (err) {
        respond(res, 500, "There was an error sending the email");
        return;
      }
      respond(res, 200, "Verification email sent");
    } catch (err) {
      respond(res, 500, ERROR.INTERNAL_ERROR);
    }
  }
);

route.post("/forgot-password", async (req: any, res, next) => {
  if (req.user) {
    respond(res, 400, "Already logged in!");
    return;
  }
  const { value, error } = Joi.object({ email: email.schema }).validate(
    req.body,
    { convert: true }
  );
  if (error) {
    respond(res, 400, ERROR.BAD_INPUT);
    return;
  }
  try {
    const user = await prisma.user.findFirst({
      where: { email: value.email, deleted: false },
    });
    if (!user) {
      respond(res, 404, ERROR.ACCOUNT_NOT_FOUND);
      return;
    }
    // Check if valid verification token already exists and sent
    let verificationToken = await prisma.token.findFirst({
      where: {
        userId: user.id,
        type: "FORGOT_PASSWORD",
        valid: true,
        createdAt: {
          gt: new Date(Date.now() - 2 * 60 * 60 * 1000),
        },
      },
    });
    if (verificationToken) {
      respond(res, 400, "Verification token already sent to email!");
      return;
    }
    verificationToken = await prisma.token.create({
      data: {
        userId: user.id,
        type: "FORGOT_PASSWORD",
      },
    });
    log({ ...req, user }, "CREATE", "Forgot password token created");
    try {
      await mail({
        to: user.email,
        subject: "Ecstacy - Verify your Update Password Request",
        html: `<h2>Update Password OTP</h2>
    <p>Use the following OTP token to update your password:
      <strong><code>${verificationToken.id}</code></strong
    </p>`,
      });
    } catch (err) {
      respond(res, 500, "There was an error sending the email");
      return;
    }
    respond(res, 200, "Email sent");
  } catch (err) {
    respond(res, 500, ERROR.INTERNAL_ERROR);
  }
});

route.post("/update-password", async (req: any, res, next) => {
  if (req.user) {
    respond(res, 400, "Already logged in!");
    return;
  }
  const { value, error } = Joi.object({
    otp: Joi.string().trim().required(),
    password: password.schema,
  }).validate(req.body, { convert: true });
  if (error) {
    respond(res, 400, ERROR.BAD_INPUT);
    return;
  }
  try {
    const verificationToken = await prisma.token.findFirst({
      where: { type: "FORGOT_PASSWORD", id: value.otp },
      include: { user: true },
    });
    if (!verifyToken(verificationToken, res)) return;
    if (await compare(value.password, verificationToken.user.password)) {
      respond(
        res,
        400,
        `${ERROR.BAD_INPUT}: New password must be different from the current one!`
      );
      return;
    }
    const salt = await genSalt();
    const hashedPassword = await hash(value.password, salt);
    await prisma.token.update({
      where: { id: verificationToken.id },
      data: { valid: false },
    });
    log(
      { ...req, user: verificationToken.user },
      "UPDATE",
      "Password verification token invalidated"
    );
    await prisma.user.update({
      where: { id: verificationToken.userId },
      data: { password: hashedPassword },
    });
    log(
      { ...req, user: verificationToken.user },
      "UPDATE",
      "User password updated"
    );
    respond(res, 200, "Password updated!");
  } catch (err) {
    respond(res, 500, ERROR.INTERNAL_ERROR);
  }
});

export default route;

export const verifyToken = (token: Token, res: any): boolean => {
  // No such token
  if (!token) {
    respond(
      res,
      404,
      "Could not find any token associated with this user or token"
    );
    return false;
  }
  // Invalid token
  if (!token.valid) {
    respond(
      res,
      400,
      "This token is no longer valid, please request a new one"
    );
    return false;
  }
  // Expired token
  if (dayjs().diff(token.createdAt, "hours") > 2) {
    respond(res, 400, "This token has expired, please request a new one");
    return false;
  }
  return true;
};
