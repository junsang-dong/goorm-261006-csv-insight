# CSV Insight — 자동 데이터 시각화·EDA 웹앱 기술명세서

- 버전: 1.0 / 작성일: 2026-10-06 / 작성: Jun · NextPlatform
- 용도: 개발자·기획자·디자이너 공유 및 코딩 에이전트의 MVP 구현 기준
- 기술: React · Vite · TypeScript / Vercel Node.js Functions / Neon PostgreSQL
- 제품 정의: 사용자가 데이터 파일을 업로드하면 서버가 데이터 구조·품질·분포·관계를 계산하고, 웹앱이 차트와 한국어 분석 요약을 제공한다.
- 기존 브라우저 기반 CSV Insight의 확장 설계. 이번 문서는 구현·배포 완료 보고서가 아닌 빌드 기준이다.

## 1. 목표와 MVP 범위

학습자와 실무자가 코드를 작성하지 않고 데이터의 구조를 이해하고, 품질 문제와 탐색할 패턴을 발견하도록 돕는다. 벤츠 검사 시간, 해군 추진계통 열화, 와인 품질 사례를 기본 실습으로 제공한다.

### 필수 기능

1. CSV·TSV 업로드 및 구분자·인코딩·헤더 확인.
2. 서버에서 자료형 추론, 결측·중복·상수 열 검사, 기술통계 계산.
3. 대상 열·그룹 열 추천과 자동 차트 생성.
4. 전체·첫 100행·재현 가능한 무작위 100행 비교.
5. 범주/숫자 조건 필터와 그룹별 조건부 상관관계.
6. 근거 수치를 연결한 한국어 규칙 기반 요약.
7. Neon에 데이터와 분석 결과 저장, 이전 분석 다시 열기·삭제.
8. JSON·CSV·Markdown 결과 다운로드 및 개별 차트 PNG 저장.
9. 벤츠·해군·와인 샘플 즉시 불러오기.

### 후속 범위

Excel 업로드, PDF 보고서, 예측 모델 학습, 팀 공유, 대용량 객체 저장소, 작업 큐, OpenAI 해석·질문응답은 후속 단계다. MVP에서는 OpenAI 호출 없이 모든 기본 분석이 동작해야 한다. 자동으로 이상치나 중복을 삭제하지 않는다.

## 2. 사용 흐름과 화면

`업로드/샘플 선택 → 형식 확인 → 자동 분석 → 대시보드 → 조건 비교 → 저장/내보내기`

| 화면 | 주요 구성 | 행동 |
|---|---|---|
| 시작 | 파일 드롭 영역, 제한 표시, 샘플 카드 3종 | 업로드 또는 샘플 불러오기 |
| 형식 확인 | 처음 20행, 헤더·구분자·인코딩, 추론한 열 유형 | 설정 수정 후 분석 |
| 대시보드 | 행·열·결측·중복 요약, 대상/그룹 선택, 자동 발견 | 차트와 근거 확인 |
| 조건 비교 | 필터, 전체/부분/그룹 비교, 표본 수 | 해군 선속·와인 종류 비교 |
| 분석 이력 | 파일명·시각·범위·상태 | 다시 열기·삭제 |

대시보드 탭은 개요 / 품질 / 분포 / 관계 / 그룹 비교 / 데이터 미리보기로 구성한다. 대상 열은 한 번에 하나를 선택하고, 여러 대상이 있는 해군 샘플에서는 `kMc`와 `kMt`를 전환한다.

UI는 한국어를 기본으로 하고, 변수 원문 이름을 함께 표시한다. 밝은 배경, 큰 숫자, 충분한 여백, 일관된 색을 사용한다. 표는 키보드로 접근 가능하며, 색 외에도 라벨로 차이를 표시한다. 모바일은 요약·차트를 세로로 배치하고 넓은 표만 가로 스크롤한다.

차트와 요약에 항상 분석 범위, 유효 표본 수, 결측 제외 수를 표시한다. 필터 결과가 0행이면 빈 상태를 보여주며 통계 계산을 진행하지 않는다. 진행 상태는 실제 서버 상태만 표시하고 가짜 진행률을 만들지 않는다.

## 3. 권장 아키텍처

- React/Vite SPA: 파일 선택·설정·차트 렌더링·결과 다운로드.
- 같은 Vercel 프로젝트의 `/api`: 파싱·검증·통계·필터·샘플 조회·DB 저장을 수행하는 Node.js API.
- Neon PostgreSQL: 세션별 데이터셋, 행 청크, 열 메타데이터, 분석 결과 저장. 브라우저에서 DB에 직접 연결하지 않는다.

Vite는 프런트엔드 빌드 도구로 사용하며, Vercel Functions가 별도로 API를 제공한다. 로컬에서도 서버 API를 실행해야 한다. `vite preview`만으로 API를 실행할 수 있다고 안내하지 않는다.

