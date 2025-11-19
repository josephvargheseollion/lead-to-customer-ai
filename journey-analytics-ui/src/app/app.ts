import { Component } from '@angular/core';
import { NgIf, NgSwitch, NgSwitchCase, CommonModule, NgSwitchDefault } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms'
import { HttpClientModule } from '@angular/common/http';
import { Overview } from './components/overview/overview';
import { Sankey } from './components/sankey/sankey';
import { Markov } from './components/markov/markov';
import { Funnel } from './components/funnel/funnel';
import { Lengths } from './components/lengths/lengths';
import { Heatmap } from './components/heatmap/heatmap';
import { TopJourneys } from './components/top-journeys/top-journeys';
import { JourneyStateService } from './services/journey-state';
import { JourneyUploadService } from './services/journey-upload.service';
import { AnalysisService } from './services/analysis.service';
import { UploadEvent } from './interfaces/upload-event';


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
    ReactiveFormsModule,
    HttpClientModule,
    NgSwitchDefault
  ],
  templateUrl: './app.html',
  styleUrls: ['./app.scss'],
})
export class App {
  title = 'Customer Journey Intelligence Demo';
  form: FormGroup;
  selectedFile: File | null = null;

  uploadedBucket: string | null = null;
  uploadedKey: string | null = null;
  uploadProgress = -1;
  isUploading = false;
  isError = false;
  isSuccess = false;
  isAnalyzing = false;
  errorMessage = '';
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

  constructor(
    private journeyState: JourneyStateService,
    private fb: FormBuilder,
    private uploadService: JourneyUploadService,
    private analysisService: AnalysisService
  ) { 
    this.form = this.fb.group({});
  }
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

    this.resetStatus();
    this.isUploading = true;
    this.uploadProgress = 0;

    this.uploadService.uploadFile(this.selectedFile).subscribe({
      next: (event: UploadEvent) => {
        if (event.type === 'progress' && typeof event.progress === 'number') {
          this.uploadProgress = event.progress;
        }
        if (event.type === 'complete' && event.result) {
          this.isUploading = false;
          this.isSuccess = true;

          this.uploadedBucket = event.result.bucket;
          this.uploadedKey = event.result.key;

          if (this.uploadedBucket && this.uploadedKey) {
            this.startAnalysis(this.uploadedBucket, this.uploadedKey);
          }
        }
      },
      error: (err) => {
        console.error('Upload error:', err);
        this.isUploading = false;
        this.isError = true;
        this.errorMessage =
          err?.message || 'File upload failed. Please try again.';
      },
    });
  }

  private startAnalysis(bucket: string, key: string) {
    this.isAnalyzing = true;
    this.isError = false;
    this.errorMessage = '';
    this.analysisService.analyzeFile(bucket, key).subscribe({
      next: (result) => {
        this.isAnalyzing = false;
        // push result into JourneyStateService so tabs can render
        this.journeyState.setResult(result);
      },
      error: (err) => {
        console.error('Analysis error:', err);
        this.isAnalyzing = false;
        this.isError = true;
        this.errorMessage =
          'Journey analysis failed. Please retry.';
      },
    });
  }

  private resetStatus() {
    this.isError = false;
    this.isSuccess = false;
    this.isAnalyzing = false;
    this.uploadProgress = -1;
    this.errorMessage = '';
  }
}
