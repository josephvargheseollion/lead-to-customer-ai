import { Component } from '@angular/core';
import { NgIf, NgSwitch, NgSwitchCase } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { Overview } from './components/overview/overview';
import { Sankey } from './components/sankey/sankey';
import { Markov } from './components/markov/markov';
import { Funnel } from './components/funnel/funnel';
import { Lengths } from './components/lengths/lengths';
import { Heatmap } from './components/heatmap/heatmap';
import { TopJourneys } from './components/top-journeys/top-journeys';


@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    NgIf,
    NgSwitch,
    NgSwitchCase,
    HttpClientModule,
    Overview,
    Sankey,
    Markov,
    Funnel,
    Lengths,
    Heatmap,
    TopJourneys,
  ],
  templateUrl: './app.html',
  styleUrls: ['./app.scss'],
})
export class App {
  title = 'Customer Journey Intelligence Demo';

  tabs = [
    { id: 'overview', label: 'Overview', icon: 'bi bi-bar-chart' },
    { id: 'sankey', label: 'Sankey Journey Flow', icon: 'bi bi-diagram-3' },
    { id: 'markov', label: 'Markov Graph', icon: 'bi bi-share' },
    { id: 'funnel', label: 'Funnel', icon: 'bi bi-funnel' },
    { id: 'lengths', label: 'Journey Lengths', icon: 'bi bi-graph-up' },
    { id: 'heatmap', label: 'Transition Heatmap', icon: 'bi bi-grid-3x3' },
    { id: 'top-journeys', label: 'Top Journeys', icon: 'bi bi-list-check' },
  ];

  activeTab = 'overview';

  setTab(id: string) {
    this.activeTab = id;
  }
}
