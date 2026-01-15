# TRLista2.0 — Firebase Auth + Roles + Aportes por usuario

## Qué cambia en esta versión
- **Login obligatorio** con Firebase Authentication (Email/Password).
- Roles por Firestore: `users/{uid}` con `role: "admin" | "user"`, `active: true|false`, `stores: []`.
- Guardado por usuario (sin choques):
  - `tr_lista_aportes/{storeKey__versionKey}/usuarios/{uid}/historial/{YYYY-MM-DD}`
- Histórico por día (flatpickr) marca días con guardado para **ese usuario**.

## Variables de entorno (Vercel)
- `GOOGLE_SHEETS_API_KEY`
- `GOOGLE_SHEETS_ID`
- `GOOGLE_SHEETS_RANGE` (opcional; default `bd!A2:D5000`)
- `GOOGLE_SHEETS_SHEET_ID` (opcional para proveedores)
- `GOOGLE_SHEETS_PROV_RANGE` (opcional; default `proveedores!C2:C1000`)

## Configuración de usuarios
1) En Firebase Console > Authentication: crea usuarios (Email/Password).
2) En Firestore: crea doc `users/{uid}` por cada usuario.

Ejemplo:
```json
{
  "email": "usuario@correo.com",
  "displayName": "Nombre",
  "role": "user",
  "active": true,
  "stores": ["lista_avenida_morazan","lista_sexta_calle","lista_centro_comercial"]
}
```

> Si `stores` está vacío o no existe, el usuario podrá usar las 3 tiendas por defecto.

## Firestore Rules recomendadas (base)
Pega y ajusta en **Firestore Rules**:

```js
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    function signedIn() { return request.auth != null; }
    function myUser() {
      return get(/databases/$(database)/documents/users/$(request.auth.uid));
    }
    function isActive() { return signedIn() && myUser().data.active == true; }
    function isAdmin()  { return isActive() && myUser().data.role == "admin"; }

    match /users/{uid} {
      allow read: if signedIn() && request.auth.uid == uid;
      allow write: if isAdmin();
    }

    match /tr_lista_aportes/{storeListId}/usuarios/{uid}/historial/{day} {
      allow read: if isActive() && (isAdmin() || request.auth.uid == uid);
      allow write: if isActive() && request.auth.uid == uid;
    }

    // (Futuro) Consolidado del admin
    match /tr_lista_consolidado/{storeListId}/historial/{day} {
      allow read: if isActive();
      allow write: if isAdmin();
    }
  }
}
```

## Nota
- `assets/img/trlogo.png` está como placeholder en este ZIP.
