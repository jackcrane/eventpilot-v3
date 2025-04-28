import jwt from "jsonwebtoken";
import { prisma } from "#prisma";

// Define role hierarchy
const ROLE_HIERARCHY = {
  instructor: 1,
  dispatcher: 2,
  manager: 3,
};

export const verifyAuth =
  (allowedRoles = []) =>
  async (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (authHeader) {
      const token = authHeader.split(" ")[1];

      jwt.verify(token, process.env.JWT_SECRET, async (err, decoded) => {
        if (err) {
          return res.sendStatus(401); // Unauthorized
        }

        const user = await prisma.user.findUnique({
          where: { id: decoded.userId },
        });

        if (!user) {
          return res.sendStatus(401); // Unauthorized
        }

        // Check if the user is suspended
        if (user.suspended && req.originalUrl !== "/api/auth/me") {
          return res.sendStatus(401); // Unauthorized
        }

        // Attach the user to the request object
        req.user = user;

        // Get user's role level
        const userRoleLevel =
          ROLE_HIERARCHY[user.accountType?.toLowerCase()] || 0;

        // Check if the user's role level meets the minimum required level
        const requiredRoleLevels = allowedRoles.map(
          (role) => ROLE_HIERARCHY[role] || 0
        );
        const minRequiredRoleLevel = Math.min(...requiredRoleLevels);

        if (userRoleLevel < minRequiredRoleLevel) {
          return res
            .status(403)
            .json({ message: "Access forbidden: insufficient permissions" });
        }

        next();
      });
    } else {
      res.sendStatus(401); // Unauthorized
    }
  };
