import jwt from "jsonwebtoken";
import { prisma } from "#prisma";

const ROLE_HIERARCHY = {
  instructor: 1,
  dispatcher: 2,
  manager: 3,
};

const DAY_OF_ROLE_PERMISSION_MAP = {
  "dod:volunteer": "VOLUNTEER_CHECK_IN",
  "dod:registration": "PARTICIPANT_CHECK_IN",
  "dod:pointOfSale": "POINT_OF_SALE",
};

const parseDayOfHeader = (value) => {
  if (value === undefined || value === null) return false;
  if (Array.isArray(value)) {
    return value.some((item) => parseDayOfHeader(item));
  }
  const normalized = `${value}`.trim().toLowerCase();
  return ["true", "1", "yes"].includes(normalized);
};

const buildDayOfAccountResponse = (accountRecord) => ({
  id: accountRecord.id,
  eventId: accountRecord.eventId,
  provisionerId: accountRecord.provisionerId,
  instanceId: accountRecord.instanceId ?? null,
  permissions: [...(accountRecord.permissions || [])],
  tokenVersion: accountRecord.tokenVersion,
  lastIssuedAt: accountRecord.lastIssuedAt ?? null,
});

export const verifyAuth =
  (allowedRoles = [], allowUnauthenticated = false) =>
  async (req, res, next) => {
    try {
      const authHeader = req.headers.authorization;
      const token = authHeader?.split(" ")[1];
      const isDayOfDashboard = parseDayOfHeader(
        req.headers["x-isdayofdashboard"]
      );

      if (isDayOfDashboard) {
        if (!token || token === "null") {
          if (allowUnauthenticated) {
            req.dayOfDashboardAccount = null;
            req.hasDayOfDashboardAccount = false;
            req.isDayOfDashboardRequest = true;
            req.user = undefined;
            req.hasUser = false;
            return next();
          }
          return res.sendStatus(401);
        }

        let decoded;
        try {
          decoded = jwt.verify(token, process.env.JWT_SECRET);
        } catch (error) {
          void error;
          return res.sendStatus(401);
        }

        if (!decoded?.dayOf || decoded?.type !== "DAY_OF_DASHBOARD") {
          return res.sendStatus(401);
        }

        try {
          const account = await prisma.dayOfDashboardAccount.findUnique({
            where: { id: decoded.aid },
            select: {
              id: true,
              eventId: true,
              provisionerId: true,
              instanceId: true,
              permissions: true,
              tokenVersion: true,
              lastIssuedAt: true,
              deleted: true,
              provisioner: {
                select: {
                  id: true,
                  tokenVersion: true,
                  deleted: true,
                },
              },
            },
          });

          if (!account || account.deleted) {
            return res.sendStatus(401);
          }

          if (
            account.eventId !== decoded.eid ||
            account.provisionerId !== decoded.pid ||
            account.tokenVersion !== decoded.atv ||
            account.provisioner?.tokenVersion !== decoded.ptv ||
            account.provisioner?.deleted
          ) {
            return res.sendStatus(401);
          }

          const dayOfRoles = allowedRoles.filter((role) =>
            role.startsWith("dod:")
          );

          if (
            allowedRoles.length > 0 &&
            dayOfRoles.length === 0 &&
            !allowUnauthenticated
          ) {
            return res.status(403).json({
              message: "Access forbidden: insufficient permissions",
            });
          }

          const requiredPermissions = dayOfRoles
            .map((role) => DAY_OF_ROLE_PERMISSION_MAP[role])
            .filter(Boolean);

          const accountPermissions = new Set(account.permissions || []);

          const hasRequiredPermission =
            requiredPermissions.length === 0 ||
            requiredPermissions.some((permission) =>
              accountPermissions.has(permission)
            );

          if (!hasRequiredPermission && !allowUnauthenticated) {
            return res.status(403).json({
              message: "Access forbidden: insufficient permissions",
            });
          }

          req.dayOfDashboardAccount = buildDayOfAccountResponse(account);
          req.hasDayOfDashboardAccount = true;
          req.isDayOfDashboardRequest = true;
          req.user = undefined;
          req.hasUser = false;

          return next();
        } catch (error) {
          console.error("Failed to verify day-of dashboard account", error);
          return res.status(500).json({ message: "Internal server error" });
        }
      }

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

            if (user.suspended && req.originalUrl !== "/api/auth/me") {
              return res.sendStatus(401); // Unauthorized
            }

            req.user = user;
            req.hasUser = true;

            const userRoleLevel =
              ROLE_HIERARCHY[user.accountType?.toLowerCase()] || 0;

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
