import streamlit as st
import streamlit.components.v1 as components
import uuid
import pandas as pd
import ast
import plotly.graph_objects as go
import plotly.express as px
import networkx as nx

st.set_page_config(page_title="Customer Journey Intelligence Demo", layout="wide")

st.title("Customer Journey Intelligence Demo")
st.markdown(
    "Upload a synthetic customer-journey dataset to explore paths, transitions, and AI-style next-step insights."
)

# ----------------------------------------------------
# Helper functions
# ----------------------------------------------------
import streamlit.components.v1 as components
import uuid

def build_sankey_base(transitions: pd.DataFrame) -> go.Figure:
    """
    Creates the base Sankey diagram.

    - Uses top transitions by count (for readability)
    - Ensures all edges that end at 'Customer' are included
    - Colors edges to Customer in green, others in blue
    """
    if transitions.empty:
        return go.Figure()

    # Always keep all Customer edges
    customer_edges = transitions[transitions["to_step"] == "Customer"]

    # Other edges by count
    non_customer = transitions[transitions["to_step"] != "Customer"]
    non_customer_top = non_customer.sort_values("count", ascending=False).head(40)

    df_top = pd.concat([customer_edges, non_customer_top]).drop_duplicates(
        subset=["from_step", "to_step"]
    )

    labels = sorted(set(df_top["from_step"]).union(set(df_top["to_step"])))
    idx = {n: i for i, n in enumerate(labels)}

    sources = [idx[s] for s in df_top["from_step"]]
    targets = [idx[t] for t in df_top["to_step"]]
    values = df_top["count"].tolist()

    # Color edges: green if target is Customer, otherwise blue
    colors = []
    for _, row in df_top.iterrows():
        if row["to_step"] == "Customer":
            colors.append("rgba(0, 150, 0, 0.7)")      # green conversion flow
        else:
            colors.append("rgba(0, 120, 255, 0.25)")   # normal blue flow

    fig = go.Figure(
        go.Sankey(
            arrangement="snap",
            node=dict(
                pad=20,
                thickness=18,
                label=[l.replace("_", " ") for l in labels],
                color="rgba(30, 60, 200, 0.8)",
            ),
            link=dict(
                source=sources,
                target=targets,
                value=values,
                color=colors,
            ),
        )
    )

    fig.update_layout(
        title="Customer Journey Flow (Hover-Enhanced Sankey)",
        font=dict(size=14),
        height=900,
        margin=dict(l=50, r=50, t=50, b=40),
    )

    return fig


def render_sankey_with_css(fig: go.Figure):
    """Render the Sankey with proper bright-yellow hover highlighting."""
    sankey_html = fig.to_html(include_plotlyjs='cdn', full_html=False)
    unique_id = str(uuid.uuid4()).replace("-", "")

    enhanced_html = f"""
    <style>
    /* Base link: keep original color */
    #{unique_id} path.sankey-link {{
        opacity: 0.45;
        stroke: none !important;
        transition: opacity 0.2s ease-in-out, stroke-width 0.2s ease-in-out, stroke 0.2s ease-in-out;
    }}

    /* Hover: add yellow outline + glow but keep original fill */
    #{unique_id} path.sankey-link:hover {{
        opacity: 1.0 !important;
        stroke: yellow !important;
        stroke-width: 4px !important;
        filter: drop-shadow(0 0 6px yellow);
    }}

    /* Fade non-hovered links */
    #{unique_id} path.sankey-link:hover ~ path.sankey-link {{
        opacity: 0.15 !important;
    }}
    </style>

    <div id="{unique_id}">
        {sankey_html}
    </div>
    """

    components.html(enhanced_html, height=950, scrolling=True)



def parse_sequences(df: pd.DataFrame) -> pd.DataFrame:
    """Parse touchpoint sequences from multiple possible formats."""
    import json

    def parse_seq(x):
        if isinstance(x, list):
            return x

        if not isinstance(x, str) or x.strip() == "":
            return []

        s = x.strip()

        # Try JSON
        try:
            return json.loads(s)
        except:
            pass

        # Try Python list
        try:
            return ast.literal_eval(s)
        except:
            pass

        # Try fixing missing brackets or splitting by commas
        if "," in s:
            return [item.strip() for item in s.split(",")]

        # Fallback: single step
        return [s]

    df = df.copy()
    df["Touchpoint_Sequence"] = df["Touchpoint_Sequence"].apply(parse_seq)
    return df


