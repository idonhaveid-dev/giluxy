# 숲나들e(foresttrip.go.kr) 지역 목록 기반 예약 감지 — 조사 증거 및 설계

조사일: 2026-06-10 · 대상 시나리오: 서울/인천/경기(지역코드 1), 2026-06-13 입실 1박, 2인, 유명산 자연휴양림

## 결론

브라우저 없이 **서버/HTTP 요청만으로** 숲나들e 지역 전체 목록을 조회하고, 그 목록 안에서
특정 휴양림(예: 유명산)의 예약 가능 여부를 판정하는 경로를 **완전히 재현**했다.
개별 휴양림 상세 페이지(`fcfsRsrvtPssblGoodsDetls.do`)로 직접 들어가는 기존 방식 대신,
메인 검색 흐름의 **지역 목록 엔드포인트**(`fcfsRsrvtRcrfrDtlDetls.do`)를 사용한다.

- 재현 스크립트: [`scripts/probe-foresttrip-region-search.mjs`](../scripts/probe-foresttrip-region-search.mjs) (`npm run probe:foresttrip`)
- 운영 코드: [`api/foresttrip-region-search.js`](../api/foresttrip-region-search.js) → [`api/check-reservation.js`](../api/check-reservation.js)에서 사용

## 단계별 증거

| 단계 | 결과 |
| --- | --- |
| `GET https://www.foresttrip.go.kr/main.do` | **HTTP 200**, ~217 KB, 쿠키 `WMONID` + `JSESSIONID` 발급 |
| CSRF 획득 | **가능** — `<input name="_csrf" value="…">` 폼 토큰 추출 (예: `159f7c68-…`) |
| NetFunnel JS | `https://www.foresttrip.go.kr/js/netfunnel.js` (STCLab v2.3.7) |
| NetFunnel API | `https://nf.foresttrip.go.kr/ts.wseq` (`TS_HOST=nf.foresttrip.go.kr`, `service_1`/`action1`) |
| netfunnel_key 발급 | **가능** — `opcode=5101` 호출에 즉시 `status 200 (kSuccess)`, `nwait=0`, 240자 key 반환 |
| 결과 URL 응답 | `GET .../rep/or/fcfsRsrvtRcrfrDtlDetls.do?...&netfunnel_key=…` → **HTTP 200**, ~198 KB 목록 HTML |
| 차단 문구(키 없을 때) | `netfunnel_key` 비우면 1.3 KB 가드 페이지: **"비정상적인 접근으로 다시시도해주시기 바랍니다."** |
| ECONNRESET | **간헐 재현** (약 6회 중 1회) — 재시도 3회/백오프로 흡수됨 |

### NetFunnel 응답 원문(발췌)

```
NetFunnel.gRtype=5101;NetFunnel.gControl.result=
  '5002:200:key=7B8882AF…2C30&nwait=0&nnext=0&tps=0.000000&ttl=0&ip=nf.foresttrip.go.kr&port=443';
```

`<rtype>:<status>:key=…` 형식. status **200 = kSuccess**(즉시 통과), 201 = kContinue(대기열),
300 = kTsBypass. `nwait=0`이면 대기열 없이 바로 key 사용 가능. 이 key를 폼의 `netfunnel_key`에 넣는다.

## 검색 흐름 (main.do JS)

`fn_top_goSearch()`는 `srchInsttId`(특정 휴양림 ID) 유무로 분기한다.

- **비어 있음 → 지역 전체 목록**: `url = /rep/or/fcfsRsrvtRcrfrDtlDetls.do`, `action_id = action1`, `houseCampSctin = 01`
- 채워짐 → 개별 휴양림: `url = /rep/or/sssn/fcfsRsrvtPssblGoodsDetls.do`, `action_id = action2`

제출 직전 `NetFunnel_Action({action_id, service_id:"service_1"}, …)`의 콜백에서
`ret.data.key`를 `#netfunnel_key`에 채우고 GET 제출한다. 우리는 이 과정을 서버에서 그대로 수행한다.

### 결과 URL 파라미터 (지역 목록)

`_csrf`, `netfunnel_key`, `srchInsttArcd`(지역코드), `srchInsttId`(빈값), `srchRsrvtBgDt`/`srchRsrvtEdDt`(YYYYMMDD),
`srchStngNofpr`(인원), `srchSthngCnt`(박수), `houseCampSctin=01`, `srchUseDt`, `menuId=001001`, `hmpgId=FRIP` 외 빈 필드.

## 결과 HTML 구조 (파싱 근거)

휴양림 1곳 = `<div class="rc_item">` 카드 1개. 카드 안의 **날짜 반영 상태 배지**가 권위 신호다.

```html
<div class="rc_item">
  <div class="rc_ti"> <i>[예약불가]</i> <b>[국립](가평군)유명산자연휴양림</b> </div>
  ...
  <div class="ut_roomcount">예약가능 객실 수 : 0</div>
  <div class="ut_button"> … 예약불가 </div>
</div>
```

배지 `[예약가능]`/`[예약불가]`, `예약가능 객실 수 : N`, 버튼 텍스트가 모두 일치한다.
검증: 2026-06-13 1박 기준 서울/인천/경기 **25곳 중 단 1곳**(`양평설매재` 객실 3)만 `[예약가능]`,
나머지 24곳(유명산 포함)은 `[예약불가]`·객실 0. 즉 배지는 검색 날짜 기준의 실제 잔여를 반영한다.

## 운영 반영

- `api/foresttrip-region-search.js`: 세션 → NetFunnel key → 지역 목록 → `rc_item` 카드 파싱.
  `checkForestRegionAvailability({ regionCode, matchName, startYmd, endYmd, nights, label })` →
  `{ status: 'available'|'closed'|'watching', message, snapshot }`.
- `api/check-reservation.js`: 숲나들e URL의 `hmpgId`(또는 campground명)로 `{ regionCode, matchName }`를
  찾아 위 함수에 위임. **국립공원공단(KNPS) 경로는 변경 없음.**
- `api/reservation-monitor-config.js`: 유명산(서울/인천/경기, 2026-06-13 1박) 모니터 추가.

운영 코드 실측(2026-06-10):

```
유명산  → closed   "국립유명산자연휴양림 20260613 기준 1박은 아직 예약불가입니다. (서울/인천/경기 지역 전체 25곳 중 예약가능 1곳)"
설매재  → available "양평설매재자연휴양림 20260613 기준 1박 예약 가능 감지: …(예약가능 객실 3)…"
```

## 경계(하지 않는 것)

로그인, 예약 버튼 클릭, 폼 제출에 의한 예약 생성, 결제, CAPTCHA 우회는 하지 않는다.
NetFunnel key는 공개 웹페이지가 요청하는 것과 동일한 통과 key이며, 대기열이 있을 때 이를 우회하지 않는다.
목적은 **빈자리 감지 알림**까지다.

## 재현 방법

```bash
npm run probe:foresttrip                 # 기본: region=1, 2026-06-13 1박, target=유명산
npm run probe:foresttrip -- --keep       # 원본 응답을 logs/foresttrip-probe/ 에 덤프
npm run probe:foresttrip -- --region 1 --start 20260613 --nights 1 --target 설매재
```

(원본 HTML/JS 덤프는 `logs/`가 `.gitignore` 대상이라 로컬에만 남는다.)
