import { useEffect, useRef } from 'react';
import { useAuth } from '../../features/authentication/AuthProvider';

export function useWebSocket(onNotificationReceived) {
  const { user } = useAuth();
  const wsRef = useRef(null);
  const reconnectTimerRef = useRef(null);

  useEffect(() => {
    if (!user || (!user.userId && !user.id)) return;
    const userId = user.userId || user.id;
    const token = localStorage.getItem('access_token') || '';

    // Determine WebSocket target URL
    let wsUrl = '';
    const apiBase = import.meta.env.VITE_API_BASE_URL;
    if (apiBase && apiBase.startsWith('http')) {
      const wsProto = apiBase.startsWith('https') ? 'wss:' : 'ws:';
      const cleanHost = apiBase.replace(/^https?:\/\//, '');
      wsUrl = `${wsProto}//${cleanHost}/ws/websocket`;
    } else {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      wsUrl = `${protocol}//${window.location.host}/ws/websocket`;
    }

    let socket = null;

    const connect = () => {
      try {
        socket = new WebSocket(wsUrl);
        wsRef.current = socket;

        socket.onopen = () => {
          const connectFrame = `CONNECT\naccept-version:1.1,1.0\nheart-beat:10000,10000\nuserId:${userId}\nAuthorization:Bearer ${token}\n\n\0`;
          socket.send(connectFrame);
        };

        socket.onmessage = (event) => {
          const msg = event.data;
          if (msg.startsWith('CONNECTED')) {
            const subFrame = `SUBSCRIBE\nid:sub-0\ndestination:/user/queue/notifications\n\n\0`;
            socket.send(subFrame);
          } else if (msg.startsWith('MESSAGE')) {
            const bodyIdx = msg.indexOf('\n\n');
            if (bodyIdx !== -1) {
              const bodyStr = msg.substring(bodyIdx + 2, msg.length - 1).trim();
              try {
                const data = JSON.parse(bodyStr);
                if (onNotificationReceived) {
                  onNotificationReceived(data);
                }
              } catch (err) {
                console.error('Failed to parse STOMP notification body:', err);
              }
            }
          }
        };

        socket.onerror = (err) => {
          console.warn('STOMP WebSocket connection error:', err);
        };

        socket.onclose = () => {
          // Attempt auto-reconnect after 5 seconds if component is still mounted
          reconnectTimerRef.current = setTimeout(() => {
            if (user) {
              connect();
            }
          }, 5000);
        };
      } catch (e) {
        console.warn('WebSocket init failed:', e);
      }
    };

    connect();

    return () => {
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
      }
      if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
        socket.close();
      }
    };
  }, [user]);
}
