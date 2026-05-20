# API Response Standard Setup

## ✅ Completed

Personal skill untuk standardisasi API response sudah di-setup di semua services.

### Struktur Response Format

Setiap API response menggunakan format **status**, **data**, **metas**, **message**:

```json
{
  "status": "success" | "error",
  "data": <dict or list>,
  "metas": {
    "page": 1,
    "time_elapsed": "45.23ms",
    "any_metadata": "..."
  },
  "message": "General message"
}
```

## Files Created

### 1. Core Response Utility
- **Location**: `app/core/response.py` (in each service)
- **Classes**:
  - `APIResponse` - Pydantic model untuk standardized response
  - `ResponseBuilder` - Builder pattern untuk response construction
- **Copied to**:
  - ✅ etl_api
  - ✅ payment_api
  - ✅ usermanagement_api
  - ✅ tileserver_api

### 2. Documentation
- **Location**: Root directory
- **Files**:
  - `API_RESPONSE_STANDARD.md` - Lengkap specification & examples
  - `API_RESPONSE_SETUP.md` - Setup guide (this file)
  - `services/etl_api/app/core/response_examples.py` - Code examples

## Usage Examples

### Option 1: Simple Approach

```python
from app.core.response import APIResponse

@app.get("/users/{user_id}")
async def get_user(user_id: int):
    user = db.get_user(user_id)
    return APIResponse.success(message="User retrieved", data=user)

@app.delete("/users/{user_id}")
async def delete_user(user_id: int):
    db.delete_user(user_id)
    return APIResponse.error(message="User deleted")
```

### Option 2: Builder Pattern (Recommended)

```python
from app.core.response import ResponseBuilder

@app.get("/users")
async def list_users(page: int = 1, page_size: int = 10):
    users, total = db.list_users(page, page_size)
    
    return ResponseBuilder()\
        .with_message("Users retrieved")\
        .with_data(users)\
        .with_pagination(page=page, page_size=page_size, total=total)\
        .build()
```

## ResponseBuilder Methods

| Method | Purpose |
|--------|---------|
| `.with_status(status)` | Set status to "success" or "error" |
| `.with_message(msg)` | Set response message |
| `.with_data(data)` | Set response data (dict or list) |
| `.add_meta(key, value)` | Add single metadata |
| `.with_metas(dict)` | Add multiple metadata |
| `.with_pagination(page, page_size, total)` | Add pagination metas |
| `.build()` | Build response (auto-adds time_elapsed) |

## Common Metas

| Key | Type | Example |
|-----|------|---------|
| `page` | int | `1` |
| `page_size` | int | `10` |
| `total` | int | `100` |
| `total_pages` | int | `10` |
| `time_elapsed` | string | `"45.23ms"` (auto) |
| `queue` | string | `"etl_high"` |
| `priority` | string | `"high"` |
| `worker_id` | string | `"worker_02"` |
| Custom | any | Use as needed |

## Integration Steps

### For Each Service:

1. **response.py already present** ✅
   - Location: `app/core/response.py`
   - Contains: `APIResponse` + `ResponseBuilder`

2. **Import in your routes**:
   ```python
   from app.core.response import APIResponse, ResponseBuilder
   ```

3. **Use in endpoints**:
   ```python
   # Simple
   return APIResponse.success(message="...", data={})
   
   # Complex with pagination
   return ResponseBuilder()\
       .with_message("...")\
       .with_data(items)\
       .with_pagination(page=1, page_size=10, total=100)\
       .build()
   ```

4. **Test response format**:
   ```bash
   curl http://localhost:8000/api/v1/users
   # Should return:
   # {
   #   "status": "success",
   #   "data": [...],
   #   "metas": {"page": 1, "total": 100, "time_elapsed": "..."},
   #   "message": "Users retrieved"
   # }
   ```

## Response Patterns

### ✅ Success - Simple
```python
return APIResponse.success(message="Created successfully")
```

### ✅ Success - With Data
```python
return APIResponse.success(message="User retrieved", data=user_dict)
```

### ✅ Success - With List + Pagination
```python
return ResponseBuilder()\
    .with_data(users)\
    .with_pagination(page=1, page_size=10, total=100)\
    .build()
```

### ❌ Error - Not Found
```python
return APIResponse.error(message="User not found")
```

