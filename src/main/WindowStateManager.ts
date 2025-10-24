import { BrowserWindow, screen } from 'electron';
import ElectronStore from 'electron-store';

interface WindowState {
  x?: number;
  y?: number;
  width: number;
  height: number;
  isMaximized: boolean;
}

interface StoreSchema {
  windowState: WindowState;
}

const DEFAULT_WIDTH = 1280;
const DEFAULT_HEIGHT = 800;

export class WindowStateManager {
  private store: ElectronStore<StoreSchema>;
  private window: BrowserWindow | null = null;
  private state: WindowState;

  constructor() {
    this.store = new ElectronStore<StoreSchema>({
      name: 'window-state',
      defaults: {
        windowState: {
          width: DEFAULT_WIDTH,
          height: DEFAULT_HEIGHT,
          isMaximized: false,
        },
      },
    });

    // Load saved state or use defaults
    this.state = (this.store as any).get('windowState');

    // Ensure the window is visible on screen
    this.ensureVisibleOnScreen();
  }

  private ensureVisibleOnScreen(): void {
    const { x, y, width, height } = this.state;
    
    if (x === undefined || y === undefined) {
      return;
    }

    const displays = screen.getAllDisplays();
    const isVisible = displays.some((display) => {
      const { x: dx, y: dy, width: dw, height: dh } = display.bounds;
      return (
        x >= dx &&
        y >= dy &&
        x + width <= dx + dw &&
        y + height <= dy + dh
      );
    });

    if (!isVisible) {
      // Reset position if window is not visible on any screen
      delete this.state.x;
      delete this.state.y;
    }
  }

  public getState(): WindowState {
    return { ...this.state };
  }

  public manage(window: BrowserWindow): void {
    this.window = window;

    // Restore maximized state
    if (this.state.isMaximized) {
      window.maximize();
    }

    // Track window state changes
    const saveBounds = () => {
      if (!this.window || this.window.isDestroyed()) {
        return;
      }

      if (!this.window.isMaximized() && !this.window.isMinimized()) {
        const bounds = this.window.getBounds();
        this.state = {
          x: bounds.x,
          y: bounds.y,
          width: bounds.width,
          height: bounds.height,
          isMaximized: false,
        };
      }
    };

    const saveMaximized = () => {
      if (!this.window || this.window.isDestroyed()) {
        return;
      }
      this.state.isMaximized = this.window.isMaximized();
    };

    // Save state on various events
    window.on('resize', saveBounds);
    window.on('move', saveBounds);
    window.on('maximize', saveMaximized);
    window.on('unmaximize', saveMaximized);

    // Save state before closing
    window.on('close', () => {
      saveBounds();
      saveMaximized();
      this.saveState();
    });
  }

  private saveState(): void {
    (this.store as any).set('windowState', this.state);
  }

  public unmanage(): void {
    if (this.window && !this.window.isDestroyed()) {
      this.window.removeAllListeners('resize');
      this.window.removeAllListeners('move');
      this.window.removeAllListeners('maximize');
      this.window.removeAllListeners('unmaximize');
      this.window.removeAllListeners('close');
    }
    this.window = null;
  }
}
