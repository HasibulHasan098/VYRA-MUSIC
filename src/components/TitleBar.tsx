import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Search, Settings, X, Minus, Square, Download, FileText, ArrowDownCircle, Loader2, Clock } from 'lucide-react'
import { useAppStore } from '../store/appStore'
import { usePlayerStore } from '../store/playerStore'
import { isUpdateAvailable, ReleaseInfo, downloadAndInstallUpdate, openReleasesPage } from '../api/updater'
import Tooltip from './Tooltip'

// Tauri window controls
const isTauri = () => typeof window !== 'undefined' && '__TAURI__' in window

async function minimizeWindow() {
  if (isTauri()) {
    const { getCurrentWindow } = await import('@tauri-apps/api/window')
    await getCurrentWindow().minimize()
  }
}

async function maximizeWindow() {
  if (isTauri()) {
    const { getCurrentWindow } = await import('@tauri-apps/api/window')
    await getCurrentWindow().toggleMaximize()
  }
}

async function closeWindow(minimizeToTray: boolean, savePosition: () => void) {
  // Save playback position before closing
  savePosition()
  
  if (isTauri()) {
    const { getCurrentWindow } = await import('@tauri-apps/api/window')
    const win = getCurrentWindow()
    
    if (minimizeToTray) {
      // Hide to system tray
      await win.hide()
    } else {
      await win.close()
    }
  }
}

