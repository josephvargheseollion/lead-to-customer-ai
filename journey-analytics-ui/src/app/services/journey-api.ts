import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class JourneyApiService {
  // TODO: set this to your real API Gateway URL
  private baseUrl = 'https://YOUR_API_ID.execute-api.YOUR_REGION.amazonaws.com/prod';

  constructor(private http: HttpClient) {}

  analyzeCsv(csvText: string, maxNodes: number = 20): Observable<any> {
    return this.http.post(`${this.baseUrl}/analyze`, {
      csv: csvText,
      maxNodes,
    });
  }
}