| 영역 | 선택 | 목적 |
|---|---|---|
| Frontend | React + Vite + TypeScript | 빠른 SPA 구현 |
| UI | Tailwind CSS, shadcn/ui, Lucide | 일관된 화면·접근성 |
| Chart | Apache ECharts + React 래퍼 | 분포·박스플롯·산점도·히트맵 |
| 서버 상태 | TanStack Query | 요청, 캐시, 재시도, 이력 |
| Backend | Vercel Functions, Node.js, TypeScript | 동일 출처 REST API |
| 파싱 | Papa Parse 서버 사용, TextDecoder | CSV 인용부호·구분자·인코딩 |
| 검증 | Zod | API·설정·결과 스키마 |
| 통계 | simple-statistics + 직접 구현한 pairwise/Spearman | 재현 가능한 계산 |
| DB | Neon, @neondatabase/serverless, Drizzle | 서버 전용 SQL·마이그레이션 |
| 테스트 | Vitest, Playwright | 계산·API·핵심 사용자 흐름 |

표본 추출·통계·CSV 파싱은 서버에서 수행한다. 브라우저는 파일 크기/확장자 사전 검사, 표시용 포맷, 이미 계산된 차트 데이터 렌더링만 담당한다.

## 4. 파일 입력 규격

### MVP 한도 — 제품이 정하는 제한

- 파일 크기: 최대 **3,500,000 bytes**, 압축파일 제외.
- 최대 20,000행 / 500열 / 2,000,000셀. 세 조건을 모두 충족해야 한다.
- 한 셀 최대 10,000자, 헤더 최대 200자.
- 지원: `.csv`, `.tsv`. UTF-8/BOM 기본, EUC-KR은 사용자가 선택 가능.
- 구분자 후보: 쉼표·세미콜론·탭. 감지 결과를 확인 화면에서 수정 가능.
- 헤더 없는 일반 파일은 `column_1…`을 생성한다. 해군 원본 공백 구분 TXT는 범용 업로드 대상에서 제외하고, 샘플은 헤더를 붙인 CSV로 제공한다.

Vercel Functions 문서상 요청/응답 본문 한도는 4.5MB다. 따라서 multipart 오버헤드 여유를 포함해 위의 더 작은 제품 한도를 적용한다. 클라이언트·서버 모두 검증하며, 플랫폼에서 반환하는 413도 사용자 메시지로 처리한다. base64 업로드는 사용하지 않는다. 제공 벤츠 CSV는 3,220,873 bytes로 이 한도 안에 있다.

대용량 지원 시 원본은 private 객체 저장소에 직접 업로드하고 서버가 읽도록 확장한다. Neon을 대용량 파일 저장소로 사용하는 설계를 확장하지 않는다.

### 파싱 규칙

- 따옴표 안의 구분자·줄바꿈·이스케이프된 따옴표를 지원한다. 문자열 split으로 CSV를 구현하지 않는다.
- BOM 제거. 완전히 빈 행은 제외하고 제외 건수를 기록한다.
- 열 수가 맞지 않는 행은 오류 위치와 예상/실제 열 수를 보여주고 분석을 중단한다. 조용히 자르거나 채우지 않는다.
- 빈 헤더는 자동 이름, 동일 헤더는 내부 ID를 별도로 부여하고 표시 이름에 `_2` 등의 접미사를 붙인다. 원본 이름 매핑을 보존한다.
- 빈값·공백값은 기본 결측. `NA`, `N/A`, `null`은 선택 가능한 결측 토큰이며 적용 목록을 결과에 기록한다. 문자 코드 `NA`를 무조건 결측으로 바꾸지 않는다.
- `0`은 결측이 아니다. Infinity/NaN은 숫자로 받지 않는다.
- 소수점은 `.`이 기본. 천 단위 구분 기호/날짜는 명시적 설정이 없으면 임의 변환하지 않는다.
- 원본 문자열과 분석용 정규화 값을 구분한다. 정규화 규칙·실패 건수를 메타데이터에 보존한다.

## 5. 자료형과 역할 추론

물리적 자료형과 분석 역할을 분리한다. `v`는 숫자이지만 그룹으로 사용할 수 있고, `quality`는 정수이지만 순서가 있는 점수다.

| 유형/역할 | 판단과 기본 처리 |
|---|---|
| numeric | 비결측값 전체가 유한 숫자로 변환 가능 |
| mixed | 일부만 숫자로 변환 가능, 기본은 문자; 사용자 확인 후 변환 |
| binary | 고유 유효값이 0/1 또는 true/false |
| categorical | 문자·반복 코드 |
| identifier | ID 이름 및 높은 고유비율로 후보 표시; 사용자가 확인 |
| ordinal | 순서가 있는 점수·등급; 샘플 메타데이터 또는 수동 지정 |
| constant | 유효 고유값 1개, 결측 비율 별도 표시 |
| empty | 유효값 0개, constant와 구분 |

이진/숫자 중 고유값이 20개 이하인 열은 그룹 후보로 추천한다. ID는 상관관계·자동 대상 추천에서 기본 제외한다. 일정하지 않은 숫자형 범주 코드를 연속 변수로 단정하지 않는다.

샘플은 manifest의 정확한 헤더·크기·해시로 프로필을 적용한다. 일반 업로드는 열 이름이 유사하다는 이유만으로 벤츠·해군·와인이라고 단정하지 않는다. 샘플 자동 대상 외에 일반 데이터는 `target`, `y`, `quality` 등의 이름으로 후보만 추천하고 사용자가 변경할 수 있게 한다.

