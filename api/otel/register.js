import process from "node:process";
import { diag, DiagConsoleLogger, DiagLogLevel } from "@opentelemetry/api";
import sdkNode from "@opentelemetry/sdk-node";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import * as otelResources from "@opentelemetry/resources";
import * as prismaInstrumentationModule from "@prisma/instrumentation";
import dotenv from "dotenv";

dotenv.config();

const { NodeSDK } = sdkNode;
const { PrismaInstrumentation } = prismaInstrumentationModule;

const otelDebug = process.env.OTEL_DEBUG === "true";

if (otelDebug) {
  diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.DEBUG);
}

const otelExplicitlyEnabled = process.env.OTEL_ENABLED === "true";
const otelExplicitlyDisabled = process.env.OTEL_ENABLED === "false";
const hasExporterConfig = Boolean(
  process.env.OTEL_EXPORTER_OTLP_ENDPOINT ||
    process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT ||
    process.env.OTEL_TRACES_EXPORTER
);

const otelEnabled =
  process.env.NODE_ENV !== "test" &&
  !otelExplicitlyDisabled &&
  (otelExplicitlyEnabled || hasExporterConfig);

if (!otelEnabled) {
  if (otelDebug) {
    diag.debug("OpenTelemetry disabled for this process");
  }
} else {
  const defaultResourceCandidate =
    typeof otelResources.defaultResource === "function"
      ? otelResources.defaultResource()
      : otelResources.defaultResource;
  const resolvedDefaultResource = await Promise.resolve(
    defaultResourceCandidate || null
  );
  const attributeResource = otelResources.resourceFromAttributes({
    "service.name": process.env.OTEL_SERVICE_NAME || "eventpilot-api",
    "service.namespace": "eventpilot",
    "deployment.environment": process.env.NODE_ENV || "development",
    "service.version": process.env.npm_package_version || "unknown",
  });

  const resource =
    resolvedDefaultResource &&
    typeof resolvedDefaultResource.merge === "function"
      ? resolvedDefaultResource.merge(attributeResource)
      : attributeResource;

  const sdk = new NodeSDK({
    resource,
    instrumentations: [
      getNodeAutoInstrumentations({
        "@opentelemetry/instrumentation-http": {
          ignoreIncomingPaths: ["/healthz"],
        },
        "@opentelemetry/instrumentation-express": {
          requestHook: (span, { req }) => {
            if (req?.id) {
              span.setAttribute("eventpilot.request_id", req.id);
            }
            if (req?.instanceId) {
              span.setAttribute("eventpilot.instance_id", req.instanceId);
            }
          },
        },
      }),
      new PrismaInstrumentation(),
    ],
  });

  try {
    await sdk.start();
    if (otelDebug) {
      diag.debug("OpenTelemetry SDK started");
    }
  } catch (error) {
    console.error("[otel] failed to start SDK", error);
  }

  const shutdown = async () => {
    try {
      await sdk.shutdown();
      if (otelDebug) {
        diag.debug("OpenTelemetry SDK shut down");
      }
    } catch (error) {
      console.error("[otel] failed to shut down SDK", error);
    }
  };

  process.once("SIGTERM", shutdown);
  process.once("SIGINT", shutdown);
}
