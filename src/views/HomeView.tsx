import { useEffect, useState } from 'react'
import { Loader2, RefreshCw, ChevronLeft, ChevronRight, Play, Music, MoreHorizontal, ListMusic } from 'lucide-react'
import { useAppStore } from '../store/appStore'
import { usePlayerStore, Song } from '../store/playerStore'
import { AlbumItem, PlaylistItem, ArtistItem } from '../api/youtube'
import Tooltip from '../components/Tooltip'
import SongContextMenu from '../components/SongContextMenu'

export default function HomeView() {
  const { darkMode, homeSections, isLoadingHome, fetchHome, recommendations, fetchRecommendations, openPlaylist, openArtist } = useAppStore()
  const { setQueue, likedSongs, recentlyPlayed } = usePlayerStore()
  const [favoriteArtistSongs, setFavoriteArtistSongs] = useState<{ artist: string; songs: Song[] }[]>([])

  useEffect(() => {
    if (homeSections.length === 0) {
      fetchHome()
    }
  }, [fetchHome, homeSections.length])

  // Fetch recommendations based on recently played
  useEffect(() => {
    if (recentlyPlayed.length > 0 && recommendations.length === 0) {
      const videoIds = recentlyPlayed.slice(0, 10).map(s => s.id)
      fetchRecommendations(videoIds)
    }
  }, [recentlyPlayed, recommendations.length, fetchRecommendations])

  // Analyze listening history to find favorite artists and fetch their songs
  const [hasFetchedFavorites, setHasFetchedFavorites] = useState(false)
  
  useEffect(() => {
    const analyzeFavorites = async () => {
      const allSongs = [...recentlyPlayed, ...likedSongs]
      if (allSongs.length < 5 || hasFetchedFavorites) return // Need some history first, and only fetch once
      
      setHasFetchedFavorites(true)
      
      // Count artist occurrences
      const artistCounts: Record<string, { name: string; count: number }> = {}
      for (const song of allSongs) {
        for (const artist of song.artists) {
          if (artist.name && artist.name !== 'Unknown Artist') {
            const key = artist.name.toLowerCase()
            if (!artistCounts[key]) {
              artistCounts[key] = { name: artist.name, count: 0 }
            }
            artistCounts[key].count++
          }
        }
      }
      
      // Get top 2 favorite artists
      const topArtists = Object.values(artistCounts)
        .sort((a, b) => b.count - a.count)
        .slice(0, 2)
      
      if (topArtists.length === 0) return
      
      // Fetch songs for each favorite artist
      const { youtube } = await import('../api/youtube')
      const results: { artist: string; songs: Song[] }[] = []
      
      for (const artist of topArtists) {
        try {
          const searchResult = await youtube.searchAll(`${artist.name} popular songs`)
          if (searchResult.songs.length > 0) {
            // Filter out songs already in history
            const existingIds = new Set(allSongs.map(s => s.id))
            const newSongs = searchResult.songs.filter(s => !existingIds.has(s.id))
            if (newSongs.length > 0) {
              results.push({ artist: artist.name, songs: newSongs.slice(0, 12) })
            }
          }
        } catch {
          // Silently fail
        }
      }
      
      if (results.length > 0) {
        setFavoriteArtistSongs(results) // Replace instead of append
      }
    }
    
    analyzeFavorites()
  }, [recentlyPlayed.length, likedSongs.length, hasFetchedFavorites])

  const isSong = (item: any): item is Song => 'artists' in item && 'id' in item && !('playlistId' in item) && !('subscribers' in item)
  const isAlbum = (item: any): item is AlbumItem => 'playlistId' in item && 'artists' in item
  const isPlaylist = (item: any): item is PlaylistItem => ('author' in item || 'songCount' in item) && !('artists' in item)
  const isArtist = (item: any): item is ArtistItem => 'subscribers' in item || ('name' in item && !('artists' in item) && !('title' in item))

  // Get recent tracks from recently played history
  const recentTracks = recentlyPlayed.slice(0, 8)

  if (isLoadingHome) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-fib-13">
        <Loader2 size={34} className="animate-spin text-ios-blue" />
        <p className="text-fib-13 text-ios-gray">Loading music...</p>
      </div>
    )
  }

  if (homeSections.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-fib-13">
        <p className={`text-fib-21 font-semibold ${darkMode ? 'text-white' : 'text-black'}`}>
          Welcome to VYRA
        </p>
        <p className="text-fib-13 text-ios-gray text-center max-w-sm">
          Unable to load content. Check your connection.
        </p>
        <Tooltip text="Refresh">
          <button 
            onClick={() => fetchHome()}
            className="flex items-center gap-fib-8 px-fib-21 py-fib-13 bg-ios-blue text-white rounded-fib-34 font-medium ios-active"
          >
            <RefreshCw size={18} />
            Try Again
          </button>
        </Tooltip>
      </div>
    )
  }

  return (
    <div className="space-y-fib-34">
      {/* Quick Picks Grid - Recently played or first songs */}
      {recentTracks.length > 0 ? (
        <QuickPicksGrid 
          title="Recently played" 
          tracks={recentTracks} 
          darkMode={darkMode}
          setQueue={setQueue}
        />
      ) : (
        // Show first section songs as quick picks if no recent
        homeSections[0] && homeSections[0].items.filter(isSong).length > 0 && (
          <QuickPicksGrid 
            title="Quick picks" 
            tracks={homeSections[0].items.filter(isSong).slice(0, 8)} 
            darkMode={darkMode}
            setQueue={setQueue}
          />
        )
      )}

      {/* Recommended for you - based on listening history (only show when loaded) */}
      {recommendations.length > 0 && (
        <ScrollableSection 
          title="Recommended for you"
          darkMode={darkMode}
        >
          {recommendations.slice(0, 12).map((track, idx) => (
            <SongCard 
              key={`rec-${track.id}`} 
              track={track} 
              allTracks={recommendations}
              index={idx}
              darkMode={darkMode}
            />
          ))}
        </ScrollableSection>
      )}

      {/* Liked Songs Section */}
      {likedSongs.length > 0 && (
        <ScrollableSection 
          title="Your liked songs" 
          subtitle={`${likedSongs.length} songs`}
          darkMode={darkMode}
        >
          {likedSongs.slice(0, 12).map((track, idx) => (
            <SongCard 
              key={`liked-${track.id}`} 
              track={track} 
              allTracks={likedSongs}
              index={idx}
              darkMode={darkMode}
            />
          ))}
        </ScrollableSection>
      )}

      {/* More from favorite artists - based on listening history */}
      {favoriteArtistSongs.map(({ artist, songs }) => (
        <ScrollableSection 
          key={`fav-${artist}`}
          title={`More from ${artist}`}
          darkMode={darkMode}
        >
          {songs.map((track, idx) => (
            <SongCard 
              key={`fav-${artist}-${track.id}`} 
              track={track} 
              allTracks={songs}
              index={idx}
              darkMode={darkMode}
            />
          ))}
        </ScrollableSection>
      ))}

      {/* Dynamic sections from API - Show ALL sections */}
      {homeSections.map((section, sectionIndex) => {
        const songs = section.items.filter(isSong)
        const albums = section.items.filter(isAlbum)
        const playlists = section.items.filter(isPlaylist)
        const artists = section.items.filter(isArtist)

        // Skip first section if used as quick picks and no recent tracks
        if (sectionIndex === 0 && recentTracks.length === 0 && songs.length > 0) {
          return null
        }

        // Every 3rd or 4th song section, show as compact grid instead of scrollable
        const showAsGrid = songs.length >= 6 && (sectionIndex % 4 === 2 || sectionIndex % 5 === 3)

        // Artists section
        if (artists.length > 0) {
          return (
            <ScrollableSection 
              key={`${section.title}-${sectionIndex}`} 
              title={section.title}
              darkMode={darkMode}
            >
              {artists.map((artist) => (
                <ArtistCardItem key={artist.id} artist={artist} darkMode={darkMode} onOpen={openArtist} />
              ))}
            </ScrollableSection>
          )
        }

        // Playlists section
        if (playlists.length > 0) {
          return (
            <ScrollableSection 
              key={`${section.title}-${sectionIndex}`} 
              title={section.title}
              darkMode={darkMode}
            >
              {playlists.map((playlist) => (
                <PlaylistCardItem key={playlist.id} playlist={playlist} darkMode={darkMode} onOpen={openPlaylist} />
              ))}
            </ScrollableSection>
          )
        }

        // Albums section
        if (albums.length > 0) {
          return (
            <ScrollableSection 
              key={`${section.title}-${sectionIndex}`} 
              title={section.title}
              darkMode={darkMode}
            >
              {albums.map((album) => (
                <AlbumCardItem key={album.id} album={album} darkMode={darkMode} />
              ))}
            </ScrollableSection>
          )
        }

        // Songs section - show as grid or scrollable based on position
        if (songs.length > 0) {
          if (showAsGrid) {
            return (
              <QuickPicksGrid
                key={`${section.title}-${sectionIndex}`}
                title={section.title}
                tracks={songs.slice(0, 8)}
                darkMode={darkMode}
                setQueue={setQueue}
              />
            )
          }
          return (
            <ScrollableSection 
              key={`${section.title}-${sectionIndex}`} 
              title={section.title}
              darkMode={darkMode}
            >
              {songs.map((track, idx) => (
                <SongCard 
                  key={track.id} 
                  track={track} 
                  allTracks={songs}
                  index={idx}
                  darkMode={darkMode}
                />
              ))}
            </ScrollableSection>
          )
        }

        // Mixed content - show all items
        if (section.items.length > 0) {
          return (
            <ScrollableSection 
              key={`${section.title}-${sectionIndex}`} 
              title={section.title}
              darkMode={darkMode}
            >
              {section.items.map((item: any, idx) => {
                if (isSong(item)) {
                  return <SongCard key={item.id} track={item} allTracks={songs} index={idx} darkMode={darkMode} />
                }
                if (isAlbum(item)) {
                  return <AlbumCardItem key={item.id} album={item} darkMode={darkMode} />
                }
                if (isPlaylist(item)) {
                  return <PlaylistCardItem key={item.id} playlist={item} darkMode={darkMode} onOpen={openPlaylist} />
                }
                if (isArtist(item)) {
                  return <ArtistCardItem key={item.id} artist={item} darkMode={darkMode} onOpen={openArtist} />
                }
                return null
              })}
            </ScrollableSection>
          )
        }

        return null
      })}
    </div>
  )
}

