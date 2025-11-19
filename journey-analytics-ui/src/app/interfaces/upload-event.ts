export interface UploadEvent {
    type: 'progress' | 'complete';
    progress?: number;
    result?: any;
}
