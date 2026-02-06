export type RecurringRuleStatus = 'active' | 'paused' | 'ended';

export interface RecurringRule {
    id: string;
    created_at: string;
    client_id: string;
    service_id: string;
    amount: number;
    frequency: 'monthly'; // Fixed for now as per requirements
    default_day: number;
    start_date: string; // ISO date string YYYY-MM-DD
    end_date: string | null;
    status: RecurringRuleStatus;
    last_generated_date: string | null;
    // Joined fields
    clients?: { name: string };
    services?: { name: string };
}
