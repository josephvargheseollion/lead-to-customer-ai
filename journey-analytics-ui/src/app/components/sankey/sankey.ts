import { NgIf } from '@angular/common';
import { Component, OnInit, ElementRef, ViewChild } from '@angular/core';
import Plotly from 'plotly.js-dist-min';
import { JourneyStateService } from '../../services/journey-state';
import { PlotlyChart } from '../wrapper/plotly-chart';
interface SankeyLink {
  source: number;
  target: number;
  value: number;
  toCustomer?: boolean;
}
@Component({
  selector: 'app-sankey',
  standalone: true,
  imports: [NgIf, PlotlyChart],
  templateUrl: './sankey.html',
  styleUrl: './sankey.scss',
})
export class Sankey {
  fig: any = null;

  constructor(private state: JourneyStateService) {
    const res = this.state.getResult();
    if (!res?.sankey) return;

    const labels = res.sankey.labels;
    const links: SankeyLink[] = res.sankey.links;

    this.fig = {
      data: [{
        type: 'sankey',
        node: {
          label: labels,
          color: 'rgba(50,50,50,0.8)',
          pad: 20,
          thickness: 18
        },
        link: {
          source: links.map(l => l.source),
          target: links.map(l => l.target),
          value: links.map(l => l.value),
          color: links.map(l => l.toCustomer ?
            'rgba(0,180,0,0.5)' :
            'rgba(0,120,255,0.3)'
          )
        }
      }],
      layout: {
        title: {
          text: "Customer Journey Flow",
          font: { size: 18 }
        },
        height: 700
      }
    };
  }
}
