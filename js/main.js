/**
 * 메인 애플리케이션 로직
 */

// 전역 변수
let assessment = null;
let audioRecorder = null;
let speechRecognizer = null;
let ttsManager = null; // TTS 매니저
let currentRecordingBlobUrl = null;
let currentAudioPlayer = null;
let isPracticeIntroPlaying = false; // 검사 연습 안내 멘트 재생 중 여부
let practiceIntroStep = 0; // 검사 안내 단계: 0=멘트1, 1=스피커클릭대기, 2=멘트2완료, 3=멘트3완료, 4=마이크대기, 5=녹음완료, 6=완료
let isWaitingForSpeakerClick = false; // 스피커 클릭 대기 중
let isWaitingForMicRecording = false; // 마이크 녹음 대기 중

// 초기화
document.addEventListener('DOMContentLoaded', () => {
    assessment = new Assessment();
    audioRecorder = new AudioRecorder();
    speechRecognizer = new SpeechRecognizer();
    ttsManager = new TTSManager(); // TTS 매니저 초기화
    
    // 음성 인식 초기화
    if (!speechRecognizer.initialize()) {
        console.warn('음성 인식 기능을 사용할 수 없습니다');
    }

    // TTS 음성 목록 로드 대기 후 콘솔 헬퍼 함수 설정
    setTimeout(() => {
        setupTTSHelpers();
    }, 500);

    // 이벤트 리스너 설정
    setupEventListeners();
});

/**
 * TTS 콘솔 헬퍼 함수 설정 (디버깅 및 테스트용)
 */
function setupTTSHelpers() {
    // 전역 함수로 등록 (콘솔에서 사용 가능)
    window.listTTSVoices = () => {
        return ttsManager.listVoices();
    };

    window.selectTTSVoice = (voiceIdentifier) => {
        return ttsManager.selectVoice(voiceIdentifier);
    };

    window.getCurrentTTSVoice = () => {
        const voice = ttsManager.getSelectedVoice();
        if (voice) {
            console.log('현재 선택된 음성:', voice.name, voice.lang);
            return voice;
        }
        return null;
    };

    window.testTTSVoice = (voiceIdentifier, text = '안녕하세요. 음성 테스트입니다.') => {
        const success = ttsManager.selectVoice(voiceIdentifier);
        if (success) {
            ttsManager.speak(text);
            console.log('음성 테스트 재생 중...');
        }
        return success;
    };

    console.log('🎤 TTS 헬퍼 함수가 준비되었습니다!');
    console.log('사용 방법:');
    console.log('  - listTTSVoices() : 사용 가능한 음성 목록 보기');
    console.log('  - selectTTSVoice(이름 또는 인덱스) : 음성 변경');
    console.log('  - getCurrentTTSVoice() : 현재 선택된 음성 확인');
    console.log('  - testTTSVoice(이름 또는 인덱스, "테스트 문장") : 음성 테스트');
}

/**
 * 이벤트 리스너 설정
 */
