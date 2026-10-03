import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getTeamDetail } from '../api/client';
import { demo } from '../demo';
import { SUPPORTED_POST_LEAGUES } from '../constants';
import PostCard from '../components/PostCard';
import { leagueName, logoUrl, photoUrl, teamDisplayName, teamLeague } from '../utils';

export default function TeamDetailPage({ sample, teams, onSelectTeamPosts }) {
  const { teamId } = useParams();
  const navigate = useNavigate();
  const id = Number(teamId);
  const [state, setState] = useState({ loading: true, error: '', data: null });

  useEffect(() => {
    if (!Number.isSafeInteger(id) || id < 1) {
      setState({ loading: false, error: '올바르지 않은 클럽 ID입니다.', data: null });
      return;
    }

    const controller = new AbortController();

    async function load() {
      setState({ loading: true, error: '', data: null });

      try {
        let data;

        if (sample) {
          const selected = teams.find(team => Number(team.teamId) === id);
          if (!selected) throw new Error('클럽을 찾을 수 없습니다.');

          data = {
            teams: {
              ...selected,
              teamPlayerCount: (demo.teamPlayers[selected.teamName] || []).length
            },
            players: { teamPlayers: demo.teamPlayers[selected.teamName] || [] },
            posts: { posts: demo.teamPosts[selected.teamName] || [] }
          };
        } else {
          data = await getTeamDetail(id, controller.signal);
        }

        if (!data.teams || !Array.isArray(data.players?.teamPlayers) || !Array.isArray(data.posts?.posts)) {
          throw new Error('예상과 다른 클럽 상세 응답 형식입니다.');
        }

        setState({ loading: false, error: '', data });
      } catch (error) {
        if (error.name !== 'AbortError') {
          setState({ loading: false, error: error.message, data: null });
        }
      }
    }

    load();
    return () => controller.abort();
  }, [id, sample, teams]);

  if (state.loading) {
    return (
      <section className="view">
        <div className="team-page-actions">
          <button type="button" onClick={() => navigate('/teams')}>← 클럽 목록</button>
        </div>
        <div className="empty">클럽 정보를 불러오는 중...</div>
      </section>
    );
  }

  if (state.error) {
    return (
      <section className="view">
        <div className="team-page-actions">
          <button type="button" onClick={() => navigate('/teams')}>← 클럽 목록</button>
        </div>
        <div className="empty error">{state.error}</div>
      </section>
    );
  }

  const team = state.data.teams;
  const known = teams.find(item => String(item.teamId) === String(team.teamId));
  const league = known ? teamLeague(known) : teamLeague(team);
  const roster = [...state.data.players.teamPlayers]
    .sort((a, b) => String(a.playerName || '').localeCompare(String(b.playerName || ''), 'ko'));
  const news = [...state.data.posts.posts]
    .sort((a, b) => (Date.parse(b.postCreatedAt) || 0) - (Date.parse(a.postCreatedAt) || 0));
  const picture = logoUrl(team.logoUrl);
  const count = Number.isSafeInteger(team.teamPlayerCount) && team.teamPlayerCount >= 0
    ? team.teamPlayerCount
    : roster.length;

  return (
    <section className="view">
      <div className="team-page-actions">
        <button type="button" onClick={() => navigate('/teams')}>← 클럽 목록</button>
      </div>

      <header className="team-page-hero">
        <div className="team-page-watermark" aria-hidden="true">
          {picture
            ? <img src={picture} alt="" referrerPolicy="no-referrer" className="club-emblem" />
            : teamDisplayName(team).slice(0, 1)}
        </div>

        <div className="team-page-identity">
          <span className="team-page-emblem">
            {teamDisplayName(team).slice(0, 1)}
            {picture && <img src={picture} className="club-emblem" alt="" referrerPolicy="no-referrer" />}
          </span>
          <div>
            <p className="eyebrow">CLUB PROFILE {sample ? '/ SAMPLE' : ''}</p>
            <h2>{teamDisplayName(team)}</h2>
            <span>{league === 'unclassified' ? '리그 미분류' : leagueName(league)} · 클럽 ID #{team.teamId}</span>
          </div>
        </div>

        <div className="team-page-stats">
          <div><strong>{count.toLocaleString()}</strong><span>소속 선수</span></div>
          <div><strong>{news.length.toLocaleString()}</strong><span>관련 게시물</span></div>
        </div>
      </header>

      <div className="team-page-columns">
        <section className="team-page-panel">
          <div className="team-page-panel-head">
            <div>
              <p className="eyebrow">THE SQUAD</p>
              <h3>소속 선수 <span>{roster.length}</span></h3>
            </div>
          </div>

          {roster.length ? (
            <ul className="team-page-players">
              {roster.map(player => (
                <li key={player.playerId}>
                  <span className="roster-avatar" aria-hidden="true">
                    {(player.playerName || '?').slice(0, 1)}
                    {photoUrl(player.photoUrl) && (
                      <img className="player-photo" src={player.photoUrl} alt="" loading="lazy" referrerPolicy="no-referrer" />
                    )}
                  </span>
                  <strong>{player.playerName}</strong>
                  <small>#{player.playerId}</small>
                </li>
              ))}
            </ul>
          ) : (
            <div className="team-page-empty">아직 등록된 소속 선수가 없습니다.</div>
          )}
        </section>

        <section className="team-page-panel">
          <div className="team-page-panel-head">
            <div>
              <p className="eyebrow">CLUB JOURNAL</p>
              <h3>관련 게시물 <span>{news.length}</span></h3>
            </div>

            {SUPPORTED_POST_LEAGUES.has(league) && (
              <button
                className="team-page-posts-more"
                type="button"
                onClick={() => onSelectTeamPosts(String(team.teamId))}
              >
                필터로 보기 ↗
              </button>
            )}
          </div>

          {news.length ? (
            <div className="team-page-feed">
              {news.map(post => <PostCard key={post.postId ?? post.externalPostId} post={post} sample={sample} />)}
            </div>
          ) : (
            <div className="team-page-empty">이 클럽에 연결된 게시물이 아직 없습니다.</div>
          )}
        </section>
      </div>
    </section>
  );
}