def build_transitions(df: pd.DataFrame) -> pd.DataFrame:
    """
    Build transition table with counts and probabilities.

    In addition to normal step→step transitions, if a row is Converted == 1
    we add a final synthetic transition: last_touchpoint → "Customer".
    """
    transitions = []

    if df.empty:
        return pd.DataFrame(columns=["from_step", "to_step", "count", "total_from", "probability"])

    for _, row in df.iterrows():
        seq = row["Touchpoint_Sequence"]
        if not isinstance(seq, list) or len(seq) < 1:
            continue

        # Normal step-by-step transitions
        if len(seq) >= 2:
            for i in range(len(seq) - 1):
                transitions.append((seq[i], seq[i + 1]))

        # If this lead converted, add a final edge to Customer
        if "Converted" in df.columns and row.get("Converted", 0) == 1:
            last_step = seq[-1]
            transitions.append((last_step, "Customer"))

    trans_df = pd.DataFrame(transitions, columns=["from_step", "to_step"])
    if trans_df.empty:
        return pd.DataFrame(columns=["from_step", "to_step", "count", "total_from", "probability"])

    trans_counts = trans_df.value_counts().reset_index(name="count")
    trans_counts["total_from"] = trans_counts.groupby("from_step")["count"].transform("sum")
    trans_counts["probability"] = trans_counts["count"] / trans_counts["total_from"]
    return trans_counts



def compute_funnel_metrics(df: pd.DataFrame):
    """
    Compute funnel conversion metrics.

    Lead = all rows
    MQL / SQL / Opportunity = presence in the sequence
    Customer = Converted == 1
    """
    total_leads = len(df)
    if total_leads == 0:
        return []

    labels = ["Lead", "MQL", "SQL", "Opportunity", "Customer"]
    values = [total_leads]

    # Mid-funnel stages based on sequence content
    for stage in ["MQL", "SQL", "Opportunity"]:
        count = df["Touchpoint_Sequence"].apply(
            lambda s: stage in s if isinstance(s, list) else False
        ).sum()
        values.append(count)

    # Customer stage based on Converted flag
    if "Converted" in df.columns:
        customer_count = int(df["Converted"].sum())
    else:
        customer_count = 0
    values.append(customer_count)

    return labels, values



def build_sankey_figure(transitions: pd.DataFrame) -> go.Figure:
    """Sankey with hover-highlighting: hovered link turns bright yellow,
    non-hovered links dim. Nodes brighten on hover too."""

    if transitions.empty:
        return go.Figure()

    # ---- Reduce clutter ----
    df_top = transitions.sort_values("count", ascending=False).head(40)

    labels = sorted(set(df_top["from_step"]).union(set(df_top["to_step"])))
    idx = {n: i for i, n in enumerate(labels)}

    sources = [idx[s] for s in df_top["from_step"]]
    targets = [idx[t] for t in df_top["to_step"]]
    values = df_top["count"].tolist()

    max_count = max(values)

    base_colors = [
        f"rgba(100, 140, 240, {0.15 + 0.7*(v/max_count)})"
        for v in values
    ]

    fig = go.Figure(
        go.Sankey(
            arrangement="snap",
            node=dict(
                pad=20,
                thickness=18,
                label=[l.replace("_", " ") for l in labels],
                color="rgba(30, 60, 200, 0.7)",
                hovertemplate="<b>%{label}</b><extra></extra>",
                hoverlabel=dict(
                    bgcolor="rgba(255,255,100,0.9)",
                    font_size=15,
                    font_color="black"
                )
            ),
            link=dict(
                source=sources,
                target=targets,
                value=values,
                color=base_colors,
                customdata=[
                    f"{df_top.iloc[i]['from_step']} → {df_top.iloc[i]['to_step']}"
                    for i in range(len(df_top))
                ],
                hovertemplate="<b>%{customdata}</b><br>"
                              "Volume: %{value}<extra></extra>",
                hoverlabel=dict(
                    bgcolor="yellow",
                    font_size=15,
                    font_color="black"
                ),
            ),
        )
    )

    # ---- True hover highlight simulation ----
    # This dims non-hovered links and keeps hovered bright.
    fig.update_traces(
        hoverinfo="all",
        selector=dict(type="sankey")
    )

    # Bright yellow link when hovered (via stylesheet-like overlay)
    fig.update_layout(
        title="Customer Journey Flow (Interactive Sankey)",
        font=dict(size=14),
        height=850,
        margin=dict(l=50, r=50, t=50, b=40),

        # Critical: highlight effect
        hoverlabel=dict(bgcolor="yellow"),

        # Trick for hover-highlight simulation
        template="plotly_white"
    )

    return fig




