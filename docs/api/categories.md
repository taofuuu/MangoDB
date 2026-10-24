# Category endpoints (`/categories`)

Source: `apps/api/src/routes/category.routes.ts`,
`apps/api/src/controllers/category.controller.ts`.
Back to the [index](README.md).

| Method | Path          | Guards | Success        |
| ------ | ------------- | ------ | -------------- |
| GET    | `/categories` | public | 200 Category[] |

## UML API Diagram

REST profile notation (see the [index](README.md#uml-api-diagram-notation)). Each operation lists its status codes. Follow an arrow from `«Application»` to a `«Resource»` to read one HTTP call.

```mermaid
classDiagram
    direction LR
    class API["MangoDB API"] {
        <<Application>>
        basePath = "/"
    }
    class Categories["Categories"] {
        <<Resource>>
        +GET() 200
    }
    class CategoryRep["Category"] {
        <<Representation>>
        -categoryId : number
        -categoryName : string
    }
    API --> Categories : «Path» /categories
    Categories ..> CategoryRep : «use»
    style API fill:#fde68a,stroke:#b45309
    style Categories fill:#bfdbfe,stroke:#1d4ed8
    style CategoryRep fill:#bbf7d0,stroke:#15803d
```

The sections below add one sequence diagram per endpoint: the steps inside the server.

## GET /categories

Public. The fixed catalog a listing picks from (ADR 0002), sorted by name.

```mermaid
sequenceDiagram
    autonumber
    actor C as Client
    participant Ctl as category.controller<br/>listCategories
    participant DB as PostgreSQL

    C->>Ctl: GET /categories
    Ctl->>DB: category.findMany order by categoryName asc
    DB-->>Ctl: rows
    Ctl-->>C: 200 Category[]
```