export default function TitleBar() {
  const { setView, performSearch, searchQuery, setSearchQuery, darkMode, currentView, minimizeToTray, closeLyrics, recentSearches, removeRecentSearch } = useAppStore()
  const { savePosition } = usePlayerStore()
  const [localQuery, setLocalQuery] = useState(searchQuery)
  const [updateAvailable, setUpdateAvailable] = useState(false)
  const [updateInfo, setUpdateInfo] = useState<ReleaseInfo | null>(null)
  const [showReleaseNotes, setShowReleaseNotes] = useState(false)
  const [downloadingUpdate, setDownloadingUpdate] = useState(false)
  const [showRecentSearches, setShowRecentSearches] = useState(false)
  const [isSearchFocused, setIsSearchFocused] = useState(false)
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 })
  const searchContainerRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  // Check for updates on mount
  useEffect(() => {
    const checkUpdate = async () => {
      try {
        const result = await isUpdateAvailable()
        if (result.available && result.release) {
          setUpdateAvailable(true)
          setUpdateInfo(result.release)
        }
      } catch {
        // Silently fail
      }
    }
    checkUpdate()
  }, [])

  const handleDownloadUpdate = async () => {
    if (!updateInfo?.downloadUrl) {
      openReleasesPage()
      return
    }
    setDownloadingUpdate(true)
    try {
      await downloadAndInstallUpdate(updateInfo.downloadUrl)
    } catch {
      // Error handled silently
    }
    setDownloadingUpdate(false)
  }

  // Auto-search as user types (debounced) - increased to 500ms for better performance
  useEffect(() => {
    const timer = setTimeout(() => {
      if (localQuery.trim()) {
        performSearch(localQuery)
        setShowRecentSearches(false) // Hide recent searches when typing
      } else {
        setSearchQuery('')
        // Show recent searches if focused and not typing
        if (isSearchFocused) {
          setShowRecentSearches(true)
        }
      }
    }, 500) // Increased from 400ms to 500ms for better performance
    return () => clearTimeout(timer)
  }, [localQuery, performSearch, setSearchQuery, isSearchFocused])

  // Handle click outside to close recent searches
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        // Check if click is on the portal dropdown
        const target = event.target as HTMLElement
        if (!target.closest('[data-recent-searches-dropdown]')) {
          setShowRecentSearches(false)
          setIsSearchFocused(false)
        }
      }
    }

    if (showRecentSearches) {
      // Use a small delay to allow click events to register
      setTimeout(() => {
        document.addEventListener('mousedown', handleClickOutside)
      }, 100)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showRecentSearches])

  // Sync local query with store
  useEffect(() => {
    setLocalQuery(searchQuery)
  }, [searchQuery])

  const clearSearch = () => {
    setLocalQuery('')
    setSearchQuery('')
    if (isSearchFocused && recentSearches.length > 0) {
      setShowRecentSearches(true)
    }
  }

  const handleRecentSearchClick = (query: string) => {
    // Remove from recent searches (Spotify behavior)
    removeRecentSearch(query)
    // Perform the search
    setLocalQuery(query)
    setSearchQuery(query)
    performSearch(query)
    setShowRecentSearches(false)
  }

  const handleSearchFocus = () => {
    setIsSearchFocused(true)
    // Calculate dropdown position
    if (searchContainerRef.current) {
      const rect = searchContainerRef.current.getBoundingClientRect()
      setDropdownPosition({
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width
      })
      // Show recent searches if there's no query and we have recent searches
      if (!localQuery.trim() && recentSearches.length > 0) {
        setShowRecentSearches(true)
      }
    }
  }

  // Update dropdown position on window resize
  useEffect(() => {
    const updatePosition = () => {
      if (searchContainerRef.current && showRecentSearches) {
        const rect = searchContainerRef.current.getBoundingClientRect()
        setDropdownPosition({
          top: rect.bottom + 4,
          left: rect.left,
          width: rect.width
        })
      }
    }
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, true)
    return () => {
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition, true)
    }
  }, [showRecentSearches])

  const handleSearchBlur = () => {
    // Don't hide immediately - let click outside handler do it
    // This prevents hiding when clicking on a recent search item
    setTimeout(() => {
      if (!searchContainerRef.current?.contains(document.activeElement)) {
        setIsSearchFocused(false)
        setShowRecentSearches(false)
      }
    }, 200)
  }

  return (
    <div 
      data-tauri-drag-region
      className={`h-fib-55 flex items-center px-fib-13 border-b relative z-[100]
        ${darkMode ? 'bg-transparent border-ios-separator-dark' : 'bg-transparent border-ios-separator'}`}
    >
      {/* Left side - Update button or empty spacer */}
      <div data-tauri-drag-region className="w-40 flex-shrink-0 h-full flex items-center gap-fib-5">
        {updateAvailable && updateInfo && (
          <>
            <Tooltip text={`v${updateInfo.version} Release Notes`} position="bottom">
              <button
                onClick={() => setShowReleaseNotes(true)}
                className={`p-fib-8 rounded-fib-8 ios-active ios-transition hover:bg-ios-gray/20
                  ${darkMode ? 'text-white' : 'text-black'}`}
              >
                <FileText size={16} />
              </button>
            </Tooltip>
            <button
              onClick={() => setShowReleaseNotes(true)}
              className="flex items-center gap-fib-5 px-fib-8 py-fib-5 rounded-fib-8 bg-ios-blue text-white text-fib-13 font-medium ios-active hover:bg-ios-blue/90 ios-transition"
            >
              <Download size={14} />
              <span>Update</span>
            </button>
          </>
        )}
      </div>

      {/* Search bar - centered */}
      <div data-tauri-drag-region className="flex-1 flex justify-center items-center h-full relative z-[100]">
        <div 
          ref={searchContainerRef} 
          className="w-full max-w-md relative"
          onClick={() => {
            // Show recent searches when clicking the search container
            if (!localQuery.trim() && recentSearches.length > 0) {
              if (searchContainerRef.current) {
                const rect = searchContainerRef.current.getBoundingClientRect()
                setDropdownPosition({
                  top: rect.bottom + 4,
                  left: rect.left,
                  width: rect.width
                })
              }
              setShowRecentSearches(true)
              setIsSearchFocused(true)
            }
          }}
        >
          <div className={`flex items-center gap-fib-8 px-fib-13 py-fib-8 rounded-fib-34 w-full relative z-[101]
            ${darkMode ? 'bg-ios-card-secondary-dark' : 'bg-ios-card-secondary'}`}>
            <Search size={18} className="text-ios-gray flex-shrink-0" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search songs, artists, albums..."
              value={localQuery}
              onChange={(e) => { 
                closeLyrics()
                setLocalQuery(e.target.value)
                if (e.target.value.trim()) {
                  setShowRecentSearches(false)
                } else if (isSearchFocused && recentSearches.length > 0) {
                  // Update position when showing
                  if (searchContainerRef.current) {
                    const rect = searchContainerRef.current.getBoundingClientRect()
                    setDropdownPosition({
                      top: rect.bottom + 4,
                      left: rect.left,
                      width: rect.width
                    })
                  }
                  setShowRecentSearches(true)
                }
              }}
              onFocus={handleSearchFocus}
              onBlur={handleSearchBlur}
              className={`flex-1 bg-transparent outline-none text-fib-13
                ${darkMode ? 'text-white placeholder-ios-gray' : 'text-black placeholder-ios-gray'}`}
            />
            {localQuery && (
              <button onClick={clearSearch} className="p-fib-3 ios-active">
                <X size={16} className="text-ios-gray" />
              </button>
            )}
          </div>

          {/* Recent Searches Dropdown - Spotify style (rendered via portal) */}
          {showRecentSearches && recentSearches.length > 0 && !localQuery.trim() && dropdownPosition.width > 0 && typeof document !== 'undefined' && 
            createPortal(
              <div 
                data-recent-searches-dropdown
                className={`fixed rounded-2xl shadow-2xl overflow-hidden
                  ${darkMode ? 'bg-ios-card-dark border border-ios-separator-dark' : 'bg-white border border-ios-separator'}`}
                style={{ 
                  top: `${dropdownPosition.top}px`,
                  left: `${dropdownPosition.left}px`,
                  width: `${dropdownPosition.width}px`,
                  zIndex: 99999
                }}
                onClick={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
              >
                <div className={`px-fib-13 py-fib-8 border-b ${darkMode ? 'border-ios-separator-dark' : 'border-ios-separator'}`}>
                  <h3 className={`text-fib-13 font-semibold ${darkMode ? 'text-white' : 'text-black'}`}>
                    Recent searches
                  </h3>
                </div>
                <div className="py-fib-3">
                  {recentSearches.map((query, index) => (
                    <button
                      key={index}
                      onClick={() => handleRecentSearchClick(query)}
                      className={`w-full flex items-center gap-fib-13 px-fib-13 py-fib-8 text-left ios-active ios-transition
                        ${darkMode ? 'hover:bg-white/5 text-white' : 'hover:bg-black/5 text-black'}`}
                    >
                      <Clock size={16} className="text-ios-gray flex-shrink-0" />
                      <span className="flex-1 text-fib-13 truncate">{query}</span>
                    </button>
                  ))}
                </div>
              </div>,
              document.body
            )
          }
        </div>
      </div>

      {/* Right side - Settings + Window controls */}
      <div className="w-40 flex-shrink-0 flex items-center justify-end gap-fib-8">
        {/* Settings button */}
        <Tooltip text="Settings" position="bottom">
          <button
            onClick={() => { closeLyrics(); setView('settings') }}
            className={`p-fib-8 rounded-fib-8 ios-active ios-transition
              ${currentView === 'settings' ? 'bg-ios-blue text-white' : 'hover:bg-ios-gray/20'}
              ${darkMode && currentView !== 'settings' ? 'text-white' : ''}`}
          >
            <Settings size={18} />
          </button>
        </Tooltip>

        {/* Window controls */}
        <Tooltip text="Minimize" position="bottom">
          <button
            onClick={minimizeWindow}
            className={`p-fib-5 rounded-fib-5 ios-active ios-transition hover:bg-ios-gray/20
              ${darkMode ? 'text-ios-gray hover:text-white' : 'text-ios-gray hover:text-black'}`}
          >
            <Minus size={16} />
          </button>
        </Tooltip>
        <Tooltip text="Maximize" position="bottom">
          <button
            onClick={maximizeWindow}
            className={`p-fib-5 rounded-fib-5 ios-active ios-transition hover:bg-ios-gray/20
              ${darkMode ? 'text-ios-gray hover:text-white' : 'text-ios-gray hover:text-black'}`}
          >
            <Square size={14} />
          </button>
        </Tooltip>
        <Tooltip text="Close" position="bottom">
          <button
            onClick={() => closeWindow(minimizeToTray, savePosition)}
            className="p-fib-5 rounded-fib-5 ios-active ios-transition text-ios-gray hover:bg-ios-red hover:text-white"
          >
            <X size={16} />
          </button>
        </Tooltip>
      </div>

      {/* Release Notes Modal */}
      {showReleaseNotes && updateInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className={`w-full max-w-md rounded-2xl shadow-xl overflow-hidden
            ${darkMode ? 'bg-ios-card-dark' : 'bg-white'}`}>
            {/* Header */}
            <div className={`flex items-center justify-between px-5 py-4 border-b
              ${darkMode ? 'border-ios-separator-dark' : 'border-ios-separator'}`}>
              <div>
                <h2 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-black'}`}>
                  What's New in v{updateInfo.version}
                </h2>
                <p className="text-xs text-ios-gray mt-0.5">
                  {updateInfo.publishedAt ? new Date(updateInfo.publishedAt).toLocaleDateString() : ''}
                </p>
              </div>
              <button
                onClick={() => setShowReleaseNotes(false)}
                className={`p-2 rounded-full ios-active ${darkMode ? 'hover:bg-white/10' : 'hover:bg-black/5'}`}
              >
                <X size={20} className={darkMode ? 'text-white' : 'text-black'} />
              </button>
            </div>
            
            {/* Release Notes Content */}
            <div className={`px-5 py-4 max-h-[300px] overflow-y-auto text-sm leading-relaxed
              ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              {updateInfo.body ? (
                <div className="whitespace-pre-wrap">
                  {updateInfo.body.split('\n').map((line, i) => {
                    if (line.startsWith('## ')) {
                      return <h3 key={i} className={`font-semibold mt-3 mb-2 ${darkMode ? 'text-white' : 'text-black'}`}>{line.replace('## ', '')}</h3>
                    }
                    if (line.startsWith('### ')) {
                      return <h4 key={i} className={`font-medium mt-2 mb-1 ${darkMode ? 'text-white' : 'text-black'}`}>{line.replace('### ', '')}</h4>
                    }
                    if (line.startsWith('- ') || line.startsWith('* ')) {
                      return <p key={i} className="ml-2 mb-1">• {line.slice(2)}</p>
                    }
                    if (!line.trim()) {
                      return <br key={i} />
                    }
                    return <p key={i} className="mb-1">{line}</p>
                  })}
                </div>
              ) : (
                <p className="text-ios-gray">No release notes available.</p>
              )}
            </div>
            
            {/* Footer */}
            <div className={`flex gap-3 px-5 py-4 border-t
              ${darkMode ? 'border-ios-separator-dark' : 'border-ios-separator'}`}>
              <button
                onClick={() => setShowReleaseNotes(false)}
                className={`flex-1 py-2.5 rounded-xl text-sm font-medium ios-active
                  ${darkMode ? 'bg-ios-card-secondary-dark text-white' : 'bg-ios-card-secondary text-black'}`}
              >
                Later
              </button>
              <button
                onClick={() => {
                  setShowReleaseNotes(false)
                  handleDownloadUpdate()
                }}
                disabled={downloadingUpdate}
                className="flex-1 py-2.5 bg-ios-blue text-white rounded-xl text-sm font-medium ios-active flex items-center justify-center gap-2"
              >
                {downloadingUpdate ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Downloading...
                  </>
                ) : (
                  <>
                    <ArrowDownCircle size={16} />
                    Update Now
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