function setupEventListeners() {
    // 시작 버튼
    document.getElementById('start-btn').addEventListener('click', () => {
        // 기존 TTS 재생 중지
        ttsManager.cancel();
        
        showScreen('practice-intro-screen');
        // 화면 전환 완료 후 충분한 시간 대기 (2.5초)
        setTimeout(() => {
            playPracticeIntroMessage();
        }, 1000);
    });

    // 검사 연습 안내 화면 스피커 클릭
    document.getElementById('practice-intro-speaker').addEventListener('click', () => {
        handlePracticeIntroSpeakerClick();
    });

    // 검사 연습 안내 화면 마이크 버튼 클릭
    document.getElementById('practice-intro-mic-btn').addEventListener('click', () => {
        handlePracticeIntroMicClick();
    });

    // 연습 시작 버튼
    document.getElementById('practice-start-btn').addEventListener('click', () => {
        // 안내 멘트 재생 중이면 동작하지 않음
        if (isPracticeIntroPlaying) {
            return;
        }
        // 모든 단계가 완료되어야만 진행 가능
        if (practiceIntroStep !== 6) {
            return;
        }
        startPracticeQuestions();
    });

    // 녹음 버튼
    document.getElementById('record-btn').addEventListener('click', toggleRecording);

    // 다음 버튼
    document.getElementById('next-btn').addEventListener('click', goToNextQuestion);

    // 재생 버튼
    document.getElementById('play-btn').addEventListener('click', togglePlayback);

    // 연습문제 이동 버튼
    document.getElementById('practice-next-btn').addEventListener('click', () => {
        goToNextQuestion();
    });

    // 스피커 아이콘 클릭 (다시 듣기)
    document.getElementById('question-speaker').addEventListener('click', () => {
        const question = assessment.getCurrentQuestion();
        if (!question) return;
        
        if (assessment.currentPhase === 'practice') {
            playPracticeQuestionAudio(question.question);
        } else {
            playQuestionAudio(question.question);
        }
    });

    // 끝 버튼 (처음 화면으로 이동)
    document.getElementById('restart-btn').addEventListener('click', () => {
        // TTS 중지
        ttsManager.cancel();
        
        // 녹음 중지
        if (audioRecorder.isRecording) {
            audioRecorder.stopRecording();
        }
        if (speechRecognizer.isRecognizing) {
            speechRecognizer.stop();
        }
        
        // 처음 화면으로 이동
        showScreen('intro-screen');
        
        // 상태 초기화
        assessment = new Assessment();
        practiceIntroStep = 0;
        isWaitingForSpeakerClick = false;
        isWaitingForMicRecording = false;
        isPracticeIntroPlaying = false;
    });
}

/**
 * 화면 전환
 */
function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
    document.getElementById(screenId).classList.add('active');
}

/**
 * 검사 연습 안내 멘트 재생 (단계별)
 */
function playPracticeIntroMessage() {
    practiceIntroStep = 0;
    isWaitingForSpeakerClick = false;
    isWaitingForMicRecording = false;
    
    const speaker = document.getElementById('practice-intro-speaker');
    const practiceStartBtn = document.getElementById('practice-start-btn');
    const micDisplay = document.getElementById('practice-mic-display');
    const micBtn = document.getElementById('practice-intro-mic-btn');
    
    // 초기화
    practiceStartBtn.disabled = true;
    practiceStartBtn.style.opacity = '0.5';
    practiceStartBtn.style.cursor = 'not-allowed';
    micDisplay.style.display = 'flex';
    micBtn.style.display = 'none';
    speaker.style.cursor = 'pointer';
    
    // 멘트1 재생
    // TTS 큐 완전히 비우기
    ttsManager.cancel();
    
    // TTS가 완전히 준비될 때까지 충분히 대기
    setTimeout(() => {
        speaker.classList.add('active');
        isPracticeIntroPlaying = true;
        
        // 전체 문장을 하나로 재생
        const message1 = '지금부터 음운처리능력 검사를 안내합니다. 첫째, 묻는 말을 다시 듣고 싶으면 스피커 모양을 누르면 됩니다. 지금 눌러 보세요.';
        
        ttsManager.speak(message1, {
            rate: 0.8,
            onStart: () => {
                console.log('멘트1 재생 시작:', message1);
            },
            onEnd: () => {
                speaker.classList.remove('active');
                isPracticeIntroPlaying = false;
                // 스피커 클릭 대기
                isWaitingForSpeakerClick = true;
                practiceIntroStep = 1;
            },
            onError: (event) => {
                console.error('TTS 오류:', event);
            }
        });
    }, 1000);
}

/**
 * 검사 안내 화면 스피커 클릭 처리
 */
function handlePracticeIntroSpeakerClick() {
    if (!isWaitingForSpeakerClick && practiceIntroStep !== 1) {
        // 다시 듣기 (처음부터 재생)
        playPracticeIntroMessage();
        return;
    }
    
    if (practiceIntroStep === 1) {
        // 스피커 클릭됨 - 멘트2 재생
        isWaitingForSpeakerClick = false;
        const speaker = document.getElementById('practice-intro-speaker');
        
        speaker.classList.add('active');
        isPracticeIntroPlaying = true;
        
        const message2 = '잘 했습니다.';
        ttsManager.speak(message2, {
            rate: 0.8,
            onEnd: () => {
                speaker.classList.remove('active');
                isPracticeIntroPlaying = false;
                practiceIntroStep = 2;
                // 멘트3 재생
                playPracticeIntroMessage3();
            }
        });
    }
}

