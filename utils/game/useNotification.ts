/**
 * Toast notification composable.
 *
 * Manages a single notification toast with auto-fade and slide animation.
 * Extracted from the game store to be reusable across contexts.
 */
import { ref } from 'vue';
import type { Notification } from '~/utils/types';

function makeEmptyNotification(): Notification {
    return {
        show: false,
        fading: false,
        message: '',
        top: 0,
        timeout: 0,
        fadeTimeout: 0,
        slideInterval: 0,
    };
}

export function useNotification() {
    const notification = ref<Notification>(makeEmptyNotification());

    function showNotification(message: string, duration = 3): void {
        if (!import.meta.client) return;

        // Clear any existing notification timers
        if (notification.value.show) {
            clearTimeout(notification.value.timeout);
            clearTimeout(notification.value.fadeTimeout);
            clearInterval(notification.value.slideInterval);
        }

        notification.value.show = true;
        notification.value.fading = false;
        notification.value.message = message;
        notification.value.top = 0;

        notification.value.timeout = window.setTimeout(() => {
            notification.value.fading = true;
            notification.value.fadeTimeout = window.setTimeout(() => {
                notification.value.show = false;
                notification.value.fading = false;
            }, 300);
        }, duration * 1000);

        notification.value.slideInterval = window.setInterval(() => {
            notification.value.top += 1;
            if (notification.value.top > 50) {
                clearInterval(notification.value.slideInterval);
            }
        }, 2);
    }

    return { notification, showNotification };
}
