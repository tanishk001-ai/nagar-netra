// Wards under active NAKSHA change-detection monitoring this cycle.
// KLR-43 is the only ward with full footprint geometry seeded for the map view.
export const WARDS = [
  { id: 'KLR-43', name: 'Ward 43', locality: 'Kolar Road', mapped: true },
  { id: 'AYN-51', name: 'Ward 51', locality: 'Ayodhya Nagar', mapped: false },
  { id: 'BGS-38', name: 'Ward 38', locality: 'Bagsevania', mapped: false },
  { id: 'CNB-29', name: 'Ward 29', locality: 'Chuna Bhatti', mapped: false },
  { id: 'BGM-60', name: 'Ward 60', locality: 'Bagmugaliya', mapped: false },
  { id: 'SHP-17', name: 'Ward 17', locality: 'Shahpura', mapped: false },
]

export const wardById = (id) => WARDS.find((w) => w.id === id)

export const wardLabel = (id) => {
  const w = wardById(id)
  return w ? `${w.name} · ${w.locality}` : id
}
