import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  Heart,
  ListPlus,
  ListMinus,
  Radio,
  Share2,
  Download,
  User,
  PlayCircle,
  ListEnd,
  Check,
  Loader2,
  ChevronRight,
  Plus,
} from 'lucide-react'
import { Song, usePlayerStore } from '../store/playerStore'
import { useAppStore } from '../store/appStore'

interface SongContextMenuProps {
  track: Song
  x: number
  y: number
  onClose: () => void
  playlistId?: string // If provided, show "Remove from playlist" option
}

export default function SongContextMenu({ track, x, y, onClose, playlistId }: SongContextMenuProps) {
  const { darkMode, openArtist, fetchRecommendations, downloadTrack, isDownloaded, downloads, userPlaylists, addToPlaylist, removeFromPlaylist, createPlaylist, isInPlaylist } = useAppStore()
  const { toggleLike, isLiked, addToQueue, queue } = usePlayerStore()
  const menuRef = useRef<HTMLDivElement>(null)
  const submenuRef = useRef<HTMLDivElement>(null)
  const playlistButtonRef = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState({ x, y })
  const [submenuPosition, setSubmenuPosition] = useState({ x: 0, y: 0 })
  const [showPlaylistSubmenu, setShowPlaylistSubmenu] = useState(false)
  const [showCreatePlaylist, setShowCreatePlaylist] = useState(false)
  const [newPlaylistName, setNewPlaylistName] = useState('')
  const trackIsLiked = isLiked(track.id)
  const trackIsDownloaded = isDownloaded(track.id)
  const downloadProgress = downloads.find(d => d.trackId === track.id)

  useEffect(() => {
    if (menuRef.current) {
      const rect = menuRef.current.getBoundingClientRect()
      let newX = x
      let newY = y
      if (x + rect.width > window.innerWidth - 10) newX = window.innerWidth - rect.width - 10
      if (y + rect.height > window.innerHeight - 10) newY = window.innerHeight - rect.height - 10
      setPosition({ x: newX, y: newY })
    }
  }, [x, y])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node
      const clickedInMenu = menuRef.current?.contains(target)
      const clickedInSubmenu = submenuRef.current?.contains(target)
      if (!clickedInMenu && !clickedInSubmenu) {
        onClose()
      }
    }
    const handleEscape = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [onClose])

  const handlePlaylistHover = () => {
    if (playlistButtonRef.current) {
      const rect = playlistButtonRef.current.getBoundingClientRect()
      let subX = rect.right + 4
      let subY = rect.top
      if (subX + 200 > window.innerWidth - 10) subX = rect.left - 204
      if (subY + 300 > window.innerHeight - 10) subY = window.innerHeight - 310
      setSubmenuPosition({ x: subX, y: subY })
    }
    setShowPlaylistSubmenu(true)
  }

  const menuItems = [
    { icon: Heart, label: trackIsLiked ? 'Remove from Liked Songs' : 'Add to Liked Songs', onClick: () => toggleLike(track), iconClass: trackIsLiked ? 'text-ios-red fill-ios-red' : '' },
    { type: 'divider' as const },
    { icon: PlayCircle, label: 'Play next', onClick: () => { const { queueIndex } = usePlayerStore.getState(); const newQueue = [...queue]; newQueue.splice(queueIndex + 1, 0, track); usePlayerStore.setState({ queue: newQueue }) } },
    { icon: ListEnd, label: 'Add to queue', onClick: () => addToQueue(track) },
    { icon: ListPlus, label: 'Add to playlist', hasSubmenu: true, onClick: () => {} },
    // Show "Remove from playlist" only when in a user playlist context
    ...(playlistId ? [{ icon: ListMinus, label: 'Remove from playlist', onClick: () => removeFromPlaylist(playlistId, track.id), iconClass: 'text-ios-red' }] : []),
    { type: 'divider' as const },
    { icon: Radio, label: 'Start radio', onClick: () => fetchRecommendations([track.id]) },
    { icon: trackIsDownloaded ? Check : downloadProgress?.status === 'downloading' ? Loader2 : Download, label: trackIsDownloaded ? 'Downloaded' : downloadProgress?.status === 'downloading' ? 'Downloading...' : 'Download', onClick: () => { if (!trackIsDownloaded && downloadProgress?.status !== 'downloading') downloadTrack(track) }, iconClass: trackIsDownloaded ? 'text-ios-green' : downloadProgress?.status === 'downloading' ? 'text-ios-blue animate-spin' : '', disabled: trackIsDownloaded || downloadProgress?.status === 'downloading' },
    { type: 'divider' as const },
    { icon: User, label: 'Go to artist', onClick: () => { if (track.artists[0]?.id) openArtist(track.artists[0].id) }, disabled: !track.artists[0]?.id },
    { type: 'divider' as const },
    { icon: Share2, label: 'Share', onClick: () => navigator.clipboard.writeText(`https://music.youtube.com/watch?v=${track.id}`) },
  ]

  return createPortal(
    <div className="fixed inset-0 z-[9999]" onClick={onClose}>
      <div 
        ref={menuRef} 
        className={`absolute rounded-fib-13 shadow-2xl overflow-visible backdrop-blur-xl border ${darkMode ? 'bg-ios-card-dark/95 border-white/10' : 'bg-white/95 border-black/10'}`} 
        style={{ left: position.x, top: position.y, minWidth: 220 }} 
        onClick={(e) => e.stopPropagation()}
      >
        <div className={`px-fib-13 py-fib-13 border-b ${darkMode ? 'border-white/10' : 'border-black/10'}`}>
          <div className="flex items-center gap-fib-8">
            <div className="w-fib-34 h-fib-34 rounded-fib-5 overflow-hidden flex-shrink-0">
              <img src={`https://img.youtube.com/vi/${track.id}/hqdefault.jpg`} alt="" className="w-full h-full object-cover scale-[1.35]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-fib-13 font-medium truncate ${darkMode ? 'text-white' : 'text-black'}`}>{track.title}</p>
              <p className="text-fib-8 text-ios-gray truncate">{track.artists.map(a => a.name).join(', ')}</p>
            </div>
          </div>
        </div>
        <div className="py-fib-5">
          {menuItems.map((item, idx) => {
            if (item.type === 'divider') return <div key={`divider-${idx}`} className={`my-fib-5 mx-fib-8 h-px ${darkMode ? 'bg-white/10' : 'bg-black/10'}`} />
            const Icon = item.icon
            
            if (item.hasSubmenu) {
              return (
                <div 
                  key={item.label}
                  ref={playlistButtonRef}
                  className={`w-full flex items-center gap-fib-13 px-fib-13 py-fib-8 cursor-pointer ${darkMode ? 'hover:bg-white/10' : 'hover:bg-black/5'}`}
                  onMouseEnter={handlePlaylistHover}
                >
                  <Icon size={18} className="text-ios-gray" />
                  <span className={`flex-1 text-left text-fib-13 ${darkMode ? 'text-white' : 'text-black'}`}>{item.label}</span>
                  <ChevronRight size={16} className="text-ios-gray" />
                </div>
              )
            }
            
            return (
              <div key={item.label} onMouseEnter={() => setShowPlaylistSubmenu(false)}>
                <button 
                  className={`w-full flex items-center gap-fib-13 px-fib-13 py-fib-8 ios-active ${item.disabled ? 'opacity-40 cursor-not-allowed' : darkMode ? 'hover:bg-white/10' : 'hover:bg-black/5'}`} 
                  onClick={() => { if (!item.disabled) { item.onClick(); onClose() } }} 
                  disabled={item.disabled}
                >
                  <Icon size={18} className={item.iconClass || 'text-ios-gray'} />
                  <span className={`flex-1 text-left text-fib-13 ${darkMode ? 'text-white' : 'text-black'}`}>{item.label}</span>
                </button>
              </div>
            )
          })}
        </div>
      </div>
      
      {showPlaylistSubmenu && (
        <div 
          ref={submenuRef}
          className={`fixed rounded-fib-13 shadow-2xl overflow-hidden backdrop-blur-xl border min-w-[200px] max-h-[300px] overflow-y-auto z-[10000] ${darkMode ? 'bg-ios-card-dark/95 border-white/10' : 'bg-white/95 border-black/10'}`} 
          style={{ left: submenuPosition.x, top: submenuPosition.y }} 
          onClick={(e) => e.stopPropagation()}
          onMouseLeave={() => setShowPlaylistSubmenu(false)}
        >
          {showCreatePlaylist ? (
            <div className="p-fib-13">
              <input 
                type="text" 
                placeholder="Playlist name" 
                value={newPlaylistName} 
                onChange={(e) => setNewPlaylistName(e.target.value)} 
                autoFocus 
                className={`w-full px-fib-8 py-fib-5 rounded-fib-8 text-fib-13 outline-none mb-fib-8 ${darkMode ? 'bg-ios-card-secondary-dark text-white placeholder-ios-gray' : 'bg-ios-card-secondary text-black placeholder-ios-gray'}`} 
                onKeyDown={(e) => { 
                  if (e.key === 'Enter' && newPlaylistName.trim()) { 
                    const id = createPlaylist(newPlaylistName.trim())
                    addToPlaylist(id, track)
                    onClose() 
                  } 
                  if (e.key === 'Escape') { 
                    setShowCreatePlaylist(false)
                    setNewPlaylistName('') 
                  } 
                }} 
              />
              <div className="flex gap-fib-5">
                <button 
                  onClick={() => { setShowCreatePlaylist(false); setNewPlaylistName('') }} 
                  className={`flex-1 py-fib-5 rounded-fib-8 text-fib-8 ios-active ${darkMode ? 'bg-ios-card-secondary-dark text-white' : 'bg-ios-card-secondary text-black'}`}
                >
                  Cancel
                </button>
                <button 
                  onClick={() => { 
                    if (newPlaylistName.trim()) { 
                      const id = createPlaylist(newPlaylistName.trim())
                      addToPlaylist(id, track)
                      onClose() 
                    } 
                  }} 
                  disabled={!newPlaylistName.trim()} 
                  className="flex-1 py-fib-5 rounded-fib-8 text-fib-8 bg-ios-blue text-white ios-active disabled:opacity-50"
                >
                  Create
                </button>
              </div>
            </div>
          ) : (
            <div className="py-fib-5">
              <button 
                className={`w-full flex items-center gap-fib-8 px-fib-13 py-fib-8 ios-active ${darkMode ? 'hover:bg-white/10' : 'hover:bg-black/5'}`} 
                onClick={() => setShowCreatePlaylist(true)}
              >
                <Plus size={16} className="text-ios-blue" />
                <span className={`text-fib-13 ${darkMode ? 'text-white' : 'text-black'}`}>New Playlist</span>
              </button>
              
              {userPlaylists.length > 0 && <div className={`my-fib-5 mx-fib-8 h-px ${darkMode ? 'bg-white/10' : 'bg-black/10'}`} />}
              
              {userPlaylists.map((playlist) => {
                const alreadyIn = isInPlaylist(playlist.id, track.id)
                return (
                  <button 
                    key={playlist.id} 
                    className={`w-full flex items-center gap-fib-8 px-fib-13 py-fib-8 ios-active ${alreadyIn ? 'opacity-50 cursor-not-allowed' : darkMode ? 'hover:bg-white/10' : 'hover:bg-black/5'}`} 
                    onClick={() => { 
                      if (!alreadyIn) { 
                        addToPlaylist(playlist.id, track)
                        onClose() 
                      } 
                    }} 
                    disabled={alreadyIn}
                  >
                    {alreadyIn ? <Check size={16} className="text-ios-green" /> : <ListPlus size={16} className="text-ios-gray" />}
                    <span className={`text-fib-13 truncate ${darkMode ? 'text-white' : 'text-black'}`}>{playlist.name}</span>
                  </button>
                )
              })}
              
              {userPlaylists.length === 0 && <p className="px-fib-13 py-fib-5 text-fib-8 text-ios-gray">No playlists yet</p>}
            </div>
          )}
        </div>
      )}
    </div>,
    document.body
  )
}

export function useSongContextMenu() {
  const [contextMenu, setContextMenu] = useState<{ track: Song; x: number; y: number; playlistId?: string } | null>(null)
  const openContextMenu = (track: Song, x: number, y: number, playlistId?: string) => setContextMenu({ track, x, y, playlistId })
  const closeContextMenu = () => setContextMenu(null)
  return { contextMenu, openContextMenu, closeContextMenu }
}