// Quick Picks Grid - Compact horizontal list like YouTube Music/Spotify
function QuickPicksGrid({ 
  title, 
  tracks, 
  darkMode,
  setQueue
}: { 
  title: string
  tracks: Song[]
  darkMode: boolean
  setQueue: (tracks: Song[], index: number) => void
}) {
  const [imgErrors, setImgErrors] = useState<Set<string>>(new Set())

  const handlePlay = (index: number) => {
    setQueue(tracks, index)
  }

  // Show up to 8 tracks in 2 rows
  const displayTracks = tracks.slice(0, 8)

  return (
    <section>
      <h2 className={`text-fib-21 font-bold mb-fib-13 ${darkMode ? 'text-white' : 'text-black'}`}>
        {title}
      </h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {displayTracks.map((track, idx) => (
          <div
            key={`quick-${track.id}-${idx}`}
            onClick={() => handlePlay(idx)}
            className={`flex items-center gap-3 pr-2 rounded-md cursor-pointer ios-active group overflow-hidden
              ${darkMode ? 'bg-white/10 hover:bg-white/20' : 'bg-black/5 hover:bg-black/10'}`}
          >
            {imgErrors.has(track.id) ? (
              <div className="w-12 h-12 bg-gradient-to-br from-ios-purple to-ios-blue flex items-center justify-center flex-shrink-0">
                <Music size={20} className="text-white/80" />
              </div>
            ) : (
              <div className="w-12 h-12 flex-shrink-0 overflow-hidden">
                <img 
                  src={`https://img.youtube.com/vi/${track.id}/hqdefault.jpg`} 
                  alt=""
                  className="w-full h-full object-cover scale-[1.35]"
                  onError={() => setImgErrors(prev => new Set(prev).add(track.id))}
                />
              </div>
            )}
            <div className="flex-1 min-w-0 py-2">
              <p className={`text-sm font-medium truncate ${darkMode ? 'text-white' : 'text-black'}`}>
                {track.title}
              </p>
              <p className="text-xs text-ios-gray truncate">
                {track.artists.map(a => a.name).join(', ')}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

// Scrollable Section with arrows
function ScrollableSection({ 
  title, 
  subtitle,
  darkMode, 
  icon,
  children 
}: { 
  title: string
  subtitle?: string
  darkMode: boolean
  icon?: React.ReactNode
  children: React.ReactNode 
}) {
  const [scrollRef, setScrollRef] = useState<HTMLDivElement | null>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(true)

  const checkScroll = () => {
    if (scrollRef) {
      setCanScrollLeft(scrollRef.scrollLeft > 0)
      setCanScrollRight(scrollRef.scrollLeft < scrollRef.scrollWidth - scrollRef.clientWidth - 10)
    }
  }

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef) {
      const scrollAmount = scrollRef.clientWidth * 0.8
      scrollRef.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      })
    }
  }

  useEffect(() => {
    checkScroll()
  }, [scrollRef, children])

  return (
    <section>
      <div className="flex items-center justify-between mb-fib-13">
        <div>
          {subtitle && (
            <p className="text-fib-8 text-ios-gray uppercase tracking-wider mb-fib-3">
              {subtitle}
            </p>
          )}
          <div className="flex items-center gap-fib-8">
            {icon}
            <h2 className={`text-fib-21 font-bold ${darkMode ? 'text-white' : 'text-black'}`}>
              {title}
            </h2>
          </div>
        </div>
        <div className="flex items-center gap-fib-5">
          <Tooltip text="Scroll left">
            <button 
              onClick={() => scroll('left')}
              disabled={!canScrollLeft}
              className={`w-8 h-8 rounded-full flex items-center justify-center ios-active disabled:opacity-30 border
                ${darkMode ? 'border-white/20 text-white' : 'border-black/20 text-black'}`}
            >
              <ChevronLeft size={18} />
            </button>
          </Tooltip>
          <Tooltip text="Scroll right">
            <button 
              onClick={() => scroll('right')}
              disabled={!canScrollRight}
              className={`w-8 h-8 rounded-full flex items-center justify-center ios-active disabled:opacity-30 border
                ${darkMode ? 'border-white/20 text-white' : 'border-black/20 text-black'}`}
            >
              <ChevronRight size={18} />
            </button>
          </Tooltip>
        </div>
      </div>

      <div 
        ref={setScrollRef}
        onScroll={checkScroll}
        className="flex gap-fib-13 overflow-x-auto scrollbar-hide pb-fib-5"
      >
        {children}
      </div>
    </section>
  )
}

// Song Card for horizontal scroll
function SongCard({ 
  track, 
  allTracks, 
  index, 
  darkMode 
}: { 
  track: Song
  allTracks: Song[]
  index: number
  darkMode: boolean 
}) {
  const { setQueue, currentTrack, isPlaying } = usePlayerStore()
  const isActive = currentTrack?.id === track.id
  const [imgError, setImgError] = useState(false)
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null)

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setContextMenu({ x: e.clientX, y: e.clientY })
  }

  const handleMoreClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    const rect = (e.target as HTMLElement).getBoundingClientRect()
    setContextMenu({ x: rect.left, y: rect.bottom + 5 })
  }

  return (
    <>
      <div 
        onClick={() => setQueue(allTracks, index)}
        onContextMenu={handleContextMenu}
        className="flex-shrink-0 w-[160px] cursor-pointer group"
      >
        <div className="relative mb-fib-8 bg-black/20 rounded-fib-8 overflow-hidden">
          {imgError ? (
            <div className="w-full aspect-square bg-gradient-to-br from-ios-purple to-ios-blue flex items-center justify-center">
              <Music size={34} className="text-white/80" />
            </div>
          ) : (
            <img 
              src={`https://img.youtube.com/vi/${track.id}/hqdefault.jpg`} 
              alt=""
              className={`w-full aspect-square object-cover scale-[1.35] ${isActive ? 'ring-2 ring-ios-blue ring-inset' : ''}`}
              onError={() => setImgError(true)}
            />
          )}
          {/* More button */}
          <button 
            className="absolute top-fib-5 right-fib-5 p-fib-5 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 ios-transition ios-active"
            onClick={handleMoreClick}
          >
            <MoreHorizontal size={16} className="text-white" />
          </button>
          {/* Play overlay */}
          <div className={`absolute inset-0 bg-black/40 flex items-center justify-center ios-transition
            ${isActive && isPlaying ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
            <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center">
              {isActive && isPlaying ? (
                <div className="flex items-center gap-0.5">
                  <span className="w-1 h-4 bg-black rounded-full animate-pulse" />
                  <span className="w-1 h-5 bg-black rounded-full animate-pulse" style={{ animationDelay: '75ms' }} />
                  <span className="w-1 h-3 bg-black rounded-full animate-pulse" style={{ animationDelay: '150ms' }} />
                </div>
              ) : (
                <Play size={24} fill="black" className="text-black ml-1" />
              )}
            </div>
          </div>
        </div>
        <p className={`text-fib-13 font-medium truncate ${isActive ? 'text-ios-blue' : darkMode ? 'text-white' : 'text-black'}`}>
          {track.title}
        </p>
        <p className="text-fib-13 text-ios-gray truncate">
          {track.artists.map(a => a.name).join(', ')}
        </p>
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <SongContextMenu
          track={track}
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => setContextMenu(null)}
        />
      )}
    </>
  )
}

// Album Card for horizontal scroll
function AlbumCardItem({ album, darkMode }: { album: AlbumItem; darkMode: boolean }) {
  const { openAlbum } = useAppStore()
  const [imgError, setImgError] = useState(false)

  return (
    <div 
      onClick={() => openAlbum(album.id)}
      className="flex-shrink-0 w-[160px] cursor-pointer group"
    >
      <div className="relative mb-fib-8">
        {imgError ? (
          <div className="w-full aspect-square rounded-fib-8 bg-gradient-to-br from-ios-orange to-ios-red flex items-center justify-center">
            <Music size={34} className="text-white/80" />
          </div>
        ) : (
          <img 
            src={album.thumbnail} 
            alt=""
            className="w-full aspect-square rounded-fib-8 object-cover"
            onError={() => setImgError(true)}
          />
        )}
        {/* Play overlay */}
        <div className="absolute inset-0 rounded-fib-8 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 ios-transition">
          <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center">
            <Play size={24} fill="black" className="text-black ml-1" />
          </div>
        </div>
      </div>
      <p className={`text-fib-13 font-medium truncate ${darkMode ? 'text-white' : 'text-black'}`}>
        {album.title}
      </p>
      <p className="text-fib-13 text-ios-gray truncate">
        {album.artists?.map(a => a.name).join(', ') || (album.year ? `Album • ${album.year}` : 'Album')}
      </p>
    </div>
  )
}

// Playlist Card for horizontal scroll
function PlaylistCardItem({ playlist, darkMode, onOpen }: { playlist: PlaylistItem; darkMode: boolean; onOpen: (id: string) => void }) {
  const [imgError, setImgError] = useState(false)

  return (
    <div 
      onClick={() => onOpen(playlist.id)}
      className="flex-shrink-0 w-[160px] cursor-pointer group"
    >
      <div className="relative mb-fib-8">
        {imgError ? (
          <div className="w-full aspect-square rounded-fib-8 bg-gradient-to-br from-ios-blue to-ios-purple flex items-center justify-center">
            <ListMusic size={34} className="text-white/80" />
          </div>
        ) : (
          <img 
            src={playlist.thumbnail} 
            alt=""
            className="w-full aspect-square rounded-fib-8 object-cover"
            onError={() => setImgError(true)}
          />
        )}
        {/* Play overlay */}
        <div className="absolute inset-0 rounded-fib-8 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 ios-transition">
          <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center">
            <Play size={24} fill="black" className="text-black ml-1" />
          </div>
        </div>
      </div>
      <p className={`text-fib-13 font-medium truncate ${darkMode ? 'text-white' : 'text-black'}`}>
        {playlist.title}
      </p>
      <p className="text-fib-13 text-ios-gray truncate">
        {playlist.author?.name || playlist.songCount || 'Playlist'}
      </p>
    </div>
  )
}

// Artist Card for horizontal scroll
function ArtistCardItem({ artist, darkMode, onOpen }: { artist: ArtistItem; darkMode: boolean; onOpen: (id: string) => void }) {
  const [imgError, setImgError] = useState(false)

  return (
    <div 
      onClick={() => onOpen(artist.id)}
      className="flex-shrink-0 w-[160px] cursor-pointer group"
    >
      <div className="relative mb-fib-8">
        {imgError ? (
          <div className="w-full aspect-square rounded-full bg-gradient-to-br from-ios-green to-ios-teal flex items-center justify-center">
            <Music size={34} className="text-white/80" />
          </div>
        ) : (
          <img 
            src={artist.thumbnail} 
            alt=""
            className="w-full aspect-square rounded-full object-cover"
            onError={() => setImgError(true)}
          />
        )}
        {/* Play overlay */}
        <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 ios-transition">
          <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center">
            <Play size={24} fill="black" className="text-black ml-1" />
          </div>
        </div>
      </div>
      <p className={`text-fib-13 font-medium truncate text-center ${darkMode ? 'text-white' : 'text-black'}`}>
        {artist.name}
      </p>
      <p className="text-fib-13 text-ios-gray truncate text-center">
        {artist.subscribers || 'Artist'}
      </p>
    </div>
  )
}
