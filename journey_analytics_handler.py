# lambda_handler.py
import json
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


def handler(event, context):
    """
    POST /analyze
    Body: { "csv": "<raw CSV text>", "maxNodes": 20 }

    (You can later change to S3 key, etc.)
    """
    try:
        body = event.get("body") or "{}"
        if event.get("isBase64Encoded"):
            import base64
            body = base64.b64decode(body).decode("utf-8")

        payload = json.loads(body)
        csv_text = payload["csv"]
        max_nodes = int(payload.get("maxNodes", 20))

        df_raw = pd.read_csv(StringIO(csv_text))
        df = parse_sequences_df(df_raw)
        transitions = build_transitions_df(df)

        metrics = compute_basic_metrics(df, transitions)
        sankey = build_sankey_data(transitions, max_nodes=max_nodes)
        markov_edges = build_markov_edges(transitions)
        length_hist = build_journey_length_hist(df)
        top_journeys = build_top_journeys(df, top_n=10)
        nba = build_next_best_step(transitions)

        response = {
            "metrics": metrics,
            "sankey": sankey,
            "markovEdges": markov_edges,
            "journeyLengths": length_hist,
            "topJourneys": top_journeys,
            "nextBestStep": nba,
        }

        return {
            "statusCode": 200,
            "headers": {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",  # tighten later
            },
            "body": json.dumps(response),
        }

    except Exception as e:
        return {
            "statusCode": 500,
            "headers": {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
            },
            "body": json.dumps({"error": str(e)}),
        }
