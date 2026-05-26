import { useState, useCallback } from 'react'

export const useTypingAnimation = (speed = 30) => {
  const [displayedText, setDisplayedText] = useState('')
  const [isComplete, setIsComplete] = useState(false)

  const animate = useCallback((fullText) => {
    setDisplayedText('')
    setIsComplete(false)
    
    let index = 0
    const interval = setInterval(() => {
      if (index < fullText.length) {
        setDisplayedText(fullText.slice(0, index + 1))
        index++
      } else {
        clearInterval(interval)
        setIsComplete(true)
      }
    }, speed)

    return () => clearInterval(interval)
  }, [speed])

  return { displayedText, isComplete, animate, setDisplayedText, setIsComplete }
}

export default useTypingAnimation
