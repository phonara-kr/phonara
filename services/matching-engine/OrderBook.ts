// Matching Engine - Production-Grade Financial Exchange Engine
// Implements price-time priority matching with in-memory heap order book

import { EventEmitter } from 'events';

export interface Order {
  order_id: string;
  user_id: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  order_type: 'MARKET' | 'LIMIT';
  price: number;
  quantity: number;
  remaining_quantity: number;
  timestamp: number;
  sequence: number;
}

export interface Trade {
  trade_id: string;
  symbol: string;
  buy_order_id: string;
  sell_order_id: string;
  buyer_id: string;
  seller_id: string;
  price: number;
  quantity: number;
  maker_side: 'BUY' | 'SELL';
  executed_at: number;
}

interface PriceLevel {
  price: number;
  orders: Order[];
  total_quantity: number;
}

// Min Heap for Asks (lowest price first)
class MinHeap {
  private heap: PriceLevel[] = [];

  insert(level: PriceLevel): void {
    this.heap.push(level);
    this.bubbleUp(this.heap.length - 1);
  }

  extractMin(): PriceLevel | null {
    if (this.heap.length === 0) return null;
    const min = this.heap[0];
    const last = this.heap.pop()!;
    if (this.heap.length > 0) {
      this.heap[0] = last;
      this.bubbleDown(0);
    }
    return min;
  }

  peek(): PriceLevel | null {
    return this.heap.length > 0 ? this.heap[0] : null;
  }

  remove(price: number): void {
    const index = this.heap.findIndex((l) => l.price === price);
    if (index === -1) return;
    const last = this.heap.pop()!;
    if (index < this.heap.length) {
      this.heap[index] = last;
      this.bubbleDown(index);
    }
  }

  private bubbleUp(index: number): void {
    while (index > 0) {
      const parentIndex = Math.floor((index - 1) / 2);
      if (this.heap[parentIndex].price <= this.heap[index].price) break;
      [this.heap[parentIndex], this.heap[index]] = [this.heap[index], this.heap[parentIndex]];
      index = parentIndex;
    }
  }

  private bubbleDown(index: number): void {
    while (true) {
      const leftChild = 2 * index + 1;
      const rightChild = 2 * index + 2;
      let smallest = index;

      if (leftChild < this.heap.length && this.heap[leftChild].price < this.heap[smallest].price) {
        smallest = leftChild;
      }
      if (rightChild < this.heap.length && this.heap[rightChild].price < this.heap[smallest].price) {
        smallest = rightChild;
      }
      if (smallest === index) break;
      [this.heap[smallest], this.heap[index]] = [this.heap[index], this.heap[smallest]];
      index = smallest;
    }
  }

  toArray(): PriceLevel[] {
    return [...this.heap].sort((a, b) => a.price - b.price);
  }

  size(): number {
    return this.heap.length;
  }
}

// Max Heap for Bids (highest price first)
class MaxHeap {
  private heap: PriceLevel[] = [];

  insert(level: PriceLevel): void {
    this.heap.push(level);
    this.bubbleUp(this.heap.length - 1);
  }

  extractMax(): PriceLevel | null {
    if (this.heap.length === 0) return null;
    const max = this.heap[0];
    const last = this.heap.pop()!;
    if (this.heap.length > 0) {
      this.heap[0] = last;
      this.bubbleDown(0);
    }
    return max;
  }

  peek(): PriceLevel | null {
    return this.heap.length > 0 ? this.heap[0] : null;
  }

  remove(price: number): void {
    const index = this.heap.findIndex((l) => l.price === price);
    if (index === -1) return;
    const last = this.heap.pop()!;
    if (index < this.heap.length) {
      this.heap[index] = last;
      this.bubbleDown(index);
    }
  }

  private bubbleUp(index: number): void {
    while (index > 0) {
      const parentIndex = Math.floor((index - 1) / 2);
      if (this.heap[parentIndex].price >= this.heap[index].price) break;
      [this.heap[parentIndex], this.heap[index]] = [this.heap[index], this.heap[parentIndex]];
      index = parentIndex;
    }
  }

  private bubbleDown(index: number): void {
    while (true) {
      const leftChild = 2 * index + 1;
      const rightChild = 2 * index + 2;
      let largest = index;

      if (leftChild < this.heap.length && this.heap[leftChild].price > this.heap[largest].price) {
        largest = leftChild;
      }
      if (rightChild < this.heap.length && this.heap[rightChild].price > this.heap[largest].price) {
        largest = rightChild;
      }
      if (largest === index) break;
      [this.heap[largest], this.heap[index]] = [this.heap[index], this.heap[largest]];
      index = largest;
    }
  }

