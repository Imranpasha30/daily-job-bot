import os
import sqlite3
import shutil
import tempfile
import json

bot_cookies_path = os.path.abspath(r'.user_browser_profile\Default\Network\Cookies')
user_data = os.path.expandvars(r'%LOCALAPPDATA%\Google\Chrome\User Data')

if not os.path.exists(os.path.dirname(bot_cookies_path)):
    os.makedirs(os.path.dirname(bot_cookies_path), exist_ok=True)

# Find all Chrome profiles
profiles = ['Default']
for item in os.listdir(user_data):
    if item.startswith('Profile ') and os.path.isdir(os.path.join(user_data, item)):
        profiles.append(item)

print(f"Scanning {len(profiles)} Chrome profiles...")

# Connect to destination
bot_conn = sqlite3.connect(bot_cookies_path)
bot_cur = bot_conn.cursor()

# Get schema of cookies table
bot_cur.execute("SELECT sql FROM sqlite_master WHERE type='table' AND name='cookies'")
schema_row = bot_cur.fetchone()

merged_count = 0
sources = []

for prof in profiles:
    for sub in [os.path.join(prof, 'Network', 'Cookies'), os.path.join(prof, 'Cookies')]:
        src_path = os.path.join(user_data, sub)
        if os.path.exists(src_path):
            with tempfile.NamedTemporaryFile(delete=False) as tmp:
                tmp_path = tmp.name
            try:
                shutil.copyfile(src_path, tmp_path)
                src_conn = sqlite3.connect(tmp_path)
                src_cur = src_conn.cursor()
                
                # Filter for valuable domains: linkedin, naukri, google, github, ats boards
                query = """
                    SELECT * FROM cookies 
                    WHERE host_key LIKE '%linkedin%' 
                       OR host_key LIKE '%naukri%' 
                       OR host_key LIKE '%google%' 
                       OR host_key LIKE '%github%'
                       OR host_key LIKE '%greenhouse%'
                       OR host_key LIKE '%lever%'
                       OR host_key LIKE '%ashby%'
                """
                src_cur.execute(query)
                rows = src_cur.fetchall()
                col_names = [desc[0] for desc in src_cur.description]
                
                if rows:
                    sources.append(f"{prof}: {len(rows)} cookies")
                    placeholders = ','.join(['?'] * len(col_names))
                    cols_str = ','.join(col_names)
                    sql = f"INSERT OR REPLACE INTO cookies ({cols_str}) VALUES ({placeholders})"
                    bot_cur.executemany(sql, rows)
                    merged_count += len(rows)
                
                src_conn.close()
            except Exception as e:
                pass
            finally:
                if os.path.exists(tmp_path):
                    os.remove(tmp_path)

bot_conn.commit()

# Query breakdown of bot cookies
breakdown = {}
bot_cur.execute("SELECT host_key, count(*) FROM cookies GROUP BY host_key ORDER BY count(*) DESC")
for host, count in bot_cur.fetchall():
    breakdown[host] = count

bot_cur.execute("SELECT count(*) FROM cookies")
total_now = bot_cur.fetchone()[0]

bot_conn.close()

result = {
    'totalCookies': total_now,
    'mergedFromProfiles': sources,
    'topDomains': breakdown
}

print(json.dumps(result, indent=2))
