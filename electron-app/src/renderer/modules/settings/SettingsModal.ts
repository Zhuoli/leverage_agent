/**
 * Settings Modal
 * Controls modal visibility and navigation between settings views
 */

export class SettingsModal {
    private modal: HTMLElement | null;

    constructor(modalId: string) {
        this.modal = document.getElementById(modalId);
    }

    /**
     * Open the settings modal
     */
    open(): void {
        // Wait for settings HTML to load if not already loaded
        const checkModal = setInterval(() => {
            this.modal = document.getElementById('settingsModal');
            if (this.modal) {
                clearInterval(checkModal);
                this.modal.classList.add('show');
                this.showView('mainSettingsView');
            }
        }, 100);
    }

    /**
     * Close the settings modal
     */
    close(): void {
        if (this.modal) {
            this.modal.classList.remove('show');
        }
    }

    /**
     * Show a specific settings view
     */
    showView(viewId: string): void {
        // Hide all views
        const views = document.querySelectorAll('.settings-view');
        views.forEach(view => view.classList.remove('active'));

        // Show selected view
        const selectedView = document.getElementById(viewId);
        if (selectedView) {
            selectedView.classList.add('active');
        }
    }

    /**
     * Navigate back to main settings view
     */
    back(): void {
        this.showView('mainSettingsView');
    }
}

// Expose to window for HTML onclick handlers
declare global {
    interface Window {
        openSettings: () => void;
        closeSettings: () => void;
        showSettingsView: (viewId: string) => void;
        backToMainSettings: () => void;
    }
}
