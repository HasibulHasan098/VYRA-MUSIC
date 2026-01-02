import { useState, useEffect } from 'react'
import { Search, Settings, X, Minus, Square, Download } from 'lucide-react'
import { useAppStore } from '../store/appStore'
import { usePlayerStore } from '../store/playerStore'
import { isUpdateAvailable, ReleaseInfo } from '../api/updater'
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
  const { setView, performSearch, searchQuery, setSearchQuery, darkMode, currentView, minimizeToTray, closeLyrics } = useAppStore()
  const { savePosition } = usePlayerStore()
  const [localQuery, setLocalQuery] = useState(searchQuery)
  const [updateAvailable, setUpdateAvailable] = useState(false)
  const [updateInfo, setUpdateInfo] = useState<ReleaseInfo | null>(null)

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

  // Auto-search as user types (debounced)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (localQuery.trim()) {
        performSearch(localQuery)
      } else {
        setSearchQuery('')
      }
    }, 400)
    return () => clearTimeout(timer)
  }, [localQuery, performSearch, setSearchQuery])

  // Sync local query with store
  useEffect(() => {
    setLocalQuery(searchQuery)
  }, [searchQuery])

  const clearSearch = () => {
    setLocalQuery('')
    setSearchQuery('')
  }

  return (
    <div 
      data-tauri-drag-region
      className={`h-fib-55 flex items-center px-fib-13 border-b
        ${darkMode ? 'bg-ios-card-dark border-ios-separator-dark' : 'bg-ios-card border-ios-separator'}`}
    >
      {/* Left side - Update button or empty spacer */}
      <div data-tauri-drag-region className="w-32 flex-shrink-0 h-full flex items-center">
        {updateAvailable && updateInfo && (
          <Tooltip text={`Update to v${updateInfo.version}`} position="bottom">
            <button
              onClick={() => { closeLyrics(); setView('settings') }}
              className="flex items-center gap-fib-5 px-fib-8 py-fib-5 rounded-fib-8 bg-ios-blue text-white text-fib-13 font-medium ios-active hover:bg-ios-blue/90 ios-transition"
            >
              <Download size={14} />
              <span>Update</span>
            </button>
          </Tooltip>
        )}
      </div>

      {/* Search bar - centered */}
      <div data-tauri-drag-region className="flex-1 flex justify-center items-center h-full">
        <div className={`flex items-center gap-fib-8 px-fib-13 py-fib-8 rounded-fib-34 w-full max-w-md
          ${darkMode ? 'bg-ios-card-secondary-dark' : 'bg-ios-card-secondary'}`}>
          <Search size={18} className="text-ios-gray flex-shrink-0" />
          <input
            type="text"
            placeholder="Search songs, artists, albums..."
            value={localQuery}
            onChange={(e) => { closeLyrics(); setLocalQuery(e.target.value) }}
            className={`flex-1 bg-transparent outline-none text-fib-13
              ${darkMode ? 'text-white placeholder-ios-gray' : 'text-black placeholder-ios-gray'}`}
          />
          {localQuery && (
            <button onClick={clearSearch} className="p-fib-3 ios-active">
              <X size={16} className="text-ios-gray" />
            </button>
          )}
        </div>
      </div>

      {/* Right side - Settings + Window controls */}
      <div className="w-32 flex-shrink-0 flex items-center justify-end gap-fib-8">
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
    </div>
  )
}
