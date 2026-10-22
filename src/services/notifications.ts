/**
 * Reminders & Web Push Notification Service (Section 10)
 */

export async function requestNotificationPermission(): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false;
  }

  try {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  } catch (err) {
    console.warn('Notification permission error:', err);
    return false;
  }
}

export function isNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export function getNotificationPermissionStatus(): NotificationPermission | 'unsupported' {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  return Notification.permission;
}

export function sendBrowserNotification(title: string, options?: NotificationOptions) {
  if (!isNotificationSupported() || Notification.permission !== 'granted') {
    return;
  }

  try {
    const notif = new Notification(title, {
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      ...options,
    });

    notif.onclick = () => {
      window.focus();
      notif.close();
    };
  } catch (err) {
    console.warn('Could not display Notification directly:', err);
  }
}

export function playChime() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15); // A5

    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.35);
  } catch {
    // Audio might be blocked by browser policy until user interaction
  }
}
