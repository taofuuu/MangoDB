# Auth endpoints (`/auth`)

Source: `apps/api/src/routes/auth.routes.ts`,
`apps/api/src/controllers/auth.controller.ts`.
Back to the [index](README.md).

| Method | Path                       | Guards         | Success                                                      |
| ------ | -------------------------- | -------------- | ------------------------------------------------------------ |
| POST   | `/auth/register`           | public         | 201 `{ company, accessToken }` + cookie                      |
| POST   | `/auth/login`              | `loginLimiter` | 200 `{ company, accessToken }` + cookie                      |
| POST   | `/auth/admin/login`        | `loginLimiter` | 200 `{ company, accessToken }` + cookie                      |
| POST   | `/auth/check-availability` | public         | 200 `{ username, email, usernameAvailable, emailAvailable }` |
| POST   | `/auth/logout`             | `requireAuth`  | 204, cookie cleared                                          |

## UML API Diagram

![UML API Diagram: auth](uml/auth.svg)

Source: [uml/auth.puml](uml/auth.puml). REST profile notation, see the [index](README.md#uml-api-diagram). Status codes, parameters and bodies are in the OpenAPI docs at `/api-docs`.

The sections below add one sequence diagram per endpoint: the steps inside the server.

## POST /auth/register

US1-1. Creates the company, its industry tags, and its provider and/or receiver
row in one nested create.

```mermaid
sequenceDiagram
    autonumber
    actor C as Client
    participant Ctl as auth.controller<br/>register
    participant V as registerSchema
    participant Id as lib/company-identity
    participant P as auth/password
    participant DB as PostgreSQL
    participant S as lib/session

    C->>Ctl: POST /auth/register (JSON)
    Ctl->>V: parseBody
    alt invalid body or tosAccepted is not true
        V-->>C: 400 VALIDATION_FAILED
    end
    Ctl->>Id: assertCompanyIdentityAvailable(username, email)
    Id->>DB: find company by username OR email
    alt username or email taken
        Id-->>C: 409 CONFLICT (both fields reported)
    end
    Ctl->>P: hashPassword(password)
    Ctl->>DB: company.create (companyType tags, provider/receiver row, tosAcceptedAt)
    alt unique index race
        DB-->>Ctl: P2002
        Ctl-->>C: 409 CONFLICT (identityConflict)
    end
    DB-->>Ctl: company (companyProfileSelect)
    Ctl->>S: sendSession(company, 201)
    S->>S: issueSession (sign JWT)
    S-->>C: 201 { company, accessToken } + Set-Cookie access_token
```

## POST /auth/login

US1-2. Company sign-in. Admins are sent to the admin door.

```mermaid
sequenceDiagram
    autonumber
    actor C as Client
    participant RL as loginLimiter
    participant Ctl as auth.controller<br/>login
    participant P as auth/password
    participant DB as PostgreSQL
    participant S as lib/session

    C->>RL: POST /auth/login { email, password }
    alt 10 failed tries for this email in 15 min
        RL-->>C: 429 TOO_MANY_REQUESTS
    end
    RL->>Ctl: next
    Ctl->>Ctl: parseBody(loginSchema)
    Ctl->>P: verifyCredentials(email, password)
    P->>DB: company.findUnique by email (with hash, deletedAt)
    P->>P: bcrypt compare (dummy hash if no row)
    alt no row, deleted, or wrong password
        P-->>C: 401 Invalid email or password
    end
    alt accountType is ADMIN
        Ctl-->>C: 403 Administrators must use the administrator login
    end
    Ctl->>S: sendSession(company)
    S-->>C: 200 { company, accessToken } + Set-Cookie
```

## POST /auth/admin/login

US6-1. Same as login, but only admins pass.

```mermaid
sequenceDiagram
    autonumber
    actor C as Client
    participant RL as loginLimiter
    participant Ctl as auth.controller<br/>adminLogin
    participant P as auth/password
    participant DB as PostgreSQL
    participant S as lib/session

    C->>RL: POST /auth/admin/login { email, password }
    alt too many failed tries
        RL-->>C: 429 TOO_MANY_REQUESTS
    end
    RL->>Ctl: next
    Ctl->>Ctl: parseBody(loginSchema)
    Ctl->>P: verifyCredentials(email, password)
    P->>DB: find company by email
    alt wrong email or password
        P-->>C: 401 Invalid email or password
    end
    alt accountType is not ADMIN
        Ctl-->>C: 403 This is not an administrator account
    end
    Ctl->>S: sendSession(company)
    S-->>C: 200 { company, accessToken } + Set-Cookie
```

## POST /auth/check-availability

US1-1.9. Feeds the inline hint on the sign-up form.

```mermaid
sequenceDiagram
    autonumber
    actor C as Client
    participant Ctl as auth.controller<br/>checkAvailability
    participant Id as lib/company-identity
    participant DB as PostgreSQL

    C->>Ctl: POST /auth/check-availability { username, email }
    Ctl->>Ctl: parseBody(checkAvailabilitySchema)
    Ctl->>Id: checkCompanyIdentityAvailability(body)
    alt username or email empty
        Id-->>C: 400 Username and email must not be empty
    end
    Id->>DB: one case-insensitive query on username and email
    DB-->>Id: matches
    Id-->>Ctl: availability per field
    Ctl-->>C: 200 { username, email, usernameAvailable, emailAvailable }
```

## POST /auth/logout

US1-3. Revokes the token's `jti`. A second logout with the same token is 401.

```mermaid
sequenceDiagram
    autonumber
    actor C as Client
    participant A as requireAuth
    participant Ctl as auth.controller<br/>logout
    participant D as auth/tokenDenylist
    participant DB as PostgreSQL

    C->>A: POST /auth/logout
    alt token missing, invalid, or already revoked
        A-->>C: 401 UNAUTHORIZED
    end
    A->>Ctl: req.auth
    Ctl->>D: revokeToken(jti, exp)
    D->>DB: revokedToken.upsert(jti, exp)
    Ctl-->>C: 204 + clear access_token cookie
```