  toArray(): PriceLevel[] {
    return [...this.heap].sort((a, b) => b.price - a.price);
  }

  size(): number {
    return this.heap.length;
  }
}

// Order Book Implementation
export class OrderBook extends EventEmitter {
  private symbol: string;
  private bids: MaxHeap;
  private asks: MinHeap;
  private priceLevels: Map<string, PriceLevel>;
  private sequence: number = 0;
  private orderMap: Map<string, Order>;
  private tradeIdCounter: number = 0;

  constructor(symbol: string) {
    super();
    this.symbol = symbol;
    this.bids = new MaxHeap();
    this.asks = new MinHeap();
    this.priceLevels = new Map();
    this.orderMap = new Map();
  }

  addOrder(order: Order): Trade[] {
    const trades: Trade[] = [];

    if (order.side === 'BUY') {
      // Match against asks
      trades.push(...this.matchBuyOrder(order));
    } else {
      // Match against bids
      trades.push(...this.matchSellOrder(order));
    }

    // Add remaining quantity to order book if limit order
    if (order.remaining_quantity > 0 && order.order_type === 'LIMIT') {
      this.insertOrder(order);
    }

    return trades;
  }

  private matchBuyOrder(buyOrder: Order): Trade[] {
    const trades: Trade[] = [];

    while (buyOrder.remaining_quantity > 0) {
      const bestAsk = this.asks.peek();
      if (!bestAsk || bestAsk.price > buyOrder.price) break;

      const matchingOrders = bestAsk.orders.filter((o) => o.remaining_quantity > 0);
      if (matchingOrders.length === 0) {
        this.asks.remove(bestAsk.price);
        this.priceLevels.delete(bestAsk.price.toString());
        continue;
      }

      // FIFO matching within price level
      for (const sellOrder of matchingOrders) {
        if (buyOrder.remaining_quantity <= 0) break;

        const matchQty = Math.min(buyOrder.remaining_quantity, sellOrder.remaining_quantity);
        const trade = this.createTrade(buyOrder, sellOrder, matchQty, sellOrder.price, 'SELL');

        buyOrder.remaining_quantity -= matchQty;
        sellOrder.remaining_quantity -= matchQty;
        bestAsk.total_quantity -= matchQty;

        trades.push(trade);
        this.emit('trade', trade);

        if (sellOrder.remaining_quantity === 0) {
          this.orderMap.delete(sellOrder.order_id);
        }
      }

      if (bestAsk.total_quantity <= 0) {
        this.asks.remove(bestAsk.price);
        this.priceLevels.delete(bestAsk.price.toString());
      }
    }

    return trades;
  }

  private matchSellOrder(sellOrder: Order): Trade[] {
    const trades: Trade[] = [];

    while (sellOrder.remaining_quantity > 0) {
      const bestBid = this.bids.peek();
      if (!bestBid || bestBid.price < sellOrder.price) break;

      const matchingOrders = bestBid.orders.filter((o) => o.remaining_quantity > 0);
      if (matchingOrders.length === 0) {
        this.bids.remove(bestBid.price);
        this.priceLevels.delete(bestBid.price.toString());
        continue;
      }

      // FIFO matching within price level
      for (const buyOrder of matchingOrders) {
        if (sellOrder.remaining_quantity <= 0) break;

        const matchQty = Math.min(sellOrder.remaining_quantity, buyOrder.remaining_quantity);
        const trade = this.createTrade(buyOrder, sellOrder, matchQty, buyOrder.price, 'BUY');

        sellOrder.remaining_quantity -= matchQty;
        buyOrder.remaining_quantity -= matchQty;
        bestBid.total_quantity -= matchQty;

        trades.push(trade);
        this.emit('trade', trade);

        if (buyOrder.remaining_quantity === 0) {
          this.orderMap.delete(buyOrder.order_id);
        }
      }

      if (bestBid.total_quantity <= 0) {
        this.bids.remove(bestBid.price);
        this.priceLevels.delete(bestBid.price.toString());
      }
    }

    return trades;
  }

  private insertOrder(order: Order): void {
    const priceKey = order.price.toString();
    let level = this.priceLevels.get(priceKey);

    if (!level) {
      level = {
        price: order.price,
        orders: [],
        total_quantity: 0,
      };
      this.priceLevels.set(priceKey, level);

      if (order.side === 'BUY') {
        this.bids.insert(level);
      } else {
        this.asks.insert(level);
      }
    }

    level.orders.push(order);
    level.total_quantity += order.remaining_quantity;
    this.orderMap.set(order.order_id, order);

    this.emit('orderAdded', {
      order,
      level,
    });
  }

