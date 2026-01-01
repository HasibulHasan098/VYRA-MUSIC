import { useState, useRef, useEffect, ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useAppStore } from '../store/appStore'

interface TooltipProps {
  children: ReactNode
  text: string
  position?: 'top' | 'bottom' | 'left' | 'right'
  delay?: number
}

export default function Tooltip({ children, text, position = 'top', delay = 300 }: TooltipProps) {
  const { darkMode } = useAppStore()
  const [show, setShow] = useState(false)
  const [coords, setCoords] = useState({ x: 0, y: 0 })
  const triggerRef = useRef<HTMLDivElement>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleMouseEnter = () => {
    timeoutRef.current = setTimeout(() => {
      if (triggerRef.current) {
        const rect = triggerRef.current.getBoundingClientRect()
        let x = rect.left + rect.width / 2
        let y = rect.top

        switch (position) {
          case 'bottom':
            y = rect.bottom + 6
            break
          case 'left':
            x = rect.left - 6
            y = rect.top + rect.height / 2
            break
          case 'right':
            x = rect.right + 6
            y = rect.top + rect.height / 2
            break
          default: // top
            y = rect.top - 6
        }

        setCoords({ x, y })
        setShow(true)
      }
    }, delay)
  }

  const handleMouseLeave = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
    setShow(false)
  }

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  const getTransform = () => {
    switch (position) {
      case 'bottom':
        return 'translateX(-50%)'
      case 'left':
        return 'translateX(-100%) translateY(-50%)'
      case 'right':
        return 'translateY(-50%)'
      default: // top
        return 'translateX(-50%) translateY(-100%)'
    }
  }

  const tooltipElement = show ? (
    <div
      className={`fixed z-[99999] px-2.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap pointer-events-none
        shadow-lg border ios-blur
        ${darkMode 
          ? 'bg-gray-800/80 text-white border-white/10' 
          : 'bg-gray-900/80 text-white border-white/10'}`}
      style={{ 
        left: coords.x, 
        top: coords.y,
        transform: getTransform(),
        animation: 'tooltip-fade 150ms ease-out'
      }}
    >
      {text}
    </div>
  ) : null

  return (
    <>
      <div
        ref={triggerRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className="inline-flex"
      >
        {children}
      </div>
      {tooltipElement && createPortal(tooltipElement, document.body)}
    </>
  )
}
