from pathlib import Path
import sys

root = Path(sys.argv[1] if len(sys.argv) > 1 else ".")
path = root / "src/pages/TransfersPage.jsx"

if not path.exists():
    raise SystemExit(f"파일을 찾을 수 없습니다: {path}")

text = path.read_text(encoding="utf-8")

old = """  useEffect(() => {
    const params = new URLSearchParams();
    if (state.page > 0) params.set('page', String(state.page));
    if (state.keyWord) params.set('q', state.keyWord);
    if (state.leagueCode) params.set('league', state.leagueCode);
    if (state.teamId) params.set('teamId', state.teamId);
    if (feeFilter !== 'all') params.set('fee', feeFilter);
    setSearchParams(params, { replace: true });
  }, [state.page, state.keyWord, state.leagueCode, state.teamId, feeFilter, setSearchParams]);
"""

new = """  useEffect(() => {
    // 이 페이지가 관리하는 필터 query만 갱신한다.
    // player 같은 다른 UI 상태 query는 반드시 보존해야 한다.
    setSearchParams(current => {
      const params = new URLSearchParams(current);

      if (state.page > 0) params.set('page', String(state.page));
      else params.delete('page');

      if (state.keyWord) params.set('q', state.keyWord);
      else params.delete('q');

      if (state.leagueCode) params.set('league', state.leagueCode);
      else params.delete('league');

      if (state.teamId) params.set('teamId', state.teamId);
      else params.delete('teamId');

      if (feeFilter !== 'all') params.set('fee', feeFilter);
      else params.delete('fee');

      return params;
    }, { replace: true });
  }, [state.page, state.keyWord, state.leagueCode, state.teamId, feeFilter, setSearchParams]);
"""

if old not in text:
    if "setSearchParams(current =>" in text and "player 같은 다른 UI 상태 query" in text:
        print("이미 수정된 코드입니다.")
    else:
        raise SystemExit(
            "TransfersPage.jsx에서 기존 query 동기화 코드를 찾지 못했습니다. "
            "파일이 예상 버전과 다른지 확인해 주세요."
        )
else:
    text = text.replace(old, new, 1)
    path.write_text(text, encoding="utf-8")
    print(f"수정 완료: {path}")

print("""
확인해야 할 동작:
1. /transfers 에서 팀 필터 적용
2. 선수 클릭
3. URL에 기존 필터 + &player=선수ID 가 같이 남는지 확인
4. 선수 상세이 열리는지 확인
5. 브라우저 뒤로가기
6. player 파라미터만 사라지고 기존 팀 필터는 유지되는지 확인
""")
