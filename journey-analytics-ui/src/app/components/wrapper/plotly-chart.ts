// src/app/components/wrapper/plotly-chart.ts
import {
  Component,
  Input,
  ElementRef,
  ViewChild,
  OnInit,
  OnChanges,
  SimpleChanges,
  AfterViewInit,
} from '@angular/core';
import Plotly from 'plotly.js-dist-min';

@Component({
  selector: 'plotly-chart',
  standalone: true,
  templateUrl: './plotly-chart.html',
})
export class PlotlyChart implements OnInit, AfterViewInit, OnChanges {
  @ViewChild('chart', { static: true }) chartRef!: ElementRef<HTMLDivElement>;

  @Input() data: any[] | null = null;
  @Input() layout: any | null = null;
  @Input() config: any | null = null;

  private hasView = false;

  ngOnInit(): void {
    console.log('PlotlyChart: ngOnInit');
  }

  ngAfterViewInit(): void {
    this.hasView = true;
    this.renderChart();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (this.hasView && (changes['data'] || changes['layout'] || changes['config'])) {
      this.renderChart();
    }
  }

  private renderChart(): void {
    if (!this.chartRef || !this.data || this.data.length === 0) {
      console.log('PlotlyChart: no data or chartRef, skipping render');
      return;
    }

    try {
      console.log('PlotlyChart: rendering chart with data and layout');
      const layout = this.layout || {};
      const config = this.config || { responsive: true };

      Plotly.newPlot(this.chartRef.nativeElement, this.data, layout, config);
    } catch (err) {
      console.error('PlotlyChart: error rendering chart', err);
    }
  }
}