/**
 * 검사 안내 멘트3 재생
 */
function playPracticeIntroMessage3() {
    const speaker = document.getElementById('practice-intro-speaker');
    const micDisplay = document.getElementById('practice-mic-display');
    const micBtn = document.getElementById('practice-intro-mic-btn');
    
    speaker.classList.add('active');
    isPracticeIntroPlaying = true;
    
    const message3 = '둘째, 묻는 말에 답을 할 때는 마이크 모양을 누릅니다. 그리고 잠시 후 답을 말하고, 말이 끝나면 멈춤 버튼을 누르면 됩니다. 마이크 모양을 눌러 보세요.';
    
    ttsManager.speak(message3, {
        rate: 0.8,
        onEnd: () => {
            speaker.classList.remove('active');
            isPracticeIntroPlaying = false;
            practiceIntroStep = 3;
            // 마이크 버튼 표시 및 대기 (마이크 디스플레이는 숨김)
            micDisplay.style.display = 'none';
            micBtn.style.display = 'block';
            isWaitingForMicRecording = true;
        }
    });
}

/**
 * 검사 안내 화면 마이크 버튼 클릭 처리
 */
async function handlePracticeIntroMicClick() {
    const micBtn = document.getElementById('practice-intro-mic-btn');
    const micIcon = document.getElementById('practice-mic-icon');
    const stopIcon = document.getElementById('practice-stop-icon');
    
    console.log('마이크 버튼 클릭:', {
        practiceIntroStep,
        isWaitingForMicRecording,
        isRecording: audioRecorder.isRecording
    });
    
    // 녹음 중인 경우 중지
    if (audioRecorder.isRecording) {
        console.log('녹음 중지');
        audioRecorder.stopRecording();
        // 녹음 중지 후 UI는 녹음 완료 콜백에서 처리됨
        return;
    }
    
    // 녹음 시작 (practiceIntroStep이 3이고 대기 중일 때만)
    if (practiceIntroStep === 3 && isWaitingForMicRecording) {
        console.log('녹음 시작 시도');
        
        const success = await audioRecorder.startRecording(
            (seconds) => {
                // 녹음 시간은 표시하지 않음
            },
            (blobUrl, duration) => {
                // 녹음 완료
                console.log('녹음 완료 콜백 호출');
                onPracticeIntroRecordingComplete();
            }
        );
        
        if (success) {
            console.log('녹음 시작 성공');
            micIcon.style.display = 'none';
            stopIcon.style.display = 'block';
            isWaitingForMicRecording = false;
            practiceIntroStep = 4;
        } else {
            console.error('녹음 시작 실패');
            alert('녹음을 시작할 수 없습니다.\n\n1. 브라우저 주소창에서 마이크 권한을 허용해주세요.\n2. HTTPS로 접속했는지 확인해주세요.');
        }
    }
}

/**
 * 검사 안내 녹음 완료 처리
 */
function onPracticeIntroRecordingComplete() {
    const micBtn = document.getElementById('practice-intro-mic-btn');
    const micIcon = document.getElementById('practice-mic-icon');
    const stopIcon = document.getElementById('practice-stop-icon');
    
    micIcon.style.display = 'block';
    stopIcon.style.display = 'none';
    practiceIntroStep = 5;
    
    // 멘트4 재생
    const message4 = '모두 잘 했습니다. 준비가 다 되었으면 연습1로 이동 버튼을 눌러 주세요.';
    ttsManager.speak(message4, {
        rate: 0.8,
        onEnd: () => {
            practiceIntroStep = 6;
            // 연습1로 이동 버튼 활성화 (마이크 버튼은 숨기고, 마이크 디스플레이는 다시 표시)
            const practiceStartBtn = document.getElementById('practice-start-btn');
            const micDisplay = document.getElementById('practice-mic-display');
            practiceStartBtn.disabled = false;
            practiceStartBtn.style.opacity = '1';
            practiceStartBtn.style.cursor = 'pointer';
            micBtn.style.display = 'none';
            micDisplay.style.display = 'flex'; // 초기 화면으로 복원
        }
    });
}

