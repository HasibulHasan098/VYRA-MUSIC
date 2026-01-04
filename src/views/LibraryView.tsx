import { useState } from 'react'
import { Plus, Heart, Clock, Download, Music, CheckCircle, Loader2, Trash2, RotateCcw, X, Play, Users } from 'lucide-react'
import { useAppStore } from '../store/appStore'
import { usePlayerStore, Song } from '../store/playerStore'
import TrackRow from '../components/TrackRow'
import Tooltip from '../components/Tooltip'
import ArtistAvatar from '../components/ArtistAvatar'

type Tab = 'recent' | 'liked' | 'artists' | 'playlists' | 'downloads'

export default function LibraryView() {
  const { darkMode, libraryTab, setLibraryTab, downloads, downloadedSongs, removeDownload, removeDownloadedSong, downloadTrack, userPlaylists, createPlaylist, deletePlaylist, openUserPlaylist, followedArtists, unfollowArtist, openArtist } = useAppStore()
  const { recentlyPlayed, likedSongs, setQueue } = usePlayerStore()
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newPlaylistName, setNewPlaylistName] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null)

  const tabs: { id: Tab; label: string; icon: typeof Heart }[] = [
    { id: 'recent', label: 'Recent', icon: Clock },
    { id: 'liked', label: 'Liked', icon: Heart },
    { id: 'artists', label: 'Artists', icon: Users },
    { id: 'playlists', label: 'Playlists', icon: Music },
    { id: 'downloads', label: 'Downloads', icon: Download },
  ]

  return (
    <div className="space-y-fib-21">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className={`text-fib-34 font-bold ${darkMode ? 'text-white' : 'text-black'}`}>
          Your Library
        </h1>
      </div>

      {/* Tabs - iOS segmented control style */}
      <div className={`inline-flex p-fib-3 rounded-fib-13 ${darkMode ? 'bg-ios-card-secondary-dark' : 'bg-ios-card-secondary'}`}>
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setLibraryTab(id)}
            className={`flex items-center gap-fib-5 px-fib-13 py-fib-8 rounded-fib-8 text-fib-13 font-medium ios-transition
              ${libraryTab === id 
                ? 'bg-ios-blue text-white shadow-ios' 
                : darkMode ? 'text-white' : 'text-black'}`}
          >
            <Icon size={16} />
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      {libraryTab === 'recent' && (
        <div className="space-y-fib-13">
          {recentlyPlayed.length > 0 ? (
            <>
              <div className="flex items-center justify-between">
                <p className="text-fib-13 text-ios-gray">
                  {recentlyPlayed.length} song{recentlyPlayed.length !== 1 ? 's' : ''} played
                </p>
                <Tooltip text="Play all recent songs">
                  <button 
                    onClick={() => setQueue(recentlyPlayed, 0)}
                    className="px-fib-13 py-fib-5 bg-ios-blue text-white rounded-fib-8 text-fib-13 font-medium ios-active"
                  >
                    Play All
                  </button>
                </Tooltip>
              </div>
              <div className="space-y-fib-3">
                {recentlyPlayed.map((track, index) => (
                  <TrackRow 
                    key={`${track.id}-${index}`} 
                    track={track} 
                    index={index}
                    allTracks={recentlyPlayed}
                  />
                ))}
              </div>
            </>
          ) : (
            <EmptyState 
              icon={Clock}
              title="No recent plays"
              description="Songs you play will appear here"
              darkMode={darkMode}
            />
          )}
        </div>
      )}

      {libraryTab === 'liked' && (
        <div className="space-y-fib-13">
          {likedSongs.length > 0 ? (
            <>
              <div className="flex items-center justify-between">
                <p className="text-fib-13 text-ios-gray">
                  {likedSongs.length} liked song{likedSongs.length !== 1 ? 's' : ''}
                </p>
                <Tooltip text="Play all liked songs">
                  <button 
                    onClick={() => setQueue(likedSongs, 0)}
                    className="px-fib-13 py-fib-5 bg-ios-blue text-white rounded-fib-8 text-fib-13 font-medium ios-active"
                  >
                    Play All
                  </button>
                </Tooltip>
              </div>
              <div className="space-y-fib-3">
                {likedSongs.map((track, index) => (
                  <TrackRow 
                    key={track.id} 
                    track={track} 
                    index={index}
                    allTracks={likedSongs}
                  />
                ))}
              </div>
            </>
          ) : (
            <EmptyState 
              icon={Heart}
              title="No liked songs yet"
              description="Tap the heart icon on any song to add it here"
              darkMode={darkMode}
            />
          )}
        </div>
      )}

      {libraryTab === 'artists' && (
        <div className="space-y-fib-13">
          {followedArtists.length > 0 ? (
            <>
              <p className="text-fib-13 text-ios-gray">
                {followedArtists.length} artist{followedArtists.length !== 1 ? 's' : ''} followed
              </p>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-fib-13">
                {followedArtists.map((artist) => (
                  <div 
                    key={artist.id}
                    onClick={() => openArtist(artist.id)}
                    className={`p-fib-13 rounded-fib-13 cursor-pointer ios-active ios-transition text-center group
                      ${darkMode ? 'bg-ios-card-dark hover:bg-ios-card-secondary-dark' : 'bg-ios-card hover:bg-ios-card-secondary'}`}
                  >
                    <div className="relative mb-fib-8 mx-auto w-fit">
                      <ArtistAvatar 
                        name={artist.name} 
                        thumbnail={artist.thumbnail}
                        size={80}
                      />
                      {/* Play overlay */}
                      <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 ios-transition">
                        <div className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center">
                          <Play size={20} fill="black" className="text-black ml-0.5" />
                        </div>
                      </div>
                    </div>
                    <p className={`text-fib-13 font-medium truncate ${darkMode ? 'text-white' : 'text-black'}`}>
                      {artist.name}
                    </p>
                    {artist.subscribers && (
                      <p className="text-fib-8 text-ios-gray truncate">{artist.subscribers}</p>
                    )}
                    <button 
                      onClick={(e) => {
                        e.stopPropagation()
                        unfollowArtist(artist.id)
                      }}
                      className="mt-fib-8 text-fib-8 text-ios-red ios-active hover:underline"
                    >
                      Unfollow
                    </button>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <EmptyState 
              icon={Users}
              title="No followed artists"
              description="Follow artists to see them here and get recommendations"
              darkMode={darkMode}
            />
          )}
        </div>
      )}

      {libraryTab === 'playlists' && (
        <div className="space-y-fib-13">
          {/* Create playlist button */}
          <button 
            onClick={() => setShowCreateModal(true)}
            className={`w-full flex items-center gap-fib-13 p-fib-13 rounded-fib-13 border-2 border-dashed ios-active ios-transition
              ${darkMode ? 'border-ios-gray hover:border-ios-blue' : 'border-ios-gray-3 hover:border-ios-blue'}`}
          >
            <div className={`w-fib-55 h-fib-55 rounded-fib-8 flex items-center justify-center
              ${darkMode ? 'bg-ios-card-secondary-dark' : 'bg-ios-card-secondary'}`}>
              <Plus size={21} className="text-ios-gray" />
            </div>
            <div className="text-left">
              <p className={`text-fib-13 font-medium ${darkMode ? 'text-white' : 'text-black'}`}>
                Create Playlist
              </p>
              <p className="text-fib-13 text-ios-gray">Add your favorite songs</p>
            </div>
          </button>

          {/* User playlists */}
          {userPlaylists.length > 0 ? (
            <div className="space-y-fib-8">
              {userPlaylists.map((playlist) => (
                <div 
                  key={playlist.id}
                  onClick={() => openUserPlaylist(playlist.id)}
                  className={`flex items-center gap-fib-13 p-fib-13 rounded-fib-13 cursor-pointer ios-active ios-transition
                    ${darkMode ? 'bg-ios-card-dark hover:bg-ios-card-secondary-dark' : 'bg-ios-card hover:bg-ios-card-secondary'}`}
                >
                  {/* Playlist cover */}
                  <div className={`w-fib-55 h-fib-55 rounded-fib-8 flex items-center justify-center overflow-hidden
                    ${darkMode ? 'bg-ios-card-secondary-dark' : 'bg-ios-card-secondary'}`}>
                    {playlist.songs.length > 0 ? (
                      <img src={`https://img.youtube.com/vi/${playlist.songs[0].id}/hqdefault.jpg`} alt="" className="w-full h-full object-cover scale-[1.35]" />
                    ) : (
                      <Music size={21} className="text-ios-gray" />
                    )}
                  </div>
                  
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className={`text-fib-13 font-medium truncate ${darkMode ? 'text-white' : 'text-black'}`}>
                      {playlist.name}
                    </p>
                    <p className="text-fib-13 text-ios-gray">
                      {playlist.songs.length} song{playlist.songs.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                  
                  {/* Play button */}
                  {playlist.songs.length > 0 && (
                    <Tooltip text="Play">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation()
                          setQueue(playlist.songs, 0)
                        }}
                        className="p-fib-8 rounded-full bg-ios-blue text-white ios-active"
                      >
                        <Play size={16} fill="white" className="ml-0.5" />
                      </button>
                    </Tooltip>
                  )}
                  
                  {/* Delete button */}
                  <Tooltip text="Delete playlist">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation()
                        setDeleteConfirm({ id: playlist.id, name: playlist.name })
                      }}
                      className={`p-fib-5 rounded-fib-8 ios-active ${darkMode ? 'hover:bg-white/10' : 'hover:bg-black/5'}`}
                    >
                      <Trash2 size={16} className="text-ios-red" />
                    </button>
                  </Tooltip>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState 
              icon={Music}
              title="No playlists yet"
              description="Create a playlist to organize your music"
              darkMode={darkMode}
            />
          )}
        </div>
      )}

      {/* Create Playlist Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowCreateModal(false)}>
          <div 
            className={`w-full max-w-sm mx-4 rounded-fib-21 p-fib-21 shadow-ios-lg
              ${darkMode ? 'bg-ios-card-dark' : 'bg-ios-card'}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-fib-21">
              <h2 className={`text-fib-21 font-bold ${darkMode ? 'text-white' : 'text-black'}`}>
                Create Playlist
              </h2>
              <button onClick={() => setShowCreateModal(false)} className="p-fib-5 ios-active">
                <X size={21} className="text-ios-gray" />
              </button>
            </div>
            
            <input
              type="text"
              placeholder="Playlist name"
              value={newPlaylistName}
              onChange={(e) => setNewPlaylistName(e.target.value)}
              autoFocus
              className={`w-full px-fib-13 py-fib-13 rounded-fib-13 text-fib-13 outline-none mb-fib-21
                ${darkMode 
                  ? 'bg-ios-card-secondary-dark text-white placeholder-ios-gray' 
                  : 'bg-ios-card-secondary text-black placeholder-ios-gray'}`}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && newPlaylistName.trim()) {
                  createPlaylist(newPlaylistName.trim())
                  setNewPlaylistName('')
                  setShowCreateModal(false)
                }
              }}
            />
            
            <div className="flex gap-fib-8">
              <button 
                onClick={() => setShowCreateModal(false)}
                className={`flex-1 py-fib-13 rounded-fib-13 text-fib-13 font-medium ios-active
                  ${darkMode ? 'bg-ios-card-secondary-dark text-white' : 'bg-ios-card-secondary text-black'}`}
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  if (newPlaylistName.trim()) {
                    createPlaylist(newPlaylistName.trim())
                    setNewPlaylistName('')
                    setShowCreateModal(false)
                  }
                }}
                disabled={!newPlaylistName.trim()}
                className="flex-1 py-fib-13 rounded-fib-13 text-fib-13 font-medium bg-ios-blue text-white ios-active disabled:opacity-50"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setDeleteConfirm(null)}>
          <div 
            className={`w-full max-w-sm mx-4 rounded-fib-21 p-fib-21 shadow-ios-lg
              ${darkMode ? 'bg-ios-card-dark' : 'bg-ios-card'}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-fib-13">
              <h2 className={`text-fib-21 font-bold ${darkMode ? 'text-white' : 'text-black'}`}>
                Delete Playlist
              </h2>
              <button onClick={() => setDeleteConfirm(null)} className="p-fib-5 ios-active">
                <X size={21} className="text-ios-gray" />
              </button>
            </div>
            
            <p className={`text-fib-13 mb-fib-21 ${darkMode ? 'text-white' : 'text-black'}`}>
              Are you sure you want to delete "{deleteConfirm.name}"?
            </p>
            
            <div className="flex gap-fib-8">
              <button 
                onClick={() => setDeleteConfirm(null)}
                className={`flex-1 py-fib-13 rounded-fib-13 text-fib-13 font-medium ios-active
                  ${darkMode ? 'bg-ios-card-secondary-dark text-white' : 'bg-ios-card-secondary text-black'}`}
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  deletePlaylist(deleteConfirm.id)
                  setDeleteConfirm(null)
                }}
                className="flex-1 py-fib-13 rounded-fib-13 text-fib-13 font-medium bg-ios-red text-white ios-active"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {libraryTab === 'downloads' && (
        <div className="space-y-fib-13">
          {/* Active Downloads */}
          {downloads.filter(d => d.status === 'downloading' || d.status === 'pending').length > 0 && (
            <div className="space-y-fib-8">
              <h3 className={`text-fib-13 font-semibold ${darkMode ? 'text-white' : 'text-black'}`}>
                Downloading
              </h3>
              {downloads
                .filter(d => d.status === 'downloading' || d.status === 'pending')
                .map((download) => (
                  <DownloadItem 
                    key={download.trackId}
                    track={download.track}
                    progress={download.progress}
                    status={download.status}
                    darkMode={darkMode}
                  />
                ))}
            </div>
          )}

          {/* Failed Downloads */}
          {downloads.filter(d => d.status === 'error').length > 0 && (
            <div className="space-y-fib-8">
              <h3 className={`text-fib-13 font-semibold text-ios-red`}>
                Failed
              </h3>
              {downloads
                .filter(d => d.status === 'error')
                .map((download) => (
                  <DownloadItem 
                    key={download.trackId}
                    track={download.track}
                    progress={0}
                    status={download.status}
                    error={download.error}
                    darkMode={darkMode}
                    onDelete={() => removeDownload(download.trackId)}
                    onRetry={() => {
                      removeDownload(download.trackId)
                      downloadTrack(download.track)
                    }}
                  />
                ))}
            </div>
          )}

          {/* Completed Downloads */}
          {downloadedSongs.length > 0 ? (
            <div className="space-y-fib-8">
              <div className="flex items-center justify-between">
                <h3 className={`text-fib-13 font-semibold ${darkMode ? 'text-white' : 'text-black'}`}>
                  Downloaded ({downloadedSongs.length})
                </h3>
                <Tooltip text="Play all downloads">
                  <button 
                    onClick={() => setQueue(downloadedSongs, 0)}
                    className="px-fib-13 py-fib-5 bg-ios-blue text-white rounded-fib-8 text-fib-13 font-medium ios-active"
                  >
                    Play All
                  </button>
                </Tooltip>
              </div>
              <div className="space-y-fib-3">
                {downloadedSongs.map((track, index) => (
                  <DownloadedTrackRow 
                    key={track.id} 
                    track={track} 
                    index={index}
                    allTracks={downloadedSongs}
                    darkMode={darkMode}
                    onDelete={() => removeDownloadedSong(track.id)}
                  />
                ))}
              </div>
            </div>
          ) : downloads.length === 0 ? (
            <EmptyState 
              icon={Download}
              title="No downloads"
              description="Downloaded songs will appear here for offline listening"
              darkMode={darkMode}
            />
          ) : null}
        </div>
      )}

      {/* Info card */}
      <div className={`rounded-fib-13 p-fib-21 ${darkMode ? 'bg-ios-card-dark' : 'bg-ios-card'}`}>
        <h3 className={`text-fib-13 font-semibold mb-fib-8 ${darkMode ? 'text-white' : 'text-black'}`}>
          About Your Library
        </h3>
        <p className="text-fib-13 text-ios-gray">
          Your library stores your liked songs, playlists, and downloads locally. 
          Sign in with your YouTube Music account to sync your library across devices.
        </p>
      </div>
    </div>
  )
}

