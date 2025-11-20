// JourneyUploadLambda.js
import {
  S3Client,
  CreateMultipartUploadCommand,
  UploadPartCommand,
} from "@aws-sdk/client-s3";

const REGION = "us-east-1";
const BUCKET = "ollion-customer-journey-data-files";

const s3 = new S3Client({ region: REGION });

function sanitizeKey(name) {
  return name
    .normalize("NFKD")
    .replace(/[^\w.\-]/g, "_")
    .replace(/_+/g, "_")
    .trim();
}

function parseBody(event) {
  if (!event) return {};
  if (typeof event.body === "string") {
    try {
      return JSON.parse(event.body);
    } catch (e) {
      console.error("[ERROR] Failed to parse event.body:", e);
      return {};
    }
  }
  if (typeof event.body === "object" && event.body !== null) {
    return event.body;
  }
  return {};
}

export const handler = async (event) => {
  console.log("====================================================================");
  console.log("JourneyUploadLambda - Invocation Start");
  console.log("====================================================================");

  console.log("[INFO] Incoming AWS Event:");
  console.log(JSON.stringify(event, null, 2));

  const startTime = Date.now();

  try {
    // ---------------------------------------------------------------------
    // Parse request body
    // ---------------------------------------------------------------------
    console.log("[INFO] Parsing incoming request...");
    const body = parseBody(event);
    console.log("[INFO] Parsed request body:");
    console.log(JSON.stringify(body, null, 2));

    const { filename, uploadId, partNumber, chunkBase64 } = body;

    // ---------------------------------------------------------------------
    // Validate filename
    // ---------------------------------------------------------------------
    if (!filename) {
      console.error("[ERROR] Missing required parameter: filename");

      return {
        statusCode: 400,
        headers: { "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ message: "filename is required" }),
      };
    }

    const key = sanitizeKey(filename);
    console.log(`[INFO] Original filename: ${filename}`);
    console.log(`[INFO] Sanitized S3 key: ${key}`);

    // ---------------------------------------------------------------------
    // CASE 1: Initiate Multipart Upload
    // ---------------------------------------------------------------------
    if (!uploadId) {
      console.log("[INFO] No uploadId detected. Starting new multipart upload...");
      console.log(`[INFO] Initiating upload for key: ${key}`);

      let initResponse;
      try {
        initResponse = await s3.send(
          new CreateMultipartUploadCommand({
            Bucket: BUCKET,
            Key: key,
          })
        );
      } catch (s3err) {
        console.error("[ERROR] Failed to initiate multipart upload via S3:");
        console.error(s3err);

        return {
          statusCode: 500,
          headers: { "Access-Control-Allow-Origin": "*" },
          body: JSON.stringify({
            message: "Failed to initiate multipart upload",
            error: s3err.message,
            stack: s3err.stack,
          }),
        };
      }

      console.log("[INFO] Multipart upload initiated successfully:");
      console.log(JSON.stringify(initResponse, null, 2));

      const durationMs = Date.now() - startTime;
      console.log(`[INFO] Multipart Initiation Duration: ${durationMs} ms`);
      console.log("====================================================================");
      console.log("JourneyUploadLambda - Invocation Complete (Init Success)");
      console.log("====================================================================");

      return {
        statusCode: 200,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "OPTIONS,POST",
          "Access-Control-Allow-Headers":
            "Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token",
        },
        body: JSON.stringify({
          uploadId: initResponse.UploadId,
          bucket: BUCKET,
          key,
          message: "Multipart upload initiated successfully",
          durationMs,
        }),
      };
    }

    // ---------------------------------------------------------------------
    // CASE 2: Upload Part
    // ---------------------------------------------------------------------
    console.log("[INFO] UploadId provided. Uploading part...");

    if (!partNumber) {
      console.error("[ERROR] Missing parameter: partNumber");
      return {
        statusCode: 400,
        headers: { "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({
          message: "partNumber is required for upload part",
        }),
      };
    }

    if (!chunkBase64) {
      console.error("[ERROR] Missing parameter: chunkBase64");
      return {
        statusCode: 400,
        headers: { "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({
          message: "chunkBase64 is required for upload part",
        }),
      };
    }

    console.log(
      `[INFO] Uploading part ${partNumber} for key: ${key}, uploadId: ${uploadId}`
    );

    const buffer = Buffer.from(chunkBase64, "base64");
    console.log(`[INFO] Chunk size: ${buffer.length} bytes`);

    let uploadPartRes;
    try {
      uploadPartRes = await s3.send(
        new UploadPartCommand({
          Bucket: BUCKET,
          Key: key,
          UploadId: uploadId,
          PartNumber: partNumber,
          Body: buffer,
        })
      );
    } catch (s3err) {
      console.error("[ERROR] S3 UploadPart operation failed:");
      console.error(s3err);

      return {
        statusCode: 500,
        headers: { "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({
          message: `Failed to upload part ${partNumber}`,
          error: s3err.message,
          stack: s3err.stack,
        }),
      };
    }

    console.log("[INFO] Part uploaded successfully.");
    console.log("[INFO] UploadPart Response:");
    console.log(JSON.stringify(uploadPartRes, null, 2));

    const durationMs = Date.now() - startTime;
    console.log(`[INFO] Part Upload Duration: ${durationMs} ms`);
    console.log("====================================================================");
    console.log("JourneyUploadLambda - Invocation Complete (Part Success)");
    console.log("====================================================================");

    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "OPTIONS,POST",
        "Access-Control-Allow-Headers":
          "Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token",
      },
      body: JSON.stringify({
        message: `Part ${partNumber} uploaded successfully`,
        partNumber,
        eTag: uploadPartRes.ETag,
        durationMs,
      }),
    };
  } catch (err) {
    // ---------------------------------------------------------------------
    // GLOBAL CATCH BLOCK
    // ---------------------------------------------------------------------
    console.error("[ERROR] Uncaught exception during upload process:");
    console.error(err);

    const durationMs = Date.now() - startTime;

    console.log("====================================================================");
    console.log("JourneyUploadLambda - Invocation Complete (Error)");
    console.log("====================================================================");

    return {
      statusCode: 500,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({
        message: "Internal server error during upload",
        error: err.message,
        stack: err.stack,
        durationMs,
      }),
    };
  }
};
