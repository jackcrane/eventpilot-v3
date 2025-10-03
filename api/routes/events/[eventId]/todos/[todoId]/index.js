import { verifyAuth } from "#verifyAuth";
import { prisma } from "#prisma";
import { serializeError } from "#serializeError";
import { LogType } from "@prisma/client";
import { zerialize } from "zodex";
import { todoUpdateSchema } from "../index.js";
import { reportApiError } from "#util/reportApiError.js";

export const get = [
  verifyAuth(["manager"]),
  async (req, res) => {
    try {
      const todo = await prisma.todoItem.findUnique({
        where: {
          id: req.params.todoId,
          eventId: req.params.eventId,
          deleted: false,
        },
        include: {
          comments: {
            include: { files: true },
            orderBy: { createdAt: "desc" },
          },
          logs: {
            orderBy: { createdAt: "desc" },
          },
          VolunteerRegistration: { select: { id: true } },
          Registration: { select: { id: true } },
          Conversation: { select: { id: true } },
          CrmPerson: { select: { id: true } },
        },
      });

      if (!todo) return res.status(404).json({ message: "Not found" });
      res.json({ todo });
    } catch (e) {
      console.error("[TODO][GET] Error:", e);
      reportApiError(e, req);
      res.status(500).json({ message: "Error" });
    }
  },
];

