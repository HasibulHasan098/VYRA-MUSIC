import { useState } from 'react'

interface ArtistAvatarProps {
  name: string
  thumbnail?: string
  size?: number
  className?: string
}

// Generate a consistent color based on the name
const getColorFromName = (name: string): string => {
  const colors = [
    'bg-red-500', 'bg-orange-500', 'bg-amber-500', 'bg-yellow-500',
    'bg-lime-500', 'bg-green-500', 'bg-emerald-500', 'bg-teal-500',
    'bg-cyan-500', 'bg-sky-500', 'bg-blue-500', 'bg-indigo-500',
    'bg-violet-500', 'bg-purple-500', 'bg-fuchsia-500', 'bg-pink-500',
  ]
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return colors[Math.abs(hash) % colors.length]
}

// Get initials from name (max 2 characters)
const getInitials = (name: string): string => {
  const words = name.trim().split(/\s+/)
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase()
  }
  return name.slice(0, 2).toUpperCase()
}

export default function ArtistAvatar({ name, thumbnail, size = 89, className = '' }: ArtistAvatarProps) {
  const [imgError, setImgError] = useState(false)
  const [imgLoaded, setImgLoaded] = useState(false)

  const showFallback = !thumbnail || imgError

  const sizeClass = size === 89 ? 'w-fib-89 h-fib-89' : 
                    size === 144 ? 'w-fib-144 h-fib-144' :
                    size === 55 ? 'w-fib-55 h-fib-55' : 'w-fib-89 h-fib-89'

  const textSize = size >= 144 ? 'text-fib-55' : 
                   size >= 89 ? 'text-fib-34' : 'text-fib-21'

  if (showFallback) {
    return (
      <div 
        className={`${sizeClass} rounded-full flex items-center justify-center ${getColorFromName(name)} ${className}`}
      >
        <span className={`${textSize} font-bold text-white`}>
          {getInitials(name)}
        </span>
      </div>
    )
  }

  return (
    <div className={`${sizeClass} rounded-full overflow-hidden ${className} relative`}>
      {/* Fallback shown while loading */}
      {!imgLoaded && (
        <div 
          className={`absolute inset-0 rounded-full flex items-center justify-center ${getColorFromName(name)}`}
        >
          <span className={`${textSize} font-bold text-white`}>
            {getInitials(name)}
          </span>
        </div>
      )}
      <img 
        src={thumbnail} 
        alt={name}
        className={`w-full h-full object-cover ${imgLoaded ? 'opacity-100' : 'opacity-0'}`}
        onError={() => setImgError(true)}
        onLoad={() => setImgLoaded(true)}
      />
    </div>
  )
}
