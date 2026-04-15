# CRUD and Endpoint Coverage Matrix

## API routes

| Route                       | Methods       | Success | Auth | Validation | Not found/conflict           |
| --------------------------- | ------------- | ------- | ---- | ---------- | ---------------------------- |
| `/api/auth/[...nextauth]`   | `GET`, `POST` | yes     | n/a  | n/a        | n/a                          |
| `/api/auth/bootstrap`       | `POST`        | yes     | yes  | n/a        | n/a                          |
| `/api/auth/forgot-password` | `POST`        | yes     | n/a  | yes        | n/a                          |
| `/api/auth/logout`          | `POST`        | yes     | n/a  | n/a        | n/a                          |
| `/api/auth/logout-all`      | `POST`        | yes     | yes  | n/a        | n/a                          |
| `/api/auth/refresh`         | `POST`        | yes     | yes  | yes        | yes                          |
| `/api/auth/register`        | `POST`        | yes     | n/a  | yes        | conflict-style service error |
| `/api/auth/reset-password`  | `POST`        | yes     | n/a  | yes        | invalid token                |
| `/api/auth/sessions`        | `GET`         | yes     | yes  | n/a        | n/a                          |
| `/api/auth/sessions/[id]`   | `DELETE`      | yes     | yes  | n/a        | yes                          |
| `/api/auth/verify`          | `GET`         | yes     | n/a  | yes        | service-driven redirect      |
| `/api/auth/viewer`          | `GET`         | yes     | n/a  | n/a        | n/a                          |
| `/api/cart`                 | `GET`, `POST` | yes     | yes  | yes        | yes (`409` version conflict) |
| `/api/cart/merge`           | `POST`        | yes     | yes  | yes        | n/a                          |
| `/api/catalog/availability` | `GET`         | yes     | n/a  | yes        | n/a                          |

## Admin server actions

| Surface                          | Create | Update/Set | Validation failure mapping | Permission/host guard |
| -------------------------------- | ------ | ---------- | -------------------------- | --------------------- |
| Categories                       | yes    | yes        | yes                        | yes                   |
| Products                         | yes    | yes        | yes                        | yes                   |
| Variants (stock `set`/`adjust`)  | yes    | yes        | yes                        | yes                   |
| Content (news, banner, featured) | yes    | yes        | yes                        | yes                   |
| Coupons                          | yes    | yes        | yes                        | yes                   |

## Service-level coverage (non-gated but required)

- `admin-service`: expanded create/update/toggle and error-path tests.
- `cart-service`: reconcile/availability and persistence-path tests.
- `role-guard`: host/origin/recent-auth and permission boundary tests.
