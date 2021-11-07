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
import payment from "./routes/payment";
import products from "./routes/products";
import search from "./routes/search";
import seller from "./routes/sellers";
import user from "./routes/user";

const app = express();

app.use(
  cors({
    origin: [process.env.CLIENT_ORIGIN],
    methods: "GET, HEAD, PUT, PATCH, POST, DELETE, OPTIONS",
    credentials: true,
  })
);

app.use(json());

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
    resave: false,
    saveUninitialized: false,
    store: new PrismaSessionStore(prisma, {
      checkPeriod: 7 * 24 * 60 * 60 * 1000,
      dbRecordIdIsSessionId: true,
    }),
  })
);

app.use(sessionValidator);
//idleTimeout:3*60*60*1000, absoluteTimeout:2*24*60*60*1000

app.use("/auth", auth);
app.use("/products", products);
app.use("/buy", buy);
app.use("/payment", payment);
app.use("/sellers", seller);
app.use("/search", search);
app.use("/users", user);

app.get("/", async (req, res, next) => {
  respond(res, 200, "API Running");
});

app.listen(process.env.PORT, () => {
  console.log("Listening on port", process.env.PORT);
});
