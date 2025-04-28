import { prisma } from "#prisma";
import jwt from "jsonwebtoken";

export const gt = async (options) => {
  const ga = options?.ga || false;
  const suspended = options?.suspended || false;

  let user =
    options?.user ||
    (await prisma.user.findFirst({
      where: {
        email: "test@email.com",
      },
    }));

  if (ga) {
    user = await prisma.user.update({
      where: { id: user.id },
      data: {
        admin: true,
      },
    });
  }

  if (suspended) {
    user = await prisma.user.update({
      where: { id: user.id },
      data: {
        suspended: true,
      },
    });
  }

  const token = jwt.sign(
    {
      id: user.id,
    },
    process.env.JWT_SECRET,
    { expiresIn: "3h" }
  );

  return ["Authorization", "Bearer " + token];
};