## 6. 자동 EDA 계산 규칙

### 6.1 구조·품질

전체 행·열, 유형별 열 수, 결측 셀/행/열 비율, 완전 중복 행, 특징 조합 중복, 상수/전체 결측 열, 동일 값 열을 계산한다.

- 완전 중복: 모든 열의 분석용 정규화 값을 타입과 열 순서를 포함해 직렬화한 뒤 첫 등장 이후 반복 행을 센다. 적용 정규화 규칙을 표시한다.
- 특징 조합 중복: 사용자가 지정한 ID·대상 열을 제외한다. 그룹 수, 반복 행 수, 같은 조합의 대상 범위 차이를 표시한다.
- 동일 열: 전 행의 정규화 값과 결측 위치가 같을 때만 동일하다고 표시한다. 높은 상관을 동일 열로 처리하지 않는다.
- 결측 제외 기준: 각 통계는 해당 열의 유효값, 두 변수 통계는 pairwise 완전값을 사용한다. 전체 행 일괄 삭제는 하지 않는다.
- 변환·이상치·중복 삭제는 기본적으로 수행하지 않는다.

### 6.2 숫자 기술통계

유효 n, 결측 n, 평균, 중앙값, 표본 표준편차(ddof=1), 최솟값·최댓값, Q1·Q3·IQR, p5·p95, 왜도를 제공한다. n<2의 표준편차는 null, 상수열 상관은 null이다.

분위수는 정렬값에서 인덱스 `(n−1)p`의 선형 보간(Type 7)을 사용한다. 비교 테스트는 이 규칙을 따른다. 왜도는 n>=3이고 분산>0일 때 보정된 표본 왜도, 그 외는 null이다. Infinity/NaN을 JSON에 넣지 않는다.

이상치 후보는 `x < Q1−1.5×IQR` 또는 `x > Q3+1.5×IQR`; 경계값 자체는 제외한다. IQR=0이면 자동 판정의 한계를 표시하고 후보 순위에서 제외한다. 이상치 후보는 오류·고장으로 이름 붙이지 않는다.

### 6.3 분포 차트

- 연속 숫자: 히스토그램 + 박스플롯.
- 낮은 고유값의 정수/순서 점수: 값별 건수·비율 막대그래프.
- 범주형: 상위 20개 건수/비율, 나머지는 기타. 통계에서 기타로 합치기 전 실제 범주 수를 표시한다.
- 결측: 열별 비율 막대와 상위 문제 열 표.
- 히스토그램: Freedman–Diaconis 기준으로 10~50 bins, IQR=0이면 Sturges 또는 상수값 단일 bin. 마지막 구간은 오른쪽 경계를 포함한다.
- 박스플롯: 수염은 IQR 경계 안의 실제 최솟값·최댓값. 후보 점은 많으면 표시만 표본 추출하고 총 후보 수는 전체 계산값을 유지한다.

### 6.4 관계 분석

- Pearson와 Spearman을 함께 제공. Spearman은 동률에 평균 순위를 부여한다.
- 유효 pair n<3 또는 어느 한 열 분산=0이면 null과 사유를 반환한다.
- 대상 대비 연관성 순위는 pair n>=30인 숫자/이진열에서 계산한다. 작은 그룹은 수치가 있어도 탐색 근거 부족 라벨을 붙인다.
- 히트맵은 기본 최대 25열, 필요할 때 대상 연관성 상위 또는 사용자가 고른 열로 다시 계산한다. 378열 전부를 작은 화면에 표시하지 않는다.
- 산점도는 최대 2,000점의 seed 고정 표본; 상관계수는 현재 범위 전체의 유효 pair로 계산한다. 표시 점 수와 계산 표본 수를 구분한다.
- 이진 변수는 두 그룹의 n·평균·중앙값·분포 비교를 기본 제공한다.
- 상관은 인과관계·예측 모델 중요도·정비 처방으로 서술하지 않는다.

### 6.5 그룹·조건부 분석

모든 숫자/범주열에 대해 equals, in, between, isMissing 필터를 허용한다. 숫자 그룹은 고유값 20개 이하의 원래 값 또는 사용자가 확인한 구간으로 만든다. 필터는 서버의 정규화 값에 적용하고 설정을 저장한다.

그룹별 n·결측 n·평균·중앙값·표준편차·분위수, 대상 박스플롯, 같은 두 변수의 전체/그룹별 Pearson·Spearman을 계산한다. 기본 평균 차이 순위는 n>=30 그룹만 포함하며, 적은 그룹은 숨기지 않고 주의를 표시한다. p값·유의성·다중 비교 검정은 MVP에서 주장하지 않는다.

현재 데이터 전체와 필터 결과를 비교할 때 동일한 변수·단위·차트 축을 사용한다. 상관 방향이 바뀌거나 절대값이 크게 바뀌면 ‘그룹 구성을 함께 확인하세요’라는 탐색 메시지를 생성하되 통계적 확증으로 표현하지 않는다.

### 6.6 분석 범위와 대표성

