/**
 * 음성 인식 (Speech-to-Text) 관리 클래스
 * Web Speech API 사용
 */
class SpeechRecognizer {
    constructor() {
        this.recognition = null;
        this.isRecognizing = false;
        this.recognizedText = '';
        this.onResult = null;
        this.onError = null;
    }

    /**
     * 음성 인식 초기화
     */
    initialize() {
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            console.warn('이 브라우저는 음성 인식을 지원하지 않습니다');
            return false;
        }

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        this.recognition = new SpeechRecognition();

        // 설정
        this.recognition.lang = 'ko-KR';
        this.recognition.continuous = true; // 연속 인식
        this.recognition.interimResults = true; // 중간 결과도 받기

        // 이벤트 핸들러
        this.recognition.onresult = (event) => {
            let interimTranscript = '';
            let finalTranscript = '';

            for (let i = event.resultIndex; i < event.results.length; i++) {
                const transcript = event.results[i][0].transcript;
                if (event.results[i].isFinal) {
                    finalTranscript += transcript;
                } else {
                    interimTranscript += transcript;
                }
            }

            // 최종 결과가 있으면 사용
            if (finalTranscript) {
                this.recognizedText = finalTranscript.trim();
                console.log('음성 인식 최종 결과', this.recognizedText);
                if (this.onResult) {
                    this.onResult(this.recognizedText, true);
                }
            } else if (interimTranscript) {
                // 중간 결과도 콜백 호출
                console.log('음성 인식 중간 결과', interimTranscript.trim());
                if (this.onResult) {
                    this.onResult(interimTranscript.trim(), false);
                }
            }
        };

        this.recognition.onerror = (event) => {
            console.error('음성 인식 오류', event.error);
            if (this.onError) {
                this.onError(event.error);
            }
        };

        this.recognition.onend = () => {
            console.log('음성 인식 종료');
            this.isRecognizing = false;
        };

        return true;
    }

    /**
     * 음성 인식 시작
     */
    start() {
        if (!this.recognition) {
            console.error('음성 인식이 초기화되지 않았습니다');
            return false;
        }

        if (this.isRecognizing) {
            console.warn('이미 인식 중입니다');
            return false;
        }

        try {
            this.recognizedText = '';
            this.recognition.start();
            this.isRecognizing = true;
            console.log('음성 인식 시작');
            return true;
        } catch (error) {
            console.error('음성 인식 시작 실패', error);
            return false;
        }
    }

    /**
     * 음성 인식 중지
     */
    stop() {
        if (!this.recognition || !this.isRecognizing) {
            return;
        }

        try {
            this.recognition.stop();
            this.isRecognizing = false;
            console.log('음성 인식 중지');
        } catch (error) {
            console.error('음성 인식 중지 실패', error);
        }
    }

    /**
     * 최종 인식된 텍스트 가져오기
     */
    getRecognizedText() {
        return this.recognizedText;
    }
}
