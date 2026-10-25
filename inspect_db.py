import sqlite3

conn = sqlite3.connect("urea_management.db")
cursor = conn.cursor()

for table in ("stores", "dealers", "inventory"):
    print(f"\n--- {table} ---")
    cursor.execute(f"SELECT * FROM {table}")
    for row in cursor.fetchall():
        print(row)

conn.close()