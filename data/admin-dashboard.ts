export const adminDashboard = {
  administrator: { name: "Sergio Martínez", role: "Administrador" },
  metrics: [
    { label: "Sistemas registrados", value: "24", change: "+3 este mes" },
    { label: "Clientes activos", value: "21", change: "87.5% del total" },
    { label: "Servicios completados", value: "38", change: "+6 este mes" },
    { label: "Próximos servicios", value: "7", change: "Siguientes 90 días" },
  ],
  systems: [
    { id: "FV-0001", client: "Residencia Martínez", location: "Mérida, Yucatán", power: "8.68 kWp", nextService: "Agosto 2027", status: "Al corriente" },
    { id: "FV-0002", client: "Residencia Alcocer", location: "Mérida, Yucatán", power: "6.20 kWp", nextService: "Septiembre 2027", status: "Al corriente" },
    { id: "FV-0003", client: "Casa Rivera", location: "Progreso, Yucatán", power: "10.40 kWp", nextService: "15 días", status: "Próximo" },
    { id: "FV-0004", client: "Residencia Peón", location: "Mérida, Yucatán", power: "5.58 kWp", nextService: "Vencido", status: "Requiere atención" },
    { id: "FV-0005", client: "Casa Montejo", location: "Conkal, Yucatán", power: "12.10 kWp", nextService: "Octubre 2027", status: "Al corriente" },
  ],
  recentServices: [
    { date: "28 ago", system: "FV-0005", client: "Casa Montejo", type: "Mantenimiento preventivo", technician: "Carlos M." },
    { date: "22 ago", system: "FV-0002", client: "Residencia Alcocer", type: "Inspección eléctrica", technician: "Ana P." },
    { date: "14 ago", system: "FV-0001", client: "Residencia Martínez", type: "Mantenimiento preventivo", technician: "Carlos M." },
  ],
  clients: [
    { name: "Residencia Martínez", systems: 1, contact: "sergio@ejemplo.mx", lastService: "14 agosto 2026" },
    { name: "Residencia Alcocer", systems: 1, contact: "contacto@ejemplo.mx", lastService: "22 agosto 2026" },
    { name: "Casa Rivera", systems: 2, contact: "rivera@ejemplo.mx", lastService: "2 junio 2026" },
  ],
  documents: [
    { name: "Reporte preventivo FV-0005", system: "FV-0005", type: "Reporte", date: "28 agosto 2026" },
    { name: "Galería de servicio FV-0002", system: "FV-0002", type: "Fotografías", date: "22 agosto 2026" },
    { name: "Diagrama unifilar FV-0001", system: "FV-0001", type: "Técnico", date: "14 agosto 2026" },
  ],
} as const;

export type AdminDashboardData = typeof adminDashboard;
