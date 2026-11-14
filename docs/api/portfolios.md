# Portfolio endpoints (`/portfolios`)

Source: `apps/api/src/routes/portfolio.routes.ts`,
`apps/api/src/controllers/portfolio.controller.ts`.
Back to the [index](README.md).

A portfolio item belongs to one service. The two GETs are public: no token.

| Method | Path                       | Guards                                       | Success                |
| ------ | -------------------------- | -------------------------------------------- | ---------------------- |
| GET    | `/portfolios`              | public                                       | 200 ServicePortfolio[] |
| GET    | `/portfolios/:portfolioId` | public                                       | 200 ServicePortfolio   |
| POST   | `/portfolios`              | provider, `uploadImage('portfolioImage')`    | 201 ServicePortfolio   |
| PATCH  | `/portfolios/:portfolioId` | auth, owner, `uploadImage('portfolioImage')` | 200 ServicePortfolio   |
| DELETE | `/portfolios/:portfolioId` | auth, owner                                  | 204                    |

## UML API Diagram

![UML API Diagram: portfolios](uml/portfolios.svg)

Source: [uml/portfolios.puml](uml/portfolios.puml). REST profile notation, see the [index](README.md#uml-api-diagram). Status codes, parameters and bodies are in the OpenAPI docs at `/api-docs`.

The sections below add one sequence diagram per endpoint: the steps inside the server.

## GET /portfolios

Public. The portfolios of one service, one company, or both. With neither
filter the schema answers 400.

```mermaid
sequenceDiagram
    autonumber
    actor C as Client
    participant Ctl as portfolio.controller<br/>listPortfolios
    participant DB as PostgreSQL

    C->>Ctl: GET /portfolios?serviceId&companyId
    Ctl->>Ctl: parseQuery(portfolioQuerySchema)
    alt neither filter, or bad id
        Ctl-->>C: 400 VALIDATION_FAILED
    end
    Ctl->>DB: servicePortfolio.findMany (listingId?, service.listing.companyId?) by developmentDate desc
    Ctl-->>C: 200 ServicePortfolio[]
```

## GET /portfolios/:portfolioId

Public. One portfolio item.

```mermaid
sequenceDiagram
    autonumber
    actor C as Client
    participant Ctl as portfolio.controller<br/>getPortfolio
    participant DB as PostgreSQL

    C->>Ctl: GET /portfolios/:portfolioId
    Ctl->>Ctl: parseParams(portfolioIdParamSchema)
    Ctl->>DB: servicePortfolio.findUnique
    alt no row
        Ctl-->>C: 404 Portfolio not found
    end
    Ctl-->>C: 200 ServicePortfolio
```

## POST /portfolios

Multipart: text fields plus one required image. The service must be the
caller's. The image is uploaded only after that check.

```mermaid
sequenceDiagram
    autonumber
    actor C as Client
    participant G as requireAuth + requireRole(provider) + uploadImage
    participant Ctl as portfolio.controller<br/>createPortfolio
    participant L as lib/listing
    participant U as lib/upload<br/>saveWithUpload
    participant St as Supabase Storage<br/>PORTFOLIO bucket
    participant DB as PostgreSQL

    C->>G: POST /portfolios (multipart)
    alt not signed in
        G-->>C: 401
    else not a provider
        G-->>C: 403
    else bad file type or over 5MB
        G-->>C: 400 BAD_REQUEST
    end
    G->>Ctl: next
    Ctl->>Ctl: parseBody(createPortfolioSchema), requireFile(portfolioImage)
    alt invalid body or no image
        Ctl-->>C: 400 VALIDATION_FAILED
    end
    Ctl->>L: assertListingOwned(serviceId, SERVICE, caller)
    alt unknown service
        L-->>C: 404
    else another company's service
        L-->>C: 403
    end
    Ctl->>U: saveWithUpload(file, PORTFOLIO, portfolios, create)
    U->>St: upload
    U->>DB: servicePortfolio.create (connect service)
    alt write fails
        U->>St: remove new file
        alt same portfolioLink already on this service
            Ctl-->>C: 409 (portfolioLinkConflict)
        end
    end
    Ctl-->>C: 201 ServicePortfolio
```

## PATCH /portfolios/:portfolioId

Owner only. Any of name, description, date, link, and a new image.

```mermaid
sequenceDiagram
    autonumber
    actor C as Client
    participant G as requireAuth + uploadImage
    participant Ctl as portfolio.controller<br/>updatePortfolio
    participant L as lib/portfolio
    participant U as lib/upload<br/>saveWithUpload
    participant St as Supabase Storage
    participant DB as PostgreSQL

    C->>G: PATCH /portfolios/:portfolioId (multipart)
    G->>Ctl: next (401 / 400 file errors)
    Ctl->>Ctl: parseParams, parseBody(updatePortfolioSchema)
    Ctl->>Ctl: assertSomethingToUpdate(body, file)
    alt empty body and no file
        Ctl-->>C: 400 Provide at least one field to update
    end
    Ctl->>L: assertPortfolioOwned(portfolioId, caller)
    alt unknown id
        L-->>C: 404 Portfolio not found
    else another company's
        L-->>C: 403 This portfolio belongs to another company
    end
    alt new image sent
        Ctl->>U: saveWithUpload(file, ..., update, oldUrl)
        U->>St: upload new
        U->>DB: servicePortfolio.update (owner in where)
        U->>St: remove old (best effort)
    else text only
        Ctl->>DB: servicePortfolio.update (owner in where)
    end
    alt duplicate link
        Ctl-->>C: 409 (portfolioLinkConflict)
    else deleted in between (P2025)
        Ctl-->>C: 404 Portfolio not found
    end
    Ctl-->>C: 200 ServicePortfolio
```

## DELETE /portfolios/:portfolioId

Owner only. Hard delete, then remove the image file.

```mermaid
sequenceDiagram
    autonumber
    actor C as Client
    participant G as requireAuth
    participant Ctl as portfolio.controller<br/>deletePortfolio
    participant L as lib/portfolio
    participant DB as PostgreSQL
    participant St as Supabase Storage

    C->>G: DELETE /portfolios/:portfolioId
    G->>Ctl: req.auth (401 if not signed in)
    Ctl->>Ctl: parseParams(portfolioIdParamSchema)
    Ctl->>L: assertPortfolioOwned
    alt unknown id
        L-->>C: 404
    else another company's
        L-->>C: 403
    end
    Ctl->>DB: servicePortfolio.delete (owner in where)
    alt gone in between
        Ctl-->>C: 404 Portfolio not found
    end
    Ctl->>St: removeFromStorageByUrl(image) (best effort)
    Ctl-->>C: 204
```
