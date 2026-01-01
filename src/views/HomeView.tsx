import { useEffect, useState } from 'react'
import { Loader2, RefreshCw, ChevronLeft, ChevronRight, Play, Music, Sparkles, MoreHorizontal } from 'lucide-react'
import { useAppStore } from '../store/appStore'
import { usePlayerStore, Song } from '../store/playerStore'
import { AlbumItem } from '../api/youtube'
import Tooltip from '../components/Tooltip'
import SongContextMenu from '../components/SongContextMenu'

export default function HomeView() {
  const { darkMode, homeSections, isLoadingHome, fetchHome, recommendations, fetchRecommendations } = useAppStore()
  const { setQueue, likedSongs, recentlyPlayed } = usePlayerStore()

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

  const isSong = (item: any): item is Song => 'artists' in item && 'id' in item && !('playlistId' in item)
  const isAlbum = (item: any): item is AlbumItem => 'playlistId' in item || ('id' in item && item.id?.startsWith('MPREb'))

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
          Welcome to Metrolist
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
        homeSections[0] && (
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
          icon={<Sparkles size={18} className="text-ios-purple" />}
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

      {/* Dynamic sections from API */}
      {homeSections.map((section, sectionIndex) => {
        const songs = section.items.filter(isSong)
        const albums = section.items.filter(isAlbum)

        // Skip first section if used as quick picks and no recent tracks
        if (sectionIndex === 0 && recentTracks.length === 0) {
          return null
        }

        // Albums section
        if (albums.length > 0) {
          return (
            <ScrollableSection 
              key={`${section.title}-${sectionIndex}`} 
              title={section.title}
              darkMode={darkMode}
            >
              {albums.slice(0, 12).map((album) => (
                <AlbumCardItem key={album.id} album={album} darkMode={darkMode} />
              ))}
            </ScrollableSection>
          )
        }

        // Songs section
        if (songs.length > 0) {
          return (
            <ScrollableSection 
              key={`${section.title}-${sectionIndex}`} 
              title={section.title}
              subtitle={`${songs.length} songs`}
              darkMode={darkMode}
            >
              {songs.slice(0, 12).map((track, idx) => (
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

        return null
      })}
    </div>
  )
}

// Quick Picks Grid - Compact horizontal list like YouTube Music
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

  return (
    <section>
      <h2 className={`text-fib-21 font-bold mb-fib-13 ${darkMode ? 'text-white' : 'text-black'}`}>
        {title}
      </h2>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-fib-8">
        {tracks.map((track, idx) => (
          <div
            key={`quick-${track.id}-${idx}`}
            onClick={() => handlePlay(idx)}
            className={`flex items-center gap-fib-8 p-fib-5 rounded-fib-8 cursor-pointer ios-active group
              ${darkMode ? 'bg-white/5 hover:bg-white/10' : 'bg-black/5 hover:bg-black/10'}`}
          >
            {imgErrors.has(track.id) ? (
              <div className="w-[48px] h-[48px] rounded-fib-5 bg-gradient-to-br from-ios-purple to-ios-blue flex items-center justify-center flex-shrink-0">
                <Music size={20} className="text-white/80" />
              </div>
            ) : (
              <img 
                src={track.thumbnail} 
                alt=""
                className="w-[48px] h-[48px] rounded-fib-5 object-cover flex-shrink-0"
                onError={() => setImgErrors(prev => new Set(prev).add(track.id))}
              />
            )}
            <div className="flex-1 min-w-0">
              <p className={`text-fib-13 font-medium truncate ${darkMode ? 'text-white' : 'text-black'}`}>
                {track.title}
              </p>
              <p className="text-fib-8 text-ios-gray truncate">
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
        <div className="relative mb-fib-8">
          {imgError ? (
            <div className="w-full aspect-square rounded-fib-8 bg-gradient-to-br from-ios-purple to-ios-blue flex items-center justify-center">
              <Music size={34} className="text-white/80" />
            </div>
          ) : (
            <img 
              src={track.thumbnail} 
              alt=""
              className={`w-full aspect-square rounded-fib-8 object-cover ${isActive ? 'ring-2 ring-ios-blue' : ''}`}
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
          <div className={`absolute inset-0 rounded-fib-8 bg-black/40 flex items-center justify-center ios-transition
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