범위는 전체 / 첫 100행 / 무작위 100행(seed=42)으로 제공한다. 먼저 범위를 선택하고 그 안에 필터를 적용한다. 결과에는 원본 행 수, 범위 행 수, 필터 통과 행 수를 별도로 기록한다.

첫/무작위 100행은 헤더를 제외한 원본 행 순서에서 선택한다. ID 0~99 선택이 아니다. 100행 미만이면 모두 사용한다. 표본 비교는 동일 필터를 적용한 전체와 수행하며 평균·분위수·상수 수·범주 비율을 비교한다. 첫 100행을 무작위 표본이라고 표현하지 않는다.

## 7. 자동 분석 요약

MVP는 결정적 규칙과 템플릿으로 한국어 문장을 생성한다. ‘데이터 개요 → 품질 문제 → 대상 분포 → 연관 패턴 → 조건별 차이 → 확인할 질문’ 순서로 최대 8개 발견을 제시한다.

각 발견은 `id`, `category`, `severity`, `message`, `metricRefs`, `chartRefs`, `scope`, `limitations`를 갖는다. 규칙 임계값은 버전 관리한다. 결측·중복/상수, 점수 불균형, 긴 꼬리, 소표본 그룹, 전체/조건별 연관성 차이를 우선한다.

예: ‘화이트의 9점은 5건으로, 이 그룹 평균은 해석에 주의가 필요합니다.’ 근거 값은 서버 계산 결과에서 가져온다. 알코올 증가를 권하는 제조 처방, 실제 고장 가능성, 비공개 옵션 이름 등 확인되지 않은 의미를 생성하지 않는다.

실제 파일 값·메타데이터·일반 해석을 구분한다. 샘플 설명을 일반 업로드 파일에 재사용하지 않는다.

## 8. 제공 샘플과 검증 기준

샘플 카드의 ‘불러오기’는 서버 번들 내 샘플을 읽어 업로드와 동일한 파서·EDA 경로로 처리한다. 프런트엔드의 정적 샘플 JSON만 보여주고 분석했다고 표시하지 않는다. 다음 데이터 파일은 동봉 ZIP의 `samples/`에 포함한다.

| 샘플 | 파일 | 크기/구성 | 추천 설정 |
|---|---|---|---|
| 벤츠 | mercedes-train.csv | 4,209행 × 378열 | 대상 y, ID 제외, 그룹 X0 |
| 해군 | naval-cbm.csv | 11,934행 × 18열 | 대상 kMc/kMt, 그룹 v, 비교 27노트 |
| 와인 통합 | wine-quality-combined.csv | 6,497행 × 13열 | 대상 quality, 그룹 wine_type |
| 레드 원본 | winequality-red.csv | 1,599행 × 12열, 세미콜론 | quality·alcohol |
| 화이트 원본 | winequality-white.csv | 4,898행 × 12열, 세미콜론 | quality·alcohol |

### 벤츠 데이터

`ID`, `y`, 익명 옵션 376개로 구성한다. 범주형 8개와 이진 368개를 구분한다. `y`의 단위는 초이며 익명 변수의 부품명을 추정하지 않는다.

- 전체 평균 y 약 100.67초, 상수열 12개, 완전 중복 0건, 결측 0개.
- 1.5×IQR 상한 초과 후보 50건; 최대 y=265.32, ID=1770.
- 첫 100행 평균 약 100.57초, 상수 옵션 128개.
- X5=j 비율: 첫 100행 87.00%, 전체 약 2.97%.
- 첫 100행의 평균이 유사해도 옵션 분포가 대표적이지 않음을 보여준다.

### 해군 데이터

열 순서: `lp,v,GTT,GTn,GGn,Ts,Tp,T48,T1,T2,P48,P1,P2,Pexh,TIC,mf,kMc,kMt`.

정상상태 시뮬레이션이며 실제 고장·정비 시계열이 아니다. 열화 계수는 1이 기준이며 낮아질수록 설정된 성능 저하가 크다. RUL·고장확률로 바꾸지 않는다.

- 결측·완전 중복 0개, 상수 T1/P1, Ts/Tp 동일 열.
- 선속 v는 숫자형 그룹으로 반드시 선택 가능: 3~27노트, 9개 값.
- T2와 kMc: 전체 Pearson 약 −0.047, v=27 내부 약 −0.978.
- v=27에서 기준 mf=1.704, 양쪽 최대 열화 mf=1.832 kg/s, 약 +7.51%.
- 열화 없는 기준 대비 비교는 샘플별 도메인 확장 패널로 제공하고, 일반 파일에서 임의 기준 상태를 만들지 않는다.
- 온도 열은 설명 파일의 단위 표기와 원시 값의 규모가 혼동될 수 있으므로 자동 ℃/K 변환하지 않고 ‘원시 값 / 원문 단위 표기 확인 필요’로 표시한다.

### 와인 데이터

물리·화학 변수 11개와 순서형 quality를 갖는다. 통합 파일만 wine_type을 추가했다. 원본 성분명·수치는 유지한다. quality의 이론적 평가 범위 0~10과 실제 관측 범위를 구분한다.

