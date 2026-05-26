import { useState, useCallback } from 'react'

export const useScrollToBottom = () => {
  const scrollRef = useState(null)

  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth',
      })
    }
  }, [])

  const scrollToBottomInstant = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [])

  return { scrollRef, scrollToBottom, scrollToBottomInstant }
}

export default useScrollToBottom
