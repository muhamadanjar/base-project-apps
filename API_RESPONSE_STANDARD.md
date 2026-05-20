# API Response Standard Pattern

Standardized API response format untuk semua services dalam project ini.

## Format

Setiap response API harus menggunakan struktur ini:

```json
{
  "status": "success" | "error",
  "data": null | {} | [],
  "metas": {
    "page": 1,
    "total": 100,
    "time_elapsed": "45.23ms",
    "any_key": "any_value"
  },
  "message": "General message or description"
}
```

### Field Details

| Field | Type | Deskripsi |
|-------|------|-----------|
| `status` | `"success"` \| `"error"` | Status response (required) |
| `data` | `dict` \| `list` \| `null` | Actual data response (optional) |
| `metas` | `dict` | Metadata tambahan (optional but recommended) |
| `message` | `string` | Pesan general/deskriptif (required) |

## Usage

### 1. Simple Response (No Data)

```python
from app.core.response import APIResponse

return APIResponse.success(message="User deleted successfully")
```

**Response:**
```json
{
  "status": "success",
  "message": "User deleted successfully",
  "data": null,
  "metas": {}
}
```

### 2. Success with Dict Data

```python
user = {"id": 1, "name": "John", "email": "john@example.com"}

return APIResponse.success(
    message="User retrieved",
    data=user
)
```

**Response:**
```json
{
  "status": "success",
  "message": "User retrieved",
  "data": {
    "id": 1,
    "name": "John",
    "email": "john@example.com"
  },
  "metas": {}
}
```

### 3. Success with List Data

```python
users = [
    {"id": 1, "name": "John"},
    {"id": 2, "name": "Jane"}
]

return APIResponse.success(
    message="Users list",
    data=users
)
```

**Response:**
```json
{
  "status": "success",
  "message": "Users list",
  "data": [
    {"id": 1, "name": "John"},
    {"id": 2, "name": "Jane"}
  ],
  "metas": {}
}
```

### 4. Error Response

```python
return APIResponse.error(message="User not found")
```

**Response:**
```json
{
  "status": "error",
  "message": "User not found",
  "data": null,
  "metas": {}
}
```

### 5. Response with Pagination Metadata

```python
users = [...]
page, page_size, total = 1, 10, 100

return APIResponse.success(
    message="Users retrieved",
    data=users,
    metas={
        "page": page,
        "page_size": page_size,
        "total": total,
        "total_pages": (total + page_size - 1) // page_size
    }
)
```

**Response:**
```json
{
  "status": "success",
  "message": "Users retrieved",
  "data": [...],
  "metas": {
    "page": 1,
    "page_size": 10,
    "total": 100,
    "total_pages": 10
  }
}
```

### 6. Response with Custom Metadata

```python
job = {"id": "job_123", "status": "processing"}

return APIResponse.success(
    message="ETL job started",
    data=job,
    metas={
        "queue": "etl_high_priority",
        "estimated_duration": 300,
        "worker_id": "worker_02"
    }
)
```

**Response:**
```json
{
  "status": "success",
  "message": "ETL job started",
  "data": {"id": "job_123", "status": "processing"},
  "metas": {
    "queue": "etl_high_priority",
    "estimated_duration": 300,
    "worker_id": "worker_02"
  }
}
```

## ResponseBuilder Pattern (Recommended)

Untuk response yang kompleks atau dengan logic tertentu, gunakan `ResponseBuilder`:

```python
from app.core.response import ResponseBuilder

return ResponseBuilder()\
    .with_message("Users retrieved")\
    .with_data(users)\
    .with_pagination(page=1, page_size=10, total=100)\
    .build()
```

### ResponseBuilder Methods

| Method | Deskripsi |
|--------|-----------|
| `with_status(status)` | Set status ke "success" atau "error" |
| `with_message(msg)` | Set message |
| `with_data(data)` | Set data |
| `add_meta(key, value)` | Tambah single metadata |
| `with_metas(dict)` | Merge multiple metadata |
| `with_pagination(page, page_size, total)` | Auto-add pagination metas |
| `build()` | Build final response (auto-add time_elapsed) |

### Examples

**Simple:**
```python
return ResponseBuilder()\
    .with_message("Done")\
    .with_data(result)\
    .build()
```

