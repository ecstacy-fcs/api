import { EventType, User } from "@prisma/client";
import prisma from "src/prisma";

export const log = async (
  req: { user: User; ip?: string },
  type: EventType,
  description?: string
) => {
  try {
    const { user, ip } = req;
    const ipAddress = ip || "0.0.0.0";
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
