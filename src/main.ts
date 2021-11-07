import { PrismaSessionStore } from "@quixo3/prisma-session-store";
import { json } from "body-parser";
import cors from "cors";
import "dotenv/config";
import express, { Request } from "express";
import session from "express-session";
import { isBuyer, isUser, isUserVerified } from "./lib/middlewares";
import { respond } from "./lib/request-respond";
import sessionValidator from "./lib/validators/session";
import prisma from "./prisma";
import auth from "./routes/auth";
import buy from "./routes/buy";
import sell from "./routes/sell";
import payment from "./routes/payment";
import products from "./routes/products";
import seller from "./routes/sellers";

const app = express();

const parseJSON = json({ limit: "1mb" });

// don't pass request as JSON for this route
export const shouldParseRequest = (req: Request) =>
  !(req.url === "/proposal" && req.method === "POST");

app.use((req, res, next) =>
  shouldParseRequest(req) ? parseJSON(req, res, next) : next()
);

// app.use(parseJSON);

app.use(express.static(`${__dirname}/uploads`));
app.use(
  cors({
    origin: [process.env.CLIENT_ORIGIN],
    methods: "*",
    credentials: true,
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
app.use("/buy", isUser, isUserVerified, isBuyer, buy);
app.use("/sell", isUser, isUserVerified, isBuyer, sell);
app.use("/payment", payment);
app.use('/sellers',seller);

app.get("/", async (req, res, next) => {
  respond(res, 200, "API Running");
});

app.listen(process.env.PORT, () => {
  console.log("Listening on port", process.env.PORT);
});
