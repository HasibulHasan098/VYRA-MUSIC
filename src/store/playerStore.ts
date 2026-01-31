import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { Song, youtube } from '../api/youtube'

// Track recently played songs with timestamps to prevent duplicates
interface RecentlyPlayedTrack {
  id: string
  timestamp: number
}

// Helper function to check if a song was played recently (within 30 minutes)
const wasPlayedRecently = (trackId: string, recentTracks: RecentlyPlayedTrack[]): boolean => {
  const thirtyMinutesAgo = Date.now() - (30 * 60 * 1000) // 30 minutes in milliseconds
  return recentTracks.some(track => 
    track.id === trackId && track.timestamp > thirtyMinutesAgo
  )
}

// Helper function to normalize song titles for comparison
// Removes common prefixes/suffixes and normalizes for better matching
const normalizeTitle = (title: string): string => {
  if (!title) return ''
  
  let normalized = title.toLowerCase().trim()
  
  // Remove common prefixes like "Artist - " or "Artist: "
  normalized = normalized.replace(/^[^-:]+[-:]\s*/, '')
  
  // Remove common suffixes in parentheses like "(with...", "(Lyri...", "(Official...", etc.
  // Handle both complete parentheses and truncated ones (missing closing paren)
  normalized = normalized.replace(/\s*\([^)]*\)\s*$/, '') // Complete parentheses
  normalized = normalized.replace(/\s*\([^(]*$/, '') // Truncated parentheses (no closing paren)
  normalized = normalized.replace(/\s*\[[^\]]*\]\s*$/, '') // Square brackets
  normalized = normalized.replace(/\s*\[[^[]*$/, '') // Truncated square brackets
  
  // Remove common suffixes like " - Official", " - Audio", etc.
  normalized = normalized.replace(/\s*-\s*(official|audio|video|lyric|lyrics|remix|remastered).*$/i, '')
  
  // Remove extra whitespace and punctuation at the end
  normalized = normalized.replace(/[.,;:!?]+$/, '')
  normalized = normalized.trim()
  
  return normalized
}

// Helper function to check if two titles are similar (same core title)
const isSameTitle = (title1: string, title2: string): boolean => {
  const norm1 = normalizeTitle(title1)
  const norm2 = normalizeTitle(title2)
  
  // If either is empty after normalization, don't match
  if (!norm1 || !norm2) return false
  
  // Exact match after normalization (most common case)
  if (norm1 === norm2) return true
  
  // For short titles (less than 4 chars), only exact match
  if (norm1.length < 4 || norm2.length < 4) {
    return norm1 === norm2
  }
  
  // Check if one title starts with the other (for cases like "love me" vs "love me (feat...)")
  // This handles truncated titles better
  if (norm1.startsWith(norm2) || norm2.startsWith(norm1)) {
    const shorter = norm1.length < norm2.length ? norm1 : norm2
    const longer = norm1.length >= norm2.length ? norm1 : norm2
    // The shorter should be at least 80% of longer, or at least 5 characters
    if (shorter.length >= 5 && shorter.length / longer.length >= 0.8) {
      return true
    }
  }
  
  // Check if titles are very similar (for minor spelling variations)
  // Only if both are at least 5 characters
  if (norm1.length >= 5 && norm2.length >= 5) {
    // Calculate similarity - if one contains the other and they're close in length
    if (norm1.includes(norm2) || norm2.includes(norm1)) {
      const shorter = norm1.length < norm2.length ? norm1 : norm2
      const longer = norm1.length >= norm2.length ? norm1 : norm2
      if (shorter.length / longer.length >= 0.85) {
        return true
      }
    }
  }
  
  return false
}

// Spotify-like queue extension with intelligent filtering
const extendQueue = async (
  trackId: string,
  getState: () => any,
  setState: (state: any) => void
) => {
  try {
    const relatedSongs = await youtube.getRadio(trackId)
    
    if (relatedSongs.length > 0) {
      const { queue: currentQueue, queueIndex: currentIndex, recentlyPlayedTracks, currentTrack, recentlyPlayed } = getState()
      const existingIds = new Set(currentQueue.map((s: Song) => s.id))
      
      // Get context for smart filtering
      const queueTitles = currentQueue.map((s: Song) => s.title)
      const currentTitle = currentTrack ? currentTrack.title : null
      const currentArtists = currentTrack ? new Set(currentTrack.artists.map((a: { name: string }) => a.name.toLowerCase())) : new Set()
      
      // Get recently played artists (last 5 songs) for diversity
      const recentArtists = new Set<string>()
      recentlyPlayed.slice(0, 5).forEach((song: Song) => {
        song.artists.forEach((a: { name: string }) => recentArtists.add(a.name.toLowerCase()))
      })
      
      // Get upcoming artists in queue for diversity
      const upcomingArtists = new Set<string>()
      currentQueue.slice(currentIndex + 1, currentIndex + 4).forEach((song: Song) => {
        song.artists.forEach((a: { name: string }) => upcomingArtists.add(a.name.toLowerCase()))
      })
      
      // Spotify-like filtering: prioritize variety and quality
      const scoredSongs = relatedSongs
        .map(song => {
          // Base score
          let score = 100
          
          // Penalize duplicates
          if (existingIds.has(song.id)) return null
          if (wasPlayedRecently(song.id, recentlyPlayedTracks)) return null
          
          // Heavy penalty for same title (Spotify avoids this)
          if (currentTitle && isSameTitle(currentTitle, song.title)) {
            score -= 100 // Effectively filters out
          }
          
          // Check if same title exists in queue
          const hasSameTitleInQueue = queueTitles.some((queueTitle: string) => isSameTitle(queueTitle, song.title))
          if (hasSameTitleInQueue) {
            score -= 80 // Strong penalty
          }
          
          // Penalize same artist as current (but allow some variety)
          const songArtists = new Set(song.artists.map(a => a.name.toLowerCase()))
          const isSameArtist = Array.from(songArtists).some(artist => currentArtists.has(artist))
          if (isSameArtist) {
            score -= 30 // Moderate penalty - allow some same artist but prefer variety
          }
          
          // Penalize if artist was recently played (encourage diversity)
          const wasRecentArtist = Array.from(songArtists).some(artist => recentArtists.has(artist))
          if (wasRecentArtist) {
            score -= 20
          }
          
          // Penalize if same artist appears in next few songs (avoid clustering)
          const isUpcomingArtist = Array.from(songArtists).some(artist => upcomingArtists.has(artist))
          if (isUpcomingArtist) {
            score -= 15
          }
          
          // Bonus for different artists (encourage discovery)
          if (!isSameArtist && !wasRecentArtist) {
            score += 10
          }
          
          return { song, score }
        })
        .filter((item): item is { song: Song; score: number } => item !== null && item.score > 0)
        .sort((a, b) => b.score - a.score) // Sort by score descending
      
      if (scoredSongs.length > 0) {
        const currentUpcoming = currentQueue.length - currentIndex - 1
        
        // Always add songs if we have fewer than 6 upcoming
        if (currentUpcoming < 6) {
          // Take top scored songs (Spotify typically shows 10-15 next songs)
          // Limit queue size to prevent memory issues (max 100 songs)
          const maxQueueSize = 100
          const currentQueueSize = currentQueue.length
          const availableSlots = maxQueueSize - currentQueueSize
          
          if (availableSlots > 0) {
            const topSongs = scoredSongs.slice(0, Math.min(8, availableSlots, scoredSongs.length)).map(item => item.song)
            setState({ queue: [...currentQueue, ...topSongs] })
          }
        }
      }
    }
  } catch {
    // Silently fail - queue will just have what it has
  }
}

// Update native Windows media controls via Tauri
const updateNativeMediaControls = async (track: Song | null, isPlaying: boolean) => {
  if (typeof window === 'undefined' || !window.__TAURI__) return
  
  try {
    const { invoke } = await import('@tauri-apps/api/core')
    
    if (track) {
      await invoke('update_media_metadata', {
        title: track.title,
        artist: track.artists.map(a => a.name).join(', '),
        album: track.album?.name || null,
        coverUrl: `https://i.ytimg.com/vi/${track.id}/hqdefault.jpg`
      })
    }
    
    await invoke('update_media_playback', { isPlaying })
  } catch (e) {
    console.error('Failed to update native media controls:', e)
  }
}

// Update Discord Rich Presence
const updateDiscordPresence = async (
  track: Song | null, 
  isPlaying: boolean, 
  duration: number, 
  currentTime: number
) => {
  if (typeof window === 'undefined' || !window.__TAURI__) return
  
  // Check if Discord RPC is enabled in settings
  const { useAppStore } = await import('./appStore')
  const discordEnabled = useAppStore.getState().discordRpcEnabled
  
  if (!discordEnabled) return
  
  try {
    const { invoke } = await import('@tauri-apps/api/core')
    
    if (!track) {
      await invoke('clear_discord_presence')
      return
    }
    
    // Always update presence (playing or paused)
    await invoke('update_discord_presence', {
      title: track.title,
      artist: track.artists.map(a => a.name).join(', '),
      album: track.album?.name || null,
      durationSecs: Math.floor(duration) || null,
      elapsedSecs: Math.floor(currentTime) || null,
      isPlaying,
      thumbnail: track.thumbnail || `https://i.ytimg.com/vi/${track.id}/hqdefault.jpg`
    })
  } catch (e) {
    // Silently fail - Discord might not be running
  }
}

// Media Session helper (browser API)
const updateMediaSession = (track: Song | null, isPlaying: boolean, duration: number, position: number) => {
  if (!('mediaSession' in navigator)) return
  
  if (!track) {
    navigator.mediaSession.metadata = null
    navigator.mediaSession.playbackState = 'none'
    return
  }
  
  const metadata = new MediaMetadata({
    title: track.title,
    artist: track.artists.map(a => a.name).join(', '),
    album: track.album?.name || 'VYRA Music',
    artwork: [
      { src: `https://i.ytimg.com/vi/${track.id}/default.jpg`, sizes: '120x90', type: 'image/jpeg' },
      { src: `https://i.ytimg.com/vi/${track.id}/mqdefault.jpg`, sizes: '320x180', type: 'image/jpeg' },
      { src: `https://i.ytimg.com/vi/${track.id}/hqdefault.jpg`, sizes: '480x360', type: 'image/jpeg' },
      { src: `https://i.ytimg.com/vi/${track.id}/sddefault.jpg`, sizes: '640x480', type: 'image/jpeg' },
      { src: `https://i.ytimg.com/vi/${track.id}/maxresdefault.jpg`, sizes: '1280x720', type: 'image/jpeg' },
    ]
  })
  
  navigator.mediaSession.metadata = metadata
  navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused'
  
  try {
    if (duration > 0 && position >= 0) {
      navigator.mediaSession.setPositionState({
        duration: Math.max(duration, 0),
        playbackRate: 1,
        position: Math.max(0, Math.min(position, duration))
      })
    }
  } catch {
    // Ignore position state errors
  }
}

interface PlayerState {
  currentTrack: Song | null
  queue: Song[]
  queueIndex: number
  isPlaying: boolean
  volume: number
  progress: number
  duration: number
  shuffle: boolean
  repeat: 'off' | 'one' | 'all'
  isLoading: boolean
  error: string | null
  audioElement: HTMLAudioElement | null
  audioContext: AudioContext | null
  eqFilters: BiquadFilterNode[]
  likedSongs: Song[]
  recentlyPlayed: Song[]
  recentlyPlayedTracks: RecentlyPlayedTrack[] // Track IDs with timestamps for duplicate prevention
  savedPosition: number // Save position in seconds for restore
  lastDiscordUpdate: number // Last second Discord was updated (to prevent duplicate updates)
  
  initAudio: () => void
  updateEqualizer: () => void
  setCurrentTrack: (track: Song, autoPlay?: boolean) => Promise<void>
  restorePlayback: () => Promise<void>
  setQueue: (tracks: Song[], startIndex?: number) => void
  addToQueue: (track: Song) => void
  togglePlay: () => void
  setVolume: (volume: number) => void
  setProgress: (progress: number) => void
  seek: (time: number) => void
  toggleShuffle: () => void
  cycleRepeat: () => void
  nextTrack: () => void
  prevTrack: () => void
  playTrackFromQueue: (index: number) => void
  clearError: () => void
  toggleLike: (track: Song) => void
  isLiked: (trackId: string) => boolean
  addToRecentlyPlayed: (track: Song) => void
  savePosition: () => void
  cleanupOldRecentTracks: () => void
}

export const usePlayerStore = create<PlayerState>()(
  persist(
    (set, get) => ({
  currentTrack: null,
  queue: [],
  queueIndex: -1,
  isPlaying: false,
  volume: 0.8,
  progress: 0,
  duration: 0,
  shuffle: false,
  repeat: 'off',
  isLoading: false,
  error: null,
  audioElement: null,
  audioContext: null,
  eqFilters: [],
  likedSongs: [],
  recentlyPlayed: [],
  recentlyPlayedTracks: [],
  savedPosition: 0,
  lastDiscordUpdate: -1,

  initAudio: () => {
    if (get().audioElement) return
    
    const audio = new Audio()
    audio.volume = get().volume
    audio.crossOrigin = 'anonymous'
    audio.preload = 'auto'
    
    // Set up Web Audio API for equalizer
    let audioContext: AudioContext | null = null
    let eqFilters: BiquadFilterNode[] = []
    
    try {
      audioContext = new AudioContext()
      const source = audioContext.createMediaElementSource(audio)
      
      // EQ frequency bands: 60Hz, 150Hz, 400Hz, 1kHz, 2.4kHz, 15kHz
      const frequencies = [60, 150, 400, 1000, 2400, 15000]
      
      eqFilters = frequencies.map((freq, index) => {
        const filter = audioContext!.createBiquadFilter()
        filter.type = index === 0 ? 'lowshelf' : index === frequencies.length - 1 ? 'highshelf' : 'peaking'
        filter.frequency.value = freq
        filter.Q.value = 1
        filter.gain.value = 0
        return filter
      })
      
      // Connect: source -> filters -> destination
      let lastNode: AudioNode = source
      eqFilters.forEach(filter => {
        lastNode.connect(filter)
        lastNode = filter
      })
      lastNode.connect(audioContext.destination)
      
      set({ audioContext, eqFilters })
      
      // Apply initial EQ settings
      get().updateEqualizer()
    } catch (e) {
      // Web Audio API not supported, continue without EQ
      console.warn('Web Audio API not available for equalizer')
    }
    
    // Throttle timeupdate to reduce CPU usage (update every 250ms instead of every frame)
    let lastUpdateTime = 0
    const updateInterval = 250 // ms
    
    audio.addEventListener('timeupdate', () => {
      const now = Date.now()
      if (now - lastUpdateTime < updateInterval) return
      lastUpdateTime = now
      
      const duration = audio.duration || 0
      const progress = duration > 0 ? audio.currentTime / duration : 0
      set({ progress, duration })
      
      const { currentTrack, isPlaying } = get()
      if (currentTrack && duration > 0) {
        updateMediaSession(currentTrack, isPlaying, duration, audio.currentTime)
        
        // Update Discord every 15 seconds to avoid rate limiting
        const currentSecond = Math.floor(audio.currentTime)
        const { lastDiscordUpdate } = get()
        if (isPlaying && currentSecond % 15 === 0 && currentSecond !== lastDiscordUpdate) {
          updateDiscordPresence(currentTrack, isPlaying, duration, audio.currentTime)
          set({ lastDiscordUpdate: currentSecond })
        }
      }
    })
    
    audio.addEventListener('ended', () => {
      const { repeat, nextTrack, currentTrack, queue, queueIndex } = get()
      
      if (repeat === 'one') {
        audio.currentTime = 0
        audio.play()
        return
      }
      
      // Check if autoplay is enabled - do this synchronously
      import('./appStore').then(({ useAppStore }) => {
        const autoplayEnabled = useAppStore.getState().autoplayEnabled
        
        if (autoplayEnabled) {
          // Play next track immediately
          nextTrack()
          
          // Extend queue in background if needed
          const upcomingSongs = queue.length - queueIndex - 1
          if (upcomingSongs <= 2 && currentTrack) {
            extendQueue(currentTrack.id, get, set)
          }
        } else {
          // Autoplay disabled - stop and wait for user
          set({ isPlaying: false })
        }
      })
      
      // Cache the finished song in background (don't block next track)
      if (currentTrack) {
        import('./appStore').then(({ useAppStore }) => {
          const { addToCache, cacheEnabled } = useAppStore.getState()
          if (cacheEnabled && typeof window !== 'undefined' && window.__TAURI__) {
            import('@tauri-apps/api/core').then(({ invoke }) => {
              invoke('cache_audio', { videoId: currentTrack.id })
                .then(() => addToCache(currentTrack))
                .catch(() => {}) // Silently fail
            })
          }
        })
      }
    })
    
    audio.addEventListener('play', () => {
      set({ isPlaying: true, error: null })
      const { currentTrack, duration } = get()
      updateMediaSession(currentTrack, true, duration, audio.currentTime)
      updateNativeMediaControls(currentTrack, true)
      updateDiscordPresence(currentTrack, true, duration, audio.currentTime)
    })
    audio.addEventListener('pause', () => {
      set({ isPlaying: false })
      const { currentTrack, duration } = get()
      updateMediaSession(currentTrack, false, duration, audio.currentTime)
      updateNativeMediaControls(currentTrack, false)
      updateDiscordPresence(currentTrack, false, duration, audio.currentTime)
    })
    audio.addEventListener('loadstart', () => set({ isLoading: true }))
    audio.addEventListener('loadeddata', () => set({ isLoading: false }))
    audio.addEventListener('loadedmetadata', () => {
      const { currentTrack, isPlaying } = get()
      if (currentTrack && audio.duration > 0) {
        updateMediaSession(currentTrack, isPlaying, audio.duration, audio.currentTime)
      }
    })
    audio.addEventListener('canplay', () => set({ isLoading: false }))
    audio.addEventListener('error', () => {
      if (audio.src && audio.src !== window.location.href) {
        set({ isLoading: false, error: 'Failed to play audio' })
      }
    })
    
    // Register Media Session action handlers
    if ('mediaSession' in navigator) {
      navigator.mediaSession.setActionHandler('play', () => {
        const { togglePlay } = get()
        togglePlay()
      })
      navigator.mediaSession.setActionHandler('pause', () => {
        const { togglePlay } = get()
        togglePlay()
      })
      navigator.mediaSession.setActionHandler('stop', () => {
        audio.pause()
        audio.currentTime = 0
        set({ isPlaying: false })
      })
      navigator.mediaSession.setActionHandler('previoustrack', () => {
        const { prevTrack } = get()
        prevTrack()
      })
      navigator.mediaSession.setActionHandler('nexttrack', () => {
        const { nextTrack } = get()
        nextTrack()
      })
      navigator.mediaSession.setActionHandler('seekto', (details) => {
        if (details.seekTime !== undefined && audio.duration > 0) {
          audio.currentTime = details.seekTime
          const { currentTrack, isPlaying } = get()
          updateMediaSession(currentTrack, isPlaying, audio.duration, details.seekTime)
        }
      })
      navigator.mediaSession.setActionHandler('seekbackward', (details) => {
        const skipTime = details.seekOffset || 10
        audio.currentTime = Math.max(audio.currentTime - skipTime, 0)
      })
      navigator.mediaSession.setActionHandler('seekforward', (details) => {
        const skipTime = details.seekOffset || 10
        audio.currentTime = Math.min(audio.currentTime + skipTime, audio.duration)
      })
    }
    
    set({ audioElement: audio })
  },

  updateEqualizer: () => {
    const { eqFilters } = get()
    if (eqFilters.length === 0) return
    
    // Get EQ settings from appStore
    import('./appStore').then(({ useAppStore }) => {
      const { equalizerEnabled, equalizerBands } = useAppStore.getState()
      
      eqFilters.forEach((filter, index) => {
        if (equalizerEnabled && equalizerBands[index] !== undefined) {
          filter.gain.value = equalizerBands[index]
        } else {
          filter.gain.value = 0
        }
      })
    })
  },

  setCurrentTrack: async (track, autoPlay = true) => {
    const { audioElement, initAudio, queue } = get()
    if (!audioElement) {
      initAudio()
    }
    
    const audio = get().audioElement
    if (!audio) return
    
    // Stop current playback and reset
    audio.pause()
    audio.currentTime = 0
    audio.src = ''
    
    // Clear saved position when playing a new track (not restoring)
    set({ currentTrack: track, isLoading: true, error: null, progress: 0, isPlaying: false, savedPosition: 0 })
    
    // Check if track is in queue and find its index
    let trackIndex = queue.findIndex(s => s.id === track.id)
    
    // Spotify-like queue cleanup: Remove songs with same title AND similar context
    // This creates a cleaner, more diverse queue experience
    const filteredQueue = queue.filter(s => {
      // Always keep the current track by ID
      if (s.id === track.id) return true
      
      // Remove songs with the same title (Spotify avoids this)
      if (isSameTitle(track.title, s.title)) return false
      
      // Keep the song - it's different enough
      return true
    })
    
    // Recalculate track index after filtering
    if (trackIndex !== -1) {
      // Count how many songs before the track were removed
      const removedBefore = queue.slice(0, trackIndex).filter(s => 
        s.id !== track.id && isSameTitle(track.title, s.title)
      ).length
      trackIndex = trackIndex - removedBefore
    }
    
    // Add current track to filtered queue if not already there
    if (trackIndex === -1 || filteredQueue.length === 0) {
      // Track not in queue - create new queue with this track
      set({ queue: [track], queueIndex: 0 })
    } else {
      // Track is in queue - update the queue and index
      set({ queue: filteredQueue, queueIndex: trackIndex })
    }
    
    // Always ensure we have at least 6 upcoming songs in queue
    // Calculate upcoming songs AFTER setting the index
    const { queue: updatedQueue, queueIndex: updatedIndex } = get()
    const upcomingSongs = updatedQueue.length - updatedIndex - 1
    
    // Fetch related songs if we have fewer than 6 upcoming
    if (upcomingSongs < 6) {
      extendQueue(track.id, get, set)
    }
    
    // Update media session and native controls immediately with new track info
    updateMediaSession(track, false, 0, 0)
    updateNativeMediaControls(track, false)
    
    try {
      const streamUrl = await youtube.getStreamUrl(track.id)
      
      // Check if track changed while we were fetching
      if (get().currentTrack?.id !== track.id) return
      
      if (streamUrl) {
        audio.src = streamUrl
        
        audio.load()
        
        // Wait for first data to be available - should be fast now (only 256KB initial fetch)
        await new Promise<void>((resolve, reject) => {
          const timeoutId = setTimeout(() => {
            // Timeout after 10 seconds - should be plenty for 256KB
            cleanup()
            reject(new Error('Loading timeout - check your connection'))
          }, 10000)
          
          const cleanup = () => {
            clearTimeout(timeoutId)
            audio.removeEventListener('loadeddata', onLoaded)
            audio.removeEventListener('canplay', onLoaded)
            audio.removeEventListener('error', onError)
          }
          
          const onLoaded = () => {
            cleanup()
            resolve()
          }
          const onError = (e: Event) => {
            cleanup()
            const mediaError = (e.target as HTMLAudioElement)?.error
            reject(new Error(`Failed to load audio: ${mediaError?.message || 'unknown error'}`))
          }
          // Use loadeddata for instant start, canplay as fallback
          audio.addEventListener('loadeddata', onLoaded)
          audio.addEventListener('canplay', onLoaded)
          audio.addEventListener('error', onError)
        })
        
        // Check again if track changed
        if (get().currentTrack?.id !== track.id) return
        
        if (autoPlay) {
          try {
            await audio.play()
            set({ isPlaying: true, isLoading: false })
            // Add to recently played when song actually starts playing
            get().addToRecentlyPlayed(track)
            
            // Cache the song in background for offline playback
            if (typeof window !== 'undefined' && window.__TAURI__) {
              import('@tauri-apps/api/core').then(({ invoke }) => {
                invoke('cache_audio', { videoId: track.id }).catch(() => {
                  // Silently fail caching - not critical
                })
              })
            }
          } catch (playError) {
            // Ignore AbortError (happens when user switches tracks quickly)
            if (playError instanceof Error && playError.name === 'AbortError') {
              return
            }
            throw playError
          }
        } else {
          set({ isLoading: false })
        }
      } else {
        const isTauri = typeof window !== 'undefined' && window.__TAURI__ !== undefined
        set({ 
          isLoading: false, 
          error: isTauri 
            ? 'Could not find audio stream. Try another song.'
            : 'Audio requires desktop app. Run: npm run tauri:dev'
        })
      }
    } catch (error) {
      // Ignore if track changed
      if (get().currentTrack?.id !== track.id) return
      
      set({ 
        isLoading: false, 
        error: error instanceof Error ? error.message : 'Failed to play. Check your connection.' 
      })
    }
  },

  setQueue: (tracks, startIndex = 0) => {
    set({ queue: tracks, queueIndex: startIndex })
    if (tracks.length > 0 && startIndex < tracks.length) {
      get().setCurrentTrack(tracks[startIndex])
    }
  },

  addToQueue: (track) => {
    set((state) => ({ queue: [...state.queue, track] }))
  },

  togglePlay: () => {
    const { audioElement, isPlaying, currentTrack, savedPosition } = get()
    if (!audioElement || !currentTrack) return
    
    // If no source loaded yet (restored track), load and play it with saved position
    if (!audioElement.src || audioElement.src === window.location.href) {
      // Store the position to restore after loading
      const positionToRestore = savedPosition
      get().setCurrentTrack(currentTrack, true).then(() => {
        // Restore position after track loads
        if (positionToRestore > 0 && audioElement.duration > 0) {
          audioElement.currentTime = Math.min(positionToRestore, audioElement.duration - 1)
        }
      }).catch(() => {
        // Silently handle error
      })
      return
    }
    
    if (isPlaying) {
      audioElement.pause()
    } else {
      audioElement.play().catch(() => {
        set({ error: 'Failed to resume playback' })
      })
    }
  },

  setVolume: (volume) => {
    const { audioElement } = get()
    if (audioElement) {
      audioElement.volume = volume
    }
    set({ volume })
  },

  setProgress: (progress) => {
    set({ progress })
  },

  seek: (time) => {
    const { audioElement, duration } = get()
    if (audioElement && duration > 0) {
      audioElement.currentTime = time * duration
    }
  },

  toggleShuffle: () => set((state) => ({ shuffle: !state.shuffle })),

  cycleRepeat: () => set((state) => ({
    repeat: state.repeat === 'off' ? 'all' : state.repeat === 'all' ? 'one' : 'off'
  })),

  nextTrack: async () => {
    const { queue, queueIndex, shuffle, repeat, currentTrack } = get()
    if (queue.length === 0) return
    
    let nextIndex: number
    if (shuffle) {
      // In shuffle mode, pick a random track that's not the current one
      if (queue.length > 1) {
        do {
          nextIndex = Math.floor(Math.random() * queue.length)
        } while (nextIndex === queueIndex)
      } else {
        nextIndex = 0
      }
    } else {
      nextIndex = queueIndex + 1
      if (nextIndex >= queue.length) {
        if (repeat === 'all') {
          nextIndex = 0
        } else {
          // Queue ended - check if autoplay is enabled to fetch more songs
          const { useAppStore } = await import('./appStore')
          const autoplayEnabled = useAppStore.getState().autoplayEnabled
          
          if (autoplayEnabled && currentTrack) {
            try {
              const relatedSongs = await youtube.getRadio(currentTrack.id)
              if (relatedSongs.length > 0) {
                const { recentlyPlayedTracks, recentlyPlayed } = get()
                const existingIds = new Set(queue.map(s => s.id))
                const currentArtists = new Set(currentTrack.artists.map((a: { name: string }) => a.name.toLowerCase()))
                
                // Get recently played artists for diversity
                const recentArtists = new Set<string>()
                recentlyPlayed.slice(0, 5).forEach((song: Song) => {
                  song.artists.forEach((a: { name: string }) => recentArtists.add(a.name.toLowerCase()))
                })
                
                // Spotify-like filtering for next track
                const scoredSongs = relatedSongs
                  .map(song => {
                    let score = 100
                    
                    if (existingIds.has(song.id)) return null
                    if (wasPlayedRecently(song.id, recentlyPlayedTracks)) return null
                    if (isSameTitle(currentTrack.title, song.title)) return null // Never play same title
                    
                    const songArtists = new Set(song.artists.map((a: { name: string }) => a.name.toLowerCase()))
                    const isSameArtist = Array.from(songArtists).some(artist => currentArtists.has(artist))
                    const wasRecentArtist = Array.from(songArtists).some(artist => recentArtists.has(artist))
                    
                    if (isSameArtist) score -= 25
                    if (wasRecentArtist) score -= 15
                    if (!isSameArtist && !wasRecentArtist) score += 15
                    
                    return { song, score }
                  })
                  .filter((item): item is { song: Song; score: number } => item !== null && item.score > 0)
                  .sort((a, b) => b.score - a.score)
                
                if (scoredSongs.length > 0) {
                  // Add top scored songs and play the best one
                  // Limit queue size to prevent memory issues (max 100 songs)
                  const maxQueueSize = 100
                  const availableSlots = maxQueueSize - queue.length
                  
                  if (availableSlots > 0) {
                    const topSongs = scoredSongs.slice(0, Math.min(10, availableSlots)).map(item => item.song)
                    const newQueue = [...queue, ...topSongs]
                    set({ queue: newQueue, queueIndex: queue.length })
                    await get().setCurrentTrack(topSongs[0])
                    return
                  }
                }
              }
            } catch {
              // Silently fail - just stop playback
            }
          }
          // No more songs to play
          set({ isPlaying: false })
          return
        }
      }
    }
    
    set({ queueIndex: nextIndex })
    await get().setCurrentTrack(queue[nextIndex])
  },

  prevTrack: () => {
    const { queue, queueIndex, audioElement } = get()
    if (queue.length === 0) return
    
    // If more than 3 seconds in, restart current track
    if (audioElement && audioElement.currentTime > 3) {
      audioElement.currentTime = 0
      return
    }
    
    const prevIndex = queueIndex <= 0 ? queue.length - 1 : queueIndex - 1
    set({ queueIndex: prevIndex })
    get().setCurrentTrack(queue[prevIndex])
  },

  playTrackFromQueue: async (index) => {
    const { queue } = get()
    if (index >= 0 && index < queue.length) {
      const upcomingSongs = queue.length - index - 1
      
      // If queue is critically low (2 or fewer), wait for fetch before playing
      if (upcomingSongs <= 2) {
        await extendQueue(queue[index].id, get, set)
      } else if (upcomingSongs < 6) {
        // Not critical, fetch in background
        extendQueue(queue[index].id, get, set)
      }
      
      // Get updated queue after potential fetch
      const { queue: updatedQueue } = get()
      set({ queueIndex: index })
      get().setCurrentTrack(updatedQueue[index])
    }
  },

  clearError: () => set({ error: null }),

  toggleLike: (track) => {
    const { likedSongs } = get()
    const isAlreadyLiked = likedSongs.some(s => s.id === track.id)
    if (isAlreadyLiked) {
      set({ likedSongs: likedSongs.filter(s => s.id !== track.id) })
    } else {
      set({ likedSongs: [track, ...likedSongs] })
    }
  },

  isLiked: (trackId) => {
    return get().likedSongs.some(s => s.id === trackId)
  },

  addToRecentlyPlayed: (track) => {
    const { recentlyPlayed, recentlyPlayedTracks } = get()
    // Remove if already exists (to move to top)
    const filtered = recentlyPlayed.filter(s => s.id !== track.id)
    // Add to beginning, limit to 50 (reduced from 100 for better performance)
    const updated = [track, ...filtered].slice(0, 50)
    
    // Add to timestamp tracking for duplicate prevention
    const newRecentTrack: RecentlyPlayedTrack = {
      id: track.id,
      timestamp: Date.now()
    }
    const filteredTracks = recentlyPlayedTracks.filter(t => t.id !== track.id)
    const updatedTracks = [newRecentTrack, ...filteredTracks].slice(0, 200) // Keep more for 30min window
    
    set({ 
      recentlyPlayed: updated,
      recentlyPlayedTracks: updatedTracks
    })
    
    // Cleanup old tracks (older than 30 minutes)
    get().cleanupOldRecentTracks()
  },

  cleanupOldRecentTracks: () => {
    const { recentlyPlayedTracks } = get()
    const thirtyMinutesAgo = Date.now() - (30 * 60 * 1000)
    const cleaned = recentlyPlayedTracks.filter(track => track.timestamp > thirtyMinutesAgo)
    
    // Only update if something changed
    if (cleaned.length !== recentlyPlayedTracks.length) {
      set({ recentlyPlayedTracks: cleaned })
    }
  },

  savePosition: () => {
    const { audioElement } = get()
    if (audioElement && audioElement.currentTime > 0) {
      set({ savedPosition: audioElement.currentTime })
    }
  },

  restorePlayback: async () => {
    const { currentTrack, initAudio, savedPosition, duration: savedDuration } = get()
    
    // Initialize audio element first
    initAudio()
    
    // Cleanup old recent tracks on app start
    get().cleanupOldRecentTracks()
    
    // If we have a saved track, show it in the player UI with saved state
    if (currentTrack) {
      // Use saved duration from track or from persisted state
      const trackDuration = currentTrack.duration || savedDuration || 0
      const restoredProgress = trackDuration > 0 ? Math.min(savedPosition / trackDuration, 1) : 0
      
      set({ 
        isLoading: false, 
        error: null, 
        isPlaying: false,
        duration: trackDuration,
        progress: restoredProgress
      })
    }
  }
    }),
    {
      name: 'metrolist-player',
      partialize: (state) => ({ 
        likedSongs: state.likedSongs,
        recentlyPlayed: state.recentlyPlayed,
        recentlyPlayedTracks: state.recentlyPlayedTracks,
        volume: state.volume,
        currentTrack: state.currentTrack,
        queue: state.queue,
        queueIndex: state.queueIndex,
        savedPosition: state.savedPosition,
        duration: state.duration,
        shuffle: state.shuffle,
        repeat: state.repeat
      })
    }
  )
)

export type { Song }
