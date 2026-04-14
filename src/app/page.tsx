import Link from 'next/link';
import { Gamepad2, Trophy, Shield, Monitor, Smartphone, Zap, ArrowRight } from 'lucide-react';

const GAMES = [
  { emoji: '⚽', name: 'eFootball', platforms: 'PS · Mobile · PC' },
  { emoji: '🏆', name: 'EA FC 26', platforms: 'PS · Xbox · PC' },
  { emoji: '🥊', name: 'Mortal Kombat 11', platforms: 'PS · Xbox · PC' },
  { emoji: '🏀', name: 'NBA 2K26', platforms: 'PS · Xbox · PC' },
  { emoji: '👊', name: 'Tekken 8', platforms: 'PS · Xbox · PC' },
  { emoji: '🥋', name: 'Street Fighter 6', platforms: 'PS · Xbox · PC' },
];

const FEATURES = [
  { icon: Zap, title: 'ELO Matchmaking', desc: 'Our skill-based algorithm pairs you with opponents at your level. No more mismatches.' },
  { icon: Trophy, title: 'Ranked Leaderboards', desc: 'Six tiers from Bronze to Legend. Climb the ranks and prove your dominance.' },
  { icon: Monitor, title: '5 Platforms', desc: 'PlayStation, Xbox, PC, Mobile, Nintendo — play on whatever you own.' },
  { icon: Shield, title: 'Dispute Resolution', desc: 'Disagree on results? Upload a screenshot. Our team settles it fair.' },
];

