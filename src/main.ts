import { PrismaSessionStore } from "@quixo3/prisma-session-store";
import { json } from "body-parser";
import cors from "cors";
import "dotenv/config";
import express from "express";
import session from "express-session";
import { respond } from "./lib/request-respond";
import sessionValidator from "./lib/validators/session";
import prisma from "./prisma";
import auth from "./routes/auth";
import buy from "./routes/buy";
import products from "./routes/products";
import * as ERROR from "src/constants/errors";

const app = express();

app.use(json());
app.use(
  cors({
    origin: [process.env.CLIENT_ORIGIN],
    methods: ["GET", "POST", "PATCH", "DELETE"],
  })
);

app.use(
  session({
    secret: process.env.COOKIE_SECRET,
    cookie: {
      maxAge: 60 * 60 * 1000,
      httpOnly: true,
      //TODO: set secure to true,
      secure: false,
    },
    name: process.env.SESSION_NAME,
    resave: true,
    saveUninitialized: true,
    store: new PrismaSessionStore(prisma, {
      checkPeriod: 7 * 24 * 60 * 60 * 1000,
      dbRecordIdIsSessionId: true,
    }),
  })
);

app.use(sessionValidator);
//idleTimeout:3*60*60*1000, absoluteTimeout:2*24*60*60*1000

app.use("/auth", auth);
app.use("/buy", buy);
app.use("/products", products);

app.get("/", async (req, res, next) => {
  respond(res, 200, "API Running");
});

app.get("/user", async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: {
        id: req.session.uid,
      },
      include: {
        buyerProfile: true,
        sellerProfile: true,
        adminProfile: true,
        tokens: true,
      },
    });
    respond(res, 200, "logged-in user", user);
  } catch (err) {
    console.error(err);
    respond(res, 500, ERROR.INTERNAL_ERROR);
  }
});

app.listen(process.env.PORT, () => {
  console.log("Listening on port", process.env.PORT);
});
