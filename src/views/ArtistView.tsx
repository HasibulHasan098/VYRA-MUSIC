import { Loader2, Play, Shuffle, ArrowLeft, Music } from 'lucide-react'
import { useState } from 'react'
import { useAppStore } from '../store/appStore'
import { usePlayerStore } from '../store/playerStore'
import TrackRow from '../components/TrackRow'
import ArtistAvatar from '../components/ArtistAvatar'
import Tooltip from '../components/Tooltip'
import { AlbumItem } from '../api/youtube'

// Generate a consistent color based on the title
const getColorFromTitle = (title: string): string => {
  const colors = [
    'from-red-500 to-red-700',
    'from-orange-500 to-orange-700',
    'from-amber-500 to-amber-700',
    'from-yellow-500 to-yellow-700',
    'from-lime-500 to-lime-700',
    'from-green-500 to-green-700',
    'from-emerald-500 to-emerald-700',
    'from-teal-500 to-teal-700',
    'from-cyan-500 to-cyan-700',
    'from-sky-500 to-sky-700',
    'from-blue-500 to-blue-700',
    'from-indigo-500 to-indigo-700',
    'from-violet-500 to-violet-700',
    'from-purple-500 to-purple-700',
    'from-fuchsia-500 to-fuchsia-700',
    'from-pink-500 to-pink-700',
  ]
  let hash = 0
  for (let i = 0; i < title.length; i++) {
    hash = title.charCodeAt(i) + ((hash << 5) - hash)
  }
  return colors[Math.abs(hash) % colors.length]
}

// Album card for artist page
function ArtistAlbumCard({ album, onClick }: { album: AlbumItem; onClick: () => void }) {
  const { darkMode } = useAppStore()
  const [imgError, setImgError] = useState(false)
  const [imgLoaded, setImgLoaded] = useState(false)
  const showFallback = !album.thumbnail || imgError

  return (
    <div
      onClick={onClick}
      className={`p-fib-13 rounded-fib-13 cursor-pointer ios-transition group
        ${darkMode ? 'bg-ios-card-dark hover:bg-ios-card-secondary-dark' : 'bg-ios-card hover:bg-ios-card-secondary'}`}
    >
      <div className="relative mb-fib-8">
        {showFallback ? (
          <div className={`w-full aspect-square rounded-fib-8 bg-gradient-to-br ${getColorFromTitle(album.title)} flex items-center justify-center`}>
            <Music size={34} className="text-white/80" />
          </div>
        ) : (
          <div className="relative w-full aspect-square">
            {!imgLoaded && (
              <div className={`absolute inset-0 rounded-fib-8 bg-gradient-to-br ${getColorFromTitle(album.title)} flex items-center justify-center`}>
                <Music size={34} className="text-white/80" />
              </div>
            )}
            <img
              src={album.thumbnail}
              alt=""
              className={`w-full aspect-square rounded-fib-8 object-cover ${imgLoaded ? 'opacity-100' : 'opacity-0'}`}
              onError={() => setImgError(true)}
              onLoad={() => setImgLoaded(true)}
            />
          </div>
        )}
        <div className="absolute bottom-fib-5 right-fib-5 w-fib-34 h-fib-34 rounded-full bg-ios-blue flex items-center justify-center shadow-ios-lg opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 ios-transition">
          <Play size={16} fill="white" className="text-white ml-0.5" />
        </div>
      </div>
      <p className={`text-fib-13 font-medium truncate ${darkMode ? 'text-white' : 'text-black'}`}>
        {album.title}
      </p>
      {album.year && (
        <p className="text-fib-8 text-ios-gray">{album.year}</p>
      )}
    </div>
  )
}

