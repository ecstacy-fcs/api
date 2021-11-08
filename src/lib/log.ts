import { EventType, User } from "@prisma/client";
import prisma from "src/prisma";

export const log = async (
  req: { user: User; headers: any; ip?: string },
  type: EventType,
  description?: string
) => {
  const { user, headers, ip } = req;
  const ipAddress = headers["x-forwarded-for"] || ip || "0.0.0.0";
  try {
    await prisma.event.create({
      data: {
        actorId: user.id,
        type,
        ipAddress,
        description,
      },
    });
  } catch (err) {}
};
