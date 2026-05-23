// Liquidation Engine - Risk Management and Margin Calculation System
// Implements real-time margin monitoring and forced liquidation logic

export interface Position {
  position_id: string;
  user_id: string;
  symbol: string;
  side: 'LONG' | 'SHORT';
  entry_price: number;
  quantity: number;
  leverage: number;
  margin: number;
  current_price: number;
  unrealized_pnl: number;
  margin_ratio: number;
  liquidation_price: number;
  opened_at: number;
}

export interface LiquidationTrigger {
  position_id: string;
  user_id: string;
  symbol: string;
  current_margin_ratio: number;
  maintenance_margin: number;
  trigger_price: number;
  triggered_at: number;
  penalty_rate: number;
}

export interface MarginCall {
  user_id: string;
  position_id: string;
  current_margin_ratio: number;
  required_margin_ratio: number;
  deficit: number;
  timestamp: number;
}

// Margin Calculation Engine
export class MarginCalculator {
  // Default maintenance margin requirement (10%)
  static MAINTENANCE_MARGIN = 0.10;

  // Liquidation penalty rate (2.5%)
  static LIQUIDATION_PENALTY = 0.025;

  // Margin call threshold (15%)
  static MARGIN_CALL_THRESHOLD = 0.15;

  static calculateUnrealizedPnL(
    side: 'LONG' | 'SHORT',
    entryPrice: number,
    currentPrice: number,
    quantity: number
  ): number {
    if (side === 'LONG') {
      return (currentPrice - entryPrice) * quantity;
    } else {
      return (entryPrice - currentPrice) * quantity;
    }
  }

  static calculateEquity(
    walletBalance: number,
    unrealizedPnL: number
  ): number {
    return walletBalance + unrealizedPnL;
  }

  static calculatePositionNotional(
    quantity: number,
    currentPrice: number,
    leverage: number
  ): number {
    return quantity * currentPrice * leverage;
  }

  static calculateMarginRatio(
    equity: number,
    positionNotional: number
  ): number {
    if (positionNotional === 0) return Infinity;
    return equity / positionNotional;
  }

  static calculateLiquidationPrice(
    side: 'LONG' | 'SHORT',
    entryPrice: number,
    margin: number,
    quantity: number,
    leverage: number
  ): number {
    const maintenanceMargin = this.MAINTENANCE_MARGIN;
    const liquidationThreshold = maintenanceMargin + this.LIQUIDATION_PENALTY;

    if (side === 'LONG') {
      return entryPrice * (1 - (margin / (quantity * entryPrice * leverage)) + liquidationThreshold);
    } else {
      return entryPrice * (1 + (margin / (quantity * entryPrice * leverage)) - liquidationThreshold);
    }
  }

  static checkLiquidation(
    position: Position
  ): { shouldLiquidate: boolean; marginRatio: number } {
    const unrealizedPnL = this.calculateUnrealizedPnL(
      position.side,
      position.entry_price,
      position.current_price,
      position.quantity
    );

    const positionNotional = this.calculatePositionNotional(
      position.quantity,
      position.current_price,
      position.leverage
    );

    const marginRatio = this.calculateMarginRatio(
      position.margin + unrealizedPnL,
      positionNotional
    );

    return {
      shouldLiquidate: marginRatio < this.MAINTENANCE_MARGIN,
      marginRatio,
    };
  }

  static checkMarginCall(
    position: Position
  ): { needsMarginCall: boolean; deficit: number } {
    const unrealizedPnL = this.calculateUnrealizedPnL(
      position.side,
      position.entry_price,
      position.current_price,
      position.quantity
    );

    const positionNotional = this.calculatePositionNotional(
      position.quantity,
      position.current_price,
      position.leverage
    );

    const marginRatio = this.calculateMarginRatio(
      position.margin + unrealizedPnL,
      positionNotional
    );

    const needsMarginCall = marginRatio < this.MARGIN_CALL_THRESHOLD;
    const requiredEquity = positionNotional * this.MARGIN_CALL_THRESHOLD;
    const currentEquity = position.margin + unrealizedPnL;
    const deficit = needsMarginCall ? requiredEquity - currentEquity : 0;

    return {
      needsMarginCall,
      deficit,
    };
  }

  static calculateLiquidationPenalty(
    positionValue: number
  ): number {
    return positionValue * this.LIQUIDATION_PENALTY;
  }
}

// Liquidation Engine Service
export class LiquidationEngine {
  private positions: Map<string, Position> = new Map();
  private userPositions: Map<string, Set<string>> = new Map();
  private liquidationQueue: LiquidationTrigger[] = [];
  private isProcessing: boolean = false;

  constructor() {
    this.startMonitoring();
  }

  private startMonitoring(): void {
    setInterval(() => {
      this.processLiquidationQueue();
    }, 100);
  }

  addPosition(position: Position): void {
    const positionId = position.position_id;
    const userId = position.user_id;

    this.positions.set(positionId, position);

    if (!this.userPositions.has(userId)) {
      this.userPositions.set(userId, new Set());
    }
    this.userPositions.get(userId)!.add(positionId);
  }

