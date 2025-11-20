import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, catchError  } from 'rxjs';

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
  console.log("AnalysisService.analyzeFile() called.");
  console.log("Bucket:", bucket);
  console.log("Key:", key);

  const payload = { bucket, key };

  console.log("API Base URL:", this.apiBase);
  console.log("Final POST URL:", `${this.apiBase}/analyze`);
  console.log("Request payload being sent:", payload);

  return this.http.post<any>(`${this.apiBase}/analyze`, payload).pipe(
    tap((response) => {
      console.log("AnalysisService response received.");
      console.log("Raw response:", JSON.parse(JSON.stringify(response)));
    }),
    catchError((err) => {
      console.error("AnalysisService error:");
      console.error("Error object:", err);
      console.error("Error JSON:", JSON.stringify(err, null, 2));
      throw err;
    })
  );
}

}