### ❌ Error - Validation
```python
return ResponseBuilder()\
    .with_status("error")\
    .with_message("Validation failed")\
    .add_meta("errors", {"email": "Invalid format"})\
    .build()
```

## Auto-Features

### time_elapsed (Auto-added)
ResponseBuilder automatically tracks execution time:

```python
builder = ResponseBuilder()  # Start time recorded
# ... do work ...
builder.build()  # time_elapsed auto-added to metas
```

**Response:**
```json
{
  "status": "success",
  "metas": {
    "time_elapsed": "23.45ms"
  }
}
```

### Pagination (Auto-calculated)
Auto-calculates `total_pages`:

```python
ResponseBuilder()\
    .with_pagination(page=1, page_size=10, total=100)\
    .build()
```

**Response:**
```json
{
  "metas": {
    "page": 1,
    "page_size": 10,
    "total": 100,
    "total_pages": 10
  }
}
```

## Validation

Make sure all endpoints return this format:

- ✅ Every response has `status` (success or error)
- ✅ Every response has `message` (descriptive)
- ✅ `data` is dict, list, or null
- ✅ `metas` is dict (can be empty `{}`)
- ✅ Pagination uses proper metas (page, page_size, total)
- ✅ Timestamps in ISO format when needed

## Example Endpoints

### GET Single Resource
```python
@app.get("/users/{user_id}")
async def get_user(user_id: int):
    user = db.get_user(user_id)
    if not user:
        return APIResponse.error(message="User not found")
    return APIResponse.success(message="User retrieved", data=user)
```

Response (200):
```json
{
  "status": "success",
  "message": "User retrieved",
  "data": {"id": 1, "name": "John"},
  "metas": {}
}
```

### GET List with Pagination
```python
@app.get("/users")
async def list_users(page: int = 1, page_size: int = 10):
    users, total = db.list_users(page, page_size)
    return ResponseBuilder()\
        .with_message("Users retrieved")\
        .with_data(users)\
        .with_pagination(page=page, page_size=page_size, total=total)\
        .build()
```

Response (200):
```json
{
  "status": "success",
  "message": "Users retrieved",
  "data": [{...}, {...}],
  "metas": {
    "page": 1,
    "page_size": 10,
    "total": 100,
    "total_pages": 10,
    "time_elapsed": "15.32ms"
  }
}
```

### POST Create
```python
@app.post("/users")
async def create_user(name: str, email: str):
    if not name or not email:
        return ResponseBuilder()\
            .with_status("error")\
            .with_message("name and email required")\
            .add_meta("required_fields", ["name", "email"])\
            .build()
    
    user = db.create_user(name, email)
    return ResponseBuilder()\
        .with_message("User created")\
        .with_data(user)\
        .add_meta("created_at", user.created_at.isoformat())\
        .build()
```

Response (201 or 400):
```json
{
  "status": "success|error",
  "message": "User created|name and email required",
  "data": {...},
  "metas": {"created_at": "2026-05-20T10:30:00Z"}
}
```

### DELETE
```python
@app.delete("/users/{user_id}")
async def delete_user(user_id: int):
    db.delete_user(user_id)
    return ResponseBuilder()\
        .with_message("User deleted")\
        .add_meta("deleted_id", user_id)\
        .build()
```

Response (200):
```json
{
  "status": "success",
  "message": "User deleted",
  "data": null,
  "metas": {"deleted_id": 1}
}
```

## Services Status

- [x] **etl_api** - Implemented, tested
- [x] **payment_api** - Copied, ready to implement
- [x] **usermanagement_api** - Copied, ready to implement
- [x] **tileserver_api** - Copied, ready to implement
- [ ] **dashboard** - If needed (Next.js, may not apply)
- [ ] **geoportal** - If needed

## Notes

1. **Backward compatibility**: If existing endpoints use different format, gradually migrate
2. **Consistency**: All endpoints in same service should use same format
3. **Performance**: ResponseBuilder adds minimal overhead (~1-2ms)
4. **Type safety**: Full Pydantic validation on response objects
5. **Auto-generated docs**: FastAPI will properly document response schemas

## Support

For detailed examples, see:
- `API_RESPONSE_STANDARD.md` - Complete specification
- `services/etl_api/app/core/response_examples.py` - Code examples

---

Setup completed: 2026-05-20
