import os
from supabase import create_client, Client
from dotenv import load_dotenv
import pandas as pd

load_dotenv()

def get_supabase() -> Client:
    url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("NEXT_PUBLIC_SUPABASE_ANON_KEY")
    if not url or not key:
        print("Warning: Supabase credentials not found. Skipping DB check.")
        return None
    return create_client(url, key)

def verify_integrity():
    supabase = get_supabase()
    if not supabase:
        return

    print("Running Integrity Checks...")
    issues = []

    # 1. Expense Integrity
    # Rule: If status is 'Paid', it should have a date.
    # Actually, in the DB `date` is likely required, but let's check.
    expenses = supabase.table("expenses").select("*").execute().data
    
    for exp in expenses:
        status = exp.get("status", "").lower()
        date = exp.get("date")
        
        if status == "paid" and not date:
            issues.append(f"[Expense] ID {exp['id']} is PAID but has no date.")
            
        if exp.get("amount") is not None and float(exp["amount"]) < 0:
             issues.append(f"[Expense] ID {exp['id']} has negative amount: {exp['amount']}")

    # 2. Income Integrity
    # Rule: If status is 'RECEIVED', it should have a date.
    income = supabase.table("income").select("*").execute().data
    
    for inc in income:
        status = inc.get("status", "").upper() # Income status is usually uppercase in code, but checking DB value
        date = inc.get("date")
        
        # In gemini.ts: IncomeStatus is PENDING, RECEIVED, etc.
        if status == "RECEIVED" and not date:
            issues.append(f"[Income] ID {inc['id']} is RECEIVED but has no date.")
            
    # 3. Report
    if issues:
        print(f"FAILED: Found {len(issues)} integrity violations.")
        for issue in issues:
            print(f" - {issue}")
        exit(1) # Fail the CI/CD pipeline
    else:
        print("PASSED: No integrity violations found.")

if __name__ == "__main__":
    verify_integrity()
