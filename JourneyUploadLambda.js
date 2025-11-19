// JourneyUploadLambda.js
import {
  S3Client,
  CreateMultipartUploadCommand,
  UploadPartCommand,
} from "@aws-sdk/client-s3";

const REGION = "us-east-1";
const BUCKET = "your-journey-files-bucket"; // TODO: update
const s3 = new S3Client({ region: REGION });

// Same sanitizer you had before
function sanitizeKey(name) {
  return name
    .normalize("NFKD")
    .replace(/[^\w.\-]/g, "_") // keep letters, numbers, _, ., -
    .replace(/_+/g, "_")
    .trim();
}

function parseBody(event) {
  if (!event) return {};
  if (typeof event.body === "string") {
    try {
      return JSON.parse(event.body);
    } catch (e) {
      console.error("Failed to parse event.body:", e);
      return {};
    }
  }
  if (typeof event.body === "object" && event.body !== null) {
    return event.body;
  }
  return event;
}

export const handler = async (event) => {
  console.log("===== Incoming Event (JourneyUploadLambda) =====");
  console.log(JSON.stringify(event, null, 2));

  try {
    const body = parseBody(event);
    const { filename, uploadId, partNumber, chunkBase64 } = body;

    console.log("Parsed body:", body);

    if (!filename) {
      console.error("Missing required parameter: filename");
      return {
        statusCode: 400,
        headers: {
          "Access-Control-Allow-Origin": "*",
        },
        body: JSON.stringify({ message: "filename required" }),
      };
    }

    const key = sanitizeKey(filename);
    console.log("Original filename:", filename);
    console.log("Sanitized S3 key:", key);

    // ------------------------------------------------------------------
    // CASE 1: Initiate multipart upload (no uploadId yet)
    // ------------------------------------------------------------------
    if (!uploadId) {
      console.log(`Initiating multipart upload for file: ${key}`);

      const initResponse = await s3.send(
        new CreateMultipartUploadCommand({
          Bucket: BUCKET,
          Key: key,
        })
      );

      console.log("Multipart upload initiated:", initResponse);

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
        }),
      };
    }

    // ------------------------------------------------------------------
    // CASE 2: Upload a part directly (NO presigned URLs)
    // ------------------------------------------------------------------
    if (!partNumber || !chunkBase64) {
      console.error(
        "Missing partNumber or chunkBase64 for upload part. Body:",
        body
      );
      return {
        statusCode: 400,
        headers: { "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({
          message:
            "uploadId, partNumber and chunkBase64 are required for part upload",
        }),
      };
    }

    console.log(
      `Uploading part ${partNumber} for key=${key}, uploadId=${uploadId}`
    );

    const buffer = Buffer.from(chunkBase64, "base64");

    const uploadPartRes = await s3.send(
      new UploadPartCommand({
        Bucket: BUCKET,
        Key: key,
        UploadId: uploadId,
        PartNumber: partNumber,
        Body: buffer,
      })
    );

    console.log("UploadPart response:", uploadPartRes);

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
        eTag: uploadPartRes.ETag,
        partNumber,
      }),
    };
  } catch (err) {
    console.error("Error in JourneyUploadLambda:", err);
    return {
      statusCode: 500,
      headers: {
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({
        message: "Internal server error",
        error: err.message,
        stack: err.stack,
      }),
    };
  }
};
