# YJGG

리그 오브 레전드의 모든 것 — 챔피언 · 라인별 카운터 · 메타 분석 · 스킨 랭킹/리뷰

## 바로 사용하기 (설정 없음)

1. 이 폴더의 파일을 전부 GitHub 저장소에 업로드합니다. (`.nojekyll` 포함)
2. 저장소 **Settings → Pages → Branch: main / (root)** 선택 후 Save.
3. 1~2분 뒤 `https://<내아이디>.github.io/<저장소이름>/` 에서 YJGG가 열립니다.

## 자동으로 되는 것
- 챔피언 전체 목록, 한글 이름, 아이콘, 스탯, 스킨 이미지: Riot 공식 Data Dragon에서 **항상 최신 패치로** 자동 로딩
- 스킨 클릭 → 큰 이미지, 별점, 리뷰 작성(브라우저에 저장), 인벤 리뷰 검색 연결
- 내 별점 기준 "내 스킨 랭킹"
- 챔피언별 카운터/승률은 Lolalytics · OP.GG · U.GG 현재 패치 페이지로 바로 연결

## 직접 채우는 데이터 (선택)
챔피언 ID는 영문 ID(예: `Ahri`, `LeeSin`, `MonkeyKing`)입니다.

`data/matchups.json`
```json
{ "Ahri": { "mid": { "weak": ["Zed", "Fizz"], "strong": ["Syndra"] } } }
```
라인 키: `top`, `jungle`, `mid`, `adc`, `support`

`data/stats.json`
```json
{ "patch": "26.20", "updated": "2026-10-14",
  "champions": { "Ahri": { "lane": "mid", "winRate": 51.2, "pickRate": 8.4, "banRate": 3.1, "laneKill": 49.5 } } }
```

`data/skin-reviews.json` (직접 작성하거나 출처 링크와 함께 요약)
```json
{ "Ahri:1": [ { "text": "한줄 요약", "author": "작성자", "url": "https://..." } ] }
```
키 형식은 `챔피언ID:스킨번호` 입니다.

## 안내
- 인벤 등 타 사이트의 리뷰 원문은 저작권이 있어 앱에 복사해 넣지 않았고, 링크로 연결했습니다.
- YJGG isn't endorsed by Riot Games and doesn't reflect the views or opinions of Riot Games or anyone officially involved in producing or managing Riot Games properties.
