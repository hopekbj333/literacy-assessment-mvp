# 문해력 기초 검사 MVP - 순수 HTML5/JavaScript 버전

Flutter Web의 녹음 문제를 해결하기 위해 순수 HTML5/JavaScript로 구현한 MVP 프로토타입입니다.

## 🚀 빠른 시작

### 1. 로컬 서버 실행

**옵션 1: Python (권장)**
```bash
cd mvp-web-assessment
python -m http.server 8000
```

**옵션 2: Node.js**
```bash
cd mvp-web-assessment
npx http-server -p 8000
```

**옵션 3: VS Code Live Server**
- VS Code에서 `index.html` 우클릭 → "Open with Live Server"

### 2. 브라우저에서 열기

```
http://localhost:8000
```

**중요:** HTTPS가 아닌 경우 일부 브라우저에서 마이크 접근이 제한될 수 있습니다. `localhost`는 대부분 허용됩니다.

## ✨ 주요 기능

1. **안정적인 녹음 기능**
   - 브라우저의 MediaRecorder API 직접 사용
   - Flutter 패키지 의존성 없음
   - 웹 표준만 사용하여 안정성 보장

2. **음성 인식 (STT)**
   - Web Speech API 사용
   - 연습문제에서 자동 정답 확인

3. **검사 흐름**
   - 연습문제 안내
   - 연습문제 3개
   - 본 문항 20개
   - 결과 화면

## 📁 파일 구조

```
mvp-web-assessment/
├── index.html          # 메인 HTML
├── css/
│   └── style.css      # 스타일
├── js/
│   ├── recorder.js    # 녹음 기능
│   ├── stt.js         # 음성 인식
│   ├── assessment.js  # 검사 로직
│   └── main.js        # 메인 애플리케이션
├── data/
│   └── questions.json # 문항 데이터
└── README.md          # 이 파일
```

## 🔧 기술 스택

- **HTML5**: 구조
- **CSS3**: 스타일링
- **JavaScript (ES6+)**: 로직
- **MediaRecorder API**: 오디오 녹음
- **Web Speech API**: 음성 인식
- **SpeechSynthesis API**: TTS

## 📝 사용 방법

1. **검사 시작**: "검사 시작" 버튼 클릭
2. **연습문제 안내**: 안내 멘트 듣기
3. **녹음**: 마이크 버튼 클릭하여 녹음 시작/중지
4. **정답 확인**: 연습문제는 자동으로 정답 확인
5. **다음 문항**: "다음 문제로" 버튼 클릭
6. **결과 확인**: 모든 문항 완료 후 결과 화면

## ⚠️ 주의사항

1. **마이크 권한**: 브라우저에서 마이크 권한을 허용해야 합니다.
2. **HTTPS**: 프로덕션 환경에서는 HTTPS가 필요합니다.
3. **브라우저 호환성**: 
   - Chrome/Edge: 완전 지원
   - Firefox: 지원
   - Safari: 제한적 지원 (음성 인식)

## 🐛 문제 해결

### 녹음이 안 될 때
1. 브라우저 주소창 왼쪽 자물쇠 아이콘 클릭
2. 마이크 권한을 "허용"으로 변경
3. 페이지 새로고침

### 음성 인식이 안 될 때
- Chrome/Edge 브라우저 사용 권장
- Safari는 Web Speech API 지원이 제한적

## 📊 다음 단계

이 MVP가 안정적으로 작동하면:
1. Flutter로 마이그레이션 고려
2. 또는 이 HTML5 버전을 그대로 사용
3. 추가 기능 개발 (결과 저장, 리포트 등)

## 📄 라이선스

이 프로젝트는 원본 프로젝트의 일부입니다.
