# 맨체스터 유나이티드 팀 상세 배너 사진 적용

사용자가 제공한 맨체스터 유나이티드 단체사진을 실제 프론트엔드 팀 상세 히어로 영역에 적용합니다.

- 맨유 팀 상세만 단체사진 사용
- 다른 팀은 기존 녹색 배너 유지
- `teamName === Manchester United` 기준 적용
- PC/모바일 반응형 배경 위치 조정
- 기존 팀 로고 / 팀명 / 리그 / 선수 수 / 최근 관련 이적 UI 유지

## 적용

압축을 푼 뒤:

```bash
cd ~/Desktop/transfertracker-web
python3 /압축푼경로/apply_manutd_hero.py .
npm run build
npm run dev
```

정상이면:

```bash
git add src/pages/TeamDetailPage.jsx src/pages/TeamDetailPage.css public/team-hero/manchester-united-team.jpg
git commit -m "feat: add Manchester United team hero photo"
git push
```
