// Purchase Transactions Page - based on Receipts layout
import React from 'react';

// Dummy data for purchase transactions (replace with real data fetching)
const purchaseTransactions = [
  {
    id: 1,
    supplier: 'Supplier A',
    date: 'February 2, 2026 at 02:28:35 AM',
    total: 120.0,
    status: 'Completed',
  },
  {
    id: 2,
    supplier: 'Supplier B',
    date: 'February 3, 2026 at 10:45:43 PM',
    total: 250.0,
    status: 'Pending',
  },
  // ...more data
];

export default function PurchaseTransactionsPage() {
  return (
    <div style={{ padding: '1.5rem' }}>
      <h2 style={{ background: '#b71c1c', color: 'white', padding: '1rem', borderRadius: '8px 8px 0 0' }}>
        Purchase Transactions
      </h2>
      <table style={{ width: '100%', background: 'white', borderRadius: '0 0 8px 8px', overflow: 'hidden' }}>
        <thead>
          <tr style={{ background: '#f5f5f5' }}>
            <th style={{ padding: '0.75rem' }}>Purchase ID</th>
            <th style={{ padding: '0.75rem' }}>Date & Time</th>
            <th style={{ padding: '0.75rem' }}>Supplier</th>
            <th style={{ padding: '0.75rem' }}>Total Amount</th>
            <th style={{ padding: '0.75rem' }}>Status</th>
          </tr>
        </thead>
        <tbody>
          {purchaseTransactions.map((tx) => (
            <tr key={tx.id}>
              <td style={{ padding: '0.75rem', fontWeight: 'bold', color: '#b71c1c' }}>#{tx.id}</td>
              <td style={{ padding: '0.75rem' }}>{tx.date}</td>
              <td style={{ padding: '0.75rem' }}>{tx.supplier}</td>
              <td style={{ padding: '0.75rem', fontWeight: 'bold' }}>₱{tx.total.toFixed(2)}</td>
              <td style={{ padding: '0.75rem', color: tx.status === 'Completed' ? 'green' : 'orange' }}>{tx.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {/* You can add summary charts and filters here, similar to the Receipts page */}
    </div>
  );
}
