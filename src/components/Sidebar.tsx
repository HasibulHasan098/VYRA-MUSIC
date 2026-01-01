import { Home, Compass, Library, Heart, Clock, Download, ChevronLeft, ChevronRight } from 'lucide-react'
import { useAppStore } from '../store/appStore'
import { usePlayerStore } from '../store/playerStore'
import Tooltip from './Tooltip'

const navItems = [
  { id: 'home', icon: Home, label: 'Home' },
  { id: 'explore', icon: Compass, label: 'Explore' },
  { id: 'library', icon: Library, label: 'Library' },
] as const

export default function Sidebar() {
  const { currentView, setView, setLibraryTab, darkMode, sidebarCollapsed, toggleSidebar, downloadedSongs, downloads } = useAppStore()
  const { likedSongs, recentlyPlayed } = usePlayerStore()

  // Check if there are active downloads
  const hasActiveDownloads = downloads.some(d => d.status === 'downloading' || d.status === 'pending')

  const libraryItems = [
    { id: 'liked' as const, icon: Heart, label: 'Liked Songs', count: likedSongs.length, hasNotification: false },
    { id: 'recent' as const, icon: Clock, label: 'Recently Played', count: recentlyPlayed.length, hasNotification: false },
    { id: 'downloads' as const, icon: Download, label: 'Downloads', count: downloadedSongs.length, hasNotification: hasActiveDownloads },
  ]

  return (
    <aside className={`flex flex-col border-r ios-transition relative
      ${sidebarCollapsed ? 'w-[72px]' : 'w-[220px]'}
      ${darkMode ? 'bg-ios-card-dark border-ios-separator-dark' : 'bg-ios-card border-ios-separator'}`}>
      
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
                onClick={() => setView(id)}
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
              onClick={() => setView(id)}
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

      {/* Library section */}
      <div className={`p-3 space-y-1 ${sidebarCollapsed ? 'flex flex-col items-center' : ''}`}>
        {!sidebarCollapsed && (
          <h3 className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-ios-gray">
            Your Library
          </h3>
        )}
        {libraryItems.map(({ id, icon: Icon, label, count, hasNotification }) => (
          sidebarCollapsed ? (
            <Tooltip key={id} text={`${label}${count > 0 ? ` (${count})` : ''}${hasNotification ? ' • Downloading' : ''}`} position="right">
              <button
                onClick={() => setLibraryTab(id)}
                className={`relative flex items-center justify-center rounded-xl ios-transition ios-active w-12 h-12
                  ${darkMode ? 'text-white hover:bg-white/10' : 'text-black hover:bg-black/5'}`}
              >
                <Icon size={20} className="text-ios-gray" />
                {hasNotification && (
                  <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-ios-blue rounded-full animate-pulse" />
                )}
              </button>
            </Tooltip>
          ) : (
            <button
              key={id}
              onClick={() => setLibraryTab(id)}
              className={`w-full flex items-center gap-3 rounded-xl ios-transition ios-active px-3 py-2.5
                ${darkMode ? 'text-white hover:bg-white/10' : 'text-black hover:bg-black/5'}`}
            >
              <div className="relative flex-shrink-0">
                <Icon size={20} className="text-ios-gray" />
                {hasNotification && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 bg-ios-blue rounded-full animate-pulse" />
                )}
              </div>
              <span className="text-sm">{label}</span>
              {count > 0 && (
                <span className="text-xs text-ios-gray ml-auto">{count}</span>
              )}
            </button>
          )
        ))}
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
