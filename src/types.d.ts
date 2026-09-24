export {}

declare global {
  interface Window {
    widgetAPI?: {
      moveWindowBy: (dx: number, dy: number) => void
    }
  }
}