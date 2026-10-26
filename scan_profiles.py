import os
import sqlite3
import shutil
import tempfile

user_data = os.path.expandvars(r'%LOCALAPPDATA%\Google\Chrome\User Data')
for p in os.listdir(user_data):
    cp = os.path.join(user_data, p, 'Network', 'Cookies')
    if os.path.exists(cp):
        with tempfile.NamedTemporaryFile(delete=False) as tmp:
            tmp_path = tmp.name
        try:
            shutil.copyfile(cp, tmp_path)
            conn = sqlite3.connect(tmp_path)
            cur = conn.cursor()
            cur.execute("SELECT name, host_key FROM cookies WHERE host_key LIKE '%linkedin%' OR host_key LIKE '%naukri%'")
            rows = cur.fetchall()
            conn.close()
            if rows:
                print(f"Profile: {p}")
                for r in rows:
                    print(f"  {r[0]} ({r[1]})")
        except Exception as e:
            pass
        finally:
            if os.path.exists(tmp_path):
                os.remove(tmp_path)
