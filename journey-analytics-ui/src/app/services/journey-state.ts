import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class JourneyStateService {
  private analysisResult: any | null = null;

  setResult(result: any) {
    this.analysisResult = result;
  }

  getResult() {
    return this.analysisResult;
  }

  getSankey() {
    return this.analysisResult?.sankey || null;
  }

  getMarkov() {
    return this.analysisResult?.markov || null;
  }

  getFunnel() {
    return this.analysisResult?.funnel || null;
  }

  getLengths() {
    return this.analysisResult?.lengths || null;
  }

  getHeatmap() {
    return this.analysisResult?.heatmap || null;
  }

  getTopJourneys() {
    return this.analysisResult?.top_journeys || null;
  }

  reset() {
    this.analysisResult = null;
  }
}
