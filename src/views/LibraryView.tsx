import { useState } from 'react'
import { Plus, Heart, Clock, Download, Music, CheckCircle, Loader2, Trash2, RotateCcw, X, Play, Users, MoreHorizontal, Pencil } from 'lucide-react'
import { useAppStore } from '../store/appStore'
import { usePlayerStore, Song } from '../store/playerStore'
import TrackRow from '../components/TrackRow'
import Tooltip from '../components/Tooltip'
import ArtistAvatar from '../components/ArtistAvatar'
import { fetchSpotifyData, matchSpotifyTrack } from '../api/spotify'
import { youtube } from '../api/youtube'

type LibraryTab = 'recent' | 'liked' | 'artists' | 'playlists' | 'downloads'

export default function LibraryView() {
  const { darkMode, libraryTab, setLibraryTab, downloads, downloadedSongs, removeDownload, removeDownloadedSong, downloadTrack, userPlaylists, createPlaylist, deletePlaylist, renamePlaylist, openUserPlaylist, followedArtists, unfollowArtist, openArtist, addToPlaylist } = useAppStore()
  const { recentlyPlayed, likedSongs, setQueue } = usePlayerStore()
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newPlaylistName, setNewPlaylistName] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null)
  
  // Spotify import state
  const [showSpotifyImport, setShowSpotifyImport] = useState(false)
  const [spotifyUrl, setSpotifyUrl] = useState('')
  const [spotifyImporting, setSpotifyImporting] = useState(false)
  const [spotifyProgress, setSpotifyProgress] = useState({ stage: '', current: 0, total: 0 })
  const [spotifyError, setSpotifyError] = useState<string | null>(null)
  
  // YouTube Music import state
  const [showYTImport, setShowYTImport] = useState(false)
  const [ytUrl, setYtUrl] = useState('')
  const [ytImporting, setYtImporting] = useState(false)
  const [ytProgress, setYtProgress] = useState({ stage: '', current: 0, total: 0 })
  const [ytError, setYtError] = useState<string | null>(null)
  
  // Playlist context menu state
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; playlistId: string; playlistName: string } | null>(null)
  const [renameModal, setRenameModal] = useState<{ id: string; name: string } | null>(null)
  const [renameValue, setRenameValue] = useState('')

  // Handle Spotify import
  const handleSpotifyImport = async () => {
    if (!spotifyUrl.trim()) return
    
    setSpotifyImporting(true)
    setSpotifyError(null)
    setSpotifyProgress({ stage: 'Connecting...', current: 0, total: 100 })
    
    try {
      const data = await fetchSpotifyData(spotifyUrl, (stage, progress) => {
        setSpotifyProgress({ stage, current: progress, total: 100 })
      })
      
      setSpotifyProgress({ stage: 'Matching songs...', current: 0, total: data.tracks.length })
      
      // Create playlist
      const playlistName = `${data.name} (Spotify)`
      const playlistId = createPlaylist(playlistName)
      
      // Match and add tracks
      const searchFn = async (query: string) => {
        const results = await youtube.searchAll(query)
        return results.songs
      }
      
      for (let i = 0; i < data.tracks.length; i++) {
        const track = data.tracks[i]
        setSpotifyProgress({ 
          stage: `Matching: ${track.name.substring(0, 25)}${track.name.length > 25 ? '...' : ''}`, 
          current: i + 1, 
          total: data.tracks.length 
        })
        
        const matched = await matchSpotifyTrack(track, searchFn)
        if (matched) {
          addToPlaylist(playlistId, matched)
        }
        
        if (i < data.tracks.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 150))
        }
      }
      
      // Done
      setShowSpotifyImport(false)
      setSpotifyUrl('')
      setSpotifyImporting(false)
    } catch (error) {
      setSpotifyError(error instanceof Error ? error.message : 'Import failed')
      setSpotifyImporting(false)
    }
  }

  // Handle YouTube Music import
  const handleYTImport = async () => {
    if (!ytUrl.trim()) return
    
    setYtImporting(true)
    setYtError(null)
    setYtProgress({ stage: 'Fetching playlist...', current: 0, total: 100 })
    
    try {
      // Extract playlist ID from URL
      const playlistIdMatch = ytUrl.match(/[?&]list=([^&]+)/) || ytUrl.match(/playlist\/([^?&]+)/)
      if (!playlistIdMatch) {
        throw new Error('Invalid YouTube Music URL. Please use a playlist link.')
      }
      
      const playlistId = playlistIdMatch[1]
      setYtProgress({ stage: 'Loading playlist...', current: 30, total: 100 })
      
      const playlist = await youtube.getPlaylist(playlistId)
      if (!playlist || playlist.songs.length === 0) {
        throw new Error('Playlist not found or empty')
      }
      
      setYtProgress({ stage: 'Creating playlist...', current: 50, total: 100 })
      
      // Create local playlist
      const newPlaylistName = `${playlist.title} (YT Music)`
      const newPlaylistId = createPlaylist(newPlaylistName)
      
      // Add songs
      for (let i = 0; i < playlist.songs.length; i++) {
        const song = playlist.songs[i]
        setYtProgress({ 
          stage: `Adding: ${song.title.substring(0, 25)}${song.title.length > 25 ? '...' : ''}`, 
          current: i + 1, 
          total: playlist.songs.length 
        })
        addToPlaylist(newPlaylistId, song)
      }
      
      // Done
      setShowYTImport(false)
      setYtUrl('')
      setYtImporting(false)
    } catch (error) {
      setYtError(error instanceof Error ? error.message : 'Import failed')
      setYtImporting(false)
    }
  }

  // Handle playlist context menu
  const handlePlaylistContextMenu = (e: React.MouseEvent, playlistId: string, playlistName: string) => {
    e.preventDefault()
    e.stopPropagation()
    setContextMenu({ x: e.clientX, y: e.clientY, playlistId, playlistName })
  }

  // Close context menu on click outside
  const closeContextMenu = () => setContextMenu(null)

  const tabs: { id: LibraryTab; label: string; icon: typeof Heart }[] = [
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
          {/* Create playlist and Import buttons */}
          <div className="flex gap-fib-8 flex-wrap">
            <button 
              onClick={() => setShowCreateModal(true)}
              className={`flex-1 min-w-[200px] flex items-center gap-fib-13 p-fib-13 rounded-fib-13 border-2 border-dashed ios-active ios-transition
                ${darkMode ? 'border-ios-gray hover:border-ios-blue' : 'border-ios-gray-3 hover:border-ios-blue'}`}
            >
              <div className={`w-fib-34 h-fib-34 rounded-fib-8 flex items-center justify-center
                ${darkMode ? 'bg-ios-card-secondary-dark' : 'bg-ios-card-secondary'}`}>
                <Plus size={18} className="text-ios-gray" />
              </div>
              <div className="text-left">
                <p className={`text-fib-13 font-medium ${darkMode ? 'text-white' : 'text-black'}`}>
                  Create Playlist
                </p>
              </div>
            </button>
            
            <div className="flex gap-fib-5">
              <button 
                onClick={() => {
                  setSpotifyUrl('')
                  setSpotifyError(null)
                  setShowSpotifyImport(true)
                }}
                className="flex items-center gap-fib-5 px-fib-13 py-fib-8 rounded-fib-13 bg-[#1DB954] text-white ios-active ios-transition"
              >
                <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
                  <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
                </svg>
              </button>
              
              <button 
                onClick={() => {
                  setYtUrl('')
                  setYtError(null)
                  setShowYTImport(true)
                }}
                className="flex items-center gap-fib-5 px-fib-13 py-fib-8 rounded-fib-13 bg-[#FF0000] text-white ios-active ios-transition"
              >
                <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                </svg>
              </button>
            </div>
          </div>

          {/* User playlists */}
          {userPlaylists.length > 0 ? (
            <div className="space-y-fib-8">
              {userPlaylists.map((playlist) => (
                <div 
                  key={playlist.id}
                  onClick={() => openUserPlaylist(playlist.id)}
                  onContextMenu={(e) => handlePlaylistContextMenu(e, playlist.id, playlist.name)}
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
                  
                  {/* More options button */}
                  <Tooltip text="More options">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation()
                        handlePlaylistContextMenu(e, playlist.id, playlist.name)
                      }}
                      className={`p-fib-5 rounded-fib-8 ios-active ${darkMode ? 'hover:bg-white/10' : 'hover:bg-black/5'}`}
                    >
                      <MoreHorizontal size={16} className="text-ios-gray" />
                    </button>
                  </Tooltip>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState 
              icon={Music}
              title="No playlists yet"
              description="Create a playlist or import from Spotify"
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

      {/* Spotify Import Modal */}
      {showSpotifyImport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => !spotifyImporting && setShowSpotifyImport(false)}>
          <div 
            className={`w-full max-w-sm mx-4 rounded-fib-21 p-fib-21 shadow-ios-lg
              ${darkMode ? 'bg-ios-card-dark' : 'bg-ios-card'}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-fib-13">
              <div className="flex items-center gap-fib-8">
                <div className="w-8 h-8 rounded-full bg-[#1DB954] flex items-center justify-center">
                  <svg viewBox="0 0 24 24" className="w-4 h-4 fill-white">
                    <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
                  </svg>
                </div>
                <h2 className={`text-fib-21 font-bold ${darkMode ? 'text-white' : 'text-black'}`}>
                  Import from Spotify
                </h2>
              </div>
              {!spotifyImporting && (
                <button onClick={() => setShowSpotifyImport(false)} className="p-fib-5 ios-active">
                  <X size={21} className="text-ios-gray" />
                </button>
              )}
            </div>
            
            {!spotifyImporting ? (
              <>
                <input
                  type="text"
                  placeholder="Paste Spotify playlist URL..."
                  value={spotifyUrl}
                  onChange={(e) => setSpotifyUrl(e.target.value)}
                  autoFocus
                  className={`w-full px-fib-13 py-fib-13 rounded-fib-13 text-fib-13 outline-none mb-fib-8
                    ${darkMode 
                      ? 'bg-ios-card-secondary-dark text-white placeholder-ios-gray' 
                      : 'bg-ios-card-secondary text-black placeholder-ios-gray'}`}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && spotifyUrl.trim()) {
                      handleSpotifyImport()
                    }
                  }}
                />
                
                {spotifyError && (
                  <p className="text-fib-13 text-ios-red mb-fib-8">{spotifyError}</p>
                )}
                
                <p className="text-fib-8 text-ios-gray mb-fib-13">
                  Supports public playlists and albums
                </p>
                
                <div className="flex gap-fib-8">
                  <button 
                    onClick={() => setShowSpotifyImport(false)}
                    className={`flex-1 py-fib-13 rounded-fib-13 text-fib-13 font-medium ios-active
                      ${darkMode ? 'bg-ios-card-secondary-dark text-white' : 'bg-ios-card-secondary text-black'}`}
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleSpotifyImport}
                    disabled={!spotifyUrl.trim()}
                    className="flex-1 py-fib-13 rounded-fib-13 text-fib-13 font-medium bg-[#1DB954] text-white ios-active disabled:opacity-50"
                  >
                    Import
                  </button>
                </div>
              </>
            ) : (
              <div className="py-fib-13">
                <p className={`text-fib-13 font-medium mb-fib-8 ${darkMode ? 'text-white' : 'text-black'}`}>
                  {spotifyProgress.stage}
                </p>
                <div className="w-full h-2 rounded-full bg-ios-gray/20 overflow-hidden mb-fib-8">
                  <div 
                    className="h-full bg-[#1DB954] transition-all duration-300"
                    style={{ width: `${(spotifyProgress.current / spotifyProgress.total) * 100}%` }}
                  />
                </div>
                <p className="text-fib-8 text-ios-gray text-center">
                  {spotifyProgress.current} / {spotifyProgress.total}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* YouTube Music Import Modal */}
      {showYTImport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => !ytImporting && setShowYTImport(false)}>
          <div 
            className={`w-full max-w-sm mx-4 rounded-fib-21 p-fib-21 shadow-ios-lg
              ${darkMode ? 'bg-ios-card-dark' : 'bg-ios-card'}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-fib-13">
              <div className="flex items-center gap-fib-8">
                <div className="w-8 h-8 rounded-full bg-[#FF0000] flex items-center justify-center">
                  <svg viewBox="0 0 24 24" className="w-4 h-4 fill-white">
                    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                  </svg>
                </div>
                <h2 className={`text-fib-21 font-bold ${darkMode ? 'text-white' : 'text-black'}`}>
                  Import from YT Music
                </h2>
              </div>
              {!ytImporting && (
                <button onClick={() => setShowYTImport(false)} className="p-fib-5 ios-active">
                  <X size={21} className="text-ios-gray" />
                </button>
              )}
            </div>
            
            {!ytImporting ? (
              <>
                <input
                  type="text"
                  placeholder="Paste YouTube Music playlist URL..."
                  value={ytUrl}
                  onChange={(e) => setYtUrl(e.target.value)}
                  autoFocus
                  className={`w-full px-fib-13 py-fib-13 rounded-fib-13 text-fib-13 outline-none mb-fib-8
                    ${darkMode 
                      ? 'bg-ios-card-secondary-dark text-white placeholder-ios-gray' 
                      : 'bg-ios-card-secondary text-black placeholder-ios-gray'}`}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && ytUrl.trim()) {
                      handleYTImport()
                    }
                  }}
                />
                
                {ytError && (
                  <p className="text-fib-13 text-ios-red mb-fib-8">{ytError}</p>
                )}
                
                <p className="text-fib-8 text-ios-gray mb-fib-13">
                  Supports public YouTube Music playlists
                </p>
                
                <div className="flex gap-fib-8">
                  <button 
                    onClick={() => setShowYTImport(false)}
                    className={`flex-1 py-fib-13 rounded-fib-13 text-fib-13 font-medium ios-active
                      ${darkMode ? 'bg-ios-card-secondary-dark text-white' : 'bg-ios-card-secondary text-black'}`}
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleYTImport}
                    disabled={!ytUrl.trim()}
                    className="flex-1 py-fib-13 rounded-fib-13 text-fib-13 font-medium bg-[#FF0000] text-white ios-active disabled:opacity-50"
                  >
                    Import
                  </button>
                </div>
              </>
            ) : (
              <div className="py-fib-13">
                <p className={`text-fib-13 font-medium mb-fib-8 ${darkMode ? 'text-white' : 'text-black'}`}>
                  {ytProgress.stage}
                </p>
                <div className="w-full h-2 rounded-full bg-ios-gray/20 overflow-hidden mb-fib-8">
                  <div 
                    className="h-full bg-[#FF0000] transition-all duration-300"
                    style={{ width: `${(ytProgress.current / ytProgress.total) * 100}%` }}
                  />
                </div>
                <p className="text-fib-8 text-ios-gray text-center">
                  {ytProgress.current} / {ytProgress.total}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Playlist Context Menu */}
      {contextMenu && (
        <div className="fixed inset-0 z-50" onClick={closeContextMenu}>
          <div 
            className={`absolute rounded-fib-13 shadow-ios-lg overflow-hidden min-w-[160px]
              ${darkMode ? 'bg-ios-card-dark' : 'bg-white'}`}
            style={{ 
              left: Math.min(contextMenu.x, window.innerWidth - 180), 
              top: Math.min(contextMenu.y, window.innerHeight - 120) 
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => {
                setRenameValue(contextMenu.playlistName)
                setRenameModal({ id: contextMenu.playlistId, name: contextMenu.playlistName })
                closeContextMenu()
              }}
              className={`w-full flex items-center gap-fib-8 px-fib-13 py-fib-13 text-left ios-active
                ${darkMode ? 'hover:bg-white/10 text-white' : 'hover:bg-black/5 text-black'}`}
            >
              <Pencil size={16} className="text-ios-gray" />
              <span className="text-fib-13">Rename</span>
            </button>
            <button
              onClick={() => {
                setDeleteConfirm({ id: contextMenu.playlistId, name: contextMenu.playlistName })
                closeContextMenu()
              }}
              className={`w-full flex items-center gap-fib-8 px-fib-13 py-fib-13 text-left ios-active
                ${darkMode ? 'hover:bg-white/10' : 'hover:bg-black/5'}`}
            >
              <Trash2 size={16} className="text-ios-red" />
              <span className="text-fib-13 text-ios-red">Delete</span>
            </button>
          </div>
        </div>
      )}

      {/* Rename Playlist Modal */}
      {renameModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setRenameModal(null)}>
          <div 
            className={`w-full max-w-sm mx-4 rounded-fib-21 p-fib-21 shadow-ios-lg
              ${darkMode ? 'bg-ios-card-dark' : 'bg-ios-card'}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-fib-13">
              <h2 className={`text-fib-21 font-bold ${darkMode ? 'text-white' : 'text-black'}`}>
                Rename Playlist
              </h2>
              <button onClick={() => setRenameModal(null)} className="p-fib-5 ios-active">
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
                  renamePlaylist(renameModal.id, renameValue.trim())
                  setRenameModal(null)
                }
              }}
            />
            
            <div className="flex gap-fib-8">
              <button 
                onClick={() => setRenameModal(null)}
                className={`flex-1 py-fib-13 rounded-fib-13 text-fib-13 font-medium ios-active
                  ${darkMode ? 'bg-ios-card-secondary-dark text-white' : 'bg-ios-card-secondary text-black'}`}
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  if (renameValue.trim()) {
                    renamePlaylist(renameModal.id, renameValue.trim())
                    setRenameModal(null)
                  }
                }}
                disabled={!renameValue.trim()}
                className="flex-1 py-fib-13 rounded-fib-13 text-fib-13 font-medium bg-ios-blue text-white ios-active disabled:opacity-50"
              >
                Rename
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