- 레드 평균 quality 약 5.64, 화이트 약 5.88.
- 완전 중복: 레드 240, 화이트 937, 통합 1,177건. 결측 0개.
- 5~6점 비율: 레드 약 82.49%, 화이트 약 74.62%; 화이트 9점 5건.
- alcohol-quality Pearson: 레드 약 +0.476, 화이트 약 +0.436.
- total sulfur dioxide-quality: 레드 약 −0.185, 화이트 약 −0.175, 통합 약 −0.041.
- wine_type 필터별로 계산을 다시 수행한다. 통합 상관을 종류별 상관으로 표시하지 않는다.

### 샘플 매니페스트와 출처

동봉 `samples/manifest.json`에 파일명, 행·열 수, bytes, SHA-256, separator, 대상/그룹/ID, 출처 링크, 전처리 이력을 기록한다. 해군은 기존 분석 CSV의 헤더와 숫자 원시 값을 유지하며, 와인 통합은 원본에 wine_type만 추가한 기존 CSV를 사용한다. 원본 설명 파일을 함께 보존한다.

출처: 벤츠 Kaggle 대회, 해군 UCI 316, 와인 UCI 186. UCI 페이지의 현재 라이선스 표시는 CC BY 4.0이다. 해군 배포물의 과거 README에는 비상업 문구도 있어 표기가 상충한다. 교육용 동봉 자료에는 두 출처 표기를 보존하고, 상업 공개 서비스에 샘플을 재배포할 경우 적용 권리를 확인한 뒤 샘플 활성화 정책을 정한다. 이는 사용자 일반 업로드 EDA를 막는 조건이 아니다. 벤츠는 대회 데이터 사용 조건을 별도로 확인하고 출처/조건 확인 없이 다른 라이선스로 표시하지 않는다.

## 9. API 계약

모든 엔드포인트는 같은 출처 `/api`를 사용하고, 데이터 접근 권한을 확인한다. 응답은 Zod 검증 후 반환한다.

| 메서드·경로 | 입력 | 결과 |
|---|---|---|
| GET /api/session | 없음 | 세션 생성/갱신, CSRF 토큰 |
| GET /api/samples | 없음 | 샘플 설명·기본 설정 |
| POST /api/datasets | multipart file + parseOptions | datasetId, preview, columns, warnings |
| POST /api/datasets/[id]/confirm | parsing/type overrides | 확정된 버전·열 정보 |
| POST /api/datasets/from-sample | sampleId | datasetId 및 미리보기 |
| GET /api/datasets | cursor, limit<=20 | 소유 분석 이력 |
| GET /api/datasets/[id]/rows | offset, limit<=100 | 현재 범위의 페이지 |
| POST /api/analyses | datasetId + settings | 동기 분석 결과 및 analysisId |
| GET /api/analyses/[id] | 없음 | 저장된 결과 |
| GET /api/analyses/[id]/section | section, offset, limit | 큰 열 통계/그룹 표의 페이지 |
| GET /api/analyses/[id]/export | format=json/csv/md | 분석 보고 결과 |
| DELETE /api/datasets/[id] | CSRF | 원본/분석/보고 삭제 |
| POST /api/analyses/[id]/ai-insights | 후속 구현 | MVP에서는 501 + 기능 비활성 안내 |

MVP는 한 번의 서버 요청 안에서 계산·저장을 끝내고 응답하는 동기 방식이다. 함수 종료 후 남겨 둔 Promise를 내구성 있는 작업 큐라고 사용하지 않는다. 성공한 결과만 재조회할 수 있다. 실패/타임아웃은 다시 시도할 수 있고 중복 분석은 캐시 키로 합친다.

분석 설정 예시:

```json
{
  "datasetId": "uuid",
  "datasetVersion": 1,
  "scope": {"mode": "all", "sampleSize": 100, "seed": 42},
  "targetColumnId": "kMc",
  "groupColumnId": "v",
  "excludedColumnIds": [],
  "filters": [{"columnId": "v", "operator": "equals", "value": 27}],
  "correlationMethods": ["pearson", "spearman"],
  "histogram": {"method": "fd", "maxBins": 50},
  "scatterMaxPoints": 2000
}
```

실제 열 ID는 서버가 반환한 안정된 ID를 사용한다. 예시의 이름은 설명용이다. 필터 연산자·열·값의 자료형을 검증한다.

공통 결과 구조: `analysisId, engineVersion, datasetVersion, settings, population, overview, quality, targetStats, charts, correlations, groups, findings, warnings, computedAt`。`population`에 sourceRows/scopeRows/filteredRows를 기록한다. JSON 값은 유한 숫자 또는 null이며 반올림은 표시할 때만 수행한다.

오류 구조:

```json
{"error":{"code":"INVALID_CSV","message":"12번째 행의 열 수가 일치하지 않습니다.","requestId":"uuid","details":{"row":12,"expected":18,"actual":17}}}
```

