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
