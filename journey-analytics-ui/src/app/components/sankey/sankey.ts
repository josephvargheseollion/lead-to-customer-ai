import { NgIf } from '@angular/common';
import { Component, OnInit, OnDestroy} from '@angular/core';
import Plotly from 'plotly.js-dist-min';
import { JourneyStateService, SankeyLink, SankeyData  } from '../../services/journey-state';
import { PlotlyChart } from '../wrapper/plotly-chart';
import { Subscription } from 'rxjs';
@Component({
  selector: 'app-sankey',
  standalone: true,
  imports: [NgIf, PlotlyChart],
  templateUrl: './sankey.html',
  styleUrl: './sankey.scss',
})
export class Sankey implements OnInit, OnDestroy{
  fig: any = null;
  private sub?: Subscription;

  constructor(private state: JourneyStateService) {}

  ngOnInit(): void {
    console.log('Sankey: ngOnInit, subscribing to JourneyStateService.result$');

    this.sub = this.state.result$.subscribe((res) => {
      console.log('Sankey: received new state:', res);

      if (!res || !res.sankey) {
        console.log('Sankey: no sankey data, clearing fig');
        this.fig = null;
        return;
      }

      const sankey: SankeyData = res.sankey;
      const labels: string[] = sankey.labels || [];
      const links: SankeyLink[] = sankey.links || [];

      console.log(`Sankey: labels=${labels.length}, links=${links.length}`);

      if (labels.length === 0 || links.length === 0) {
        console.warn('Sankey: empty labels or links, nothing to render');
        this.fig = null;
        return;
      }

      // Safety cap to avoid hanging on very large graphs
      const MAX_LINKS = 400;
      const safeLinks = links.length > MAX_LINKS ? links.slice(0, MAX_LINKS) : links;

      if (links.length > MAX_LINKS) {
        console.warn(
          `Sankey: link count ${links.length} exceeds ${MAX_LINKS}, rendering first ${MAX_LINKS} only`
        );
      }

      this.fig = {
        data: [
          {
            type: 'sankey',
            orientation: 'h',
            node: {
              label: labels,
              color: 'rgba(50,50,50,0.8)',
              pad: 20,
              thickness: 18,
            },
            link: {
              source: safeLinks.map((l: SankeyLink) => l.source),
              target: safeLinks.map((l: SankeyLink) => l.target),
              value: safeLinks.map((l: SankeyLink) => l.value),
              color: safeLinks.map((l: SankeyLink) =>
                l.toCustomer
                  ? 'rgba(0,180,0,0.5)'
                  : 'rgba(0,120,255,0.3)'
              ),
            },
          },
        ],
        layout: {
          title: { text: 'Customer Journey Flow', font: { size: 18 } },
          height: 700,
        },
      };

      console.log('Sankey: figure built:', this.fig);
    });
  }

  ngOnDestroy(): void {
    if (this.sub) {
      console.log('Sankey: unsubscribing from JourneyStateService.result$');
      this.sub.unsubscribe();
    }
  }
}
