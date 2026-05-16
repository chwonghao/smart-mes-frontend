import React from 'react';
import { useEffect, useState } from 'react';
import { Client } from '@stomp/stompjs';
import { Button, message, notification } from 'antd';
import SockJS from 'sockjs-client';

export const useWebSocket = (topic: string) => {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const wsUrl = import.meta.env.VITE_WS_URL || '/ws-mes';

  useEffect(() => {
    const client = new Client({
      webSocketFactory: () => new SockJS(wsUrl),
      
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
        const isMachineDown = newAlert?.type === 'MACHINE_DOWN' || newAlert?.alertType === 'MACHINE_DOWN';
        
        if (isMachineDown) {
          const notificationKey = `machine-down-${newAlert?.id ?? Date.now()}`;
          notification.error({
            key: notificationKey,
            message: 'SỰ CỐ MÁY NGHIÊM TRỌNG',
            description: newAlert.message || 'Một máy vừa chuyển trạng thái DOWN.',
            placement: 'bottomRight',
            duration: 0,
            btn: React.createElement(
              Button,
              {
                size: 'small',
                type: 'primary',
                onClick: () => notification.destroy(notificationKey),
              },
              'Đã đọc'
            ),
          });
        } else {
          message.warning({
            content: newAlert.message || 'Có thông báo mới!',
            duration: 5,
            style: { marginTop: '10vh' },
          });
        }

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
      if (client.active) {
        void client.deactivate();
      }
    };
  }, [topic, wsUrl]);

  const clearCount = () => setUnreadCount(0);

  return { notifications, unreadCount, clearCount };
};