/**
 * 연습문제 시작
 */
function startPracticeQuestions() {
    assessment.currentPhase = 'practice';
    assessment.currentPhaseIndex = 0;
    assessment.currentQuestionIndex = 0;
    
    showScreen('question-screen');
    updateQuestionDisplay();
    updateQuestionNavigation();
}

/**
 * 문항 표시 업데이트
 */
function updateQuestionDisplay() {
    const question = assessment.getCurrentQuestion();
    if (!question) return;

    // 제목 업데이트
    const title = document.getElementById('question-title');
    if (assessment.currentPhase === 'practice') {
        title.textContent = `연습${assessment.currentPhaseIndex + 1}`;
    } else {
        title.textContent = `문항 ${assessment.currentPhaseIndex + 1}`;
    }

    // 문항 멘트 재생 (화면 전환 후 1초 뒤에 재생)
    setTimeout(() => {
        if (assessment.currentPhase === 'practice') {
            // 연습문제일 때는 안내 멘트를 먼저 재생
            playPracticeQuestionAudio(question.question);
        } else {
            // 본 문항일 때는 질문만 재생
            playQuestionAudio(question.question);
        }
    }, 1000);

    // UI 초기화
    resetQuestionUI();
    
    // 본 문항이고 마지막 문항인 경우 버튼 텍스트 변경
    if (assessment.currentPhase === 'main') {
        const nextBtn = document.getElementById('next-btn');
        if (assessment.currentPhaseIndex === assessment.questions.main.length - 1) {
            nextBtn.textContent = '검사 결과 보기 →';
        } else {
            nextBtn.textContent = '다음 문제로 →';
        }
    }
}

/**
 * 연습문제 멘트 재생 (안내 멘트 + 질문)
 */
function playPracticeQuestionAudio(questionText) {
    const speaker = document.getElementById('question-speaker');
    speaker.classList.add('active');

    // 현재 연습문제 인덱스에 따른 멘트
    const practiceMessages = [
        '고추잠자리에서 고추 소리를 빼고 나머지 소리를 말해 주세요.', // 연습1
        '종이접기에서 종이 소리를 빼고 나머지 소리를 말해 주세요.',     // 연습2
        '우주여행에서 우주 소리를 빼고 나머지 소리를 말해 주세요.'    // 연습3
    ];

    const currentIndex = assessment.currentPhaseIndex;
    const message = practiceMessages[currentIndex] || practiceMessages[0];

    // 안내 멘트 재생
    ttsManager.speak(message, {
        rate: 0.8,
        onEnd: () => {
            speaker.classList.remove('active');
        }
    });
}

/**
 * 문항 멘트 재생 (본 문항)
 */
function playQuestionAudio(text) {
    const speaker = document.getElementById('question-speaker');
    speaker.classList.add('active');

    ttsManager.speak(text, {
        rate: 0.8,
        onEnd: () => {
            speaker.classList.remove('active');
        }
    });
}

/**
 * 문항 UI 초기화
 */
function resetQuestionUI() {
    document.getElementById('recording-time').style.display = 'none';
    document.getElementById('recognition-result').style.display = 'none';
    document.getElementById('recording-complete').style.display = 'none';
    document.getElementById('answer-feedback').style.display = 'none';
    document.getElementById('playback-section').style.display = 'none';
    document.getElementById('next-btn').style.display = 'none';
    
    // 연습문제 이동 버튼 초기화
    const practiceNextBtn = document.getElementById('practice-next-btn');
    practiceNextBtn.style.display = 'none';
    practiceNextBtn.disabled = true;
    practiceNextBtn.style.opacity = '0.5';
    practiceNextBtn.style.cursor = 'not-allowed';
    
    const recordBtn = document.getElementById('record-btn');
    recordBtn.classList.remove('recording');
    document.getElementById('mic-icon').style.display = 'block';
    document.getElementById('stop-icon').style.display = 'none';
}

/**
 * 녹음 토글
 */
