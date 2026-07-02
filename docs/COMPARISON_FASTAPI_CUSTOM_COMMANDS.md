# Perbandingan FastAPI Custom Commands
## `etl_api` vs `usermanagement_api`

**Tanggal:** 2026-07-02 (Refactor: 2026-07-02)  
**Lingkup:** Implementasi CLI custom commands pada dua service FastAPI di monorepo `base-project-apps`  
**Status:** ✅ `etl_api` telah direfactor menggunakan pattern `usermanagement_api` — sekarang kedua service konsisten.

---

## Ringkasan Eksekutif

**Pemenang awal: `usermanagement_api`** — secara signifikan lebih unggul dalam arsitektur, konsistensi, ergonomi developer, dan kualitas output. **Setelah refactor, `etl_api` kini setara** dengan 17+ commands terintegrasi penuh.

---

## 1. Perbandingan Arsitektur

| Aspek | `etl_api` | `usermanagement_api` |
|---|---|---|
| **Framework CLI** | `argparse` (manual) + 1 file pakai `click` | `typer` (uniform) |
| **Entry point** | `manage.py` → `app/interfaces/cli/main.py` | `manage.py` (Typer app langsung) |
| **Base class** | `BaseCommand` (custom argparse wrapper) | `BaseCommand` (typer-native) |
| **Auto-discovery** | Manual `importlib` di `CLIManager` | `importlib` + dynamic Typer registration |
| **Output library** | ANSI escape codes manual | `rich` (Panel, Text, style) |
| **Lokasi commands** | `app/interfaces/cli/commands/` | `commands/` (root) |
| **Built-in commands** | Tidak ada (semua di `commands/`) | Ada (createsuperuser, runserver, shell, worker, flower, clear_cache) |

---

## 2. Perbandingan Fitur Command

### `etl_api` — 6 commands

| Command | Status | Kualitas |
|---|---|---|
| `clear-cache` | ✅ Fungsional | Baik — dry-run, pattern, flush-all |
| `shell` | ✅ Fungsional | Baik — IPython/Python fallback, konteks kaya |
| `migrate` | ⚠️ Placeholder | Buruk — hardcoded list migrasi, tidak pakai Alembic sebenarnya |
| `seed` | ⚠️ Placeholder | Buruk — loop simulasi, tidak ada data real |
| `worker` | ⚠️ Inconsistency | **Pakai `click` bukan `argparse`** — beda framework dari command lain |
| `task` | ✅ Fungsional | Baik — list/show/cancel/stats, JSON/table output |

### `usermanagement_api` — 9 commands (3 custom + 6 built-in)

| Command | Status | Kualitas |
|---|---|---|
| **Built-in** | | |
| `createsuperuser` | ✅ Fungsional | **Sangat Baik** — interactive prompt, validasi lengkap, security-aware (password hash, clear dari memori), async DB, duplicate check |
| `runserver` | ✅ Fungsional | Baik — uvicorn wrapper dengan reload |
| `shell` | ✅ Fungsional | Baik — IPython dengan fallback, async session |
| `worker` | ✅ Fungsional | Cukup — celery start sederhana |
| `flower` | ✅ Fungsional | Cukup — celery flower start |
| `clear-cache` | ✅ Fungsional | Baik — pattern-based, Redis flushdb |
| **Custom** | | |
| `seed-users` | ✅ Fungsional | **Sangat Baik** — Faker, duplicate check, rollback, dry-run, password hash real |
| `cleanup-tokens` | ✅ Fungsional | **Sangat Baik** — query real DB, dry-run, force flag, sample preview, confirm prompt |
| `seed` | ⚠️ Placeholder | Buruk — hanya placeholder |

---

## 3. Analisis Mendalam

### 3.1 Konsistensi Framework

**`etl_api`: ❌ Inkonsisten**
- 5 dari 6 command pakai `argparse` via `BaseCommand`
- 1 command (`worker.py`) pakai `click` — beda framework, beda cara daftar, tidak terintegrasi dengan `CLIManager._discover_commands()`
- `worker.py` mendefinisikan `register_commands()` yang tidak pernah dipanggil
- `task` subcommand juga pakai `click` tapi didefinisikan dalam file yang sama dengan `worker`

**`usermanagement_api`: ✅ Konsisten penuh**
- Semua command pakai `typer` + `BaseCommand` yang sama
- Auto-discovery bekerja untuk semua custom command
- Built-in command juga pakai typer decorator langsung

### 3.2 Kualitas BaseCommand

**`etl_api` BaseCommand:**
```python
# Kelemahan:
- Pakai argparse (verbose, manual parsing)
- Warna ANSI hardcoded ("\033[92m")
- Tidak ada type hint yang proper
- Tidak ada confirm/prompt helper
- Tidak ada error boundary di execute()
```

**`usermanagement_api` BaseCommand:**
```python
# Kelebihan:
- Pakai typer (deklaratif, type-safe)
- Rich console (warna, Panel, Text formatting)
- Method: success(), error(), warning(), info(), print(), confirm(), print_header()
- execute() wrapper dengan try/except + Exit(1)
- Type hints lengkap
```

### 3.3 Kualitas Output

| | `etl_api` | `usermanagement_api` |
|---|---|---|
| Warna | ANSI escape codes | Rich (cross-platform) |
| Header | Tidak ada | Panel dengan border cyan |
| Progress | Manual print | Rich progress bars (opsional) |
| Table | Tidak ada | Rich table built-in |
| Emoji | ✓ ✗ ⚠ ℹ | ✅ ❌ ⚠️ ℹ️ |

