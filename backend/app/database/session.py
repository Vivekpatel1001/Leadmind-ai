from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import declarative_base
from backend.app.core.config import settings

engine = create_async_engine(
    settings.DATABASE_URL,
    echo=False,
    connect_args={"check_same_thread": False} if "sqlite" in settings.DATABASE_URL else {}
)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False
)

Base = declarative_base()

async def get_db():
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()

from sqlalchemy import text

async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        
        # SQLite dynamic schema migration for added columns
        if "sqlite" in settings.DATABASE_URL:
            def _migrate_sqlite(sync_conn):
                # Inspect existing columns using PRAGMA table_info
                res = sync_conn.execute(text("PRAGMA table_info(leads)"))
                existing_cols = [row[1] for row in res.fetchall()]
                
                # Check and add missing columns
                new_columns = [
                    ("crm_stage", "VARCHAR DEFAULT 'Discovered'"),
                    ("decision_makers", "JSON DEFAULT '[]'"),
                    ("pitches", "JSON DEFAULT '{}'"),
                    ("outreach_logs", "JSON DEFAULT '[]'"),
                    ("call_logs", "JSON DEFAULT '[]'"),
                    ("email_campaigns", "JSON DEFAULT '[]'")
                ]
                for col_name, col_type in new_columns:
                    if col_name not in existing_cols:
                        try:
                            sync_conn.execute(text(f"ALTER TABLE leads ADD COLUMN {col_name} {col_type}"))
                            print(f"[DB Migration] Added missing column leads.{col_name}")
                        except Exception as e:
                            print(f"[DB Migration] Note on {col_name}: {e}")

            try:
                await conn.run_sync(_migrate_sqlite)
            except Exception as e:
                print(f"[DB Migration] Note: {e}")