  private createTrade(
    buyOrder: Order,
    sellOrder: Order,
    quantity: number,
    price: number,
    makerSide: 'BUY' | 'SELL'
  ): Trade {
    const trade: Trade = {
      trade_id: `${this.symbol}-${Date.now()}-${this.tradeIdCounter++}`,
      symbol: this.symbol,
      buy_order_id: buyOrder.order_id,
      sell_order_id: sellOrder.order_id,
      buyer_id: buyOrder.user_id,
      seller_id: sellOrder.user_id,
      price,
      quantity,
      maker_side: makerSide,
      executed_at: Date.now(),
    };

    return trade;
  }

  cancelOrder(orderId: string): Order | null {
    const order = this.orderMap.get(orderId);
    if (!order) return null;

    const priceKey = order.price.toString();
    const level = this.priceLevels.get(priceKey);
    if (!level) return null;

    const index = level.orders.findIndex((o) => o.order_id === orderId);
    if (index === -1) return null;

    level.orders.splice(index, 1);
    level.total_quantity -= order.remaining_quantity;
    this.orderMap.delete(orderId);

    if (level.orders.length === 0) {
      if (order.side === 'BUY') {
        this.bids.remove(level.price);
      } else {
        this.asks.remove(level.price);
      }
      this.priceLevels.delete(priceKey);
    }

    this.emit('orderCancelled', order);
    return order;
  }

  getBestBid(): number | null {
    const best = this.bids.peek();
    return best ? best.price : null;
  }

  getBestAsk(): number | null {
    const best = this.asks.peek();
    return best ? best.price : null;
  }

  getSpread(): number {
    const bid = this.getBestBid() || 0;
    const ask = this.getBestAsk() || 0;
    return ask - bid;
  }

  getDepth(): { bids: PriceLevel[]; asks: PriceLevel[] } {
    return {
      bids: this.bids.toArray(),
      asks: this.asks.toArray(),
    };
  }

  getOrderCount(): number {
    return this.orderMap.size;
  }

  getSnapshot(): any {
    return {
      symbol: this.symbol,
      bids: this.bids.toArray().map((l) => ({
        price: l.price,
        quantity: l.total_quantity,
        count: l.orders.length,
      })),
      asks: this.asks.toArray().map((l) => ({
        price: l.price,
        quantity: l.total_quantity,
        count: l.orders.length,
      })),
      best_bid: this.getBestBid(),
      best_ask: this.getBestAsk(),
      spread: this.getSpread(),
      timestamp: Date.now(),
    };
  }
}

// Matching Engine Manager (Manages multiple symbols)
export class MatchingEngine extends EventEmitter {
  private orderBooks: Map<string, OrderBook> = new Map();
  private sequence: number = 0;

  constructor() {
    super();
  }

  getOrderBook(symbol: string): OrderBook {
    let book = this.orderBooks.get(symbol);
    if (!book) {
      book = new OrderBook(symbol);
      book.on('trade', (trade: Trade) => {
        this.emit('trade', trade);
      });
      book.on('orderAdded', (data: any) => {
        this.emit('orderAdded', data);
      });
      book.on('orderCancelled', (order: Order) => {
        this.emit('orderCancelled', order);
      });
      this.orderBooks.set(symbol, book);
    }
    return book;
  }

  processOrder(orderData: Omit<Order, 'sequence' | 'timestamp'>): Trade[] {
    const book = this.getOrderBook(orderData.symbol);
    const order: Order = {
      ...orderData,
      timestamp: Date.now(),
      sequence: this.sequence++,
    };

    const trades = book.addOrder(order);
    return trades;
  }

  cancelOrder(symbol: string, orderId: string): Order | null {
    const book = this.orderBooks.get(symbol);
    if (!book) return null;
    return book.cancelOrder(orderId);
  }

  getSymbols(): string[] {
    return Array.from(this.orderBooks.keys());
  }

  getAllSnapshots(): Map<string, any> {
    const snapshots = new Map();
    this.orderBooks.forEach((book, symbol) => {
      snapshots.set(symbol, book.getSnapshot());
    });
    return snapshots;
  }

  getStats(): any {
    let totalOrders = 0;
    this.orderBooks.forEach((book) => {
      totalOrders += book.getOrderCount();
    });

    return {
      symbols: this.orderBooks.size,
      totalOrders,
      sequence: this.sequence,
    };
  }
}
