import { useState, useEffect } from 'react'
import { Search, Settings, X, Minus, Square, Download, FileText, ArrowDownCircle, Loader2 } from 'lucide-react'
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
  const { setView, performSearch, searchQuery, setSearchQuery, darkMode, currentView, minimizeToTray, closeLyrics } = useAppStore()
  const { savePosition } = usePlayerStore()
  const [localQuery, setLocalQuery] = useState(searchQuery)
  const [updateAvailable, setUpdateAvailable] = useState(false)
  const [updateInfo, setUpdateInfo] = useState<ReleaseInfo | null>(null)
  const [showReleaseNotes, setShowReleaseNotes] = useState(false)
  const [downloadingUpdate, setDownloadingUpdate] = useState(false)

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