async function toggleRecording() {
    const recordBtn = document.getElementById('record-btn');
    
    if (!audioRecorder.isRecording) {
        // 녹음 시작
        const question = assessment.getCurrentQuestion();
        const isPractice = assessment.currentPhase === 'practice';

        const success = await audioRecorder.startRecording(
            (seconds) => {
                // 녹음 시간 업데이트
                const timeDisplay = document.getElementById('recording-time');
                timeDisplay.textContent = formatTime(seconds);
                timeDisplay.style.display = 'block';
            },
            (blobUrl, duration) => {
                // 녹음 완료
                currentRecordingBlobUrl = blobUrl;
                onRecordingComplete(blobUrl, duration, isPractice);
            }
        );

        if (success) {
            recordBtn.classList.add('recording');
            document.getElementById('mic-icon').style.display = 'none';
            document.getElementById('stop-icon').style.display = 'block';

            // 음성 인식 시작 (연습문제와 본 문항 모두)
            startSpeechRecognition();
            
            // 연습문제인 경우 이동 버튼 비활성화
            if (isPractice) {
                const practiceNextBtn = document.getElementById('practice-next-btn');
                practiceNextBtn.disabled = true;
                practiceNextBtn.style.opacity = '0.5';
                practiceNextBtn.style.cursor = 'not-allowed';
            }
        } else {
            alert('녹음을 시작할 수 없습니다.\n\n1. 브라우저 주소창에서 마이크 권한을 허용해주세요.\n2. HTTPS로 접속했는지 확인해주세요.');
        }
    } else {
        // 녹음 중지
        audioRecorder.stopRecording();
        speechRecognizer.stop();

        recordBtn.classList.remove('recording');
        document.getElementById('mic-icon').style.display = 'block';
        document.getElementById('stop-icon').style.display = 'none';
        document.getElementById('recording-time').style.display = 'none';
    }
}

/**
 * 음성 인식 시작
 */
function startSpeechRecognition() {
    const recognitionResult = document.getElementById('recognition-result');
    recognitionResult.style.display = 'block';

    speechRecognizer.onResult = (text, isFinal) => {
        document.getElementById('recognized-text').textContent = text;
    };

    speechRecognizer.onError = (error) => {
        console.error('음성 인식 오류', error);
    };

    speechRecognizer.start();
}

/**
 * 녹음 완료 처리
 */
function onRecordingComplete(blobUrl, duration, isPractice) {
    document.getElementById('recording-complete').style.display = 'block';

    // 음성 인식 결과 확인 (연습문제와 본 문항 모두)
    if (duration > 0) {
        setTimeout(() => {
            const recognizedText = speechRecognizer.getRecognizedText();
            if (isPractice) {
                // 연습문제는 정답 확인 및 피드백 표시
                checkAnswer(recognizedText, isPractice);
            } else {
                // 본 문항은 답변만 저장 (정답 확인 및 피드백 없음)
                const question = assessment.getCurrentQuestion();
                if (question && recognizedText) {
                    const isCorrect = assessment.checkAnswer(recognizedText, question.correctAnswer);
                    // 녹음된 음성 blob URL도 함께 저장
                    console.log('본 문항 답변 저장:', {
                        questionId: question.itemId,
                        answer: recognizedText,
                        isCorrect: isCorrect,
                        blobUrl: blobUrl
                    });
                    assessment.saveAnswer(question.itemId, recognizedText, isCorrect, blobUrl);
                } else if (question && !recognizedText && blobUrl) {
                    // 음성 인식이 실패했어도 녹음이 있으면 저장
                    console.log('본 문항 답변 저장 (인식 실패, 녹음만 저장):', {
                        questionId: question.itemId,
                        blobUrl: blobUrl
                    });
                    assessment.saveAnswer(question.itemId, '', null, blobUrl);
                }
                // 마지막 문항(문항20)인 경우 안내 멘트 재생
                const isLastQuestion = assessment.currentPhaseIndex === assessment.questions.main.length - 1;
                
                if (isLastQuestion) {
                    // 문항20: 검사 완료 안내 멘트 재생
                    const completionMessage = '검사가 모두 끝났습니다. 검사 결과를 보려면 아래 검사 결과 보기 버튼을 눌러 주세요. 수고했습니다.';
                    ttsManager.speak(completionMessage, {
                        rate: 0.8,
                        onEnd: () => {
                            // 멘트 재생 완료 후 버튼 표시
                            const nextBtn = document.getElementById('next-btn');
                            nextBtn.style.display = 'block';
                            nextBtn.textContent = '검사 결과 보기 →';
                        }
                    });
                } else {
                    // 다음 버튼 표시
                    const nextBtn = document.getElementById('next-btn');
                    nextBtn.style.display = 'block';
                    nextBtn.textContent = '다음 문제로 →';
                }
            }
        }, 500); // 지연 시간 단축 (1000ms → 500ms)
    } else {
        // 본 문항은 녹음이 없어도 다음으로 이동 가능
        if (!isPractice) {
            const isLastQuestion = assessment.currentPhaseIndex === assessment.questions.main.length - 1;
            
            if (isLastQuestion) {
                // 문항20: 녹음이 없어도 검사 완료 안내 멘트 재생
                const completionMessage = '검사가 모두 끝났습니다. 검사 결과를 보려면 아래 검사 결과 보기 버튼을 눌러 주세요. 수고했습니다.';
                ttsManager.speak(completionMessage, {
                    rate: 0.8,
                    onEnd: () => {
                        // 멘트 재생 완료 후 버튼 표시
                        const nextBtn = document.getElementById('next-btn');
                        nextBtn.style.display = 'block';
                        nextBtn.textContent = '검사 결과 보기 →';
                    }
                });
            } else {
                // 다음 버튼 표시
                const nextBtn = document.getElementById('next-btn');
                nextBtn.style.display = 'block';
                nextBtn.textContent = '다음 문제로 →';
            }
        }
    }

    // 녹음 재생 버튼 표시 (연습문제만)
    if (isPractice && duration > 0) {
        document.getElementById('playback-section').style.display = 'block';
    }
}

