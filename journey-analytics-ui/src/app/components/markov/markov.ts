import { Component, OnInit } from '@angular/core';
import { NgIf } from '@angular/common';
import { JourneyStateService } from '../../services/journey-state';
import { PlotlyChart } from '../wrapper/plotly-chart';

interface MarkovEdge {
  from: string;
  to: string;
  count: number;
  probability: number;
}

@Component({
  selector: 'app-markov',
  standalone: true,
  imports: [NgIf, PlotlyChart],
  templateUrl: './markov.html',
  styleUrls: ['./markov.scss'],
})
export class Markov implements OnInit {
  fig: any = null;

  constructor(private state: JourneyStateService) { }

  ngOnInit(): void {
    console.log("Markov: waiting for analysis result...");

    this.state.result$.subscribe(res => {
      console.log("Markov: received new state:", res);

      if (!res?.markovEdges || res.markovEdges.length === 0) {
        console.log("Markov: No markovEdges found.");
        this.fig = null;
        return;
      }

      const edges: MarkovEdge[] = res.markovEdges as MarkovEdge[];

      console.log(`Markov: edges received: ${edges.length}`);

      // Build node list
      const nodes = Array.from(
        new Set(edges.flatMap(e => [e.from, e.to]))
      );
      console.log("Markov: unique nodes:", nodes);

      const nodeIndex: { [key: string]: number } = {};
      nodes.forEach((n, i) => (nodeIndex[n] = i));

      const x: number[] = [];
      const y: number[] = [];

      // Random layout for nodes (force simulation could be added later)
      nodes.forEach(() => {
        x.push(Math.random() * 2 - 1);
        y.push(Math.random() * 2 - 1);
      });

      let edgeX: Array<number | null> = [];
      let edgeY: Array<number | null> = [];

      const hoverText: string[] = [];

      edges.forEach((e) => {
        const i1 = nodeIndex[e.from];
        const i2 = nodeIndex[e.to];

        edgeX.push(x[i1], x[i2], null);
        edgeY.push(y[i1], y[i2], null);

        hoverText.push(
          `${e.from} → ${e.to}<br>Count: ${e.count}<br>Prob: ${(
            e.probability * 100
          ).toFixed(2)}%`
        );
      });

      this.fig = {
        data: [
          // Edges
          {
            type: 'scatter',
            mode: 'lines',
            x: edgeX,
            y: edgeY,
            line: { width: 1, color: '#999' },
            hoverinfo: 'none',
          },
          // Nodes
          {
            type: 'scatter',
            mode: 'markers+text',
            x: x,
            y: y,
            marker: {
              size: 18,
              color: '#007bff',
              line: { width: 1, color: '#333' },
            },
            text: nodes,
            textposition: 'top center',
            hoverinfo: 'text',
            hovertext: nodes.map(n => `Node: ${n}`),
          },
        ],
        layout: {
          title: { text: 'Markov Transition Graph', font: { size: 18 } },
          showlegend: false,
          xaxis: { showgrid: false, zeroline: false, visible: false },
          yaxis: { showgrid: false, zeroline: false, visible: false },
          height: 700,
        },
      };

      console.log("Markov: figure built:", this.fig);
    });
  }
}