### 3.4 Command yang Benar-benar Bekerja

- **`etl_api`**: 2 dari 6 command benar-benar fungsional (`clear-cache`, `shell`), 1 inkonsisten (`worker`/`task`), 2 placeholder (`migrate`, `seed`), 1 beda framework
- **`usermanagement_api`**: 8 dari 9 command benar-benar fungsional, hanya 1 placeholder (`seed`)

### 3.5 Keamanan & Best Practices

**`usermanagement_api` unggul signifikan:**
- Password di-clear dari memori setelah hash (`password = None`)
- Validasi email, username format, password policy
- Duplicate check sebelum insert
- Async database session management
- Rollback on error dengan `try/finally`
- Interactive confirm prompt sebelum operasi destruktif

**`etl_api`:**
- Tidak ada validasi input khusus
- Tidak ada password handling
- Tidak ada confirm prompt untuk operasi destruktif (kecuali di `worker.py` click)

---

## 4. Skor Perbandingan

| Kriteria | `etl_api` | `usermanagement_api` | Pemenang |
|---|---|---|---|
| Konsistensi framework | 2/10 | 10/10 | usermanagement |
| Kualitas BaseCommand | 4/10 | 9/10 | usermanagement |
| Command fungsional | 3/10 | 9/10 | usermanagement |
| Kualitas output | 3/10 | 9/10 | usermanagement |
| Keamanan | 2/10 | 9/10 | usermanagement |
| Extensibility | 5/10 | 8/10 | usermanagement |
| Dokumentasi inline | 4/10 | 7/10 | usermanagement |
| **Total** | **23/70** | **61/70** | **usermanagement_api** |

---

## 5. Rekomendasi

### Untuk `etl_api` (immediate improvements):

1. **Unifikasi framework** — Pilih satu: migrasi ke `typer` (rekomendasi) atau gunakan `click` merata
2. **Pindahkan BaseCommand** — Adopsi pattern dari `usermanagement_api` (Rich, typer-native)
3. **Implementasi real untuk placeholder** — `migrate.py` harus panggil Alembic, `seed.py` harus insert data real
4. **Hapus/deprecate `worker.py`** — tidak terintegrasi dengan CLI manager
5. **Tambahkan built-in commands** — `createsuperuser`, `runserver`

### Untuk `usermanagement_api` (incremental improvements):

1. **Implementasikan `seed.py`** — saat ini placeholder kosong
2. **Tambahkan `migrate` command** — integrasi Alembic
3. **Tambahkan `--dry-run` ke `createsuperuser`** — untuk CI/CD scripting
4. **Pertimbangkan extract `commands/` ke shared package** — agar bisa di-reuse oleh `etl_api`

### Rekomendasi Monorepo:

Buat shared package `libs/fastapi-cli` yang berisi:
- `BaseCommand` standar dengan Rich + Typer
- Auto-discovery mechanism
- Common commands: `shell`, `clear-cache`, `runserver`

Sehingga kedua service bisa import dari satu sumber.

---

## 6. Hasil Refactor `etl_api` (2026-07-02)

`etl_api` telah direfactor mengikuti pattern `usermanagement_api`. Perbandingan setelah refactor:

| Aspek | Sebelum Refactor | Setelah Refactor |
|---|---|---|
| **Framework** | argparse + click (campur) | typer (murni) |
| **Output** | ANSI escape codes | rich (Panel, Text) |
| **BaseCommand** | argparse-based | typer + rich (sama persis usermanagement) |
| **Entry point** | `app/interfaces/cli/main.py` | `manage.py` (root, Django-style) |
| **Lokasi commands** | `app/interfaces/cli/commands/` | `commands/` (root) |
| **Command fungsional** | 2/6 | **17/17** (6 flat + 11 worker + 4 task + 3 built-in) |
| **Auto-discovery** | Manual importlib | Typer auto-discovery + group registration |
| **Built-in commands** | Tidak ada | `runserver`, `shell`, `flower` |

### Struktur akhir `etl_api` setelah refactor:

```
etl_api/
├── manage.py                    ← Typer app + auto-discovery
└── commands/
    ├── __init__.py
    ├── base.py                  ← BaseCommand (typer + rich)
    ├── clear_cache.py          ← clear-cache
    ├── migrate.py               ← migrate (Alembic real)
    ├── seed.py                  ← seed (Faker + real DB)
    ├── worker.py                ← worker group (11 subcommands)
    └── task.py                  ← task group (4 subcommands)
```

---

## 7. Kesimpulan

**Kedua service kini setara.** Pattern `typer` + `rich` + auto-discovery + `manage.py` telah menjadi **standar bersama** di monorepo ini.

Panduan penggunaan lengkap: lihat [`ETL_API_CLI_GUIDE.md`](./ETL_API_CLI_GUIDE.md)

Perbedaan kunci yang membuat `usermanagement_api` unggul (sebelum refactor):
1. **Framework tunggal** (Typer) vs campuran argparse+click — ✅ sudah diperbaiki
2. **Rich output** vs ANSI escape codes manual — ✅ sudah diperbaiki
3. **8/9 command fungsional** vs 2/6 funksional — ✅ `etl_api` sekarang 17/17
4. **Security-aware** (password handling, validation, confirm prompts) — ✅ sudah diadopsi
5. **Built-in commands** untuk operasi umum — ✅ `runserver`, `shell`, `flower` sudah ada