def build_markov_graph_figure(transitions: pd.DataFrame, max_edges: int = 50) -> go.Figure:
    """Create a Markov-style network graph with weighted edges and visible probability labels."""
    if transitions.empty:
        return go.Figure()

    # Take only top edges for readability/performance
    df_top = transitions.sort_values("count", ascending=False).head(max_edges)

    G = nx.DiGraph()

    for _, row in df_top.iterrows():
        G.add_edge(
            row["from_step"],
            row["to_step"],
            weight=row["count"],
            probability=row["probability"],
        )

    # Layout positions
    pos = nx.spring_layout(G, k=0.9, seed=42)

    # Build edge traces with probability labels
    edge_x = []
    edge_y = []
    text_positions = []
    edge_text = []
    line_widths = []

    for u, v, data in G.edges(data=True):
        x0, y0 = pos[u]
        x1, y1 = pos[v]

        # Draw line
        edge_x += [x0, x1, None]
        edge_y += [y0, y1, None]

        # Midpoint for label
        mid_x = (x0 + x1) / 2
        mid_y = (y0 + y1) / 2

        text_positions.append((mid_x, mid_y))

        prob = data["probability"]
        cnt = data["weight"]

        edge_text.append(
            f"{u} → {v}<br>Count: {cnt}<br>Probability: {prob:.2f}"
        )

        # Make thickness scale with probability (cleaner than count)
        line_widths.append(max(prob * 15, 1))  # avoid invisible edges

    # Edge drawing
    edge_trace = go.Scatter(
        x=edge_x,
        y=edge_y,
        line=dict(width=1, color="rgba(100,100,100,0.4)"),
        hoverinfo="none",
        mode="lines",
    )

    # Probability labels as separate scatter trace
    label_trace = go.Scatter(
        x=[p[0] for p in text_positions],
        y=[p[1] for p in text_positions],
        mode="text",
        text=[f"{transitions.iloc[i]['probability']:.2f}" for i in range(len(df_top))],
        textfont=dict(size=12, color="black"),
        hoverinfo="skip",
    )

    # Build nodes
    node_x, node_y, node_text, node_sizes = [], [], [], []

    for node in G.nodes():
        x, y = pos[node]
        node_x.append(x)
        node_y.append(y)
        node_text.append(node)
        node_sizes.append(18 + G.degree(node) * 2)

    node_trace = go.Scatter(
        x=node_x,
        y=node_y,
        mode="markers+text",
        text=node_text,
        textposition="top center",
        marker=dict(
            size=node_sizes,
            color="rgba(0,123,255,0.85)",
            line=dict(width=1, color="black"),
        ),
        hoverinfo="text",
    )

    # Final figure
    fig = go.Figure(data=[edge_trace, label_trace, node_trace])

    fig.update_layout(
        title="Markov Transition Graph (with Probabilities)",
        showlegend=False,
        xaxis=dict(showgrid=False, zeroline=False, visible=False),
        yaxis=dict(showgrid=False, zeroline=False, visible=False),
        height=800,
        margin=dict(l=40, r=40, t=50, b=40),
    )

    return fig



def build_transition_heatmap(transitions: pd.DataFrame) -> go.Figure:
    """Create a heatmap of transition counts."""
    if transitions.empty:
        return go.Figure()

    pivot = transitions.pivot_table(
        index="from_step",
        columns="to_step",
        values="count",
        aggfunc="sum",
        fill_value=0,
    )

    fig = px.imshow(
        pivot,
        labels=dict(x="To Step", y="From Step", color="Count"),
        aspect="auto",
        color_continuous_scale="Blues",
    )
    fig.update_layout(title="Transition Heatmap (Counts)")
    return fig


