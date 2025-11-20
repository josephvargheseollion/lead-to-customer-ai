import { Injectable } from '@angular/core';
import { BehaviorSubject, interval, Subscription } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class TimerService {
  private sub: Subscription | null = null;
  private startTime = 0;

  private _elapsedSec$ = new BehaviorSubject<number>(0);
  elapsedSec$ = this._elapsedSec$.asObservable();

  start() {
    this.stop();
    this.startTime = Date.now();

    this.sub = interval(1000).subscribe(() => {
      const diff = Math.floor((Date.now() - this.startTime) / 1000);
      this._elapsedSec$.next(diff);
    });
  }

  stop() {
    if (this.sub) {
      this.sub.unsubscribe();
      this.sub = null;
    }
    this._elapsedSec$.next(0);
  }
}
