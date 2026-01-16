import { NextResponse } from 'next/server';
import { supabase } from '@arenax/database';
import { sendPushNotification } from '@/lib/notifications';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { id: invoiceId, external_id: transactionId, status, amount } = body;

        // 1. Verify Xendit Webhook Token (Optional but recommended)
        const xenditWebhookToken = request.headers.get('x-callback-token');
        if (process.env.XENDIT_WEBHOOK_TOKEN && xenditWebhookToken !== process.env.XENDIT_WEBHOOK_TOKEN) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        if (status === 'PAID' || status === 'SETTLED') {
            // 2. Find the transaction
            const { data: transaction, error: txError } = await supabase
                .from('transactions')
                .select('*')
                .eq('id', transactionId)
                .single();

            if (txError || !transaction) {
                console.error('Transaction not found for webhook:', transactionId);
                return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
            }

            // 3. Prevent duplicate processing
            if (transaction.status === 'completed') {
                return NextResponse.json({ message: 'Transaction already processed' });
            }

            // 4. Update transaction status
            const { error: updateTxError } = await supabase
                .from('transactions')
                .update({ status: 'completed', updated_at: new Date().toISOString() })
                .eq('id', transactionId);

            if (updateTxError) {
                console.error('Error updating transaction status:', updateTxError);
                return NextResponse.json({ error: 'Failed to update transaction' }, { status: 500 });
            }

            // 5. Update wallet balance
            // We use a simple increment here. In a production environment, 
            // you might want to use a database function or transaction to ensure atomicity.
            const { data: wallet, error: walletError } = await supabase
                .from('wallets')
                .select('balance')
                .eq('user_id', transaction.user_id)
                .single();

            if (walletError || !wallet) {
                console.error('Wallet not found for user:', transaction.user_id);
                return NextResponse.json({ error: 'Wallet not found' }, { status: 404 });
            }

            const newBalance = Number(wallet.balance) + Number(amount);

            const { error: updateWalletError } = await supabase
                .from('wallets')
                .update({
                    balance: newBalance,
                    updated_at: new Date().toISOString()
                })
                .eq('user_id', transaction.user_id);

            if (updateWalletError) {
                console.error('Error updating wallet balance:', updateWalletError);
                return NextResponse.json({ error: 'Failed to update wallet' }, { status: 500 });
            }

            console.log(`Successfully processed payment for transaction ${transactionId}. New balance: ${newBalance}`);

            // 6. Send Notification to User
            try {
                const title = 'Top Up Successful! 💰';
                const body = `Your wallet has been topped up with RM ${Number(amount).toFixed(2)}. Your new balance is RM ${newBalance.toFixed(2)}.`;
                await sendPushNotification(transaction.user_id, title, body, {
                    type: 'payment_success',
                    amount: amount.toString(),
                    newBalance: newBalance.toString()
                });
            } catch (notiError) {
                console.error("Failed to send payment notification:", notiError);
            }
        }

        return NextResponse.json({ message: 'Webhook processed successfully' });

    } catch (error: any) {
        console.error('Xendit Webhook Error:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
