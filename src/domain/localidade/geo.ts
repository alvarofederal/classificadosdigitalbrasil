// DOMÍNIO — distância entre coordenadas e a caixa do território brasileiro (feature 002: RF-41, RN-40, RN-41).

export interface Coordenada {
  latitude: number
  longitude: number
}

const RAIO_DA_TERRA_KM = 6371

/** Distância em km pela fórmula de Haversine. */
export function distanciaKm(a: Coordenada, b: Coordenada): number {
  const rad = (graus: number) => (graus * Math.PI) / 180
  const dLat = rad(b.latitude - a.latitude)
  const dLon = rad(b.longitude - a.longitude)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.latitude)) * Math.cos(rad(b.latitude)) * Math.sin(dLon / 2) ** 2
  return 2 * RAIO_DA_TERRA_KM * Math.asin(Math.min(1, Math.sqrt(h)))
}

/** Retângulo que contém o Brasil (com folga). Fora dele, não procuramos cidade (RN-41). */
export function dentroDoBrasil(c: Coordenada): boolean {
  return Number.isFinite(c.latitude) && Number.isFinite(c.longitude) && c.latitude >= -34.5 && c.latitude <= 6 && c.longitude >= -74.5 && c.longitude <= -28.5
}
