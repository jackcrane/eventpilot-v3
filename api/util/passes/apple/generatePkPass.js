// eslint-disable no-unused-vars

// pkpass-gen/index.js
import fs from "fs";
import path from "path";
import crypto from "crypto";
import archiver from "archiver";
import forge from "node-forge";
import child_process from "child_process";
import { fileURLToPath } from "url";

// 1) __dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 2) assets folder next to this file
const ASSETS_DIR = path.join(__dirname, "assets");

const PASS_TYPE_ID = "pass.com.geteventpilot";
const TEAM_ID = "2LXR6KM7AB";
const CERT_PATH = path.join(__dirname, "certs", "pass-cert.pem");
const KEY_PATH = path.join(__dirname, "certs", "pass-key.pem");
const WWDR_PATH = path.join(__dirname, "certs", "wwdr.pem");
const PASSES_DIR = path.join(__dirname, "passes");

const generateManifest = (files) => {
  const manifest = {};
  for (const file of files) {
    const data = fs.readFileSync(file.fullPath);
    const hash = crypto.createHash("sha1").update(data).digest("hex");
    manifest[file.name] = hash;
  }
  return manifest;
};

const signManifest = (manifestPath, outputPath) => {
  const pkcs7Path = outputPath.replace(/\.pkpass$/, ".sig");
  child_process.execSync(
    `openssl smime -binary -sign -certfile ${WWDR_PATH} -signer ${CERT_PATH} -inkey ${KEY_PATH} -in ${manifestPath} -out ${pkcs7Path} -outform DER`
  );
  return pkcs7Path;
};

export const createPass = async (passData, outputPath) => {
  if (!outputPath) {
    outputPath = path.join(PASSES_DIR, `${passData.serialNumber}.pkpass`);
  }
  const tmpDir = fs.mkdtempSync("passgen-");
  const files = [];

  // Write pass.json
  const passJsonPath = path.join(tmpDir, "pass.json");
  fs.writeFileSync(passJsonPath, JSON.stringify(passData, null, 2));
  files.push({ name: "pass.json", fullPath: passJsonPath });

  // Copy images
  for (const file of ["icon.png", "logo.png"]) {
    const src = path.join(ASSETS_DIR, file);
    const dest = path.join(tmpDir, file);
    fs.copyFileSync(src, dest);
    files.push({ name: file, fullPath: dest });
  }

  // Create manifest
  const manifest = generateManifest(files);
  const manifestPath = path.join(tmpDir, "manifest.json");
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  files.push({ name: "manifest.json", fullPath: manifestPath });

  // Sign
  const sigPath = signManifest(manifestPath, outputPath);
  files.push({ name: "signature", fullPath: sigPath });

  // Create .pkpass
  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(outputPath);
    const archive = archiver("zip");
    archive.pipe(output);
    for (const f of files) archive.file(f.fullPath, { name: f.name });
    archive.finalize();

    output.on("close", () => {
      // clean up your tmpDir and signature
      fs.rmSync(tmpDir, { recursive: true, force: true });
      fs.unlinkSync(sigPath);
      resolve(outputPath);
    });
  });
};

export const samplePass = {
  formatVersion: 1,
  passTypeIdentifier: PASS_TYPE_ID,
  teamIdentifier: TEAM_ID,
  serialNumber: "XYZ-123",
  organizationName: "John Crane",
  description: "Demo pass",
  foregroundColor: "rgb(255, 255, 255)",
  backgroundColor: "rgb(0, 122, 255)",
  logoText: "DEMO",
  webServiceURL: "http://bore.pub:11278",
  authenticationToken: "secret-token",
  generic: {
    primaryFields: [
      {
        key: "title",
        label: "Title",
        value: "My Pass",
      },
    ],
    secondaryFields: [
      {
        key: "subtitle",
        label: "Subtitle",
        value: "Details here",
      },
    ],
  },
};

// Run generator
// createPass(samplePass, path.join(PASSES_DIR, "demo.pkpass"))
//   .then(() => console.log("Pass created!"))
//   .catch(console.error);
