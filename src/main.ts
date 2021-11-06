import { PrismaSessionStore } from "@quixo3/prisma-session-store";
import { json } from "body-parser";
import cors from "cors";
import "dotenv/config";
import express, { Request } from "express";
import session from "express-session";
import { respond } from "./lib/request-respond";
import sessionValidator from "./lib/validators/session";
import prisma from "./prisma";
import auth from "./routes/auth";
import buy from "./routes/buy";
import sell from "./routes/sell";
import products from "./routes/products";

const app = express();

const parseJSON = json({ limit: "1mb" });

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

// don't pass request as JSON for this route
export const shouldParseRequest = (req: Request) =>
  !(req.url === "/proposal" && req.method === "POST");

app.get("/", async (req, res, next) => {
  respond(res, 200, "API Running");
});

app.use("/auth", auth);
app.use("/buy", buy);
app.use("/sell", sell);
app.use("/products", products);

app.listen(process.env.PORT, () => {
  console.log("Listening on port", process.env.PORT);
});
