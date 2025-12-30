/**
 * TTS (Text-to-Speech) 관리 클래스
 * Web Speech API를 사용하여 음성 품질 최적화
 */
class TTSManager {
    constructor() {
        this.voices = [];
        this.selectedVoice = null;
        this.isInitialized = false;
        this.init();
    }

    /**
     * TTS 초기화 및 최적 음성 선택
     */
    async init() {
        // 음성 목록 로드 대기
        const loadVoices = () => {
            this.voices = speechSynthesis.getVoices();
            
            if (this.voices.length > 0) {
                this.selectBestKoreanVoice();
                this.isInitialized = true;
            }
        };

        // Chrome에서는 voiceschanged 이벤트 필요
        if (speechSynthesis.onvoiceschanged !== undefined) {
            speechSynthesis.onvoiceschanged = loadVoices;
        }
        
        // 즉시 로드 시도
        loadVoices();
        
        // 일부 브라우저에서는 약간의 지연 필요
        setTimeout(loadVoices, 100);
    }

    /**
     * 최적의 한국어 음성 선택
     */
    selectBestKoreanVoice() {
        // 한국어 음성 필터링
        const koreanVoices = this.voices.filter(voice => 
            voice.lang.startsWith('ko') || 
            voice.lang.includes('Korean') ||
            voice.name.includes('Korean')
        );

        if (koreanVoices.length === 0) {
            console.warn('한국어 음성을 찾을 수 없습니다. 기본 음성 사용');
            return;
        }

        // 우선순위: 
        // 1. Google Korean (Chrome)
        // 2. Microsoft Yuna (Edge)
        // 3. 기타 한국어 음성
        const preferredVoices = [
            'Google 한국의',
            'Microsoft Yuna',
            'Yuna',
            'Korean',
            'ko-KR'
        ];

        for (const preferred of preferredVoices) {
            const voice = koreanVoices.find(v => 
                v.name.includes(preferred) || 
                v.name === preferred
            );
            if (voice) {
                this.selectedVoice = voice;
                console.log('선택된 음성:', voice.name, voice.lang);
                return;
            }
        }

        // 우선순위에 없으면 첫 번째 한국어 음성 사용
        this.selectedVoice = koreanVoices[0];
        console.log('선택된 음성 (기본):', this.selectedVoice.name, this.selectedVoice.lang);
    }

    /**
     * TTS 재생
     * @param {string} text - 읽을 텍스트
     * @param {Object} options - 옵션
     * @param {number} options.rate - 속도 (0.1 ~ 10, 기본값: 0.8)
     * @param {number} options.pitch - 음높이 (0 ~ 2, 기본값: 1.0)
     * @param {number} options.volume - 볼륨 (0 ~ 1, 기본값: 1.0)
     * @param {Function} options.onStart - 시작 콜백
     * @param {Function} options.onEnd - 종료 콜백
     * @param {Function} options.onError - 오류 콜백
     */
    speak(text, options = {}) {
        // 기존 재생 중지
        speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        
        // 언어 설정
        utterance.lang = 'ko-KR';
        
        // 음성 선택
        if (this.selectedVoice) {
            utterance.voice = this.selectedVoice;
        }

        // 옵션 설정
        utterance.rate = options.rate || 0.8;  // 약간 빠르게 (0.7 → 0.8)
        utterance.pitch = options.pitch || 1.0;
        utterance.volume = options.volume || 1.0;

        // 이벤트 핸들러
        if (options.onStart) {
            utterance.onstart = options.onStart;
        }

        if (options.onEnd) {
            utterance.onend = options.onEnd;
        }

        if (options.onError) {
            utterance.onerror = options.onError;
        }

        // 재생
        speechSynthesis.speak(utterance);
        return Promise.resolve();
    }

    /**
     * TTS 중지
     */
    cancel() {
        speechSynthesis.cancel();
    }

    /**
     * 사용 가능한 음성 목록 반환
     */
    getVoices() {
        return this.voices;
    }

    /**
     * 현재 선택된 음성 반환
     */
    getSelectedVoice() {
        return this.selectedVoice;
    }

    /**
     * 특정 음성으로 변경
     * @param {string|number} voiceIdentifier - 음성 이름 또는 인덱스
     */
    selectVoice(voiceIdentifier) {
        // 음성 목록이 아직 로드되지 않았으면 재시도
        if (this.voices.length === 0) {
            this.voices = speechSynthesis.getVoices();
        }

        let voice = null;

        // 인덱스로 선택
        if (typeof voiceIdentifier === 'number') {
            voice = this.voices[voiceIdentifier];
        } 
        // 이름으로 선택
        else if (typeof voiceIdentifier === 'string') {
            // 정확한 이름 매칭
            voice = this.voices.find(v => v.name === voiceIdentifier);
            
            // 부분 매칭 (포함)
            if (!voice) {
                voice = this.voices.find(v => 
                    v.name.includes(voiceIdentifier) || 
                    voiceIdentifier.includes(v.name)
                );
            }
        }

        if (voice) {
            // 한국어 음성인지 확인
            const isKorean = voice.lang.startsWith('ko') || 
                           voice.lang.includes('Korean') ||
                           voice.name.includes('Korean');
            
            if (isKorean) {
                this.selectedVoice = voice;
                console.log('음성 변경됨:', voice.name, voice.lang);
                return true;
            } else {
                console.warn('한국어 음성이 아닙니다:', voice.name, voice.lang);
                return false;
            }
        } else {
            console.error('음성을 찾을 수 없습니다:', voiceIdentifier);
            return false;
        }
    }

    /**
     * 사용 가능한 한국어 음성 목록 반환
     */
    getKoreanVoices() {
        if (this.voices.length === 0) {
            this.voices = speechSynthesis.getVoices();
        }
        
        return this.voices.filter(voice => 
            voice.lang.startsWith('ko') || 
            voice.lang.includes('Korean') ||
            voice.name.includes('Korean')
        );
    }

    /**
     * 음성 목록을 콘솔에 출력 (디버깅용)
     */
    listVoices() {
        const koreanVoices = this.getKoreanVoices();
        
        console.log('=== 사용 가능한 한국어 음성 목록 ===');
        koreanVoices.forEach((voice, index) => {
            const isSelected = voice === this.selectedVoice ? ' ← 현재 선택됨' : '';
            console.log(`${index}. ${voice.name} (${voice.lang})${isSelected}`);
        });
        console.log('=====================================');
        
        return koreanVoices;
    }
}

