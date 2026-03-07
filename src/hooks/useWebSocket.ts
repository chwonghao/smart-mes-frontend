import { useEffect, useState } from 'react';
import { Client } from '@stomp/stompjs';
import { message } from 'antd';
import SockJS from 'sockjs-client';


export const useWebSocket = (topic: string) => {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const client = new Client({
      // brokerURL: 'ws://localhost:8080/ws', // Địa chỉ WebSocket Backend của bạn
      webSocketFactory: () => new SockJS('http://localhost:8080/ws-mes'),
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
    });

    client.onConnect = () => {
      
      // Đăng ký nhận tin từ topic (ví dụ: /topic/alerts)
      client.subscribe(topic, (msg) => {
        const newAlert = JSON.parse(msg.body);
        
        // 1. Hiển thị thông báo Toast nhanh trên màn hình
        message.warning({
          content: newAlert.message,
          duration: 5,
          style: { marginTop: '10vh' },
        });

        // 2. Cập nhật vào danh sách thông báo
        setNotifications((prev) => [newAlert, ...prev]);
        setUnreadCount((count) => count + 1);
      });
    };

    client.onStompError = (frame) => {
      console.error('Lỗi WebSocket:', frame.headers['message']);
    };

    client.activate();

    return () => {
      client.deactivate();
    };
  }, [topic]);

  const clearCount = () => setUnreadCount(0);

  return { notifications, unreadCount, clearCount };
};