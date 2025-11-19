// JourneyUploadCompleteLambda.js
import {
  S3Client,
  CompleteMultipartUploadCommand,
  AbortMultipartUploadCommand,
} from "@aws-sdk/client-s3";

const REGION = "us-east-1";
const BUCKET = "your-journey-files-bucket"; // same as above
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
  console.log("===== Incoming Event (JourneyUploadCompleteLambda) =====");
  console.log(JSON.stringify(event, null, 2));

  try {
    const body = parseBody(event);
    const { filename, uploadId, parts } = body;

    console.log("Parsed body:", body);

    if (!filename || !uploadId || !Array.isArray(parts) || parts.length === 0) {
      console.error("Missing or invalid parameters for completion");
      return {
        statusCode: 400,
        headers: {
          "Access-Control-Allow-Origin": "*",
        },
        body: JSON.stringify({
          message:
            "filename, uploadId and non-empty parts array are required",
        }),
      };
    }

    const key = sanitizeKey(filename);
    console.log("Original filename (completion):", filename);
    console.log("Sanitized S3 key (completion):", key);

    const sortedParts = [...parts].sort(
      (a, b) => a.PartNumber - b.PartNumber
    );
    console.log("Sorted parts:", sortedParts);

    const completeCommand = new CompleteMultipartUploadCommand({
      Bucket: BUCKET,
      Key: key,
      UploadId: uploadId,
      MultipartUpload: { Parts: sortedParts },
    });

    const completeResponse = await s3.send(completeCommand);
    console.log("Upload completed successfully:", completeResponse);

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
      }),
    };
  } catch (err) {
    console.error("Error completing multipart upload:", err);

    // Optional abort
    try {
      const body = parseBody(event);
      if (body && body.uploadId && body.filename) {
        const key = sanitizeKey(body.filename);
        console.log("Aborting multipart upload due to error");
        await s3.send(
          new AbortMultipartUploadCommand({
            Bucket: BUCKET,
            Key: key,
            UploadId: body.uploadId,
          })
        );
      }
    } catch (abortErr) {
      console.error("Error aborting multipart upload:", abortErr);
    }

    return {
      statusCode: 500,
      headers: {
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({
        message: "Failed to complete multipart upload",
        error: err.message,
        stack: err.stack,
      }),
    };
  }
};