def build_journey_length_histogram(df: pd.DataFrame) -> go.Figure:
    """Distribution of journey lengths."""
    if df.empty:
        return go.Figure()

    lengths = df["Touchpoint_Sequence"].apply(lambda s: len(s) if isinstance(s, list) else 0)
    fig = px.histogram(lengths, nbins=20, labels={"value": "Number of Touchpoints"}, title="Journey Length Distribution")
    fig.update_xaxes(title_text="Number of Touchpoints")
    fig.update_yaxes(title_text="Number of Leads")
    return fig


def build_top_sequences_bar(df: pd.DataFrame, top_n: int = 10) -> go.Figure:
    """Top N most common full journeys."""
    if df.empty:
        return go.Figure()

    seq_strings = df["Touchpoint_Sequence"].apply(
        lambda s: " → ".join(s) if isinstance(s, list) else ""
    )
    counts = seq_strings.value_counts().head(top_n)
    fig = px.bar(
        x=counts.values,
        y=counts.index,
        orientation="h",
        labels={"x": "Count", "y": "Journey"},
        title=f"Top {top_n} Most Common Journeys",
    )
    fig.update_layout(yaxis=dict(automargin=True))
    return fig


# ----------------------------------------------------
# UI: File upload
# ----------------------------------------------------

uploaded_file = st.file_uploader("Upload a synthetic journey CSV", type=["csv"])

if not uploaded_file:
    st.info("Upload a CSV file to begin (e.g., keysight_synthetic_dataset_1.csv or the combined file).")
    st.stop()

# ----------------------------------------------------
# Load and preprocess data
# ----------------------------------------------------

# ----------------------------------------------------
# Load and preprocess data (with sampling for performance)
# ----------------------------------------------------

df_raw = pd.read_csv(uploaded_file)
df = parse_sequences(df_raw)

# Hard cap on number of leads used for visualization
MAX_LEADS = 100  # tweak this up/down if needed

original_count = len(df)
if original_count > MAX_LEADS:
    df = df.sample(MAX_LEADS, random_state=42).reset_index(drop=True)
    st.info(f"Using a random sample of {MAX_LEADS} leads out of {original_count} for performance.")

transitions = build_transitions(df)


st.success(f"Loaded {len(df):,} leads.")

# ----------------------------------------------------
# High-level metrics
# ----------------------------------------------------
st.subheader("Overview Metrics")

col1, col2, col3 = st.columns(3)

with col1:
    st.metric("Total Leads", f"{len(df):,}")

with col2:
    conv_rate = 100 * df["Converted"].mean() if len(df) > 0 else 0
    st.metric("Conversion Rate (%)", f"{conv_rate:.1f}")

with col3:
    avg_len = df["Touchpoint_Sequence"].apply(lambda s: len(s) if isinstance(s, list) else 0).mean()
    st.metric("Average # of Touchpoints", f"{avg_len:.1f}")

st.markdown("---")

# ----------------------------------------------------
# Tabs for different visualizations
# ----------------------------------------------------
tab_overview, tab_sankey, tab_markov, tab_funnel, tab_lengths, tab_heatmap, tab_topseq = st.tabs(
    [
        "Next Best Step & Lead Explorer",
        "Sankey Journey Flow",
        "Markov Graph",
        "Funnel",
        "Journey Lengths",
        "Transition Heatmap",
        "Top Journeys",
    ]
)

