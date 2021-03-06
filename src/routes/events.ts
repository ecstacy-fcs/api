import express from "express";
import { INTERNAL_ERROR } from "src/constants/errors";
import { respond } from "src/lib/request-respond";
import prisma from "src/prisma";

const route = express();

route.get("/", async (req, res, next) => {
  try {
    const events = await prisma.event.findMany({
      include: { actor: true },
      orderBy: { time: "desc" },
    });
    respond(res, req, 200, "Success", events);
  } catch (err) {
    respond(res, req, 500, INTERNAL_ERROR);
  }
});

export default route;
