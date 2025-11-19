import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

// If you have environments, use that:
import { environment } from '../../environments/environment';
// If not, you can hard-code the base URL instead.

@Injectable({
  providedIn: 'root',
})
export class AnalysisService {
  // Either use environment…
  private readonly apiBase =
    (environment as any).apiBaseUrl || 'https://YOUR_API_GATEWAY_URL';

  // …or just hard-code directly:
  // private readonly apiBase = 'https://YOUR_API_GATEWAY_URL';

  constructor(private http: HttpClient) {}

  /**
   * Call the /analyze endpoint on API Gateway.
   * The backend Lambda should:
   *  - read the CSV from S3 using { bucket, key }
   *  - run all analysis (Sankey, Markov, Funnel, etc.)
   *  - return a single JSON object with those sections
   */
  analyzeFile(bucket: string, key: string): Observable<any> {
    const payload = { bucket, key };

    return this.http.post<any>(`${this.apiBase}/analyze`, payload);
  }
}
