export interface Client {
    id: string;
    name: string;
    industry: string;
    email: string;
    phone?: string;
    address?: string;
    value?: number;
    status: string;
    created_at?: string;
}

export interface Income {
    id: string;
    date: string;
    amount: number;
    description: string;
    category: string;
    payment_method: string;
    status: 'PAID' | 'PENDING' | 'OVERDUE' | 'EXPECTED' | 'RECEIVED';
    client_id?: string;
    service_id?: string;
    clients?: { name: string };
    services?: { name: string };
    retainer_instance_id?: string;
    milestone_label?: string;
}

export interface Campaign {
    id: string;
    name: string;
    client?: string;
    budget: number;
    budget_travel?: number;
    budget_accommodation?: number;
    budget_food?: number;
    budget_other_expense?: number;
    start_date: string;
    end_date: string;
    status: 'Active' | 'Completed' | string;
    created_at?: string;
}

export type CampaignExpenseCategory = 'Travel' | 'Accommodation' | 'Food' | 'Other Expense';

export interface CampaignExpense {
    id: string;
    campaign_id: string;
    date: string;
    category: CampaignExpenseCategory;
    description: string;
    amount: number;
    payment_method?: 'Online' | 'Cash';
    created_at?: string;
}
