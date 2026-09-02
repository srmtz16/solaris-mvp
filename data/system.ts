export const system = {
  id: "FV-0001",
  installedPower: "8.68 kWp",
  installationDate: "Mayo 2026",
  lastMaintenance: "14 agosto 2026",
  nextMaintenance: "Agosto 2027",
  maintenanceHistory: [
    {
      date: "14/08/2026",
      type: "Mantenimiento preventivo",
      status: "Completado",
      technician: "Equipo Solaris",
      hasReport: true,
      hasPhotos: true,
      hasObservations: true,
    },
    {
      date: "03/02/2027",
      type: "Inspección eléctrica",
      status: "Completado",
      technician: "Equipo Solaris",
      hasReport: true,
      hasPhotos: true,
      hasObservations: true,
    },
  ],
  documents: [
    { name: "Ficha técnica", type: "PDF" },
    { name: "Reporte de mantenimiento", type: "PDF" },
    { name: "Fotografías", type: "Galería" },
    { name: "Diagrama unifilar", type: "PDF" },
    { name: "Documentación adicional", type: "Archivo" },
  ],
  observations: [
    "Se realizó inspección visual, limpieza general y revisión de conexiones accesibles.",
    "Se recomienda realizar nuevamente mantenimiento preventivo en agosto de 2027.",
  ],
} as const;

export type SolarSystem = typeof system;