export default function ArtistView() {
  const { darkMode, currentArtist, isLoadingArtist, setView, openAlbum, goBack } = useAppStore()
  const { setQueue } = usePlayerStore()

  if (isLoadingArtist) {
    return (
      <div className="flex flex-col items-center justify-center py-fib-89">
        <Loader2 size={34} className="animate-spin text-ios-blue mb-fib-13" />
        <p className="text-fib-13 text-ios-gray">Loading artist...</p>
      </div>
    )
  }

  if (!currentArtist) {
    return (
      <div className="flex flex-col items-center justify-center py-fib-89">
        <p className={`text-fib-21 font-semibold ${darkMode ? 'text-white' : 'text-black'}`}>
          Artist not found
        </p>
        <button
          onClick={() => setView('home')}
          className="mt-fib-13 px-fib-21 py-fib-8 bg-ios-blue text-white rounded-fib-34 text-fib-13"
        >
          Go Home
        </button>
      </div>
    )
  }

  const playAll = () => {
    if (currentArtist.songs.length > 0) {
      setQueue(currentArtist.songs, 0)
    }
  }

  const shuffleAll = () => {
    if (currentArtist.songs.length > 0) {
      const shuffled = [...currentArtist.songs].sort(() => Math.random() - 0.5)
      setQueue(shuffled, 0)
    }
  }

  return (
    <div className="space-y-fib-21">
      {/* Back button */}
      <Tooltip text="Go back">
        <button
          onClick={() => goBack()}
          className={`flex items-center gap-fib-8 text-fib-13 ios-active
            ${darkMode ? 'text-ios-gray hover:text-white' : 'text-ios-gray hover:text-black'}`}
        >
          <ArrowLeft size={18} />
          Back
        </button>
      </Tooltip>

      {/* Artist header */}
      <div className="relative">
        {/* Background gradient */}
        {currentArtist.thumbnail && (
          <div 
            className="absolute inset-0 h-fib-233 -mx-fib-21 -mt-fib-21 bg-cover bg-center opacity-30 blur-xl"
            style={{ backgroundImage: `url(${currentArtist.thumbnail})` }}
          />
        )}
        
        <div className="relative flex items-end gap-fib-21 pb-fib-21">
          {/* Artist image */}
          <ArtistAvatar 
            name={currentArtist.name} 
            thumbnail={currentArtist.thumbnail}
            size={144}
            className="shadow-ios-lg"
          />
          
          <div className="flex-1">
            <p className="text-fib-13 text-ios-gray mb-fib-5">Artist</p>
            <h1 className={`text-fib-55 font-bold mb-fib-8 ${darkMode ? 'text-white' : 'text-black'}`}>
              {currentArtist.name}
            </h1>
            {currentArtist.subscribers && (
              <p className="text-fib-13 text-ios-gray">{currentArtist.subscribers}</p>
            )}
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-fib-13">
        <Tooltip text="Play all">
          <button
            onClick={playAll}
            disabled={currentArtist.songs.length === 0}
            className="flex items-center gap-fib-8 px-fib-21 py-fib-13 bg-ios-blue text-white rounded-fib-34 text-fib-13 font-medium ios-active disabled:opacity-50"
          >
            <Play size={18} fill="white" />
            Play
          </button>
        </Tooltip>
        <Tooltip text="Shuffle all">
          <button
            onClick={shuffleAll}
            disabled={currentArtist.songs.length === 0}
            className={`flex items-center gap-fib-8 px-fib-21 py-fib-13 rounded-fib-34 text-fib-13 font-medium ios-active disabled:opacity-50
              ${darkMode ? 'bg-ios-card-secondary-dark text-white' : 'bg-ios-card-secondary text-black'}`}
          >
            <Shuffle size={18} />
            Shuffle
          </button>
        </Tooltip>
      </div>

      {/* Popular songs */}
      {currentArtist.songs.length > 0 && (
        <section>
          <h2 className={`text-fib-21 font-bold mb-fib-13 ${darkMode ? 'text-white' : 'text-black'}`}>
            Popular
          </h2>
          <div className="space-y-fib-3">
            {currentArtist.songs.slice(0, 10).map((track, index) => (
              <TrackRow
                key={track.id}
                track={track}
                index={index}
                allTracks={currentArtist.songs}
                showIndex
                showDuration={false}
              />
            ))}
          </div>
        </section>
      )}

      {/* Albums */}
      {currentArtist.albums.length > 0 && (
        <section>
          <h2 className={`text-fib-21 font-bold mb-fib-13 ${darkMode ? 'text-white' : 'text-black'}`}>
            Albums
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-fib-13">
            {currentArtist.albums.map((album) => (
              <ArtistAlbumCard
                key={album.id}
                album={album}
                onClick={() => openAlbum(album.id)}
              />
            ))}
          </div>
        </section>
      )}

      {currentArtist.songs.length === 0 && currentArtist.albums.length === 0 && (
        <div className="text-center py-fib-55">
          <p className="text-fib-13 text-ios-gray">No songs or albums found for this artist</p>
        </div>
      )}
    </div>
  )
}