**With Pagination:**
```python
return ResponseBuilder()\
    .with_message("Users")\
    .with_data(users)\
    .with_pagination(page=1, page_size=10, total=100)\
    .build()
```

**With Custom Metadata:**
```python
return ResponseBuilder()\
    .with_message("Job created")\
    .with_data(job)\
    .add_meta("queue", "etl_jobs")\
    .add_meta("priority", "high")\
    .add_meta("scheduled_at", "2026-05-20T10:30:00Z")\
    .build()
```

**Error:**
```python
return ResponseBuilder()\
    .with_status("error")\
    .with_message("Validation failed")\
    .add_meta("errors", {"email": "Invalid format"})\
    .build()
```

## FastAPI Integration

### GET (Single Resource)

```python
from fastapi import APIRouter
from app.core.response import APIResponse, ResponseBuilder

router = APIRouter()

@router.get("/users/{user_id}")
async def get_user(user_id: int):
    user = db.get_user(user_id)
    if not user:
        return APIResponse.error(message="User not found")

    return APIResponse.success(
        message="User retrieved",
        data=user
    )
```

### GET (List with Pagination)

```python
@router.get("/users")
async def list_users(page: int = 1, page_size: int = 10):
    users, total = db.list_users(page=page, page_size=page_size)

    return ResponseBuilder()\
        .with_message("Users list")\
        .with_data(users)\
        .with_pagination(page=page, page_size=page_size, total=total)\
        .build()
```

### POST (Create)

```python
@router.post("/users")
async def create_user(name: str, email: str):
    if not name or not email:
        return ResponseBuilder()\
            .with_status("error")\
            .with_message("name and email are required")\
            .add_meta("required_fields", ["name", "email"])\
            .build()

    new_user = db.create_user(name=name, email=email)

    return ResponseBuilder()\
        .with_message("User created successfully")\
        .with_data(new_user)\
        .add_meta("created_at", new_user.created_at.isoformat())\
        .build()
```

### DELETE (Delete Resource)

```python
@router.delete("/users/{user_id}")
async def delete_user(user_id: int):
    db.delete_user(user_id)

    return ResponseBuilder()\
        .with_message("User deleted successfully")\
        .add_meta("deleted_id", user_id)\
        .build()
```

### Error Handling

```python
@router.post("/jobs")
async def create_job(job_data: dict):
    try:
        job = db.create_job(job_data)
        return APIResponse.success(message="Job created", data=job)
    except ValueError as e:
        return APIResponse.error(message=str(e))
    except Exception as e:
        return APIResponse.error(message="Internal server error")
```

## Implementation Checklist

- [ ] Copy `app/core/response.py` ke service
- [ ] Import di routes: `from app.core.response import APIResponse, ResponseBuilder`
- [ ] Replace semua endpoint response dengan format standard
- [ ] Test GET, POST, DELETE endpoints
- [ ] Verify pagination response format
- [ ] Check error response format

## Metas Common Fields

| Field | Tipe | Deskripsi |
|-------|------|-----------|
| `page` | `int` | Current page number (pagination) |
| `page_size` | `int` | Items per page (pagination) |
| `total` | `int` | Total items (pagination) |
| `total_pages` | `int` | Total pages (pagination) |
| `time_elapsed` | `string` | Execution time (auto-added by ResponseBuilder) |
| `queue` | `string` | Job queue name |
| `priority` | `string` | Job priority level |
| `worker_id` | `string` | Worker identifier |
| `scheduled_at` | `string` | ISO timestamp |
| Custom | Any | Add as needed |

## Services Using This Standard

- [ ] etl_api (✅ implemented)
- [ ] payment_api
- [ ] tileserver_api
- [ ] usermanagement_api
- [ ] dashboard (if applicable)
- [ ] geoportal (if applicable)

## Notes

- **time_elapsed**: Auto-added oleh ResponseBuilder, tidak perlu manual
- **metas** bisa kosong `{}` jika tidak ada metadata
- **data** bisa null jika response tidak ada data
- **status** harus selalu ada (success atau error)
- **message** harus descriptive dan user-friendly

---

Created: 2026-05-20  
Pattern: Standard API Response Format v1.0
