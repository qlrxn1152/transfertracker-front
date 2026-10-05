#!/usr/bin/env bash
set -euo pipefail

ROOT="${1:-.}"

TRANSFER_CSS="$ROOT/src/pages/TransfersPage.css"
HOME_CSS="$ROOT/src/pages/HomePage.css"
LAYOUT_CSS="$ROOT/src/components/Layout.css"

for file in "$TRANSFER_CSS" "$HOME_CSS" "$LAYOUT_CSS"; do
  if [[ ! -f "$file" ]]; then
    echo "파일을 찾을 수 없습니다: $file"
    exit 1
  fi
done

if ! grep -q "MOBILE_LAYOUT_FIX_TRANSFER_V1" "$TRANSFER_CSS"; then
cat >> "$TRANSFER_CSS" <<'CSS'

/* MOBILE_LAYOUT_FIX_TRANSFER_V1
   Mobile card children are anchors/buttons now, so nth-of-type no longer maps
   FROM/TO correctly. Target the actual child positions instead. */
@media(max-width:760px){
  .transfer-market-row{
    gap:13px 10px;
    padding:14px;
  }

  .transfer-market-row>.transfer-market-team:nth-child(3){
    grid-area:move;
    justify-self:start;
    width:calc(50% - 24px);
  }

  .transfer-market-row>.transfer-market-team:nth-child(5){
    grid-area:move;
    justify-self:end;
    width:calc(50% - 24px);
  }

  .transfer-market-row>.transfer-market-team:nth-child(3),
  .transfer-market-row>.transfer-market-team:nth-child(5){
    display:flex;
    flex-direction:column;
    align-items:center;
    gap:6px;
    margin:0;
    padding:0;
    text-align:center;
  }

  .transfer-market-arrow{
    grid-area:move;
    justify-self:center;
    align-self:center;
    margin-top:10px;
  }

  .transfer-market-team strong{
    max-width:100%;
    display:-webkit-box;
    overflow:hidden;
    white-space:normal;
    text-overflow:clip;
    line-height:1.25;
    -webkit-box-orient:vertical;
    -webkit-line-clamp:2;
  }

  .transfer-market-team-link:hover{
    background:transparent;
  }

  .transfer-market-status{
    justify-self:start;
  }

  .transfer-market-fee{
    justify-self:center;
    text-align:center;
  }
}

@media(max-width:420px){
  .transfer-market-row>.transfer-market-team:nth-child(3),
  .transfer-market-row>.transfer-market-team:nth-child(5){
    width:calc(50% - 20px);
  }

  .transfer-market-team-logo{
    width:40px;
    height:40px;
  }
}
CSS
fi

if ! grep -q "MOBILE_LAYOUT_FIX_HOME_V1" "$HOME_CSS"; then
cat >> "$HOME_CSS" <<'CSS'

/* MOBILE_LAYOUT_FIX_HOME_V1
   Keep each home transfer route on one balanced row instead of allowing
   the FROM club to collapse into the 45px avatar column. */
@media(max-width:700px){
  .home-panel,
  .home-clubs{
    padding:20px 16px;
  }

  .home-transfer-list>button{
    position:relative;
    grid-template-columns:48px minmax(0,1fr);
    grid-template-areas:
      "avatar name"
      "move move";
    gap:10px 12px;
    min-height:0;
    padding:14px 0;
  }

  .home-transfer-player{
    grid-area:avatar;
  }

  .home-transfer-name{
    grid-area:name;
    align-self:center;
  }

  .home-transfer-name strong{
    font-size:14px;
  }

  .home-transfer-list>button>.home-transfer-club:nth-child(3){
    grid-area:move;
    justify-self:start;
    width:calc(50% - 22px);
  }

  .home-transfer-list>button>.home-transfer-club:nth-child(5){
    grid-area:move;
    justify-self:end;
    width:calc(50% - 22px);
  }

  .home-transfer-list>button>.home-transfer-club:nth-child(3),
  .home-transfer-list>button>.home-transfer-club:nth-child(5){
    min-width:0;
  }

  .home-transfer-arrow{
    grid-area:move;
    justify-self:center;
    align-self:center;
    font-size:18px;
  }

  .home-transfer-club span{
    max-width:100%;
    display:-webkit-box;
    overflow:hidden;
    white-space:normal;
    text-overflow:clip;
    line-height:1.25;
    -webkit-box-orient:vertical;
    -webkit-line-clamp:2;
  }

  .home-transfer-club img{
    width:28px;
    height:28px;
  }

  .home-transfer-list>button>.home-transfer-club:nth-child(5){
    justify-content:flex-end;
    text-align:right;
  }
}
CSS
fi

if ! grep -q "MOBILE_LAYOUT_FIX_HEADER_V1" "$LAYOUT_CSS"; then
cat >> "$LAYOUT_CSS" <<'CSS'

/* MOBILE_LAYOUT_FIX_HEADER_V1 */
@media(max-width:760px){
  .app-header-inner{
    grid-template-rows:50px auto;
    padding-bottom:8px;
  }

  .app-brand{
    font-size:16px;
  }

  .app-mode-button{
    padding:6px 8px;
    border-radius:7px;
    font-size:9px;
  }
}
CSS
fi

echo "모바일 레이아웃 수정 적용 완료"
