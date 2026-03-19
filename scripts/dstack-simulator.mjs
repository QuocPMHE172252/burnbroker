import http from "node:http";
import crypto from "node:crypto";

const PORT = parseInt(process.env.SIMULATOR_PORT || "8090", 10);

const APP_ID = crypto.randomBytes(20).toString("hex");
const INSTANCE_ID = crypto.randomBytes(16).toString("hex");
const DEVICE_ID = crypto.randomBytes(16).toString("hex");

const masterSecret = crypto.randomBytes(32);

function deriveKey(path, purpose = "") {
  return crypto
    .createHmac("sha256", masterSecret)
    .update(`${path}:${purpose}`)
    .digest();
}

function fakeQuote(reportDataHex) {
  const header = Buffer.alloc(48, 0);
  header.writeUInt16LE(4, 0); // version
  header.writeUInt16LE(0x81, 2); // attestation key type (TDX)
  const reportData = Buffer.from(reportDataHex.padEnd(128, "0"), "hex");
  const body = crypto.randomBytes(384);
  reportData.copy(body, 128, 0, 64);
  return Buffer.concat([header, body]).toString("hex");
}

function fakeEventLog() {
  return JSON.stringify([
    { imr: 0, event_type: 1, digest: crypto.randomBytes(48).toString("hex"), event: "DstackBoot", event_payload: "" },
    { imr: 1, event_type: 1, digest: crypto.randomBytes(48).toString("hex"), event: "AppLoaded", event_payload: "" },
    { imr: 3, event_type: 3, digest: crypto.randomBytes(48).toString("hex"), event: "AppStarted", event_payload: "" },
  ]);
}

const routes = {
  "/Info": (_body) => ({
    app_id: APP_ID,
    instance_id: INSTANCE_ID,
    app_cert: "-----BEGIN CERTIFICATE-----\nSIMULATOR\n-----END CERTIFICATE-----",
    tcb_info: JSON.stringify({
      mrtd: crypto.randomBytes(48).toString("hex"),
      rtmr0: crypto.randomBytes(48).toString("hex"),
      rtmr1: crypto.randomBytes(48).toString("hex"),
      rtmr2: crypto.randomBytes(48).toString("hex"),
      rtmr3: crypto.randomBytes(48).toString("hex"),
      mr_aggregated: crypto.randomBytes(48).toString("hex"),
      os_image_hash: crypto.randomBytes(32).toString("hex"),
      compose_hash: crypto.randomBytes(32).toString("hex"),
      device_id: DEVICE_ID,
      event_log: JSON.parse(fakeEventLog()),
    }),
    app_name: "burnbroker-simulator",
    device_id: DEVICE_ID,
    mr_aggregated: crypto.randomBytes(48).toString("hex"),
    os_image_hash: crypto.randomBytes(32).toString("hex"),
    key_provider_info: "simulator-kms",
    compose_hash: crypto.randomBytes(32).toString("hex"),
  }),

  "/GetKey": (body) => {
    const { path = "", purpose = "" } = body;
    const key = deriveKey(path, purpose);
    const sigChain = [crypto.randomBytes(64).toString("hex")];
    return { key: key.toString("hex"), signature_chain: sigChain };
  },

  "/GetQuote": (body) => {
    const { report_data = "" } = body;
    return {
      quote: fakeQuote(report_data),
      event_log: fakeEventLog(),
      report_data,
    };
  },

  "/Attest": (body) => {
    const { report_data = "" } = body;
    const quote = fakeQuote(report_data);
    return { attestation: quote };
  },

  "/Version": () => ({ version: "0.5.8-simulator", rev: "simulator" }),

  "/EmitEvent": () => ({}),
};

const server = http.createServer((req, res) => {
  let data = "";
  req.on("data", (chunk) => (data += chunk));
  req.on("end", () => {
    const handler = routes[req.url];
    if (!handler) {
      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: `Unknown route: ${req.url}` }));
      return;
    }
    try {
      const body = data ? JSON.parse(data) : {};
      const result = handler(body);
      const json = JSON.stringify(result);
      res.writeHead(200, {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(json),
      });
      res.end(json);
    } catch (err) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: err.message }));
    }
  });
});

server.listen(PORT, () => {
  console.log(`[dstack-simulator] Running on http://localhost:${PORT}`);
  console.log(`[dstack-simulator] Set DSTACK_SIMULATOR_ENDPOINT=http://localhost:${PORT}`);
  console.log(`[dstack-simulator] App ID: ${APP_ID}`);
  console.log(`[dstack-simulator] Endpoints: /Info, /GetKey, /GetQuote, /Attest, /Version`);
});
