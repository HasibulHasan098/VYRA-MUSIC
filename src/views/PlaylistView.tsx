import { Loader2, Play, Shuffle, ArrowLeft, Music } from 'lucide-react'
import { useAppStore } from '../store/appStore'
import { usePlayerStore } from '../store/playerStore'
import TrackRow from '../components/TrackRow'
import Tooltip from '../components/Tooltip'

export default function PlaylistView() {
  const { darkMode, currentPlaylist, isLoadingPlaylist, setView, goBack, selectedUserPlaylist } = useAppStore()
  const { setQueue } = usePlayerStore()

  if (isLoadingPlaylist) {
    return (
      <div className="flex flex-col items-center justify-center py-fib-89">
        <Loader2 size={34} className="animate-spin text-ios-blue mb-fib-13" />
        <p className="text-fib-13 text-ios-gray">Loading...</p>
      </div>
    )
  }

  if (!currentPlaylist) {
    return (
      <div className="flex flex-col items-center justify-center py-fib-89">
        <p className={`text-fib-21 font-semibold ${darkMode ? 'text-white' : 'text-black'}`}>
          Content not found
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
    if (currentPlaylist.songs.length > 0) {
      setQueue(currentPlaylist.songs, 0)
    }
  }

  const shuffleAll = () => {
    if (currentPlaylist.songs.length > 0) {
      const shuffled = [...currentPlaylist.songs].sort(() => Math.random() - 0.5)
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

      {/* Playlist header */}
      <div className="flex items-end gap-fib-21">
        {/* Thumbnail */}
        {currentPlaylist.thumbnail ? (
          <div className="w-fib-144 h-fib-144 rounded-fib-13 overflow-hidden shadow-ios-lg">
            <img
              src={currentPlaylist.thumbnail}
              alt={currentPlaylist.title}
              className="w-full h-full object-cover scale-[1.4]"
            />
          </div>
        ) : (
          <div className={`w-fib-144 h-fib-144 rounded-fib-13 flex items-center justify-center
            ${darkMode ? 'bg-ios-card-secondary-dark' : 'bg-ios-card-secondary'}`}>
            <Music size={55} className="text-ios-gray" />
          </div>
        )}
        
        <div className="flex-1">
          <p className="text-fib-13 text-ios-gray mb-fib-5">Playlist</p>
          <h1 className={`text-fib-34 font-bold mb-fib-8 ${darkMode ? 'text-white' : 'text-black'}`}>
            {currentPlaylist.title}
          </h1>
          <div className="flex items-center gap-fib-8 text-fib-13 text-ios-gray">
            {currentPlaylist.author && <span>{currentPlaylist.author}</span>}
            {currentPlaylist.author && currentPlaylist.songCount && <span>•</span>}
            {currentPlaylist.songCount && <span>{currentPlaylist.songCount} songs</span>}
          </div>
          {currentPlaylist.description && (
            <p className="text-fib-13 text-ios-gray mt-fib-8 line-clamp-2">
              {currentPlaylist.description}
            </p>
          )}
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-fib-13">
        <Tooltip text="Play all">
          <button
            onClick={playAll}
            disabled={currentPlaylist.songs.length === 0}
            className="flex items-center gap-fib-8 px-fib-21 py-fib-13 bg-ios-blue text-white rounded-fib-34 text-fib-13 font-medium ios-active disabled:opacity-50"
          >
            <Play size={18} fill="white" />
            Play
          </button>
        </Tooltip>
        <Tooltip text="Shuffle all">
          <button
            onClick={shuffleAll}
            disabled={currentPlaylist.songs.length === 0}
            className={`flex items-center gap-fib-8 px-fib-21 py-fib-13 rounded-fib-34 text-fib-13 font-medium ios-active disabled:opacity-50
              ${darkMode ? 'bg-ios-card-secondary-dark text-white' : 'bg-ios-card-secondary text-black'}`}
          >
            <Shuffle size={18} />
            Shuffle
          </button>
        </Tooltip>
      </div>

      {/* Songs list */}
      {currentPlaylist.songs.length > 0 ? (
        <div className="space-y-fib-3">
          {currentPlaylist.songs.map((track, index) => (
            <TrackRow
              key={track.id}
              track={track}
              index={index}
              allTracks={currentPlaylist.songs}
              showIndex
              playlistId={selectedUserPlaylist?.id}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-fib-55">
          <p className="text-fib-13 text-ios-gray">No songs in this playlist</p>
        </div>
      )}
    </div>
  )
}
