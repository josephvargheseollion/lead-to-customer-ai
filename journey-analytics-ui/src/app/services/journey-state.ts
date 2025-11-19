import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class JourneyStateService {
  analysisResult: any | null = null;

  setResult(result: any) {
    this.analysisResult = result;
  }

  getResult() {
    return this.analysisResult;
  }
}
