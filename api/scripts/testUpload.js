import { uploadFile } from "#file";

const b46encode = (str) =>
  Buffer.from(str, "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");

const uf = await uploadFile({
  file: b46encode("test"),
  name: "test.txt",
  contentType: "text/plain",
  contentLength: 4,
});

console.log(uf);
