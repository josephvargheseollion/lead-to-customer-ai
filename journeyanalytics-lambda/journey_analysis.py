# journey_analysis.py
import pandas as pd
import ast
import json
import logging
from typing import Dict, Any, List

# Logging configuration
logger = logging.getLogger()
logger.setLevel(logging.INFO)


def log_section(title: str):
    logger.info("=" * 70)
    logger.info(title)
    logger.info("=" * 70)


# ============================================================
# PARSE SEQUENCES
# ============================================================
def parse_sequences_df(df: pd.DataFrame) -> pd.DataFrame:
    """Parse Touchpoint_Sequence into a Python list."""
    log_section("parse_sequences_df")

    logger.info(f"Incoming dataframe shape: {df.shape}")
    logger.info(f"Columns: {list(df.columns)}")

    def parse_seq(x):
        if isinstance(x, list):
            return x
        if not isinstance(x, str) or x.strip() == "":
            return []
        s = x.strip()

        # JSON
        try:
            return json.loads(s)
        except Exception:
            pass

        # Python list literal
        try:
            return ast.literal_eval(s)
        except Exception:
            pass

        # Comma separated
        if "," in s:
            return [item.strip() for item in s.split(",")]

        return [s]

    df = df.copy()
    df["Touchpoint_Sequence"] = df["Touchpoint_Sequence"].apply(parse_seq)

    logger.info("Sample parsed sequences:")
    logger.info(df["Touchpoint_Sequence"].head(3).to_string())

    return df


# ============================================================
# BUILD TRANSITIONS
# ============================================================
def build_transitions_df(df: pd.DataFrame) -> pd.DataFrame:
    """
    Build transition table with counts & probabilities.
    Adds a final 'last_step -> Customer' edge for Converted == 1.
    """
    log_section("build_transitions_df")

    transitions = []
    if df.empty:
        logger.warning("Dataframe is empty. No transitions.")
        return pd.DataFrame(columns=["from_step", "to_step", "count", "total_from", "probability"])

    logger.info(f"Rows to process: {len(df)}")

    for _, row in df.iterrows():
        seq = row["Touchpoint_Sequence"]

        if not isinstance(seq, list) or len(seq) == 0:
            continue

        # Multi-step transitions
        if len(seq) >= 2:
            for i in range(len(seq) - 1):
                transitions.append((seq[i], seq[i + 1]))

        # Conversion edge
        if "Converted" in df.columns and row.get("Converted", 0) == 1:
            last_step = seq[-1]
            transitions.append((last_step, "Customer"))

    if not transitions:
        logger.warning("No transitions could be generated.")
        return pd.DataFrame(columns=["from_step", "to_step", "count", "total_from", "probability"])

    trans_df = pd.DataFrame(transitions, columns=["from_step", "to_step"])
    logger.info(f"Total raw transitions: {len(trans_df)}")

    trans_counts = trans_df.value_counts().reset_index(name="count")
    trans_counts["total_from"] = trans_counts.groupby("from_step")["count"].transform("sum")
    trans_counts["probability"] = trans_counts["count"] / trans_counts["total_from"]

    logger.info("Sample transitions:")
    logger.info(trans_counts.head(5).to_string())

    return trans_counts


# ============================================================
# BASIC METRICS
# ============================================================
def compute_basic_metrics(df: pd.DataFrame, transitions: pd.DataFrame) -> Dict[str, Any]:
    """High-level KPIs + funnel counts."""
    log_section("compute_basic_metrics")

    total_leads = len(df)
    conv_rate = float(df["Converted"].mean()) if "Converted" in df.columns else 0.0

    avg_len = df["Touchpoint_Sequence"].apply(
        lambda s: len(s) if isinstance(s, list) else 0
    ).mean()

    logger.info(f"Total leads: {total_leads}")
    logger.info(f"Conversion rate: {conv_rate:.4f}")
    logger.info(f"Average journey length: {avg_len:.2f}")

    # Funnel
    labels = ["Lead", "MQL", "SQL", "Opportunity", "Customer"]
    values = [total_leads]

    for stage in ["MQL", "SQL", "Opportunity"]:
        count = df["Touchpoint_Sequence"].apply(
            lambda s: stage in s if isinstance(s, list) else False
        ).sum()
        values.append(int(count))
        logger.info(f"{stage} count: {count}")

    customer_count = int(df["Converted"].sum()) if "Converted" in df.columns else 0
    values.append(customer_count)

    logger.info(f"Customer count: {customer_count}")

    return {
        "totalLeads": int(total_leads),
        "conversionRate": conv_rate,
        "averageTouchpoints": float(avg_len),
        "funnel": {"labels": labels, "values": [int(v) for v in values]},
    }


