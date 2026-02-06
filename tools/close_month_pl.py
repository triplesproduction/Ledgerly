import os
import json
from datetime import datetime
from dateutil.relativedelta import relativedelta
from supabase import create_client, Client
from dotenv import load_dotenv
import pandas as pd

load_dotenv()

def get_supabase() -> Client:
    url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("NEXT_PUBLIC_SUPABASE_ANON_KEY")
    if not url or not key:
        return None
    return create_client(url, key)

def close_month_pl(target_date: str = None):
    """
    Closes the P&L for a specific month.
    target_date: 'YYYY-MM-DD' format. If None, targets the previous month relative to today.
    """
    supabase = get_supabase()
    if not supabase:
        print("Supabase connection failed.")
        return

    if target_date:
        dt = datetime.strptime(target_date, "%Y-%m-%d")
    else:
        # Default: Previous month
        today = datetime.now()
        dt = today - relativedelta(months=1)
        
    start_date = dt.replace(day=1).strftime("%Y-%m-%d")
    end_date = (dt.replace(day=1) + relativedelta(months=1) - relativedelta(days=1)).strftime("%Y-%m-%d")
    
    month_label = dt.strftime("%B %Y")
    print(f"Closing P&L for {month_label} ({start_date} to {end_date})...")
    
    # 1. Fetch Data
    income_res = supabase.table("income").select("amount,status").gte("date", start_date).lte("date", end_date).execute()
    expenses_res = supabase.table("expenses").select("amount,status").gte("date", start_date).lte("date", end_date).execute()
    
    # 2. Calculate Stats
    total_revenue = 0.0
    for inc in income_res.data:
        # Accrual Basis: Include all 'RECEIVED', maybe 'PENDING' if we are doing accrual? 
        # gemini.md says "Net Profit (Accrual Basis):... Includes UNPAID invoices".
        # So we verify status. For this script, let's include all non-cancelled.
        # But 'status' usually: RECEIVED, PENDING.
        status = inc.get("status", "").upper()
        if status in ["RECEIVED", "PENDING", "PARTIAL", "OVERDUE"]:
             total_revenue += float(inc.get("amount", 0))
             
    total_expenses = 0.0
    for exp in expenses_res.data:
        # Accrual Basis: Includes UNPAID bills.
        # Status: Paid, Pending, Planned.
        status = exp.get("status", "").lower()
        if status in ["paid", "pending", "pending_payment"]:
            total_expenses += float(exp.get("amount", 0))
            
    net_profit = total_revenue - total_expenses
    
    snapshot = {
        "month": start_date,
        "total_revenue": total_revenue,
        "total_expenses": total_expenses,
        "net_profit": net_profit
    }
    
    print("Snapshot Report:")
    print(json.dumps(snapshot, indent=2))
    
    # 3. Save Logic (Commented out until table exists)
    # supabase.table("monthly_snapshots").upsert(snapshot).execute()
    # print("Snapshot saved to DB.")

if __name__ == "__main__":
    close_month_pl()
