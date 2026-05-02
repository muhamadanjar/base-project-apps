# Base Project Apps

## Structure
- services/usermanagement_api : FastAPI user management (role, permission)
- services/dashboard : Next.js dashboard (admin & user view)
- services/etl_api : FastAPI ETL 

## Setup

1. Initialize submodules
   ```bash
   git submodule init
   git submodule update
   ```

2. Create env files 
   ```bash
   cp local/usermanagement_env.local local/usermanagement_env.env
   cp local/dashboard_env.local local/dashboard_env.env
   cp local/etl_env.local local/etl_env.env
   
   ln -s local/usermanagement_env.env services/usermanagement_api/.env
   ln -s local/dashboard_env.env services/dashboard/.env
   ln -s local/etl_env.env services/etl_api/.env
   ```

3. Install dependencies
   ```bash
   cd services/usermanagement_api
   pip install -r requirements.txt
   cd ../dashboard
   npm install
   cd ../etl_api
   pip install -r requirements.txt
   ```

4. Run
   ```bash
   cd services/usermanagement_api
   uvicorn main:app --reload
   cd ../dashboard
   npm run dev
   cd ../etl_api
   uvicorn main:app --reload
   ```

## Database
```sql
-- Init usermanagement database
CREATE DATABASE usermanagement;

-- Init dashboard database
CREATE DATABASE dashboard;

-- Init etl database
CREATE DATABASE etl;
``` 