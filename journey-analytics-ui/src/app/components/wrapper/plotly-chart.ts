import { Component, ElementRef, Input, OnInit, AfterViewInit } from '@angular/core';
import Plotly from 'plotly.js-dist-min';

@Component({
  selector: 'plotly-chart',
  standalone: true,
  template: `<div class="plot-container"></div>`,
  styles: [`
    .plot-container {
      width: 100%;
      height: 100%;
    }
  `]
})
export class PlotlyChart implements OnInit, AfterViewInit {

  @Input() data: any;
  @Input() layout: any;
  @Input() config: any;

  constructor(private el: ElementRef) {}

  ngOnInit() {}

  ngAfterViewInit() {
    Plotly.newPlot(
      this.el.nativeElement.querySelector('.plot-container'),
      this.data,
      this.layout,
      this.config || { responsive: true }
    );
  }
}
