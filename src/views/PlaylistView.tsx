import { useState } from 'react'
import { Loader2, Play, Shuffle, ArrowLeft, Music, MoreHorizontal, Pencil, Trash2, X } from 'lucide-react'
import { useAppStore } from '../store/appStore'
import { usePlayerStore } from '../store/playerStore'
import TrackRow from '../components/TrackRow'
import Tooltip from '../components/Tooltip'

export default function PlaylistView() {
  const { darkMode, currentPlaylist, isLoadingPlaylist, setView, goBack, selectedUserPlaylist, renamePlaylist, deletePlaylist } = useAppStore()
  const { setQueue } = usePlayerStore()
  
  // Context menu and rename state
  const [showOptions, setShowOptions] = useState(false)
  const [showRenameModal, setShowRenameModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [renameValue, setRenameValue] = useState('')

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

  const isUserPlaylist = selectedUserPlaylist !== null

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

  const handleRename = () => {
    if (selectedUserPlaylist && renameValue.trim()) {
      renamePlaylist(selectedUserPlaylist.id, renameValue.trim())
      setShowRenameModal(false)
    }
  }

  const handleDelete = () => {
    if (selectedUserPlaylist) {
      deletePlaylist(selectedUserPlaylist.id)
      goBack()
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
          <p className="text-fib-13 text-ios-gray mb-fib-5">
            {isUserPlaylist ? 'Your Playlist' : 'Playlist'}
          </p>
          <div className="flex items-center gap-fib-8">
            <h1 className={`text-fib-34 font-bold ${darkMode ? 'text-white' : 'text-black'}`}>
              {currentPlaylist.title}
            </h1>
            {isUserPlaylist && (
              <div className="relative">
                <Tooltip text="More options">
                  <button
                    onClick={() => setShowOptions(!showOptions)}
                    className={`p-fib-5 rounded-fib-8 ios-active ${darkMode ? 'hover:bg-white/10' : 'hover:bg-black/5'}`}
                  >
                    <MoreHorizontal size={20} className="text-ios-gray" />
                  </button>
                </Tooltip>
                
                {/* Options dropdown */}
                {showOptions && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowOptions(false)} />
                    <div 
                      className={`absolute left-0 top-full mt-fib-5 z-50 rounded-fib-13 shadow-ios-lg overflow-hidden min-w-[160px]
                        ${darkMode ? 'bg-ios-card-dark' : 'bg-white'}`}
                    >
                      <button
                        onClick={() => {
                          setRenameValue(currentPlaylist.title)
                          setShowRenameModal(true)
                          setShowOptions(false)
                        }}
                        className={`w-full flex items-center gap-fib-8 px-fib-13 py-fib-13 text-left ios-active
                          ${darkMode ? 'hover:bg-white/10 text-white' : 'hover:bg-black/5 text-black'}`}
                      >
                        <Pencil size={16} className="text-ios-gray" />
                        <span className="text-fib-13">Rename</span>
                      </button>
                      <button
                        onClick={() => {
                          setShowDeleteModal(true)
                          setShowOptions(false)
                        }}
                        className={`w-full flex items-center gap-fib-8 px-fib-13 py-fib-13 text-left ios-active
                          ${darkMode ? 'hover:bg-white/10' : 'hover:bg-black/5'}`}
                      >
                        <Trash2 size={16} className="text-ios-red" />
                        <span className="text-fib-13 text-ios-red">Delete</span>
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
          <div className="flex items-center gap-fib-8 text-fib-13 text-ios-gray mt-fib-5">
            {currentPlaylist.author && <span>{currentPlaylist.author}</span>}
            {currentPlaylist.author && currentPlaylist.songCount && <span>•</span>}
            {currentPlaylist.songCount && <span>{currentPlaylist.songCount} songs</span>}
            {!currentPlaylist.songCount && currentPlaylist.songs.length > 0 && (
              <span>{currentPlaylist.songs.length} songs</span>
            )}
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

      {/* Rename Modal */}
      {showRenameModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowRenameModal(false)}>
          <div 
            className={`w-full max-w-sm mx-4 rounded-fib-21 p-fib-21 shadow-ios-lg
              ${darkMode ? 'bg-ios-card-dark' : 'bg-ios-card'}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-fib-13">
              <h2 className={`text-fib-21 font-bold ${darkMode ? 'text-white' : 'text-black'}`}>
                Rename Playlist
              </h2>
              <button onClick={() => setShowRenameModal(false)} className="p-fib-5 ios-active">
                <X size={21} className="text-ios-gray" />
              </button>
            </div>
            
            <input
              type="text"
              placeholder="Playlist name"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              autoFocus
              className={`w-full px-fib-13 py-fib-13 rounded-fib-13 text-fib-13 outline-none mb-fib-21
                ${darkMode 
                  ? 'bg-ios-card-secondary-dark text-white placeholder-ios-gray' 
                  : 'bg-ios-card-secondary text-black placeholder-ios-gray'}`}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && renameValue.trim()) {
                  handleRename()
                }
              }}
            />
            
            <div className="flex gap-fib-8">
              <button 
                onClick={() => setShowRenameModal(false)}
                className={`flex-1 py-fib-13 rounded-fib-13 text-fib-13 font-medium ios-active
                  ${darkMode ? 'bg-ios-card-secondary-dark text-white' : 'bg-ios-card-secondary text-black'}`}
              >
                Cancel
              </button>
              <button 
                onClick={handleRename}
                disabled={!renameValue.trim()}
                className="flex-1 py-fib-13 rounded-fib-13 text-fib-13 font-medium bg-ios-blue text-white ios-active disabled:opacity-50"
              >
                Rename
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowDeleteModal(false)}>
          <div 
            className={`w-full max-w-sm mx-4 rounded-fib-21 p-fib-21 shadow-ios-lg
              ${darkMode ? 'bg-ios-card-dark' : 'bg-ios-card'}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-fib-13">
              <h2 className={`text-fib-21 font-bold ${darkMode ? 'text-white' : 'text-black'}`}>
                Delete Playlist
              </h2>
              <button onClick={() => setShowDeleteModal(false)} className="p-fib-5 ios-active">
                <X size={21} className="text-ios-gray" />
              </button>
            </div>
            
            <p className={`text-fib-13 mb-fib-21 ${darkMode ? 'text-white' : 'text-black'}`}>
              Are you sure you want to delete "{currentPlaylist.title}"?
            </p>
            
            <div className="flex gap-fib-8">
              <button 
                onClick={() => setShowDeleteModal(false)}
                className={`flex-1 py-fib-13 rounded-fib-13 text-fib-13 font-medium ios-active
                  ${darkMode ? 'bg-ios-card-secondary-dark text-white' : 'bg-ios-card-secondary text-black'}`}
              >
                Cancel
              </button>
              <button 
                onClick={handleDelete}
                className="flex-1 py-fib-13 rounded-fib-13 text-fib-13 font-medium bg-ios-red text-white ios-active"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