/**
 * 정답 확인
 */
function checkAnswer(recognizedText, isPractice) {
    if (!recognizedText) {
        console.warn('인식된 텍스트가 없습니다');
        return;
    }

    const question = assessment.getCurrentQuestion();
    if (!question) {
        console.error('현재 문항을 가져올 수 없습니다');
        return;
    }

    console.log('정답 확인 시작:', {
        인식된텍스트: recognizedText,
        정답: question.correctAnswer,
        문항ID: question.itemId
    });

    const isCorrect = assessment.checkAnswer(recognizedText, question.correctAnswer);

    // 답변 저장 (연습문제는 녹음 재생이 이미 표시되므로 audioBlobUrl은 저장하지 않음)
    assessment.saveAnswer(question.itemId, recognizedText, isCorrect, null);

    // 피드백 표시
    const feedback = document.getElementById('answer-feedback');
    feedback.style.display = 'block';
    
    if (isCorrect) {
        feedback.className = 'answer-feedback correct';
        document.getElementById('feedback-text').textContent = '정답입니다!';
        
        // 정답 음성 멘트 재생
        const correctOptions = {
            rate: 0.8
        };
        
        // 연습3인 경우 추가 멘트 재생
        if (isPractice && assessment.currentPhaseIndex === 2) {
            correctOptions.onEnd = () => {
                ttsManager.speak('본 문항으로 이동하려면 아래 본 문항으로 이동 버튼을 눌러 주세요.', {
                    rate: 0.8
                });
            };
        }
        
        ttsManager.speak('정답입니다.', correctOptions);
    } else {
        feedback.className = 'answer-feedback incorrect';
        document.getElementById('feedback-text').textContent = '다시 생각해보세요';
        
        // 오답 음성 멘트 재생
        ttsManager.speak('다시 생각해 보세요.', {
            rate: 0.8
        });
    }

    document.getElementById('recognized-answer').textContent = `인식된 답변: ${recognizedText}`;

    // 연습문제인 경우 연습문제 이동 버튼 활성화
    if (isPractice) {
        const practiceNextBtn = document.getElementById('practice-next-btn');
        const totalExamples = assessment.questions.examples.length;
        const currentPracticeIndex = assessment.currentPhaseIndex;
        
        // 다음 연습문제 번호 결정
        if (currentPracticeIndex < totalExamples - 1) {
            practiceNextBtn.textContent = `연습${currentPracticeIndex + 2}로 이동`;
        } else {
            // 마지막 연습문제면 본 문항으로 이동
            practiceNextBtn.textContent = '본 문항으로 이동';
        }
        
        practiceNextBtn.style.display = 'block';
        practiceNextBtn.disabled = false;
        practiceNextBtn.style.opacity = '1';
        practiceNextBtn.style.cursor = 'pointer';
    } else {
        // 본 문항은 다음 버튼 표시
        const nextBtn = document.getElementById('next-btn');
        nextBtn.style.display = 'block';
        
        // 마지막 문항(문항20)인 경우 버튼 텍스트 변경
        if (assessment.currentPhaseIndex === assessment.questions.main.length - 1) {
            nextBtn.textContent = '검사 결과 보기 →';
        } else {
            nextBtn.textContent = '다음 문제로 →';
        }
    }
}