const TIERS = [
  { name: 'Bronze', range: '0-1099', color: '#CD7F32' },
  { name: 'Silver', range: '1100-1299', color: '#C0C0C0' },
  { name: 'Gold', range: '1300-1499', color: '#FFD700' },
  { name: 'Platinum', range: '1500-1699', color: '#00CED1' },
  { name: 'Diamond', range: '1700-1899', color: '#B9F2FF' },
  { name: 'Legend', range: '1900+', color: '#FF6B6B' },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* ── Navbar ── */}
      <nav className="sticky top-0 z-50 bg-gray-950/80 backdrop-blur-xl border-b border-white/[0.04]">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center font-bold text-sm text-white">M</div>
            <span className="font-bold text-base tracking-tight">Mechi</span>
          </Link>
          <div className="flex items-center gap-6">
            <Link href="#features" className="hidden md:block text-sm text-white/40 hover:text-white transition-colors">Features</Link>
            <Link href="#games" className="hidden md:block text-sm text-white/40 hover:text-white transition-colors">Games</Link>
            <Link href="#ranks" className="hidden md:block text-sm text-white/40 hover:text-white transition-colors">Ranks</Link>
            <div className="flex items-center gap-2">
              <Link href="/login" className="text-sm font-medium text-white/50 hover:text-white px-3 py-2 transition-colors">
                Sign In
              </Link>
              <Link href="/register" className="text-sm font-semibold bg-emerald-500 hover:bg-emerald-400 text-white px-4 py-2 rounded-lg transition-colors">
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative overflow-hidden">
        {/* Gradient orbs */}
        <div className="absolute top-20 left-1/4 w-[600px] h-[600px] bg-emerald-500/[0.04] rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-blue-500/[0.03] rounded-full blur-[100px] pointer-events-none" />

        <div className="max-w-7xl mx-auto px-5 sm:px-8 pt-20 sm:pt-28 lg:pt-36 pb-20 lg:pb-32">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 bg-emerald-500/8 border border-emerald-500/15 rounded-full px-4 py-1.5 text-emerald-400 text-xs font-medium mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Kenya&apos;s Gaming Matchmaking Platform
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.1] mb-6">
              Find your opponent.
              <br />
              <span className="text-emerald-400">Prove you&apos;re the best.</span>
            </h1>

            <p className="text-lg sm:text-xl text-white/40 max-w-xl leading-relaxed mb-10">
              Skill-based 1v1 matchmaking for Kenyan gamers. Play eFootball, EA FC, Tekken, Street Fighter and more — across PlayStation, Xbox, PC, Mobile and Nintendo.
            </p>

            <div className="flex flex-col sm:flex-row gap-3">
              <Link href="/register" className="inline-flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-white font-semibold px-6 py-3 rounded-xl text-sm transition-all active:scale-[0.98]">
                Start Playing Free
                <ArrowRight size={16} />
              </Link>
              <Link href="/login" className="inline-flex items-center justify-center bg-white/6 hover:bg-white/10 text-white/60 hover:text-white font-medium px-6 py-3 rounded-xl text-sm transition-all">
                Sign In
              </Link>
            </div>
          </div>

          {/* Stats */}
          <div className="mt-20 grid grid-cols-2 sm:grid-cols-4 gap-6 sm:gap-8 max-w-2xl">
            {[
              { value: '14+', label: 'Games Supported' },
              { value: '5', label: 'Platforms' },
              { value: '6', label: 'Rank Tiers' },
              { value: '🇰🇪', label: 'Kenya First' },
            ].map((s) => (
              <div key={s.label}>
                <div className="text-3xl font-bold text-white">{s.value}</div>
                <div className="text-xs text-white/25 mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section className="border-t border-white/[0.04] py-20 lg:py-28">
        <div className="max-w-7xl mx-auto px-5 sm:px-8">
          <p className="text-xs font-semibold text-white/20 uppercase tracking-widest mb-3">How It Works</p>
          <h2 className="text-2xl sm:text-3xl font-bold mb-12 max-w-lg">Three steps to your next match.</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { step: '01', title: 'Create your profile', desc: 'Pick your platforms, add your gamer IDs, and choose up to 3 games.' },
              { step: '02', title: 'Join the queue', desc: 'Hit "Find Match" — our ELO algorithm finds an opponent at your level.' },
              { step: '03', title: 'Play & climb', desc: 'Report the result, gain rating points, and climb the ranked leaderboard.' },
            ].map((item) => (
              <div key={item.step} className="group">
                <div className="text-sm font-mono text-emerald-500/60 mb-3">{item.step}</div>
                <h3 className="text-base font-semibold text-white mb-2">{item.title}</h3>
                <p className="text-sm text-white/30 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" className="border-t border-white/[0.04] py-20 lg:py-28">
        <div className="max-w-7xl mx-auto px-5 sm:px-8">
          <p className="text-xs font-semibold text-white/20 uppercase tracking-widest mb-3">Features</p>
          <h2 className="text-2xl sm:text-3xl font-bold mb-12 max-w-lg">Built for competitive gamers.</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {FEATURES.map((f) => (
              <div key={f.title} className="bg-white/[0.02] border border-white/[0.05] rounded-2xl p-6 hover:bg-white/[0.04] transition-colors">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center mb-4">
                  <f.icon size={18} className="text-emerald-400" />
                </div>
                <h3 className="font-semibold text-white text-sm mb-2">{f.title}</h3>
                <p className="text-xs text-white/30 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Games ── */}
      <section id="games" className="border-t border-white/[0.04] py-20 lg:py-28">
        <div className="max-w-7xl mx-auto px-5 sm:px-8">
          <p className="text-xs font-semibold text-white/20 uppercase tracking-widest mb-3">Games</p>
          <h2 className="text-2xl sm:text-3xl font-bold mb-12 max-w-lg">Play what you love.</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {GAMES.map((g) => (
              <div key={g.name} className="bg-white/[0.02] border border-white/[0.05] rounded-2xl p-5 text-center hover:bg-white/[0.04] transition-colors group">
                <div className="text-3xl mb-3 group-hover:scale-110 transition-transform">{g.emoji}</div>
                <div className="text-sm font-semibold text-white mb-1">{g.name}</div>
                <div className="text-[11px] text-white/20">{g.platforms}</div>
              </div>
            ))}
          </div>
          <p className="text-sm text-white/20 mt-6">+ 8 more games including Call of Duty Mobile, Clash Royale, Chess, and more.</p>
        </div>
      </section>

      {/* ── Rank Tiers ── */}
      <section id="ranks" className="border-t border-white/[0.04] py-20 lg:py-28">
        <div className="max-w-7xl mx-auto px-5 sm:px-8">
          <p className="text-xs font-semibold text-white/20 uppercase tracking-widest mb-3">Rank System</p>
          <h2 className="text-2xl sm:text-3xl font-bold mb-12 max-w-lg">Your skill, your rank.</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {TIERS.map((t) => (
              <div key={t.name} className="bg-white/[0.02] border border-white/[0.05] rounded-2xl p-5 text-center hover:bg-white/[0.04] transition-colors">
                <div className="w-10 h-10 rounded-full mx-auto mb-3 flex items-center justify-center" style={{ background: t.color + '15' }}>
                  <Trophy size={16} style={{ color: t.color }} />
                </div>
                <div className="text-sm font-semibold" style={{ color: t.color }}>{t.name}</div>
                <div className="text-[11px] text-white/20 mt-0.5">{t.range} ELO</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Platforms ── */}
      <section className="border-t border-white/[0.04] py-20 lg:py-28">
        <div className="max-w-7xl mx-auto px-5 sm:px-8">
          <div className="flex flex-col lg:flex-row lg:items-center gap-10 lg:gap-20">
            <div className="lg:max-w-md">
              <p className="text-xs font-semibold text-white/20 uppercase tracking-widest mb-3">Cross-Platform</p>
              <h2 className="text-2xl sm:text-3xl font-bold mb-4">Play on any device.</h2>
              <p className="text-sm text-white/30 leading-relaxed">
                Whether you game on a PS5, Xbox Series X, gaming PC, your phone, or a Nintendo Switch — Mechi supports all of them. Link your platform IDs and start matching.
              </p>
            </div>
            <div className="flex flex-wrap gap-4">
              {[
                { icon: Gamepad2, label: 'PlayStation', color: 'blue' },
                { icon: Gamepad2, label: 'Xbox', color: 'green' },
                { icon: Monitor, label: 'PC', color: 'purple' },
                { icon: Smartphone, label: 'Mobile', color: 'orange' },
                { icon: Gamepad2, label: 'Nintendo', color: 'red' },
              ].map((p) => (
                <div key={p.label} className="bg-white/[0.02] border border-white/[0.05] rounded-2xl px-6 py-4 flex items-center gap-3 hover:bg-white/[0.04] transition-colors">
                  <p.icon size={18} className="text-white/30" />
                  <span className="text-sm font-medium text-white/60">{p.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="border-t border-white/[0.04] py-20 lg:py-28">
        <div className="max-w-7xl mx-auto px-5 sm:px-8">
          <div className="bg-emerald-500/[0.06] border border-emerald-500/10 rounded-3xl p-10 sm:p-16 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold mb-2">Ready to compete?</h2>
              <p className="text-white/30 text-sm max-w-md">Free to join. No subscriptions. No pay-to-win. Just pure skill-based competition for Kenyan gamers.</p>
            </div>
            <Link href="/register" className="inline-flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-white font-semibold px-6 py-3 rounded-xl text-sm transition-all active:scale-[0.98] flex-shrink-0">
              Create Free Account
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-white/[0.04] py-8">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-emerald-500 flex items-center justify-center font-bold text-[10px] text-white">M</div>
            <span className="text-sm font-medium text-white/30">Mechi</span>
          </div>
          <p className="text-xs text-white/15">
            © {new Date().getFullYear()} Mechi · mechi.club · Built for Kenyan gamers 🇰🇪
          </p>
          <div className="flex gap-6">
            <Link href="/login" className="text-xs text-white/20 hover:text-white/40 transition-colors">Sign In</Link>
            <Link href="/register" className="text-xs text-white/20 hover:text-white/40 transition-colors">Sign Up</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
