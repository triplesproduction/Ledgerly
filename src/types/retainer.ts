export interface MilestoneConfig {
    name: string;
    type: 'percent' | 'fixed' | 'remainder';
    value?: number; // percentage or fixed amount
    day_offset: number; // days after instance month start
}

export interface RetainerContract {
    id: string;
    client_id: string;
    service_id?: string;
    name: string;
    status: 'active' | 'paused' | 'terminated';
    created_at: string;
    // Joined fields
    clients?: { name: string };
    services?: { name: string };
}

export interface ContractVersion {
    id: string;
    contract_id: string;
    monthly_price: number;
    effective_start_date: string;
    effective_end_date?: string;
    payment_structure: MilestoneConfig[];
    created_at: string;
}

export interface MonthlyInstance {
    id: string;
    contract_version_id: string;
    month_date: string;
    total_due: number;
    status: 'scheduled' | 'generated' | 'partial' | 'paid' | 'skipped';
    created_at: string;
}
