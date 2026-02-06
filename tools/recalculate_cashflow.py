import os
import json
from datetime import datetime, timedelta
from supabase import create_client, Client
from dotenv import load_dotenv
import pandas as pd

# Load environment variables
load_dotenv()

def get_supabase() -> Client:
    url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("NEXT_PUBLIC_SUPABASE_ANON_KEY")
    if not url or not key:
        raise ValueError("Supabase credentials not found in environment variables.")
    return create_client(url, key)

def fetch_data(supabase: Client):
    # Fetch all income
    # Note: efficient fetching would limit fields and maybe date range, but for now fetching all
    income_res = supabase.table("income").select("amount,date,status").execute()
    
    # Fetch all expenses
    expenses_res = supabase.table("expenses").select("amount,date,status").execute()
    
    return income_res.data, expenses_res.data

def calculate_cashflow(start_balance: float = 0.0, horizon_days: int = 90):
    supabase = get_supabase()
    income_data, expenses_data = fetch_data(supabase)
    
    # Convert to DataFrame for easier manipulation
    df_income = pd.DataFrame(income_data)
    df_expenses = pd.DataFrame(expenses_data)
    
    # Ensure dates are datetime
    if not df_income.empty:
        df_income['date'] = pd.to_datetime(df_income['date'])
    if not df_expenses.empty:
        df_expenses['date'] = pd.to_datetime(df_expenses['date'])
    
    # 1. Calculate Current Liquid Cash (Historical)
    # Sum of all RECEIVED income - Sum of all PAID expenses (up to today)
    today = pd.Timestamp.now().normalize()
    
    total_income = 0.0
    if not df_income.empty:
        received_mask = (df_income['status'] == 'RECEIVED') & (df_income['date'] <= today)
        total_income = df_income.loc[received_mask, 'amount'].sum()
        
    total_expenses = 0.0
    if not df_expenses.empty:
        paid_mask = (df_expenses['status'] == 'Paid') & (df_expenses['date'] <= today) # Note: status 'Paid' matches table default
        total_expenses = df_expenses.loc[paid_mask, 'amount'].sum()
        
    current_liquid_cash = start_balance + total_income - total_expenses
    
    print(f"Current Liquid Cash: {current_liquid_cash}")
    
    # 2. Project Forward 90 Days
    projection = []
    running_balance = current_liquid_cash
    
    for i in range(1, horizon_days + 1):
        future_date = today + timedelta(days=i)
        
        # Expected Income (PENDING/PARTIAL/OVERDUE? maybe) on this date
        expected_income = 0.0
        if not df_income.empty:
            # Assuming 'date' in income represents expected receipt date for pending items
            # statuses: PENDING, PARTIAL
            pending_mask = (df_income['status'].isin(['PENDING', 'PARTIAL'])) & (df_income['date'] == future_date)
            expected_income = df_income.loc[pending_mask, 'amount'].sum()
            
        # Expected Expenses (PENDING_PAYMENT, PLANNED) on this date
        expected_expenses = 0.0
        if not df_expenses.empty:
            # statuses: 'Pending', 'Planned' (Checking exact casing from table if possible, assuming PascalCase based on 'Paid')
            # The schema in gemini.ts said "PENDING_PAYMENT", but the SQL default said 'Paid'.
            # I will use a case-insensitive check or broad list for safety.
            pending_exp_mask = (df_expenses['date'] == future_date) & (~df_expenses['status'].str.lower().isin(['paid']))
            expected_expenses = df_expenses.loc[pending_exp_mask, 'amount'].sum()
        
        running_balance += expected_income - expected_expenses
        
        projection.append({
            "date": future_date.strftime("%Y-%m-%d"),
            "balance": float(running_balance),
            "inflow": float(expected_income),
            "outflow": float(expected_expenses)
        })
        
    return projection

if __name__ == "__main__":
    try:
        results = calculate_cashflow()
        print(json.dumps(results, indent=2))
    except Exception as e:
        print(f"Error: {e}")
        exit(1)
