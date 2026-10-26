import os
import sqlite3
import json

cookie_path = os.path.abspath(r'.user_browser_profile\Default\Network\Cookies')
user_data = os.path.expandvars(r'%LOCALAPPDATA%\Google\Chrome\User Data')
local_state_file = os.path.join(user_data, 'Local State')

google_accounts = []
if os.path.exists(local_state_file):
    try:
        with open(local_state_file, 'r', encoding='utf-8') as f:
            ls = json.load(f)
            info = ls.get('profile', {}).get('info_cache', {})
            for p, d in info.items():
                u = d.get('user_name', '')
                n = d.get('name', '')
                g = d.get('gaia_name', '')
                if u:
                    google_accounts.append({'profile': p, 'email': u, 'name': n, 'gaia': g})
    except:
        pass

details = {
    'totalCookies': 0,
    'storagePath': cookie_path,
    'storageSizeBytes': os.path.getsize(cookie_path) if os.path.exists(cookie_path) else 0,
    'googleAccounts': google_accounts,
    'platforms': {},
    'topDomains': []
}

if os.path.exists(cookie_path):
    try:
        conn = sqlite3.connect(cookie_path)
        cur = conn.cursor()
        
        cur.execute("SELECT count(*) FROM cookies")
        details['totalCookies'] = cur.fetchone()[0]
        
        # Check LinkedIn
        cur.execute("SELECT name FROM cookies WHERE host_key LIKE '%linkedin%'")
        li_names = [r[0] for r in cur.fetchall()]
        details['platforms']['linkedin'] = {
            'count': len(li_names),
            'status': 'Synced & Active' if len(li_names) > 0 else 'Not Found',
            'sampleCookies': li_names[:6]
        }
        
        # Check Naukri
        cur.execute("SELECT name FROM cookies WHERE host_key LIKE '%naukri%'")
        nk_names = [r[0] for r in cur.fetchall()]
        details['platforms']['naukri'] = {
            'count': len(nk_names),
            'status': 'Synced & Active' if len(nk_names) > 0 else 'Not Found',
            'sampleCookies': nk_names[:6]
        }
        
        # Check Google
        cur.execute("SELECT count(*) FROM cookies WHERE host_key LIKE '%google%'")
        g_count = cur.fetchone()[0]
        details['platforms']['google'] = {
            'count': g_count,
            'status': 'Authenticated' if g_count > 0 else 'Not Found',
            'activeEmail': 'imranpasha.ahmed@gmail.com',
            'candidate': 'Imran Pasha'
        }
        
        # Check GitHub
        cur.execute("SELECT count(*) FROM cookies WHERE host_key LIKE '%github%'")
        gh_count = cur.fetchone()[0]
        details['platforms']['github'] = {
            'count': gh_count,
            'status': 'Synced' if gh_count > 0 else 'Not Found'
        }
        
        # Top domains
        cur.execute("SELECT host_key, count(*) FROM cookies GROUP BY host_key ORDER BY count(*) DESC LIMIT 15")
        for h, c in cur.fetchall():
            details['topDomains'].append({'domain': h, 'cookies': c})
            
        conn.close()
    except Exception as e:
        details['error'] = str(e)

print(json.dumps(details, indent=2))
