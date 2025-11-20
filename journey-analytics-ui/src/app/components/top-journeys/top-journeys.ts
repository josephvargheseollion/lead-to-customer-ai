import { Component, OnInit, OnDestroy } from '@angular/core';
import { NgIf, NgFor } from '@angular/common';
import { JourneyStateService } from '../../services/journey-state';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-top-journeys',
  standalone: true,
  imports: [NgIf, NgFor],
  templateUrl: './top-journeys.html',
  styleUrls: ['./top-journeys.scss']
})
export class TopJourneys implements OnInit, OnDestroy {
  journeys: any[] = [];
  private sub?: Subscription;

  constructor(private state: JourneyStateService) {}

  ngOnInit(): void {
    this.sub = this.state.result$.subscribe((res) => {
      this.journeys = res?.topJourneys ?? [];
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }
}