제품 UI와 실제 구현의 메시지는 한국어로 작성한다. 오류 코드: INVALID_CSV(400), INVALID_OPTIONS(400), UNAUTHORIZED(401), NOT_FOUND(404), PAYLOAD_TOO_LARGE(413), ANALYSIS_LIMIT_EXCEEDED(422), RATE_LIMITED(429), DB_UNAVAILABLE(503), ANALYSIS_TIMEOUT(504). 다른 세션의 ID는 404로 응답한다.

응답은 기본 2MB 이하, 큰 표는 페이지 조회, 산점도는 표시용 표본만 반환한다. JSON 보고서도 원본 전체 행을 포함하지 않아 함수 응답 한도를 넘기지 않게 한다.

## 10. Neon 저장 구조

MVP는 제한된 CSV 행 데이터를 JSONB 청크로 저장해 재분석을 지원한다. 각 데이터셋의 동적 열마다 SQL 테이블을 만들지 않는다. 임시 파일시스템을 영구 저장소로 사용하지 않는다.

| 테이블 | 주요 필드 |
|---|---|
| sessions | id uuid PK, token_hash, csrf_hash, created_at, expires_at |
| datasets | id, session_id FK, source/sample_id, original_filename, bytes, sha256, version, parse_options jsonb, row_count, column_count, status, created_at, expires_at |
| dataset_columns | dataset_id, column_id, position, original_name, display_name, physical_type, semantic_role, user_override, metadata jsonb |
| dataset_chunks | dataset_id, chunk_no, row_start, raw_rows jsonb |
| analyses | id, dataset_id FK, dataset_version, settings_hash, engine_version, status, settings/result jsonb, error_code, started_at, completed_at, expires_at |
| ai_reports | 후속: analysis_id, provider, model, prompt_version, input_hash, output_json, usage_json |

`raw_rows`는 헤더 순서의 문자열 배열 또는 원시 결측값 배열이며 약 250KB 이하 청크로 나눈다. 확정된 파싱·타입 설정으로 정규화 값을 재생성한다. 인덱스: datasets(session_id,created_at), chunks(dataset_id,chunk_no) UNIQUE, columns(dataset_id,column_id) UNIQUE, analyses(dataset_id,dataset_version,settings_hash,engine_version) UNIQUE.

SQL은 파라미터 바인딩을 사용한다. 파일명/사용자 열 이름을 SQL 식별자로 직접 보간하지 않는다. datasets → chunks/columns/analyses → ai_reports를 FK ON DELETE CASCADE로 연결한다. 업로드 저장은 트랜잭션으로 완료 상태까지 묶고 실패한 부분 데이터는 공개하지 않는다.

Neon serverless driver의 HTTP 질의/트랜잭션을 우선 사용한다. 장기 세션 의존 SQL이나 임시 테이블에 기대지 않는다. 재시도는 멱등 작업에만 제한적으로 적용한다. 마이그레이션은 배포 함수가 아닌 CLI/CI에서 수행한다.

캐시 키는 dataset version + 정규화된 settings + engine version의 해시다. 업로드 내용 hash만으로 다른 세션의 데이터셋을 공유하지 않는다. 같은 통계 설정의 반복 요청은 결과를 재사용한다.

## 11. 세션·보안·보존

교육용 MVP는 비회원 익명 세션을 기본으로 한다. 서버가 256-bit 랜덤 토큰을 발급하고 hash만 DB에 저장한다. 토큰 쿠키는 HttpOnly/Secure/SameSite=Lax, 동등한 권한을 가진 bearer이며 UUID만으로 접근 권한을 부여하지 않는다. 변경 요청은 Origin 확인과 CSRF 토큰 검증을 수행한다. 세션 탈취 방지를 위해 로컬 로그에 토큰을 남기지 않는다.

익명 이력은 같은 브라우저에서 7일만 유지한다. 쿠키가 없어지면 복구가 불가능하다는 점을 안내한다. 계정 간 동기화는 후속 로그인 기능이다. 만료 데이터는 읽기 거부하고, 예약 정리 API가 DB에서 삭제한다. 정리 API는 서버 전용 비밀로 보호한다.

파일이 서버로 전송되고 데이터/결과가 7일 저장된다는 점을 업로드 영역에 표시한다. 기존 브라우저 전용 앱의 ‘서버로 전송하지 않음’ 문구를 사용하지 않는다. 삭제 버튼과 보존 기간을 제공한다. 원본 셀값을 서버 로그에 남기지 않는다.

초기 세션별 제한: 하루 분석 20회, 업로드 데이터셋 5개, 논리 저장 용량 25MB. rate limit·동시 분석 제한은 DB 등 공유 상태로 구현하고 함수 메모리의 Map에만 의존하지 않는다. 세션을 재발급받을 수 있으므로 공개 운영에는 인증/추가 남용 방지 정책을 적용한다.

CSV 셀·파일명·LLM 텍스트는 HTML로 실행하지 않는다. 표는 React 텍스트 렌더링을 사용한다. 내보내는 보고 CSV의 문자 셀이 =,+,-,@로 시작하면 spreadsheet formula 실행을 방지한다. 정상 숫자 음수는 숫자형으로 유지한다. API/DB 비밀키를 VITE_ 변수에 넣지 않는다.

## 12. 추후 OpenAI API 확장

