# Certificate endpoints (`/certificates`)

Source: `apps/api/src/routes/certificate.routes.ts`,
`apps/api/src/controllers/certificate.controller.ts`.
Back to the [index](README.md).

A certificate belongs to a provider. The image is optional.

| Method | Path                           | Guards                                  | Success           |
| ------ | ------------------------------ | --------------------------------------- | ----------------- |
| GET    | `/certificates/mine`           | provider                                | 200 Certificate[] |
| GET    | `/certificates?companyId=`     | provider, receiver                      | 200 Certificate[] |
| POST   | `/certificates`                | provider, `uploadImage('certImage')`    | 201 Certificate   |
| PATCH  | `/certificates/:certificateId` | auth, owner, `uploadImage('certImage')` | 200 Certificate   |
| DELETE | `/certificates/:certificateId` | auth, owner                             | 204               |

## GET /certificates/mine

The caller's own certificates, newest first.

```mermaid
sequenceDiagram
    autonumber
    actor C as Client
    participant G as requireAuth + requireRole(provider)
    participant Ctl as certificate.controller<br/>listMyCertificates
    participant DB as PostgreSQL

    C->>G: GET /certificates/mine
    alt not signed in
        G-->>C: 401
    else not a provider
        G-->>C: 403
    end
    G->>Ctl: req.auth.companyId
    Ctl->>DB: certificate.findMany (providerId = caller) by id desc
    Ctl-->>C: 200 Certificate[]
```

## GET /certificates?companyId=

One company's certificates, for its profile page. Unknown, deleted, or
non-provider companies give an empty list, not 404.

```mermaid
sequenceDiagram
    autonumber
    actor C as Client
    participant G as requireAuth + requireRole(provider, receiver)
    participant Ctl as certificate.controller<br/>listCompanyCertificates
    participant DB as PostgreSQL

    C->>G: GET /certificates?companyId
    G->>Ctl: next (401 / 403 as above)
    Ctl->>Ctl: parseQuery(certificateListQuerySchema)
    alt companyId missing or bad
        Ctl-->>C: 400 VALIDATION_FAILED
    end
    Ctl->>DB: certificate.findMany (providerId, company not deleted) by id desc
    Ctl-->>C: 200 Certificate[]
```

## POST /certificates

Multipart. With an image, the file is removed again if the row cannot be
created.

```mermaid
sequenceDiagram
    autonumber
    actor C as Client
    participant G as requireAuth + requireRole(provider) + uploadImage
    participant Ctl as certificate.controller<br/>createCertificate
    participant U as lib/upload<br/>saveWithUpload
    participant St as Supabase Storage<br/>CERTIFICATE bucket
    participant DB as PostgreSQL

    C->>G: POST /certificates (multipart)
    alt not signed in
        G-->>C: 401
    else not a provider
        G-->>C: 403
    else bad file
        G-->>C: 400 BAD_REQUEST
    end
    G->>Ctl: next
    Ctl->>Ctl: parseBody(createCertificateSchema)
    alt invalid body or expiry before issue
        Ctl-->>C: 400 VALIDATION_FAILED
    end
    alt image attached
        Ctl->>U: saveWithUpload(file, CERTIFICATE, certificates, create)
        U->>St: upload
        U->>DB: certificate.create (certImage = URL)
        alt write fails
            U->>St: remove new file
        end
    else no image
        Ctl->>DB: certificate.create (certImage = null)
    end
    Ctl-->>C: 201 Certificate
```

## PATCH /certificates/:certificateId

Owner only. The issue/expiry rule is checked on the merged old and new values.

```mermaid
sequenceDiagram
    autonumber
    actor C as Client
    participant G as requireAuth + uploadImage
    participant Ctl as certificate.controller<br/>updateCertificate
    participant L as lib/certificate
    participant U as lib/upload<br/>saveWithUpload
    participant St as Supabase Storage
    participant DB as PostgreSQL

    C->>G: PATCH /certificates/:certificateId (multipart)
    G->>Ctl: next (401 / 400 file errors)
    Ctl->>Ctl: parseParams, parseBody(updateCertificateSchema)
    Ctl->>Ctl: assertSomethingToUpdate(body, file)
    alt nothing to update
        Ctl-->>C: 400 Provide at least one field to update
    end
    Ctl->>L: assertCertificateOwned(certificateId, caller)
    L->>DB: certificate.findFirst (id, providerId)
    alt unknown or not the caller's
        L-->>C: 404 Certificate not found
    end
    Ctl->>Ctl: expiryIsOnOrAfterIssue(existing merged with body)
    alt expiry before issue
        Ctl-->>C: 400 VALIDATION_FAILED (expireYear)
    end
    alt new image sent
        Ctl->>U: saveWithUpload(file, ..., update, oldUrl)
        U->>St: upload new
        U->>DB: certificate.update
        U->>St: remove old (best effort)
    else text only
        Ctl->>DB: certificate.update
    end
    Ctl-->>C: 200 Certificate
```

## DELETE /certificates/:certificateId

Owner only. Hard delete, then remove the image file if any.

```mermaid
sequenceDiagram
    autonumber
    actor C as Client
    participant G as requireAuth
    participant Ctl as certificate.controller<br/>deleteCertificate
    participant L as lib/certificate
    participant DB as PostgreSQL
    participant St as Supabase Storage

    C->>G: DELETE /certificates/:certificateId
    G->>Ctl: req.auth (401 if not signed in)
    Ctl->>Ctl: parseParams(certificateIdParamSchema)
    Ctl->>L: assertCertificateOwned
    alt unknown or not the caller's
        L-->>C: 404 Certificate not found
    end
    Ctl->>DB: certificate.delete (id, providerId)
    alt gone in between
        Ctl-->>C: 404 Certificate not found
    end
    opt had an image
        Ctl->>St: removeFromStorageByUrl (best effort)
    end
    Ctl-->>C: 204
```
