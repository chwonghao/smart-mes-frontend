import { useEffect, useState } from 'react';
import { Client } from '@stomp/stompjs';
import { message } from 'antd';
import SockJS from 'sockjs-client';

export const useWebSocket = (topic: string) => {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const client = new Client({
      webSocketFactory: () => new SockJS(import.meta.env.VITE_WS_URL),
      
      // HttpOnly cookie sẽ tự động được gửi qua SockJS
      // Không cần set Authorization header nữa
      connectHeaders: {},
      
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
      
      debug: () => {}, 
    });

    client.onConnect = () => {
      // Đăng ký nhận tin từ topic (ví dụ: /topic/alerts)
      client.subscribe(topic, (msg) => {
        const newAlert = JSON.parse(msg.body);
        
        // Hiển thị thông báo Toast nhanh trên màn hình
        message.warning({
          content: newAlert.message || 'Có thông báo mới!',
          duration: 5,
          style: { marginTop: '10vh' },
        });

        // Cập nhật vào danh sách thông báo trên chuông
        setNotifications((prev) => [newAlert, ...prev]);
        setUnreadCount((count) => count + 1);
      });
    };

    client.onStompError = (frame) => {
      console.error('Lỗi WebSocket Backend:', frame.headers['message']);
    };

    client.activate();

    return () => {  
      setTimeout(() => {
        if (client.active) {
          client.deactivate();
        }
      }, 100);
    };
  }, [topic]);

  const clearCount = () => setUnreadCount(0);

  return { notifications, unreadCount, clearCount };
};