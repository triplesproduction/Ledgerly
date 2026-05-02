import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";

export async function generateReport(type: "pnl" | "income" | "expense", year: string, month: string, data: any) {
    const doc = new jsPDF();
    const monthName = format(new Date(parseInt(year), parseInt(month) - 1), 'MMMM yyyy');
    
    // Header
    doc.setFontSize(20);
    doc.setTextColor(40, 40, 40);
    const title = type === "pnl" ? "Profit & Loss Statement" : type === "income" ? "Income Report" : "Expense Report";
    doc.text(title, 14, 22);
    
    doc.setFontSize(11);
    doc.setTextColor(100, 100, 100);
    doc.text(`Period: ${monthName}`, 14, 30);
    doc.text(`Generated: ${format(new Date(), 'PPpp')}`, 14, 36);

    let currentY = 45;

    if (type === "pnl") {
        const { income, expenses } = data;
        const totalIncome = income.reduce((acc: number, curr: any) => acc + Number(curr.amount), 0);
        const totalExpense = expenses.reduce((acc: number, curr: any) => acc + Number(curr.amount), 0);
        const netProfit = totalIncome - totalExpense;

        // Summary
        doc.setFontSize(14);
        doc.setTextColor(40, 40, 40);
        doc.text("Financial Summary", 14, currentY);
        
        autoTable(doc, {
            startY: currentY + 5,
            head: [['Metric', 'Amount']],
            body: [
                ['Total Revenue', `Rs. ${totalIncome.toLocaleString()}`],
                ['Total Expenses', `Rs. ${totalExpense.toLocaleString()}`],
                ['Net Profit', `Rs. ${netProfit.toLocaleString()}`]
            ],
            theme: 'grid',
            headStyles: { fillColor: [255, 85, 0] } // Orange
        });

        currentY = (doc as any).lastAutoTable.finalY + 15;

        // Breakdown
        doc.setFontSize(14);
        doc.text("Revenue Breakdown", 14, currentY);
        const incomeBody = income.map((i: any) => [
            format(new Date(i.date), 'PP'),
            i.client?.name || i.description || 'General',
            i.category || '-',
            `Rs. ${Number(i.amount).toLocaleString()}`
        ]);
        
        autoTable(doc, {
            startY: currentY + 5,
            head: [['Date', 'Client/Source', 'Category', 'Amount']],
            body: incomeBody.length ? incomeBody : [['-', 'No revenue this month', '-', '-']],
            theme: 'striped'
        });

        currentY = (doc as any).lastAutoTable.finalY + 15;

        doc.text("Expense Breakdown", 14, currentY);
        const expenseBody = expenses.map((e: any) => [
            format(new Date(e.date), 'PP'),
            e.vendor || e.category || 'General',
            e.category || '-',
            `Rs. ${Number(e.amount).toLocaleString()}`
        ]);

        autoTable(doc, {
            startY: currentY + 5,
            head: [['Date', 'Vendor/Category', 'Category', 'Amount']],
            body: expenseBody.length ? expenseBody : [['-', 'No expenses this month', '-', '-']],
            theme: 'striped'
        });
    } else if (type === "income") {
        const { income } = data;
        
        const totalIncome = income.reduce((acc: number, curr: any) => acc + Number(curr.amount), 0);
        const received = income.filter((i: any) => i.status === 'RECEIVED').reduce((acc: number, curr: any) => acc + Number(curr.amount), 0);
        const pending = totalIncome - received;

        doc.setFontSize(14);
        doc.setTextColor(40, 40, 40);
        doc.text("Income Summary", 14, currentY);
        
        autoTable(doc, {
            startY: currentY + 5,
            head: [['Status', 'Amount']],
            body: [
                ['Total Billed', `Rs. ${totalIncome.toLocaleString()}`],
                ['Received', `Rs. ${received.toLocaleString()}`],
                ['Pending/Overdue', `Rs. ${pending.toLocaleString()}`]
            ],
            theme: 'grid',
            headStyles: { fillColor: [34, 197, 94] } // Green
        });

        currentY = (doc as any).lastAutoTable.finalY + 15;

        doc.setFontSize(14);
        doc.text("Detailed Transactions", 14, currentY);
        const incomeBody = income.map((i: any) => [
            format(new Date(i.date), 'PP'),
            i.client?.name || i.description || 'General',
            i.status,
            `Rs. ${Number(i.amount).toLocaleString()}`
        ]);
        
        autoTable(doc, {
            startY: currentY + 5,
            head: [['Date', 'Client/Source', 'Status', 'Amount']],
            body: incomeBody.length ? incomeBody : [['-', 'No income records', '-', '-']],
            theme: 'striped'
        });
    } else if (type === "expense") {
        const { expenses } = data;
        
        const totalExpense = expenses.reduce((acc: number, curr: any) => acc + Number(curr.amount), 0);

        doc.setFontSize(14);
        doc.setTextColor(40, 40, 40);
        doc.text("Expense Summary", 14, currentY);
        
        // Group by category
        const categories: Record<string, number> = {};
        expenses.forEach((e: any) => {
            const cat = e.category || 'Uncategorized';
            categories[cat] = (categories[cat] || 0) + Number(e.amount);
        });

        const catBody = Object.entries(categories).map(([c, a]) => [c, `Rs. ${a.toLocaleString()}`]);

        autoTable(doc, {
            startY: currentY + 5,
            head: [['Category', 'Amount']],
            body: catBody.length ? catBody : [['-', '-']],
            foot: [['Total', `Rs. ${totalExpense.toLocaleString()}`]],
            theme: 'grid',
            headStyles: { fillColor: [239, 68, 68] } // Red
        });

        currentY = (doc as any).lastAutoTable.finalY + 15;

        doc.setFontSize(14);
        doc.text("Detailed Expenses", 14, currentY);
        const expenseBody = expenses.map((e: any) => [
            format(new Date(e.date), 'PP'),
            e.vendor || e.category || 'General',
            e.status,
            `Rs. ${Number(e.amount).toLocaleString()}`
        ]);
        
        autoTable(doc, {
            startY: currentY + 5,
            head: [['Date', 'Vendor/Category', 'Status', 'Amount']],
            body: expenseBody.length ? expenseBody : [['-', 'No expense records', '-', '-']],
            theme: 'striped'
        });
    }

    doc.save(`${title.replace(/\s+/g, "_")}_${monthName.replace(/\s+/g, "_")}.pdf`);
}
