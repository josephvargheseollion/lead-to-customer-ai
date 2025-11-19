import { Component } from '@angular/core';
import { NgIf, NgSwitch, NgSwitchCase, CommonModule, NgSwitchDefault } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { Overview } from './components/overview/overview';
import { Sankey } from './components/sankey/sankey';
import { Markov } from './components/markov/markov';
import { Funnel } from './components/funnel/funnel';
import { Lengths } from './components/lengths/lengths';
import { Heatmap } from './components/heatmap/heatmap';
import { TopJourneys } from './components/top-journeys/top-journeys';
import { JourneyStateService } from './services/journey-state';


@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
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
    CommonModule,
    NgSwitchDefault
  ],
  templateUrl: './app.html',
  styleUrls: ['./app.scss'],
})
export class App {
  constructor(private state: JourneyStateService) {}
  title = 'Customer Journey Intelligence Demo';
  selectedFile: File | null = null;
  uploadMessage: string = '';
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
  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selectedFile = input.files[0];
    }
  }

  uploadFile() {
    if (!this.selectedFile) return;

    const formData = new FormData();
    formData.append('file', this.selectedFile);

    this.uploadMessage = "Uploading & analyzing…";

    fetch('https://YOUR_API_GATEWAY_URL/analyze', {
      method: 'POST',
      body: formData
    })
      .then(res => res.json())
      .then(data => {
        this.uploadMessage = "Analysis complete!";
        console.log('Result:', data);

        // Store in your shared journey state service
        // so the other tabs (Sankey, Markov, etc.) refresh
        this.state.setResult(data);

      })
      .catch(err => {
        this.uploadMessage = "Upload failed.";
        console.error(err);
      });
  }
}
