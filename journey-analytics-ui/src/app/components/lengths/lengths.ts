import { Component, OnInit, OnDestroy } from '@angular/core';
import { NgIf } from '@angular/common';
import { Subscription } from 'rxjs';
import { JourneyStateService } from '../../services/journey-state';
import { PlotlyChart } from '../wrapper/plotly-chart';

@Component({
  selector: 'app-lengths',
  standalone: true,
  imports: [NgIf, PlotlyChart],
  templateUrl: './lengths.html',
  styleUrls: ['./lengths.scss']
})
export class Lengths implements OnInit, OnDestroy {
  fig: any = null;
  private sub?: Subscription;

  constructor(private state: JourneyStateService) {}

  ngOnInit(): void {
    this.sub = this.state.result$.subscribe((res) => {
      if (!res?.journeyLengths) {
        this.fig = null;
        return;
      }

      const hist = res.journeyLengths;

      this.fig = {
        data: [{
          type: 'bar',
          x: hist.lengths,
          y: hist.counts,
          marker: { color: '#28a745' }
        }],
        layout: {
          title: { text: 'Journey Length Distribution', font: { size: 18 } },
          xaxis: { title: 'Number of Steps' },
          yaxis: { title: 'Count' }
        }
      };
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }
}
