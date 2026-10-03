/** The URL pasted into OBS as a Browser Source (1920 x 1080). It needs no login. */
export const overlayUrl = (matchId: string) => `${window.location.origin}/overlay/${matchId}`
export const publicUrl = (matchId: string) => `${window.location.origin}/match/${matchId}`
