# Alta de una barbería con revisión previa

Para quien construye la app. Con `barbershops.require_review = true` (activo en `charles`), una barbería nueva no es pública hasta que soporte la aprueba. Referencia del backend: CLAUDE.md §4.1 y §8, "Alta con revisión previa".

## Estados

```
DRAFT ──enviar──▶ PENDING_REVIEW ──aprobar──▶ OPEN
                    │ pedir cambios (motivo)
                    ▼
             CHANGES_REQUESTED ──reenviar──▶ PENDING_REVIEW
```

| Estado              | Qué ve el dueño                                   | Público |
| ------------------- | ------------------------------------------------- | ------- |
| `DRAFT`             | "Completa los datos y envíala a revisión"         | No      |
| `PENDING_REVIEW`    | "En revisión desde {fecha}"                       | No      |
| `CHANGES_REQUESTED` | El motivo (`reviewNotes`) y "Corregir y reenviar" | No      |
| `OPEN`              | Barbería publicada                                | Sí      |

En cualquiera de esos estados el dueño ya puede configurar todo: servicios, barberos, horarios y bloqueos. Solo no aparece en búsquedas, ficha pública ni disponibilidad, y no recibe reservas.

## Flujo en la app

1. **Crear:** `POST /barbershops` (o `POST /barbershops/independent` para el barbero independiente). Puedes enviar el documento en el mismo alta:

   ```json
   { "...": "datos de la barbería", "ownerDocument": { "type": "RUC", "number": "20100047218" } }
   ```

   - Con documento (y sin otros faltantes) nace en `PENDING_REVIEW`; sin él, en `DRAFT`.
   - `type`: `RUC` (11 dígitos, prefijo 10, 15, 17 o 20 y dígito verificador módulo 11) o `DNI` (8 dígitos).
   - `number`: el contrato publica `pattern: ^\d{8}(\d{3})?$` (envía solo dígitos); la `description` trae el cálculo del dígito verificador para validarlo en la app. El backend lo vuelve a validar.

2. **Estado de la revisión:** `GET /barbershops/{id}/review` devuelve:
   - `status`;
   - `missingRequirements`: `OWNER_DOCUMENT` y `PHOTO` (la portada; activo en `charles`, ver `IMAGENES.md`);
   - `canSubmit`;
   - `reviewNotes`: el motivo de los cambios pedidos;
   - `submittedAt`;
   - `submissions`: el historial.
3. **Documento:** `PUT /barbershops/{id}/owner-document` con `{ type, number }`. Solo el OWNER. La respuesta lo trae enmascarado (`ownerDocument: { type, masked: "********218" }`); el MANAGER recibe `ownerDocument: null`.
4. **Enviar o reenviar:** `POST /barbershops/{id}/review/submit` (solo OWNER, desde `DRAFT` o `CHANGES_REQUESTED`).
   - Si falta algo: 409 `REVIEW_REQUIREMENTS_MISSING`, con `details: [{ requirement }]`.
   - Si ya está en revisión: 409 `STATUS_CHANGE_NOT_ALLOWED`.
5. **Aviso:** al aprobarse (`BARBERSHOP_APPROVED`) o al pedirse cambios (`BARBERSHOP_CHANGES_REQUESTED`), OWNER y MANAGER reciben push, bandeja y correo. El push no trae el motivo; la bandeja y el correo, sí. `resource` es `{ type: "barbershop", id }`.

## Después de aprobada

- Cambiar el documento no la oculta: sigue visible y soporte la revisa después.
- Cambiar nombre, dirección u otros datos no la devuelve a revisión.

## Códigos nuevos

| Código                                                 | HTTP | Cuándo                                                       |
| ------------------------------------------------------ | ---- | ------------------------------------------------------------ |
| `REVIEW_REQUIREMENTS_MISSING`                          | 409  | Falta algo para enviar (`details[].requirement`).            |
| `VALIDATION_ERROR` con `field: "ownerDocument.number"` | 400  | RUC o DNI inválido (incluido el dígito verificador del RUC). |
