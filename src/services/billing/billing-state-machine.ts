export type BillingUiState =
  | 'idle'
  | 'loading_offerings'
  | 'ready'
  | 'purchasing'
  | 'purchased'
  | 'cancelled'
  | 'failed'
  | 'pending'
  | 'restoring';

type Listener = (state: BillingUiState) => void;

export class BillingStateMachine {
  private state: BillingUiState = 'idle';
  private listeners = new Set<Listener>();

  getState(): BillingUiState {
    return this.state;
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit(next: BillingUiState) {
    this.state = next;
    this.listeners.forEach((listener) => listener(next));
  }

  startLoadingOfferings() {
    if (this.state === 'purchasing' || this.state === 'restoring') return;
    this.emit('loading_offerings');
  }

  offeringsReady() {
    if (this.state === 'purchasing' || this.state === 'restoring') return;
    this.emit('ready');
  }

  offeringsFailed() {
    if (this.state === 'purchasing' || this.state === 'restoring') return;
    this.emit('failed');
  }

  startPurchase() {
    if (this.state === 'purchasing' || this.state === 'restoring') return false;
    this.emit('purchasing');
    return true;
  }

  purchaseCancelled() {
    this.emit('cancelled');
    this.emit('ready');
  }

  purchasePending() {
    this.emit('pending');
    this.emit('ready');
  }

  purchaseSucceeded() {
    this.emit('purchased');
    this.emit('ready');
  }

  purchaseFailed() {
    this.emit('failed');
    this.emit('ready');
  }

  startRestore() {
    if (this.state === 'purchasing' || this.state === 'restoring') return false;
    this.emit('restoring');
    return true;
  }

  restoreFinished() {
    this.emit('ready');
  }

  canPurchase(): boolean {
    return this.state === 'ready';
  }

  canRestore(): boolean {
    return this.state === 'ready' || this.state === 'idle' || this.state === 'cancelled';
  }

  isBusy(): boolean {
    return this.state === 'purchasing' || this.state === 'restoring' || this.state === 'loading_offerings';
  }
}

export const billingStateMachine = new BillingStateMachine();