`InsightProvider` 인터페이스를 미리 정의하고 MVP에서는 `RuleBasedInsightProvider`만 활성화한다. 추후 서버 전용 `OpenAIInsightProvider`를 추가한다.

- 기본 통계는 항상 서버 통계 엔진이 계산한다. LLM은 수치를 다시 계산하는 주체가 아니다.
- 사용자 버튼으로 AI 해석을 요청할 때 분석 요약·통계·근거 ID·변수 설명만 전달한다. 원본 전체 행은 기본 전송하지 않는다.
- 화면에서 외부 AI로 보내는 정보 범위를 설명한다. PII나 고객 정보를 포함할 수 있는 자유문자 열은 기본 제외한다.
- 응답 스키마: observations, hypotheses, caveats, followUpQuestions, evidenceRefs. 모든 evidenceRefs를 검증하고 근거 없는 새로운 수치 주장은 표시하지 않는다.
- 데이터에 들어 있는 텍스트는 분석 대상이지 시스템 명령이 아니다. 셀의 지시문을 실행하거나 임의 도구/SQL 호출을 허용하지 않는다.
- 모델은 `OPENAI_MODEL` 서버 환경변수로 지정하고, 구현 시점에 공식 API·모델 지원을 확인한다. 특정 미래 모델 ID를 미리 확정하지 않는다.
- 요청 시간/입력 크기/사용량 한도와 요청 ID를 기록한다. API 실패·키 미설정 시 규칙 기반 EDA는 그대로 사용한다.
- 같은 analysis+prompt+model+input hash 응답은 캐시한다. 자동 업로드마다 유료 호출하지 않는다.

## 13. 권장 프로젝트 구조

```text
csv-insight/
  api/
    session.ts
    samples.ts
    datasets/index.ts
    datasets/from-sample.ts
    datasets/[id]/confirm.ts
    datasets/[id]/rows.ts
    datasets/[id]/index.ts
    analyses/index.ts
    analyses/[id]/index.ts
    analyses/[id]/section.ts
    analyses/[id]/export.ts
    analyses/[id]/ai-insights.ts
    maintenance/cleanup.ts
  server/
    db/{client,schema}.ts
    parsing/{csv,normalize,inference}.ts
    eda/{engine,statistics,quality,correlations,groups,sampling}.ts
    insights/{provider,rules,openai}.ts
    security/{session,csrf,limits}.ts
    samples/  # 동봉 samples 디렉토리, 서버 번들 includeFiles에 포함
  src/
    pages/{Upload,Dashboard,History}.tsx
    components/{UploadZone,StatsCards,ChartPanel,ColumnSelector,FilterBuilder}.tsx
    features/{datasets,analyses,charts}/
    lib/{api,format}.ts
    App.tsx
    main.tsx
  shared/{contracts,types}.ts
  tests/{statistics,parsing,samples,api}.test.ts
  e2e/upload-analysis.spec.ts
  drizzle/
  docs/SPEC.md
  vite.config.ts
  vercel.json
  package.json
  .env.example
  README.md
```

프런트엔드가 server 디렉토리를 import하지 않도록 경계를 유지한다. 공유 types/contracts에는 비밀·DB 모듈을 넣지 않는다. 배포 전 함수 개수·샘플 번들 포함 여부·파일 기반 경로 지원을 실제 프로젝트 설정에서 확인하고, 플랜 한도에 닿으면 얇은 라우터로 통합한다.

## 14. 개발·배포

새 프로젝트는 `npm create vite@latest csv-insight -- --template react-ts`로 시작한다. 패키지 버전은 구현 시점의 호환 버전으로 고정하고 lockfile을 커밋한다.

필수 scripts: dev(Vite 단독 화면 개발), dev:full(Vercel dev), build(TypeScript check + vite build), test, test:e2e, db:generate, db:migrate, lint. README는 서버 분석을 포함한 실행에 dev:full을 사용하도록 안내한다.

환경변수:

```dotenv
# Server only — VITE_ 접두사 금지
DATABASE_URL=
CLEANUP_SECRET=
OPENAI_API_KEY=
OPENAI_MODEL=
ENABLE_AI_INSIGHTS=false
# Client — 공개 가능 값만
VITE_APP_NAME=CSV Insight
```

1. GitHub 저장소에 코드·lockfile·마이그레이션·허용되는 샘플을 커밋한다. .env와 사용자 업로드 데이터는 커밋하지 않는다.
2. Neon 개발/운영 환경을 구분하고 DB 마이그레이션을 실행한다.
3. Vercel에서 Vite 프리셋, build=`npm run build`, output=`dist`를 설정한다.
4. API는 `/api` Node.js Functions로 배포한다. SPA fallback은 `/api`를 가로채지 않도록 설정하고 `/history` 새로고침을 검증한다.
5. 서버 샘플을 함수 번들에 명시적으로 포함하고 샘플 로드 API로 실제 bytes가 읽히는지 확인한다.
6. 함수 실행 시간은 선택한 플랜/현재 문서를 확인해 설정한다. 초기 목표는 60초 내 완료이며 허용 한도가 더 짧으면 입력 한도를 낮춘다.
7. Vercel API와 Neon은 가능한 한 가까운 리전을 선택한다. preview 배포가 production DB를 공유하지 않게 한다.
8. Preview에서 실데이터 검증 후 Production 배포. DB 보존 정리는 사용 플랜이 지원하는 예약 호출로 운영한다.

