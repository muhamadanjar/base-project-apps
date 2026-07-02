# ETL API — CLI Command Usage Guide

**Service:** `services/etl_api`  
**Entry point:** `python manage.py` atau `./venv/bin/python manage.py`  
**Framework:** Typer + Rich + Auto-discovery  

---

## Daftar Isi

1. [Quick Start](#quick-start)
2. [Built-in Commands](#built-in-commands)
3. [Custom Commands](#custom-commands)
4. [Worker Commands](#worker-commands)
5. [Task Commands](#task-commands)
6. [Cheat Sheet](#cheat-sheet)

---

## Quick Start

```bash
# Masuk ke folder service
cd services/etl_api

# Aktifkan virtual environment (jika belum)
source venv/bin/activate

# Lihat semua command tersedia
python manage.py --help

# Atau langsung pakai venv python
./venv/bin/python manage.py --help
```

**Output:**
```
╭─ Commands ───────────────────────────────────────────────────────╮
│ clear-cache    Clear application cache                           │
│ migrate        Run database migrations                           │
│ seed           Seed database with dummy data                     │
│ runserver      Run the FastAPI development server                │
│ shell          Start an interactive Python shell with app context│
│ flower         Start Celery Flower monitoring tool               │
│ task           task management commands                          │
│ worker         worker management commands                        │
╰──────────────────────────────────────────────────────────────────╯
```

---

## Built-in Commands

### `runserver` — Menjalankan development server

```bash
# Default: http://127.0.0.1:8000
python manage.py runserver

# Custom host & port
python manage.py runserver --host 0.0.0.0 --port 8080

# Dengan auto-reload (development)
python manage.py runserver --reload
```

### `shell` — Interactive Python shell dengan app context

```bash
python manage.py shell
```

**Context variables yang tersedia:**
| Variable | Type | Description |
|---|---|---|
| `app` | FastAPI | Instance FastAPI application |
| `db` | Session | SQLAlchemy database session |
| `cache` | CacheManager | Cache manager instance |
| `User` | Model | User model class |
| `EtlJob` | Model | ETL Job model class |
| `JobExecution` | Model | Job execution model class |
| `FileRegistry` | Model | File registry model class |
| `DataSource` | Model | Data source config model |
| `SystemConfig` | Model | System configuration model |
| `ErrorLog` | Model | Error log model |
| `ProcessedEntity` | Model | Processed entity model |

**Contoh penggunaan di shell:**
```python
# Query users
users = db.query(User).all()

# Lihat ETL jobs
jobs = db.query(EtlJob).filter(EtlJob.status == 'active').all()

# Cache operations
cache.get('my-key')
cache.set('my-key', 'value', ttl=3600)
```

> **Note:** Jika IPython terinstall, akan otomatis digunakan. Fallback ke Python shell biasa jika tidak.

### `flower` — Celery monitoring dashboard

```bash
# Default: http://localhost:5555
python manage.py flower

# Custom port
python manage.py flower --port 6666
```

---

## Custom Commands

### `clear-cache` — Membersihkan cache

```bash
# Lihat help
python manage.py clear-cache --help

# Hapus cache dengan pattern tertentu
python manage.py clear-cache --pattern "auth:*"
python manage.py clear-cache --pattern "job:*"

# Hapus semua cache (destructive)
python manage.py clear-cache --flush-all

# Dry run — lihat apa yang akan dihapus tanpa benar-benar menghapus
python manage.py clear-cache --pattern "job:*" --dry-run
python manage.py clear-cache --flush-all --dry-run
```

**Options:**
| Option | Description |
|---|---|
| `--pattern`, `-p` | Pattern Redis key yang akan dihapus (e.g., `"auth:*"`) |
| `--flush-all` | Hapus SEMUA cache (destructive) |
| `--dry-run` | Tampilkan apa yang akan dihapus tanpa eksekusi |

---

### `migrate` — Database migrations (Alembic)

```bash
# Lihat help
python manage.py migrate --help

# Jalankan semua pending migrations
python manage.py migrate

# Cek apakah ada pending migrations (exit code 1 jika ada)
python manage.py migrate --check

# Fake migrations — tandai sudah dijalankan tanpa eksekusi SQL
python manage.py migrate --fake

# Migrasi app spesifik
python manage.py migrate etl_control
```

**Options:**
| Option | Description |
|---|---|
| `--check` | Cek pending migrations (exit 1 jika ada) |
| `--fake` | Tandai migrasi tanpa eksekusi SQL |
| `[APP_NAME]` | (Positional) Nama app spesifik |

> **Note:** Jika Alembic tidak terinstall, akan fallback ke placeholder. Install dengan `pip install alembic`.

---

### `seed` — Mengisi database dengan data dummy

```bash
# Lihat help
python manage.py seed --help

# Seed semua models (10 records per model)
python manage.py seed

# Seed dengan jumlah custom
python manage.py seed --count 50

# Seed model spesifik
python manage.py seed --model users
python manage.py seed --model jobs
python manage.py seed --model files

# Flush data existing sebelum seed
python manage.py seed --flush --count 20

# Kombinasi
python manage.py seed --model users --count 100 --flush
```

**Models yang bisa di-seed:**
| Model | Deskripsi | Data |
|---|---|---|
| `users` | User accounts | username, email, name, password (hashed), random superuser/verified status |
| `jobs` | ETL jobs | name, description, job_type, status, schedule, config JSON |
| `files` | File registry | filename, file_path, file_size, mime_type, status, metadata |

**Options:**
| Option | Description |
|---|---|
| `--model`, `-m` | Model spesifik: `users`, `jobs`, `files` (default: semua) |
| `--count`, `-c` | Jumlah records (default: 10) |
| `--flush` | Hapus data existing sebelum seed |

> **Default password untuk seeded users:** `password123`

---

## Worker Commands

Worker commands dikelompokkan di bawah `python manage.py worker <subcommand>`.

```bash
python manage.py worker --help
```

### `worker start` — Menjalankan Celery workers

```bash
# Start semua tipe workers
python manage.py worker start

# Start worker spesifik
python manage.py worker start --worker-type email
python manage.py worker start -t data_sync

# Start di background
python manage.py worker start --worker-type default --detach

# Dry run (tidak benar-benar start)
python manage.py worker start --dry-run
```

**Worker types:** `default`, `email`, `data_sync`, `priority`, `all`

### `worker stop` — Menghentikan workers

```bash
# Stop semua workers
python manage.py worker stop --all-workers

# Stop worker spesifik
python manage.py worker stop --worker-name celery@default
```

### `worker restart` — Restart worker

```bash
python manage.py worker restart --worker-type default
python manage.py worker restart -t email
```

### `worker status` — Cek status workers

```bash
# Table format (default)
python manage.py worker status

# JSON format
python manage.py worker status --format json
```

### `worker scale` — Scale worker concurrency

```bash
python manage.py worker scale --worker-type default --concurrency 4
```

### `worker queues` — Informasi queue

```bash
python manage.py worker queues
python manage.py worker queues --format json
```

### `worker purge` — Kosongkan queue

```bash
python manage.py worker purge --queue default
python manage.py worker purge -q email --force   # Skip konfirmasi
```

### `worker beat` — Celery Beat scheduler

```bash
python manage.py worker beat
python manage.py worker beat --detach
python manage.py worker beat --dry-run
```

### `worker flower` — Celery Flower (sama dengan `python manage.py flower`)

```bash
python manage.py worker flower --port 6666
```

### `worker systemd` — Generate systemd service file

```bash
# Print ke stdout
python manage.py worker systemd --worker-type default

# Tulis ke file
python manage.py worker systemd -t email --output /etc/systemd/system/etl-email-worker.service
```

### `worker docker-compose` — Generate docker-compose untuk workers

```bash
python manage.py worker docker-compose
python manage.py worker docker-compose --output my-workers.yml
```

---

## Task Commands

Task commands dikelompokkan di bawah `python manage.py task <subcommand>`.

### `task list` — List recent tasks

```bash
# Default 20 tasks
python manage.py task list

# Filter by status
python manage.py task list --status FAILURE
python manage.py task list -s SUCCESS

# Custom limit
python manage.py task list --limit 50

# JSON output
python manage.py task list --format json
```

### `task show` — Detail task

```bash
python manage.py task show <task-id>
python manage.py task show <task-id> --format json
```

### `task cancel` — Batalkan task

```bash
python manage.py task cancel <task-id>
python manage.py task cancel <task-id> --force   # Skip konfirmasi
```

### `task stats` — Statistik task & queue

```bash
python manage.py task stats
python manage.py task stats --format json
```

---

## Cheat Sheet

```bash
# ─── Development ───────────────────────────────────────────
python manage.py runserver                          # Start dev server :8000
python manage.py runserver --reload                 # Start + auto-reload
python manage.py shell                              # Interactive shell

# ─── Database ──────────────────────────────────────────────
python manage.py migrate                            # Run pending migrations
python manage.py migrate --check                    # Check pending
python manage.py migrate --fake                     # Fake migrations
python manage.py seed                               # Seed 10 records all models
python manage.py seed --model users --count 100     # Seed 100 users
python manage.py seed --flush                       # Flush + seed

# ─── Cache ─────────────────────────────────────────────────
python manage.py clear-cache --pattern "auth:*"     # Clear auth cache
python manage.py clear-cache --flush-all            # Clear ALL cache
python manage.py clear-cache --pattern "*" --dry-run # Preview

# ─── Workers ───────────────────────────────────────────────
python manage.py worker start                       # Start all workers
python manage.py worker start -t email              # Start email worker
python manage.py worker status                      # Check worker status
python manage.py worker stop --all-workers          # Stop all workers
python manage.py worker restart -t default          # Restart default worker
python manage.py worker scale -t default -c 4       # Scale to 4 processes
python manage.py worker purge -q default            # Purge queue
python manage.py worker beat                        # Start beat scheduler
python manage.py worker docker-compose              # Generate docker-compose

# ─── Monitoring ────────────────────────────────────────────
python manage.py flower                             # Flower dashboard :5555
python manage.py task list                          # List recent tasks
python manage.py task show <id>                     # Task detail
python manage.py task stats                         # Task/queue stats
python manage.py worker queues                      # Queue info
```

---

## Arsitektur

```
manage.py  ──Typer App──┬── Auto-discovery ── commands/*.py
                        │       ├── clear_cache.py   → clear-cache
                        │       ├── migrate.py       → migrate
                        │       ├── seed.py          → seed
                        │       ├── worker.py        → worker (group)
                        │       │   ├── WorkerStartCommand      → worker start
                        │       │   ├── WorkerStopCommand       → worker stop
                        │       │   ├── WorkerRestartCommand    → worker restart
                        │       │   ├── WorkerStatusCommand     → worker status
                        │       │   ├── WorkerScaleCommand      → worker scale
                        │       │   ├── WorkerQueuesCommand     → worker queues
                        │       │   ├── WorkerPurgeCommand      → worker purge
                        │       │   ├── WorkerBeatCommand       → worker beat
                        │       │   ├── WorkerFlowerCommand     → worker flower
                        │       │   ├── WorkerSystemdCommand    → worker systemd
                        │       │   └── WorkerDockerComposeCmd  → worker docker-compose
                        │       └── task.py          → task (group)
                        │           ├── TaskListCommand         → task list
                        │           ├── TaskShowCommand         → task show
                        │           ├── TaskCancelCommand       → task cancel
                        │           └── TaskStatsCommand        → task stats
                        │
                        └── Built-in ── runserver, shell, flower
```

**Menambah command baru:**

1. Buat file `commands/my_command.py`
2. Buat class `Command` yang inherit `BaseCommand`
3. Implement `help`, `add_arguments()`, dan `handle()`
4. Jalankan `python manage.py my-command` — auto-discovered!

```python
# commands/my_command.py
from commands.base import BaseCommand
import typer

class Command(BaseCommand):
    help = "My custom command"

    def add_arguments(self):
        return {
            'name': typer.Option('World', '--name', '-n', help='Name to greet'),
        }

    def handle(self, name: str, **options):
        self.print_header(f"Hello, {name}!")
        self.success("Command executed successfully")
```
