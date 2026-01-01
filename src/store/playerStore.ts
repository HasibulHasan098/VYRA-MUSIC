import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { Song, youtube } from '../api/youtube'

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
  likedSongs: Song[]
  recentlyPlayed: Song[]
  savedPosition: number // Save position in seconds for restore
  
  initAudio: () => void
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
  likedSongs: [],
  recentlyPlayed: [],
  savedPosition: 0,

  initAudio: () => {
    if (get().audioElement) return
    
    const audio = new Audio()
    audio.volume = get().volume
    audio.crossOrigin = 'anonymous'
    // Enable instant playback - don't wait for full buffer
    audio.preload = 'auto'
    
    audio.addEventListener('timeupdate', () => {
      const duration = audio.duration || 0
      const progress = duration > 0 ? audio.currentTime / duration : 0
      set({ progress, duration })
    })
    
    audio.addEventListener('ended', () => {
      const { repeat, nextTrack } = get()
      if (repeat === 'one') {
        audio.currentTime = 0
        audio.play()
      } else {
        nextTrack()
      }
    })
    
    audio.addEventListener('play', () => set({ isPlaying: true, error: null }))
    audio.addEventListener('pause', () => set({ isPlaying: false }))
    audio.addEventListener('loadstart', () => set({ isLoading: true }))
    // Use loadeddata for faster response - fires when first frame is available
    audio.addEventListener('loadeddata', () => set({ isLoading: false }))
    audio.addEventListener('canplay', () => set({ isLoading: false }))
    audio.addEventListener('error', () => {
      // Only show error if we actually have a source
      if (audio.src && audio.src !== window.location.href) {
        set({ isLoading: false, error: 'Failed to play audio' })
      }
    })
    
    set({ audioElement: audio })
  },

  setCurrentTrack: async (track, autoPlay = true) => {
    const { audioElement, initAudio } = get()
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

  nextTrack: () => {
    const { queue, queueIndex, shuffle, repeat } = get()
    if (queue.length === 0) return
    
    let nextIndex: number
    if (shuffle) {
      nextIndex = Math.floor(Math.random() * queue.length)
    } else {
      nextIndex = queueIndex + 1
      if (nextIndex >= queue.length) {
        if (repeat === 'all') {
          nextIndex = 0
        } else {
          set({ isPlaying: false })
          return
        }
      }
    }
    
    set({ queueIndex: nextIndex })
    get().setCurrentTrack(queue[nextIndex])
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

  playTrackFromQueue: (index) => {
    const { queue } = get()
    if (index >= 0 && index < queue.length) {
      set({ queueIndex: index })
      get().setCurrentTrack(queue[index])
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
    const { currentTrack, initAudio } = get()
    
    // Initialize audio element first
    initAudio()
    
    // If we have a saved track, just show it in the player UI
    // Don't try to load the stream - user will click play when ready
    if (currentTrack) {
      // Track is already in state from persist, just ensure UI shows it
      // Don't call setCurrentTrack - that would try to fetch stream
      set({ isLoading: false, error: null, isPlaying: false })
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
        shuffle: state.shuffle,
        repeat: state.repeat
      })
    }
  )
)

export type { Song }