/**
 * 다음 문항으로 이동
 */
function goToNextQuestion() {
    assessment.nextQuestion();

    if (assessment.currentPhase === 'result') {
        showResultScreen();
    } else {
        updateQuestionDisplay();
        updateQuestionNavigation();
    }
}

/**
 * 특정 문항으로 이동
 */
function navigateToQuestion(targetIndex) {
    if (targetIndex < 0) return;

    const totalExamples = assessment.questions.examples.length;
    const totalMain = assessment.questions.main.length;
    const total = totalExamples + totalMain;

    if (targetIndex >= total) return;

    // 현재 문항 인덱스 업데이트
    assessment.currentQuestionIndex = targetIndex;

    // 연습문제인지 본 문항인지 판단
    if (targetIndex < totalExamples) {
        // 연습문제
        assessment.currentPhase = 'practice';
        assessment.currentPhaseIndex = targetIndex;
    } else {
        // 본 문항
        assessment.currentPhase = 'main';
        assessment.currentPhaseIndex = targetIndex - totalExamples;
    }

    // 녹음 중이면 중지
    if (audioRecorder.isRecording) {
        audioRecorder.stopRecording();
    }
    if (speechRecognizer.isRecognizing) {
        speechRecognizer.stop();
    }

    // 화면 업데이트
    updateQuestionDisplay();
    updateQuestionNavigation();
    
    // UI 초기화
    resetQuestionUI();
    
    console.log(`문항 ${targetIndex + 1}로 이동 완료`);
}

/**
 * 문항 네비게이션 업데이트
 */
function updateQuestionNavigation() {
    const container = document.getElementById('question-numbers');
    container.innerHTML = '';

    const totalExamples = assessment.questions.examples.length;
    const totalMain = assessment.questions.main.length;

    // 연습문제일 때는 1, 2, 3만 표시
    if (assessment.currentPhase === 'practice') {
        for (let i = 0; i < totalExamples; i++) {
            const btn = document.createElement('button');
            btn.className = 'question-number';
            btn.textContent = i + 1;

            if (i === assessment.currentPhaseIndex) {
                btn.classList.add('current');
            }

            // 완료된 문항 표시
            if (i < assessment.currentPhaseIndex) {
                btn.classList.add('completed');
            }

            // 클릭 이벤트
            btn.addEventListener('click', () => {
                navigateToQuestion(i);
            });

            container.appendChild(btn);
        }
    } else {
        // 본 문항일 때는 1~20만 표시
        for (let i = 0; i < totalMain; i++) {
            const btn = document.createElement('button');
            btn.className = 'question-number';
            btn.textContent = i + 1;

            if (i === assessment.currentPhaseIndex) {
                btn.classList.add('current');
            }

            // 완료된 문항 표시
            if (i < assessment.currentPhaseIndex) {
                btn.classList.add('completed');
            }

            // 클릭 이벤트 (전체 인덱스로 변환: 연습문제 개수 + 본 문항 인덱스)
            btn.addEventListener('click', () => {
                navigateToQuestion(totalExamples + i);
            });

            container.appendChild(btn);
        }
    }
}

/**
 * 녹음 재생 토글
 */
