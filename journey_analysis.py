# journey_analysis.py
import pandas as pd
import ast
import json
from typing import Dict, Any, List


def parse_sequences_df(df: pd.DataFrame) -> pd.DataFrame:
    """Parse Touchpoint_Sequence into a Python list."""
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
    return df


def build_transitions_df(df: pd.DataFrame) -> pd.DataFrame:
    """
    Build transition table with counts & probabilities.
    Adds a final 'last_step -> Customer' edge for Converted == 1.
    """
    transitions = []
    if df.empty:
        return pd.DataFrame(columns=["from_step", "to_step", "count", "total_from", "probability"])

    for _, row in df.iterrows():
        seq = row["Touchpoint_Sequence"]
        if not isinstance(seq, list) or len(seq) < 1:
            continue

        # normal transitions
        if len(seq) >= 2:
            for i in range(len(seq) - 1):
                transitions.append((seq[i], seq[i + 1]))

        # terminal edge to Customer
        if "Converted" in df.columns and row.get("Converted", 0) == 1:
            last_step = seq[-1]
            transitions.append((last_step, "Customer"))

    if not transitions:
        return pd.DataFrame(columns=["from_step", "to_step", "count", "total_from", "probability"])

    trans_df = pd.DataFrame(transitions, columns=["from_step", "to_step"])
    trans_counts = trans_df.value_counts().reset_index(name="count")
    trans_counts["total_from"] = trans_counts.groupby("from_step")["count"].transform("sum")
    trans_counts["probability"] = trans_counts["count"] / trans_counts["total_from"]
    return trans_counts


def compute_basic_metrics(df: pd.DataFrame, transitions: pd.DataFrame) -> Dict[str, Any]:
    """High-level KPIs + funnel counts."""
    total_leads = len(df)
    conv_rate = float(df["Converted"].mean()) if "Converted" in df.columns and total_leads > 0 else 0.0
    avg_len = df["Touchpoint_Sequence"].apply(
        lambda s: len(s) if isinstance(s, list) else 0
    ).mean()

    labels = ["Lead", "MQL", "SQL", "Opportunity", "Customer"]
    values = [total_leads]

    for stage in ["MQL", "SQL", "Opportunity"]:
        count = df["Touchpoint_Sequence"].apply(
            lambda s: stage in s if isinstance(s, list) else False
        ).sum()
        values.append(int(count))

    customer_count = int(df["Converted"].sum()) if "Converted" in df.columns else 0
    values.append(customer_count)

    return {
        "totalLeads": int(total_leads),
        "conversionRate": conv_rate,
        "averageTouchpoints": float(avg_len),
        "funnel": {"labels": labels, "values": [int(v) for v in values]},
    }


def build_sankey_data(transitions: pd.DataFrame, max_nodes: int = 20) -> Dict[str, Any]:
    """Return Plotly/Angular-ready Sankey data."""
    if transitions.empty:
        return {"labels": [], "links": []}

    top_nodes = (
        transitions.groupby("from_step")["count"]
        .sum()
        .sort_values(ascending=False)
        .head(max_nodes)
        .index
        .tolist()
    )

    df_f = transitions[
        transitions["from_step"].isin(top_nodes)
        & transitions["to_step"].isin(top_nodes + ["Customer"])
    ].copy()

    labels = sorted(set(df_f["from_step"]).union(set(df_f["to_step"])))
    idx = {n: i for i, n in enumerate(labels)}

    links: List[Dict[str, Any]] = []
    for _, row in df_f.iterrows():
        links.append(
            {
                "source": idx[row["from_step"]],
                "target": idx[row["to_step"]],
                "value": int(row["count"]),
                "probability": float(row["probability"]),
                "toCustomer": row["to_step"] == "Customer",
            }
        )

    return {"labels": labels, "links": links}


def build_markov_edges(transitions: pd.DataFrame, max_edges: int = 80) -> List[Dict[str, Any]]:
    """Return edges with probabilities for a Markov graph."""
    if transitions.empty:
        return []

    df_top = transitions.sort_values("count", ascending=False).head(max_edges)
    edges = []
    for _, row in df_top.iterrows():
        edges.append(
            {
                "from": row["from_step"],
                "to": row["to_step"],
                "count": int(row["count"]),
                "probability": float(row["probability"]),
            }
        )
    return edges


def build_journey_length_hist(df: pd.DataFrame) -> Dict[str, Any]:
    lengths = df["Touchpoint_Sequence"].apply(lambda s: len(s) if isinstance(s, list) else 0)
    hist = lengths.value_counts().sort_index()
    return {"lengths": hist.index.tolist(), "counts": hist.values.astype(int).tolist()}


def build_top_journeys(df: pd.DataFrame, top_n: int = 10) -> List[Dict[str, Any]]:
    if df.empty:
        return []
    seq_strings = df["Touchpoint_Sequence"].apply(
        lambda s: " → ".join(s) if isinstance(s, list) else ""
    )
    counts = seq_strings.value_counts().head(top_n)
    rows = []
    for journey, cnt in counts.items():
        rows.append({"journey": journey, "count": int(cnt)})
    return rows


def build_next_best_step(transitions: pd.DataFrame) -> List[Dict[str, Any]]:
    """For each from_step, return the most likely to_step + probability."""
    if transitions.empty:
        return []
    records = []
    for step, grp in transitions.groupby("from_step"):
        best = grp.sort_values("probability", ascending=False).iloc[0]
        records.append(
            {
                "from": step,
                "bestNext": best["to_step"],
                "probability": float(best["probability"]),
            }
        )
    return records