  updatePositionPrice(positionId: string, newPrice: number): Position | null {
    const position = this.positions.get(positionId);
    if (!position) return null;

    position.current_price = newPrice;
    position.unrealized_pnl = MarginCalculator.calculateUnrealizedPnL(
      position.side,
      position.entry_price,
      position.current_price,
      position.quantity
    );

    const positionNotional = MarginCalculator.calculatePositionNotional(
      position.quantity,
      position.current_price,
      position.leverage
    );

    position.margin_ratio = MarginCalculator.calculateMarginRatio(
      position.margin + position.unrealized_pnl,
      positionNotional
    );

    return position;
  }

  removePosition(positionId: string): Position | null {
    const position = this.positions.get(positionId);
    if (!position) return null;

    const userId = position.user_id;
    this.positions.delete(positionId);

    const userPosSet = this.userPositions.get(userId);
    if (userPosSet) {
      userPosSet.delete(positionId);
      if (userPosSet.size === 0) {
        this.userPositions.delete(userId);
      }
    }

    return position;
  }

  getPosition(positionId: string): Position | null {
    return this.positions.get(positionId) || null;
  }

  getUserPositions(userId: string): Position[] {
    const positionIds = this.userPositions.get(userId);
    if (!positionIds) return [];

    return Array.from(positionIds)
      .map((id) => this.positions.get(id))
      .filter((p): p is Position => p !== undefined);
  }

  generateLiquidationTrigger(position: Position): LiquidationTrigger | null {
    const { shouldLiquidate, marginRatio } = MarginCalculator.checkLiquidation(position);

    if (!shouldLiquidate) return null;

    const trigger: LiquidationTrigger = {
      position_id: position.position_id,
      user_id: position.user_id,
      symbol: position.symbol,
      current_margin_ratio: marginRatio,
      maintenance_margin: MarginCalculator.MAINTENANCE_MARGIN,
      trigger_price: position.current_price,
      triggered_at: Date.now(),
      penalty_rate: MarginCalculator.LIQUIDATION_PENALTY,
    };

    return trigger;
  }

  generateMarginCall(position: Position): MarginCall | null {
    const { needsMarginCall, deficit } = MarginCalculator.checkMarginCall(position);

    if (!needsMarginCall) return null;

    const marginCall: MarginCall = {
      user_id: position.user_id,
      position_id: position.position_id,
      current_margin_ratio: position.margin_ratio,
      required_margin_ratio: MarginCalculator.MARGIN_CALL_THRESHOLD,
      deficit,
      timestamp: Date.now(),
    };

    return marginCall;
  }

  checkAllPositions(): {
    liquidationTriggers: LiquidationTrigger[];
    marginCalls: MarginCall[];
  } {
    const liquidationTriggers: LiquidationTrigger[] = [];
    const marginCalls: MarginCall[] = [];

    this.positions.forEach((position) => {
      const trigger = this.generateLiquidationTrigger(position);
      if (trigger) {
        liquidationTriggers.push(trigger);
        this.liquidationQueue.push(trigger);
      }

      const marginCall = this.generateMarginCall(position);
      if (marginCall) {
        marginCalls.push(marginCall);
      }
    });

    return { liquidationTriggers, marginCalls };
  }

  checkSymbolPositions(symbol: string): LiquidationTrigger[] {
    const triggers: LiquidationTrigger[] = [];

    this.positions.forEach((position) => {
      if (position.symbol === symbol) {
        const trigger = this.generateLiquidationTrigger(position);
        if (trigger) {
          triggers.push(trigger);
          this.liquidationQueue.push(trigger);
        }
      }
    });

    return triggers;
  }

  private async processLiquidationQueue(): Promise<void> {
    if (this.isProcessing || this.liquidationQueue.length === 0) return;

    this.isProcessing = true;

    const trigger = this.liquidationQueue.shift();
    if (trigger) {
      await this.executeLiquidation(trigger);
    }

    this.isProcessing = false;
  }

  private async executeLiquidation(trigger: LiquidationTrigger): Promise<void> {
    console.log(`[LiquidationEngine] Executing liquidation for position ${trigger.position_id}`, {
      user_id: trigger.user_id,
      margin_ratio: trigger.current_margin_ratio,
      trigger_price: trigger.trigger_price,
      penalty_rate: trigger.penalty_rate,
    });

    const position = this.positions.get(trigger.position_id);
    if (!position) {
      console.warn(`[LiquidationEngine] Position ${trigger.position_id} not found`);
      return;
    }

    const positionValue = position.quantity * position.current_price;
    const penalty = MarginCalculator.calculateLiquidationPenalty(positionValue);

    console.log(`[LiquidationEngine] Liquidation penalty: ${penalty} PHON`);
    // Emit LIQUIDATION_EXECUTED event (handled by event bus in main service)
  }

  getStats(): any {
    let totalPnL = 0;
    this.positions.forEach((p) => {
      totalPnL += p.unrealized_pnl;
    });

    return {
      totalPositions: this.positions.size,
      totalUsers: this.userPositions.size,
      totalPnL,
      queuedLiquidations: this.liquidationQueue.length,
    };
  }
}

// Singleton Instance
let liquidationEngineInstance: LiquidationEngine | null = null;

export function getLiquidationEngine(): LiquidationEngine {
  if (!liquidationEngineInstance) {
    liquidationEngineInstance = new LiquidationEngine();
  }
  return liquidationEngineInstance;
}