export const put = [
  verifyAuth(["manager"]),
  async (req, res) => {
    try {
      const existing = await prisma.todoItem.findUnique({
        where: {
          id: req.params.todoId,
          eventId: req.params.eventId,
          deleted: false,
        },
        include: {
          VolunteerRegistration: { select: { id: true } },
          Registration: { select: { id: true } },
          CrmPerson: { select: { id: true } },
        },
      });
      if (!existing) return res.status(404).json({ message: "Not found" });

      const parsed = todoUpdateSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: serializeError(parsed) });
      }

      const data = parsed.data;
      // Determine if status actually changes
      const statusChanged =
        typeof data.status !== "undefined" && data.status !== existing.status;
      // Determine specific changes
      const hasFieldChanges =
        typeof data.title !== "undefined" ||
        typeof data.content !== "undefined";

      // Compute volunteer connect/disconnect diffs if provided
      const oldVolunteerIds = (existing.VolunteerRegistration || []).map(
        (v) => v.id
      );
      const newVolunteerIds = Array.isArray(data.volunteerRegistrationIds)
        ? data.volunteerRegistrationIds
        : undefined;
      const volunteersConnected = Array.isArray(newVolunteerIds)
        ? newVolunteerIds.filter((id) => !oldVolunteerIds.includes(id))
        : [];
      const volunteersDisconnected = Array.isArray(newVolunteerIds)
        ? oldVolunteerIds.filter((id) => !newVolunteerIds.includes(id))
        : [];
      const hasVolunteerChanges =
        volunteersConnected.length > 0 || volunteersDisconnected.length > 0;

      // Compute participant connect/disconnect diffs if provided
      const oldParticipantIds = (existing.Registration || []).map((r) => r.id);
      const newParticipantIds = Array.isArray(data.participantRegistrationIds)
        ? data.participantRegistrationIds
        : undefined;
      const participantsConnected = Array.isArray(newParticipantIds)
        ? newParticipantIds.filter((id) => !oldParticipantIds.includes(id))
        : [];
      const participantsDisconnected = Array.isArray(newParticipantIds)
        ? oldParticipantIds.filter((id) => !newParticipantIds.includes(id))
        : [];
      const hasParticipantChanges =
        participantsConnected.length > 0 || participantsDisconnected.length > 0;

      // Compute CRM person connect/disconnect diffs if provided
      const oldCrmIds = (existing.CrmPerson || []).map((p) => p.id);
      const newCrmIds = Array.isArray(data.crmPersonIds)
        ? data.crmPersonIds
        : undefined;
      const crmConnected = Array.isArray(newCrmIds)
        ? newCrmIds.filter((id) => !oldCrmIds.includes(id))
        : [];
      const crmDisconnected = Array.isArray(newCrmIds)
        ? oldCrmIds.filter((id) => !newCrmIds.includes(id))
        : [];
      const hasCrmChanges =
        crmConnected.length > 0 || crmDisconnected.length > 0;

      // Other association changes (keep generic UPDATED log for these)
      const hasOtherAssociationChanges =
        Array.isArray(data.participantRegistrationIds) ||
        Array.isArray(data.sessionIds) ||
        Array.isArray(data.conversationIds);

      // Build logs array explicitly
      const logsToCreate = [];
      if (hasFieldChanges || hasOtherAssociationChanges) {
        logsToCreate.push({
          type: LogType.TODO_ITEM_UPDATED,
          userId: req.user.id,
          ip: req.ip || req.headers["x-forwarded-for"],
          data,
        });
      }
      if (hasVolunteerChanges) {
        if (volunteersConnected.length > 0) {
          logsToCreate.push({
            type: LogType.TODO_ITEM_VOLUNTEER_CONNECTED,
            userId: req.user.id,
            ip: req.ip || req.headers["x-forwarded-for"],
            data: { volunteerRegistrationIds: volunteersConnected },
          });
        }
        if (volunteersDisconnected.length > 0) {
          logsToCreate.push({
            type: LogType.TODO_ITEM_VOLUNTEER_DISCONNECTED,
            userId: req.user.id,
            ip: req.ip || req.headers["x-forwarded-for"],
            data: { volunteerRegistrationIds: volunteersDisconnected },
          });
        }
      }

      if (hasParticipantChanges) {
        if (participantsConnected.length > 0) {
          logsToCreate.push({
            type: LogType.TODO_ITEM_PARTICIPANT_CONNECTED,
            userId: req.user.id,
            ip: req.ip || req.headers["x-forwarded-for"],
            data: { participantRegistrationIds: participantsConnected },
          });
        }
        if (participantsDisconnected.length > 0) {
          logsToCreate.push({
            type: LogType.TODO_ITEM_PARTICIPANT_DISCONNECTED,
            userId: req.user.id,
            ip: req.ip || req.headers["x-forwarded-for"],
            data: { participantRegistrationIds: participantsDisconnected },
          });
        }
      }

      if (hasCrmChanges) {
        if (crmConnected.length > 0) {
          logsToCreate.push({
            type: LogType.TODO_ITEM_CRM_PERSON_CONNECTED,
            userId: req.user.id,
            ip: req.ip || req.headers["x-forwarded-for"],
            data: { crmPersonIds: crmConnected },
          });
        }
        if (crmDisconnected.length > 0) {
          logsToCreate.push({
            type: LogType.TODO_ITEM_CRM_PERSON_DISCONNECTED,
            userId: req.user.id,
            ip: req.ip || req.headers["x-forwarded-for"],
            data: { crmPersonIds: crmDisconnected },
          });
        }
      }

      // Build update data explicitly to support M:N set operations
      const updateData = {
        ...(typeof data.title !== "undefined" ? { title: data.title } : {}),
        ...(typeof data.content !== "undefined" ? { content: data.content } : {}),
        ...(typeof data.status !== "undefined" ? { status: data.status } : {}),
        ...(Array.isArray(data.volunteerRegistrationIds)
          ? {
              VolunteerRegistration: {
                set: data.volunteerRegistrationIds.map((id) => ({ id })),
              },
            }
          : {}),
        ...(Array.isArray(data.participantRegistrationIds)
          ? {
              Registration: {
                set: data.participantRegistrationIds.map((id) => ({ id })),
              },
            }
          : {}),
        ...(Array.isArray(data.sessionIds)
          ? { Session: { set: data.sessionIds.map((id) => ({ id })) } }
          : {}),
        ...(Array.isArray(data.conversationIds)
          ? {
              Conversation: {
                set: data.conversationIds.map((id) => ({ id })),
              },
            }
          : {}),
        ...(Array.isArray(data.crmPersonIds)
          ? {
              CrmPerson: {
                set: data.crmPersonIds.map((id) => ({ id })),
              },
            }
          : {}),
        // Only log a generic UPDATED for field/other association changes.
        // For volunteer diffs, emit specific CONNECTED/DISCONNECTED entries.
        logs: {
          create: [
            ...logsToCreate,
            ...(statusChanged
              ? [
                  {
                    type: LogType.TODO_ITEM_STATUS_CHANGED,
                    userId: req.user.id,
                    ip: req.ip || req.headers["x-forwarded-for"],
                    data: { from: existing.status, to: data.status },
                  },
                ]
              : []),
          ],
        },
      };

      const updated = await prisma.todoItem.update({
        where: { id: req.params.todoId },
        data: updateData,
        include: {
          comments: {
            include: { files: true },
            orderBy: { createdAt: "desc" },
          },
          logs: {
            orderBy: { createdAt: "desc" },
          },
          VolunteerRegistration: { select: { id: true } },
          Registration: { select: { id: true } },
          Conversation: { select: { id: true } },
          CrmPerson: { select: { id: true } },
        },
      });

      res.json({ todo: updated });
    } catch (e) {
      console.error("[TODO][PUT] Error:", e);
      reportApiError(e, req);
      res.status(500).json({ message: "Error" });
    }
  },
];

export const del = [
  verifyAuth(["manager"]),
  async (req, res) => {
    try {
      const existing = await prisma.todoItem.findUnique({
        where: {
          id: req.params.todoId,
          eventId: req.params.eventId,
          deleted: false,
        },
      });
      if (!existing) return res.status(404).json({ message: "Not found" });

      await prisma.$transaction([
        prisma.logs.create({
          data: {
            type: LogType.TODO_ITEM_DELETED,
            userId: req.user.id,
            ip: req.ip || req.headers["x-forwarded-for"],
            data: { id: existing.id, title: existing.title },
            todoItemId: existing.id,
          },
        }),
        prisma.todoItem.update({
          where: { id: existing.id },
          data: { deleted: true },
        }),
      ]);

      res.json({ ok: true });
    } catch (e) {
      console.error("[TODO][DEL] Error:", e);
      reportApiError(e, req);
      res.status(500).json({ message: "Error" });
    }
  },
];

export const query = [
  (req, res) => {
    return res.json(zerialize(todoUpdateSchema));
  },
];
