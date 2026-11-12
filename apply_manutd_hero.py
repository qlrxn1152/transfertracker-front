from pathlib import Path
import shutil
import sys

root = Path(sys.argv[1] if len(sys.argv) > 1 else ".").resolve()
patch_root = Path(__file__).resolve().parent

jsx_path = root / "src/pages/TeamDetailPage.jsx"
css_path = root / "src/pages/TeamDetailPage.css"
image_src = patch_root / "assets/manchester-united-team.jpg"
image_dst = root / "public/team-hero/manchester-united-team.jpg"

if not jsx_path.exists() or not css_path.exists():
    raise SystemExit("transfertracker-web 프로젝트 루트에서 실행해 주세요.")

jsx = jsx_path.read_text(encoding="utf-8")
css = css_path.read_text(encoding="utf-8")

needle = '''  const picture = logoUrl(team.logoUrl);
  const count = Number.isSafeInteger(team.teamPlayerCount) && team.teamPlayerCount >= 0
'''
replacement = '''  const picture = logoUrl(team.logoUrl);
  const isManchesterUnited = String(team.teamName || '').trim().toLowerCase() === 'manchester united';
  const heroImage = isManchesterUnited ? '/team-hero/manchester-united-team.jpg' : null;
  const count = Number.isSafeInteger(team.teamPlayerCount) && team.teamPlayerCount >= 0
'''

if "const heroImage =" not in jsx:
    if needle not in jsx:
        raise SystemExit("TeamDetailPage.jsx의 hero 위치를 찾지 못했습니다.")
    jsx = jsx.replace(needle, replacement, 1)

old_header = '''      <header className="team-detail-hero">
'''
new_header = '''      <header
        className={`team-detail-hero ${heroImage ? 'has-photo' : ''}`}
        style={heroImage ? { '--team-hero-image': `url("${heroImage}")` } : undefined}
      >
'''
if "className={`team-detail-hero ${heroImage ? 'has-photo' : ''}`}" not in jsx:
    if old_header not in jsx:
        raise SystemExit("TeamDetailPage.jsx의 header를 찾지 못했습니다.")
    jsx = jsx.replace(old_header, new_header, 1)

marker = "/* TEAM_HERO_PHOTO_V1 */"
css_patch = '''
/* TEAM_HERO_PHOTO_V1 */
.team-detail-hero.has-photo{
  min-height:300px;
  background:
    linear-gradient(90deg,
      rgba(6,16,21,.94) 0%,
      rgba(6,16,21,.80) 31%,
      rgba(6,16,21,.38) 58%,
      rgba(6,16,21,.62) 100%
    ),
    linear-gradient(0deg,rgba(5,14,10,.52),rgba(5,14,10,.08)),
    var(--team-hero-image);
  background-size:cover;
  background-position:center 43%;
  box-shadow:0 18px 50px rgba(13,25,20,.22);
}

.team-detail-hero.has-photo .team-detail-hero-pattern{
  background:
    linear-gradient(90deg,rgba(3,11,15,.12),transparent 36%,transparent 72%,rgba(3,11,15,.20));
}

.team-detail-hero.has-photo .team-detail-logo{
  background:rgba(255,255,255,.96);
  box-shadow:0 14px 34px rgba(0,0,0,.26);
}

.team-detail-hero.has-photo .team-detail-brand{
  align-self:flex-end;
}

.team-detail-hero.has-photo .team-detail-brand h1{
  text-shadow:0 2px 18px rgba(0,0,0,.38);
}

.team-detail-hero.has-photo .team-detail-kicker,
.team-detail-hero.has-photo .team-detail-meta{
  text-shadow:0 1px 10px rgba(0,0,0,.40);
}

.team-detail-hero.has-photo .team-detail-hero-stat{
  background:rgba(5,15,18,.58);
  border-color:rgba(255,255,255,.24);
  box-shadow:0 10px 30px rgba(0,0,0,.14);
}

@media(max-width:900px){
  .team-detail-hero.has-photo{
    min-height:260px;
    background-position:center 36%;
  }
}

@media(max-width:620px){
  .team-detail-hero.has-photo{
    min-height:360px;
    background:
      linear-gradient(180deg,
        rgba(6,16,21,.20) 0%,
        rgba(6,16,21,.34) 42%,
        rgba(6,16,21,.94) 100%
      ),
      var(--team-hero-image);
    background-size:cover;
    background-position:center top;
  }

  .team-detail-hero.has-photo .team-detail-brand{
    margin-top:auto;
  }
}
'''
if marker not in css:
    css += "\n" + css_patch

jsx_path.write_text(jsx, encoding="utf-8")
css_path.write_text(css, encoding="utf-8")

image_dst.parent.mkdir(parents=True, exist_ok=True)
shutil.copy2(image_src, image_dst)

print("적용 완료")
print(f"- {jsx_path}")
print(f"- {css_path}")
print(f"- {image_dst}")
