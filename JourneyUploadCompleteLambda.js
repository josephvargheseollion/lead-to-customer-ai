// JourneyUploadCompleteLambda.js
import {
  S3Client,
  CompleteMultipartUploadCommand,
  AbortMultipartUploadCommand,
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
  console.log("JourneyUploadCompleteLambda - Invocation Start");
  console.log("====================================================================");

  console.log("[INFO] Incoming AWS Event:");
  console.log(JSON.stringify(event, null, 2));

  const startTime = Date.now();

  try {
    // ---------------------------------------------------------------------
    // Parse and validate input
    // ---------------------------------------------------------------------
    console.log("[INFO] Parsing request body...");
    const body = parseBody(event);
    console.log("[INFO] Parsed body:", JSON.stringify(body, null, 2));

    const { filename, uploadId, parts } = body;

    if (!filename) console.error("[ERROR] Missing parameter: filename");
    if (!uploadId) console.error("[ERROR] Missing parameter: uploadId");
    if (!parts || !Array.isArray(parts)) console.error("[ERROR] Missing/invalid parameter: parts");

    if (!filename || !uploadId || !Array.isArray(parts) || parts.length === 0) {
      console.warn("[WARN] Invalid or incomplete request payload received.");

      return {
        statusCode: 400,
        headers: { "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({
          message: "filename, uploadId and non-empty parts array are required",
          received: body,
        }),
      };
    }

    // ---------------------------------------------------------------------
    // Prepare sanitized S3 key
    // ---------------------------------------------------------------------
    const key = sanitizeKey(filename);
    console.log(`[INFO] Original filename: ${filename}`);
    console.log(`[INFO] Sanitized S3 key: ${key}`);
    console.log(`[INFO] UploadId: ${uploadId}`);
    console.log(`[INFO] Incoming parts count: ${parts.length}`);

    // ---------------------------------------------------------------------
    // Sort parts
    // ---------------------------------------------------------------------
    const sortedParts = [...parts].sort((a, b) => a.PartNumber - b.PartNumber);
    console.log("[INFO] Sorted parts for completion:");
    console.log(JSON.stringify(sortedParts, null, 2));

    // ---------------------------------------------------------------------
    // Execute multipart completion
    // ---------------------------------------------------------------------
    console.log("[INFO] Sending CompleteMultipartUploadCommand to S3...");

    const completeCommand = new CompleteMultipartUploadCommand({
      Bucket: BUCKET,
      Key: key,
      UploadId: uploadId,
      MultipartUpload: { Parts: sortedParts },
    });

    let completeResponse;
    try {
      completeResponse = await s3.send(completeCommand);
    } catch (s3err) {
      console.error("[ERROR] S3 CompleteMultipartUpload failed:", s3err);
      throw s3err;
    }

    console.log("[INFO] Multipart upload completed successfully.");
    console.log("[INFO] S3 Completion Response:");
    console.log(JSON.stringify(completeResponse, null, 2));

    const durationMs = Date.now() - startTime;
    console.log(`[INFO] Upload Completion Duration: ${durationMs} ms`);
    console.log("====================================================================");
    console.log("JourneyUploadCompleteLambda - Invocation Complete (Success)");
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
        message: "Multipart upload completed successfully",
        location: completeResponse.Location,
        bucket: BUCKET,
        key: key,
        etag: completeResponse.ETag,
        durationMs,
      }),
    };
  } catch (err) {
    // ---------------------------------------------------------------------
    // Main Error Handling
    // ---------------------------------------------------------------------
    console.error("[ERROR] Uncaught error during multipart completion:");
    console.error(err);

    // ---------------------------------------------------------------------
    // Attempt abort
    // ---------------------------------------------------------------------
    try {
      const body = parseBody(event);

      if (body && body.uploadId && body.filename) {
        const abortKey = sanitizeKey(body.filename);
        console.warn("[WARN] Attempting to abort multipart upload due to failure...");
        console.warn(`[WARN] Abort Key: ${abortKey}, UploadId: ${body.uploadId}`);

        await s3.send(
          new AbortMultipartUploadCommand({
            Bucket: BUCKET,
            Key: abortKey,
            UploadId: body.uploadId,
          })
        );

        console.warn("[WARN] Multipart upload aborted successfully.");
      }
    } catch (abortErr) {
      console.error("[ERROR] Failed to abort multipart upload:");
      console.error(abortErr);
    }

    const durationMs = Date.now() - startTime;
    console.log(`[INFO] Failure Duration: ${durationMs} ms`);
    console.log("====================================================================");
    console.log("JourneyUploadCompleteLambda - Invocation Complete (Error)");
    console.log("====================================================================");

    return {
      statusCode: 500,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({
        message: "Failed to complete multipart upload",
        error: err.message,
        stack: err.stack,
        durationMs,
      }),
    };
  }
};