# ============================================================
# SANKEY DATA
# ============================================================
def build_sankey_data(transitions: pd.DataFrame, max_nodes: int = 20, max_links: int = 40) -> Dict[str, Any]:
    """Return Plotly/Angular-ready Sankey data (downsampled for performance)."""
    log_section("build_sankey_data")

    if transitions.empty:
        logger.warning("Transitions empty — Sankey will return no data.")
        return {"labels": [], "links": []}

    logger.info(f"Total transitions before filtering: {len(transitions)}")
    logger.info(f"max_nodes = {max_nodes}, max_links = {max_links}")

    # ----------------------------------------------------------
    # 1) Limit to top-N nodes (as before)
    # ----------------------------------------------------------
    top_nodes = (
        transitions.groupby("from_step")["count"]
        .sum()
        .sort_values(ascending=False)
        .head(max_nodes)
        .index
        .tolist()
    )
    logger.info(f"Top nodes: {top_nodes}")

    df_filtered = transitions[
        transitions["from_step"].isin(top_nodes)
        & transitions["to_step"].isin(top_nodes + ["Customer"])
    ]

    logger.info(f"Transitions after node filter: {len(df_filtered)}")

    # ----------------------------------------------------------
    # 2) Limit to top-N transitions by count
    # ----------------------------------------------------------
    df_limited = df_filtered.sort_values("count", ascending=False).head(max_links)
    logger.info(f"Transitions after link limit: {len(df_limited)}")

    # ----------------------------------------------------------
    # 3) Build label list
    # ----------------------------------------------------------
    labels = sorted(set(df_limited["from_step"]).union(df_limited["to_step"]))
    idx = {n: i for i, n in enumerate(labels)}

    logger.info(f"Final number of labels: {len(labels)}")

    # ----------------------------------------------------------
    # 4) Build Sankey link list
    # ----------------------------------------------------------
    links = []
    for _, row in df_limited.iterrows():
        links.append({
            "source": idx[row["from_step"]],
            "target": idx[row["to_step"]],
            "value": int(row["count"]),
            "probability": float(row["probability"]),
            "toCustomer": row["to_step"] == "Customer",
        })

    logger.info(f"Final number of Sankey links: {len(links)}")

    return {"labels": labels, "links": links}



# ============================================================
# MARKOV
# ============================================================
def build_markov_edges(transitions: pd.DataFrame, max_edges: int = 80) -> List[Dict[str, Any]]:
    """Return edges with probabilities for a Markov graph."""
    log_section("build_markov_edges")

    if transitions.empty:
        logger.warning("Transitions empty — no Markov edges.")
        return []

    df_top = transitions.sort_values("count", ascending=False).head(max_edges)
    logger.info(f"Markov edges selected: {len(df_top)}")

    edges = []
    for _, row in df_top.iterrows():
        edges.append({
            "from": row["from_step"],
            "to": row["to_step"],
            "count": int(row["count"]),
            "probability": float(row["probability"]),
        })

    return edges


# ============================================================
# JOURNEY LENGTH HISTOGRAM
# ============================================================
def build_journey_length_hist(df: pd.DataFrame) -> Dict[str, Any]:
    log_section("build_journey_length_hist")

    lengths = df["Touchpoint_Sequence"].apply(
        lambda s: len(s) if isinstance(s, list) else 0
    )
    hist = lengths.value_counts().sort_index()

    logger.info(f"Histogram bins: {hist.to_dict()}")

    return {
        "lengths": hist.index.tolist(),
        "counts": hist.values.astype(int).tolist(),
    }


# ============================================================
# TOP JOURNEYS
# ============================================================
def build_top_journeys(df: pd.DataFrame, top_n: int = 10) -> List[Dict[str, Any]]:
    log_section("build_top_journeys")

    if df.empty:
        logger.warning("Empty dataframe — no top journeys.")
        return []

    seq_strings = df["Touchpoint_Sequence"].apply(
        lambda s: " → ".join(s) if isinstance(s, list) else ""
    )
    counts = seq_strings.value_counts().head(top_n)

    logger.info("Top journeys:")
    logger.info(counts.to_string())

    rows = [{"journey": journey, "count": int(cnt)} for journey, cnt in counts.items()]
    return rows


# ============================================================
# NEXT BEST STEP
# ============================================================
def build_next_best_step(transitions: pd.DataFrame) -> List[Dict[str, Any]]:
    """For each from_step, return the most likely to_step."""
    log_section("build_next_best_step")

    if transitions.empty:
        logger.warning("Transitions empty — no next-best-step results.")
        return []

    records = []
    for step, grp in transitions.groupby("from_step"):
        best = grp.sort_values("probability", ascending=False).iloc[0]
        records.append({
            "from": step,
            "bestNext": best["to_step"],
            "probability": float(best["probability"]),
        })

    logger.info(f"Next-best-step entries: {len(records)}")

    return records
