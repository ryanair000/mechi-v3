import Link from 'next/link';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      {/* Navbar */}
      <nav className="border-b border-gray-800 px-6 py-4 flex items-center justify-between max-w-screen-lg mx-auto w-full">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center font-black text-sm">
            M
          </div>
          <span className="font-black text-xl tracking-tight">Mechi</span>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="text-sm font-medium text-gray-400 hover:text-white transition-colors"
          >
            Sign In
          </Link>
          <Link
            href="/register"
            className="text-sm font-bold bg-emerald-600 hover:bg-emerald-500 px-4 py-2 rounded-xl transition-colors"
          >
            Get Started
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-16 text-center max-w-screen-lg mx-auto w-full">
        <div className="inline-flex items-center gap-2 bg-emerald-900/40 border border-emerald-700/50 rounded-full px-4 py-1.5 text-emerald-400 text-sm font-semibold mb-8">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          Kenya&apos;s #1 Gaming Matchmaking Platform
        </div>

        <h1 className="text-5xl md:text-7xl font-black tracking-tight mb-6 leading-none">
          Find your{' '}
          <span className="text-emerald-400">opponent.</span>
          <br />
          Prove you&apos;re{' '}
          <span className="text-emerald-400">the best.</span>
        </h1>

        <p className="text-lg text-gray-400 max-w-xl mb-10">
          1v1 matchmaking for Kenyan gamers. Play eFootball, EA FC, Tekken, Street Fighter and more.
          Climb the leaderboard. Build your legacy.
        </p>

        <div className="flex flex-wrap gap-4 justify-center">
          <Link
            href="/register"
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-8 py-4 rounded-2xl text-lg transition-colors"
          >
            Start Playing Free
          </Link>
          <Link
            href="/login"
            className="border border-gray-700 hover:border-gray-500 text-gray-300 hover:text-white font-bold px-8 py-4 rounded-2xl text-lg transition-colors"
          >
            Sign In
          </Link>
        </div>

        {/* Games grid */}
        <div className="mt-20 grid grid-cols-3 md:grid-cols-6 gap-3 max-w-2xl">
          {[
            { emoji: '⚽', name: 'eFootball' },
            { emoji: '🏆', name: 'EA FC 26' },
            { emoji: '🥊', name: 'Mortal Kombat' },
            { emoji: '🏀', name: 'NBA 2K26' },
            { emoji: '👊', name: 'Tekken 8' },
            { emoji: '🥋', name: 'Street Fighter' },
          ].map((game) => (
            <div
              key={game.name}
              className="bg-gray-900 border border-gray-800 rounded-xl p-3 flex flex-col items-center gap-2"
            >
              <span className="text-2xl">{game.emoji}</span>
              <span className="text-xs text-gray-400 font-medium text-center leading-tight">{game.name}</span>
            </div>
          ))}
        </div>

        {/* Stats */}
        <div className="mt-16 grid grid-cols-3 gap-8">
          {[
            { value: '14+', label: 'Games' },
            { value: '5', label: 'Platforms' },
            { value: '🇰🇪', label: 'Kenya First' },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="text-3xl font-black text-white mb-1">{stat.value}</div>
              <div className="text-sm text-gray-500">{stat.label}</div>
            </div>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-800 py-6 text-center text-gray-500 text-sm px-6">
        <p>© {new Date().getFullYear()} Mechi · mechi.club · Built for Kenyan gamers</p>
      </footer>
    </div>
  );
}
