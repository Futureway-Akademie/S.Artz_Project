/** Browser-Push über den eigenen Service Worker (Erinnerungen ohne Inhalte) */
const VAPID = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined

export interface PushApi {
  unterstuetzt: boolean
  /** Berechtigung anfragen und beim Push-Dienst des Browsers abonnieren */
  abonnieren: () => Promise<{ endpoint: string; p256dh: string; auth: string }>
  abbestellen: () => Promise<string | null>
}

function base64UrlZuBytes(text: string): Uint8Array<ArrayBuffer> {
  const b64 = (text + '='.repeat((4 - (text.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/')
  const roh = atob(b64)
  return Uint8Array.from(roh, (c) => c.charCodeAt(0))
}

export const browserPush: PushApi = {
  unterstuetzt: typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window && Boolean(VAPID),
  async abonnieren() {
    if ((await Notification.requestPermission()) !== 'granted') throw new Error('Benachrichtigungen wurden nicht erlaubt.')
    const reg = await navigator.serviceWorker.ready
    const abo = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: base64UrlZuBytes(VAPID!) })
    const json = abo.toJSON()
    return { endpoint: abo.endpoint, p256dh: json.keys?.p256dh ?? '', auth: json.keys?.auth ?? '' }
  },
  async abbestellen() {
    const reg = await navigator.serviceWorker.ready
    const abo = await reg.pushManager.getSubscription()
    if (!abo) return null
    await abo.unsubscribe()
    return abo.endpoint
  },
}

