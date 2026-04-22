import { useEffect, useRef, useState, useCallback } from 'react'

const WS_BASE_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8000'

/**
 * Custom hook for WebSocket connections with automatic reconnection
 * 
 * @param {string} path - WebSocket path (e.g., '/ws/chat/case/<id>/')
 * @param {function} onMessage - Callback when message is received
 * @param {object} options - Additional options
 * @returns {object} - { send, isConnected, disconnect, reconnect }
 */
export function useWebSocket(path, onMessage, options = {}) {
  const {
    reconnect: shouldReconnect = true,
    reconnectInterval = 3000,
    reconnectAttempts = 5,
    onOpen,
    onClose,
    onError,
  } = options

  const ws = useRef(null)
  const reconnectTimeout = useRef(null)
  const reconnectCount = useRef(0)
  const [isConnected, setIsConnected] = useState(false)
  const [isReconnecting, setIsReconnecting] = useState(false)

  const connect = useCallback(() => {
    if (ws.current?.readyState === WebSocket.OPEN || ws.current?.readyState === WebSocket.CONNECTING) {
      return // Already connected or connecting
    }

    try {
      const token = localStorage.getItem('access_token')
      if (!token) {
        console.warn('No access token found for WebSocket connection')
        return
      }

      const url = `${WS_BASE_URL}${path}?token=${encodeURIComponent(token)}`
      console.log('🔌 Connecting to WebSocket:', path)

      ws.current = new WebSocket(url)

      ws.current.onopen = (event) => {
        console.log('✅ WebSocket connected:', path)
        setIsConnected(true)
        setIsReconnecting(false)
        reconnectCount.current = 0
        onOpen?.(event)
      }

      ws.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          onMessage?.(data)
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error)
        }
      }

      ws.current.onclose = (event) => {
        console.log('❌ WebSocket closed:', path, event.code, event.reason)
        setIsConnected(false)
        ws.current = null
        onClose?.(event)

        // Attempt to reconnect if enabled
        if (shouldReconnect && reconnectCount.current < reconnectAttempts) {
          reconnectCount.current += 1
          setIsReconnecting(true)
          console.log(`🔄 Reconnecting... (${reconnectCount.current}/${reconnectAttempts})`)

          reconnectTimeout.current = setTimeout(() => {
            connect()
          }, reconnectInterval)
        } else if (reconnectCount.current >= reconnectAttempts) {
          console.error('❌ Max reconnection attempts reached')
          setIsReconnecting(false)
        }
      }

      ws.current.onerror = (error) => {
        console.error('⚠️ WebSocket error:', path, error)
        onError?.(error)
      }
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error)
    }
  }, [path, onMessage, shouldReconnect, reconnectInterval, reconnectAttempts, onOpen, onClose, onError])

  const disconnect = useCallback(() => {
    console.log('🔌 Manually disconnecting WebSocket:', path)
    if (reconnectTimeout.current) {
      clearTimeout(reconnectTimeout.current)
    }
    if (ws.current) {
      ws.current.close()
      ws.current = null
    }
    setIsConnected(false)
    setIsReconnecting(false)
  }, [path])

  const send = useCallback((data) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      const payload = typeof data === 'string' ? data : JSON.stringify(data)
      ws.current.send(payload)
      return true
    } else {
      console.warn('Cannot send message, WebSocket not connected')
      return false
    }
  }, [])

  const reconnectManually = useCallback(() => {
    disconnect()
    reconnectCount.current = 0
    connect()
  }, [connect, disconnect])

  // Auto-connect on mount
  useEffect(() => {
    connect()

    // Cleanup on unmount
    return () => {
      if (reconnectTimeout.current) {
        clearTimeout(reconnectTimeout.current)
      }
      if (ws.current) {
        ws.current.close()
      }
    }
  }, [connect])

  return {
    send,
    isConnected,
    isReconnecting,
    disconnect,
    reconnect: reconnectManually,
  }
}

/**
 * Hook for chat WebSocket connections
 * 
 * @param {string} roomType - 'case' or 'booking'
 * @param {string} roomId - UUID of case or booking
 * @param {function} onMessage - Callback for incoming messages
 */
export function useChatWebSocket(roomType, roomId, onMessage) {
  const path = `/ws/chat/${roomType}/${roomId}/`
  
  return useWebSocket(path, onMessage, {
    reconnect: true,
    reconnectInterval: 3000,
    reconnectAttempts: 5,
  })
}

/**
 * Hook for notification WebSocket connection
 * 
 * @param {function} onNotification - Callback for incoming notifications
 */
export function useNotificationWebSocket(onNotification) {
  const path = '/ws/notifications/'
  
  return useWebSocket(path, onNotification, {
    reconnect: true,
    reconnectInterval: 5000,
    reconnectAttempts: 10,
  })
}
