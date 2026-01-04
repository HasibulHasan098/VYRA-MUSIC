import { Home, Compass, Library, ChevronLeft, ChevronRight, Music, Users } from 'lucide-react'
import { useAppStore } from '../store/appStore'
import { usePlayerStore, Song } from '../store/playerStore'
import Tooltip from './Tooltip'

const navItems = [
  { id: 'home', icon: Home, label: 'Home' },
  { id: 'explore', icon: Compass, label: 'Explore' },
  { id: 'library', icon: Library, label: 'Library' },
] as const

// Component to show 3 song thumbnails stacked
function SongThumbnails({ songs, darkMode, collapsed = false }: { songs: Song[]; darkMode: boolean; collapsed?: boolean }) {
  const displaySongs = songs.slice(0, 3)
  const size = collapsed ? 8 : 10
  const imgSize = collapsed ? 6 : 8
  
  if (displaySongs.length === 0) {
    return (
      <div className={`rounded-lg flex items-center justify-center ${darkMode ? 'bg-white/10' : 'bg-black/5'}`}
        style={{ width: size * 4, height: size * 4 }}>
        <Music size={collapsed ? 14 : 18} className="text-ios-gray" />
      </div>
    )
  }

  return (
    <div className="relative flex-shrink-0" style={{ width: size * 4, height: size * 4 }}>
      {displaySongs.map((song, idx) => (
        <img
          key={song.id}
          src={`https://img.youtube.com/vi/${song.id}/default.jpg`}
          alt=""
          className="absolute rounded object-cover border-2"
          style={{
            width: imgSize * 4,
            height: imgSize * 4,
            left: idx * (collapsed ? 3 : 4),
            top: idx * (collapsed ? 1.5 : 2),
            zIndex: 3 - idx,
            borderColor: darkMode ? '#1c1c1e' : '#f2f2f7'
          }}
        />
      ))}
    </div>
  )
}

