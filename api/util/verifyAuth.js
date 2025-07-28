import jwt from "jsonwebtoken";
import { prisma } from "#prisma";
import { isCustomerInGoodStanding } from "#stripe";

// Define role hierarchy
const ROLE_HIERARCHY = {
  instructor: 1,
  dispatcher: 2,
  manager: 3,
};

export const verifyAuth =
  (allowedRoles = [], allowUnauthenticated = false) =>
  async (req, res, next) => {
    try {
      const authHeader = req.headers.authorization;
      const token = authHeader?.split(" ")[1];

      if (authHeader && token && token !== "null") {
        jwt.verify(token, process.env.JWT_SECRET, async (err, decoded) => {
          if (err) {
            return res.sendStatus(401); // Unauthorized
          }

          try {
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

            if (req.method === "POST") {
              user.goodStanding = await isCustomerInGoodStanding(
                user.stripe_customerId
              );
              // if (!user.goodStanding) {
              //   return res.sendStatus(402); // Unauthorized
              // }
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

            if (userRoleLevel < minRequiredRoleLevel && !allowUnauthenticated) {
              return res.status(403).json({
                message: "Access forbidden: insufficient permissions",
              });
            }

            next();
          } catch (e) {
            console.error(e);
            return res.status(500).json({ message: "Internal server error" });
          }
        });
      } else {
        if (allowUnauthenticated) {
          req.user = {};
          req.hasUser = false;
          next();
        } else {
          res.sendStatus(401); // Unauthorized
        }
      }
    } catch (e) {
      console.log("Error occured in verifyAuth middleware", e);
      res.sendStatus(500);
    }
  };
