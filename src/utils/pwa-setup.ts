/**
 * PWA Service Worker Setup
 * Xử lý đăng ký Service Worker, offline sync, và background tasks
 */

export const setupPWA = async () => {
  if (!('serviceWorker' in navigator)) {
    console.warn('Service Workers không được hỗ trợ trên trình duyệt này');
    return;
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
    });

    console.log('✅ Service Worker đã đăng ký thành công:', registration.scope);

    // Xử lý cập nhật service worker
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      if (!newWorker) return;

      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          // Có SW mới và SW cũ đang kiểm soát trang
          console.log('📦 Cập nhật PWA mới khả dụng');
          // Có thể hiển thị thông báo cho người dùng ở đây
          window.dispatchEvent(new CustomEvent('pwa-update-available'));
        }
      });
    });

    // Xử lý kiểm soát lại (controller change)
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      console.log('🔄 Service Worker đã được cập nhật');
      window.location.reload();
    });

    // Background Sync (nếu trình duyệt hỗ trợ)
    if ('SyncManager' in window) {
      registration.sync.register('offline-sync').catch((err) => {
        console.warn('❌ Không thể đăng ký Background Sync:', err);
      });
    }

    // Periodic Background Sync (nếu trình duyệt hỗ trợ)
    if ('periodicSync' in registration) {
      try {
        await registration.periodicSync.register('periodic-sync-offline-data', {
          minInterval: 24 * 60 * 60 * 1000, // 24 hours
        });
        console.log('⏱️ Periodic Sync đã đăng ký');
      } catch (err) {
        console.warn('❌ Periodic Sync không được phép:', err);
      }
    }

    // Push Notifications (nếu cần)
    if ('Notification' in window && 'permission' in Notification) {
      if (Notification.permission === 'default') {
        Notification.requestPermission().then((permission) => {
          if (permission === 'granted') {
            console.log('✅ Push notifications được phép');
          }
        });
      }
    }

    return registration;
  } catch (error) {
    console.error('❌ Lỗi đăng ký Service Worker:', error);
  }
};

/**
 * Kiểm tra trạng thái mạng và trigger offline sync nếu cần
 */
export const setupNetworkListeners = () => {
  window.addEventListener('online', async () => {
    console.log('📡 Mạng trở lại bình thường');
    window.dispatchEvent(new CustomEvent('app-online'));

    // Gợi ý đồng bộ dữ liệu offline
    const registration = await navigator.serviceWorker.ready;
    if ('sync' in registration) {
      registration.sync.register('offline-sync').catch((err) => {
        console.warn('❌ Lỗi trigger sync:', err);
      });
    }
  });

  window.addEventListener('offline', () => {
    console.log('📵 Mạng bị ngắt');
    window.dispatchEvent(new CustomEvent('app-offline'));
  });
};

/**
 * Kiểm tra xem app có đang chạy offline không
 */
export const isOffline = (): boolean => {
  return !navigator.onLine;
};

/**
 * Kiểm tra xem PWA đang chạy ở chế độ standalone không
 */
export const isPWAStandalone = (): boolean => {
  return (window.navigator as any).standalone === true ||
         window.matchMedia('(display-mode: standalone)').matches ||
         window.matchMedia('(display-mode: fullscreen)').matches;
};

/**
 * Lấy thông tin Service Worker hiện tại
 */
export const getServiceWorkerInfo = async () => {
  const registrations = await navigator.serviceWorker.getRegistrations();
  return registrations.map((reg) => ({
    scope: reg.scope,
    active: reg.active?.state,
    installing: reg.installing?.state,
    waiting: reg.waiting?.state,
  }));
};
