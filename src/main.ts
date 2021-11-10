import { PrismaSessionStore } from "@quixo3/prisma-session-store";
import { json } from "body-parser";
import cors from "cors";
import csurf from "csurf";
import "dotenv/config";
import express, { Request } from "express";
import session from "express-session";
import helmet from "helmet";
import {
  isAdmin,
  isBuyer,
  isNotDeleted,
  isUser,
  isUserVerified,
} from "src/lib/middlewares";
import { respond } from "./lib/request-respond";
import sessionValidator from "./lib/validators/session";
import prisma from "./prisma";
import auth from "./routes/auth";
import buy from "./routes/buy";
import buyer from "./routes/buyers";
import events from "./routes/events";
import payment from "./routes/payment";
import products from "./routes/products";
import search from "./routes/search";
import sell from "./routes/sell";
import seller from "./routes/sellers";
import user from "./routes/user";

const PROD_ENV = process.env.ENV === "prod";

const app = express();

// We trust our Nginx proxy to supply us with correct headers
app.set("trust proxy", true);

// Helmet to add secure headers
app.use(helmet());

// CORS settings
app.use(
  cors({
    origin: [process.env.CLIENT_ORIGIN],
    methods: "GET, HEAD, PUT, PATCH, POST, DELETE, OPTIONS",
    credentials: true,
  })
);

// Request body parsing
const parseJson = json({ limit: "1mb" });
export const shouldParseRequest = (req: Request) =>
  !(req.url === "/proposal" && req.method === "POST");
app.use((req, res, next) =>
  shouldParseRequest(req) ? parseJson(req, res, next) : next()
);

// Session management
app.use(
  session({
    secret: process.env.COOKIE_SECRET,
    cookie: {
      maxAge: 60 * 60 * 1000,
      httpOnly: true,
      sameSite: "lax",
      secure: PROD_ENV,
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
// Early block requests that don't validate thru CSRF
app.use(csurf());
app.use(sessionValidator);

// All the other API routes
app.use("/static", express.static(`${__dirname}/uploads`));
app.use("/auth", auth);
app.use("/products", products);
app.use("/buy", isUser, isUserVerified, isBuyer, buy);
app.use("/sell", isUser, isUserVerified, isBuyer, sell);
app.use("/payment", payment);
app.use("/sellers", seller);
app.use("/search", search);
app.use("/users", user);
app.use("/buyers", buyer);
app.use("/events", isUser, isUserVerified, isNotDeleted, isAdmin, events);
app.get("/", async (req, res, next) => {
  respond(res, req, 200, "API Running");
});

// Catch all uncaught routes and 404
app.all("*", (req, res, next) => {
  respond(res, req, 404, "Route not found for request");
});

app.listen(process.env.PORT, () => {
  console.log("Listening on port", process.env.PORT);
});
