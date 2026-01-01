import { TrendingUp, Sparkles, Radio, Music, Mic2, Guitar, Headphones, Piano, Disc3, Heart, Zap, Coffee, Dumbbell, BookOpen, PartyPopper, Music2, Waves, Clock } from 'lucide-react'
import { useAppStore } from '../store/appStore'

const categories = [
  { id: 'trending', icon: TrendingUp, label: 'Trending', color: 'bg-ios-red' },
  { id: 'new', icon: Sparkles, label: 'New Releases', color: 'bg-ios-purple' },
  { id: 'charts', icon: Music, label: 'Charts', color: 'bg-ios-blue' },
  { id: 'moods', icon: Radio, label: 'Moods & Genres', color: 'bg-ios-green' },
]

const genres = [
  { name: 'Pop', color: 'from-pink-500 to-rose-500', icon: Mic2 },
  { name: 'Hip-Hop', color: 'from-amber-500 to-orange-500', icon: Headphones },
  { name: 'Rock', color: 'from-red-500 to-red-700', icon: Guitar },
  { name: 'Electronic', color: 'from-cyan-500 to-blue-500', icon: Zap },
  { name: 'R&B', color: 'from-purple-500 to-violet-500', icon: Heart },
  { name: 'Country', color: 'from-yellow-500 to-amber-500', icon: Music2 },
  { name: 'Jazz', color: 'from-indigo-500 to-purple-500', icon: Disc3 },
  { name: 'Classical', color: 'from-slate-500 to-gray-600', icon: Piano },
]

const popularSearches = [
  { term: 'Top Hits 2024', icon: TrendingUp },
  { term: 'Chill Vibes', icon: Coffee },
  { term: 'Workout Music', icon: Dumbbell },
  { term: 'Study Music', icon: BookOpen },
  { term: 'Party Mix', icon: PartyPopper },
  { term: 'Acoustic', icon: Guitar },
  { term: 'Lo-Fi Beats', icon: Waves },
  { term: 'Throwback', icon: Clock },
]

export default function ExploreView() {
  const { darkMode, performSearch } = useAppStore()

  const handleCategoryClick = (category: string) => {
    performSearch(category)
  }

  const handleGenreClick = (genre: string) => {
    performSearch(`${genre} music`)
  }

  return (
    <div className="space-y-fib-34">
      {/* Categories */}
      <section>
        <h2 className={`text-fib-21 font-semibold mb-fib-13 ${darkMode ? 'text-white' : 'text-black'}`}>
          Browse
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-fib-13">
          {categories.map(({ id, icon: Icon, label, color }) => (
            <button
              key={id}
              onClick={() => handleCategoryClick(label)}
              className={`${color} rounded-fib-13 p-fib-21 text-left ios-active ios-transition hover:opacity-90`}
            >
              <Icon size={34} className="text-white mb-fib-8" />
              <p className="text-fib-13 font-semibold text-white">{label}</p>
            </button>
          ))}
        </div>
      </section>

      {/* Genres */}
      <section>
        <h2 className={`text-fib-21 font-semibold mb-fib-13 ${darkMode ? 'text-white' : 'text-black'}`}>
          Genres
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-fib-13">
          {genres.map(({ name, color, icon: Icon }) => (
            <button
              key={name}
              onClick={() => handleGenreClick(name)}
              className={`bg-gradient-to-br ${color} rounded-fib-13 p-fib-21 text-left ios-active aspect-video flex flex-col justify-between relative overflow-hidden`}
            >
              <Icon size={32} className="text-white/80" />
              <p className="text-fib-13 font-bold text-white">{name}</p>
              {/* Decorative large icon */}
              <Icon size={80} className="absolute -right-4 -top-4 text-white/10 rotate-12" />
            </button>
          ))}
        </div>
      </section>

      {/* Quick searches */}
      <section>
        <h2 className={`text-fib-21 font-semibold mb-fib-13 ${darkMode ? 'text-white' : 'text-black'}`}>
          Popular Searches
        </h2>
        <div className="flex flex-wrap gap-fib-8">
          {popularSearches.map(({ term, icon: Icon }) => (
            <button
              key={term}
              onClick={() => performSearch(term)}
              className={`flex items-center gap-fib-5 px-fib-13 py-fib-8 rounded-fib-34 text-fib-13 font-medium ios-active ios-transition
                ${darkMode 
                  ? 'bg-ios-card-secondary-dark text-white hover:bg-ios-blue hover:text-white' 
                  : 'bg-ios-card-secondary text-black hover:bg-ios-blue hover:text-white'}`}
            >
              <Icon size={14} />
              {term}
            </button>
          ))}
        </div>
      </section>

      {/* Info */}
      <section className={`rounded-fib-13 p-fib-21 ${darkMode ? 'bg-ios-card-dark' : 'bg-ios-card'}`}>
        <h3 className={`text-fib-13 font-semibold mb-fib-8 ${darkMode ? 'text-white' : 'text-black'}`}>
          Discover Music
        </h3>
        <p className="text-fib-13 text-ios-gray">
          Explore millions of songs from YouTube Music. Click on any category or genre to start discovering new music.
        </p>
      </section>
    </div>
  )
}
