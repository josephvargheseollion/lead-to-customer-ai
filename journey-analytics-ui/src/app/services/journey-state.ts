// src/app/services/journey-state.ts
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface SankeyLink {
  source: number;
  target: number;
  value: number;
  probability?: number;
  toCustomer?: boolean;
}

export interface SankeyData {
  labels: string[];
  links: SankeyLink[];
}

export interface JourneyAnalysisResult {
  metrics?: any;
  sankey?: SankeyData;
  markovEdges?: any;
  journeyLengths?: any;
  topJourneys?: any;
  nextBestStep?: any;
  executionMs?: number;
  [key: string]: any;
}

@Injectable({ providedIn: 'root' })
export class JourneyStateService {
  private resultSubject = new BehaviorSubject<JourneyAnalysisResult | null>(null);

  // Component-facing observable
  result$: Observable<JourneyAnalysisResult | null> = this.resultSubject.asObservable();

  setResult(result: JourneyAnalysisResult) {
    console.log('JourneyStateService: setResult called');
    this.resultSubject.next(result);
  }

  getResult(): JourneyAnalysisResult | null {
    return this.resultSubject.value;
  }

  getSankey(): SankeyData | null {
    return this.resultSubject.value?.sankey ?? null;
  }

  getMarkov() {
    return this.resultSubject.value?.markovEdges ?? null;
  }

  getFunnel() {
    return this.resultSubject.value?.metrics?.funnel ?? null;
  }

  getLengths() {
    return this.resultSubject.value?.journeyLengths ?? null;
  }

  getHeatmap() {
    return this.resultSubject.value?.['heatmap'] ?? null;
  }

  getTopJourneys() {
    return this.resultSubject.value?.topJourneys ?? null;
  }

  reset() {
    console.log('JourneyStateService: reset');
    this.resultSubject.next(null);
  }
}
