import { useEffect, useMemo, useState } from 'react';
import { getTeamDetail } from '../api/client';
import { demo } from '../demo';
import { teamDisplayName } from '../utils';

function compactTeam(team) {
  return { id: String(team?.teamId || ''), name: team ? teamDisplayName(team) : '' };
}

export default function TeamCompare({ teams, sample }) {
  const [first, setFirst] = useState('');
  const [second, setSecond] = useState('');
  const [details, setDetails] = useState({});
  const chosen = useMemo(() => [first, second].filter(Boolean).map(id => teams.find(team => String(team.teamId) === id)).filter(Boolean), [first, second, teams]);

  useEffect(() => {
    if (chosen.length !== 2) return undefined;
    const controller = new AbortController();
    Promise.all(chosen.map(async team => {
      if (sample) return [team.teamId, { players: (demo.teamPlayers[team.teamName] || []).length, posts: (demo.teamPosts[team.teamName] || []).length }];
      const value = await getTeamDetail(team.teamId, controller.signal);
      return [team.teamId, { players: Number(value?.teams?.teamPlayerCount) || value?.players?.teamPlayers?.length || 0, posts: Number(value?.posts?.totalPostCount) || value?.posts?.posts?.length || 0 }];
    })).then(values => {
      if (!controller.signal.aborted) setDetails(Object.fromEntries(values));
    }).catch(() => {
      if (!controller.signal.aborted) setDetails({});
    });
    return () => controller.abort();
  }, [chosen, sample]);

  return (
    <section className="team-compare" aria-label="팀 빠른 비교">
      <div><p className="eyebrow">QUICK COMPARE</p><h2>팀 빠른 비교</h2><p>두 팀의 선수단과 연결된 기자 소식을 빠르게 비교합니다.</p></div>
      <div className="team-compare-selects">
        {[first, second].map((value, index) => <select key={index} value={value} onChange={event => index === 0 ? setFirst(event.target.value) : setSecond(event.target.value)}><option value="">{index === 0 ? '첫 번째 팀 선택' : '비교할 팀 선택'}</option>{teams.filter(team => String(team.teamId) !== (index === 0 ? second : first)).map(team => <option key={team.teamId} value={team.teamId}>{teamDisplayName(team)}</option>)}</select>)}
      </div>
      {chosen.length === 2 && <div className="team-compare-result">{chosen.map(team => <article key={team.teamId}><small>CLUB #{team.teamId}</small><strong>{compactTeam(team).name}</strong><span>선수단 {details[team.teamId]?.players ?? '—'}명</span><span>연결 소식 {details[team.teamId]?.posts ?? '—'}건</span></article>)}</div>}
    </section>
  );
}
