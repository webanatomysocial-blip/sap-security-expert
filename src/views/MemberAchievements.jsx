import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getMemberAchievements } from '../services/api';
import { useMemberAuth } from '../context/MemberAuthContext';

const AchievementCard = ({ achievement }) => {
  const { icon, color, bg, label, description, earned, earned_at } = achievement;

  const formatDate = (dt) => {
    if (!dt) return '';
    return new Date(dt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  return (
    <div
      style={{
        background: '#fff',
        border: `1px solid ${earned ? color + '33' : '#e2e8f0'}`,
        borderRadius: '16px',
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        opacity: earned ? 1 : 0.6,
        transition: 'box-shadow 0.2s',
        boxShadow: earned ? `0 4px 20px ${color}22` : '0 1px 4px rgba(0,0,0,0.05)',
      }}
    >
      {/* Icon circle */}
      <div
        style={{
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          background: earned ? bg : '#f1f5f9',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          filter: earned ? 'none' : 'grayscale(1)',
        }}
      >
        <i className={`bi ${icon}`} style={{ fontSize: '1.5rem', color: earned ? color : '#94a3b8' }} />
      </div>

      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', flexWrap: 'wrap' }}>
          <span style={{ fontWeight: '700', fontSize: '1rem', color: '#0f172a' }}>{label}</span>
          {earned ? (
            <span style={{
              background: '#dcfce7',
              color: '#16a34a',
              fontSize: '0.75rem',
              fontWeight: '600',
              padding: '2px 10px',
              borderRadius: '999px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
            }}>
              ✓ Earned
            </span>
          ) : (
            <span style={{
              background: '#f1f5f9',
              color: '#94a3b8',
              fontSize: '0.75rem',
              fontWeight: '500',
              padding: '2px 10px',
              borderRadius: '999px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
            }}>
              🔒 Not yet earned
            </span>
          )}
        </div>
        <p style={{ margin: 0, fontSize: '0.875rem', color: '#64748b', lineHeight: '1.5' }}>{description}</p>
        {earned && earned_at && (
          <p style={{ margin: '8px 0 0', fontSize: '0.78rem', color: color, fontWeight: '500' }}>
            Earned on {formatDate(earned_at)}
          </p>
        )}
      </div>
    </div>
  );
};

const MemberAchievements = () => {
  const { member } = useMemberAuth();
  const navigate = useNavigate();
  const [achievements, setAchievements] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMemberAchievements()
      .then(res => {
        if (res.data?.achievements) setAchievements(res.data.achievements);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const earnedCount = achievements.filter(a => a.earned).length;
  const total = achievements.length || 7;
  const pct = total > 0 ? Math.round((earnedCount / total) * 100) : 0;

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
      {/* Hero */}
      <div style={{
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 60%, #312e81 100%)',
        padding: '60px 24px 48px',
        textAlign: 'center',
        color: '#fff',
      }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
          <i className="bi bi-award-fill" style={{ fontSize: '2rem', color: '#ee5e42' }} />
          <h1 style={{ margin: 0, fontSize: 'clamp(1.8rem, 4vw, 2.5rem)', fontWeight: '800', letterSpacing: '-0.02em' }}>
            Achievements
          </h1>
        </div>
        <p style={{ margin: '0 auto', maxWidth: '520px', fontSize: '1.05rem', color: '#94a3b8', lineHeight: '1.6' }}>
          Track your impact in the SAP Security Expert community
        </p>
        {member && (
          <p style={{ marginTop: '12px', fontSize: '0.9rem', color: '#cbd5e1' }}>
            Welcome back, <strong style={{ color: '#fff' }}>{member.name}</strong>
          </p>
        )}
      </div>

      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '40px 24px' }}>
        {/* Login prompt */}
        {!member && !loading && (
          <div style={{
            background: '#fff',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            padding: '20px 24px',
            marginBottom: '32px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            color: '#475569',
            fontSize: '0.95rem',
          }}>
            <i className="bi bi-info-circle-fill" style={{ color: '#ee5e42', fontSize: '1.2rem', flexShrink: 0 }} />
            <span>
              <strong>Log in to track your achievements.</strong> You&rsquo;re viewing all badges — sign in to see which ones you&rsquo;ve earned.
            </span>
            <button
              onClick={() => navigate('/member/login')}
              style={{
                marginLeft: 'auto',
                padding: '8px 18px',
                background: '#ee5e42',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '0.85rem',
                flexShrink: 0,
              }}
            >
              Log In
            </button>
          </div>
        )}

        {/* Progress bar */}
        {member && (
          <div style={{
            background: '#fff',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            padding: '20px 24px',
            marginBottom: '32px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <span style={{ fontWeight: '700', fontSize: '0.95rem', color: '#0f172a' }}>
                Your Progress
              </span>
              <span style={{ fontWeight: '700', fontSize: '0.95rem', color: '#ee5e42' }}>
                {earnedCount} / {total} &nbsp;({pct}%)
              </span>
            </div>
            <div style={{ background: '#f1f5f9', borderRadius: '999px', height: '10px', overflow: 'hidden' }}>
              <div style={{
                height: '100%',
                width: `${pct}%`,
                background: 'linear-gradient(90deg, #ee5e42, #f97316)',
                borderRadius: '999px',
                transition: 'width 0.6s ease',
              }} />
            </div>
          </div>
        )}

        {/* Grid */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '80px 0', color: '#94a3b8' }}>
            <i className="bi bi-hourglass-split" style={{ fontSize: '2rem', marginBottom: '12px', display: 'block' }} />
            Loading achievements…
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: '20px',
          }}>
            {achievements.map(a => (
              <AchievementCard key={a.id} achievement={a} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MemberAchievements;
