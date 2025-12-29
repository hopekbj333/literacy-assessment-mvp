/**
 * 오디오 녹음 관리 클래스
 * 브라우저의 MediaRecorder API를 직접 사용하여 안정적인 녹음 제공
 */
class AudioRecorder {
    constructor() {
        this.mediaRecorder = null;
        this.audioChunks = [];
        this.isRecording = false;
        this.recordingDuration = 0;
        this.durationTimer = null;
        this.onDurationUpdate = null;
        this.onRecordingComplete = null;
    }

    /**
     * 녹음 시작
     * @param {Function} onDurationUpdate - 녹음 시간 업데이트 콜백 (seconds)
     * @param {Function} onComplete - 녹음 완료 콜백 (blobUrl)
     */
    async startRecording(onDurationUpdate, onComplete) {
        if (this.isRecording) {
            console.warn('이미 녹음 중입니다');
            return false;
        }

        try {
            console.log('마이크 접근 요청');
            
            // 마이크 접근 요청
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                }
            });

            console.log('마이크 접근 성공');

            // MediaRecorder 생성 및 즉시 시작 (지연 최소화)
            const mimeType = this.getSupportedMimeType();
            console.log('MediaRecorder 생성', { mimeType });

            this.mediaRecorder = new MediaRecorder(stream, {
                mimeType: mimeType,
                audioBitsPerSecond: 128000,
            });

            this.audioChunks = [];
            this.recordingDuration = 0;

            // 오디오 데이터 수집
            this.mediaRecorder.ondataavailable = (event) => {
                if (event.data && event.data.size > 0) {
                    this.audioChunks.push(event.data);
                    console.log('오디오 청크 수집', {
                        size: event.data.size,
                        chunks: this.audioChunks.length
                    });
                }
            };

            // 녹음 중지 이벤트 처리
            this.mediaRecorder.onstop = () => {
                console.log('MediaRecorder onstop 이벤트');
                this.finalizeRecording(onComplete);
                
                // 스트림 정리
                stream.getTracks().forEach(track => track.stop());
            };

            // 녹음 즉시 시작 (지연 없이)
            this.mediaRecorder.start(100); // 100ms마다 데이터 수집
            this.isRecording = true;

            // 녹음 시간 업데이트 타이머 시작
            this.onDurationUpdate = onDurationUpdate;
            this.durationTimer = setInterval(() => {
                if (this.isRecording) {
                    this.recordingDuration++;
                    if (this.onDurationUpdate) {
                        this.onDurationUpdate(this.recordingDuration);
                    }
                }
            }, 1000);

            console.log('녹음 시작 성공');
            return true;
        } catch (error) {
            console.error('녹음 시작 실패', error);
            this.isRecording = false;
            return false;
        }
    }

    /**
     * 녹음 중지
     */
    stopRecording() {
        if (!this.isRecording || !this.mediaRecorder) {
            console.warn('녹음 중이 아닙니다');
            return;
        }

        console.log('녹음 중지 요청');

        // 타이머 정리
        if (this.durationTimer) {
            clearInterval(this.durationTimer);
            this.durationTimer = null;
        }

        // 녹음 중지
        if (this.mediaRecorder.state === 'recording') {
            this.mediaRecorder.stop();
        }

        this.isRecording = false;
    }

    /**
     * 녹음 완료 처리 및 Blob URL 생성
     */
    finalizeRecording(onComplete) {
        try {
            if (this.audioChunks.length === 0) {
                console.warn('녹음된 오디오 데이터가 없습니다');
                if (onComplete) {
                    onComplete(null);
                }
                return;
            }

            // 모든 청크를 하나의 Blob으로 합치기
            const blob = new Blob(this.audioChunks, { type: 'audio/webm' });
            const blobUrl = URL.createObjectURL(blob);

            console.log('Blob URL 생성 완료', {
                blobUrl: blobUrl,
                blobSize: blob.size,
                duration: this.recordingDuration
            });

            if (onComplete) {
                onComplete(blobUrl, this.recordingDuration);
            }
        } catch (error) {
            console.error('녹음 완료 처리 실패', error);
            if (onComplete) {
                onComplete(null);
            }
        }
    }

    /**
     * 브라우저가 지원하는 MIME 타입 확인
     */
    getSupportedMimeType() {
        const types = [
            'audio/webm;codecs=opus',
            'audio/webm',
            'audio/mp4',
            'audio/ogg',
        ];

        for (const type of types) {
            if (MediaRecorder.isTypeSupported(type)) {
                return type;
            }
        }

        return 'audio/webm'; // 기본값
    }

    /**
     * 리소스 정리
     */
    dispose() {
        if (this.durationTimer) {
            clearInterval(this.durationTimer);
            this.durationTimer = null;
        }

        if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
            try {
                this.mediaRecorder.stop();
            } catch (e) {
                // 무시
            }
        }

        this.isRecording = false;
        this.audioChunks = [];
    }
}
