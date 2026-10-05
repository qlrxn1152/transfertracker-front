# 이적 현황 필터 브라우저 뒤로가기 수정

맞습니다. 기존 구현은 필터 변경 시:

```js
setSearchParams(params, { replace: true });
```

를 사용해서 현재 history entry를 계속 덮어썼습니다.

그래서:

```text
전체
→ EPL
→ Arsenal
```

순서로 필터를 바꿔도 브라우저 history에는 마지막 상태만 남아서,
뒤로가기로 `Arsenal → EPL → 전체`가 복원되지 않았습니다.

그리고 단순히 `replace: true`만 제거하면 충분하지 않습니다.
기존 컴포넌트 state도 URL의 back/forward 변경을 다시 읽어야 하기 때문입니다.

이번 수정에서는 URL을 필터 상태의 기준으로 바꿨습니다.

## 기대 동작

```text
/transfer
→ EPL 선택
→ Arsenal 선택
→ 선수 상세 열기

뒤로가기 1번
→ 선수 상세만 닫힘
→ Arsenal 필터 유지

뒤로가기 2번
→ Arsenal 필터 해제
→ EPL 필터 상태

뒤로가기 3번
→ EPL 필터 해제
→ 전체 이적
```

검색어 / 리그 / 팀 / 이적료 / 페이지도 같은 방식으로 browser history에 남습니다.

## 적용

이 압축의 `src/pages/TransfersPage.jsx`를 기존 프로젝트에 덮어씁니다.

```bash
npm run build
npm run dev
```

검증 후:

```bash
git add src/pages/TransfersPage.jsx
git commit -m "fix: sync transfer filters with browser history"
git push
```
