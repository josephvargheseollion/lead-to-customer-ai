// src/app/services/journey-upload.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { UploadEvent } from '../interfaces/upload-event';



@Injectable({ providedIn: 'root' })
export class JourneyUploadService {
    private readonly apiBase = `${environment.apiBaseUrl}`;

    constructor(
        private http: HttpClient
    ) {
        console.log('JourneyUploadService initialized with API base:', this.apiBase);
    }

    // 1) Initiate multipart upload
    initiateUpload(filename: string): Observable<any> {
        console.log('Initiating upload for filename:', filename);
        return this.http.post(`${this.apiBase}/upload`, { filename });
    }

    // 2) Upload a single chunk (NO presigned URLs)
    uploadPart(
        filename: string,
        uploadId: string,
        partNumber: number,
        totalParts: number,
        chunkBase64: string
    ): Observable<any> {
        console.log(
            `Uploading part ${partNumber}/${totalParts} for file ${filename} (no presigned URLs)`
        );
        return this.http.post(`${this.apiBase}/upload`, {
            filename,
            uploadId,
            partNumber,
            totalParts,
            chunkBase64,
        });
    }

    // 3) Complete multipart upload
    completeUpload(
        filename: string,
        uploadId: string,
        parts: { ETag: string; PartNumber: number }[]
    ): Observable<any> {
        console.log('Completing multipart upload for file:', filename);
        return this.http.post(`${this.apiBase}/upload/complete`, {
            filename,
            uploadId,
            parts,
        });
    }

    // Split file into 10MB chunks
    private chunkFile(file: File, chunkSize = 10 * 1024 * 1024): Blob[] {
        const chunks: Blob[] = [];
        let start = 0;
        while (start < file.size) {
            const end = Math.min(start + chunkSize, file.size);
            chunks.push(file.slice(start, end));
            start = end;
        }
        console.log(`File split into ${chunks.length} chunks.`);
        return chunks;
    }

    // Helper: Blob -> base64 (no external libs)
    private blobToBase64(blob: Blob): Promise<string> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                const result = reader.result as string;
                // result is "data:...;base64,XXXX"
                const base64 = result.split(',')[1] || '';
                resolve(base64);
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    }

    // Main upload pipeline, similar to VideoUploadService BUT without presigned URLs
    uploadFile(file: File): Observable<UploadEvent> {
        console.log('Starting multipart upload (no presigned URLs) for:', file.name);

        return new Observable<UploadEvent>((observer) => {
            const chunks = this.chunkFile(file);
            const totalParts = chunks.length;
            let uploadId = '';
            const uploadedParts: { ETag: string; PartNumber: number }[] = [];

            this.initiateUpload(file.name).subscribe({
                next: async (initRes: any) => {
                    console.log('Initiate upload response:', initRes);
                    uploadId = initRes.uploadId;

                    if (!uploadId) {
                        const errorMsg = 'UploadId missing from initiate upload response';
                        console.error(errorMsg, initRes);
                        observer.error(new Error(errorMsg));
                        return;
                    }

                    try {
                        for (let i = 0; i < totalParts; i++) {
                            const partNumber = i + 1;
                            const chunk = chunks[i];

                            // Convert chunk to base64
                            const base64 = await this.blobToBase64(chunk);

                            const res: any = await firstValueFrom(
                                this.uploadPart(
                                    file.name,
                                    uploadId,
                                    partNumber,
                                    totalParts,
                                    base64
                                )
                            );

                            const eTag = res.eTag || res.ETag || '';
                            if (!eTag) {
                                throw new Error(
                                    `Missing ETag in upload-part response for part ${partNumber}`
                                );
                            }

                            uploadedParts.push({ ETag: eTag, PartNumber: partNumber });

                            const progressPercent = Math.round(
                                (partNumber / totalParts) * 100
                            );
                            observer.next({ type: 'progress', progress: progressPercent });
                        }

                        // All parts uploaded, now complete
                        const completeRes = await firstValueFrom(
                            this.completeUpload(file.name, uploadId, uploadedParts)
                        );
                        observer.next({ type: 'complete', result: completeRes });
                        observer.complete();
                    } catch (err) {
                        console.error('Error in chunk upload loop:', err);
                        observer.error(err);
                    }
                },
                error: (err) => {
                    console.error('Error initiating upload:', err);
                    observer.error(err);
                },
            });
        });
    }
}
