# Domain ERD and Schema Notes

## ERD (logical)

```mermaid
erDiagram
  CATEGORY ||--o{ PRODUCT : contains
  PRODUCT ||--o{ PRODUCT_VARIANT : has
  PRODUCT ||--o{ INVENTORY_LEDGER_ENTRY : tracks
  PRODUCT_VARIANT ||--o{ INVENTORY_LEDGER_ENTRY : tracks
  CATEGORY ||--o{ ATTRIBUTE_DEFINITION : defines
  PRODUCT ||--o{ PRODUCT_ATTRIBUTE_VALUE : stores
  PRODUCT_VARIANT ||--o{ PRODUCT_ATTRIBUTE_VALUE : stores
  NEWS_POST ||--o{ HOME_BLOCK : appears_in
  PROMO_BANNER ||--o{ HOME_BLOCK : appears_in
  FEATURED_SALE ||--o{ HOME_BLOCK : appears_in

  CATEGORY {
    uuid id PK
    string slug
    string name
    string template_key
  }
  ATTRIBUTE_DEFINITION {
    string key PK
    string label
    string type
    boolean required
    json options
  }
  PRODUCT {
    uuid id PK
    uuid category_id FK
    string name
    string slug
    string base_sku
    string status
    string currency
    int price_cents
    int compare_at_price_cents
  }
  PRODUCT_VARIANT {
    uuid id PK
    uuid product_id FK
    string sku
    string name
    int price_cents
    int compare_at_price_cents
    int stock_on_hand
    boolean is_default
    json attribute_values
  }
  PRODUCT_ATTRIBUTE_VALUE {
    uuid entity_id
    string attribute_key
    string|number|boolean value
  }
  INVENTORY_LEDGER_ENTRY {
    uuid id PK
    uuid product_id FK
    uuid variant_id FK
    int quantity_delta
    string reason
    datetime created_at
  }
  NEWS_POST {
    uuid id PK
    string slug
    string status
    datetime published_at
  }
  PROMO_BANNER {
    uuid id PK
    string title
    datetime starts_at
    datetime ends_at
    boolean is_active
  }
  FEATURED_SALE {
    uuid id PK
    string title
    json product_ids
    datetime starts_at
    datetime ends_at
    boolean is_active
  }
  HOME_BLOCK {
    uuid id PK
    string block_type
    int display_order
  }
```

## Role model

- `owner`: full platform permissions.
- `manager`: catalog/content/orders operations, no role management.
- `catalog`: catalog + inventory operations, read-only content.

## Seeded attribute template sets

- `prints-3d`
- `pc-components`
- `plant-seeds`

Each set uses typed attributes (`string`, `number`, `boolean`, `enum`) validated by the shared attribute engine.

## Store profile contract

- Runtime storefront data is constrained to one active `STORE_PROFILE`.
- Allowed values:
  - `prints-3d`
  - `pc-components`
  - `plant-seeds`
- Default profile for local/dev fallback: `plant-seeds`.