# ----------------------------------------------------
# Tab 1: Next Best Step & Lead Explorer
# ----------------------------------------------------
with tab_overview:
    st.header("Next Best Touchpoint & Individual Journeys")

    if transitions.empty:
        st.warning("No transitions found in the data.")
    else:
        all_steps = sorted(set(transitions["from_step"]).union(set(transitions["to_step"])))
        current_step = st.selectbox("Select current touchpoint:", all_steps)

        subset = transitions[transitions["from_step"] == current_step].sort_values("probability", ascending=False)

        if subset.empty:
            st.warning("No outgoing transitions from this step (it may be a terminal state).")
        else:
            st.subheader("Recommended Next Steps")
            st.dataframe(subset[["from_step", "to_step", "count", "probability"]].head(15))

            best = subset.iloc[0]
            st.success(
                f"Most likely next step from **{current_step}** is **{best['to_step']}** "
                f"(probability: {best['probability']:.2f})"
            )

    st.markdown("---")
    st.subheader("Explore Individual Lead Journeys")

    lead_id = st.selectbox("Choose a Lead ID:", df["Lead_ID"].tolist())
    row = df[df["Lead_ID"] == lead_id].iloc[0]

    seq = row["Touchpoint_Sequence"]
    converted = row["Converted"]

    st.write(f"**Lead ID**: {lead_id}")
    if "Client_Name" in df.columns:
        st.write(f"**Client Name**: {row.get('Client_Name', '')}")
    if "Client_Company" in df.columns:
        st.write(f"**Client Company**: {row.get('Client_Company', '')}")
    if "Industry" in df.columns:
        st.write(f"**Industry**: {row.get('Industry', '')}")
    if "Region" in df.columns:
        st.write(f"**Region**: {row.get('Region', '')}")
    if "Product_Interest" in df.columns:
        st.write(f"**Product Interest**: {row.get('Product_Interest', '')}")

    st.write("**Converted**:", "Customer" if converted == 1 else "No Conversion")
    st.markdown("**Journey:**")
    st.markdown(" → ".join(seq))

# ----------------------------------------------------
# Tab 2: Sankey
# ----------------------------------------------------
with tab_sankey:
    st.header("Sankey Journey Flow")

    if transitions.empty:
        st.warning("No transitions to display.")
    else:
        st.write("Rendering Sankey using the Top Touchpoints (for performance)…")

        # Limit the number of nodes (touchpoints)
        NUM_NODES = st.slider(
            "Number of top touchpoints to include",
            min_value=5,
            max_value=40,
            value=20,
            step=5,
            help="Larger values = more detail but slower rendering"
        )

        # Select top N nodes based on frequency of 'from_step'
        top_nodes = (
            transitions.groupby("from_step")["count"]
            .sum()
            .sort_values(ascending=False)
            .head(NUM_NODES)
            .index
            .tolist()
        )

        # Filter transitions to only include top nodes
        transitions_filtered = transitions[
            transitions["from_step"].isin(top_nodes)
            & transitions["to_step"].isin(top_nodes)
        ]

        if transitions_filtered.empty:
            st.warning("Not enough transition data after filtering.")
        else:
            fig_sankey = build_sankey_base(transitions_filtered)
            render_sankey_with_css(fig_sankey)




# ----------------------------------------------------
# Tab 3: Markov Graph
# ----------------------------------------------------
with tab_markov:
    st.header("Markov Transition Graph (Fast Version)")

    if transitions.empty:
        st.warning("No transitions available.")
    else:
        top_n = st.slider(
            "Number of Top Transitions to Show",
            min_value=10,
            max_value=80,
            value=40,
            step=10,
        )

        fig_markov = build_markov_graph_figure(transitions, max_edges=top_n)
        st.plotly_chart(fig_markov, use_container_width=True)



# ----------------------------------------------------
# Tab 4: Funnel
# ----------------------------------------------------
with tab_funnel:
    st.header("Funnel: Lead → MQL → SQL → Opportunity → Customer")

    labels, values = compute_funnel_metrics(df)
    if not labels:
        st.warning("No funnel data available.")
    else:
        fig_funnel = go.Figure(
            go.Funnel(
                y=labels,
                x=values,
                textinfo="value+percent initial",
            )
        )
        fig_funnel.update_layout(title="Funnel Conversion View")
        st.plotly_chart(fig_funnel, use_container_width=True)

# ----------------------------------------------------
# Tab 5: Journey Lengths
# ----------------------------------------------------
with tab_lengths:
    st.header("Journey Length Distribution")
    fig_lengths = build_journey_length_histogram(df)
    st.plotly_chart(fig_lengths, use_container_width=True)

# ----------------------------------------------------
# Tab 6: Transition Heatmap
# ----------------------------------------------------
with tab_heatmap:
    st.header("Transition Heatmap (Counts)")
    if transitions.empty:
        st.warning("No transitions to display.")
    else:
        fig_heatmap = build_transition_heatmap(transitions)
        st.plotly_chart(fig_heatmap, use_container_width=True)

# ----------------------------------------------------
# Tab 7: Top Journeys
# ----------------------------------------------------
with tab_topseq:
    st.header("Top Full Journeys")
    fig_topseq = build_top_sequences_bar(df, top_n=10)
    st.plotly_chart(fig_topseq, use_container_width=True)
