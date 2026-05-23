// Ledger Service - Layer 6 (Source of Truth)
// Immutable database operations for trade and wallet ledger
// ONLY WRITE OPERATIONS - NO BUSINESS LOGIC

import { createClient } from '@supabase/supabase-js';
import { ExchangeEvent, EventType } from '../shared/event-schemas/events';

export interface TradeRecord {
  id: string;
  trade_id: string;
  symbol: string;
  buy_order_id: string;
  sell_order_id: string;
  buyer_id: string;
  seller_id: string;
  price: number;
  quantity: number;
  buyer_fee: number;
  seller_fee: number;
  executed_at: string;
  signature: string;
}

export interface WalletLedgerEntry {
  id: string;
  user_id: string;
  transaction_type: string;
  amount: number;
  balance_after: number;
  reference_type: string;
  reference_id: string;
  created_at: string;
}

export class LedgerService {
  private supabase: any;
  private isConnected: boolean = false;
  private writeQueue: ExchangeEvent[] = [];
  private isProcessing: boolean = false;

  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_KEY || ''
    );
  }

  async connect(): Promise<void> {
    this.isConnected = true;
    console.log('[LedgerService] Connected to database');
    this.startWriteProcessor();
    this.startHealthCheck();
  }

  async disconnect(): Promise<void> {
    this.isConnected = false;
    console.log('[LedgerService] Disconnected from database');
  }

  private startWriteProcessor(): void {
    setInterval(async () => {
      if (this.isProcessing || this.writeQueue.length === 0) return;

      this.isProcessing = true;
      const batch = this.writeQueue.splice(0, 100);

      try {
        await this.processBatch(batch);
      } catch (error) {
        console.error('[LedgerService] Batch processing error:', error);
      } finally {
        this.isProcessing = false;
      }
    }, 100);
  }

  private startHealthCheck(): void {
    setInterval(async () => {
      const stats = this.getStats();
      console.log('[LedgerService] Health check:', stats);
    }, 30000);
  }

  async writeEvent(event: ExchangeEvent): Promise<void> {
    if (!this.isConnected) {
      throw new Error('LedgerService not connected');
    }

    this.writeQueue.push(event);
    console.log(`[LedgerService] Queued event: ${event.event_type} (${event.event_id})`);
  }

  private async processBatch(events: ExchangeEvent[]): Promise<void> {
    for (const event of events) {
      try {
        await this.processSingleEvent(event);
      } catch (error) {
        console.error(`[LedgerService] Error processing event ${event.event_id}:`, error);
      }
    }
  }

  private async processSingleEvent(event: ExchangeEvent): Promise<void> {
    switch (event.event_type) {
      case EventType.TRADE_EXECUTED:
        await this.writeTradeRecord(event);
        break;

      case EventType.WALLET_CREDIT:
      case EventType.WALLET_DEBIT:
        await this.writeWalletEntry(event);
        break;

      case EventType.POSITION_OPENED:
      case EventType.POSITION_CLOSED:
      case EventType.POSITION_LIQUIDATED:
        await this.writePositionRecord(event);
        break;

      case EventType.LIQUIDATION_TRIGGERED:
        await this.writeLiquidationRecord(event);
        break;

      default:
        console.log(`[LedgerService] Unhandled event type: ${event.event_type}`);
    }
  }

  private async writeTradeRecord(event: any): Promise<void> {
    const trade = event.payload;

    const tradeRecord: TradeRecord = {
      id: trade.trade_id,
      trade_id: trade.trade_id,
      symbol: trade.symbol,
      buy_order_id: trade.buy_order_id,
      sell_order_id: trade.sell_order_id,
      buyer_id: trade.buyer_id,
      seller_id: trade.seller_id,
      price: trade.price,
      quantity: trade.quantity,
      buyer_fee: trade.buyer_fee,
      seller_fee: trade.seller_fee,
      executed_at: trade.executed_at,
      signature: this.generateSignature(trade),
    };

    const { error } = await this.supabase.from('trades').insert(tradeRecord);
    if (error) throw error;

    console.log(`[LedgerService] Trade written: ${trade.trade_id}`);
    await this.updateUserStats(trade.buyer_id, trade.seller_id);
  }

  private async writeWalletEntry(event: any): Promise<void> {
    const payload = event.payload;
    const amount = event.event_type === EventType.WALLET_CREDIT ? payload.amount : -payload.amount;

    const { data: wallet, error: walletError } = await this.supabase
      .from('wallets')
      .select('*')
      .eq('user_id', payload.user_id)
      .maybeSingle();

    if (walletError) throw walletError;

    const newBalance = (wallet?.balance || 0) + amount;

    const { error: updateError } = await this.supabase
      .from('wallets')
      .update({ balance: newBalance, updated_at: new Date().toISOString() })
      .eq('user_id', payload.user_id);

    if (updateError) throw updateError;

    const transaction = {
      user_id: payload.user_id,
      type: event.event_type,
      amount,
      balance_after: newBalance,
      description: `${payload.reference_type} - ${payload.reference_id}`,
      reference_id: payload.reference_id,
    };

    const { error: txError } = await this.supabase.from('transactions').insert(transaction);
    if (txError) throw txError;

    console.log(`[LedgerService] Wallet updated: ${payload.user_id} -> ${newBalance}`);
  }

  private async writePositionRecord(event: any): Promise<void> {
    const payload = event.payload;

    const positionRecord = {
      user_id: payload.user_id,
      order_id: payload.order_id,
      type: event.event_type === EventType.POSITION_OPENED ? 'OPEN' : 'CLOSED',
      entry_price: payload.entry_price || payload.exit_price,
      amount: payload.quantity,
      current_price: payload.current_price || payload.exit_price,
      pnl: payload.realized_pnl || 0,
      status: event.event_type === EventType.POSITION_LIQUIDATED ? 'LIQUIDATED' : 'CLOSED',
    };

    switch (event.event_type) {
      case EventType.POSITION_OPENED:
        const { error: insertError } = await this.supabase.from('positions').insert({
          id: payload.position_id,
          user_id: payload.user_id,
          type: payload.side,
          entry_price: payload.entry_price,
          amount: payload.quantity,
          current_price: payload.entry_price,
          pnl: 0,
          pnl_percent: 0,
          status: 'OPEN',
        });
        if (insertError) throw insertError;
        break;

      case EventType.POSITION_CLOSED:
      case EventType.POSITION_LIQUIDATED:
        const { error: updateError } = await this.supabase
          .from('positions')
          .update({
            status: event.event_type === EventType.POSITION_LIQUIDATED ? 'LIQUIDATED' : 'CLOSED',
            pnl: payload.realized_pnl,
            current_price: payload.exit_price,
            closed_at: new Date().toISOString(),
          })
          .eq('id', payload.position_id);
        if (updateError) throw updateError;
        break;
    }

    console.log(`[LedgerService] Position record written: ${payload.position_id}`);
  }

  private async writeLiquidationRecord(event: any): Promise<void> {
    const payload = event.payload;

    const { error } = await this.supabase.from('events').insert({
      event_type: 'LIQUIDATION',
      user_id: payload.user_id,
      payload: {
        position_id: payload.position_id,
        margin_ratio: payload.current_margin_ratio,
        maintenance_margin: payload.maintenance_margin,
        triggered_at: payload.triggered_at,
      },
    });

    if (error) throw error;
    console.log(`[LedgerService] Liquidation record written: ${payload.position_id}`);
  }

  private generateSignature(trade: any): string {
    const data = `${trade.trade_id}:${trade.buy_order_id}:${trade.sell_order_id}:${trade.price}:${trade.quantity}`;
    return Buffer.from(data).toString('base64');
  }

  private async updateUserStats(buyerId: string, sellerId: string): Promise<void> {
    await this.supabase.rpc('increment_trade_count', { user_id: buyerId });
    await this.supabase.rpc('increment_trade_count', { user_id: sellerId });
  }

  getStats(): any {
    return {
      queueLength: this.writeQueue.length,
      isConnected: this.isConnected,
      isProcessing: this.isProcessing,
    };
  }
}

let ledgerServiceInstance: LedgerService | null = null;

export function getLedgerService(): LedgerService {
  if (!ledgerServiceInstance) {
    ledgerServiceInstance = new LedgerService();
  }
  return ledgerServiceInstance;
}
