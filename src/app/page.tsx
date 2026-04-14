import Link from 'next/link';

const GAMES = [
  { emoji: '⚽', name: 'eFootball', tag: 'PS · Mobile · PC' },
  { emoji: '🏆', name: 'EA FC 26', tag: 'PS · Xbox · PC' },
  { emoji: '🥊', name: 'Mortal Kombat 11', tag: 'PS · Xbox · PC' },
  { emoji: '🏀', name: 'NBA 2K26', tag: 'PS · Xbox · PC' },
  { emoji: '👊', name: 'Tekken 8', tag: 'PS · Xbox · PC' },
  { emoji: '🥋', name: 'Street Fighter 6', tag: 'PS · Xbox · PC' },
];

const FEATURES = [
  { icon: '🎯', title: 'ELO Matchmaking', desc: 'Paired with opponents at your skill level across 14+ games' },
  { icon: '🏅', title: 'Ranked Leaderboard', desc: 'Climb from Bronze to Legend. Your rank is earned, not bought' },
  { icon: '🕹️', title: '5 Platforms', desc: 'PlayStation, Xbox, PC, Mobile, Nintendo — all in one place' },
  { icon: '📸', title: 'Dispute Resolution', desc: 'Disagree on the result? Upload a screenshot. We\'ll settle it' },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      {/* Nav */}
      <nav className="sticky top-0 z-50 bg-gray-950/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-screen-lg mx-auto px-5 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500 flex items-center justify-center font-black text-sm text-white">M</div>
            <span className="font-black text-lg tracking-tight">Mechi</span>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/login" className="text-sm font-semibold text-white/50 hover:text-white px-3 py-2 transition-colors">
              Sign In
            </Link>
            <Link href="/register" className="text-sm font-bold bg-emerald-500 hover:bg-emerald-400 text-white px-4 py-2.5 rounded-xl transition-colors">
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <main className="flex-1">
        <section className="max-w-screen-lg mx-auto px-5 pt-16 pb-20 text-center">
          <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-4 py-1.5 text-emerald-400 text-xs font-bold mb-8 tracking-wide uppercase">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Kenya&apos;s #1 Gaming Matchmaking
          </div>

          <h1 className="text-4xl sm:text-6xl md:text-7xl font-black tracking-tight mb-6 leading-[1.05]">
            Find your{' '}
            <span className="text-emerald-400">rival.</span>
            <br />
            Prove you&apos;re{' '}
            <span className="text-emerald-400">the best.</span>
          </h1>

          <p className="text-base sm:text-lg text-white/40 max-w-lg mx-auto mb-10 leading-relaxed">
            Skill-based 1v1 matchmaking for Kenyan gamers. Play eFootball, EA FC, Tekken, Street Fighter and more. Build your legacy.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/register" className="bg-emerald-500 hover:bg-emerald-400 text-white font-bold px-8 py-4 rounded-2xl text-base transition-colors">
              Start Playing Free →
            </Link>
            <Link href="/login" className="bg-white/8 hover:bg-white/12 text-white/70 hover:text-white font-semibold px-8 py-4 rounded-2xl text-base transition-colors">
              Sign In
            </Link>
          </div>

          {/* Stats row */}
          <div className="mt-16 flex items-center justify-center gap-10 sm:gap-16">
            {[
              { value: '14+', label: 'Games' },
              { value: '5', label: 'Platforms' },
              { value: '6', label: 'Rank Tiers' },
              { value: '🇰🇪', label: 'Kenya First' },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <div className="text-2xl sm:text-3xl font-black text-white">{s.value}</div>
                <div className="text-xs text-white/30 mt-0.5 font-medium">{s.label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Games grid */}
        <section className="max-w-screen-lg mx-auto px-5 pb-20">
          <p className="text-xs font-bold text-white/25 uppercase tracking-widest text-center mb-6">Supported Games</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
            {GAMES.map((g) => (
              <div key={g.name} className="bg-white/4 border border-white/6 rounded-2xl p-4 text-center hover:bg-white/8 transition-colors">
                <div className="text-3xl mb-2">{g.emoji}</div>
                <div className="text-xs font-bold text-white leading-tight mb-1">{g.name}</div>
                <div className="text-[10px] text-white/25 font-medium">{g.tag}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Features */}
        <section className="max-w-screen-lg mx-auto px-5 pb-20">
          <p className="text-xs font-bold text-white/25 uppercase tracking-widest text-center mb-8">Why Mechi</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {FEATURES.map((f) => (
              <div key={f.title} className="bg-white/4 border border-white/6 rounded-2xl p-5 flex gap-4 items-start hover:bg-white/6 transition-colors">
                <div className="text-2xl flex-shrink-0">{f.icon}</div>
                <div>
                  <h3 className="font-bold text-white text-sm mb-1">{f.title}</h3>
                  <p className="text-xs text-white/40 leading-relaxed">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="max-w-screen-lg mx-auto px-5 pb-24 text-center">
          <div className="bg-emerald-500/8 border border-emerald-500/15 rounded-3xl p-10">
            <h2 className="text-2xl sm:text-3xl font-black mb-3">Ready to compete?</h2>
            <p className="text-white/40 text-sm mb-8">Free to join. No subscription. Just pure competition.</p>
            <Link href="/register" className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-white font-bold px-8 py-4 rounded-2xl text-base transition-colors">
              Create Free Account
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/5 py-6 text-center text-white/20 text-xs px-5">
        © {new Date().getFullYear()} Mechi · mechi.club · Built for Kenyan gamers 🇰🇪
      </footer>
    </div>
  );
}