export default function Sidebar() {
  const { currentView, setView, setLibraryTab, darkMode, sidebarCollapsed, toggleSidebar, downloadedSongs, downloads, followedArtists, openArtist } = useAppStore()
  const { likedSongs, recentlyPlayed } = usePlayerStore()

  // Check if there are active downloads
  const hasActiveDownloads = downloads.some(d => d.status === 'downloading' || d.status === 'pending')

  const songLibraryItems = [
    { id: 'liked' as const, label: 'Liked Songs', count: likedSongs.length, hasNotification: false, songs: likedSongs },
    { id: 'recent' as const, label: 'Recently Played', count: recentlyPlayed.length, hasNotification: false, songs: recentlyPlayed },
    { id: 'downloads' as const, label: 'Downloads', count: downloadedSongs.length, hasNotification: hasActiveDownloads, songs: downloadedSongs },
  ]

  const handleNavClick = (id: typeof navItems[number]['id']) => {
    setView(id)
  }

  const handleLibraryClick = (id: 'liked' | 'recent' | 'downloads' | 'artists') => {
    setLibraryTab(id)
  }

  return (
    <aside className={`flex flex-col border-r ios-transition relative
      ${sidebarCollapsed ? 'w-[72px]' : 'w-[220px]'}
      ${darkMode ? 'bg-transparent border-ios-separator-dark' : 'bg-transparent border-ios-separator'}`}>
      
      {/* Collapse button */}
      <Tooltip text={sidebarCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'} position="right">
        <button
          onClick={toggleSidebar}
          className={`absolute -right-3 top-5 w-6 h-6 rounded-full flex items-center justify-center shadow-ios ios-active z-10
            ${darkMode ? 'bg-ios-card-secondary-dark text-white' : 'bg-ios-card text-black'}`}
        >
          {sidebarCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </Tooltip>

      {/* Main navigation */}
      <nav className={`p-3 space-y-1 ${sidebarCollapsed ? 'flex flex-col items-center' : ''}`}>
        {navItems.map(({ id, icon: Icon, label }) => (
          sidebarCollapsed ? (
            <Tooltip key={id} text={label} position="right">
              <button
                onClick={() => handleNavClick(id)}
                className={`flex items-center justify-center rounded-xl ios-transition ios-active w-12 h-12
                  ${currentView === id 
                    ? 'bg-ios-blue text-white' 
                    : darkMode 
                      ? 'text-white hover:bg-white/10' 
                      : 'text-black hover:bg-black/5'}`}
              >
                <Icon size={22} />
              </button>
            </Tooltip>
          ) : (
            <button
              key={id}
              onClick={() => handleNavClick(id)}
              className={`w-full flex items-center gap-3 rounded-xl ios-transition ios-active px-3 py-2.5
                ${currentView === id 
                  ? 'bg-ios-blue text-white' 
                  : darkMode 
                    ? 'text-white hover:bg-white/10' 
                    : 'text-black hover:bg-black/5'}`}
            >
              <Icon size={20} className="flex-shrink-0" />
              <span className="text-sm font-medium">{label}</span>
            </button>
          )
        ))}
      </nav>

      {/* Divider */}
      <div className={`mx-3 h-px ${darkMode ? 'bg-ios-separator-dark' : 'bg-ios-separator'}`} />

      {/* Library section - Songs */}
      <div className={`p-3 space-y-1 ${sidebarCollapsed ? 'flex flex-col items-center' : ''}`}>
        {!sidebarCollapsed && (
          <h3 className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-ios-gray">
            Your Library
          </h3>
        )}
        {songLibraryItems.map((item) => (
          sidebarCollapsed ? (
            <Tooltip key={item.id} text={`${item.label}${item.count > 0 ? ` (${item.count})` : ''}${item.hasNotification ? ' • Downloading' : ''}`} position="right">
              <button
                onClick={() => handleLibraryClick(item.id)}
                className={`relative flex items-center justify-center rounded-xl ios-transition ios-active p-1.5
                  ${darkMode ? 'text-white hover:bg-white/10' : 'text-black hover:bg-black/5'}`}
              >
                <SongThumbnails songs={item.songs || []} darkMode={darkMode} collapsed />
                {item.hasNotification && (
                  <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-ios-blue rounded-full animate-pulse" />
                )}
              </button>
            </Tooltip>
          ) : (
            <button
              key={item.id}
              onClick={() => handleLibraryClick(item.id)}
              className={`w-full flex items-center gap-3 rounded-xl ios-transition ios-active px-3 py-2
                ${darkMode ? 'text-white hover:bg-white/10' : 'text-black hover:bg-black/5'}`}
            >
              <SongThumbnails songs={item.songs || []} darkMode={darkMode} />
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="text-sm font-medium truncate">{item.label}</span>
                {item.hasNotification && (
                  <span className="w-2 h-2 bg-ios-blue rounded-full animate-pulse flex-shrink-0" />
                )}
              </div>
            </button>
          )
        ))}
      </div>

      {/* Divider between songs and artists */}
      <div className={`mx-3 h-px ${darkMode ? 'bg-ios-separator-dark' : 'bg-ios-separator'}`} />

      {/* Library section - Artists */}
      <div className={`p-3 ${sidebarCollapsed ? 'flex flex-col items-center space-y-2' : ''}`}>
        {sidebarCollapsed ? (
          // Collapsed: show artists vertically
          followedArtists.length > 0 ? (
            <>
              {followedArtists.slice(0, 3).map((artist) => (
                <Tooltip key={artist.id} text={artist.name} position="right">
                  <button
                    onClick={() => openArtist(artist.id)}
                    className={`flex items-center justify-center rounded-full ios-transition ios-active
                      ${darkMode ? 'hover:bg-white/10' : 'hover:bg-black/5'}`}
                  >
                    {artist.thumbnail ? (
                      <img 
                        src={artist.thumbnail} 
                        alt={artist.name}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${darkMode ? 'bg-white/10' : 'bg-black/5'}`}>
                        <span className="text-sm font-medium">{artist.name.charAt(0).toUpperCase()}</span>
                      </div>
                    )}
                  </button>
                </Tooltip>
              ))}
              {/* See all button - always show if there are artists */}
              <Tooltip text={`See all artists (${followedArtists.length})`} position="right">
                <button
                  onClick={() => handleLibraryClick('artists')}
                  className={`w-10 h-10 rounded-full flex items-center justify-center ios-active
                    ${darkMode ? 'bg-white/10 hover:bg-white/20' : 'bg-black/5 hover:bg-black/10'}`}
                >
                  <span className="text-ios-gray text-lg leading-none">···</span>
                </button>
              </Tooltip>
            </>
          ) : (
            <Tooltip text="Artists (0)" position="right">
              <button
                onClick={() => handleLibraryClick('artists')}
                className={`flex items-center justify-center rounded-full ios-transition ios-active p-1.5
                  ${darkMode ? 'text-white hover:bg-white/10' : 'text-black hover:bg-black/5'}`}
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${darkMode ? 'bg-white/10' : 'bg-black/5'}`}>
                  <Users size={18} className="text-ios-gray" />
                </div>
              </button>
            </Tooltip>
          )
        ) : (
          <div>
            {/* Artists label */}
            <h3 className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-ios-gray">
              Artists
            </h3>
            {/* 3 artists vertically */}
            {followedArtists.length > 0 ? (
              <>
                {followedArtists.slice(0, 3).map((artist) => (
                  <button
                    key={artist.id}
                    onClick={() => openArtist(artist.id)}
                    className={`w-full flex items-center gap-2.5 rounded-lg ios-transition ios-active px-3 py-1.5
                      ${darkMode ? 'text-white hover:bg-white/10' : 'text-black hover:bg-black/5'}`}
                  >
                    {artist.thumbnail ? (
                      <img 
                        src={artist.thumbnail} 
                        alt={artist.name}
                        className="w-7 h-7 rounded-full object-cover flex-shrink-0"
                      />
                    ) : (
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${darkMode ? 'bg-white/10' : 'bg-black/5'}`}>
                        <span className="text-xs font-medium">{artist.name.charAt(0).toUpperCase()}</span>
                      </div>
                    )}
                    <span className="text-sm truncate">{artist.name}</span>
                  </button>
                ))}
                {/* See all button - always show */}
                <button
                  onClick={() => handleLibraryClick('artists')}
                  className="w-full text-xs text-ios-blue ios-active hover:underline px-3 py-1 text-left"
                >
                  See all ({followedArtists.length})
                </button>
              </>
            ) : (
              <button
                onClick={() => handleLibraryClick('artists')}
                className={`w-full flex items-center gap-3 rounded-xl ios-transition ios-active px-3 py-2.5
                  ${darkMode ? 'text-white hover:bg-white/10' : 'text-black hover:bg-black/5'}`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${darkMode ? 'bg-white/10' : 'bg-black/5'}`}>
                  <Users size={16} className="text-ios-gray" />
                </div>
                <span className="text-sm text-ios-gray">No artists followed</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* App info */}
      {!sidebarCollapsed && (
        <div className="p-3">
          <div className={`p-3 rounded-xl ${darkMode ? 'bg-ios-card-secondary-dark' : 'bg-ios-card-secondary'}`}>
            <p className={`text-xs font-semibold ${darkMode ? 'text-white' : 'text-black'}`}>
              VYRA
            </p>
            <p className="text-xs text-ios-gray">
              FASTHAND
            </p>
          </div>
        </div>
      )}
    </aside>
  )
}
