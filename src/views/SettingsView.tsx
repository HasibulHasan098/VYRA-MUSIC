import { useState, useEffect } from 'react'
import {
  Moon,
  Sun,
  Download,
  User,
  Info,
  ExternalLink,
  Github,
  FolderOpen,
  Check,
  HardDrive,
  Trash2,
  X,
  RefreshCw,
  ArrowDownCircle,
  Loader2,
  MessageCircle,
  Repeat,
  SlidersHorizontal,
} from 'lucide-react'
import { useAppStore } from '../store/appStore'
import { isUpdateAvailable, getCurrentVersion, downloadAndInstallUpdate, openReleasesPage, ReleaseInfo } from '../api/updater'

// Extend Window interface for Tauri
declare global {
  interface Window {
    __TAURI__?: unknown
  }
}

export default function SettingsView() {
  const {
    darkMode,
    toggleDarkMode,
    downloadPath,
    setDownloadPath,
    downloadQuality,
    setDownloadQuality,
    cacheEnabled,
    toggleCacheEnabled,
    cachedSongs,
    clearCache,
    minimizeToTray,
    toggleMinimizeToTray,
    discordRpcEnabled,
    toggleDiscordRpc,
    autoplayEnabled,
    toggleAutoplay,
    equalizerEnabled,
    toggleEqualizer,
    equalizerPreset,
    setEqualizerPreset,
    equalizerBands,
    setEqualizerBand,
    resetEqualizer,
  } = useAppStore()
  const [showQualityDropdown, setShowQualityDropdown] = useState(false)
  const [showPresetDropdown, setShowPresetDropdown] = useState(false)
  const [checkingUpdate, setCheckingUpdate] = useState(false)
  const [updateAvailable, setUpdateAvailable] = useState(false)
  const [updateInfo, setUpdateInfo] = useState<ReleaseInfo | null>(null)
  const [downloadingUpdate, setDownloadingUpdate] = useState(false)
  const [updateError, setUpdateError] = useState<string | null>(null)

  // Check for updates on mount
  useEffect(() => {
    checkForUpdates()
  }, [])

  const checkForUpdates = async () => {
    setCheckingUpdate(true)
    setUpdateError(null)
    try {
      const result = await isUpdateAvailable()
      setUpdateAvailable(result.available)
      setUpdateInfo(result.release)
    } catch (error) {
      setUpdateError('Failed to check for updates')
    }
    setCheckingUpdate(false)
  }

  const handleDownloadUpdate = async () => {
    if (!updateInfo?.downloadUrl) {
      // No direct download, open releases page
      openReleasesPage()
      return
    }

    setDownloadingUpdate(true)
    setUpdateError(null)
    try {
      const success = await downloadAndInstallUpdate(updateInfo.downloadUrl)
      if (!success) {
        setUpdateError('Failed to download update')
      }
    } catch (error) {
      setUpdateError('Failed to download update')
    }
    setDownloadingUpdate(false)
  }

  const qualityOptions = [
    { value: 'normal', label: 'Normal', description: '128 kbps' },
    { value: 'high', label: 'High', description: '256 kbps' },
    { value: 'very_high', label: 'Very High', description: '320 kbps' },
  ] as const

  const currentQuality =
    qualityOptions.find((q) => q.value === downloadQuality) || qualityOptions[1]

  const handleSelectFolder = async () => {
    try {
      if (typeof window !== 'undefined' && window.__TAURI__) {
        const { invoke } = await import('@tauri-apps/api/core')
        const selected = await invoke<string | null>('select_folder')
        if (selected) {
          setDownloadPath(selected)
        }
      }
    } catch (error) {
      console.error('Failed to open folder picker:', error)
    }
  }

  const handleClearCache = async () => {
    try {
      if (typeof window !== 'undefined' && window.__TAURI__) {
        const { invoke } = await import('@tauri-apps/api/core')
        await invoke('clear_audio_cache')
      }
      clearCache()
    } catch (error) {
      console.error('Failed to clear cache:', error)
    }
  }

  const openExternalLink = async (url: string) => {
    try {
      if (typeof window !== 'undefined' && window.__TAURI__) {
        const { invoke } = await import('@tauri-apps/api/core')
        await invoke('open_url', { url })
      } else {
        window.open(url, '_blank')
      }
    } catch (error) {
      console.error('Failed to open link:', error)
      // Fallback
      window.open(url, '_blank')
    }
  }

  const settingGroups = [
    {
      title: 'Appearance',
      items: [
        {
          icon: darkMode ? Moon : Sun,
          label: 'Dark Mode',
          description: 'Switch between light and dark themes',
          action: (
            <button
              onClick={toggleDarkMode}
              className={`relative w-[51px] h-[31px] rounded-full ios-transition
                ${darkMode ? 'bg-ios-blue' : 'bg-gray-300'}`}
            >
              <div className={`absolute top-[2px] w-[27px] h-[27px] bg-white rounded-full shadow-md ios-transition
                ${darkMode ? 'left-[22px]' : 'left-[2px]'}`} />
            </button>
          )
        }
      ]
    },
    {
      title: 'Playback',
      items: [
        {
          icon: Repeat,
          label: 'Autoplay',
          description: autoplayEnabled ? 'Automatically play next song in queue' : 'Stop after each song',
          action: (
            <button
              onClick={toggleAutoplay}
              className={`relative w-[51px] h-[31px] rounded-full ios-transition
                ${autoplayEnabled ? 'bg-ios-blue' : 'bg-gray-300'}`}
            >
              <div className={`absolute top-[2px] w-[27px] h-[27px] bg-white rounded-full shadow-md ios-transition
                ${autoplayEnabled ? 'left-[22px]' : 'left-[2px]'}`} />
            </button>
          )
        },
        {
          icon: SlidersHorizontal,
          label: 'Equalizer',
          description: equalizerEnabled ? `${equalizerPreset.charAt(0).toUpperCase() + equalizerPreset.slice(1)} preset active` : 'Adjust audio frequencies',
          action: (
            <button
              onClick={toggleEqualizer}
              className={`relative w-[51px] h-[31px] rounded-full ios-transition
                ${equalizerEnabled ? 'bg-ios-blue' : 'bg-gray-300'}`}
            >
              <div className={`absolute top-[2px] w-[27px] h-[27px] bg-white rounded-full shadow-md ios-transition
                ${equalizerEnabled ? 'left-[22px]' : 'left-[2px]'}`} />
            </button>
          )
        }
      ]
    },
    {
      title: 'Storage',
      items: [
        {
          icon: HardDrive,
          label: 'Cache Music',
          description: `Cache up to 40 songs for offline playback (${cachedSongs.length}/40)`,
          action: (
            <button
              onClick={toggleCacheEnabled}
              className={`relative w-[51px] h-[31px] rounded-full ios-transition
                ${cacheEnabled ? 'bg-ios-blue' : 'bg-gray-300'}`}
            >
              <div className={`absolute top-[2px] w-[27px] h-[27px] bg-white rounded-full shadow-md ios-transition
                ${cacheEnabled ? 'left-[22px]' : 'left-[2px]'}`} />
            </button>
          )
        },
        {
          icon: Trash2,
          label: 'Clear Cache',
          description: cachedSongs.length > 0 ? `${cachedSongs.length} songs cached` : 'No songs cached',
          action: (
            <button 
              onClick={handleClearCache}
              disabled={cachedSongs.length === 0}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium ios-active
                ${cachedSongs.length > 0 
                  ? 'bg-ios-red text-white' 
                  : darkMode ? 'bg-ios-card-secondary-dark text-ios-gray' : 'bg-ios-card-secondary text-ios-gray'}`}
            >
              Clear
            </button>
          )
        },
        {
          icon: FolderOpen,
          label: 'Download Location',
          description: downloadPath || 'Default: Music/VYRA',
          action: (
            <button 
              onClick={handleSelectFolder}
              className="px-3 py-1.5 bg-ios-blue text-white rounded-lg text-sm font-medium ios-active"
            >
              Browse
            </button>
          )
        },
        {
          icon: Download,
          label: 'Download Quality',
          description: 'Quality for offline downloads',
          action: (
            <div className="relative">
              <button 
                onClick={() => setShowQualityDropdown(!showQualityDropdown)}
                className={`px-3 py-1.5 rounded-lg text-sm flex items-center gap-2 min-w-[100px] justify-between
                  ${darkMode ? 'bg-ios-card-secondary-dark text-white' : 'bg-ios-card-secondary text-black'}`}
              >
                {currentQuality.label}
                <svg className={`w-4 h-4 ios-transition ${showQualityDropdown ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {showQualityDropdown && (
                <div className={`absolute right-0 top-full mt-1 rounded-lg shadow-lg overflow-hidden z-50 min-w-[140px]
                  ${darkMode ? 'bg-ios-card-dark border border-white/10' : 'bg-white border border-black/10'}`}>
                  {qualityOptions.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => {
                        setDownloadQuality(option.value)
                        setShowQualityDropdown(false)
                      }}
                      className={`w-full px-3 py-2 text-left flex items-center justify-between
                        ${darkMode ? 'hover:bg-white/10' : 'hover:bg-black/5'}
                        ${downloadQuality === option.value ? 'text-ios-blue' : darkMode ? 'text-white' : 'text-black'}`}
                    >
                      <div>
                        <p className="text-sm font-medium">{option.label}</p>
                        <p className="text-xs text-ios-gray">{option.description}</p>
                      </div>
                      {downloadQuality === option.value && <Check size={16} className="text-ios-blue" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )
        }
      ]
    },
    {
      title: 'Behavior',
      items: [
        {
          icon: X,
          label: 'Close to Tray',
          description: minimizeToTray ? 'Minimize to system tray on close' : 'Exit app on close',
          action: (
            <button
              onClick={toggleMinimizeToTray}
              className={`relative w-[51px] h-[31px] rounded-full ios-transition
                ${minimizeToTray ? 'bg-ios-blue' : 'bg-gray-300'}`}
            >
              <div className={`absolute top-[2px] w-[27px] h-[27px] bg-white rounded-full shadow-md ios-transition
                ${minimizeToTray ? 'left-[22px]' : 'left-[2px]'}`} />
            </button>
          )
        },
        {
          icon: MessageCircle,
          label: 'Discord Rich Presence',
          description: discordRpcEnabled ? 'Show what you\'re listening to on Discord' : 'Discord status disabled',
          action: (
            <button
              onClick={toggleDiscordRpc}
              className={`relative w-[51px] h-[31px] rounded-full ios-transition
                ${discordRpcEnabled ? 'bg-ios-blue' : 'bg-gray-300'}`}
            >
              <div className={`absolute top-[2px] w-[27px] h-[27px] bg-white rounded-full shadow-md ios-transition
                ${discordRpcEnabled ? 'left-[22px]' : 'left-[2px]'}`} />
            </button>
          )
        }
      ]
    },
    {
      title: 'Account',
      items: [
        {
          icon: User,
          label: 'YouTube Music Account',
          description: 'Sign-in coming soon',
          action: (
            <button 
              disabled
              className="px-3 py-1.5 bg-ios-gray/30 text-ios-gray rounded-lg text-sm font-medium cursor-not-allowed"
            >
              Coming Soon
            </button>
          )
        }
      ]
    },
    {
      title: 'About',
      items: [
        {
          icon: Info,
          label: 'Version',
          description: `VYRA v${getCurrentVersion()}`,
          action: null
        },
        {
          icon: RefreshCw,
          label: 'Check for Updates',
          description: checkingUpdate 
            ? 'Checking...' 
            : updateError
              ? updateError
              : updateAvailable 
                ? `Update available: v${updateInfo?.version}` 
                : 'You are on the latest version',
          action: (
            <div className="flex items-center gap-2">
              {updateAvailable && !downloadingUpdate && (
                <button 
                  onClick={handleDownloadUpdate}
                  className="px-3 py-1.5 bg-ios-blue text-white rounded-lg text-sm font-medium ios-active flex items-center gap-1"
                >
                  <ArrowDownCircle size={14} />
                  Update
                </button>
              )}
              {downloadingUpdate && (
                <div className="flex items-center gap-2 text-ios-blue">
                  <Loader2 size={16} className="animate-spin" />
                  <span className="text-sm">Downloading...</span>
                </div>
              )}
              {!downloadingUpdate && (
                <button 
                  onClick={checkForUpdates}
                  disabled={checkingUpdate}
                  className={`p-2 rounded-lg ios-active ${darkMode ? 'hover:bg-white/10' : 'hover:bg-black/5'}`}
                >
                  <RefreshCw size={16} className={`${checkingUpdate ? 'animate-spin' : ''} ${darkMode ? 'text-white' : 'text-black'}`} />
                </button>
              )}
            </div>
          )
        },
        {
          icon: Github,
          label: 'Open Source',
          description: 'View on GitHub',
          action: (
            <button 
              onClick={() => openExternalLink('https://github.com/HasibulHasan098/VYRA-MUSIC')}
              className="flex items-center gap-1 text-ios-blue text-sm font-medium ios-active"
            >
              Open <ExternalLink size={13} />
            </button>
          )
        }
      ]
    }
  ]

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-black'}`}>
        Settings
      </h1>

      {settingGroups.map((group, groupIndex) => (
        <section key={group.title}>
          <h2 className="text-sm font-semibold text-ios-gray uppercase tracking-wider mb-2 px-3">
            {group.title}
          </h2>
          <div className={`rounded-xl ${darkMode ? 'bg-ios-card-dark' : 'bg-ios-card'}`}>
            {group.items.map((item, index) => (
              <div 
                key={item.label}
                className={`flex items-center gap-3 px-4 py-3
                  ${index > 0 ? `border-t ${darkMode ? 'border-ios-separator-dark' : 'border-ios-separator'}` : ''}
                  ${index === 0 ? 'rounded-t-xl' : ''} 
                  ${index === group.items.length - 1 ? 'rounded-b-xl' : ''}`}
              >
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0
                  ${darkMode ? 'bg-ios-card-secondary-dark' : 'bg-ios-card-secondary'}`}>
                  <item.icon size={18} className="text-ios-blue" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-black'}`}>
                    {item.label}
                  </p>
                  <p className="text-xs text-ios-gray truncate">{item.description}</p>
                </div>
                {item.action}
              </div>
            ))}
          </div>

          {/* Equalizer Controls - Show after Playback section when enabled */}
          {group.title === 'Playback' && equalizerEnabled && (
            <div className={`rounded-xl mt-3 ${darkMode ? 'bg-ios-card-dark' : 'bg-ios-card'}`}>
              {/* Preset Selector */}
              <div className="flex items-center gap-3 px-4 py-3">
                <span className={`text-sm ${darkMode ? 'text-white' : 'text-black'}`}>Preset</span>
                <div className="relative flex-1 flex justify-end">
                  <button 
                    onClick={() => setShowPresetDropdown(!showPresetDropdown)}
                    className={`px-3 py-1.5 rounded-lg text-sm flex items-center gap-2 min-w-[120px] justify-between
                      ${darkMode ? 'bg-ios-card-secondary-dark text-white' : 'bg-ios-card-secondary text-black'}`}
                  >
                    {equalizerPreset.charAt(0).toUpperCase() + equalizerPreset.slice(1)}
                    <svg className={`w-4 h-4 ios-transition ${showPresetDropdown ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {showPresetDropdown && (
                    <div className={`absolute right-0 top-full mt-1 rounded-lg shadow-lg overflow-hidden z-50 min-w-[160px] max-h-[280px] overflow-y-auto
                      ${darkMode ? 'bg-ios-card-dark border border-white/10' : 'bg-white border border-black/10'}`}>
                      {['flat', 'acoustic', 'bass booster', 'bass reducer', 'classical', 'dance', 'deep', 'electronic', 'hiphop', 'jazz', 'latin', 'loudness', 'lounge', 'piano', 'pop', 'rnb', 'rock', 'small speakers', 'spoken word', 'treble booster'].map((preset) => (
                        <button
                          key={preset}
                          onClick={() => {
                            setEqualizerPreset(preset)
                            setShowPresetDropdown(false)
                          }}
                          className={`w-full px-3 py-2 text-left text-sm capitalize
                            ${darkMode ? 'hover:bg-white/10' : 'hover:bg-black/5'}
                            ${equalizerPreset === preset ? 'text-ios-blue' : darkMode ? 'text-white' : 'text-black'}`}
                        >
                          {preset.charAt(0).toUpperCase() + preset.slice(1)}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* EQ Graph */}
              <div className={`px-4 py-4 border-t ${darkMode ? 'border-ios-separator-dark' : 'border-ios-separator'}`}>
                <div className="flex justify-between mb-2">
                  <span className="text-xs text-ios-gray">+12dB</span>
                  <span className="text-xs text-ios-gray">-12dB</span>
                </div>
                
                <div className="relative h-36 mb-3">
                  <div className={`absolute left-0 right-0 top-1/2 h-px ${darkMode ? 'bg-white/20' : 'bg-black/20'}`} />
                  
                  <svg 
                    className="absolute inset-0 w-full h-full pointer-events-none" 
                    viewBox="0 0 600 144"
                    preserveAspectRatio="none"
                  >
                    <defs>
                      <linearGradient id="eqFill" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#007AFF" stopOpacity="0.5" />
                        <stop offset="100%" stopColor="#007AFF" stopOpacity="0.05" />
                      </linearGradient>
                    </defs>
                    <path
                      d={`M 50 ${72 - equalizerBands[0] * 5}
                          C 100 ${72 - equalizerBands[0] * 5}, 100 ${72 - equalizerBands[1] * 5}, 150 ${72 - equalizerBands[1] * 5}
                          C 200 ${72 - equalizerBands[1] * 5}, 200 ${72 - equalizerBands[2] * 5}, 250 ${72 - equalizerBands[2] * 5}
                          C 300 ${72 - equalizerBands[2] * 5}, 300 ${72 - equalizerBands[3] * 5}, 350 ${72 - equalizerBands[3] * 5}
                          C 400 ${72 - equalizerBands[3] * 5}, 400 ${72 - equalizerBands[4] * 5}, 450 ${72 - equalizerBands[4] * 5}
                          C 500 ${72 - equalizerBands[4] * 5}, 500 ${72 - equalizerBands[5] * 5}, 550 ${72 - equalizerBands[5] * 5}
                          L 550 144 L 50 144 Z`}
                      fill="url(#eqFill)"
                    />
                    <path
                      d={`M 50 ${72 - equalizerBands[0] * 5}
                          C 100 ${72 - equalizerBands[0] * 5}, 100 ${72 - equalizerBands[1] * 5}, 150 ${72 - equalizerBands[1] * 5}
                          C 200 ${72 - equalizerBands[1] * 5}, 200 ${72 - equalizerBands[2] * 5}, 250 ${72 - equalizerBands[2] * 5}
                          C 300 ${72 - equalizerBands[2] * 5}, 300 ${72 - equalizerBands[3] * 5}, 350 ${72 - equalizerBands[3] * 5}
                          C 400 ${72 - equalizerBands[3] * 5}, 400 ${72 - equalizerBands[4] * 5}, 450 ${72 - equalizerBands[4] * 5}
                          C 500 ${72 - equalizerBands[4] * 5}, 500 ${72 - equalizerBands[5] * 5}, 550 ${72 - equalizerBands[5] * 5}`}
                      fill="none"
                      stroke="#007AFF"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    {equalizerBands.map((value, index) => (
                      <circle
                        key={index}
                        cx={50 + index * 100}
                        cy={72 - value * 5}
                        r="8"
                        fill="white"
                        stroke="#007AFF"
                        strokeWidth="3"
                      />
                    ))}
                  </svg>
                  
                  <div className="absolute inset-0 flex">
                    {equalizerBands.map((value, index) => (
                      <div key={index} className="flex-1 flex items-center justify-center">
                        <input
                          type="range"
                          min="-12"
                          max="12"
                          value={value}
                          onChange={(e) => setEqualizerBand(index, parseInt(e.target.value))}
                          className="eq-slider"
                          style={{ 
                            writingMode: 'vertical-lr' as const,
                            direction: 'rtl',
                            height: '120px',
                            width: '40px',
                            cursor: 'pointer',
                            opacity: 0,
                          }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="flex">
                  {['60Hz', '150Hz', '400Hz', '1kHz', '2.4kHz', '15kHz'].map((freq) => (
                    <span key={freq} className="flex-1 text-xs text-ios-gray text-center">{freq}</span>
                  ))}
                </div>
              </div>

              {/* Reset Button */}
              <div className={`flex justify-end px-4 py-3 border-t ${darkMode ? 'border-ios-separator-dark' : 'border-ios-separator'}`}>
                <button
                  onClick={resetEqualizer}
                  className={`px-4 py-1.5 rounded-lg text-sm font-medium ios-active
                    ${darkMode ? 'bg-ios-card-secondary-dark text-white hover:bg-white/20' : 'bg-ios-card-secondary text-black hover:bg-black/10'}`}
                >
                  Reset
                </button>
              </div>
            </div>
          )}
        </section>
      ))}

      {/* Credits */}
      <section className={`rounded-xl p-5 text-center ${darkMode ? 'bg-ios-card-dark' : 'bg-ios-card'}`}>
        <p className="text-sm text-ios-gray">
          MADE BY FASTHAND
        </p>
      </section>
    </div>
  )
}
