import json
import time
import traceback
import logging
import boto3
from io import StringIO
import pandas as pd

from journey_analysis import (
    parse_sequences_df,
    build_transitions_df,
    compute_basic_metrics,
    build_sankey_data,
    build_markov_edges,
    build_journey_length_hist,
    build_top_journeys,
    build_next_best_step,
)

# ----------------------------------------------------------------------
# Logging
# ----------------------------------------------------------------------
logger = logging.getLogger()
logger.setLevel(logging.INFO)

def log_section(title):
    logger.info("=" * 80)
    logger.info(title)
    logger.info("=" * 80)


# ----------------------------------------------------------------------
# Lambda Handler
# ----------------------------------------------------------------------
def lambda_handler(event, context):
    start_time = time.time()
    log_section("Lambda Handler Invoked")

    try:
        logger.info(f"Incoming event keys: {list(event.keys())}")

        # ----------------------------------------------------------
        # Parse body
        # ----------------------------------------------------------
        raw_body = event.get("body") or "{}"
        is_b64 = event.get("isBase64Encoded", False)

        logger.info(f"Body received, base64 = {is_b64}")

        if is_b64:
            import base64
            raw_body = base64.b64decode(raw_body).decode("utf-8")
            logger.info("Base64 body decoded")

        payload = json.loads(raw_body)
        logger.info(f"Payload keys: {list(payload.keys())}")

        # ----------------------------------------------------------
        # Now expecting S3 bucket + key, not CSV text
        # ----------------------------------------------------------
        bucket = payload.get("bucket")
        key = payload.get("key")
        max_nodes = int(payload.get("maxNodes", 20))

        if not bucket or not key:
            raise ValueError("Missing required 'bucket' or 'key' in request payload.")

        logger.info(f"S3 bucket: {bucket}")
        logger.info(f"S3 key: {key}")
        logger.info(f"maxNodes parameter: {max_nodes}")

        # ----------------------------------------------------------
        # Read CSV file from S3
        # ----------------------------------------------------------
        log_section("Reading CSV from S3")

        s3 = boto3.client("s3")

        try:
            obj = s3.get_object(Bucket=bucket, Key=key)
        except Exception as s3_err:
            logger.error("Failed to get object from S3")
            logger.error(str(s3_err))
            raise

        csv_bytes = obj["Body"].read()
        csv_text = csv_bytes.decode("utf-8")

        if not csv_text.strip():
            raise ValueError("CSV file downloaded from S3 is empty.")

        logger.info(f"Successfully read CSV from S3 ({len(csv_text)} bytes)")

        # ----------------------------------------------------------
        # Convert CSV to dataframe
        # ----------------------------------------------------------
        log_section("Parsing CSV Into DataFrame")

        df_raw = pd.read_csv(StringIO(csv_text))
        logger.info(f"DataFrame loaded: rows={df_raw.shape[0]}, cols={df_raw.shape[1]}")

        # ----------------------------------------------------------
        # Parse sequences
        # ----------------------------------------------------------
        log_section("Parsing Touchpoint Sequences")

        df = parse_sequences_df(df_raw)
        logger.info("Parsed sequences. Example rows:")
        logger.info(df.head(3).to_string())

        # ----------------------------------------------------------
        # Transitions
        # ----------------------------------------------------------
        log_section("Building Transitions")

        transitions = build_transitions_df(df)
        logger.info(f"Transitions computed: {transitions.shape[0]} rows")

        # ----------------------------------------------------------
        # Metrics
        # ----------------------------------------------------------
        log_section("Computing Metrics")

        metrics = compute_basic_metrics(df, transitions)
        logger.info(f"Metrics result: {metrics}")

        # ----------------------------------------------------------
        # Sankey
        # ----------------------------------------------------------
        log_section("Building Sankey Data")

        sankey = build_sankey_data(transitions, max_nodes=max_nodes)
        logger.info(f"Sankey labels={len(sankey.get('labels', []))}, links={len(sankey.get('links', []))}")

        # ----------------------------------------------------------
        # Markov Edges
        # ----------------------------------------------------------
        log_section("Building Markov Edges")

        markov_edges = build_markov_edges(transitions)
        logger.info(f"Markov edges count: {len(markov_edges)}")

        # ----------------------------------------------------------
        # Journey Length Histogram
        # ----------------------------------------------------------
        log_section("Building Journey Length Histogram")

        length_hist = build_journey_length_hist(df)
        logger.info(f"Histogram bins: {length_hist}")

        # ----------------------------------------------------------
        # Top Journeys
        # ----------------------------------------------------------
        log_section("Computing Top Journeys")

        top_journeys = build_top_journeys(df)
        logger.info(f"Top journeys count: {len(top_journeys)}")

        # ----------------------------------------------------------
        # Next Best Step
        # ----------------------------------------------------------
        log_section("Computing Next Best Step Map")

        nba = build_next_best_step(transitions)
        logger.info(f"Next-best-step entries count: {len(nba)}")

        # ----------------------------------------------------------
        # Final Response
        # ----------------------------------------------------------
        total_ms = round((time.time() - start_time) * 1000, 2)
        logger.info(f"Total execution time: {total_ms} ms")

        response = {
            "metrics": metrics,
            "sankey": sankey,
            "markovEdges": markov_edges,
            "journeyLengths": length_hist,
            "topJourneys": top_journeys,
            "nextBestStep": nba,
            "executionMs": total_ms,
        }
        # ----------------------------------------------------------
        # Write results JSON to S3
        # ----------------------------------------------------------
        log_section("Writing JSON results back to S3")

        result_bucket = bucket   # or choose another bucket
        result_key = key + ".analytics.json"

        try:
            s3.put_object(
                Bucket=result_bucket,
                Key=result_key,
                Body=json.dumps(response, indent=2),
                ContentType="application/json"
            )
            logger.info(f"Analytics JSON written to s3://{result_bucket}/{result_key}")
        except Exception as write_err:
            logger.error("Failed to write analytics JSON to S3")
            logger.error(str(write_err))
        return {
            "statusCode": 200,
            "headers": {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
            },
            "body": json.dumps(response),
        }

    except Exception as e:
        logger.error("Exception occurred in main handler")
        logger.error(str(e))
        logger.error(traceback.format_exc())

        return {
            "statusCode": 500,
            "headers": {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
            },
            "body": json.dumps({
                "error": str(e),
                "trace": traceback.format_exc(),
            }),
        }
