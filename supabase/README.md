# Conexión de solicitudes del portal

Esquema confirmado con el CSV del usuario: `Clientes`, `Sistemas`, `Maintainance`, `Documentos`.
Se conservan sus nombres exactos; no se modifican ni se publican datos de `Clientes`.

## Flujo implementado

Formulario → `/api/client-requests` → RPC `submit_client_request` → `client_requests`.
La función busca `Sistemas.system_code` (por ejemplo `FV-0001`) y vincula la solicitud
con `Sistemas.id` mediante `system_record_id`. Debe existir exactamente un sistema con ese código.

| Formulario | Parámetro RPC | Columna de solicitud |
| --- | --- | --- |
| Sistema | p_system_code | system_id + system_record_id resuelto en SQL |
| Solicitud / falla | p_request_type | request_type |
| Nombre | p_customer_name | customer_name |
| Teléfono | p_phone | phone |
| Correo opcional | p_email | email |
| Comentarios | p_message | message |
| Fecha preferida | p_preferred_date | preferred_date |

El nombre, teléfono y correo son datos de contacto de la solicitud: no crean ni sobrescriben
`Clientes.full_name`, `Clientes.phone` o `Clientes.email`. Una solicitud tampoco crea
un registro en `Maintainance`: esa tabla es para los servicios documentados.

## Activación

1. Ejecutar `migrations/202609020001_create_client_requests.sql` en SQL Editor de Supabase.
   El script agrega una tabla y una función; no inserta clientes ni solicitudes de prueba.
2. Verificar en Table Editor que `Sistemas` tenga una sola fila con `system_code = FV-0001`.
3. Configurar `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   en `.env.local` y también en el entorno Preview de Vercel antes de desplegar.
4. Reiniciar el servidor local. Probar el formulario y comprobar su folio en `client_requests`.

## Límites actuales

- La clave pública solo ejecuta la función de envío; no permite consultar solicitudes.
- La función valida el sistema y los campos, y frena envíos repetidos con el mismo teléfono
  al mismo sistema durante cinco minutos. Esto no reemplaza protección antibots completa.
- Las políticas de lectura/cambio de estado exigen `app_metadata.role = admin`.
  La autenticación y la bandeja de solicitudes del panel todavía deben implementarse.
- Los expedientes, historial y documentos visibles siguen siendo mock: no se leen ni se
  exponen automáticamente las cuatro tablas privadas con esta integración.
- Antes de uso con clientes reales: revisar RLS de las tablas existentes, acceso al expediente
  (el código secuencial no es un secreto), aviso de privacidad y protección contra abuso.

No colocar claves `service_role` o `sb_secret_...` en el frontend ni en Git.