function EmptyState({ 
  icon: Icon, 
  title, 
  description, 
  darkMode 
}: { 
  icon: typeof Heart
  title: string
  description: string
  darkMode: boolean 
}) {
  return (
    <div className="flex flex-col items-center justify-center py-fib-55 text-center">
      <div className={`w-fib-89 h-fib-89 rounded-full flex items-center justify-center mb-fib-13
        ${darkMode ? 'bg-ios-card-secondary-dark' : 'bg-ios-card-secondary'}`}>
        <Icon size={34} className="text-ios-gray" />
      </div>
      <p className={`text-fib-13 font-semibold mb-fib-5 ${darkMode ? 'text-white' : 'text-black'}`}>
        {title}
      </p>
      <p className="text-fib-13 text-ios-gray max-w-xs">
        {description}
      </p>
    </div>
  )
}

function DownloadItem({ 
  track, 
  progress, 
  status,
  error,
  darkMode,
  onDelete,
  onRetry
}: { 
  track: Song
  progress: number
  status: 'pending' | 'downloading' | 'completed' | 'error'
  error?: string
  darkMode: boolean
  onDelete?: () => void
  onRetry?: () => void
}) {
  return (
    <div className={`flex items-center gap-fib-13 p-fib-13 rounded-fib-13 ${darkMode ? 'bg-ios-card-dark' : 'bg-ios-card'}`}>
      {/* Thumbnail */}
      <div className="w-fib-55 h-fib-55 rounded-fib-8 overflow-hidden flex-shrink-0">
        <img 
          src={`https://img.youtube.com/vi/${track.id}/hqdefault.jpg`} 
          alt=""
          className="w-full h-full object-cover scale-[1.35]"
        />
      </div>
      
      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className={`text-fib-13 font-medium truncate ${darkMode ? 'text-white' : 'text-black'}`}>
          {track.title}
        </p>
        <p className="text-fib-13 text-ios-gray truncate">
          {track.artists.map(a => a.name).join(', ')}
        </p>
        
        {/* Progress bar for downloading */}
        {status === 'downloading' && (
          <div className="mt-fib-5">
            <div className={`h-1 rounded-full overflow-hidden ${darkMode ? 'bg-white/10' : 'bg-black/10'}`}>
              <div 
                className="h-full bg-ios-blue rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}
        
        {/* Error message */}
        {status === 'error' && error && (
          <p className="text-fib-8 text-ios-red mt-fib-3 truncate">{error}</p>
        )}
      </div>
      
      {/* Status icon and actions */}
      <div className="flex items-center gap-fib-8 flex-shrink-0">
        {status === 'pending' && (
          <Clock size={20} className="text-ios-gray" />
        )}
        {status === 'downloading' && (
          <Loader2 size={20} className="text-ios-blue animate-spin" />
        )}
        {status === 'completed' && (
          <CheckCircle size={20} className="text-ios-green" />
        )}
        {status === 'error' && (
          <>
            <Tooltip text="Retry download">
              <button 
                onClick={onRetry}
                className={`p-fib-5 rounded-fib-8 ios-active ${darkMode ? 'hover:bg-white/10' : 'hover:bg-black/5'}`}
              >
                <RotateCcw size={18} className="text-ios-blue" />
              </button>
            </Tooltip>
            <Tooltip text="Remove">
              <button 
                onClick={onDelete}
                className={`p-fib-5 rounded-fib-8 ios-active ${darkMode ? 'hover:bg-white/10' : 'hover:bg-black/5'}`}
              >
                <Trash2 size={18} className="text-ios-red" />
              </button>
            </Tooltip>
          </>
        )}
      </div>
    </div>
  )
}


function DownloadedTrackRow({
  track,
  index,
  allTracks,
  darkMode,
  onDelete
}: {
  track: Song
  index: number
  allTracks: Song[]
  darkMode: boolean
  onDelete: () => void
}) {
  const { setQueue, currentTrack, isPlaying, togglePlay } = usePlayerStore()
  const [showDelete, setShowDelete] = useState(false)
  const isActive = currentTrack?.id === track.id

  const handleClick = () => {
    if (isActive) {
      togglePlay()
    } else {
      setQueue(allTracks, index)
    }
  }

  return (
    <div 
      className={`group flex items-center gap-fib-13 p-fib-8 rounded-fib-8 ios-active ios-transition cursor-pointer
        ${isActive ? (darkMode ? 'bg-ios-blue/20' : 'bg-ios-blue/10') : (darkMode ? 'hover:bg-white/5' : 'hover:bg-black/5')}`}
      onClick={handleClick}
      onMouseEnter={() => setShowDelete(true)}
      onMouseLeave={() => setShowDelete(false)}
    >
      {/* Index / Play indicator */}
      <div className="w-fib-21 text-center flex-shrink-0">
        {isActive && isPlaying ? (
          <div className="flex items-center justify-center gap-0.5">
            <span className="w-0.5 h-2 bg-ios-blue rounded-full animate-pulse" />
            <span className="w-0.5 h-3 bg-ios-blue rounded-full animate-pulse" style={{ animationDelay: '75ms' }} />
            <span className="w-0.5 h-2 bg-ios-blue rounded-full animate-pulse" style={{ animationDelay: '150ms' }} />
          </div>
        ) : (
          <span className={`text-fib-13 ${isActive ? 'text-ios-blue' : 'text-ios-gray'}`}>
            {index + 1}
          </span>
        )}
      </div>
      
      {/* Thumbnail */}
      <div className="w-fib-34 h-fib-34 rounded-fib-5 overflow-hidden flex-shrink-0">
        <img 
          src={`https://img.youtube.com/vi/${track.id}/hqdefault.jpg`} 
          alt=""
          className="w-full h-full object-cover scale-[1.35]"
        />
      </div>
      
      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className={`text-fib-13 font-medium truncate ${isActive ? 'text-ios-blue' : (darkMode ? 'text-white' : 'text-black')}`}>
          {track.title}
        </p>
        <p className="text-fib-13 text-ios-gray truncate">
          {track.artists.map(a => a.name).join(', ')}
        </p>
      </div>
      
      {/* Downloaded indicator */}
      <CheckCircle size={16} className="text-ios-green flex-shrink-0" />
      
      {/* Delete button */}
      {showDelete && (
        <Tooltip text="Remove from downloads">
          <button 
            onClick={(e) => {
              e.stopPropagation()
              onDelete()
            }}
            className={`p-fib-5 rounded-fib-8 ios-active ${darkMode ? 'hover:bg-white/10' : 'hover:bg-black/5'}`}
          >
            <Trash2 size={16} className="text-ios-red" />
          </button>
        </Tooltip>
      )}
      
      {/* Duration */}
      {track.duration && (
        <span className="text-fib-13 text-ios-gray flex-shrink-0">
          {track.duration}
        </span>
      )}
    </div>
  )
}
