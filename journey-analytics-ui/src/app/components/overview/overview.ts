import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule, DecimalPipe, NgIf } from '@angular/common';
import { JourneyStateService } from '../../services/journey-state';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-overview',
  standalone: true,
  imports: [NgIf, CommonModule, DecimalPipe],
  templateUrl: './overview.html',
  styleUrls: ['./overview.scss'],
})
export class Overview implements OnInit, OnDestroy {

  metrics: any = null;
  loading = false;
  error: string | null = null;

  private sub?: Subscription;

  constructor(private state: JourneyStateService) {}

  ngOnInit(): void {
    console.log("Overview: ngOnInit subscribing to result$");

    this.sub = this.state.result$.subscribe(res => {
      console.log("Overview: received new state:", res);

      if (!res) {
        console.log("Overview: no result yet.");
        this.metrics = null;
        return;
      }

      if (!res.metrics) {
        console.log("Overview: result arrived but no metrics present.");
        this.metrics = null;
        return;
      }

      console.log("Overview: metrics updated.");
      this.metrics = res.metrics;
    });
  }

  ngOnDestroy(): void {
    if (this.sub) {
      console.log("Overview: unsubscribing from result$");
      this.sub.unsubscribe();
    }
  }
}
