import { Component, OnInit, OnDestroy } from '@angular/core';
import { NgIf } from '@angular/common';
import { Subscription } from 'rxjs';
import { JourneyStateService, MarkovEdge } from '../../services/journey-state';
import { PlotlyChart } from '../wrapper/plotly-chart';

@Component({
  selector: 'app-heatmap',
  standalone: true,
  imports: [NgIf, PlotlyChart],
  templateUrl: './heatmap.html',
  styleUrls: ['./heatmap.scss']
})
export class Heatmap implements OnInit, OnDestroy {

  fig: any = null; // <-- required
  private sub?: Subscription;

  constructor(private state: JourneyStateService) {}

  ngOnInit(): void {
    console.log('Heatmap: subscribing to JourneyStateService');

    this.sub = this.state.result$.subscribe((res) => {
      if (!res || !res.markovEdges) {
        this.fig = null;
        return;
      }

      const edges: MarkovEdge[] = res.markovEdges;

      if (edges.length === 0) {
        this.fig = null;
        return;
      }

      // Build row/column labels
      const fromLabels: string[] = [...new Set(edges.map((e: MarkovEdge) => e.from))];
      const toLabels: string[] = [...new Set(edges.map((e: MarkovEdge) => e.to))];

      // Build a matrix filled with zeros
      const matrix: number[][] = fromLabels.map(() =>
        toLabels.map(() => 0)
      );

      // Populate weights
      edges.forEach((e: MarkovEdge) => {
        const i = fromLabels.indexOf(e.from);
        const j = toLabels.indexOf(e.to);
        if (i >= 0 && j >= 0) {
          matrix[i][j] = e.count;
        }
      });

      this.fig = {
        data: [
          {
            type: 'heatmap',
            x: toLabels,
            y: fromLabels,
            z: matrix,
            colorscale: 'Blues'
          }
        ],
        layout: {
          title: { text: 'Transition Heatmap', font: { size: 18 } },
          height: 800
        }
      };
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }
}
