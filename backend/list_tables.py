from sqlalchemy import create_engine, inspect
from config import DATABASE_URL

def list_tables():
    # Remove 'asyncpg' and replace with the sync PostgreSQL driver
    sync_db_url = DATABASE_URL.replace('asyncpg', 'psycopg2')
    
    engine = create_engine(sync_db_url)
    
    # Create an inspector
    inspector = inspect(engine)
    
    # Get table names
    table_names = inspector.get_table_names()
    
    print("Tables in the database:")
    for table in table_names:
        print(f"- {table}")
        
        # Get column information
        columns = inspector.get_columns(table)
        print("  Columns:")
        for column in columns:
            print(f"  - {column['name']}: {column['type']}")
        print()

if __name__ == '__main__':
    list_tables() 