성능 목표는 보장 수치가 아닌 배포 측정 기준: 세 샘플 각각 cold/warm 5회 실행에서 서버 분석 p95 30초 이하, 선택 조건 재분석 15초 이하를 목표로 한다. 결과가 기준을 넘으면 캐시·선택 변수 수·알고리즘을 조정하고 입력 한도를 재검토한다.

## 15. 검증·인수 조건

### 계산·파싱

- 구분자 3종, UTF-8 BOM, EUC-KR, 인용부호·줄바꿈, 빈행, 열 불일치, 중복 헤더, 결측 토큰, 0을 테스트한다.
- n=0/1/2, 상수, 전체 결측, 음수, 동률 rank, pairwise 결측, IQR=0에서 null/후보 처리 규칙을 검증한다.
- 평균/분위수는 독립적으로 Python pandas/NumPy 기준값과 비교한다. 같은 정의의 계산은 absolute tolerance 1e-8, 보고서의 반올림값 회귀 검증은 표시 소수점에 맞춘 허용오차를 사용한다.
- 완전 중복과 ID/대상 제외 특징 중복을 별도 테스트한다.

### 실제 샘플

- 벤츠 4,209×378, 평균 y 약 100.67, 상수 12, 상한 후보 50, 첫 100행 X5=j 87%를 재현한다.
- 해군 11,934×18, T1/P1 상수, Ts=Tp, 선속 27 필터 및 T2-kMc 상관 변화와 기준 연료 비교를 재현한다.
- 와인 6,497×13, 타입별 행 수·중복·품질 비율·alcohol 관계를 재현한다.
- 레드/화이트 원본의 세미콜론 자동 감지를 확인한다.
- 검증값을 UI에 하드코딩해 통과시키지 않는다. 실행 결과에서 계산해야 한다.

### API·운영·UI

- 다른 세션은 원본·결과·다운로드·삭제에 접근할 수 없다.
- CSRF, 413, 422, 429, DB 오류, 빈 필터 결과의 사용자 화면을 확인한다.
- 페이지 새로고침·서버 재배포 후 저장된 분석이 다시 열린다.
- 삭제 후 행 청크·분석 결과가 함께 삭제된다. 만료 데이터는 접근 불가다.
- 업로드 → 확인 → 분석 → 필터 → Markdown 다운로드 → 이력 재조회 흐름을 Playwright로 검증한다.
- 모바일·키보드 동작, 한국어 표시, 차트 유효 n·표본 라벨을 확인한다.
- OpenAI 키가 없는 상태에서 모든 MVP 기능이 작동한다.

## 16. 구현 순서와 코딩 에이전트 전달문

1단계: 프로젝트·API·Neon·세션·샘플 manifest 구성.
2단계: 업로드/파싱/형식 확인/원본 청크 저장.
3단계: 순수 함수 통계 엔진·품질·분포·샘플 검증.
4단계: 대시보드·차트·그룹/조건부 비교·대표성 비교.
5단계: 분석 이력·내보내기·삭제·보존·Vercel 검증.
6단계(후속): 객체 저장소/내구성 작업 큐·OpenAI 해석·로그인/팀 기능.

> 이 SPEC과 동봉 samples를 기준으로 React/Vite·TypeScript 앱을 구현하라. 데이터 파싱·검증·EDA·Neon 접근은 Node.js API에서 수행하고 React는 결과를 시각화한다. 먼저 세 샘플의 계산 검증을 통과시키고, 사용자 파일도 동일 엔진으로 처리하라. 범위·필터·pairwise 표본 수와 변환 규칙을 저장하며 수치를 하드코딩하지 마라. 일반 숫자형 열도 그룹으로 선택할 수 있게 하고 전체/조건별 관계를 구분하라. OpenAI 키 없이 MVP가 완전히 동작해야 하며 서버 전용 provider 확장 지점을 마련하라. README, .env.example, DB 마이그레이션, tests, Vercel 설정을 포함하고 build/test 통과 후 배포 절차를 문서화하라.

## 17. 참고 문서

2026-10-06 확인. 플랫폼 한도·API 지원은 구현 시점에 다시 확인한다.

- Vite 배포: https://vite.dev/guide/static-deploy.html
- Vercel Functions 제한: https://vercel.com/docs/functions/limitations
- Vercel 요청 크기 우회 구조: https://vercel.com/kb/guide/how-to-bypass-vercel-body-size-limit-serverless-functions
- Neon serverless driver: https://github.com/neondatabase/serverless
- Neon HTTP driver 설명: https://neon.com/blog/serverless-driver-ga
- 벤츠 데이터: https://www.kaggle.com/competitions/mercedes-benz-greener-manufacturing
- 해군 데이터: https://archive.ics.uci.edu/dataset/316/condition+based+maintenance+of+naval+propulsion+plants
- 와인 데이터: https://archive.ics.uci.edu/dataset/186/wine+quality
