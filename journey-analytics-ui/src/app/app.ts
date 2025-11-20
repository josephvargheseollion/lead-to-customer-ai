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
import { TimerService } from './services/timer.service';


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
  elapsedUploadSec = 0;
  elapsedAnalysisSec = 0;
  constructor(
    private journeyState: JourneyStateService,
    private fb: FormBuilder,
    private uploadService: JourneyUploadService,
    private analysisService: AnalysisService,
    private timerService: TimerService
  ) {
    this.form = this.fb.group({});
    // subscribe once for updates
    this.timerService.elapsedSec$.subscribe((sec) => {
      if (this.isUploading) this.elapsedUploadSec = sec;
      if (this.isAnalyzing) this.elapsedAnalysisSec = sec;
    });
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
    this.elapsedUploadSec = 0;
    this.timerService.start();  // start upload timer
    console.log("uploadFile() called. Selected file:", this.selectedFile);

    this.uploadService.uploadFile(this.selectedFile).subscribe({
      next: (event: UploadEvent) => {
        console.log("UploadEvent received:", JSON.parse(JSON.stringify(event)));

        // 1) Progress events
        if (event.type === 'progress') {
          console.log(`Upload progress: ${event.progress}%`);
          if (typeof event.progress === 'number') {
            this.uploadProgress = event.progress;
          }
        }

        // 2) Completion event
        if (event.type === 'complete') {
          this.timerService.stop();
          console.log("Upload complete event:", event);

          if (!event.result) {
            console.error("'complete' event missing result field:", event);
            this.isUploading = false;
            this.isError = true;
            this.errorMessage = "Upload finished but did not return S3 bucket/key.";
            return;
          }

          this.isUploading = false;
          this.isSuccess = true;

          console.log("Extracting bucket/key from event.result...");
          console.log("event.result =", event.result);

          this.uploadedBucket = event.result.bucket;
          this.uploadedKey = event.result.key;

          console.log("Extracted bucket:", this.uploadedBucket);
          console.log("Extracted key:", this.uploadedKey);

          if (this.uploadedBucket && this.uploadedKey) {
            console.log("Starting analysis with bucket/key...");
            this.startAnalysis(this.uploadedBucket, this.uploadedKey);
          } else {
            console.error("Missing bucket or key, cannot start analysis.");
            this.isError = true;
            this.errorMessage =
              "Upload succeeded but S3 location is missing. Check backend.";
          }
        }
      },

      error: (err) => {
        this.timerService.stop();          // stop timer
        console.error("Upload error:", err);
        console.error("Full error object:", JSON.stringify(err, null, 2));

        this.isUploading = false;
        this.isError = true;
        this.errorMessage =
          err?.message || 'File upload failed. Please try again.';
      },
    });
  }

  private startAnalysis(bucket: string, key: string) {
    console.log("startAnalysis() called.");
    console.log("Bucket received:", bucket);
    console.log("Key received:", key);

    this.isAnalyzing = true;
    this.elapsedAnalysisSec = 0;

    this.timerService.start();      // start analysis timer
    this.isError = false;
    this.errorMessage = '';

    console.log("Calling AnalysisService.analyzeFile with payload:", {
      bucket,
      key
    });

    this.analysisService.analyzeFile(bucket, key).subscribe({
      next: (result) => {
        this.timerService.stop();   // stop timer
        console.log("AnalysisService response received.");
        console.log("Raw analysis result:", JSON.parse(JSON.stringify(result)));

        this.isAnalyzing = false;

        console.log("Storing result in JourneyStateService...");
        this.journeyState.setResult(result);

        console.log("JourneyStateService updated successfully.");
      },

      error: (err) => {
        this.timerService.stop();   // stop timer
        console.error("AnalysisService encountered an error.");
        console.error("Error object:", err);
        console.error("Error JSON:", JSON.stringify(err, null, 2));

        this.isAnalyzing = false;
        this.isError = true;
        this.errorMessage = "Journey analysis failed. Please retry.";
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
