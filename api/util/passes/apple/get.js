// eslint-disable no-unused-vars

import fs from "fs";
import path from "path";
import { createPass, samplePass } from "./generatePkPass";

const registeredDevices = new Map(); // In-memory store for demo

export const registerDevice = async (req, res) => {
  const { deviceLibraryIdentifier, passTypeIdentifier, serialNumber } =
    req.params;
  const { authenticationToken } = req.headers;

  // You should validate auth token in production
  const deviceKey = `${deviceLibraryIdentifier}:${serialNumber}`;
  registeredDevices.set(deviceKey, { passTypeIdentifier, serialNumber });
  res.status(201).send(); // Created
};

export const getUpdatedSerials = async (req, res) => {
  const { deviceLibraryIdentifier, passTypeIdentifier } = req.params;
  const passesUpdatedSince = req.query.passesUpdatedSince;

  // Always return 1 serial for demo
  const serialNumbers = ["XYZ-123"];

  res.json({
    lastUpdated: new Date().toISOString(),
    serialNumbers,
  });
};

export const generateUpdatedPass = async (req, res, next) => {
  try {
    const passPath = await createPass(samplePass);
    console.log("passPath", passPath);

    if (!fs.existsSync(passPath)) {
      return res.status(404).end();
    }

    // 1) Tell the client exactly what this is:
    res.setHeader("Content-Type", "application/vnd.apple.pkpass");

    // 2) Force a download with the .pkpass extension:
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${path.basename(passPath)}"`
    );

    // 3) Stream it out
    res.sendFile(passPath, (err) => {
      if (err) return next(err);
      fs.unlinkSync(passPath);
    });
  } catch (err) {
    next(err);
  }
};
