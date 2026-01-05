import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { Song, youtube } from '../api/youtube'

// Helper function to extend queue with related songs
const extendQueue = async (
  trackId: string,
  getState: () => any,
  setState: (state: any) => void
) => {
  try {
    const relatedSongs = await youtube.getRadio(trackId)
    
    if (relatedSongs.length > 0) {
      const { queue: currentQueue, queueIndex: currentIndex } = getState()
      const existingIds = new Set(currentQueue.map((s: Song) => s.id))
      const newSongs = relatedSongs.filter(s => !existingIds.has(s.id))
      
      if (newSongs.length > 0) {
        const currentUpcoming = currentQueue.length - currentIndex - 1
        
        // Always add songs if we have fewer than 6 upcoming
        if (currentUpcoming < 6) {
          setState({ queue: [...currentQueue, ...newSongs.slice(0, Math.max(6, newSongs.length))] })
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
  savedPosition: number // Save position in seconds for restore
  
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
  savedPosition: 0,

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
    
    audio.addEventListener('timeupdate', () => {
      const duration = audio.duration || 0
      const progress = duration > 0 ? audio.currentTime / duration : 0
      set({ progress, duration })
      
      const { currentTrack, isPlaying } = get()
      if (currentTrack && duration > 0) {
        updateMediaSession(currentTrack, isPlaying, duration, audio.currentTime)
        
        // Update Discord every 15 seconds to avoid rate limiting
        if (isPlaying && Math.floor(audio.currentTime) % 15 === 0) {
          updateDiscordPresence(currentTrack, isPlaying, duration, audio.currentTime)
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
    const trackIndex = queue.findIndex(s => s.id === track.id)
    
    if (trackIndex === -1 || queue.length === 0) {
      // Track not in queue - create new queue with this track
      set({ queue: [track], queueIndex: 0 })
    } else {
      // Track is in queue - update the index
      set({ queueIndex: trackIndex })
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
                // Filter out songs already in queue to avoid duplicates
                const existingIds = new Set(queue.map(s => s.id))
                const newSongs = relatedSongs.filter(s => !existingIds.has(s.id))
                
                if (newSongs.length > 0) {
                  // Add new songs to queue and play the first one
                  const newQueue = [...queue, ...newSongs]
                  set({ queue: newQueue, queueIndex: queue.length })
                  await get().setCurrentTrack(newSongs[0])
                  return
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
    const { recentlyPlayed } = get()
    // Remove if already exists (to move to top)
    const filtered = recentlyPlayed.filter(s => s.id !== track.id)
    // Add to beginning, limit to 100
    const updated = [track, ...filtered].slice(0, 100)
    set({ recentlyPlayed: updated })
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
