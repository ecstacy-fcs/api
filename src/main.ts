import "dotenv/config";
import express from "express";
import { json } from "body-parser";
import prisma from "./common/client";
import auth from "./routes/auth";

// const prisma = new PrismaClient();

const app = express();

app.use(json());

app.use("/auth", auth);

app.get("/", async (req, res, next) => {
  const users = await prisma.user.findMany();
  res.json({ users });
});

app.listen(process.env.PORT, () => {
  console.log("Listening on port", process.env.PORT);
});
