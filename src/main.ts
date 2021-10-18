import "dotenv/config";
import express from "express";
import { json } from "body-parser";
import prisma from "./common/client";
import auth from "./routes/auth";
import session from "express-session";
import { PrismaSessionStore } from "@quixo3/prisma-session-store";
// const prisma = new PrismaClient();

const app = express();

app.use(json());

app.use(session({
  secret:process.env.COOKIE_SECRET.split(' '),
  cookie:{
    maxAge:60*60*1000,
    httpOnly:true,
    //TODO: set secure to true,
    secure:false,
  },
  name:process.env.SESSION_NAME,
  resave:true,
  saveUninitialized:false,
  store: new PrismaSessionStore(
    prisma,
    {
      checkPeriod: 7*24*60*60*1000,
      dbRecordIdIsSessionId: true,
    }
  )
}));

app.use("/auth", auth);

app.get("/", async (req, res, next) => {
  const users = await prisma.user.findMany();
  res.json({ users });
});

app.listen(process.env.PORT, () => {
  console.log("Listening on port", process.env.PORT);
});