function togglePlayback() {
    if (!currentRecordingBlobUrl) return;

    if (currentAudioPlayer && !currentAudioPlayer.paused) {
        // 재생 중지
        currentAudioPlayer.pause();
        currentAudioPlayer.currentTime = 0;
        currentAudioPlayer = null;
    } else {
        // 재생 시작
        currentAudioPlayer = new Audio(currentRecordingBlobUrl);
        currentAudioPlayer.play();
        
        currentAudioPlayer.onended = () => {
            currentAudioPlayer = null;
        };
    }
}

/**
 * 결과 화면 표시
 */
function showResultScreen() {
    showScreen('result-screen');
    
    const summary = assessment.getResultSummary();
    const mainAnswers = assessment.getMainAnswers();
    const summaryDiv = document.getElementById('result-summary');
    
    // 본 문항 점수 표시
    let html = `
        <h3>검사 결과</h3>
        <p style="font-size: 1.2em; margin: 20px 0;"><strong>${summary.main.correct} / ${summary.main.total}</strong></p>
        <h4>문항별 답변</h4>
        <div style="max-height: 400px; overflow-y: auto; margin-top: 20px;">
    `;
    
    // 본 문항 20개 답변 리스트
    mainAnswers.forEach((item, index) => {
        const statusClass = item.isCorrect === true ? 'correct' : item.isCorrect === false ? 'incorrect' : 'no-answer';
        const statusText = item.isCorrect === true ? '✓ 정답' : item.isCorrect === false ? '✗ 오답' : '미답변';
        const statusColor = item.isCorrect === true ? '#4caf50' : item.isCorrect === false ? '#f44336' : '#999';
        const hasAudio = item.audioBlobUrl !== null && item.audioBlobUrl !== undefined && item.audioBlobUrl !== '';
        
        // 디버깅: 음성 파일 존재 여부 확인
        if (index === 0) {
            console.log('결과 화면 - 첫 번째 문항:', {
                questionNumber: item.questionNumber,
                audioBlobUrl: item.audioBlobUrl,
                hasAudio: hasAudio
            });
        }
        
        html += `
            <div style="padding: 10px; margin: 5px 0; border-left: 4px solid ${statusColor}; background: #f5f5f5;">
                <div style="font-weight: bold; margin-bottom: 5px; display: flex; align-items: center; gap: 10px;">
                    <span>문항 ${item.questionNumber}: ${statusText}</span>
                    ${hasAudio ? `<button id="play-audio-${index}" style="padding: 5px 15px; background: #667eea; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 0.85em;">🔊 재생</button>` : ''}
                </div>
                <div style="font-size: 0.9em; color: #666; margin-bottom: 3px;">
                    ${item.question}
                </div>
                <div style="font-size: 0.9em;">
                    <strong>정답:</strong> ${item.correctAnswer} | 
                    <strong>답변:</strong> ${item.userAnswer || '(없음)'}
                </div>
            </div>
        `;
    });
    
    html += `</div>`;
    
    summaryDiv.innerHTML = html;
    
    // 각 문항별 음성 재생 버튼 이벤트 리스너 추가
    mainAnswers.forEach((item, index) => {
        if (item.audioBlobUrl) {
            const playBtn = document.getElementById(`play-audio-${index}`);
            if (playBtn) {
                let audioPlayer = null;
                playBtn.addEventListener('click', () => {
                    if (audioPlayer && !audioPlayer.paused) {
                        // 재생 중이면 중지
                        audioPlayer.pause();
                        audioPlayer.currentTime = 0;
                        audioPlayer = null;
                        playBtn.textContent = '🔊 재생';
                    } else {
                        // 재생 시작
                        audioPlayer = new Audio(item.audioBlobUrl);
                        playBtn.textContent = '⏸ 정지';
                        audioPlayer.play();
                        
                        audioPlayer.onended = () => {
                            audioPlayer = null;
                            playBtn.textContent = '🔊 재생';
                        };
                        
                        audioPlayer.onerror = () => {
                            console.error('음성 재생 오류');
                            audioPlayer = null;
                            playBtn.textContent = '🔊 재생';
                        };
                    }
                });
            }
        }
    });
}

/**
 * 시간 포맷팅
 */
function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

