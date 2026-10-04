export {}

declare global {
  interface Window {
    widgetAPI?: {
      moveWindowBy: (dx: number, dy: number) => void
      sendMediaControl: (action: 'playpause' | 'next' | 'prev') => void
      onLiveMediaUpdate: (callback: (data: { title: string; artist: string; app?: string; status?: string }) => void) => () => void
      syncSettings: (settings: unknown) => void
      onSettingsSync: (callback: (settings: unknown) => void) => () => void
      getAutoStart: () => Promise<boolean>
      setAutoStart: (enabled: boolean) => Promise<boolean>
    }
  }
}