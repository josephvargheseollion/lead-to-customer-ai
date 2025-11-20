import { Component, OnInit, OnDestroy } from '@angular/core';
import { NgIf } from '@angular/common';
import { JourneyStateService } from '../../services/journey-state';
import { PlotlyChart } from '../wrapper/plotly-chart';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-funnel',
  standalone: true,
  imports: [NgIf, PlotlyChart],
  templateUrl: './funnel.html',
  styleUrls: ['./funnel.scss']
})
export class Funnel implements OnInit, OnDestroy {
  fig: any = null;
  private sub?: Subscription;

  constructor(private state: JourneyStateService) {}

  ngOnInit(): void {
    this.sub = this.state.result$.subscribe((res) => {
      if (!res?.metrics?.funnel) {
        this.fig = null;
        return;
      }

      const funnel = res.metrics.funnel;

      this.fig = {
        data: [{
          type: 'funnel',
          y: funnel.labels,
          x: funnel.values,
          marker: { color: '#007bff' }
        }],
        layout: {
          title: { text: 'Funnel Overview', font: { size: 18 } },
          margin: { l: 150, r: 30 }
        }
      };
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }
}
