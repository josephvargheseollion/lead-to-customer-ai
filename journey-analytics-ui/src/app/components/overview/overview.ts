import { Component } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { NgIf } from '@angular/common';
import { JourneyApiService } from '../../services/journey-api';
import { JourneyStateService } from '../../services/journey-state';


@Component({
  selector: 'app-overview',
  standalone: true,
  imports: [
    NgIf,
    CommonModule,
    DecimalPipe
  ],
  templateUrl: './overview.html',
  styleUrls: ['./overview.scss'],
})
export class Overview {
  loading = false;
  error: string | null = null;

  metrics: any = null;

  constructor(
    private api: JourneyApiService,
    private state: JourneyStateService
  ) {
    const existing = this.state.getResult();
    if (existing) {
      this.metrics = existing.metrics;
    }
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const csvText = reader.result as string;
      this.callAnalyze(csvText);
    };
    reader.readAsText(file);
  }

  callAnalyze(csvText: string) {
    this.loading = true;
    this.error = null;

    this.api.analyzeCsv(csvText, 20).subscribe({
      next: (res) => {
        this.loading = false;
        this.state.setResult(res);
        this.metrics = res.metrics;
      },
      error: (err) => {
        this.loading = false;
        this.error = err?.error?.error || 'Error analyzing CSV';
      },
    });
  }
}
